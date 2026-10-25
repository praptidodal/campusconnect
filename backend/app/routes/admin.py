from fastapi import APIRouter, Depends, Query, Body, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.database import get_db
from app.models.user import User
from app.auth.jwt_handler import admin_required
from app.schemas.moderation import (
    DashboardSummaryResponse,
    AdminUserResponse,
    UserRoleUpdate,
    UserStatusUpdate,
    ReportResponse,
    ReportUpdate,
    AdminLogResponse,
    AnalyticsResponse,
    ModerationActionRequest,
)
from app.services import admin_service, moderation_service

router = APIRouter(prefix="/api/admin", tags=["Admin Panel"])


# ── Dashboard Statistics ───────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Fetches high-level metrics for dashboard statistics cards."""
    return admin_service.get_dashboard_summary(db)


# ── User Management ────────────────────────────────────────────────────────

@router.get("/users", response_model=List[AdminUserResponse])
def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Lists users with optional role, status, and search filters."""
    return admin_service.get_users_list(
        db, page=page, limit=limit, role=role, user_status=status, search=search
    )


@router.get("/users/{user_id}", response_model=AdminUserResponse)
def get_user_detail(
    user_id: int,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Retrieves a single user's detail record, including profile information."""
    users = admin_service.get_users_list(db, page=1, limit=1, search=None)
    # Find matching user_id
    user_data = db.query(User).filter(User.user_id == user_id).first()
    if not user_data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail={"message": "User not found"})
    
    # We can invoke user list service mapping specifically for this user
    single_list = admin_service.get_users_list(db, page=1, limit=1, search=user_data.email)
    for u in single_list:
        if u["user_id"] == user_id:
            return u
            
    # Fallback structure
    from app.models.profile import Profile
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    return {
        "user_id": user_data.user_id,
        "name": user_data.name,
        "email": user_data.email,
        "role": user_data.role,
        "status": user_data.status,
        "created_at": user_data.created_at,
        "profile": {
            "bio": profile.bio if profile else None,
            "department": profile.department if profile else None,
            "year_of_study": profile.year_of_study if profile else None,
            "designation": profile.designation if profile else None,
            "profile_picture": profile.profile_picture if profile else None
        }
    }


@router.put("/users/{user_id}/role", response_model=AdminUserResponse)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Changes a user's role and logs the audit log."""
    updated_user = admin_service.update_user_role(db, admin_id=admin.user_id, user_id=user_id, new_role=payload.role)
    return get_user_detail(user_id=updated_user.user_id, admin=admin, db=db)


@router.put("/users/{user_id}/status", response_model=AdminUserResponse)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Suspends, bans, or reactivates a user's account."""
    updated_user = admin_service.update_user_status(db, admin_id=admin.user_id, user_id=user_id, new_status=payload.status)
    return get_user_detail(user_id=updated_user.user_id, admin=admin, db=db)


# ── Content Moderation ─────────────────────────────────────────────────────

