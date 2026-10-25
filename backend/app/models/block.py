from sqlalchemy import Column, Integer, ForeignKey, TIMESTAMP, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base


class UserBlock(Base):
    """
    Represents the `user_blocks` table.
    Tracks user-level block relationships between blocker and blocked user.
    """
    __tablename__ = "user_blocks"

    block_id        = Column(Integer, primary_key=True, autoincrement=True, index=True)
    blocker_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    blocked_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    created_at      = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationships
    blocker      = relationship("User", foreign_keys=[blocker_user_id], backref="blocks_initiated")
    blocked_user = relationship("User", foreign_keys=[blocked_user_id], backref="blocked_by_users")

    __table_args__ = (
        UniqueConstraint("blocker_user_id", "blocked_user_id", name="uq_user_block"),
    )
