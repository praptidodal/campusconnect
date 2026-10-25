"""
approval_service.py
────────────────────────────────────────────────────────────────────────────────
Handles admin approval workflow for Communities and Events.

Functions:
  Community: approve / reject / request_changes / get_pending / get_recently_*
  Events   : approve / reject / request_changes / get_pending / get_recently_*
  Helpers  : send_approval_email (stub — wire up SMTP/SendGrid later)
────────────────────────────────────────────────────────────────────────────────
"""
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.user import User
from app.models.profile import Profile
from app.models.community import Community, CommunityMember
from app.models.event import Event
from app.models.community import ApprovalStatus


# ── Email Stub ────────────────────────────────────────────────────────────────

def send_approval_email(to: str, subject: str, body: str) -> None:
    """
    Stub email sender.  Replace the print() call with real SMTP / SendGrid logic.
    e.g.  import sendgrid; sg = sendgrid.SendGridAPIClient(api_key=...)
    """
    print(f"[EMAIL] To: {to} | Subject: {subject}\n{body}\n{'─'*60}")


# ── Internal Helpers ──────────────────────────────────────────────────────────

def _community_dict(db: Session, c: Community, include_creator: bool = True) -> dict:
    member_count = db.query(CommunityMember).filter(
        CommunityMember.community_id == c.community_id
    ).count()
    creator = db.query(User).filter(User.user_id == c.created_by).first()
    approver = db.query(User).filter(User.user_id == c.approved_by).first() if c.approved_by else None
    return {
        "community_id":    c.community_id,
        "community_name":  c.community_name,
        "description":     c.description,
        "category":        c.category,
        "logo_url":        c.logo_url,
        "created_by":      c.created_by,
        "created_at":      c.created_at,
        "member_count":    member_count,
        "approval_status": c.approval_status.value if c.approval_status else "pending",
        "approved_by":     c.approved_by,
        "approved_at":     c.approved_at,
        "approval_notes":  c.approval_notes,
        "creator_name":    creator.name if creator else "Unknown",
        "creator_email":   creator.email if creator else "",
        "approver_name":   approver.name if approver else None,
    }


def _event_dict(db: Session, e: Event) -> dict:
    organizer = db.query(User).filter(User.user_id == e.organizer_id).first()
    community = e.community
    approver = db.query(User).filter(User.user_id == e.approved_by).first() if e.approved_by else None
    return {
        "event_id":        e.event_id,
        "title":           e.title,
        "description":     e.description,
        "category":        e.category,
        "venue":           e.venue,
        "start_datetime":  e.start_datetime,
        "end_datetime":    e.end_datetime,
        "poster_url":      e.poster_url,
        "organizer_id":    e.organizer_id,
        "community_id":    e.community_id,
        "created_at":      e.created_at,
        "approval_status": e.approval_status.value if e.approval_status else "pending",
        "approved_by":     e.approved_by,
        "approved_at":     e.approved_at,
        "approval_notes":  e.approval_notes,
        "organizer_name":  organizer.name if organizer else "Unknown",
        "organizer_email": organizer.email if organizer else "",
        "community_name":  community.community_name if community else None,
        "approver_name":   approver.name if approver else None,
    }


# ── Community Approval ────────────────────────────────────────────────────────

def get_pending_communities(db: Session) -> List[dict]:
    """Return all communities awaiting admin approval."""
    communities = (
        db.query(Community)
        .filter(Community.approval_status == ApprovalStatus.pending)
        .order_by(desc(Community.created_at))
        .all()
    )
    return [_community_dict(db, c) for c in communities]


def get_recently_approved_communities(db: Session, limit: int = 10) -> List[dict]:
    communities = (
        db.query(Community)
        .filter(Community.approval_status == ApprovalStatus.approved)
        .order_by(desc(Community.approved_at))
        .limit(limit)
        .all()
    )
    return [_community_dict(db, c) for c in communities]


def get_recently_rejected_communities(db: Session, limit: int = 10) -> List[dict]:
    communities = (
        db.query(Community)
        .filter(Community.approval_status == ApprovalStatus.rejected)
        .order_by(desc(Community.approved_at))
        .limit(limit)
        .all()
    )
    return [_community_dict(db, c) for c in communities]


