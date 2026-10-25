from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator


class CollaborationResponse(BaseModel):
    collaboration_id: int
    title: str
    description: str
    category: Optional[str] = None
    required_skills: Optional[str] = None
    positions_available: int
    deadline: Optional[datetime] = None
    status: str
    created_by: int
    community_id: Optional[int] = None
    attachment_path: Optional[str] = None
    created_at: datetime

    # Joins / Custom properties
    creator_name: Optional[str] = None
    creator_email: Optional[str] = None
    creator_avatar: Optional[str] = None
    creator_role: Optional[str] = None
    creator_verified: Optional[bool] = False
    community_name: Optional[str] = None
    applications_count: int = 0
    is_applied: bool = False
    application_status: Optional[str] = None

    model_config = {"from_attributes": True}


class ApplicationResponse(BaseModel):
    application_id: int
    collaboration_id: int
    applicant_id: int
    application_message: Optional[str] = None
    resume_path: Optional[str] = None
    status: str
    applied_at: datetime

    # Applicant details
    applicant_name: Optional[str] = None
    applicant_email: Optional[str] = None
    applicant_avatar: Optional[str] = None
    applicant_department: Optional[str] = None
    applicant_skills: Optional[List[str]] = None
    applicant_role: Optional[str] = None
    applicant_verified: Optional[bool] = False

    model_config = {"from_attributes": True}


class MyApplicationResponse(BaseModel):
    application_id: int
    collaboration_id: int
    application_message: Optional[str] = None
    resume_path: Optional[str] = None
    status: str
    applied_at: datetime
    collaboration: CollaborationResponse

    model_config = {"from_attributes": True}
