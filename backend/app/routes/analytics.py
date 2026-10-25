from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database.database import get_db
from app.auth.jwt_handler import get_current_user
from app.models.user import User
from app.models.community import Community, CommunityMember, CommunityRole
from app.models.event import Event
from app.models.collaboration import Collaboration

from app.schemas.analytics import (
    PlatformAnalyticsResponse,
    UserGrowthItem,
    PostAnalyticsResponse,
    CommunityAnalyticsResponse,
    EventAnalyticsResponse,
    CollaborationAnalyticsResponse,
    TopContributorsResponse,
    TrendingSkillsResponse
)

from app.services.analytics_service import (
    get_platform_analytics,
    get_user_growth,
    get_post_analytics,
    get_community_analytics,
    get_event_analytics,
    get_collaboration_analytics,
    get_top_contributors,
    get_trending_skills
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


# ── RBAC Helpers ──────────────────────────────────────────────────────────────

def admin_or_teacher_required(current_user: User = Depends(get_current_user)) -> User:
    """Dependency checking that the user is an admin or teacher."""
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Forbidden: Admin or Teacher role required for this view"}
        )
    return current_user


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/platform", response_model=PlatformAnalyticsResponse)
def platform_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_teacher_required)
):
    """
    Returns platform-wide totals and active users (Admins/Teachers).
    """
    return get_platform_analytics(db)


@router.get("/user-growth", response_model=List[UserGrowthItem])
def user_growth(
    days: int = Query(30, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_teacher_required)
):
    """
    Returns daily registrations and active users (Admins/Teachers).
    """
    return get_user_growth(db, days)


@router.get("/posts", response_model=PostAnalyticsResponse)
def post_analytics(
    days: int = Query(30, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_teacher_required)
):
    """
    Returns post creation, likes, and comments analytics (Admins/Teachers).
    """
    return get_post_analytics(db, days)


@router.get("/communities", response_model=CommunityAnalyticsResponse)
def community_analytics(
    community_id: Optional[int] = Query(None),
    days: int = Query(30, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns community metrics.
    - If community_id is specified: checks if user is Admin or the Owner/Admin of that community.
    - If community_id is not specified: checks if user is Admin or Teacher.
    """
    if community_id is None:
        if current_user.role not in ["admin", "teacher"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Forbidden: Global community analytics require Admin or Teacher role"}
            )
    else:
        # Check permissions
        if current_user.role != "admin":
            member = db.query(CommunityMember).filter(
                CommunityMember.community_id == community_id,
                CommunityMember.user_id == current_user.user_id
            ).first()
            if not member or member.role not in [CommunityRole.owner, CommunityRole.admin]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"message": "Forbidden: Only Community Owners/Admins can view specific community analytics"}
                )
                
    return get_community_analytics(db, community_id, days)


@router.get("/events", response_model=EventAnalyticsResponse)
def event_analytics(
    event_id: Optional[int] = Query(None),
    days: int = Query(30, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns event metrics.
    - If event_id is specified: checks if user is Admin or the Event Organizer.
    - If event_id is not specified: checks if user is Admin or Teacher.
    """
    if event_id is None:
        if current_user.role not in ["admin", "teacher"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Forbidden: Global event analytics require Admin or Teacher role"}
            )
    else:
        # Check permissions
        event = db.query(Event).filter(Event.event_id == event_id).first()
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Event not found"}
            )
        if current_user.role != "admin" and event.organizer_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Forbidden: Only the Event Organizer can view specific event analytics"}
            )

    return get_event_analytics(db, event_id, days)


@router.get("/collaborations", response_model=CollaborationAnalyticsResponse)
def collaboration_analytics(
    collaboration_id: Optional[int] = Query(None),
    days: int = Query(30, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns collaboration metrics.
    - If collaboration_id is specified: checks if user is Admin or Collaboration Creator.
    - If collaboration_id is not specified: checks if user is Admin or Teacher.
    """
    if collaboration_id is None:
        if current_user.role not in ["admin", "teacher"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Forbidden: Global collaboration analytics require Admin or Teacher role"}
            )
    else:
        # Check permissions
        collab = db.query(Collaboration).filter(Collaboration.collaboration_id == collaboration_id).first()
        if not collab:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Collaboration opportunity not found"}
            )
        if current_user.role != "admin" and collab.created_by != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Forbidden: Only the Opportunity Creator can view specific collaboration analytics"}
            )

    return get_collaboration_analytics(db, collaboration_id, days)


@router.get("/contributors", response_model=TopContributorsResponse)
def top_contributors(
    days: int = Query(30, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_teacher_required)
):
    """
    Returns list of top active users, community leaders, and event organizers (Admins/Teachers).
    """
    return get_top_contributors(db, days)


@router.get("/trending-skills", response_model=TrendingSkillsResponse)
def trending_skills(
    days: int = Query(30, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_teacher_required)
):
    """
    Returns trending skills based on profile assignments (Admins/Teachers).
    """
    return get_trending_skills(db, days)
