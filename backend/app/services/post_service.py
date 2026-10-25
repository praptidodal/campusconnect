import os
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.profile import Profile
from app.models.connection import Connection
from app.models.post import Post, Like, Comment
from app.schemas.post import PostCreate


def _build_post_response(post: Post, current_user: User, db: Session) -> dict:
    author_user = db.query(User).filter(User.user_id == post.user_id).first()
    author_profile = db.query(Profile).filter(Profile.user_id == post.user_id).first()

    author_info = {
        "user_id":         author_user.user_id if author_user else post.user_id,
        "name":            author_user.name if author_user else "Deleted User",
        "role":            author_user.role if author_user else "student",
        "profile_picture": author_profile.profile_picture if author_profile else None
    }

    like_count    = db.query(Like).filter(Like.post_id == post.post_id).count()
    comment_count = db.query(Comment).filter(Comment.post_id == post.post_id).count()

    is_liked = (
        db.query(Like)
        .filter(Like.post_id == post.post_id, Like.user_id == current_user.user_id)
        .first()
    ) is not None

    return {
        "post_id":       post.post_id,
        "user_id":       post.user_id,
        "author":        author_info,
        "content":       post.content,
        "image_url":     post.image_url,
        "visibility":    post.visibility,
        "like_count":    like_count,
        "comment_count": comment_count,
        "is_liked":      is_liked,
        "created_at":    post.created_at
    }


# ── Post Actions ──────────────────────────────────────────────────────────────

def create_post(current_user: User, payload: PostCreate, db: Session) -> dict:
    post = Post(
        user_id    = current_user.user_id,
        content    = payload.content,
        image_url  = payload.image_url,
        visibility = payload.visibility
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    from app.services.analytics_service import log_user_activity
    log_user_activity(db, current_user.user_id, "post_created", post.post_id)

    return {"message": "Post created successfully"}



def get_feed(current_user: User, db: Session) -> List[dict]:
    # 1. Get user IDs that current user is connected to
    from sqlalchemy import or_
    connections = (
        db.query(Connection)
        .filter(or_(Connection.user_one == current_user.user_id, Connection.user_two == current_user.user_id))
        .all()
    )
    connected_ids = [
        (c.user_two if c.user_one == current_user.user_id else c.user_one)
        for c in connections
    ]
    # Always include current user's own posts
    connected_ids.append(current_user.user_id)

    # 2. Get posts that are either public OR from connected users (which map to followers visibility)
    posts = (
        db.query(Post)
        .filter(Post.is_deleted == False)
        .filter(
            (Post.visibility == "public") | (Post.user_id.in_(connected_ids))
        )
        .order_by(Post.created_at.desc())
        .all()
    )

    return [_build_post_response(p, current_user, db) for p in posts]


def get_user_posts(current_user: User, user_id: int, db: Session) -> List[dict]:
    # Check if target user exists
    target = db.query(User).filter(User.user_id == user_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "User not found"}
        )

    is_self      = current_user.user_id == user_id
    from app.services.connection_service import are_connected
    is_connected = are_connected(current_user.user_id, user_id, db)

    query = db.query(Post).filter(Post.user_id == user_id, Post.is_deleted == False)
    if is_self:
        # Can see everything
        pass
    elif is_connected:
        # Can see public and followers visibility
        query = query.filter(Post.visibility.in_(["public", "followers"]))
    else:
        # Can only see public
        query = query.filter(Post.visibility == "public")

    posts = query.order_by(Post.created_at.desc()).all()
    return [_build_post_response(p, current_user, db) for p in posts]


def delete_post(current_user: User, post_id: int, db: Session) -> dict:
    post = db.query(Post).filter(Post.post_id == post_id, Post.is_deleted == False).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Post not found"}
        )

    if post.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Only the creator can delete this post"}
        )

    post.is_deleted = True
    post.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Post deleted successfully"}


def undo_delete_post(current_user: User, post_id: int, db: Session) -> dict:
    post = db.query(Post).filter(Post.post_id == post_id, Post.is_deleted == True).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Post not found or cannot be restored"}
        )

    if post.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Only the creator can restore this post"}
        )

    post.is_deleted = False
    post.deleted_at = None
    db.commit()
    return {"message": "Post restored successfully"}


