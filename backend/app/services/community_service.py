import os
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User
from app.models.profile import Profile
from app.models.community import (
    Community,
    CommunityMember,
    CommunityPost,
    CommunityRole,
    ApprovalStatus,
    CommunityOpening,
    MembershipApplication,
    MembershipApplicationStatus,
)
from app.schemas.community import CommunityCreate, RolePromoteRequest


POSITION_HIERARCHY = [
    "president",
    "vice president",
    "secretary",
    "joint secretary",
    "treasurer",
    "head",
    "faculty coordinator",
]


def create_community(db: Session, payload: CommunityCreate, current_user: User) -> Community:
    # Restrict community/club creation to Club or Admin roles only
    if current_user.role not in ["club", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Only registered Club accounts or Admins are authorized to register a community/club."},
        )

    # Check uniqueness of name
    existing = db.query(Community).filter(Community.community_name == payload.community_name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Community name already exists"},
        )

    # Create community — starts as pending approval
    community = Community(
        community_name=payload.community_name,
        description=payload.description,
        category=payload.category,
        logo_url=payload.logo_url,
        created_by=current_user.user_id,
        approval_status=ApprovalStatus.pending,
    )
    db.add(community)
    db.flush()  # get community_id

    # Add creator as owner member
    membership = CommunityMember(
        community_id=community.community_id,
        user_id=current_user.user_id,
        role=CommunityRole.owner,
    )
    db.add(membership)
    db.commit()
    db.refresh(community)
    return community


def _build_community_dict(db: Session, c: Community, current_user: User) -> dict:
    """Shared helper to build the standard community response dict."""
    member_count = db.query(CommunityMember).filter(CommunityMember.community_id == c.community_id).count()
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == c.community_id,
        CommunityMember.user_id == current_user.user_id
    ).first()
    return {
        "community_id":    c.community_id,
        "community_name":  c.community_name,
        "description":     c.description,
        "category":        c.category,
        "logo_url":        c.logo_url,
        "created_by":      c.created_by,
        "created_at":      c.created_at,
        "member_count":    member_count,
        "is_joined":       member is not None,
        "role":            member.role.value if member else None,
        "approval_status": c.approval_status.value if c.approval_status else "pending",
        "approval_notes":  c.approval_notes,
    }


def list_communities(db: Session, current_user: User) -> List[dict]:
    # Only show approved communities in the public listing
    communities = db.query(Community).filter(
        Community.approval_status == ApprovalStatus.approved
    ).all()
    return [_build_community_dict(db, c, current_user) for c in communities]


def search_communities(db: Session, current_user: User, name: Optional[str] = None, category: Optional[str] = None) -> List[dict]:
    # Only search approved communities
    query = db.query(Community).filter(Community.approval_status == ApprovalStatus.approved)
    if name:
        query = query.filter(Community.community_name.like(f"%{name}%"))
    if category:
        query = query.filter(Community.category.like(f"%{category}%"))

    communities = query.all()
    return [_build_community_dict(db, c, current_user) for c in communities]


def get_my_communities(db: Session, current_user: User) -> List[dict]:
    """Returns all communities created by the current user (any approval status)."""
    memberships = db.query(CommunityMember).filter(
        CommunityMember.user_id == current_user.user_id,
        CommunityMember.role == CommunityRole.owner,
    ).all()
    community_ids = [m.community_id for m in memberships]
    communities = db.query(Community).filter(Community.community_id.in_(community_ids)).all()
    return [_build_community_dict(db, c, current_user) for c in communities]


def get_active_opening(db: Session, community_id: int) -> Optional[dict]:
    opening = db.query(CommunityOpening).filter(
        CommunityOpening.community_id == community_id,
        CommunityOpening.is_active == True
    ).first()
    if not opening:
        return None
    return {
        "opening_id": opening.opening_id,
        "community_id": opening.community_id,
        "title": opening.title,
        "description": opening.description,
        "is_active": opening.is_active,
        "created_by": opening.created_by,
        "created_at": opening.created_at,
        "closed_at": opening.closed_at,
    }


