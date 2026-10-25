import enum
from sqlalchemy import Column, Integer, Text, String, Enum, ForeignKey, TIMESTAMP, UniqueConstraint, Boolean
from sqlalchemy.sql import func
from app.database.database import Base


class VisibilityEnum(str, enum.Enum):
    public = "public"
    followers = "followers"
    community = "community"


class Post(Base):
    __tablename__ = "posts"

    post_id    = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    content    = Column(Text, nullable=False)
    image_url  = Column(String(500), nullable=True)
    visibility = Column(Enum(VisibilityEnum), default=VisibilityEnum.public, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(TIMESTAMP, nullable=True)


class Like(Base):
    __tablename__ = "likes"

    like_id    = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    post_id    = Column(Integer, ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_like"),
    )


class Comment(Base):
    __tablename__ = "comments"

    comment_id   = Column(Integer, primary_key=True, autoincrement=True, index=True)
    post_id      = Column(Integer, ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=False, index=True)
    user_id      = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    comment_text = Column(Text, nullable=False)
    created_at   = Column(TIMESTAMP, server_default=func.now(), nullable=False)
