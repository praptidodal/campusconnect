import os
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.post import Post
from app.models.community import CommunityPost
from app.models.resource import Resource
from app.models.profile import Profile
from app.models.notification import Notification, ReferenceType
from app.models.chat import Message


def run_cleanup_job(db: Session):
    limit_time = datetime.utcnow() - timedelta(seconds=60)

    # 1. Clean up Posts
    posts_to_delete = db.query(Post).filter(
        Post.is_deleted == True,
        Post.deleted_at <= limit_time
    ).all()
    for post in posts_to_delete:
        try:
            if post.image_url:
                local_path = post.image_url.replace("/static/", "uploads/")
                if os.path.exists(local_path):
                    try:
                        os.remove(local_path)
                        print(f"Cleanup: Deleted post image file at {local_path}")
                    except Exception as e:
                        print(f"Cleanup warning: Failed to delete post image file {local_path}: {e}")
            # Delete notifications referencing this post
            db.query(Notification).filter(
                Notification.reference_type == ReferenceType.post,
                Notification.reference_id == post.post_id
            ).delete(synchronize_session=False)
            db.delete(post)
            db.commit()
            print(f"Cleanup: Permanently deleted post record ID {post.post_id}")
        except Exception as e:
            db.rollback()
            print(f"Cleanup error: Failed to clean up post {post.post_id}: {e}")

    # 2. Clean up CommunityPosts
    community_posts_to_delete = db.query(CommunityPost).filter(
        CommunityPost.is_deleted == True,
        CommunityPost.deleted_at <= limit_time
    ).all()
    for c_post in community_posts_to_delete:
        try:
            if c_post.image_url:
                local_path = c_post.image_url.replace("/static/", "uploads/")
                if os.path.exists(local_path):
                    try:
                        os.remove(local_path)
                        print(f"Cleanup: Deleted community post image file at {local_path}")
                    except Exception as e:
                        print(f"Cleanup warning: Failed to delete community post image file {local_path}: {e}")
            db.delete(c_post)
            db.commit()
            print(f"Cleanup: Permanently deleted community post record ID {c_post.community_post_id}")
        except Exception as e:
            db.rollback()
            print(f"Cleanup error: Failed to clean up community post {c_post.community_post_id}: {e}")

    # 3. Clean up Resources
    resources_to_delete = db.query(Resource).filter(
        Resource.is_deleted == True,
        Resource.deleted_at <= limit_time
    ).all()
    for res in resources_to_delete:
        try:
            local_path = res.file_path.replace("/static/", "uploads/")
            if os.path.exists(local_path):
                try:
                    os.remove(local_path)
                    print(f"Cleanup: Deleted resource file at {local_path}")
                except Exception as e:
                    print(f"Cleanup warning: Failed to delete resource file {local_path}: {e}")
            db.delete(res)
            db.commit()
            print(f"Cleanup: Permanently deleted resource record ID {res.resource_id}")
        except Exception as e:
            db.rollback()
            print(f"Cleanup error: Failed to clean up resource {res.resource_id}: {e}")

    # 4. Clean up Profiles (avatars)
    profiles_to_clean = db.query(Profile).filter(
        Profile.avatar_is_deleted == True,
        Profile.avatar_deleted_at <= limit_time
    ).all()
    for prof in profiles_to_clean:
        try:
            if prof._profile_picture:
                local_path = prof._profile_picture.replace("/static/", "uploads/")
                if os.path.exists(local_path):
                    try:
                        os.remove(local_path)
                        print(f"Cleanup: Deleted avatar file at {local_path}")
                    except Exception as e:
                        print(f"Cleanup warning: Failed to delete avatar file {local_path}: {e}")
            prof._profile_picture = None
            prof.avatar_is_deleted = False
            prof.avatar_deleted_at = None
            db.commit()
            print(f"Cleanup: Permanently cleared avatar picture for profile ID {prof.profile_id}")
        except Exception as e:
            db.rollback()
            print(f"Cleanup error: Failed to clean up avatar for profile {prof.profile_id}: {e}")

    # 5. Clean up Messages
    messages_to_delete = db.query(Message).filter(
        Message.is_deleted == True,
        Message.deleted_at <= limit_time
    ).all()
    for msg in messages_to_delete:
        try:
            if msg.attachment_path:
                local_path = msg.attachment_path.replace("/static/", "uploads/")
                if os.path.exists(local_path):
                    try:
                        os.remove(local_path)
                        print(f"Cleanup: Deleted message attachment file at {local_path}")
                    except Exception as e:
                        print(f"Cleanup warning: Failed to delete message attachment file {local_path}: {e}")
            db.delete(msg)
            db.commit()
            print(f"Cleanup: Permanently deleted message record ID {msg.message_id}")
        except Exception as e:
            db.rollback()
            print(f"Cleanup error: Failed to clean up message {msg.message_id}: {e}")


async def start_cleanup_scheduler():
    while True:
        try:
            db = SessionLocal()
            try:
                run_cleanup_job(db)
            finally:
                db.close()
        except Exception as e:
            print(f"Cleanup job error: {e}")
        await asyncio.sleep(10)