def approve_community(db: Session, admin_id: int, community_id: int, notes: Optional[str] = None) -> dict:
    community = db.query(Community).filter(Community.community_id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail={"message": "Community not found"})
    if community.approval_status == ApprovalStatus.approved:
        raise HTTPException(status_code=400, detail={"message": "Community is already approved"})

    community.approval_status = ApprovalStatus.approved
    community.approved_by     = admin_id
    community.approved_at     = datetime.utcnow()
    community.approval_notes  = notes
    db.commit()
    db.refresh(community)

    # Log admin action
    from app.services.admin_service import log_admin_action
    log_admin_action(
        db, admin_id=admin_id, action="Approve Community",
        entity_type="community", entity_id=community_id,
        details=f"Community '{community.community_name}' approved."
    )

    # In-app notification to creator
    creator = db.query(User).filter(User.user_id == community.created_by).first()
    if creator:
        from app.services.notification_service import create_notification
        from app.models.notification import NotificationType, ReferenceType
        create_notification(
            db=db,
            receiver_id=creator.user_id,
            notification_type=NotificationType.community_approved,
            title="Community Approved! 🎉",
            message=f"Your community '{community.community_name}' has been approved and is now publicly visible.",
            sender_id=admin_id,
            reference_type=ReferenceType.community,
            reference_id=community_id,
        )
        # Email stub
        send_approval_email(
            to=creator.email,
            subject=f"[CampusConnect] Your community '{community.community_name}' has been approved!",
            body=(
                f"Hi {creator.name},\n\n"
                f"Great news! Your community '{community.community_name}' has been reviewed and approved by an administrator.\n"
                f"It is now publicly visible to all students on CampusConnect.\n\n"
                f"{('Admin notes: ' + notes) if notes else ''}\n\n"
                f"Best regards,\nCampusConnect Admin Team"
            ),
        )

    return {"message": "Community approved successfully", "community_id": community_id}


def reject_community(db: Session, admin_id: int, community_id: int, notes: Optional[str] = None) -> dict:
    community = db.query(Community).filter(Community.community_id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail={"message": "Community not found"})

    community.approval_status = ApprovalStatus.rejected
    community.approved_by     = admin_id
    community.approved_at     = datetime.utcnow()
    community.approval_notes  = notes
    db.commit()
    db.refresh(community)

    from app.services.admin_service import log_admin_action
    log_admin_action(
        db, admin_id=admin_id, action="Reject Community",
        entity_type="community", entity_id=community_id,
        details=f"Community '{community.community_name}' rejected. Notes: {notes or 'None'}"
    )

    creator = db.query(User).filter(User.user_id == community.created_by).first()
    if creator:
        from app.services.notification_service import create_notification
        from app.models.notification import NotificationType, ReferenceType
        create_notification(
            db=db,
            receiver_id=creator.user_id,
            notification_type=NotificationType.community_rejected,
            title="Community Not Approved",
            message=f"Your community '{community.community_name}' was not approved. {('Reason: ' + notes) if notes else 'Please contact an admin for details.'}",
            sender_id=admin_id,
            reference_type=ReferenceType.community,
            reference_id=community_id,
        )
        send_approval_email(
            to=creator.email,
            subject=f"[CampusConnect] Community '{community.community_name}' — Not Approved",
            body=(
                f"Hi {creator.name},\n\n"
                f"After review, your community '{community.community_name}' was not approved at this time.\n\n"
                f"{('Reason: ' + notes) if notes else 'Please reach out to an administrator for more information.'}\n\n"
                f"You may edit and resubmit your community for review.\n\n"
                f"Best regards,\nCampusConnect Admin Team"
            ),
        )

    return {"message": "Community rejected", "community_id": community_id}


