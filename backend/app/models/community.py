import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Enum,
    ForeignKey,
    TIMESTAMP,
    UniqueConstraint,
    Boolean,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base


class ApprovalStatus(str, enum.Enum):
    pending  = "pending"
    approved = "approved"
    rejected = "rejected"


class CommunityRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    member = "member"


class Community(Base):
    __tablename__ = "communities"

    community_id   = Column(Integer, primary_key=True, autoincrement=True, index=True)
    community_name = Column(String(150), nullable=False, unique=True, index=True)
    description    = Column(Text, nullable=True)
    category       = Column(String(100), nullable=True)
    logo_url       = Column(String(500), nullable=True)
    created_by      = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    created_at      = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # ── Approval Workflow ─────────────────────────────────────────────
    approval_status = Column(
        Enum(ApprovalStatus),
        default=ApprovalStatus.pending,
        nullable=False,
    )
    approved_by     = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    approved_at     = Column(TIMESTAMP, nullable=True)
    approval_notes  = Column(Text, nullable=True)

    # Relationships
    creator  = relationship("User", foreign_keys=[created_by], backref="created_communities")
    approver = relationship("User", foreign_keys=[approved_by], backref="approved_communities")


class CommunityMember(Base):
    __tablename__ = "community_members"

    membership_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    community_id  = Column(Integer, ForeignKey("communities.community_id", ondelete="CASCADE"), nullable=False)
    user_id       = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    role          = Column(
        Enum(CommunityRole),
        default=CommunityRole.member,
        nullable=False,
    )
    position      = Column(String(100), nullable=True)
    joined_at     = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationships
    community = relationship("Community", backref="memberships")
    user      = relationship("User", backref="memberships")

    __table_args__ = (
        UniqueConstraint("community_id", "user_id", name="uq_community_member"),
    )


class CommunityPost(Base):
    __tablename__ = "community_posts"

    community_post_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    community_id      = Column(Integer, ForeignKey("communities.community_id", ondelete="CASCADE"), nullable=False)
    user_id           = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    content           = Column(Text, nullable=False)
    image_url         = Column(String(500), nullable=True)
    created_at        = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    is_deleted        = Column(Boolean, default=False, nullable=False)
    deleted_at        = Column(TIMESTAMP, nullable=True)

    # Relationships
    community = relationship("Community", backref="posts")
    user      = relationship("User", backref="community_posts")


class CommunityOpening(Base):
    __tablename__ = "community_openings"

    opening_id   = Column(Integer, primary_key=True, autoincrement=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.community_id", ondelete="CASCADE"), nullable=False)
    title        = Column(String(200), nullable=False)
    description  = Column(Text, nullable=True)
    is_active    = Column(Boolean, default=True, nullable=False)
    created_by   = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    created_at   = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    closed_at    = Column(TIMESTAMP, nullable=True)

    # Relationships
    community = relationship("Community", backref="openings")
    creator   = relationship("User", foreign_keys=[created_by])


class MembershipApplicationStatus(str, enum.Enum):
    pending   = "pending"
    interview = "interview"
    accepted  = "accepted"
    rejected  = "rejected"


class MembershipApplication(Base):
    __tablename__ = "membership_applications"

    application_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    opening_id     = Column(Integer, ForeignKey("community_openings.opening_id", ondelete="CASCADE"), nullable=False)
    community_id   = Column(Integer, ForeignKey("communities.community_id", ondelete="CASCADE"), nullable=False)
    applicant_id   = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    status         = Column(Enum(MembershipApplicationStatus), default=MembershipApplicationStatus.pending, nullable=False)
    cover_note     = Column(Text, nullable=True)
    resume_url     = Column(String(500), nullable=True)
    applied_at     = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    reviewed_by    = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    reviewed_at    = Column(TIMESTAMP, nullable=True)
    review_notes   = Column(Text, nullable=True)

    # Relationships
    opening   = relationship("CommunityOpening", backref="applications")
    community = relationship("Community", backref="membership_applications")
    applicant = relationship("User", foreign_keys=[applicant_id], backref="club_applications")
    reviewer  = relationship("User", foreign_keys=[reviewed_by])

    __table_args__ = (
        UniqueConstraint("applicant_id", "opening_id", name="uq_applicant_opening"),
    )

