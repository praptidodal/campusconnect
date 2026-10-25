from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ChatMessageResponse(BaseModel):
    message_id: int
    conversation_id: int
    sender_id: int
    sender_name: str
    sender_avatar: Optional[str] = None
    sender_role: Optional[str] = None
    sender_verified: Optional[bool] = False
    message_text: Optional[str] = None
    attachment_path: Optional[str] = None
    created_at: datetime
    is_read: bool = False
    is_deleted: bool = False
    deleted_at: Optional[str] = None

    class Config:
        from_attributes = True


class ChatParticipantResponse(BaseModel):
    user_id: int
    name: str
    profile_picture: Optional[str] = None
    role: Optional[str] = None
    is_verified: Optional[bool] = False

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    conversation_id: int
    conversation_type: str
    created_by: Optional[int] = None
    community_id: Optional[int] = None
    collaboration_id: Optional[int] = None
    group_name: Optional[str] = None
    group_avatar: Optional[str] = None
    community_name: Optional[str] = None
    collaboration_title: Optional[str] = None
    created_at: datetime
    latest_message: Optional[ChatMessageResponse] = None
    unread_count: int = 0
    participants: List[ChatParticipantResponse] = []

    class Config:
        from_attributes = True


class GroupCreateBody(BaseModel):
    group_name: str
    member_ids: List[int]
    group_avatar: Optional[str] = None



class UnreadCountsResponse(BaseModel):
    unread_messages: int
    unread_conversations: int


class MessageCreateRequest(BaseModel):
    conversation_id: int
    message_text: Optional[str] = None
