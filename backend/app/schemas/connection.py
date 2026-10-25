from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class SendRequestBody(BaseModel):
    receiver_id: int


class ConnectionStatusOut(BaseModel):
    status: str  # "none" | "pending_sent" | "pending_received" | "connected" | "self"
    request_id: Optional[int] = None
    connection_id: Optional[int] = None


class ConnectionRequestOut(BaseModel):
    request_id:        int
    sender_id:         int
    sender_name:       str
    sender_role:       str
    sender_picture:    Optional[str]
    sender_department: Optional[str]
    sender_verified:   bool = False
    mutual_count:      int
    created_at:        datetime
    status:            str

    class Config:
        from_attributes = True


class SentRequestOut(BaseModel):
    request_id:          int
    receiver_id:         int
    receiver_name:       str
    receiver_role:       str
    receiver_picture:    Optional[str]
    receiver_department: Optional[str]
    receiver_verified:   bool = False
    created_at:          datetime
    status:              str

    class Config:
        from_attributes = True


class ConnectionOut(BaseModel):
    connection_id:   int
    user_id:         int
    name:            str
    role:            str
    profile_picture: Optional[str]
    department:      Optional[str]
    headline:        Optional[str]
    is_verified:     bool = False
    connected_at:    datetime
    mutual_count:    int

    class Config:
        from_attributes = True


class SuggestedUserOut(BaseModel):
    user_id:           int
    name:              str
    role:              str
    profile_picture:   Optional[str]
    department:        Optional[str]
    skills:            List[str]
    mutual_count:      int
    reasons:           List[str]
    connection_status: str
    request_id:        Optional[int] = None
    is_verified:       bool = False

    class Config:
        from_attributes = True


class UserSearchOut(BaseModel):
    user_id:           int
    name:              str
    role:              str
    department:        Optional[str]
    skills:            List[str]
    profile_picture:   Optional[str]
    connection_status: str
    request_id:        Optional[int] = None
    connection_id:     Optional[int] = None
    is_verified:       bool = False

    class Config:
        from_attributes = True


class MutualUserOut(BaseModel):
    user_id: int
    name: str
    role: str
    profile_picture: Optional[str] = None
    department: Optional[str] = None
    is_verified: bool = False

    class Config:
        from_attributes = True


class MutualConnectionsOut(BaseModel):
    mutual_count: int
    mutual_users: List[MutualUserOut] = []


class ConnectionCountOut(BaseModel):
    connection_count: int


class MessageResponse(BaseModel):
    message: str
