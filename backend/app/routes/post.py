from typing import List

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.auth.jwt_handler import get_current_user
from app.models.user import User
from app.schemas.post import (
    PostCreate, PostResponse, LikeInfo,
    CommentCreate, CommentResponse, MessageResponse,
)
from app.services import post_service


router = APIRouter(prefix="/api", tags=["Social Feed"])


# ── Post Endpoints ────────────────────────────────────────────────────────────

@router.post("/posts", response_model=MessageResponse, status_code=201)
def create_post(
    payload: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new post."""
    return post_service.create_post(current_user, payload, db)


@router.post("/posts/picture")
async def upload_post_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a post picture — returns static URL."""
    return await post_service.upload_post_picture(current_user, file)


@router.get("/posts/feed", response_model=List[PostResponse])
def get_feed(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the feed containing posts from followed users and all public posts."""
    return post_service.get_feed(current_user, db)


@router.get("/posts/user/{user_id}", response_model=List[PostResponse])
def get_user_posts(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all posts by a specific user with visibility filtering rules."""
    return post_service.get_user_posts(current_user, user_id, db)


@router.delete("/posts/{post_id}", response_model=MessageResponse)
def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a post. Only creator can delete."""
    return post_service.delete_post(current_user, post_id, db)


@router.post("/posts/{post_id}/undo", response_model=MessageResponse)
def undo_delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Restore a soft-deleted post."""
    return post_service.undo_delete_post(current_user, post_id, db)


# ── Like Endpoints ────────────────────────────────────────────────────────────

@router.post("/posts/{post_id}/like", response_model=MessageResponse)
def like_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Like a post."""
    return post_service.like_post(current_user, post_id, db)


@router.delete("/posts/{post_id}/like", response_model=MessageResponse)
def unlike_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unlike a post."""
    return post_service.unlike_post(current_user, post_id, db)


@router.get("/posts/{post_id}/likes", response_model=List[LikeInfo])
def get_post_likes(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get list of users who liked the post."""
    return post_service.get_post_likes(post_id, db)


# ── Comment Endpoints ─────────────────────────────────────────────────────────

@router.post("/posts/{post_id}/comments", response_model=MessageResponse, status_code=201)
def add_comment(
    post_id: int,
    payload: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a comment to a post."""
    return post_service.add_comment(current_user, post_id, payload.comment_text, db)


@router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
def get_comments(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all comments on a post."""
    return post_service.get_comments(post_id, db)


@router.delete("/comments/{comment_id}", response_model=MessageResponse)
def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a comment. Only comment creator can delete."""
    return post_service.delete_comment(current_user, comment_id, db)