def _serialize_application(db: Session, app: MembershipApplication) -> dict:
    applicant = db.query(User).filter(User.user_id == app.applicant_id).first()
    profile = db.query(Profile).filter(Profile.user_id == app.applicant_id).first()
    reviewer = db.query(User).filter(User.user_id == app.reviewed_by).first() if app.reviewed_by else None

    return {
        "application_id": app.application_id,
        "opening_id": app.opening_id,
        "community_id": app.community_id,
        "applicant_id": app.applicant_id,
        "applicant_name": applicant.name if applicant else "Unknown",
        "applicant_email": applicant.email if applicant else "",
        "applicant_role": applicant.role if applicant else "student",
        "applicant_avatar": profile.profile_picture if profile else None,
        "applicant_department": profile.department if profile else None,
        "applicant_verified": applicant.is_verified if applicant else False,
        "status": app.status.value,
        "cover_note": app.cover_note,
        "resume_url": app.resume_url,
        "applied_at": app.applied_at,
        "reviewed_by": app.reviewed_by,
        "reviewer_name": reviewer.name if reviewer else None,
        "reviewed_at": app.reviewed_at,
        "review_notes": app.review_notes,
    }


def get_community_details(db: Session, community_id: int, current_user: User) -> dict:
    community = db.query(Community).filter(Community.community_id == community_id).first()
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Community not found"},
        )

    # Non-approved communities are only visible to their creator and admins
    is_creator = community.created_by == current_user.user_id
    is_admin   = current_user.role == "admin"
    if community.approval_status != ApprovalStatus.approved and not is_creator and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Community not found"},
        )

    member_count = db.query(CommunityMember).filter(CommunityMember.community_id == community_id).count()
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.user_id
    ).first()

    # Query recent posts
    posts = db.query(CommunityPost).filter(CommunityPost.community_id == community_id, CommunityPost.is_deleted == False).order_by(CommunityPost.created_at.desc()).limit(20).all()
    recent_posts = []
    for p in posts:
        author = db.query(User).filter(User.user_id == p.user_id).first()
        profile = db.query(Profile).filter(Profile.user_id == p.user_id).first()
        recent_posts.append({
            "community_post_id": p.community_post_id,
            "community_id": p.community_id,
            "user_id": p.user_id,
            "content": p.content,
            "image_url": p.image_url,
            "created_at": p.created_at,
            "author_name": author.name if author else "Unknown",
            "author_avatar": profile.profile_picture if profile else None,
            "author_role": author.role if author else "student",
            "author_verified": author.is_verified if author else False,
        })

    # Active opening
    active_opening = get_active_opening(db, community_id)

    # User application if any
    my_app = db.query(MembershipApplication).filter(
        MembershipApplication.community_id == community_id,
        MembershipApplication.applicant_id == current_user.user_id
    ).order_by(MembershipApplication.applied_at.desc()).first()
    my_application = _serialize_application(db, my_app) if my_app else None

    # Leadership members (with assigned positions)
    leadership_members = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.position != None,
        CommunityMember.position != ""
    ).all()
    leadership = []
    for lm in leadership_members:
        u = db.query(User).filter(User.user_id == lm.user_id).first()
        prof = db.query(Profile).filter(Profile.user_id == lm.user_id).first()
        if u:
            leadership.append({
                "user_id": u.user_id,
                "name": u.name,
                "email": u.email,
                "role": lm.role.value,
                "position": lm.position,
                "profile_picture": prof.profile_picture if prof else None,
                "is_verified": u.is_verified,
                "joined_at": lm.joined_at,
                "department": prof.department if prof else None,
            })

    def pos_rank(item):
        pos = (item["position"] or "").lower()
        for idx, standard in enumerate(POSITION_HIERARCHY):
            if standard in pos:
                return idx
        return 999

    leadership.sort(key=pos_rank)

    return {
        "community_id":    community.community_id,
        "community_name":  community.community_name,
        "description":     community.description,
        "category":        community.category,
        "logo_url":        community.logo_url,
        "created_by":      community.created_by,
        "created_at":      community.created_at,
        "member_count":    member_count,
        "is_joined":       member is not None,
        "role":            member.role.value if member else None,
        "approval_status": community.approval_status.value if community.approval_status else "pending",
        "approval_notes":  community.approval_notes,
        "recent_posts":    recent_posts,
        "active_opening":  active_opening,
        "my_application":  my_application,
        "leadership":      leadership,
    }


