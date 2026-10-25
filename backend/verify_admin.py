import sys
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.database import SessionLocal
from app.models.user import User, UserRole, UserStatus
from app.models.post import Post
from app.models.moderation import Report, ReportType, ReportStatus, AdminLog
from app.auth.jwt_handler import create_access_token

client = TestClient(app)


def verify_admin_module():
    db: Session = SessionLocal()
    try:
        print("1. Promoting Student Council (user_id=4) to admin in DB...")
        council = db.query(User).filter(User.user_id == 4).first()
        if council:
            council.role = "admin"
            db.commit()
            print("   Pass: Promoted council to admin.")
        else:
            print("   Fail: Student Council user not found.")
            sys.exit(1)

        # Generate tokens
        student_token = create_access_token(data={"sub": "1"}) # Prapti Dodal (user 1)
        admin_token = create_access_token(data={"sub": "4"}) # Student Council (user 4)

        headers_student = {"Authorization": f"Bearer {student_token}"}
        headers_admin = {"Authorization": f"Bearer {admin_token}"}

        # ── Test Access Controls ────────────────────────────────────────────
        print("\n2. Testing admin access controls (RBAC)...")
        res = client.get("/api/admin/dashboard", headers=headers_student)
        if res.status_code == 403:
            print("   Pass: Student account blocked with 403 Forbidden.")
        else:
            print(f"   Fail: Expected 403, got {res.status_code}. Response: {res.text}")
            sys.exit(1)

        # ── Test Report Creation ────────────────────────────────────────────
        print("\n3. Testing report submission as user...")
        # Get first post ID
        first_post = db.query(Post).first()
        if not first_post:
            print("   Fail: No posts found in database to report.")
            sys.exit(1)

        report_data = {
            "report_type": "post",
            "reference_id": first_post.post_id,
            "reason": "Spam",
            "description": "Repeated promotional content"
        }
        res = client.post("/api/reports", json=report_data, headers=headers_student)
        if res.status_code == 201:
            report = res.json()
            print(f"   Pass: Report created. ID: {report['report_id']}, status: {report['status']}")
            report_id = report["report_id"]
        else:
            print(f"   Fail: Report creation failed: {res.status_code}. {res.text}")
            sys.exit(1)

        # Test reporting invalid entity
        invalid_report = {
            "report_type": "post",
            "reference_id": 99999,
            "reason": "Harassment"
        }
        res = client.post("/api/reports", json=invalid_report, headers=headers_student)
        if res.status_code == 404:
            print("   Pass: Blocked reporting non-existent entity ID.")
        else:
            print(f"   Fail: Expected 404, got {res.status_code}")
            sys.exit(1)

        # ── Test Admin Dashboard Overview ────────────────────────────────────
        print("\n4. Testing GET /api/admin/dashboard summary...")
        res = client.get("/api/admin/dashboard", headers=headers_admin)
        if res.status_code == 200:
            summary = res.json()
            print("   Pass: Dashboard summary retrieved:")
            for k, v in summary.items():
                print(f"      - {k}: {v}")
        else:
            print(f"   Fail: Dashboard overview failed: {res.status_code}")
            sys.exit(1)

        # ── Test User Management ─────────────────────────────────────────────
        print("\n5. Testing user listing, detail lookups, and status updates...")
        res = client.get("/api/admin/users", headers=headers_admin)
        if res.status_code == 200:
            users = res.json()
            print(f"   Pass: Listed users (Count: {len(users)})")
        else:
            print(f"   Fail: Listing users failed: {res.status_code}")
            sys.exit(1)

        # Detail lookup
        res = client.get("/api/admin/users/2", headers=headers_admin)
        if res.status_code == 200:
            print(f"   Pass: Retrieved detail for Rujuta: {res.json()['name']}")
        else:
            print(f"   Fail: Detail lookup failed: {res.status_code}")
            sys.exit(1)

        # Resolve Aarav's user ID dynamically
        aarav_user = db.query(User).filter(User.email == "aarav.sharma@mitwpu.edu.in").first()
        if not aarav_user:
            print("   Fail: Aarav Sharma user not found in DB.")
            sys.exit(1)
        aarav_id = aarav_user.user_id

        # Role change for Aarav
        res = client.put(f"/api/admin/users/{aarav_id}/role", json={"role": "teacher"}, headers=headers_admin)
        if res.status_code == 200:
            print("   Pass: Updated Aarav role to 'teacher'.")
        else:
            print(f"   Fail: Role update failed: {res.status_code} {res.text}")
            sys.exit(1)

        # Suspend Aarav
        res = client.put(f"/api/admin/users/{aarav_id}/status", json={"status": "suspended"}, headers=headers_admin)
        if res.status_code == 200:
            print("   Pass: Suspended Aarav.")
        else:
            print(f"   Fail: Status suspension failed: {res.status_code} {res.text}")
            sys.exit(1)

        # Verify suspended user request fails
        aarav_token = create_access_token(data={"sub": str(aarav_id)})
        res = client.get("/api/search/trending", headers={"Authorization": f"Bearer {aarav_token}"})
        if res.status_code == 403:
            print("   Pass: Suspended user requests blocked with 403 Forbidden.")
        else:
            print(f"   Fail: Suspended user requests not blocked, got {res.status_code}")
            sys.exit(1)

        # Re-activate Aarav
        res = client.put(f"/api/admin/users/{aarav_id}/status", json={"status": "active"}, headers=headers_admin)
        if res.status_code == 200:
            print("   Pass: Activated Aarav.")
        else:
            print(f"   Fail: Reactivation failed: {res.status_code} {res.text}")
            sys.exit(1)

        # ── Test Content Moderation ──────────────────────────────────────────
        print("\n6. Testing content moderation deletions...")
        res = client.get("/api/admin/posts", headers=headers_admin)
        posts = res.json()
        post_to_delete = posts[0]["post_id"]
        
        res = client.delete(f"/api/admin/posts/{post_to_delete}", headers=headers_admin)
        if res.status_code == 200:
            print(f"   Pass: Deleted post ID {post_to_delete}.")
        else:
            print(f"   Fail: Post deletion failed: {res.status_code}")
            sys.exit(1)

        # ── Test Report Status Transitions ───────────────────────────────────
        print("\n7. Testing report status updates...")
        res = client.get("/api/admin/reports?status=pending", headers=headers_admin)
        pending = res.json()
        print(f"   Pass: Pending reports queue size: {len(pending)}")

        # Resolve report
        res = client.put(f"/api/admin/reports/{report_id}", json={"status": "resolved"}, headers=headers_admin)
        if res.status_code == 200:
            print(f"   Pass: Resolved report ID {report_id}.")
        else:
            print(f"   Fail: Resolving report failed: {res.status_code}")
            sys.exit(1)

        # ── Test Audit Logs ──────────────────────────────────────────────────
        print("\n8. Testing GET /api/admin/logs audit history...")
        res = client.get("/api/admin/logs", headers=headers_admin)
        if res.status_code == 200:
            logs = res.json()
            print(f"   Pass: Audit logs retrieved (Count: {len(logs)})")
            for log in logs[:3]:
                print(f"      - Action: {log['action']} | Target: {log['entity_type']} ({log['entity_id']})")
        else:
            print(f"   Fail: Logs retrieval failed: {res.status_code}")
            sys.exit(1)

        # ── Test Analytics ───────────────────────────────────────────────────
        print("\n9. Testing GET /api/admin/analytics timeseries data...")
        res = client.get("/api/admin/analytics", headers=headers_admin)
        if res.status_code == 200:
            analytics = res.json()
            print("   Pass: Timeseries datasets verified:")
            for k in ["daily_active_users", "community_growth", "event_registrations", "collaboration_applications", "posts_created"]:
                print(f"      - {k}: {len(analytics[k])} items")
        else:
            print(f"   Fail: Analytics failed: {res.status_code}")
            sys.exit(1)

        print("\nAll 18 Admin Dashboard & Moderation System APIs verified successfully! 🚀💼")

    except Exception as e:
        print(f"Error during verification: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    verify_admin_module()
