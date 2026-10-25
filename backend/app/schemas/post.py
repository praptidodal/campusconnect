from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class VisibilityEnum(str, Enum):
    public = "public"
    followers = "followers"
    community = "community"


class PostCreate(BaseModel):
    content:    str = Field(..., min_length=1, max_length=5000)
    image_url:  Optional[str] = None
    visibility: VisibilityEnum = VisibilityEnum.public


class AuthorInfo(BaseModel):
    user_id:         int
    name:            str
    role:            str
    profile_picture: Optional[str] = None

    model_config = {"from_attributes": True}


class PostResponse(BaseModel):
    post_id:       int
    user_id:       int
    author:        AuthorInfo
    content:       str
    image_url:     Optional[str] = None
    visibility:    VisibilityEnum
    like_count:    int
    comment_count: int
    is_liked:      bool
    created_at:    datetime

    model_config = {"from_attributes": True}


class LikeInfo(BaseModel):
    user_id: int
    name:    str

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    comment_text: str = Field(..., min_length=1)


class CommentResponse(BaseModel):
    comment_id:   int
    user_id:      int
    name:         str
    comment_text: str
    created_at:   datetime

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    message: str
