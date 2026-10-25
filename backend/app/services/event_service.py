from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User
from app.models.profile import Profile
from app.models.community import Community, CommunityMember, CommunityRole
from app.models.event import Event, EventRegistration, EventStatus, RegistrationStatus
from app.models.community import ApprovalStatus
from app.schemas.event import EventCreate, EventUpdate


def _build_event_response(event: Event, current_user: User, db: Session) -> dict:
    reg_count = db.query(EventRegistration).filter(
        EventRegistration.event_id == event.event_id,
        EventRegistration.registration_status == RegistrationStatus.registered
    ).count()

    remaining = None
    if event.max_participants is not None:
        remaining = max(0, event.max_participants - reg_count)

    user_reg = db.query(EventRegistration).filter(
        EventRegistration.event_id == event.event_id,
        EventRegistration.user_id == current_user.user_id
    ).first()

    is_registered = user_reg is not None and user_reg.registration_status == RegistrationStatus.registered
    reg_status = user_reg.registration_status.value if user_reg else None

    org_name = event.organizer.name if event.organizer else "Unknown"
    org_role = event.organizer.role if event.organizer else "student"
    org_verified = event.organizer.is_verified if event.organizer else False
    comm_name = event.community.community_name if event.community else None

    return {
        "event_id":          event.event_id,
        "title":             event.title,
        "description":       event.description,
        "category":          event.category,
        "venue":             event.venue,
        "start_datetime":    event.start_datetime,
        "end_datetime":      event.end_datetime,
        "registration_deadline": event.registration_deadline,
        "poster_url":        event.poster_url,
        "organizer_id":      event.organizer_id,
        "community_id":      event.community_id,
        "max_participants":  event.max_participants,
        "status":            event.status.value,
        "created_at":        event.created_at,
        "registered_count":  reg_count,
        "remaining_seats":   remaining,
        "is_registered":     is_registered,
        "registration_status": reg_status,
        "organizer_name":    org_name,
        "organizer_role":    org_role,
        "organizer_verified": org_verified,
        "community_name":    comm_name,
        "approval_status":   event.approval_status.value if event.approval_status else "pending",
        "approval_notes":    event.approval_notes,
    }


def create_event(db: Session, payload: EventCreate, current_user: User) -> dict:
    event = Event(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        venue=payload.venue,
        start_datetime=payload.start_datetime,
        end_datetime=payload.end_datetime,
        registration_deadline=payload.registration_deadline,
        poster_url=payload.poster_url,
        organizer_id=current_user.user_id,
        community_id=payload.community_id,
        max_participants=payload.max_participants,
        status=EventStatus.upcoming,
        approval_status=ApprovalStatus.pending,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    if event.community_id:
        from app.services.notification_service import create_notification
        from app.models.notification import NotificationType, ReferenceType
        from app.models.community import Community, CommunityMember
        
        community = db.query(Community).filter(Community.community_id == event.community_id).first()
        comm_name = community.community_name if community else "Community"
        
        members = db.query(CommunityMember.user_id).filter(
            CommunityMember.community_id == event.community_id,
            CommunityMember.user_id != current_user.user_id
        ).all()
        for m in members:
            create_notification(
                db=db,
                receiver_id=m.user_id,
                notification_type=NotificationType.event_created,
                title=f"New Event in {comm_name}",
                message=f"A new event \"{event.title}\" has been hosted by {comm_name}.",
                sender_id=current_user.user_id,
                reference_type=ReferenceType.event,
                reference_id=event.event_id,
            )

    return _build_event_response(event, current_user, db)


def list_events(
    db: Session,
    current_user: User,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    community_id: Optional[int] = None,
) -> List[dict]:
    # Only show approved events publicly
    query = db.query(Event).filter(Event.approval_status == ApprovalStatus.approved)
    if category:
        query = query.filter(Event.category == category)
    if status_filter:
        query = query.filter(Event.status == EventStatus(status_filter))
    if community_id is not None:
        query = query.filter(Event.community_id == community_id)

    # Sort upcoming first (by start_datetime ascending)
    events = query.order_by(Event.start_datetime.asc()).all()
    return [_build_event_response(e, current_user, db) for e in events]


def get_event_details(db: Session, event_id: int, current_user: User) -> dict:
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Event not found"},
        )
    # Non-approved events are only visible to their organizer and admins
    is_organizer = event.organizer_id == current_user.user_id
    is_admin     = current_user.role == "admin"
    if event.approval_status != ApprovalStatus.approved and not is_organizer and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Event not found"},
        )
    return _build_event_response(event, current_user, db)


def update_event(db: Session, event_id: int, payload: EventUpdate, current_user: User) -> dict:
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Event not found"},
        )

    # Check permission: organizer or community owner/admin
    is_authorized = False
    if event.organizer_id == current_user.user_id:
        is_authorized = True
    elif event.community_id is not None:
        membership = db.query(CommunityMember).filter(
            CommunityMember.community_id == event.community_id,
            CommunityMember.user_id == current_user.user_id
        ).first()
        if membership and membership.role in [CommunityRole.owner, CommunityRole.admin]:
            is_authorized = True

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "You are not authorized to update this event"},
        )

    # Update fields using model_dump to support clearing nullable fields (set to None/null)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)
    return _build_event_response(event, current_user, db)


