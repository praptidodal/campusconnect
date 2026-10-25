from sqlalchemy import (
    Column, Integer, String, Text, ForeignKey, TIMESTAMP, Boolean, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database.database import Base


class TargetAudience(str, enum.Enum):
    all_students       = "all_students"
    all_teachers       = "all_teachers"
    specific_community = "specific_community"
    specific_event     = "specific_event"


class OfficialNotice(Base):
    __tablename__ = "official_notices"

    notice_id       = Column(Integer, primary_key=True, autoincrement=True, index=True)
    teacher_id      = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    title           = Column(String(255), nullable=False)
    description     = Column(Text, nullable=False)
    target_audience = Column(String(50), nullable=False)
    reference_id    = Column(Integer, nullable=True)
    created_at      = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    teacher    = relationship("User", foreign_keys=[teacher_id], backref="notices")
    recipients = relationship("NoticeRecipient", back_populates="notice", cascade="all, delete-orphan")


class NoticeRecipient(Base):
    __tablename__ = "notice_recipients"

    recipient_id      = Column(Integer, primary_key=True, autoincrement=True, index=True)
    notice_id         = Column(Integer, ForeignKey("official_notices.notice_id", ondelete="CASCADE"), nullable=False)
    user_id           = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    notification_sent = Column(Boolean, default=False, nullable=False)
    read_status       = Column(Boolean, default=False, nullable=False)

    notice = relationship("OfficialNotice", back_populates="recipients")
    user   = relationship("User", foreign_keys=[user_id])
