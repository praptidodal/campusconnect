import sys
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.database import get_db, SessionLocal
from app.models.user import User, UserRole
from app.models.community import Community, CommunityMember, CommunityPost
from app.auth.jwt_handler import create_access_token
from app.utils.hashing import hash_password

client = TestClient(app)


def setup_test_users(db: Session):
    # Clear old test data first to ensure clean state
    db.query(CommunityPost).delete()
    db.query(CommunityMember).delete()
    db.query(Community).delete()
    db.query(User).filter(User.email.like("test_%@example.com")).delete()
    db.commit()

    # Create two test users
    u1 = User(
        name="Test User One",
        email="test_user1@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.student.value,
    )
    u2 = User(
        name="Test User Two",
        email="test_user2@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.student.value,
    )
    db.add(u1)
    db.add(u2)
    db.commit()
    db.refresh(u1)
    db.refresh(u2)
    return u1, u2


def test_communities_workflow():
    db = SessionLocal()
    try:
        print("1. Setting up test users...")
        u1, u2 = setup_test_users(db)

        token1 = create_access_token({"sub": str(u1.user_id)})
        token2 = create_access_token({"sub": str(u2.user_id)})

        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}

        print("2. Testing community creation (API 1)...")
        res = client.post(
            "/api/communities",
            json={
                "community_name": "AI & ML Club",
                "description": "A group for research and building models.",
                "category": "Technology",
                "logo_url": "https://example.com/logo.png",
            },
            headers=headers1,
        )
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.json()}"
        data = res.json()
        assert data["community_name"] == "AI & ML Club"
        assert data["category"] == "Technology"
        assert data["member_count"] == 1
        assert data["role"] == "owner"
        assert data["is_joined"] is True
        community_id = data["community_id"]
        print("   Community created successfully!")

        # Duplicate community name check
        res_dup = client.post(
            "/api/communities",
            json={
                "community_name": "AI & ML Club",
                "description": "Another club.",
                "category": "Technology",
            },
            headers=headers2,
        )
        assert res_dup.status_code == 400, f"Expected 400 for duplicate, got {res_dup.status_code}"
        print("   Duplicate validation passed!")

        print("3. Testing list communities (API 2)...")
        res = client.get("/api/communities", headers=headers2)
        assert res.status_code == 200
        data = res.json()
        assert len(data) >= 1
        # Check if first user returns role = owner, and second user returns role = None (not joined yet)
        res_u1 = client.get("/api/communities", headers=headers1).json()
        assert res_u1[0]["role"] == "owner"
        assert data[0]["role"] is None
        print("   List communities passed!")

        print("4. Testing search communities (API 11)...")
        res = client.get("/api/communities/search?name=AI&category=Technology", headers=headers1)
        assert res.status_code == 200
        assert len(res.json()) == 1
        res_empty = client.get("/api/communities/search?name=Nonexistent", headers=headers1)
        assert len(res_empty.json()) == 0
        print("   Search communities passed!")

        print("5. Testing join community (API 4)...")
        res = client.post(f"/api/communities/{community_id}/join", headers=headers2)
        assert res.status_code == 200
        assert res.json()["message"] == "Joined successfully"

        # Cannot join twice check
        res_join_again = client.post(f"/api/communities/{community_id}/join", headers=headers2)
        assert res_join_again.status_code == 400
        print("   Join community and double-join prevention passed!")

        print("6. Testing get community details (API 3)...")
        res = client.get(f"/api/communities/{community_id}", headers=headers2)
        assert res.status_code == 200
        data = res.json()
        assert data["member_count"] == 2
        assert data["is_joined"] is True
        assert data["role"] == "member"
        print("   Get community details passed!")

        print("7. Testing create community post (API 7)...")
        res = client.post(
            f"/api/communities/{community_id}/posts",
            json={
                "content": "Welcome to our first AI workshop!",
                "image_url": "https://example.com/workshop.jpg",
            },
            headers=headers2,
        )
        assert res.status_code == 201
        post_data = res.json()
        assert post_data["content"] == "Welcome to our first AI workshop!"
        assert post_data["author_name"] == "Test User Two"
        post_id = post_data["community_post_id"]
        print("   Create community post passed!")

        print("8. Testing get community feed (API 8)...")
        res = client.get(f"/api/communities/{community_id}/posts", headers=headers1)
        assert res.status_code == 200
        feed = res.json()
        assert len(feed) == 1
        assert feed[0]["content"] == "Welcome to our first AI workshop!"
        print("   Get community feed passed!")

        print("9. Testing get community members (API 6)...")
        res = client.get(f"/api/communities/{community_id}/members", headers=headers1)
        assert res.status_code == 200
        members = res.json()
        assert len(members) == 2
        owner_member = next(m for m in members if m["role"] == "owner")
        assert owner_member["name"] == "Test User One"
        print("   Get community members passed!")

        print("10. Testing community role management / promote (API 10)...")
        # Promote Test User Two to admin
        res = client.post(
            f"/api/communities/{community_id}/promote",
            json={"user_id": u2.user_id, "role": "admin"},
            headers=headers1,
        )
        assert res.status_code == 200
        
        # Verify user role is now admin
        res_details = client.get(f"/api/communities/{community_id}", headers=headers2).json()
        assert res_details["role"] == "admin"
        print("   Member promotion (member -> admin) passed!")

        print("11. Testing delete community post (API 9)...")
        # Admin deletes user post
        res = client.delete(f"/api/community-posts/{post_id}", headers=headers2)
        assert res.status_code == 200
        assert res.json()["message"] == "Post deleted successfully"

        # Verify post is deleted from feed
        res_feed = client.get(f"/api/communities/{community_id}/posts", headers=headers1).json()
        assert len(res_feed) == 0
        print("   Delete community post passed!")

        print("12. Testing leave community (API 5)...")
        # Owner attempts to leave, should fail
        res_owner_leave = client.delete(f"/api/communities/{community_id}/leave", headers=headers1)
        assert res_owner_leave.status_code == 400, f"Expected 400, got {res_owner_leave.status_code}"
        print("   Leaving as owner block validation passed!")

        # Admin leaves successfully
        res_admin_leave = client.delete(f"/api/communities/{community_id}/leave", headers=headers2)
        assert res_admin_leave.status_code == 200
        
        # Verify member count decreased
        res_final = client.get(f"/api/communities/{community_id}", headers=headers1).json()
        assert res_final["member_count"] == 1
        print("   Leaving community passed!")

        print("\nAll 11 Community APIs verified successfully! 🎉")

    finally:
        db.close()


if __name__ == "__main__":
    test_communities_workflow()
