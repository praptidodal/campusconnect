from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    notification_id: int
    title: Optional[str] = None
    message: str
    notification_type: str
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    is_read: bool
    created_at: datetime
    sender_name: Optional[str] = None
    sender_picture: Optional[str] = None
    sender_role: Optional[str] = None
    sender_department: Optional[str] = None
    sender_verified: Optional[bool] = False

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    count: int


class PreferencesResponse(BaseModel):
    connection_notifications: bool
    like_notifications: bool
    comment_notifications: bool
    community_notifications: bool
    event_notifications: bool
    collaboration_notifications: bool

    class Config:
        from_attributes = True


class PreferencesUpdate(BaseModel):
    connection_notifications: Optional[bool] = None
    like_notifications: Optional[bool] = None
    comment_notifications: Optional[bool] = None
    community_notifications: Optional[bool] = None
    event_notifications: Optional[bool] = None
    collaboration_notifications: Optional[bool] = None
