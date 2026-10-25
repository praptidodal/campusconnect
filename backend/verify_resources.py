import sys
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import io
import os

from app.main import app
from app.database.database import get_db, SessionLocal
from app.models.user import User, UserRole
from app.models.community import Community, CommunityMember, CommunityRole
from app.models.resource import Resource, ResourceDownload
from app.auth.jwt_handler import create_access_token
from app.utils.hashing import hash_password

client = TestClient(app)


def setup_test_data(db: Session):
    # Clear tables
    db.query(ResourceDownload).delete()
    db.query(Resource).delete()
    db.query(CommunityMember).delete()
    db.query(Community).delete()
    db.query(User).filter(User.email.like("test_res_%@example.com")).delete()
    db.commit()

    # Create users
    u1 = User(
        name="Resource Owner",
        email="test_res_owner@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.student.value,
    )
    u2 = User(
        name="Resource Member",
        email="test_res_member@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.student.value,
    )
    u3 = User(
        name="Resource Outsider",
        email="test_res_out@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.student.value,
    )
    db.add(u1)
    db.add(u2)
    db.add(u3)
    db.commit()
    db.refresh(u1)
    db.refresh(u2)
    db.refresh(u3)

    # Create community
    comm = Community(
        community_name="Resource Club",
        description="Hub testing community",
        category="Clubs",
        created_by=u1.user_id,
    )
    db.add(comm)
    db.flush()

    m1 = CommunityMember(
        community_id=comm.community_id,
        user_id=u1.user_id,
        role=CommunityRole.owner,
    )
    m2 = CommunityMember(
        community_id=comm.community_id,
        user_id=u2.user_id,
        role=CommunityRole.member,
    )
    db.add(m1)
    db.add(m2)
    db.commit()

    return u1, u2, u3, comm


def test_resource_workflow():
    db = SessionLocal()
    try:
        print("1. Setting up test data...")
        u1, u2, u3, comm = setup_test_data(db)

        token1 = create_access_token({"sub": str(u1.user_id)})
        token2 = create_access_token({"sub": str(u2.user_id)})
        token3 = create_access_token({"sub": str(u3.user_id)})

        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}
        headers3 = {"Authorization": f"Bearer {token3}"}

        print("2. Testing Resource Upload (API 1)...")
        dummy_file = io.BytesIO(b"dummy pdf contents for resource sharing")
        dummy_file.name = "syllabus.pdf"

        res = client.post(
            "/api/resources",
            data={
                "title": "Semester Syllabus",
                "description": "Shared study syllabus file.",
                "resource_type": "community",
                "reference_id": comm.community_id,
            },
            files={"file": ("syllabus.pdf", dummy_file, "application/pdf")},
            headers=headers1,
        )
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.json()}"
        data = res.json()
        assert data["title"] == "Semester Syllabus"
        assert data["file_type"] == "pdf"
        assert data["file_path"].startswith("/static/resources/")
        resource_id = data["resource_id"]
        print("   Upload passed!")

        print("3. Testing List Resources (API 2)...")
        res = client.get(
            f"/api/resources?resource_type=community&reference_id={comm.community_id}",
            headers=headers2,
        )
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert res.json()[0]["resource_id"] == resource_id

        # Outsider check
        res_out = client.get(
            f"/api/resources?resource_type=community&reference_id={comm.community_id}",
            headers=headers3,
        )
        assert res_out.status_code == 403
        print("   List and view restrictions passed!")

        print("4. Testing Download Resource & Track Download (API 3)...")
        res = client.get(f"/api/resources/{resource_id}/download", headers=headers2)
        print("Download response status:", res.status_code)
        print("Download response content:", res.text)
        assert res.status_code == 200
        assert res.content == b"dummy pdf contents for resource sharing"
        
        # Verify download count and record in DB
        res_info = client.get(f"/api/resources/{resource_id}", headers=headers1)
        assert res_info.status_code == 200
        assert res_info.json()["download_count"] == 1
        print("   Download and tracking passed!")

        print("5. Testing Search Resources (API 4)...")
        # Search by u2 (authorized member)
        res = client.get("/api/resources/search?keyword=syllabus", headers=headers2)
        assert res.status_code == 200
        assert len(res.json()) == 1

        # Search by u3 (unauthorized outsider) -> should return 0 results
        res_out = client.get("/api/resources/search?keyword=syllabus", headers=headers3)
        assert res_out.status_code == 200
        assert len(res_out.json()) == 0
        print("   Search and privacy filtering passed!")

        print("6. Testing Analytics API (API 5)...")
        res = client.get(f"/api/resources/{resource_id}/analytics", headers=headers1)
        assert res.status_code == 200
        anal_data = res.json()
        assert anal_data["total_downloads"] == 1
        assert len(anal_data["downloads"]) == 1
        assert anal_data["downloads"][0]["user_name"] == "Resource Member"
        print("   Analytics verification passed!")

        print("7. Testing Delete Resource (API 6)...")
        # Outsider delete attempt
        res_del = client.delete(f"/api/resources/{resource_id}", headers=headers2)
        assert res_del.status_code == 403
        
        # Owner delete
        res_del = client.delete(f"/api/resources/{resource_id}", headers=headers1)
        assert res_del.status_code == 200
        
        # Confirm file removed
        local_path = data["file_path"].replace("/static/", "uploads/")
        assert not os.path.exists(local_path)
        print("   Delete and cleanup passed!")

        print("\nAll 6 Resource Hub APIs verified successfully! 🚀📂")

    finally:
        db.close()


if __name__ == "__main__":
    from app.database.init_db import init_db
    init_db()
    test_resource_workflow()
