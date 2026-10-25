import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Enum as SQLEnum,
    ForeignKey,
    TIMESTAMP,
    Text,
    BigInteger,
    Boolean,
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from app.database.database import Base


class ResourceType(str, enum.Enum):
    community = "community"
    event = "event"
    collaboration = "collaboration"


class Resource(Base):
    __tablename__ = "resources"

    resource_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    resource_type = Column(SQLEnum(ResourceType), nullable=False)
    reference_id = Column(Integer, nullable=False, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=True)
    file_type = Column(String(100), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(TIMESTAMP, nullable=True)

    # Relationships
    uploader = relationship("User", backref="uploaded_resources")


class ResourceDownload(Base):
    __tablename__ = "resource_downloads"

    download_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    resource_id = Column(Integer, ForeignKey("resources.resource_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    downloaded_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationships
    resource = relationship("Resource", backref=backref("downloads", cascade="all, delete-orphan"))
    user = relationship("User", backref="downloaded_resources")
