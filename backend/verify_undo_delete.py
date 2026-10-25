from fastapi.testclient import TestClient
from app.main import app
from app.database.database import get_db, SessionLocal
from app.models.user import User
from app.models.profile import Profile
from app.auth.jwt_handler import create_access_token
import os

client = TestClient(app)

def test_profile_picture_deletion():
    db = SessionLocal()
    try:
        # Create a test user
        test_user = db.query(User).filter(User.email == "test_delete_avatar@example.com").first()
        if not test_user:
            test_user = User(name="Test Avatar User", email="test_delete_avatar@example.com", password_hash="hash", role="student")
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
        
        # Create a profile with a dummy picture URL
        profile = db.query(Profile).filter(Profile.user_id == test_user.user_id).first()
        if not profile:
            profile = Profile(user_id=test_user.user_id)
            db.add(profile)
            db.commit()
            db.refresh(profile)
        
        # Create a dummy image file
        dummy_dir = "uploads/avatars"
        os.makedirs(dummy_dir, exist_ok=True)
        dummy_filename = "test_avatar_file.png"
        dummy_filepath = os.path.join(dummy_dir, dummy_filename)
        with open(dummy_filepath, "w") as f:
            f.write("dummy image content")
            
        profile.profile_picture = f"/static/avatars/{dummy_filename}"
        db.commit()
        
        print("1. Set up profile picture:")
        print(f"   URL: {profile.profile_picture}")
        print(f"   Physical file exists: {os.path.exists(dummy_filepath)}")
        
        # Generate token
        token = create_access_token({"sub": str(test_user.user_id)})
        headers = {"Authorization": f"Bearer {token}"}
        
        # Delete profile picture
        response = client.delete("/api/profile/picture", headers=headers)
        print("2. Call DELETE /api/profile/picture:")
        print(f"   Response Status: {response.status_code}")
        print(f"   Response Content: {response.json()}")
        
        # Query the database using a fresh session to avoid cache/transaction isolation issues
        db2 = SessionLocal()
        try:
            profile_fresh = db2.query(Profile).filter(Profile.user_id == test_user.user_id).first()
            print("3. Check results:")
            print(f"   Profile picture field in DB: {profile_fresh.profile_picture}")
            print(f"   Physical file exists: {os.path.exists(dummy_filepath)}")
            
            assert response.status_code == 200
            assert profile_fresh.profile_picture is None
            assert not os.path.exists(dummy_filepath)
        finally:
            db2.close()
        print("\nProfile picture deletion endpoint verified successfully! 🚀📷")
        
    finally:
        # Cleanup
        try:
            db_cleanup = SessionLocal()
            u = db_cleanup.query(User).filter(User.email == "test_delete_avatar@example.com").first()
            if u:
                prof = db_cleanup.query(Profile).filter(Profile.user_id == u.user_id).first()
                if prof:
                    db_cleanup.delete(prof)
                db_cleanup.delete(u)
                db_cleanup.commit()
            db_cleanup.close()
        except Exception as e:
            print(f"Cleanup error: {e}")
        db.close()

if __name__ == "__main__":
    test_profile_picture_deletion()