# ── Like Actions ──────────────────────────────────────────────────────────────

def like_post(current_user: User, post_id: int, db: Session) -> dict:
    post = db.query(Post).filter(Post.post_id == post_id, Post.is_deleted == False).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Post not found"}
        )

    existing = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.user_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Already liked this post"}
        )

    db.add(Like(user_id=current_user.user_id, post_id=post_id))
    db.commit()

    from app.services.analytics_service import log_user_activity
    log_user_activity(db, current_user.user_id, "post_liked", post_id)

    from app.services.notification_service import create_notification
    from app.models.notification import NotificationType, ReferenceType
    create_notification(
        db=db,
        receiver_id=post.user_id,
        notification_type=NotificationType.like,
        title="Post Liked",
        message=f"{current_user.name} liked your post.",
        sender_id=current_user.user_id,
        reference_type=ReferenceType.post,
        reference_id=post.post_id,
    )

    return {"message": "Post liked"}



def unlike_post(current_user: User, post_id: int, db: Session) -> dict:
    like = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.user_id).first()
    if not like:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "You have not liked this post"}
        )

    db.delete(like)
    db.commit()
    return {"message": "Post unliked"}


def get_post_likes(post_id: int, db: Session) -> List[dict]:
    rows = db.query(User).join(Like, Like.user_id == User.user_id).filter(Like.post_id == post_id).all()
    return [{"user_id": u.user_id, "name": u.name} for u in rows]


# ── Comment Actions ───────────────────────────────────────────────────────────

def add_comment(current_user: User, post_id: int, comment_text: str, db: Session) -> dict:
    post = db.query(Post).filter(Post.post_id == post_id, Post.is_deleted == False).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Post not found"}
        )

    new_comment = Comment(user_id=current_user.user_id, post_id=post_id, comment_text=comment_text)
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    from app.services.analytics_service import log_user_activity
    log_user_activity(db, current_user.user_id, "comment_added", new_comment.comment_id)

    from app.services.notification_service import create_notification
    from app.models.notification import NotificationType, ReferenceType
    create_notification(
        db=db,
        receiver_id=post.user_id,
        notification_type=NotificationType.comment,
        title="New Comment",
        message=f"{current_user.name} commented on your post: \"{comment_text[:30]}...\"",
        sender_id=current_user.user_id,
        reference_type=ReferenceType.post,
        reference_id=post.post_id,
    )

    return {"message": "Comment added successfully"}



def get_comments(post_id: int, db: Session) -> List[dict]:
    post = db.query(Post).filter(Post.post_id == post_id, Post.is_deleted == False).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Post not found"}
        )
    rows = (
        db.query(Comment, User.name)
        .join(User, User.user_id == Comment.user_id)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return [
        {
            "comment_id":   c.comment_id,
            "user_id":      c.user_id,
            "name":         name,
            "comment_text": c.comment_text,
            "created_at":   c.created_at
        }
        for c, name in rows
    ]


def delete_comment(current_user: User, comment_id: int, db: Session) -> dict:
    comment = db.query(Comment).filter(Comment.comment_id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Comment not found"}
        )

    if comment.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Only the creator can delete this comment"}
        )

    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted successfully"}


# ── Post Picture Upload ────────────────────────────────────────────────────────

UPLOAD_DIR    = "uploads/posts"
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB   = 5


async def upload_post_picture(current_user: User, file: UploadFile) -> dict:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Only JPEG, PNG, WebP or GIF images are allowed"},
        )

    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": f"File too large. Maximum {MAX_SIZE_MB} MB"},
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext      = (file.filename or "img").rsplit(".", 1)[-1].lower()
    filename = f"{current_user.user_id}_{uuid.uuid4().hex[:10]}.{ext}"
    dest     = os.path.join(UPLOAD_DIR, filename)

    with open(dest, "wb") as f:
        f.write(content)

    url = f"/static/posts/{filename}"
    return {"url": url, "message": "Post picture uploaded"}
