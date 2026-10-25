import sys
from datetime import datetime, date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.database import SessionLocal
from app.models.user import User
from app.models.post import Post
from app.models.community import Community, CommunityMember, CommunityRole
from app.models.event import Event, EventRegistration, RegistrationStatus
from app.models.collaboration import Collaboration, Application, CollaborationStatus, ApplicationStatus
from app.models.analytics import UserActivityLog, DailyPlatformMetric
from app.auth.jwt_handler import create_access_token

client = TestClient(app)


def verify_analytics_module():
    db: Session = SessionLocal()
    try:
        print("1. Promoting Prapti Dodal (user_id=1) to 'teacher' in DB...")
        prapti = db.query(User).filter(User.user_id == 1).first()
        if prapti:
            prapti.role = "teacher"
            db.commit()
            print("   Pass: Promoted Prapti to teacher.")
        else:
            print("   Fail: User 1 not found.")
            sys.exit(1)

        print("\n2. Promoting Student Council (user_id=4) to 'admin' in DB...")
        council = db.query(User).filter(User.user_id == 4).first()
        if council:
            council.role = "admin"
            db.commit()
            print("   Pass: Promoted council to admin.")
        else:
            print("   Fail: User 4 not found.")
            sys.exit(1)

        # Generate tokens
        student_token = create_access_token(data={"sub": "2"}) # Rujuta (user 2 - student)
        teacher_token = create_access_token(data={"sub": "1"}) # Prapti (user 1 - teacher)
        admin_token = create_access_token(data={"sub": "4"})   # Council (user 4 - admin)

        headers_student = {"Authorization": f"Bearer {student_token}"}
        headers_teacher = {"Authorization": f"Bearer {teacher_token}"}
        headers_admin = {"Authorization": f"Bearer {admin_token}"}

        # ── Test Access Controls (RBAC) ──────────────────────────────────────
        print("\n3. Testing Platform Analytics access controls (RBAC)...")
        # Student should be blocked
        res = client.get("/api/analytics/platform", headers=headers_student)
        if res.status_code == 403:
            print("   Pass: Student account blocked with 403 Forbidden.")
        else:
            print(f"   Fail: Expected 403 for student, got {res.status_code}. Response: {res.text}")
            sys.exit(1)

        # Teacher should be allowed
        res = client.get("/api/analytics/platform", headers=headers_teacher)
        if res.status_code == 200:
            print("   Pass: Teacher account successfully authorized.")
        else:
            print(f"   Fail: Expected 200 for teacher, got {res.status_code}. Response: {res.text}")
            sys.exit(1)

        # Admin should be allowed
        res = client.get("/api/analytics/platform", headers=headers_admin)
        if res.status_code == 200:
            print("   Pass: Admin account successfully authorized.")
        else:
            print(f"   Fail: Expected 200 for admin, got {res.status_code}. Response: {res.text}")
            sys.exit(1)

        # ── Test User Growth API ─────────────────────────────────────────────
        print("\n4. Testing GET /api/analytics/user-growth...")
        res = client.get("/api/analytics/user-growth?days=7", headers=headers_admin)
        if res.status_code == 200:
            growth = res.json()
            print(f"   Pass: Retrieved user growth chart data (Days returned: {len(growth)})")
            for item in growth[:2]:
                print(f"      - Date: {item['date']}, New: {item['new_users']}, Active: {item['active_users']}")
        else:
            print(f"   Fail: User growth query failed: {res.status_code}")
            sys.exit(1)

        # ── Test Post Analytics API ──────────────────────────────────────────
        print("\n5. Testing GET /api/analytics/posts...")
        res = client.get("/api/analytics/posts", headers=headers_admin)
        if res.status_code == 200:
            posts_a = res.json()
            print(f"   Pass: Posts created: {posts_a['posts_created']}, Likes: {posts_a['likes']}, Comments: {posts_a['comments']}")
        else:
            print(f"   Fail: Post analytics query failed: {res.status_code}")
            sys.exit(1)

        # ── Test Community Analytics & Owner checks ──────────────────────────
        print("\n6. Testing GET /api/analytics/communities...")
        # Create a community managed by user 1 (teacher)
        comm = db.query(Community).filter(Community.community_name == "Verif Community").first()
        if not comm:
            comm = Community(
                community_name="Verif Community",
                description="Testing analytics",
                category="Testing",
                created_by=1
            )
            db.add(comm)
            db.commit()
            db.refresh(comm)
            
            # Add user 1 as owner
            db.add(CommunityMember(community_id=comm.community_id, user_id=1, role=CommunityRole.owner))
            db.commit()

        # Teacher (owner) should be allowed to view community analytics
        res = client.get(f"/api/analytics/communities?community_id={comm.community_id}", headers=headers_teacher)
        if res.status_code == 200:
            print("   Pass: Community owner successfully authorized.")
        else:
            print(f"   Fail: Expected 200 for owner, got {res.status_code}. Response: {res.text}")
            sys.exit(1)

        # Non-owner student should be blocked
        res = client.get(f"/api/analytics/communities?community_id={comm.community_id}", headers=headers_student)
        if res.status_code == 403:
            print("   Pass: Non-owner student successfully blocked with 403 Forbidden.")
        else:
            print(f"   Fail: Expected 403 for non-owner student, got {res.status_code}. Response: {res.text}")
            sys.exit(1)

        # ── Test Event Analytics & Organizer checks ──────────────────────────
        print("\n7. Testing GET /api/analytics/events...")
        # Get or create an event organized by user 1 (teacher)
        event = db.query(Event).filter(Event.title == "Verif Event").first()
        if not event:
            event = Event(
                title="Verif Event",
                description="Testing analytics",
                category="Testing",
                start_datetime=datetime.now() + timedelta(days=1),
                end_datetime=datetime.now() + timedelta(days=1, hours=2),
                organizer_id=1,
                status="upcoming"
            )
            db.add(event)
            db.commit()
            db.refresh(event)

        # Teacher (organizer) should be allowed to view event analytics
        res = client.get(f"/api/analytics/events?event_id={event.event_id}", headers=headers_teacher)
        if res.status_code == 200:
            print("   Pass: Event organizer successfully authorized.")
        else:
            print(f"   Fail: Expected 200 for organizer, got {res.status_code}. Response: {res.text}")
            sys.exit(1)

        # Student (non-organizer) should be blocked
        res = client.get(f"/api/analytics/events?event_id={event.event_id}", headers=headers_student)
        if res.status_code == 403:
            print("   Pass: Non-organizer student blocked with 403.")
        else:
            print(f"   Fail: Expected 403, got {res.status_code}")
            sys.exit(1)

        # ── Test Collaboration Analytics ─────────────────────────────────────
        print("\n8. Testing GET /api/analytics/collaborations...")
        # Get or create a collaboration created by user 4 (admin)
        collab = db.query(Collaboration).filter(Collaboration.title == "Verif Collab").first()
        if not collab:
            collab = Collaboration(
                title="Verif Collab",
                description="Testing analytics",
                category="Testing",
                deadline=datetime.now() + timedelta(days=5),
                created_by=4
            )
            db.add(collab)
            db.commit()
            db.refresh(collab)

        # Admin should be allowed
        res = client.get(f"/api/analytics/collaborations?collaboration_id={collab.collaboration_id}", headers=headers_admin)
        if res.status_code == 200:
            print("   Pass: Authorized admin query of collaboration analytics.")
        else:
            print(f"   Fail: Collaboration analytics query failed: {res.status_code}")
            sys.exit(1)

        # Student (non-creator) should be blocked
        res = client.get(f"/api/analytics/collaborations?collaboration_id={collab.collaboration_id}", headers=headers_student)
        if res.status_code == 403:
            print("   Pass: Non-creator student blocked with 403.")
        else:
            print(f"   Fail: Expected 403, got {res.status_code}")
            sys.exit(1)

        # ── Test Contributors & Skills APIs ──────────────────────────────────
        print("\n9. Testing contributors and trending skills overview...")
        res = client.get("/api/analytics/contributors", headers=headers_admin)
        if res.status_code == 200:
            print("   Pass: GET /api/analytics/contributors returns active lists.")
        else:
            print(f"   Fail: Contributors list failed: {res.status_code}")
            sys.exit(1)

        res = client.get("/api/analytics/trending-skills", headers=headers_admin)
        if res.status_code == 200:
            print("   Pass: GET /api/analytics/trending-skills returns top skills.")
        else:
            print(f"   Fail: Trending skills failed: {res.status_code}")
            sys.exit(1)

        print("\n=======================================================")
        print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!")
        print("=======================================================")

    finally:
        db.close()


if __name__ == "__main__":
    verify_analytics_module()
