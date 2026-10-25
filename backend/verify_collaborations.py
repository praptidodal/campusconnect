import sys
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import io

from app.main import app
from app.database.database import get_db, SessionLocal
from app.models.user import User, UserRole
from app.models.community import Community, CommunityMember, CommunityRole
from app.models.collaboration import Collaboration, Application
from app.auth.jwt_handler import create_access_token
from app.utils.hashing import hash_password

client = TestClient(app)


def setup_test_data(db: Session):
    # Clear tables
    db.query(Application).delete()
    db.query(Collaboration).delete()
    db.query(CommunityMember).delete()
    db.query(Community).delete()
    db.query(User).filter(User.email.like("test_collab_%@example.com")).delete()
    db.commit()

    # Create users
    u1 = User(
        name="Collab Creator",
        email="test_collab_creator@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.student.value,
    )
    u2 = User(
        name="Collab Applicant",
        email="test_collab_app@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.student.value,
    )
    db.add(u1)
    db.add(u2)
    db.commit()
    db.refresh(u1)
    db.refresh(u2)

    # Create community
    comm = Community(
        community_name="Collaboration Club",
        description="Hosting projects",
        category="Clubs",
        created_by=u1.user_id,
    )
    db.add(comm)
    db.flush()

    member = CommunityMember(
        community_id=comm.community_id,
        user_id=u1.user_id,
        role=CommunityRole.owner,
    )
    db.add(member)
    db.commit()
    db.refresh(comm)

    return u1, u2, comm


def test_collaboration_workflow():
    db = SessionLocal()
    try:
        print("1. Setting up test data...")
        u1, u2, comm = setup_test_data(db)

        token1 = create_access_token({"sub": str(u1.user_id)})
        token2 = create_access_token({"sub": str(u2.user_id)})

        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}

        deadline = (datetime.now() + timedelta(days=5)).isoformat()

        print("2. Testing collaboration creation (API 1)...")
        # Prepare dummy file attachment
        attachment_file = io.BytesIO(b"dummy attachment content")
        attachment_file.name = "spec.pdf"

        res = client.post(
            "/api/collaborations",
            data={
                "title": "Hackathon Team Search",
                "description": "Building an awesome startup app.",
                "category": "Startup Ideas",
                "required_skills": "Python, React, CSS",
                "positions_available": 3,
                "deadline": deadline,
                "community_id": comm.community_id,
            },
            files={"attachment": ("spec.pdf", attachment_file, "application/pdf")},
            headers=headers1,
        )
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.json()}"
        data = res.json()
        assert data["title"] == "Hackathon Team Search"
        assert data["positions_available"] == 3
        assert data["attachment_path"] is not None
        collab_id = data["collaboration_id"]

        # Date validation check: past date
        past_deadline = (datetime.now() - timedelta(days=1)).isoformat()
        res_val = client.post(
            "/api/collaborations",
            data={
                "title": "Invalid Collab",
                "description": "Validation test.",
                "positions_available": 1,
                "deadline": past_deadline,
            },
            headers=headers1,
        )
        assert res_val.status_code == 400
        print("   Collaboration creation and validation checks passed!")

        print("3. Testing list collaborations (API 2)...")
        res = client.get("/api/collaborations", headers=headers2)
        assert res.status_code == 200
        assert len(res.json()) >= 1
        print("   List collaborations passed!")

        print("4. Testing get details (API 3)...")
        res = client.get(f"/api/collaborations/{collab_id}", headers=headers2)
        assert res.status_code == 200
        details = res.json()
        assert details["creator_name"] == "Collab Creator"
        assert details["community_name"] == "Collaboration Club"
        print("   Get details passed!")

        print("5. Testing update collaboration (API 4)...")
        res = client.put(
            "/api/collaborations/{}".format(collab_id),
            data={"positions_available": 2},
            headers=headers1,
        )
        assert res.status_code == 200
        assert res.json()["positions_available"] == 2
        print("   Update collaboration passed!")

        print("6. Testing apply for opportunity (API 6)...")
        resume_file = io.BytesIO(b"my resume contents")
        resume_file.name = "resume.pdf"

        res = client.post(
            f"/api/collaborations/{collab_id}/apply",
            data={"application_message": "I would love to join your hackathon team!"},
            files={"resume": ("resume.pdf", resume_file, "application/pdf")},
            headers=headers2,
        )
        assert res.status_code == 200
        assert res.json()["message"] == "Application submitted successfully"

        # Duplicate check validation
        resume_file_dup = io.BytesIO(b"my resume contents")
        resume_file_dup.name = "resume.pdf"
        res_dup = client.post(
            f"/api/collaborations/{collab_id}/apply",
            data={"application_message": "Duplicate check"},
            files={"resume": ("resume.pdf", resume_file_dup, "application/pdf")},
            headers=headers2,
        )
        assert res_dup.status_code == 400
        print("   Apply for opportunity and duplicate blocking checks passed!")

        print("7. Testing view applications (API 7)...")
        res = client.get(f"/api/collaborations/{collab_id}/applications", headers=headers1)
        assert res.status_code == 200
        apps = res.json()
        assert len(apps) == 1
        assert apps[0]["applicant_name"] == "Collab Applicant"
        assert apps[0]["resume_path"] is not None
        app_id = apps[0]["application_id"]
        print("   View applications list passed!")

        print("8. Testing accept application (API 8)...")
        res = client.post(f"/api/applications/{app_id}/accept", headers=headers1)
        assert res.status_code == 200
        assert res.json()["message"] == "Application accepted"
        print("   Accept application passed!")

        print("9. Testing reject application (API 9)...")
        res = client.post(f"/api/applications/{app_id}/reject", headers=headers1)
        assert res.status_code == 200
        assert res.json()["message"] == "Application rejected"
        print("   Reject application passed!")

        print("10. Testing my applications (API 10)...")
        res = client.get("/api/applications/my", headers=headers2)
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert res.json()[0]["collaboration"]["title"] == "Hackathon Team Search"
        print("   My applications list passed!")

        print("11. Testing my collaborations (API 11)...")
        res = client.get("/api/collaborations/my", headers=headers1)
        assert res.status_code == 200
        assert len(res.json()) == 1
        print("   My collaborations list passed!")

        print("12. Testing search collaborations (API 12)...")
        res = client.get("/api/collaborations/search?title=Hackathon", headers=headers2)
        assert res.status_code == 200
        assert len(res.json()) == 1
        print("   Search collaborations passed!")

        print("13. Testing delete collaboration (API 5)...")
        # Create a temp collab to delete
        temp_collab = client.post(
            "/api/collaborations",
            data={
                "title": "Temp Search",
                "description": "Will be deleted soon.",
                "positions_available": 1,
                "deadline": deadline,
            },
            headers=headers1,
        ).json()
        temp_id = temp_collab["collaboration_id"]

        res = client.delete(f"/api/collaborations/{temp_id}", headers=headers1)
        assert res.status_code == 200
        assert res.json()["message"] == "Collaboration opportunity deleted successfully"

        # Verify not found
        res_check = client.get(f"/api/collaborations/{temp_id}", headers=headers2)
        assert res_check.status_code == 404
        print("   Delete collaboration passed!")

        print("\nAll 12 Collaboration Marketplace APIs verified successfully! 🚀💼")

    finally:
        db.close()


if __name__ == "__main__":
    from app.database.init_db import init_db
    init_db()
    test_collaboration_workflow()