def request_community_changes(db: Session, admin_id: int, community_id: int, notes: Optional[str] = None) -> dict:
    community = db.query(Community).filter(Community.community_id == community_id).first()
    if not community:
        raise HTTPException(status_code=404, detail={"message": "Community not found"})

    community.approval_notes = notes
    db.commit()

    from app.services.admin_service import log_admin_action
    log_admin_action(
        db, admin_id=admin_id, action="Request Community Changes",
        entity_type="community", entity_id=community_id,
        details=f"Changes requested for '{community.community_name}'. Notes: {notes or 'None'}"
    )

    creator = db.query(User).filter(User.user_id == community.created_by).first()
    if creator:
        from app.services.notification_service import create_notification
        from app.models.notification import NotificationType, ReferenceType
        create_notification(
            db=db,
            receiver_id=creator.user_id,
            notification_type=NotificationType.community_changes_requested,
            title="Changes Requested for Your Community",
            message=f"An admin has requested changes to your community '{community.community_name}'. {('Notes: ' + notes) if notes else ''}",
            sender_id=admin_id,
            reference_type=ReferenceType.community,
            reference_id=community_id,
        )
        send_approval_email(
            to=creator.email,
            subject=f"[CampusConnect] Changes Requested — '{community.community_name}'",
            body=(
                f"Hi {creator.name},\n\n"
                f"An administrator has reviewed your community '{community.community_name}' and is requesting changes before approval.\n\n"
                f"{('Requested changes: ' + notes) if notes else 'Please contact an administrator for details.'}\n\n"
                f"Please update your community and it will be re-reviewed.\n\n"
                f"Best regards,\nCampusConnect Admin Team"
            ),
        )

    return {"message": "Changes requested for community", "community_id": community_id}


# ── Event Approval ────────────────────────────────────────────────────────────

def get_pending_events(db: Session) -> List[dict]:
    """Return all events awaiting admin approval."""
    events = (
        db.query(Event)
        .filter(Event.approval_status == ApprovalStatus.pending)
        .order_by(desc(Event.created_at))
        .all()
    )
    return [_event_dict(db, e) for e in events]


def get_recently_approved_events(db: Session, limit: int = 10) -> List[dict]:
    events = (
        db.query(Event)
        .filter(Event.approval_status == ApprovalStatus.approved)
        .order_by(desc(Event.approved_at))
        .limit(limit)
        .all()
    )
    return [_event_dict(db, e) for e in events]


def get_recently_rejected_events(db: Session, limit: int = 10) -> List[dict]:
    events = (
        db.query(Event)
        .filter(Event.approval_status == ApprovalStatus.rejected)
        .order_by(desc(Event.approved_at))
        .limit(limit)
        .all()
    )
    return [_event_dict(db, e) for e in events]


def approve_event(db: Session, admin_id: int, event_id: int, notes: Optional[str] = None) -> dict:
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail={"message": "Event not found"})
    if event.approval_status == ApprovalStatus.approved:
        raise HTTPException(status_code=400, detail={"message": "Event is already approved"})

    event.approval_status = ApprovalStatus.approved
    event.approved_by     = admin_id
    event.approved_at     = datetime.utcnow()
    event.approval_notes  = notes
    db.commit()
    db.refresh(event)

    from app.services.admin_service import log_admin_action
    log_admin_action(
        db, admin_id=admin_id, action="Approve Event",
        entity_type="event", entity_id=event_id,
        details=f"Event '{event.title}' approved."
    )

    organizer = db.query(User).filter(User.user_id == event.organizer_id).first()
    if organizer:
        from app.services.notification_service import create_notification
        from app.models.notification import NotificationType, ReferenceType
        create_notification(
            db=db,
            receiver_id=organizer.user_id,
            notification_type=NotificationType.event_approved,
            title="Event Approved! 🎉",
            message=f"Your event '{event.title}' has been approved and is now publicly visible.",
            sender_id=admin_id,
            reference_type=ReferenceType.event,
            reference_id=event_id,
        )
        send_approval_email(
            to=organizer.email,
            subject=f"[CampusConnect] Your event '{event.title}' has been approved!",
            body=(
                f"Hi {organizer.name},\n\n"
                f"Your event '{event.title}' has been reviewed and approved by an administrator.\n"
                f"Students can now discover and register for it on CampusConnect.\n\n"
                f"{('Admin notes: ' + notes) if notes else ''}\n\n"
                f"Best regards,\nCampusConnect Admin Team"
            ),
        )

    return {"message": "Event approved successfully", "event_id": event_id}


