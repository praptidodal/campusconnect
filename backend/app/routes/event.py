from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
import os
import uuid

from app.database.database import get_db
from app.auth.jwt_handler import get_current_user
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.event import EventCreate, EventUpdate, EventResponse, ParticipantResponse
from app.services import event_service

router = APIRouter(prefix="/api/events", tags=["Events"])


@router.post("/upload")
async def upload_event_poster(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload event poster — returns static URL."""
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Only JPEG, PNG, WebP or GIF images are allowed"},
        )
    UPLOAD_EVENT_DIR = "uploads/events"
    os.makedirs(UPLOAD_EVENT_DIR, exist_ok=True)
    ext = (file.filename or "img").rsplit(".", 1)[-1].lower()
    filename = f"{current_user.user_id}_{uuid.uuid4().hex[:10]}.{ext}"
    dest = os.path.join(UPLOAD_EVENT_DIR, filename)

    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    return {"url": f"/static/events/{filename}"}



@router.post("", response_model=EventResponse, status_code=201)
def create_event(
    payload: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new campus event (Protected)."""
    return event_service.create_event(db, payload, current_user)


@router.get("/search", response_model=List[EventResponse])
def search_events(
    title: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    community: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search for events by title, category, and/or community hosting."""
    return event_service.search_events(db, current_user, title, category, community)


@router.get("/my-registrations", response_model=List[EventResponse])
def get_my_registrations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all events registered by the current user."""
    return event_service.get_my_registrations(db, current_user)


@router.get("/my-events", response_model=List[EventResponse])
def get_my_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all events created by the current user."""
    return event_service.get_my_events(db, current_user)


@router.get("", response_model=List[EventResponse])
def list_events(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    community_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all events with category, status, and community filters."""
    return event_service.list_events(db, current_user, category, status, community_id)


@router.get("/{event_id}", response_model=EventResponse)
def get_event_details(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get details for a specific event."""
    return event_service.get_event_details(db, event_id, current_user)


@router.put("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    payload: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update event details (Organizer or Community Admin/Owner only)."""
    return event_service.update_event(db, event_id, payload, current_user)


@router.delete("/{event_id}", response_model=MessageResponse)
def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an event (Organizer or Community Owner only)."""
    return event_service.delete_event(db, event_id, current_user)


@router.post("/{event_id}/register", response_model=MessageResponse)
def register_for_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register for an event."""
    return event_service.register_for_event(db, event_id, current_user)


@router.delete("/{event_id}/register", response_model=MessageResponse)
def cancel_registration(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel registration for an event."""
    return event_service.cancel_registration(db, event_id, current_user)


@router.get("/{event_id}/participants", response_model=List[ParticipantResponse])
def get_event_participants(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the participant list for an event."""
    return event_service.get_event_participants(db, event_id, current_user)
