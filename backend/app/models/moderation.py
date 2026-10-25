import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base


class ContentType(str, enum.Enum):
    post = "post"
    comment = "comment"
    message = "message"
    community = "community"
    event = "event"
    profile = "profile"


# Backward compatibility alias
ReportType = ContentType


class ReportReason(str, enum.Enum):
    spam = "spam"
    harassment = "harassment"
    hate_speech = "hate_speech"
    fake_information = "fake_information"
    violence = "violence"
    copyright = "copyright"
    other = "other"


class ReportStatus(str, enum.Enum):
    pending = "pending"
    reviewing = "reviewing"
    resolved = "resolved"
    dismissed = "dismissed"


class ModerationAction(str, enum.Enum):
    warning = "warning"
    suspend = "suspend"
    unsuspend = "unsuspend"
    ban = "ban"
    unban = "unban"
    delete_post = "delete_post"
    delete_comment = "delete_comment"
    delete_message = "delete_message"
    delete_event = "delete_event"
    delete_community = "delete_community"
    dismiss_report = "dismiss_report"


class Report(Base):
    """
    Represents the `reports` table.
    Stores content & profile violation reports submitted by users.
    """
    __tablename__ = "reports"

    report_id        = Column(Integer, primary_key=True, autoincrement=True, index=True)
    reporter_id      = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    reported_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    content_type     = Column(Enum(ContentType), nullable=False)
    content_id       = Column(Integer, nullable=False)
    reason           = Column(Enum(ReportReason), nullable=False)
    description      = Column(Text, nullable=True)
    status           = Column(Enum(ReportStatus), default=ReportStatus.pending, nullable=False)
    created_at       = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    reviewed_by      = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    reviewed_at      = Column(TIMESTAMP, nullable=True)

    # Relationships
    reporter      = relationship("User", foreign_keys=[reporter_id], backref="submitted_reports")
    reported_user = relationship("User", foreign_keys=[reported_user_id], backref="received_reports")
    reviewer      = relationship("User", foreign_keys=[reviewed_by], backref="reviewed_reports")


class ModerationLog(Base):
    """
    Represents the `moderation_logs` table.
    Tracks all moderation actions taken by administrators (warn, suspend, ban, delete content, dismiss).
    """
    __tablename__ = "moderation_logs"

    log_id     = Column(Integer, primary_key=True, autoincrement=True, index=True)
    admin_id   = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    report_id  = Column(Integer, ForeignKey("reports.report_id", ondelete="SET NULL"), nullable=True)
    user_id    = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    action     = Column(Enum(ModerationAction), nullable=False)
    reason     = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationships
    admin         = relationship("User", foreign_keys=[admin_id], backref="moderation_actions")
    affected_user = relationship("User", foreign_keys=[user_id], backref="moderation_history")
    report        = relationship("Report", backref="moderation_logs")


class AdminActionLog(Base):
    """
    Represents the `admin_logs` table.
    Tracks all general administrative actions: role changes, status updates, content deletions,
    faculty approvals, etc.  Separate from moderation_logs which covers user penalty actions.
    """
    __tablename__ = "admin_logs"

    log_id      = Column(Integer, primary_key=True, autoincrement=True, index=True)
    admin_id    = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    action      = Column(String(150), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id   = Column(Integer, nullable=True)
    details     = Column(Text, nullable=True)
    created_at  = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationships
    admin = relationship("User", foreign_keys=[admin_id], backref="admin_action_logs")


# Alias: AdminLog points to AdminActionLog (general admin audit trail)
AdminLog = AdminActionLog