@router.get("/posts")
def list_posts(
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Lists all social posts with author metadata for moderation."""
    return admin_service.get_all_posts(db)


@router.delete("/posts/{post_id}")
def delete_post(
    post_id: int,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Deletes inappropriate post content."""
    return admin_service.delete_post(db, admin_id=admin.user_id, post_id=post_id)


@router.get("/communities")
def list_communities(
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Lists all student communities for moderation."""
    return admin_service.get_all_communities(db)


@router.delete("/communities/{community_id}")
def delete_community(
    community_id: int,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Deletes a community and cleans associated memberships/posts."""
    return admin_service.delete_community(db, admin_id=admin.user_id, community_id=community_id)


@router.get("/events")
def list_events(
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Lists all events for moderation."""
    return admin_service.get_all_events(db)


@router.delete("/events/{event_id}")
def delete_event(
    event_id: int,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Deletes a violating campus event."""
    return admin_service.delete_event(db, admin_id=admin.user_id, event_id=event_id)


@router.get("/collaborations")
def list_collaborations(
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Lists all collaboration marketplace postings."""
    return admin_service.get_all_collaborations(db)


@router.delete("/collaborations/{collaboration_id}")
def delete_collaboration(
    collaboration_id: int,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Deletes a collaboration posting."""
    return admin_service.delete_collaboration(db, admin_id=admin.user_id, collaboration_id=collaboration_id)


# ── Report Reviews & Moderation ─────────────────────────────────────────────

@router.get("/reports")
def list_reports(
    status: Optional[str] = Query(None),
    content_type: Optional[str] = Query(None),
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Lists flagged violations filtered by status and content_type."""
    return moderation_service.list_reports(db, status_filter=status, content_type=content_type)


@router.get("/reports/{report_id}")
def get_report_detail(
    report_id: int,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Retrieves full details for a single report including content preview and user moderation history."""
    return moderation_service.get_report_details(db, report_id=report_id)


@router.put("/reports/{report_id}", response_model=ReportResponse)
def update_report_status(
    report_id: int,
    payload: ReportUpdate,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Updates a report's moderation status (reviewed, resolved, dismissed)."""
    return admin_service.update_report_status(
        db, admin_id=admin.user_id, report_id=report_id, new_status=payload.status
    )


@router.post("/reports/{report_id}/dismiss")
def dismiss_report(
    report_id: int,
    reason: Optional[str] = Body(None, embed=True),
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Dismisses a report."""
    return moderation_service.dismiss_report(db, admin_id=admin.user_id, report_id=report_id, reason=reason)


# ── User Moderation Actions (Warn, Suspend, Unsuspend, Ban, Unban) ─────────────

@router.post("/users/{user_id}/warn")
def warn_user(
    user_id: int,
    payload: ModerationActionRequest,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Issues an official warning to a user."""
    return moderation_service.issue_warning(db, admin_id=admin.user_id, user_id=user_id, report_id=payload.report_id, reason=payload.reason)


@router.post("/users/{user_id}/suspend")
def suspend_user(
    user_id: int,
    payload: ModerationActionRequest,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Suspends a user account."""
    return moderation_service.suspend_user(db, admin_id=admin.user_id, user_id=user_id, report_id=payload.report_id, reason=payload.reason)


@router.post("/users/{user_id}/unsuspend")
def unsuspend_user(
    user_id: int,
    payload: ModerationActionRequest,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Unsuspends a user account."""
    return moderation_service.unsuspend_user(db, admin_id=admin.user_id, user_id=user_id, reason=payload.reason)


@router.post("/users/{user_id}/ban")
def ban_user(
    user_id: int,
    payload: ModerationActionRequest,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Permanently bans a user account."""
    return moderation_service.ban_user(db, admin_id=admin.user_id, user_id=user_id, report_id=payload.report_id, reason=payload.reason)


@router.post("/users/{user_id}/unban")
def unban_user(
    user_id: int,
    payload: ModerationActionRequest,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Unbans a user account."""
    return moderation_service.unban_user(db, admin_id=admin.user_id, user_id=user_id, reason=payload.reason)


# ── Content Moderation Deletion ────────────────────────────────────────────────

@router.delete("/content/{content_type}/{content_id}")
def delete_reported_content(
    content_type: str,
    content_id: int,
    report_id: Optional[int] = Query(None),
    reason: Optional[str] = Query(None),
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Deletes violating content (post, comment, message, community, event) and resolves matching reports."""
    return moderation_service.delete_content(
        db, admin_id=admin.user_id, content_type=content_type, content_id=content_id, report_id=report_id, reason=reason
    )


@router.get("/moderation-logs")
def list_moderation_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Lists audit logs from moderation_logs."""
    return moderation_service.get_moderation_logs(db, page=page, limit=limit)


# ── Audit Trails ───────────────────────────────────────────────────────────

@router.get("/logs", response_model=List[AdminLogResponse])
def list_admin_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Retrieves paginated administrative audit logs."""
    return admin_service.get_admin_logs(db, page=page, limit=limit)


# ── Timeseries Analytics ────────────────────────────────────────────────────

@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db)
):
    """Compiles 30-day analytics trends representing campus metrics."""
    return admin_service.get_analytics_data(db)


# ── Teacher Approval ───────────────────────────────────────────────────────

@router.get("/teachers/pending", response_model=List[dict])
def get_pending_teachers(
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """List all teacher registrations pending admin approval."""
    from app.services.notice_service import get_pending_teachers
    return get_pending_teachers(db)


@router.post("/teachers/{user_id}/approve", response_model=dict)
def approve_teacher(
    user_id: int,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Approve a pending teacher registration."""
    return admin_service.approve_teacher(db, admin_id=admin.user_id, user_id=user_id)


@router.post("/teachers/{user_id}/reject", response_model=dict)
def reject_teacher(
    user_id: int,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Reject a pending teacher registration."""
    return admin_service.reject_teacher(db, admin_id=admin.user_id, user_id=user_id)
