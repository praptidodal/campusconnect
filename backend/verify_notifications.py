import sys
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.database import get_db, SessionLocal
from app.models.user import User, UserRole
from app.models.follow import Follower
from app.models.post import Post, Like, Comment
from app.models.community import Community, CommunityMember
from app.models.notification import Notification, NotificationPreference
from app.auth.jwt_handler import create_access_token
from app.utils.hashing import hash_password

client = TestClient(app)


def setup_test_users(db: Session):
    # Clear old test data first to ensure clean state
    db.query(Notification).delete()
    db.query(NotificationPreference).delete()
    db.query(Follower).delete()
    db.query(Like).delete()
    db.query(Comment).delete()
    db.query(Post).delete()
    db.query(CommunityMember).delete()
    db.query(Community).delete()
    db.query(User).filter(User.email.like("test_notif_%@example.com")).delete()
    db.commit()

    # Create two test users
    u1 = User(
        name="Notif Receiver",
        email="test_notif_receiver@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.student.value,
    )
    u2 = User(
        name="Notif Sender",
        email="test_notif_sender@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.student.value,
    )
    db.add(u1)
    db.add(u2)
    db.commit()
    db.refresh(u1)
    db.refresh(u2)

    # Initialize preferences row manually if not done by registers
    # (register_user does this, but since we are inserting directly into DB here, we initialize it)
    pref1 = NotificationPreference(user_id=u1.user_id)
    pref2 = NotificationPreference(user_id=u2.user_id)
    db.add(pref1)
    db.add(pref2)
    db.commit()

    # Create a post owned by u1 (Receiver) for u2 (Sender) to like/comment on
    p1 = Post(
        user_id=u1.user_id,
        content="Welcome to CampusConnect!",
    )
    db.add(p1)
    db.commit()
    db.refresh(p1)

    # Create a community owned by u1 (Receiver) for u2 (Sender) to join
    c1 = Community(
        community_name="Notif Club",
        description="Testing notifications",
        category="Interest Groups",
        created_by=u1.user_id,
    )
    db.add(c1)
    db.flush()

    member = CommunityMember(
        community_id=c1.community_id,
        user_id=u1.user_id,
        role="owner",
    )
    db.add(member)
    db.commit()
    db.refresh(c1)

    return u1, u2, p1, c1


