import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Enum,
    ForeignKey,
    TIMESTAMP,
    DateTime,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base
from app.models.community import ApprovalStatus  # reuse the shared enum


class EventStatus(str, enum.Enum):
    upcoming = "upcoming"
    ongoing = "ongoing"
    completed = "completed"
    cancelled = "cancelled"


class RegistrationStatus(str, enum.Enum):
    registered = "registered"
    cancelled = "cancelled"
    attended = "attended"


class Event(Base):
    __tablename__ = "events"

    event_id              = Column(Integer, primary_key=True, autoincrement=True, index=True)
    title                 = Column(String(200), nullable=False)
    description           = Column(Text, nullable=False)
    category              = Column(String(100), nullable=True)
    venue                 = Column(String(200), nullable=True)
    start_datetime        = Column(DateTime, nullable=False)
    end_datetime          = Column(DateTime, nullable=False)
    registration_deadline = Column(DateTime, nullable=True)
    poster_url            = Column(String(500), nullable=True)
    organizer_id          = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    community_id          = Column(Integer, ForeignKey("communities.community_id", ondelete="CASCADE"), nullable=True)
    max_participants      = Column(Integer, nullable=True)
    status                = Column(
        Enum(EventStatus),
        default=EventStatus.upcoming,
        nullable=False,
    )
    created_at            = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # ── Approval Workflow ─────────────────────────────────────────────
    approval_status       = Column(
        Enum(ApprovalStatus),
        default=ApprovalStatus.pending,
        nullable=False,
    )
    approved_by           = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    approved_at           = Column(TIMESTAMP, nullable=True)
    approval_notes        = Column(Text, nullable=True)

    # Relationships
    organizer     = relationship("User", foreign_keys=[organizer_id], backref="organized_events")
    community     = relationship("Community", backref="events")
    approver      = relationship("User", foreign_keys=[approved_by], backref="approved_events")
    registrations = relationship("EventRegistration", backref="event", cascade="all, delete-orphan", passive_deletes=True)



class EventRegistration(Base):
    __tablename__ = "event_registrations"

    registration_id     = Column(Integer, primary_key=True, autoincrement=True, index=True)
    event_id            = Column(Integer, ForeignKey("events.event_id", ondelete="CASCADE"), nullable=False)
    user_id             = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    registration_status = Column(
        Enum(RegistrationStatus),
        default=RegistrationStatus.registered,
        nullable=False,
    )
    registered_at       = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationships
    user  = relationship("User", backref="event_registrations")

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_event_registration"),
    )
