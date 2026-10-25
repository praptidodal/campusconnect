"""
routes/approval.py
────────────────────────────────────────────────────────────────────────────────
Admin-only endpoints for the Club & Event Approval workflow.
All routes are prefixed /api/admin and require admin_required authentication.
────────────────────────────────────────────────────────────────────────────────
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.auth.jwt_handler import admin_required
from app.services import approval_service

router = APIRouter(prefix="/api/admin", tags=["Approvals"])


# ── Community Approval Endpoints ──────────────────────────────────────────────

@router.get("/pending/communities", response_model=List[dict])
def get_pending_communities(
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """List all communities pending admin approval."""
    return approval_service.get_pending_communities(db)


@router.post("/communities/{community_id}/approve", response_model=dict)
def approve_community(
    community_id: int,
    notes: Optional[str] = Body(None, embed=True),
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Approve a pending community."""
    return approval_service.approve_community(db, admin_id=admin.user_id, community_id=community_id, notes=notes)


@router.post("/communities/{community_id}/reject", response_model=dict)
def reject_community(
    community_id: int,
    notes: Optional[str] = Body(None, embed=True),
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Reject a pending community with optional notes."""
    return approval_service.reject_community(db, admin_id=admin.user_id, community_id=community_id, notes=notes)


@router.post("/communities/{community_id}/request-changes", response_model=dict)
def request_community_changes(
    community_id: int,
    notes: Optional[str] = Body(None, embed=True),
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Request changes to a pending community before approval."""
    return approval_service.request_community_changes(db, admin_id=admin.user_id, community_id=community_id, notes=notes)


# ── Event Approval Endpoints ──────────────────────────────────────────────────

@router.get("/pending/events", response_model=List[dict])
def get_pending_events(
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """List all events pending admin approval."""
    return approval_service.get_pending_events(db)


@router.post("/events/{event_id}/approve", response_model=dict)
def approve_event(
    event_id: int,
    notes: Optional[str] = Body(None, embed=True),
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Approve a pending event."""
    return approval_service.approve_event(db, admin_id=admin.user_id, event_id=event_id, notes=notes)


@router.post("/events/{event_id}/reject", response_model=dict)
def reject_event(
    event_id: int,
    notes: Optional[str] = Body(None, embed=True),
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Reject a pending event with optional notes."""
    return approval_service.reject_event(db, admin_id=admin.user_id, event_id=event_id, notes=notes)


@router.post("/events/{event_id}/request-changes", response_model=dict)
def request_event_changes(
    event_id: int,
    notes: Optional[str] = Body(None, embed=True),
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Request changes to a pending event before approval."""
    return approval_service.request_event_changes(db, admin_id=admin.user_id, event_id=event_id, notes=notes)


# ── Combined Dashboard Endpoints ──────────────────────────────────────────────

@router.get("/recently-approved", response_model=dict)
def get_recently_approved(
    limit: int = 10,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Get recently approved communities and events."""
    return approval_service.get_recently_approved(db, limit=limit)


@router.get("/recently-rejected", response_model=dict)
def get_recently_rejected(
    limit: int = 10,
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Get recently rejected communities and events."""
    return approval_service.get_recently_rejected(db, limit=limit)


@router.get("/approval-counts", response_model=dict)
def get_approval_counts(
    admin: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Get pending counts for the admin dashboard widgets."""
    return approval_service.get_approval_counts(db)