def reject_event(db: Session, admin_id: int, event_id: int, notes: Optional[str] = None) -> dict:
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail={"message": "Event not found"})

    event.approval_status = ApprovalStatus.rejected
    event.approved_by     = admin_id
    event.approved_at     = datetime.utcnow()
    event.approval_notes  = notes
    db.commit()
    db.refresh(event)

    from app.services.admin_service import log_admin_action
    log_admin_action(
        db, admin_id=admin_id, action="Reject Event",
        entity_type="event", entity_id=event_id,
        details=f"Event '{event.title}' rejected. Notes: {notes or 'None'}"
    )

    organizer = db.query(User).filter(User.user_id == event.organizer_id).first()
    if organizer:
        from app.services.notification_service import create_notification
        from app.models.notification import NotificationType, ReferenceType
        create_notification(
            db=db,
            receiver_id=organizer.user_id,
            notification_type=NotificationType.event_rejected,
            title="Event Not Approved",
            message=f"Your event '{event.title}' was not approved. {('Reason: ' + notes) if notes else 'Please contact an admin for details.'}",
            sender_id=admin_id,
            reference_type=ReferenceType.event,
            reference_id=event_id,
        )
        send_approval_email(
            to=organizer.email,
            subject=f"[CampusConnect] Event '{event.title}' — Not Approved",
            body=(
                f"Hi {organizer.name},\n\n"
                f"After review, your event '{event.title}' was not approved at this time.\n\n"
                f"{('Reason: ' + notes) if notes else 'Please reach out to an administrator for more information.'}\n\n"
                f"You may edit and resubmit your event for review.\n\n"
                f"Best regards,\nCampusConnect Admin Team"
            ),
        )

    return {"message": "Event rejected", "event_id": event_id}


def request_event_changes(db: Session, admin_id: int, event_id: int, notes: Optional[str] = None) -> dict:
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail={"message": "Event not found"})

    event.approval_notes = notes
    db.commit()

    from app.services.admin_service import log_admin_action
    log_admin_action(
        db, admin_id=admin_id, action="Request Event Changes",
        entity_type="event", entity_id=event_id,
        details=f"Changes requested for event '{event.title}'. Notes: {notes or 'None'}"
    )

    organizer = db.query(User).filter(User.user_id == event.organizer_id).first()
    if organizer:
        from app.services.notification_service import create_notification
        from app.models.notification import NotificationType, ReferenceType
        create_notification(
            db=db,
            receiver_id=organizer.user_id,
            notification_type=NotificationType.event_changes_requested,
            title="Changes Requested for Your Event",
            message=f"An admin has requested changes to your event '{event.title}'. {('Notes: ' + notes) if notes else ''}",
            sender_id=admin_id,
            reference_type=ReferenceType.event,
            reference_id=event_id,
        )
        send_approval_email(
            to=organizer.email,
            subject=f"[CampusConnect] Changes Requested — '{event.title}'",
            body=(
                f"Hi {organizer.name},\n\n"
                f"An administrator has reviewed your event '{event.title}' and is requesting changes before approval.\n\n"
                f"{('Requested changes: ' + notes) if notes else 'Please contact an administrator for details.'}\n\n"
                f"Please update your event and it will be re-reviewed.\n\n"
                f"Best regards,\nCampusConnect Admin Team"
            ),
        )

    return {"message": "Changes requested for event", "event_id": event_id}


# ── Combined Recently Approved / Rejected ─────────────────────────────────────

def get_recently_approved(db: Session, limit: int = 10) -> dict:
    return {
        "communities": get_recently_approved_communities(db, limit),
        "events":      get_recently_approved_events(db, limit),
    }


def get_recently_rejected(db: Session, limit: int = 10) -> dict:
    return {
        "communities": get_recently_rejected_communities(db, limit),
        "events":      get_recently_rejected_events(db, limit),
    }


# ── Dashboard Counts ──────────────────────────────────────────────────────────

def get_approval_counts(db: Session) -> dict:
    pending_communities = db.query(Community).filter(
        Community.approval_status == ApprovalStatus.pending
    ).count()
    pending_events = db.query(Event).filter(
        Event.approval_status == ApprovalStatus.pending
    ).count()
    return {
        "pending_communities": pending_communities,
        "pending_events":      pending_events,
    }
