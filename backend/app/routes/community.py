from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
import os
import uuid

from app.database.database import get_db
from app.auth.jwt_handler import get_current_user
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.community import (
    CommunityCreate,
    CommunityResponse,
    CommunityMemberResponse,
    CommunityPostCreate,
    CommunityPostResponse,
    RolePromoteRequest,
    CommunityDetailResponse,
    CommunityOpeningCreate,
    CommunityOpeningResponse,
    MembershipApplicationCreate,
    MembershipApplicationUpdateStatus,
    MembershipApplicationResponse,
    MemberPositionUpdateRequest,
)
from app.services import community_service

router = APIRouter(prefix="/api/communities", tags=["Communities"])


@router.post("/upload")
async def upload_community_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload community logo — returns static URL."""
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Only JPEG, PNG, WebP or GIF images are allowed"},
        )
    UPLOAD_COMMUNITY_DIR = "uploads/communities"
    os.makedirs(UPLOAD_COMMUNITY_DIR, exist_ok=True)
    ext = (file.filename or "img").rsplit(".", 1)[-1].lower()
    filename = f"{current_user.user_id}_{uuid.uuid4().hex[:10]}.{ext}"
    dest = os.path.join(UPLOAD_COMMUNITY_DIR, filename)

    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    return {"url": f"/static/communities/{filename}"}



@router.post("", response_model=CommunityDetailResponse, status_code=201)
def create_community(
    payload: CommunityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a community (Protected). Creator becomes the owner."""
    community = community_service.create_community(db, payload, current_user)
    # Convert to response dictionary so custom fields like member_count are correctly returned
    return community_service.get_community_details(db, community.community_id, current_user)


@router.get("/search", response_model=List[CommunityResponse])
def search_communities(
    name: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search for communities by name and/or category."""
    return community_service.search_communities(db, current_user, name, category)


@router.get("/my", response_model=List[CommunityResponse])
def get_my_communities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all communities owned by the current user (any approval status)."""
    return community_service.get_my_communities(db, current_user)


@router.get("", response_model=List[CommunityResponse])
def list_communities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all approved communities."""
    return community_service.list_communities(db, current_user)


@router.get("/{community_id}", response_model=CommunityDetailResponse)
def get_community_details(
    community_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get community details, member count, and recent posts."""
    return community_service.get_community_details(db, community_id, current_user)


@router.post("/{community_id}/join", response_model=MessageResponse)
def join_community(
    community_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Join a community."""
    return community_service.join_community(db, community_id, current_user)


@router.delete("/{community_id}/leave", response_model=MessageResponse)
def leave_community(
    community_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Leave a community. Owners cannot leave until ownership is transferred."""
    return community_service.leave_community(db, community_id, current_user)


@router.get("/{community_id}/members", response_model=List[CommunityMemberResponse])
def get_community_members(
    community_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the member list of a community."""
    return community_service.get_community_members(db, community_id)


@router.post("/{community_id}/posts", response_model=CommunityPostResponse, status_code=201)
def create_community_post(
    community_id: int,
    payload: CommunityPostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a post within a community (Protected). Only community members can post."""
    post = community_service.create_post(db, community_id, payload.content, payload.image_url, current_user)
    # format response with author details
    details = community_service.get_community_details(db, community_id, current_user)
    for p in details["recent_posts"]:
        if p["community_post_id"] == post.community_post_id:
            return p
    # Fallback response
    return {
        "community_post_id": post.community_post_id,
        "community_id": post.community_id,
        "user_id": post.user_id,
        "content": post.content,
        "image_url": post.image_url,
        "created_at": post.created_at,
        "author_name": current_user.name,
        "author_avatar": None,
    }


@router.get("/{community_id}/posts", response_model=List[CommunityPostResponse])
def get_community_feed(
    community_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the feed of community posts."""
    return community_service.get_feed(db, community_id)


posts_router = APIRouter(prefix="/api/community-posts", tags=["Community Posts"])


@posts_router.delete("/{post_id}", response_model=MessageResponse)
def delete_community_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a community post. Allowed: post owner, community admin, or community owner."""
    return community_service.delete_post(db, post_id, current_user)


@posts_router.post("/{post_id}/undo", response_model=MessageResponse)
def undo_delete_community_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Restore a soft-deleted community post."""
    return community_service.undo_delete_post(db, post_id, current_user)



@router.post("/{community_id}/promote", response_model=MessageResponse)
def promote_member(
    community_id: int,
    payload: RolePromoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Promote or demote a community member (Owner only)."""
    return community_service.promote_member(db, community_id, payload, current_user)


@router.get("/{community_id}/openings/active", response_model=Optional[CommunityOpeningResponse])
def get_active_opening_endpoint(
    community_id: int,
    db: Session = Depends(get_db),
):
    """Get currently active opening for a community."""
    return community_service.get_active_opening(db, community_id)


@router.post("/{community_id}/openings", response_model=CommunityOpeningResponse, status_code=201)
def create_opening_endpoint(
    community_id: int,
    payload: CommunityOpeningCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new membership opening (Owner/Admin only)."""
    return community_service.create_opening(db, community_id, payload, current_user)


@router.put("/{community_id}/openings/{opening_id}/close", response_model=MessageResponse)
def close_opening_endpoint(
    community_id: int,
    opening_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Close an active membership opening (Owner/Admin only)."""
    return community_service.close_opening(db, community_id, opening_id, current_user)


@router.post("/{community_id}/apply", response_model=MembershipApplicationResponse, status_code=201)
def apply_for_membership_endpoint(
    community_id: int,
    payload: MembershipApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a membership application for an active opening."""
    return community_service.apply_for_membership(db, community_id, payload, current_user)


@router.get("/{community_id}/applications", response_model=List[MembershipApplicationResponse])
def get_community_applications_endpoint(
    community_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all membership applications for a community (Owner/Admin only)."""
    return community_service.get_community_applications(db, community_id, current_user)


@router.put("/{community_id}/applications/{application_id}/status", response_model=MembershipApplicationResponse)
def update_application_status_endpoint(
    community_id: int,
    application_id: int,
    payload: MembershipApplicationUpdateStatus,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update application status: pending -> interview -> accepted/rejected (Owner/Admin only)."""
    return community_service.update_application_status(db, community_id, application_id, payload, current_user)


@router.put("/{community_id}/members/{user_id}/position", response_model=MessageResponse)
def update_member_position_endpoint(
    community_id: int,
    user_id: int,
    payload: MemberPositionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Assign or update a member's club leadership position (Owner/Admin only)."""
    return community_service.update_member_position(db, community_id, user_id, payload.position, current_user)

