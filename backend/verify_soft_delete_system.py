import os
import time
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.database.database import SessionLocal
from app.models.user import User
from app.models.post import Post
from app.models.community import Community, CommunityMember, CommunityPost
from app.models.resource import Resource, ResourceType
from app.models.profile import Profile
from app.models.notification import Notification, ReferenceType, NotificationPreference
from app.auth.jwt_handler import create_access_token
from app.services.cleanup_service import run_cleanup_job

client = TestClient(app)


def delete_user_completely(db, email):
    """Cleanly delete user and their profile/preferences to avoid SQLAlchemy flush errors."""
    user = db.query(User).filter(User.email == email).first()
    if user:
        # Get community IDs created by this user
        comm_ids = [c.community_id for c in db.query(Community).filter(Community.created_by == user.user_id).all()]

        # 1. Delete profiles
        db.query(Profile).filter(Profile.user_id == user.user_id).delete(synchronize_session=False)
        
        # 2. Delete notification preferences
        db.query(NotificationPreference).filter(NotificationPreference.user_id == user.user_id).delete(synchronize_session=False)
        
        # 3. Delete community posts
        db.query(CommunityPost).filter(
            (CommunityPost.user_id == user.user_id) | (CommunityPost.community_id.in_(comm_ids))
        ).delete(synchronize_session=False)
        
        # 4. Delete community memberships
        db.query(CommunityMember).filter(
            (CommunityMember.user_id == user.user_id) | (CommunityMember.community_id.in_(comm_ids))
        ).delete(synchronize_session=False)
        
        # 5. Delete resources
        db.query(Resource).filter(
            (Resource.uploaded_by == user.user_id) | 
            ((Resource.resource_type == ResourceType.community) & (Resource.reference_id.in_(comm_ids)))
        ).delete(synchronize_session=False)

        # 6. Delete posts
        db.query(Post).filter(Post.user_id == user.user_id).delete(synchronize_session=False)

        # 7. Delete communities
        db.query(Community).filter(Community.created_by == user.user_id).delete(synchronize_session=False)
        
        # 8. Delete user
        db.delete(user)
        db.commit()


