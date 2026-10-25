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


class CollaborationStatus(str, enum.Enum):
    open = "open"
    closed = "closed"
    completed = "completed"


class ApplicationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class Collaboration(Base):
    __tablename__ = "collaborations"

    collaboration_id    = Column(Integer, primary_key=True, autoincrement=True, index=True)
    title               = Column(String(200), nullable=False)
    description         = Column(Text, nullable=False)
    category            = Column(String(100), nullable=True)
    required_skills     = Column(Text, nullable=True)
    positions_available = Column(Integer, default=1, nullable=False)
    deadline            = Column(DateTime, nullable=True)
    status              = Column(
        Enum(CollaborationStatus),
        default=CollaborationStatus.open,
        nullable=False,
    )
    created_by          = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    community_id        = Column(Integer, ForeignKey("communities.community_id", ondelete="CASCADE"), nullable=True)
    attachment_path     = Column(String(500), nullable=True)
    created_at          = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationships
    creator = relationship("User", backref="created_collaborations")
    community = relationship("Community", backref="collaborations")
    applications = relationship("Application", backref="collaboration", cascade="all, delete-orphan", passive_deletes=True)


class Application(Base):
    __tablename__ = "applications"

    application_id      = Column(Integer, primary_key=True, autoincrement=True, index=True)
    collaboration_id    = Column(Integer, ForeignKey("collaborations.collaboration_id", ondelete="CASCADE"), nullable=False)
    applicant_id        = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    application_message = Column(Text, nullable=True)
    resume_path         = Column(String(500), nullable=True)
    status              = Column(
        Enum(ApplicationStatus),
        default=ApplicationStatus.pending,
        nullable=False,
    )
    applied_at          = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationships
    applicant = relationship("User", backref="applications")

    __table_args__ = (
        UniqueConstraint("collaboration_id", "applicant_id", name="uq_collaboration_application"),
    )
