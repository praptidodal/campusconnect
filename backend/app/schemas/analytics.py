from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date


class PlatformAnalyticsResponse(BaseModel):
    total_users: int
    active_users: int
    total_posts: int
    total_communities: int
    total_events: int
    total_collaborations: int
    growth_percentage: float


class UserGrowthItem(BaseModel):
    date: str
    new_users: int
    active_users: int


class CreatorInfo(BaseModel):
    user_id: int
    name: str
    post_count: int
    likes_received: int
    comments_received: int


class PostAnalyticsResponse(BaseModel):
    posts_created: int
    likes: int
    comments: int
    most_active_creators: List[CreatorInfo]


class CommunityInfo(BaseModel):
    community_id: int
    community_name: str
    member_count: int
    post_count: int


class DateCountPair(BaseModel):
    date: str
    count: int


class CommunityAnalyticsResponse(BaseModel):
    top_communities: List[CommunityInfo]
    member_growth: List[DateCountPair]
    post_activity: List[DateCountPair]
    event_activity: List[DateCountPair]


class EventInfo(BaseModel):
    event_id: int
    title: str
    registrations_count: int


class CategoryCount(BaseModel):
    category: str
    count: int


class EventAnalyticsResponse(BaseModel):
    most_popular_events: List[EventInfo]
    registrations: List[DateCountPair]
    attendance_rate: float
    category_distribution: List[CategoryCount]


class CollaborationAnalyticsResponse(BaseModel):
    total_opportunities: int
    applications: int
    acceptance_rate: float
    completion_rate: float


class UserActivityContributor(BaseModel):
    user_id: int
    name: str
    activity_count: int


class CommunityLeaderContributor(BaseModel):
    user_id: int
    name: str
    community_count: int
    total_members: int


class EventOrganizerContributor(BaseModel):
    user_id: int
    name: str
    event_count: int
    total_registrations: int


class TopContributorsResponse(BaseModel):
    most_active_users: List[UserActivityContributor]
    most_active_community_leaders: List[CommunityLeaderContributor]
    most_active_event_organizers: List[EventOrganizerContributor]


class SkillTrendInfo(BaseModel):
    skill_id: int
    skill_name: str
    users_using_skill: int
    growth_percentage: float


class TrendingSkillsResponse(BaseModel):
    top_skills: List[SkillTrendInfo]
