import enum
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, Date, TIMESTAMP, func
from app.database.database import Base


class ActivityType(str, enum.Enum):
    login = "login"
    post_created = "post_created"
    post_liked = "post_liked"
    comment_added = "comment_added"
    community_joined = "community_joined"
    event_registered = "event_registered"
    collaboration_created = "collaboration_created"
    collaboration_applied = "collaboration_applied"


class UserActivityLog(Base):
    __tablename__ = "user_activity_logs"

    activity_id   = Column(Integer, primary_key=True, autoincrement=True)
    user_id       = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    activity_type = Column(Enum(ActivityType), nullable=False)
    reference_id  = Column(Integer, nullable=True)
    created_at    = Column(TIMESTAMP, server_default=func.current_timestamp(), nullable=False)


class DailyPlatformMetric(Base):
    __tablename__ = "daily_platform_metrics"

    metric_id           = Column(Integer, primary_key=True, autoincrement=True)
    metric_date         = Column(Date, unique=True, nullable=False)
    total_users         = Column(Integer, default=0, nullable=False)
    active_users        = Column(Integer, default=0, nullable=False)
    total_posts         = Column(Integer, default=0, nullable=False)
    total_communities   = Column(Integer, default=0, nullable=False)
    total_events        = Column(Integer, default=0, nullable=False)
    total_collaborations = Column(Integer, default=0, nullable=False)
    created_at          = Column(TIMESTAMP, server_default=func.current_timestamp(), nullable=False)