def test_soft_delete_system():
    print("Starting Soft-Delete and Undo System Backend Verification...")
    db = SessionLocal()

    try:
        # ---------------------------------------------------------------------------
        # 1. Setup User and Token
        # ---------------------------------------------------------------------------
        email = "soft_delete_test_user@example.com"
        # Clean up existing test user completely
        delete_user_completely(db, email)

        # Try registering user
        payload = {
            "name": "Soft Delete Tester",
            "email": email,
            "password": "password123",
            "role": "student"
        }
        res_reg = client.post("/api/auth/register", json=payload)
        print(f"User registration response status: {res_reg.status_code}")
        assert res_reg.status_code == 201

        # Test duplicate registration error message requirement
        res_dup = client.post("/api/auth/register", json=payload)
        print(f"Duplicate user registration status: {res_dup.status_code}")
        print(f"Duplicate user registration response: {res_dup.json()}")
        assert res_dup.status_code == 400
        assert res_dup.json()["detail"]["message"] == "Account already exists."
        print("PASS: Duplicate registration check returned correct error message.")

        # Recreate db session to avoid REPEATABLE READ cached empty result
        db.close()
        db = SessionLocal()

        # Fetch created user and generate token
        user = db.query(User).filter(User.email == email).first()
        assert user is not None, "Failed to retrieve registered user from database."
        user_id = user.user_id
        token = create_access_token({"sub": str(user_id)})
        headers = {"Authorization": f"Bearer {token}"}

        # ---------------------------------------------------------------------------
        # 2. Test Social Post Soft-Delete and Undo
        # ---------------------------------------------------------------------------
        # Create a dummy image file
        dummy_post_dir = "uploads/posts"
        os.makedirs(dummy_post_dir, exist_ok=True)
        dummy_post_file = os.path.join(dummy_post_dir, "test_post_image.png")
        with open(dummy_post_file, "w") as f:
            f.write("dummy post image content")

        # Create post
        post = Post(
            user_id=user_id,
            content="Testing soft delete logic",
            image_url=f"/static/posts/test_post_image.png",
            visibility="public"
        )
        db.add(post)
        db.commit()
        db.refresh(post)
        post_id = post.post_id

        # Verify post is in feed
        res_feed = client.get("/api/posts/feed", headers=headers)
        feed_ids = [p["post_id"] for p in res_feed.json()]
        assert post_id in feed_ids
        print("PASS: Post created and visible in feed.")

        # Delete post (soft-delete)
        res_del = client.delete(f"/api/posts/{post_id}", headers=headers)
        assert res_del.status_code == 200
        print("PASS: Soft-delete DELETE API returned success.")

        # Recreate session to read updated data
        db.close()
        db = SessionLocal()

        # Verify filtered out of feed
        res_feed = client.get("/api/posts/feed", headers=headers)
        feed_ids = [p["post_id"] for p in res_feed.json()]
        assert post_id not in feed_ids
        print("PASS: Soft-deleted post excluded from feed.")

        # Undo deletion
        res_undo = client.post(f"/api/posts/{post_id}/undo", headers=headers)
        assert res_undo.status_code == 200
        print("PASS: Post undo restoration returned success.")

        # Recreate session to read updated data
        db.close()
        db = SessionLocal()

        # Verify post back in feed
        res_feed = client.get("/api/posts/feed", headers=headers)
        feed_ids = [p["post_id"] for p in res_feed.json()]
        assert post_id in feed_ids
        print("PASS: Restored post visible in feed again.")

        # Delete again to test background cleanup
        client.delete(f"/api/posts/{post_id}", headers=headers)
        
        # Recreate session
        db.close()
        db = SessionLocal()

        # Simulate time passing by altering deleted_at back by 65 seconds
        post_db = db.query(Post).filter(Post.post_id == post_id).first()
        post_db.deleted_at = datetime.utcnow() - timedelta(seconds=65)
        db.commit()

        # Run background cleanup job
        run_cleanup_job(db)
        
        # Recreate session
        db.close()
        db = SessionLocal()

        # Verify hard-deleted from DB and disk
        post_cleanup = db.query(Post).filter(Post.post_id == post_id).first()
        assert post_cleanup is None
        assert not os.path.exists(dummy_post_file)
        print("PASS: Post hard-deleted from DB and file removed from storage after 60s.")

        # ---------------------------------------------------------------------------
        # 3. Test Community Post Soft-Delete and Undo
        # ---------------------------------------------------------------------------
        # Setup community
        community = db.query(Community).filter(Community.community_name == "Soft Delete Comm").first()
        if not community:
            community = Community(community_name="Soft Delete Comm", created_by=user_id)
            db.add(community)
            db.commit()
            db.refresh(community)
            # Add member
            member = CommunityMember(community_id=community.community_id, user_id=user_id, role="owner")
            db.add(member)
            db.commit()

        # Create community post
        dummy_comm_file = os.path.join(dummy_post_dir, "test_comm_image.png")
        with open(dummy_comm_file, "w") as f:
            f.write("dummy comm image content")

        c_post = CommunityPost(
            community_id=community.community_id,
            user_id=user_id,
            content="Testing community soft delete",
            image_url=f"/static/posts/test_comm_image.png"
        )
        db.add(c_post)
        db.commit()
        db.refresh(c_post)
        c_post_id = c_post.community_post_id

        # Verify visible in community feed
        res_comm_feed = client.get(f"/api/communities/{community.community_id}/posts", headers=headers)
        comm_post_ids = [p["community_post_id"] for p in res_comm_feed.json()]
        assert c_post_id in comm_post_ids
        print("PASS: Community post created and visible in community feed.")

        # Delete community post
        res_comm_del = client.delete(f"/api/community-posts/{c_post_id}", headers=headers)
        assert res_comm_del.status_code == 200
        print("PASS: Community post soft-delete returned success.")

        # Recreate session
        db.close()
        db = SessionLocal()

        # Verify excluded from feed
        res_comm_feed = client.get(f"/api/communities/{community.community_id}/posts", headers=headers)
        comm_post_ids = [p["community_post_id"] for p in res_comm_feed.json()]
        assert c_post_id not in comm_post_ids
        print("PASS: Soft-deleted community post excluded from community feed.")

        # Undo delete community post
        res_comm_undo = client.post(f"/api/community-posts/{c_post_id}/undo", headers=headers)
        assert res_comm_undo.status_code == 200
        print("PASS: Community post undo restoration returned success.")

        # Recreate session
        db.close()
        db = SessionLocal()

        # Verify restored in feed
        res_comm_feed = client.get(f"/api/communities/{community.community_id}/posts", headers=headers)
        comm_post_ids = [p["community_post_id"] for p in res_comm_feed.json()]
        assert c_post_id in comm_post_ids
        print("PASS: Restored community post visible in community feed.")

        # Soft-delete again for cleanup test
        client.delete(f"/api/community-posts/{c_post_id}", headers=headers)
        
        # Recreate session
        db.close()
        db = SessionLocal()

        # Simulate expiry
        c_post_db = db.query(CommunityPost).filter(CommunityPost.community_post_id == c_post_id).first()
        c_post_db.deleted_at = datetime.utcnow() - timedelta(seconds=65)
        db.commit()

        # Run cleanup job
        run_cleanup_job(db)
        
        # Recreate session
        db.close()
        db = SessionLocal()

        # Verify hard delete
        c_post_cleanup = db.query(CommunityPost).filter(CommunityPost.community_post_id == c_post_id).first()
        assert c_post_cleanup is None
        assert not os.path.exists(dummy_comm_file)
        print("PASS: Community post hard-deleted and file removed from storage after 60s.")

        # ---------------------------------------------------------------------------
        # 4. Test Resource Soft-Delete and Undo
        # ---------------------------------------------------------------------------
        # Create resource file
        dummy_res_dir = "uploads/resources/communities"
        os.makedirs(dummy_res_dir, exist_ok=True)
        dummy_res_file = os.path.join(dummy_res_dir, "test_resource.pdf")
        with open(dummy_res_file, "w") as f:
            f.write("dummy resource pdf content")

        res_obj = Resource(
            title="Syllabus PDF",
            description="Course syllabus",
            resource_type=ResourceType.community,
            reference_id=community.community_id,
            uploaded_by=user_id,
            file_path="/static/resources/communities/test_resource.pdf",
            file_size=24,
            file_type="pdf"
        )
        db.add(res_obj)
        db.commit()
        db.refresh(res_obj)
        res_id = res_obj.resource_id

        # Verify resource is in listings
        res_list = client.get(f"/api/resources?resource_type=community&reference_id={community.community_id}", headers=headers)
        res_ids = [r["resource_id"] for r in res_list.json()]
        assert res_id in res_ids
        print("PASS: Resource created and visible in resource list.")

        # Delete resource
        res_del_resp = client.delete(f"/api/resources/{res_id}", headers=headers)
        assert res_del_resp.status_code == 200
        print("PASS: Resource soft-delete returned success.")

        # Recreate session
        db.close()
        db = SessionLocal()

        # Verify resource is excluded from listings
        res_list = client.get(f"/api/resources?resource_type=community&reference_id={community.community_id}", headers=headers)
        res_ids = [r["resource_id"] for r in res_list.json()]
        assert res_id not in res_ids
        print("PASS: Soft-deleted resource excluded from resource list.")

        # Undo delete resource
        res_undo_resp = client.post(f"/api/resources/{res_id}/undo", headers=headers)
        assert res_undo_resp.status_code == 200
        print("PASS: Resource undo restoration returned success.")

        # Recreate session
        db.close()
        db = SessionLocal()

        # Verify resource is back in listings
        res_list = client.get(f"/api/resources?resource_type=community&reference_id={community.community_id}", headers=headers)
        res_ids = [r["resource_id"] for r in res_list.json()]
        assert res_id in res_ids
        print("PASS: Restored resource visible in resource list.")

        # Soft-delete again for cleanup test
        client.delete(f"/api/resources/{res_id}", headers=headers)
        
        # Recreate session
        db.close()
        db = SessionLocal()

        # Simulate expiry
        res_db = db.query(Resource).filter(Resource.resource_id == res_id).first()
        res_db.deleted_at = datetime.utcnow() - timedelta(seconds=65)
        db.commit()

        # Run cleanup job
        run_cleanup_job(db)
        
        # Recreate session
        db.close()
        db = SessionLocal()

        # Verify hard delete
        res_cleanup = db.query(Resource).filter(Resource.resource_id == res_id).first()
        assert res_cleanup is None
        assert not os.path.exists(dummy_res_file)
        print("PASS: Resource hard-deleted and file removed from storage after 60s.")

        # ---------------------------------------------------------------------------
        # 5. Test Profile Avatar Soft-Delete and Undo
        # ---------------------------------------------------------------------------
        # Setup profile
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        if not profile:
            profile = Profile(user_id=user_id)
            db.add(profile)
            db.commit()
            db.refresh(profile)

        # Set profile picture
        dummy_avatar_dir = "uploads/avatars"
        os.makedirs(dummy_avatar_dir, exist_ok=True)
        dummy_avatar_file = os.path.join(dummy_avatar_dir, "test_avatar.png")
        with open(dummy_avatar_file, "w") as f:
            f.write("dummy avatar content")

        profile.profile_picture = f"/static/avatars/test_avatar.png"
        db.commit()

        # Verify visible in profile details
        res_profile = client.get("/api/profile/me", headers=headers)
        assert res_profile.json()["profile_picture"] == "/static/avatars/test_avatar.png"
        print("PASS: Avatar set and visible in profile details.")

        # Delete avatar
        res_avatar_del = client.delete("/api/profile/picture", headers=headers)
        assert res_avatar_del.status_code == 200
        print("PASS: Avatar soft-delete returned success.")

        # Recreate session
        db.close()
        db = SessionLocal()

        # Verify hidden in profile details
        res_profile = client.get("/api/profile/me", headers=headers)
        assert res_profile.json()["profile_picture"] is None
        print("PASS: Soft-deleted avatar hidden in profile details.")

        # Undo delete avatar
        res_avatar_undo = client.post("/api/profile/picture/undo", headers=headers)
        assert res_avatar_undo.status_code == 200
        print("PASS: Avatar undo restoration returned success.")

        # Recreate session
        db.close()
        db = SessionLocal()

        # Verify visible in profile details again
        res_profile = client.get("/api/profile/me", headers=headers)
        assert res_profile.json()["profile_picture"] == "/static/avatars/test_avatar.png"
        print("PASS: Restored avatar visible in profile details again.")

        # Soft-delete again for cleanup test
        client.delete("/api/profile/picture", headers=headers)
        
        # Recreate session
        db.close()
        db = SessionLocal()

        # Simulate expiry
        profile_db = db.query(Profile).filter(Profile.user_id == user_id).first()
        profile_db.avatar_deleted_at = datetime.utcnow() - timedelta(seconds=65)
        db.commit()

        # Run cleanup job
        run_cleanup_job(db)
        
        # Recreate session
        db.close()
        db = SessionLocal()

        # Verify hard delete
        profile_cleanup = db.query(Profile).filter(Profile.user_id == user_id).first()
        assert profile_cleanup.profile_picture is None
        assert not os.path.exists(dummy_avatar_file)
        print("PASS: Avatar hard-deleted and file removed from storage after 60s.")

        print("Verification Complete: All tests passed successfully!")

    finally:
        db.close()
        db = SessionLocal()
        delete_user_completely(db, email)
        db.close()


if __name__ == "__main__":
    test_soft_delete_system()
