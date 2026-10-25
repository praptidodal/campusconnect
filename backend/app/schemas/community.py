from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class CommunityCreate(BaseModel):
    community_name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    category: Optional[str] = None
    logo_url: Optional[str] = None


class CommunityResponse(BaseModel):
    community_id: int
    community_name: str
    description: Optional[str] = None
    category: Optional[str] = None
    logo_url: Optional[str] = None
    created_by: int
    created_at: datetime
    member_count: int
    is_joined: Optional[bool] = False
    role: Optional[str] = None
    approval_status: Optional[str] = None
    approval_notes: Optional[str] = None

    class Config:
        from_attributes = True


class CommunityMemberResponse(BaseModel):
    user_id: int
    name: str
    email: str
    role: str
    position: Optional[str] = None
    profile_picture: Optional[str] = None
    is_verified: bool = False
    joined_at: datetime
    department: Optional[str] = None

    class Config:
        from_attributes = True


class MemberPositionUpdateRequest(BaseModel):
    user_id: int
    position: Optional[str] = None


class CommunityOpeningCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None


class CommunityOpeningResponse(BaseModel):
    opening_id: int
    community_id: int
    title: str
    description: Optional[str] = None
    is_active: bool
    created_by: int
    created_at: datetime
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MembershipApplicationCreate(BaseModel):
    cover_note: Optional[str] = None
    resume_url: Optional[str] = None


class MembershipApplicationUpdateStatus(BaseModel):
    status: str = Field(..., pattern="^(pending|interview|accepted|rejected)$")
    review_notes: Optional[str] = None


class MembershipApplicationResponse(BaseModel):
    application_id: int
    opening_id: int
    community_id: int
    applicant_id: int
    applicant_name: Optional[str] = None
    applicant_email: Optional[str] = None
    applicant_role: Optional[str] = None
    applicant_avatar: Optional[str] = None
    applicant_department: Optional[str] = None
    applicant_verified: Optional[bool] = False
    status: str
    cover_note: Optional[str] = None
    resume_url: Optional[str] = None
    applied_at: datetime
    reviewed_by: Optional[int] = None
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None

    class Config:
        from_attributes = True


class CommunityPostCreate(BaseModel):
    content: str = Field(..., min_length=1)
    image_url: Optional[str] = None


class CommunityPostResponse(BaseModel):
    community_post_id: int
    community_id: int
    user_id: int
    content: str
    image_url: Optional[str] = None
    created_at: datetime
    author_name: str
    author_avatar: Optional[str] = None
    author_role: Optional[str] = None
    author_verified: Optional[bool] = False

    class Config:
        from_attributes = True


class RolePromoteRequest(BaseModel):
    user_id: int
    role: str = Field(..., pattern="^(admin|member|owner)$")


class CommunityDetailResponse(CommunityResponse):
    recent_posts: List[CommunityPostResponse] = []
    active_opening: Optional[CommunityOpeningResponse] = None
    my_application: Optional[MembershipApplicationResponse] = None
    leadership: List[CommunityMemberResponse] = []


