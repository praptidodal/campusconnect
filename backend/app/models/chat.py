import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Enum as SQLEnum,
    ForeignKey,
    TIMESTAMP,
    Text,
    UniqueConstraint,
    Boolean,
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from app.database.database import Base


class ConversationType(str, enum.Enum):
    direct = "direct"
    community = "community"
    collaboration = "collaboration"
    group = "group"


class Conversation(Base):
    __tablename__ = "conversations"

    conversation_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    conversation_type = Column(SQLEnum(ConversationType), nullable=False)
    created_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    community_id = Column(Integer, ForeignKey("communities.community_id", ondelete="CASCADE"), nullable=True, unique=True)
    collaboration_id = Column(Integer, ForeignKey("collaborations.collaboration_id", ondelete="CASCADE"), nullable=True, unique=True)
    group_name = Column(String(150), nullable=True)
    group_avatar = Column(String(500), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    community = relationship("Community", backref="conversation")
    collaboration = relationship("Collaboration", backref="conversation")


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"

    participant_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.conversation_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    joined_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationships
    conversation = relationship("Conversation", backref="participants")
    user = relationship("User", backref="participating_conversations")

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_conversation_participant"),
    )


class Message(Base):
    __tablename__ = "messages"

    message_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.conversation_id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    message_text = Column(Text, nullable=True)
    attachment_path = Column(String(500), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(TIMESTAMP, nullable=True)

    # Relationships
    conversation = relationship("Conversation", backref="messages")
    sender = relationship("User", backref="messages")


class MessageRead(Base):
    __tablename__ = "message_reads"

    read_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.message_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    read_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationships
    message = relationship("Message", backref=backref("reads", cascade="all, delete-orphan"))
    user = relationship("User", backref="message_reads")

    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_message_read"),
    )
