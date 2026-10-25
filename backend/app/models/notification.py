import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    TIMESTAMP,
    Boolean,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base


class NotificationType(str, enum.Enum):
    # Connection system (replaces follow)
    connection_request  = "connection_request"
    connection_accepted = "connection_accepted"
    # Social
    like                = "like"
    comment             = "comment"
    # Communities
    community_join      = "community_join"
    community_post      = "community_post"
    # Events
    event_registration  = "event_registration"
    event_created       = "event_created"
    # Collaborations
    application_received = "application_received"
    application_accepted = "application_accepted"
    application_rejected = "application_rejected"
    # Approval Workflow
    community_approved          = "community_approved"
    community_rejected          = "community_rejected"
    community_changes_requested = "community_changes_requested"
    event_approved              = "event_approved"
    event_rejected              = "event_rejected"
    event_changes_requested     = "event_changes_requested"
    # Moderation & Compliance
    warning_issued              = "warning_issued"
    content_removed             = "content_removed"
    account_suspended           = "account_suspended"
    account_unsuspended         = "account_unsuspended"
    account_banned              = "account_banned"
    account_unbanned            = "account_unbanned"


class ReferenceType(str, enum.Enum):
    post          = "post"
    comment       = "comment"
    community     = "community"
    event         = "event"
    collaboration = "collaboration"
    application   = "application"
    user          = "user"
    connection    = "connection"


class Notification(Base):
    __tablename__ = "notifications"

    notification_id   = Column(Integer, primary_key=True, autoincrement=True, index=True)
    sender_id         = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=True)
    receiver_id       = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    # String(50) instead of MySQL ENUM — avoids migration pain when adding new types
    notification_type = Column(String(50), nullable=False)
    title             = Column(String(255), nullable=True)
    message           = Column(Text, nullable=False)
    reference_id      = Column(Integer, nullable=True)
    reference_type    = Column(String(50), nullable=True)
    is_read           = Column(Boolean, default=False, nullable=False)
    created_at        = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationships
    sender   = relationship("User", foreign_keys=[sender_id],   backref="sent_notifications")
    receiver = relationship("User", foreign_keys=[receiver_id], backref="received_notifications")

    @property
    def sender_name(self):
        return self.sender.name if self.sender else None

    @property
    def sender_picture(self):
        if self.sender and self.sender.profile:
            sender_profile = self.sender.profile[0] if self.sender.profile else None
            return sender_profile.profile_picture if sender_profile else None
        return None

    @property
    def sender_role(self):
        return self.sender.role if self.sender else None

    @property
    def sender_department(self):
        if self.sender and self.sender.profile:
            sender_profile = self.sender.profile[0] if self.sender.profile else None
            return sender_profile.department if sender_profile else None
        return None

    @property
    def sender_verified(self):
        return self.sender.is_verified if self.sender else False


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    preference_id               = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id                     = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False)
    connection_notifications    = Column(Boolean, default=True, nullable=False)
    like_notifications          = Column(Boolean, default=True, nullable=False)
    comment_notifications       = Column(Boolean, default=True, nullable=False)
    community_notifications     = Column(Boolean, default=True, nullable=False)
    event_notifications         = Column(Boolean, default=True, nullable=False)
    collaboration_notifications = Column(Boolean, default=True, nullable=False)
    created_at                  = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationship
    user = relationship("User", backref="notification_preferences")
