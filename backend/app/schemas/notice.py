from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class NoticeCreateRequest(BaseModel):
    title:           str
    description:     str
    target_audience: str  # all_students | all_teachers | specific_community | specific_event
    reference_id:    Optional[int] = None


class NoticeResponse(BaseModel):
    notice_id:       int
    teacher_id:      int
    teacher_name:    str
    teacher_verified: bool
    title:           str
    description:     str
    target_audience: str
    reference_id:    Optional[int] = None
    created_at:      datetime
    recipient_count: int = 0

    model_config = {"from_attributes": True}


class NoticeListResponse(BaseModel):
    notices: List[NoticeResponse]
    total:   int