def test_notifications_workflow():
    db = SessionLocal()
    try:
        print("1. Setting up test data...")
        u1, u2, p1, c1 = setup_test_users(db)

        token1 = create_access_token({"sub": str(u1.user_id)})
        token2 = create_access_token({"sub": str(u2.user_id)})

        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}

        print("2. Testing get preferences (API 6)...")
        res = client.get("/api/notifications/preferences", headers=headers1)
        assert res.status_code == 200, f"Failed preferences get: {res.text}"
        prefs = res.json()
        assert prefs["like_notifications"] is True
        assert prefs["follow_notifications"] is True
        print("   GET Preferences passed!")

        print("3. Testing update preferences (API 7)...")
        res = client.put(
            "/api/notifications/preferences",
            json={"like_notifications": False, "follow_notifications": True},
            headers=headers1,
        )
        assert res.status_code == 200, f"Failed preferences update: {res.text}"
        prefs = res.json()
        assert prefs["like_notifications"] is False
        assert prefs["follow_notifications"] is True
        print("   PUT Preferences passed!")

        # Reset like preferences to True for notifications trigger tests
        client.put(
            "/api/notifications/preferences",
            json={"like_notifications": True},
            headers=headers1,
        )

        print("4. Triggering actions to generate notifications...")
        # Action A: Follow User
        res = client.post(f"/api/follow/{u1.user_id}", headers=headers2)
        assert res.status_code == 201, f"Follow failed: {res.text}"

        # Action B: Like Post
        res = client.post(f"/api/posts/{p1.post_id}/like", headers=headers2)
        assert res.status_code == 200, f"Like failed: {res.text}"

        # Action C: Comment Post
        res = client.post(f"/api/posts/{p1.post_id}/comments", json={"comment_text": "Nice post!"}, headers=headers2)
        assert res.status_code == 201, f"Comment failed: {res.text}"

        # Action D: Join Community
        res = client.post(f"/api/communities/{c1.community_id}/join", headers=headers2)
        assert res.status_code == 200, f"Join failed: {res.text}"

        print("5. Testing unread count (API 2)...")
        res = client.get("/api/notifications/unread-count", headers=headers1)
        assert res.status_code == 200, f"Unread count check failed: {res.text}"
        data = res.json()
        # Should have received: 1 follow, 1 like, 1 comment, 1 join = 4 notifications
        assert data["count"] == 4, f"Expected 4 unread notifications, got {data['count']}"
        print("   GET Unread Count passed!")

        print("6. Testing list notifications pagination (API 1)...")
        res = client.get("/api/notifications?skip=0&limit=5", headers=headers1)
        assert res.status_code == 200, f"Notifications list failed: {res.text}"
        notifs = res.json()
        assert len(notifs) == 4, f"Expected 4 notifications, got {len(notifs)}"
        # Verify that all expected types are present
        notif_types = [n["notification_type"] for n in notifs]
        expected_types = {"community_join", "comment", "like", "follow"}
        assert set(notif_types) == expected_types, f"Expected types {expected_types}, got {notif_types}"
        print("   GET Notifications list passed!")

        # Grab notification ID for tests
        like_notif_id = next(n["notification_id"] for n in notifs if n["notification_type"] == "like")
        follow_notif_id = next(n["notification_id"] for n in notifs if n["notification_type"] == "follow")

        print("7. Testing mark single read (API 3)...")
        res = client.put(f"/api/notifications/{like_notif_id}/read", headers=headers1)
        assert res.status_code == 200, f"Mark read failed: {res.text}"
        
        # Verify count decreased to 3
        res = client.get("/api/notifications/unread-count", headers=headers1)
        assert res.json()["count"] == 3
        print("   PUT Single Read passed!")

        print("8. Testing preference toggle blocking...")
        # Toggle off like notifications
        client.put(
            "/api/notifications/preferences",
            json={"like_notifications": False},
            headers=headers1,
        )
        
        # Unlike post and like again
        client.delete(f"/api/posts/{p1.post_id}/like", headers=headers2)
        res = client.post(f"/api/posts/{p1.post_id}/like", headers=headers2)
        assert res.status_code == 200

        # Unread count should remain 3 (no new notification created for likes)
        res = client.get("/api/notifications/unread-count", headers=headers1)
        assert res.json()["count"] == 3, f"Expected count to stay at 3, got {res.json()['count']}"
        print("   Preference Toggle blocking passed!")

        print("9. Testing mark all read (API 4)...")
        res = client.put("/api/notifications/read-all", headers=headers1)
        assert res.status_code == 200, f"Mark all read failed: {res.text}"
        
        res = client.get("/api/notifications/unread-count", headers=headers1)
        assert res.json()["count"] == 0, f"Expected 0 unread count, got {res.json()['count']}"
        print("   PUT Mark All Read passed!")

        print("10. Testing delete notification (API 5)...")
        res = client.delete(f"/api/notifications/{follow_notif_id}", headers=headers1)
        assert res.status_code == 200, f"Delete failed: {res.text}"
        
        # Fetch list and verify deleted notification is gone
        res = client.get("/api/notifications", headers=headers1)
        notifs_after_delete = res.json()
        assert not any(n["notification_id"] == follow_notif_id for n in notifs_after_delete)
        print("   DELETE Notification passed!")

        print("\nAll 7 Notifications APIs & Preference logic verified successfully! 🚀💼")

    except AssertionError as e:
        print(f"\nAssertion Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected Error: {e}")
        sys.exit(1)
    finally:
        # Clean up database test records
        db.query(Notification).delete()
        db.query(NotificationPreference).delete()
        db.query(Follower).delete()
        db.query(Like).delete()
        db.query(Comment).delete()
        db.query(Post).delete()
        db.query(CommunityMember).delete()
        db.query(Community).delete()
        db.query(User).filter(User.email.like("test_notif_%@example.com")).delete()
        db.commit()
        db.close()


if __name__ == "__main__":
    test_notifications_workflow()