def join_community(db: Session, community_id: int, current_user: User) -> dict:
    community = db.query(Community).filter(Community.community_id == community_id).first()
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Community not found"},
        )

    # Block joining non-approved communities
    if community.approval_status != ApprovalStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Community is not yet approved and cannot be joined"},
        )

    # Block direct joins for clubs: strict recruitment application flow required
    creator = db.query(User).filter(User.user_id == community.created_by).first()
    is_club = (community.category and community.category.lower() == "clubs") or (creator and creator.role == "club")
    if is_club:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Clubs require an active recruitment application. Direct joining is disabled."},
        )

    # Block direct join if any active opening exists on the community
    active_opening = db.query(CommunityOpening).filter(
        CommunityOpening.community_id == community_id,
        CommunityOpening.is_active == True
    ).first()
    if active_opening:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "This community has an active membership opening. Please apply for membership."},
        )

    existing = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.user_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "User cannot join twice"},
        )

    member = CommunityMember(
        community_id=community_id,
        user_id=current_user.user_id,
        role=CommunityRole.member,
    )
    db.add(member)
    db.commit()

    from app.services.analytics_service import log_user_activity
    log_user_activity(db, current_user.user_id, "community_joined", community_id)

    from app.services.notification_service import create_notification
    from app.models.notification import NotificationType, ReferenceType
    create_notification(
        db=db,
        receiver_id=community.created_by,
        notification_type=NotificationType.community_join,
        title="Community Joined",
        message=f"{current_user.name} joined your community {community.community_name}.",
        sender_id=current_user.user_id,
        reference_type=ReferenceType.community,
        reference_id=community.community_id,
    )

    return {"message": "Joined successfully"}


def leave_community(db: Session, community_id: int, current_user: User) -> dict:
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.user_id
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "You are not a member of this community"},
        )

    if member.role == CommunityRole.owner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Owner cannot leave until ownership transferred"},
        )

    db.delete(member)
    db.commit()
    return {"message": "Left successfully"}


def get_community_members(db: Session, community_id: int) -> List[dict]:
    community = db.query(Community).filter(Community.community_id == community_id).first()
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Community not found"},
        )

    memberships = db.query(CommunityMember).filter(CommunityMember.community_id == community_id).all()
    results = []
    for m in memberships:
        user = db.query(User).filter(User.user_id == m.user_id).first()
        profile = db.query(Profile).filter(Profile.user_id == m.user_id).first()
        if user:
            results.append({
                "user_id": user.user_id,
                "name": user.name,
                "email": user.email,
                "role": m.role.value,
                "position": m.position,
                "system_role": user.role,
                "profile_picture": profile.profile_picture if profile else None,
                "is_verified": user.is_verified,
                "joined_at": m.joined_at,
                "department": profile.department if profile else None,
            })
    return results


def create_post(db: Session, community_id: int, content: str, image_url: Optional[str], current_user: User) -> CommunityPost:
    # Check community exists
    community = db.query(Community).filter(Community.community_id == community_id).first()
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Community not found"},
        )

    # Check current user is a member
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.user_id
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Only community members can post"},
        )

    post = CommunityPost(
        community_id=community_id,
        user_id=current_user.user_id,
        content=content,
        image_url=image_url,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    from app.services.notification_service import create_notification
    from app.models.notification import NotificationType, ReferenceType
    
    # Query community name and members to notify
    community = db.query(Community).filter(Community.community_id == community_id).first()
    if community:
        members = db.query(CommunityMember.user_id).filter(
            CommunityMember.community_id == community_id,
            CommunityMember.user_id != current_user.user_id
        ).all()
        for m in members:
            create_notification(
                db=db,
                receiver_id=m.user_id,
                notification_type=NotificationType.community_post,
                title=f"New post in {community.community_name}",
                message=f"{current_user.name} posted: \"{content[:30]}...\"",
                sender_id=current_user.user_id,
                reference_type=ReferenceType.community,
                reference_id=community.community_id,
            )

    return post


def get_feed(db: Session, community_id: int) -> List[dict]:
    community = db.query(Community).filter(Community.community_id == community_id).first()
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Community not found"},
        )

    posts = db.query(CommunityPost).filter(CommunityPost.community_id == community_id, CommunityPost.is_deleted == False).order_by(CommunityPost.created_at.desc()).all()
    results = []
    for p in posts:
        author = db.query(User).filter(User.user_id == p.user_id).first()
        profile = db.query(Profile).filter(Profile.user_id == p.user_id).first()
        results.append({
            "community_post_id": p.community_post_id,
            "community_id": p.community_id,
            "user_id": p.user_id,
            "content": p.content,
            "image_url": p.image_url,
            "created_at": p.created_at,
            "author_name": author.name if author else "Unknown",
            "author_avatar": profile.profile_picture if profile else None,
            "author_role": author.role if author else "student",
            "author_verified": author.is_verified if author else False,
        })
    return results


