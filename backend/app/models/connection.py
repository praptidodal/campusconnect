import enum
from sqlalchemy import (
    Column, Integer, String, Enum, ForeignKey, TIMESTAMP, UniqueConstraint
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base


class RequestStatus(str, enum.Enum):
    pending   = "pending"
    accepted  = "accepted"
    rejected  = "rejected"
    withdrawn = "withdrawn"


class ConnectionRequest(Base):
    """
    Represents a pending/historical connection request from sender → receiver.
    Unique per (sender_id, receiver_id) pair.
    """
    __tablename__ = "connection_requests"

    request_id   = Column(Integer, primary_key=True, autoincrement=True, index=True)
    sender_id    = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_id  = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    status       = Column(Enum(RequestStatus), nullable=False, default=RequestStatus.pending)
    created_at   = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at   = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)

    sender   = relationship("User", foreign_keys=[sender_id],   backref="sent_requests")
    receiver = relationship("User", foreign_keys=[receiver_id], backref="received_requests")

    __table_args__ = (
        UniqueConstraint("sender_id", "receiver_id", name="uq_connection_request"),
    )


class Connection(Base):
    """
    Mutual connection record. One row per pair.
    Always stores smaller user_id in user_one and larger in user_two.
    """
    __tablename__ = "connections"

    connection_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_one      = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    user_two      = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    connected_at  = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    member_one = relationship("User", foreign_keys=[user_one], backref="connections_as_one")
    member_two = relationship("User", foreign_keys=[user_two], backref="connections_as_two")

    __table_args__ = (
        UniqueConstraint("user_one", "user_two", name="uq_connection"),
    )
