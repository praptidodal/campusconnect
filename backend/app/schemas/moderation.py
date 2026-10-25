from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ── Report Validation Schemas ───────────────────────────────────────────────

class ReportCreate(BaseModel):
    content_type: str = Field(..., description="Target resource: post, comment, message, community, event, profile")
    content_id: int = Field(..., description="Primary key ID of target resource")
    reason: str = Field(..., description="Reason: spam, harassment, hate_speech, fake_information, violence, copyright, other")
    description: Optional[str] = Field(None, description="Detailed explanation of the violation")


class ReportUpdate(BaseModel):
    status: str = Field(..., description="New status value: reviewed, resolved, dismissed")


class UserMiniResponse(BaseModel):
    user_id: int
    name: str
    email: str
    role: Optional[str] = "student"
    is_verified: Optional[bool] = False

    class Config:
        from_attributes = True


class ReportResponse(BaseModel):
    """Response schema for the Report ORM model (uses correct field names from reports table)."""
    report_id: int
    reporter_id: int
    reported_user_id: Optional[int] = None
    content_type: str
    content_id: int
    reason: Optional[str]
    description: Optional[str]
    status: str
    reviewed_by: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Admin Activity Logs Schemas ────────────────────────────────────────────

class AdminLogResponse(BaseModel):
    log_id: int
    admin_id: int
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    details: Optional[str] = None
    created_at: datetime
    admin: Optional[UserMiniResponse] = None

    class Config:
        from_attributes = True


# ── User Moderation Action Schemas ──────────────────────────────────────────

class UserRoleUpdate(BaseModel):
    role: str = Field(..., description="New role: student, teacher, faculty, club, admin")


class UserStatusUpdate(BaseModel):
    status: str = Field(..., description="New status: active, suspended, banned")


class ModerationActionRequest(BaseModel):
    """Body schema for warn / suspend / ban / unban / unsuspend moderation endpoints."""
    report_id: Optional[int] = Field(None, description="Associated report ID being resolved (optional)")
    reason: Optional[str] = Field(None, description="Reason text for the moderation action")


class UserProfileMini(BaseModel):
    bio: Optional[str] = None
    department: Optional[str] = None
    year_of_study: Optional[str] = None
    designation: Optional[str] = None
    profile_picture: Optional[str] = None

    class Config:
        from_attributes = True


class AdminUserResponse(BaseModel):
    user_id: int
    name: str
    email: str
    role: str
    status: str
    is_verified: bool = False
    created_at: datetime
    profile: Optional[UserProfileMini] = None

    class Config:
        from_attributes = True


# ── Dashboard Statistics Schemas ───────────────────────────────────────────

class DashboardSummaryResponse(BaseModel):
    total_users: int
    total_posts: int
    total_communities: int
    total_events: int
    total_collaborations: int
    pending_reports: int
    new_registrations: int


# ── Timeseries Analytics Schemas ───────────────────────────────────────────

class DateCountPair(BaseModel):
    date: str
    count: int


class AnalyticsResponse(BaseModel):
    daily_active_users: List[DateCountPair]
    community_growth: List[DateCountPair]
    event_registrations: List[DateCountPair]
    collaboration_applications: List[DateCountPair]
    posts_created: List[DateCountPair]