def delete_post(db: Session, post_id: int, current_user: User) -> dict:
    post = db.query(CommunityPost).filter(CommunityPost.community_post_id == post_id, CommunityPost.is_deleted == False).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Post not found"},
        )

    # Check authorization: post owner, community admin, or community owner
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == post.community_id,
        CommunityMember.user_id == current_user.user_id
    ).first()

    is_authorized = False
    if post.user_id == current_user.user_id:
        is_authorized = True
    elif member and member.role in [CommunityRole.admin, CommunityRole.owner]:
        is_authorized = True

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Not authorized to delete this post"},
        )

    post.is_deleted = True
    post.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Post deleted successfully"}


def undo_delete_post(db: Session, post_id: int, current_user: User) -> dict:
    post = db.query(CommunityPost).filter(CommunityPost.community_post_id == post_id, CommunityPost.is_deleted == True).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Post not found or cannot be restored"},
        )

    # Check authorization: post owner, community admin, or community owner
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == post.community_id,
        CommunityMember.user_id == current_user.user_id
    ).first()

    is_authorized = False
    if post.user_id == current_user.user_id:
        is_authorized = True
    elif member and member.role in [CommunityRole.admin, CommunityRole.owner]:
        is_authorized = True

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Not authorized to restore this post"},
        )

    post.is_deleted = False
    post.deleted_at = None
    db.commit()
    return {"message": "Post restored successfully"}


def promote_member(db: Session, community_id: int, payload: RolePromoteRequest, current_user: User) -> dict:
    # Check current user is the owner
    owner_member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.user_id
    ).first()
    if not owner_member or owner_member.role != CommunityRole.owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Only Owner can promote"},
        )

    # Target member
    target_member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == payload.user_id
    ).first()
    if not target_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Target user is not a member of this community"},
        )

    if payload.role == "owner":
        # Ownership transfer
        owner_member.role = CommunityRole.admin  # demote former owner to admin
        target_member.role = CommunityRole.owner  # promote target user to owner
    else:
        target_member.role = CommunityRole(payload.role)

    db.commit()
    return {"message": f"User role updated to {payload.role}"}


def create_opening(db: Session, community_id: int, payload, current_user: User) -> dict:
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.user_id
    ).first()
    if not (current_user.role == "admin" or (member and member.role in [CommunityRole.owner, CommunityRole.admin])):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Only club leaders or admins can create membership openings."}
        )
    
    # Close any existing active openings for this community
    db.query(CommunityOpening).filter(
        CommunityOpening.community_id == community_id,
        CommunityOpening.is_active == True
    ).update({"is_active": False, "closed_at": datetime.utcnow()})
    
    opening = CommunityOpening(
        community_id=community_id,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        is_active=True,
        created_by=current_user.user_id,
    )
    db.add(opening)
    db.commit()
    db.refresh(opening)
    return get_active_opening(db, community_id)


def close_opening(db: Session, community_id: int, opening_id: int, current_user: User) -> dict:
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.user_id
    ).first()
    if not (current_user.role == "admin" or (member and member.role in [CommunityRole.owner, CommunityRole.admin])):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Only club leaders or admins can close membership openings."}
        )

    opening = db.query(CommunityOpening).filter(
        CommunityOpening.opening_id == opening_id,
        CommunityOpening.community_id == community_id
    ).first()
    if not opening:
        raise HTTPException(status_code=404, detail={"message": "Opening not found"})

    opening.is_active = False
    opening.closed_at = datetime.utcnow()
    db.commit()
    return {"message": "Opening closed successfully"}