def delete_event(db: Session, event_id: int, current_user: User) -> dict:
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Event not found"},
        )

    # Check permission: organizer or community owner
    is_authorized = False
    if event.organizer_id == current_user.user_id:
        is_authorized = True
    elif event.community_id is not None:
        membership = db.query(CommunityMember).filter(
            CommunityMember.community_id == event.community_id,
            CommunityMember.user_id == current_user.user_id
        ).first()
        if membership and membership.role == CommunityRole.owner:
            is_authorized = True

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "You are not authorized to delete this event"},
        )

    db.delete(event)
    db.commit()
    return {"message": "Event deleted successfully"}


def register_for_event(db: Session, event_id: int, current_user: User) -> dict:
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Event not found"},
        )

    # Block registration for non-approved events
    if event.approval_status != ApprovalStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Event is not yet approved and cannot accept registrations"},
        )

    if event.status == EventStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Cannot register for a cancelled event"},
        )

    # Check registration deadline
    if event.registration_deadline and datetime.now() > event.registration_deadline:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Registration deadline has passed"},
        )

    existing = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.user_id == current_user.user_id
    ).first()

    if existing:
        if existing.registration_status == RegistrationStatus.registered:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "User cannot register twice"},
            )
        else:
            # Re-activate previously cancelled registration
            # Check seat capacity first
            reg_count = db.query(EventRegistration).filter(
                EventRegistration.event_id == event_id,
                EventRegistration.registration_status == RegistrationStatus.registered
            ).count()
            if event.max_participants is not None and reg_count >= event.max_participants:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"message": "No seats available"},
                )

            existing.registration_status = RegistrationStatus.registered
            existing.registered_at = func.now()
            db.commit()

            from app.services.analytics_service import log_user_activity
            log_user_activity(db, current_user.user_id, "event_registered", event_id)

            from app.services.notification_service import create_notification
            from app.models.notification import NotificationType, ReferenceType
            create_notification(
                db=db,
                receiver_id=event.organizer_id,
                notification_type=NotificationType.event_registration,
                title="New Event Registration",
                message=f"{current_user.name} registered for your event {event.title}.",
                sender_id=current_user.user_id,
                reference_type=ReferenceType.event,
                reference_id=event.event_id,
            )

            return {"message": "Registration successful"}


    # Seat capacity check
    reg_count = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.registration_status == RegistrationStatus.registered
    ).count()
    if event.max_participants is not None and reg_count >= event.max_participants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "No seats available"},
        )

    new_reg = EventRegistration(
        event_id=event_id,
        user_id=current_user.user_id,
        registration_status=RegistrationStatus.registered,
    )
    db.add(new_reg)
    db.commit()

    from app.services.analytics_service import log_user_activity
    log_user_activity(db, current_user.user_id, "event_registered", event_id)

    from app.services.notification_service import create_notification
    from app.models.notification import NotificationType, ReferenceType
    create_notification(
        db=db,
        receiver_id=event.organizer_id,
        notification_type=NotificationType.event_registration,
        title="New Event Registration",
        message=f"{current_user.name} registered for your event {event.title}.",
        sender_id=current_user.user_id,
        reference_type=ReferenceType.event,
        reference_id=event.event_id,
    )

    return {"message": "Registration successful"}



def cancel_registration(db: Session, event_id: int, current_user: User) -> dict:
    reg = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.user_id == current_user.user_id
    ).first()

    if not reg or reg.registration_status != RegistrationStatus.registered:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "No active registration found"},
        )

    reg.registration_status = RegistrationStatus.cancelled
    db.commit()
    return {"message": "Registration cancelled"}


def get_event_participants(db: Session, event_id: int, current_user: User) -> List[dict]:
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Event not found"},
        )

    registrations = db.query(EventRegistration).filter(EventRegistration.event_id == event_id).all()
    results = []
    for r in registrations:
        user = r.user
        profile = db.query(Profile).filter(Profile.user_id == r.user_id).first()
        results.append({
            "user_id": r.user_id,
            "name": user.name if user else "Unknown",
            "email": user.email if user else "",
            "department": profile.department if profile else None,
            "profile_picture": profile.profile_picture if profile else None,
            "registration_status": r.registration_status.value,
            "registered_at": r.registered_at,
        })
    return results


def get_my_registrations(db: Session, current_user: User) -> List[dict]:
    registrations = db.query(EventRegistration).filter(
        EventRegistration.user_id == current_user.user_id,
        EventRegistration.registration_status == RegistrationStatus.registered
    ).all()
    events = [r.event for r in registrations if r.event]
    return [_build_event_response(e, current_user, db) for e in events]


def get_my_events(db: Session, current_user: User) -> List[dict]:
    events = db.query(Event).filter(Event.organizer_id == current_user.user_id).all()
    return [_build_event_response(e, current_user, db) for e in events]


def search_events(
    db: Session,
    current_user: User,
    title: Optional[str] = None,
    category: Optional[str] = None,
    community: Optional[str] = None,
) -> List[dict]:
    # Only search approved events
    query = db.query(Event).filter(Event.approval_status == ApprovalStatus.approved)
    if title:
        query = query.filter(Event.title.like(f"%{title}%"))
    if category:
        query = query.filter(Event.category.like(f"%{category}%"))
    if community:
        query = query.join(Community, Event.community_id == Community.community_id).filter(
            Community.community_name.like(f"%{community}%")
        )

    events = query.order_by(Event.start_datetime.asc()).all()
    return [_build_event_response(e, current_user, db) for e in events]
