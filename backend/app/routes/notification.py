from typing import List, Optional
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.database.database import get_db, SessionLocal
from app.auth.jwt_handler import get_current_user, SECRET_KEY, ALGORITHM
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.notification import (
    NotificationResponse,
    UnreadCountResponse,
    PreferencesResponse,
    PreferencesUpdate,
)
from app.services import notification_service

router = APIRouter(tags=["Notifications"])


# ── REST Endpoints ────────────────────────────────────────────────────────────

@router.get("/api/notifications", response_model=List[NotificationResponse])
def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return notification_service.get_notifications(db, current_user.user_id, skip=skip, limit=limit)


@router.get("/api/notifications/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = notification_service.get_unread_count(db, current_user.user_id)
    return {"count": count}


@router.put("/api/notifications/{notification_id}/read", response_model=MessageResponse)
def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return notification_service.mark_as_read(db, current_user.user_id, notification_id)


@router.put("/api/notifications/read-all", response_model=MessageResponse)
def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return notification_service.mark_all_as_read(db, current_user.user_id)


@router.delete("/api/notifications/{notification_id}", response_model=MessageResponse)
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return notification_service.delete_notification(db, current_user.user_id, notification_id)


@router.get("/api/notifications/preferences", response_model=PreferencesResponse)
def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return notification_service.get_preferences(db, current_user.user_id)


@router.put("/api/notifications/preferences", response_model=PreferencesResponse)
def update_notification_preferences(
    payload: PreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return notification_service.update_preferences(db, current_user.user_id, payload.model_dump(exclude_unset=True))


# ── WebSocket Endpoint ────────────────────────────────────────────────────────

def get_user_from_token(token: str, db: Session) -> Optional[User]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id:
            return db.query(User).filter(User.user_id == int(user_id)).first()
    except JWTError:
        pass
    return None


@router.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    if not token:
        await websocket.close(code=4001)
        return

    db = SessionLocal()
    try:
        user = get_user_from_token(token, db)
        if not user:
            await websocket.close(code=4002)
            return

        await notification_service.manager.connect(user.user_id, websocket)

        try:
            while True:
                # Wait for any incoming message, used to detect client disconnects
                await websocket.receive_text()
        except WebSocketDisconnect:
            notification_service.manager.disconnect(user.user_id)
    except Exception:
        # Gracefully handle socket exceptions
        pass
    finally:
        db.close()
