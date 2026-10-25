import asyncio
from typing import List, Optional
from fastapi import WebSocket, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.notification import Notification, NotificationPreference
from app.models.user import User


# ── WebSocket Connection Manager ──────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].close(code=1000)
            except Exception:
                pass
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            try:
                await websocket.send_json(message)
            except Exception:
                self.disconnect(user_id)


manager = ConnectionManager()


def push_ws_notification(user_id: int, payload: dict):
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.send_personal_message(payload, user_id))
    except RuntimeError:
        pass


# ── Preference Mapping ────────────────────────────────────────────────────────

PREFERENCE_MAPPING = {
    "connection_request":  "connection_notifications",
    "connection_accepted": "connection_notifications",
    "like":                "like_notifications",
    "comment":             "comment_notifications",
    "community_join":      "community_notifications",
    "community_post":      "community_notifications",
    "event_registration":  "event_notifications",
    "event_created":       "event_notifications",
    "application_received": "collaboration_notifications",
    "application_accepted": "collaboration_notifications",
    "application_rejected": "collaboration_notifications",
    # Approval workflow — community
    "community_approved":           "community_notifications",
    "community_rejected":           "community_notifications",
    "community_changes_requested":  "community_notifications",
    # Approval workflow — event
    "event_approved":               "event_notifications",
    "event_rejected":               "event_notifications",
    "event_changes_requested":      "event_notifications",
}


def get_or_create_preferences(db: Session, user_id: int) -> NotificationPreference:
    pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()
    if not pref:
        pref = NotificationPreference(user_id=user_id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


def create_notification(
    db: Session,
    receiver_id: int,
    notification_type: str,
    title: str,
    message: str,
    sender_id: Optional[int] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[int] = None,
) -> Optional[Notification]:
    # Check preferences
    pref = get_or_create_preferences(db, receiver_id)
    pref_field = PREFERENCE_MAPPING.get(notification_type)
    if pref_field and not getattr(pref, pref_field, True):
        return None

    if sender_id == receiver_id:
        return None

    if notification_type == "connection_request" and reference_id:
        existing_notif = db.query(Notification).filter(
            Notification.receiver_id == receiver_id,
            Notification.notification_type == "connection_request",
            Notification.reference_id == reference_id
        ).first()
        if existing_notif:
            return existing_notif

    notification = Notification(
        sender_id=sender_id,
        receiver_id=receiver_id,
        notification_type=notification_type,
        title=title,
        message=message,
        reference_type=reference_type,
        reference_id=reference_id,
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    # Fetch sender details for payload
    sender_name = None
    sender_picture = None
    sender_role = None
    sender_department = None
    if sender_id:
        sender_user = db.query(User).filter(User.user_id == sender_id).first()
        if sender_user:
            sender_name = sender_user.name
            sender_role = sender_user.role
            sender_profile = sender_user.profile[0] if sender_user.profile else None
            if sender_profile:
                sender_picture = sender_profile.profile_picture
                sender_department = sender_profile.department

    payload = {
        "notification_id":   notification.notification_id,
        "title":             notification.title,
        "message":           notification.message,
        "notification_type": notification.notification_type,
        "reference_type":    notification.reference_type,
        "reference_id":      notification.reference_id,
        "is_read":           notification.is_read,
        "created_at":        notification.created_at.isoformat(),
        "sender_id":         notification.sender_id,
        "sender_name":       sender_name,
        "sender_picture":    sender_picture,
        "sender_role":       sender_role,
        "sender_department": sender_department,
        "sender_verified":   sender_user.is_verified if sender_user else False,
    }
    push_ws_notification(receiver_id, payload)
    return notification


def get_notifications(db: Session, user_id: int, skip: int = 0, limit: int = 20) -> List[Notification]:
    from sqlalchemy.orm import joinedload
    from app.models.user import User
    return (
        db.query(Notification)
        .options(joinedload(Notification.sender).joinedload(User.profile))
        .filter(Notification.receiver_id == user_id)
        .order_by(desc(Notification.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_unread_count(db: Session, user_id: int) -> int:
    return (
        db.query(Notification)
        .filter(Notification.receiver_id == user_id, Notification.is_read == False)
        .count()
    )


def mark_as_read(db: Session, user_id: int, notification_id: int) -> dict:
    notif = db.query(Notification).filter(
        Notification.notification_id == notification_id,
        Notification.receiver_id == user_id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail={"message": "Notification not found"})
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}


def mark_all_as_read(db: Session, user_id: int) -> dict:
    db.query(Notification).filter(
        Notification.receiver_id == user_id,
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read"}


def delete_notification(db: Session, user_id: int, notification_id: int) -> dict:
    notif = db.query(Notification).filter(
        Notification.notification_id == notification_id,
        Notification.receiver_id == user_id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail={"message": "Notification not found"})
    db.delete(notif)
    db.commit()
    return {"message": "Notification deleted successfully"}


def get_preferences(db: Session, user_id: int) -> NotificationPreference:
    return get_or_create_preferences(db, user_id)


def update_preferences(db: Session, user_id: int, payload: dict) -> NotificationPreference:
    pref = get_or_create_preferences(db, user_id)
    for field, val in payload.items():
        if val is not None and hasattr(pref, field):
            setattr(pref, field, val)
    db.commit()
    db.refresh(pref)
    return pref
