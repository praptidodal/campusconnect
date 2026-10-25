import os
import shutil
from app.database.database import SessionLocal
from app.models.user import User
from app.models.profile import Profile
from app.models.notification import Notification, NotificationPreference
from app.models.community import Community, CommunityMember, CommunityPost
from app.models.resource import Resource, ResourceType
from app.models.post import Post
from app.models.chat import ConversationParticipant, Message, MessageRead
from app.models.follow import Follower
from app.models.moderation import Report, AdminLog
from app.models.search import SearchHistory
from app.models.analytics import UserActivityLog
from app.models.event import EventRegistration
from app.models.collaboration import Application


def cleanup_test_data():
    db = SessionLocal()
    emails_to_delete = [
        "test_chat_1@example.com",
        "test_chat_2@example.com",
        "test_res_owner@example.com",
        "test_res_member@example.com",
        "test_res_out@example.com"
    ]

    print("Starting cleanup of specified test users...")

    for email in emails_to_delete:
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"Deleting user {user.name} ({user.email})...")
            user_id = user.user_id

            # 1. Delete Profiles and Notification Preferences
            db.query(Profile).filter(Profile.user_id == user_id).delete(synchronize_session=False)
            db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).delete(synchronize_session=False)

            # 2. Delete Community posts, memberships, and resources
            comm_ids = [c.community_id for c in db.query(Community).filter(Community.created_by == user_id).all()]
            db.query(CommunityPost).filter(
                (CommunityPost.user_id == user_id) | (CommunityPost.community_id.in_(comm_ids))
            ).delete(synchronize_session=False)
            db.query(CommunityMember).filter(
                (CommunityMember.user_id == user_id) | (CommunityMember.community_id.in_(comm_ids))
            ).delete(synchronize_session=False)
            db.query(Resource).filter(
                (Resource.uploaded_by == user_id) |
                ((Resource.resource_type == ResourceType.community) & (Resource.reference_id.in_(comm_ids)))
            ).delete(synchronize_session=False)

            # 3. Delete posts
            db.query(Post).filter(Post.user_id == user_id).delete(synchronize_session=False)

            # 4. Delete followers
            db.query(Follower).filter((Follower.follower_user_id == user_id) | (Follower.following_user_id == user_id)).delete(synchronize_session=False)

            # 5. Delete reports and moderation logs
            db.query(Report).filter(Report.reported_by == user_id).delete(synchronize_session=False)
            db.query(AdminLog).filter(AdminLog.admin_id == user_id).delete(synchronize_session=False)

            # 6. Delete notifications
            db.query(Notification).filter((Notification.sender_id == user_id) | (Notification.receiver_id == user_id)).delete(synchronize_session=False)

            # 7. Delete chat messages, read receipts, and participants
            db.query(MessageRead).filter(MessageRead.user_id == user_id).delete(synchronize_session=False)
            db.query(Message).filter(Message.sender_id == user_id).delete(synchronize_session=False)
            db.query(ConversationParticipant).filter(ConversationParticipant.user_id == user_id).delete(synchronize_session=False)

            # 8. Delete search history, analytics logs, event registrations, and collaboration applications
            db.query(SearchHistory).filter(SearchHistory.user_id == user_id).delete(synchronize_session=False)
            db.query(UserActivityLog).filter(UserActivityLog.user_id == user_id).delete(synchronize_session=False)
            db.query(EventRegistration).filter(EventRegistration.user_id == user_id).delete(synchronize_session=False)
            db.query(Application).filter(Application.applicant_id == user_id).delete(synchronize_session=False)

            # 9. Delete communities created by this user
            db.query(Community).filter(Community.created_by == user_id).delete(synchronize_session=False)

            # 10. Delete User object
            db.delete(user)
            db.commit()
            print(f"Successfully deleted {email}.")
        else:
            print(f"User {email} not found.")

    # ---------------------------------------------------------------------------
    # 11. Remove and delete all profile pictures
    # ---------------------------------------------------------------------------
    print("\nRemoving all profile pictures from database...")
    # Clear profile_picture database field for all remaining profiles
    profiles = db.query(Profile).all()
    for prof in profiles:
        prof._profile_picture = None
        prof.avatar_is_deleted = False
        prof.avatar_deleted_at = None
    db.commit()
    print(f"Successfully cleared database picture URL fields for {len(profiles)} profiles.")

    # Delete all avatar picture files from filesystem uploads folder
    avatar_dir = "uploads/avatars"
    if os.path.exists(avatar_dir):
        print(f"Deleting files inside {avatar_dir}...")
        for filename in os.listdir(avatar_dir):
            file_path = os.path.join(avatar_dir, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                print(f"Failed to delete {file_path}: {e}")
        print("Successfully cleared all avatar image files on disk.")

    db.close()
    print("Cleanup complete!")


if __name__ == "__main__":
    cleanup_test_data()
