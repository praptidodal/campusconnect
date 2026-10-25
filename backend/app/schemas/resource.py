from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ResourceResponse(BaseModel):
    resource_id: int
    title: str
    description: Optional[str] = None
    resource_type: str
    reference_id: int
    uploaded_by: int
    uploader_name: str
    uploader_role: Optional[str] = None
    uploader_verified: Optional[bool] = False
    file_path: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    created_at: datetime
    download_count: int = 0

    class Config:
        from_attributes = True


class DownloadDetail(BaseModel):
    download_id: int
    user_id: int
    user_name: str
    downloaded_at: datetime

    class Config:
        from_attributes = True


class ResourceAnalyticsResponse(BaseModel):
    resource_id: int
    total_downloads: int
    recent_downloads_count: int
    downloads: List[DownloadDetail] = []

    class Config:
        from_attributes = True
