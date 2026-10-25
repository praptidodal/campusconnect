from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator


class EventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    category: Optional[str] = None
    venue: Optional[str] = None
    start_datetime: datetime
    end_datetime: datetime
    registration_deadline: Optional[datetime] = None
    poster_url: Optional[str] = None
    community_id: Optional[int] = None
    max_participants: Optional[int] = None

    @model_validator(mode="after")
    def validate_datetimes(self):
        if self.end_datetime <= self.start_datetime:
            raise ValueError("End time must be after start time")
        if self.registration_deadline and self.registration_deadline > self.start_datetime:
            raise ValueError("Registration deadline before event start")
        return self

    model_config = {"from_attributes": True}


class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    venue: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    registration_deadline: Optional[datetime] = None
    poster_url: Optional[str] = None
    community_id: Optional[int] = None
    max_participants: Optional[int] = None

    @model_validator(mode="after")
    def validate_datetimes(self):
        start = self.start_datetime
        end = self.end_datetime
        deadline = self.registration_deadline

        if start is not None and end is not None:
            if end <= start:
                raise ValueError("End time must be after start time")
        if start is not None and deadline is not None:
            if deadline > start:
                raise ValueError("Registration deadline before event start")
        return self

    model_config = {"from_attributes": True}


class EventResponse(BaseModel):
    event_id: int
    title: str
    description: str
    category: Optional[str] = None
    venue: Optional[str] = None
    start_datetime: datetime
    end_datetime: datetime
    registration_deadline: Optional[datetime] = None
    poster_url: Optional[str] = None
    organizer_id: int
    community_id: Optional[int] = None
    max_participants: Optional[int] = None
    status: str
    created_at: datetime

    # Calculated & Joins
    registered_count: int = 0
    remaining_seats: Optional[int] = None
    is_registered: bool = False
    registration_status: Optional[str] = None
    organizer_name: Optional[str] = None
    organizer_role: Optional[str] = None
    organizer_verified: Optional[bool] = False
    community_name: Optional[str] = None
    approval_status: Optional[str] = None
    approval_notes: Optional[str] = None

    model_config = {"from_attributes": True}


class ParticipantResponse(BaseModel):
    user_id: int
    name: str
    email: str
    department: Optional[str] = None
    profile_picture: Optional[str] = None
    registration_status: str
    registered_at: datetime

    model_config = {"from_attributes": True}
