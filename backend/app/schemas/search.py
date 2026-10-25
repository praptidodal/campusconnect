from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class SearchHistoryResponse(BaseModel):
    search_id: int
    search_query: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserSearchResponse(BaseModel):
    user_id: int
    name: str
    profile_picture: Optional[str] = None
    headline: Optional[str] = None
    skills: List[str]
    connections_count: int

    class Config:
        from_attributes = True


class SkillSearchResponse(BaseModel):
    skill_name: str
    users_count: int
    related_users: List[dict]

    class Config:
        from_attributes = True


class PostAuthorResponse(BaseModel):
    user_id: int
    name: str
    profile_picture: Optional[str] = None


class PostSearchResponse(BaseModel):
    post_id: int
    author: PostAuthorResponse
    content_preview: str
    like_count: int
    comment_count: int

    class Config:
        from_attributes = True


class CommunitySearchResponse(BaseModel):
    community_id: int
    community_name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    member_count: int

    class Config:
        from_attributes = True


class EventSearchResponse(BaseModel):
    event_id: int
    title: str
    category: Optional[str] = None
    start_date: datetime
    poster_url: Optional[str] = None
    registrations_count: int

    class Config:
        from_attributes = True


class CollaborationSearchResponse(BaseModel):
    collaboration_id: int
    title: str
    required_skills: Optional[str] = None
    deadline: Optional[datetime] = None
    status: str

    class Config:
        from_attributes = True


class GlobalSearchResponse(BaseModel):
    users: List[UserSearchResponse]
    skills: List[SkillSearchResponse]
    posts: List[PostSearchResponse]
    communities: List[CommunitySearchResponse]
    events: List[EventSearchResponse]
    collaborations: List[CollaborationSearchResponse]


class TrendingResponse(BaseModel):
    skills: List[dict]
    communities: List[CommunitySearchResponse]
    events: List[EventSearchResponse]
    collaborations: List[CollaborationSearchResponse]