def apply_for_membership(db: Session, community_id: int, payload, current_user: User) -> dict:
    community = db.query(Community).filter(Community.community_id == community_id).first()
    if not community or community.approval_status != ApprovalStatus.approved:
        raise HTTPException(status_code=404, detail={"message": "Community not found or not approved"})

    opening = db.query(CommunityOpening).filter(
        CommunityOpening.community_id == community_id,
        CommunityOpening.is_active == True
    ).first()
    if not opening:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Membership applications are currently closed. No active opening found."}
        )

    # Check if already a member
    existing_member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.user_id
    ).first()
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "You are already a member of this club."}
        )

    # Check if already applied to this opening
    existing_app = db.query(MembershipApplication).filter(
        MembershipApplication.opening_id == opening.opening_id,
        MembershipApplication.applicant_id == current_user.user_id
    ).first()
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "You have already submitted an application for this opening."}
        )

    # Resolve resume
    resume_url = payload.resume_url if hasattr(payload, "resume_url") else None

    app = MembershipApplication(
        opening_id=opening.opening_id,
        community_id=community_id,
        applicant_id=current_user.user_id,
        status=MembershipApplicationStatus.pending,
        cover_note=payload.cover_note.strip() if hasattr(payload, "cover_note") and payload.cover_note else None,
        resume_url=resume_url,
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    # Notify owner
    from app.services.notification_service import create_notification
    from app.models.notification import NotificationType, ReferenceType
    create_notification(
        db=db,
        receiver_id=community.created_by,
        notification_type=NotificationType.community_join,
        title=f"New Club Application - {community.community_name}",
        message=f"{current_user.name} applied for membership in {community.community_name}.",
        sender_id=current_user.user_id,
        reference_type=ReferenceType.community,
        reference_id=community.community_id,
    )

    return _serialize_application(db, app)


def get_community_applications(db: Session, community_id: int, current_user: User) -> List[dict]:
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.user_id
    ).first()
    if not (current_user.role == "admin" or (member and member.role in [CommunityRole.owner, CommunityRole.admin])):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Only club leaders or admins can view applications."}
        )

    apps = db.query(MembershipApplication).filter(
        MembershipApplication.community_id == community_id
    ).order_by(MembershipApplication.applied_at.desc()).all()
    return [_serialize_application(db, a) for a in apps]


def update_application_status(db: Session, community_id: int, application_id: int, payload, current_user: User) -> dict:
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.user_id
    ).first()
    if not (current_user.role == "admin" or (member and member.role in [CommunityRole.owner, CommunityRole.admin])):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Only club leaders or admins can review applications."}
        )

    app = db.query(MembershipApplication).filter(
        MembershipApplication.application_id == application_id,
        MembershipApplication.community_id == community_id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail={"message": "Application not found"})

    # Prevent self-review/approval
    if app.applicant_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "You cannot review or approve your own application."}
        )

    new_status = MembershipApplicationStatus(payload.status)
    app.status = new_status
    app.reviewed_by = current_user.user_id
    app.reviewed_at = datetime.utcnow()
    if hasattr(payload, "review_notes") and payload.review_notes:
        app.review_notes = payload.review_notes.strip()

    # If accepted, create membership row if not already a member
    if new_status == MembershipApplicationStatus.accepted:
        existing_member = db.query(CommunityMember).filter(
            CommunityMember.community_id == community_id,
            CommunityMember.user_id == app.applicant_id
        ).first()
        if not existing_member:
            new_mem = CommunityMember(
                community_id=community_id,
                user_id=app.applicant_id,
                role=CommunityRole.member
            )
            db.add(new_mem)

    db.commit()
    db.refresh(app)

    # Notify applicant
    community = db.query(Community).filter(Community.community_id == community_id).first()
    from app.services.notification_service import create_notification
    from app.models.notification import NotificationType, ReferenceType
    status_text = "accepted as a member" if new_status == MembershipApplicationStatus.accepted else ("moved to interview stage" if new_status == MembershipApplicationStatus.interview else "not accepted")
    create_notification(
        db=db,
        receiver_id=app.applicant_id,
        notification_type=NotificationType.community_join,
        title=f"Club Application Update - {community.community_name if community else 'Club'}",
        message=f"Your membership application for {community.community_name if community else 'the club'} has been {status_text}.",
        sender_id=current_user.user_id,
        reference_type=ReferenceType.community,
        reference_id=community_id,
    )

    return _serialize_application(db, app)


def update_member_position(db: Session, community_id: int, user_id: int, position: Optional[str], current_user: User) -> dict:
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.user_id
    ).first()
    if not (current_user.role == "admin" or (member and member.role in [CommunityRole.owner, CommunityRole.admin])):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Only club leaders or admins can assign positions."}
        )

    target = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == user_id
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail={"message": "Member not found in this community"})

    target.position = position.strip() if position and position.strip() else None
    db.commit()
    return {"message": "Position updated successfully", "position": target.position}

