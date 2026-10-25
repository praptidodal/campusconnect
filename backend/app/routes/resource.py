from typing import List, Optional
from fastapi import APIRouter, Depends, Form, File, UploadFile, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.auth.jwt_handler import get_current_user
from app.models.user import User
from app.schemas.resource import ResourceResponse, ResourceAnalyticsResponse
from app.services import resource_service

router = APIRouter(prefix="/api/resources", tags=["Resource Hub"])


@router.post("", response_model=ResourceResponse, status_code=201)
async def upload_resource_endpoint(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    resource_type: str = Form(...),
    reference_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a resource file locally and link it to a community, event, or collaboration."""
    return await resource_service.create_resource(
        db=db,
        uploader=current_user,
        title=title,
        description=description,
        resource_type=resource_type,
        reference_id=reference_id,
        file=file
    )


@router.get("", response_model=List[ResourceResponse])
def list_resources_endpoint(
    resource_type: str = Query(...),
    reference_id: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all resources uploaded for a community, event, or collaboration project."""
    return resource_service.list_resources(
        db=db,
        user=current_user,
        resource_type=resource_type,
        reference_id=reference_id
    )


@router.get("/search", response_model=List[ResourceResponse])
def search_resources_endpoint(
    keyword: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search across all resources the current user has permission to access."""
    return resource_service.search_and_filter_resources(
        db=db,
        user=current_user,
        keyword=keyword,
        resource_type=resource_type,
        file_type=file_type
    )


@router.get("/{resource_id}", response_model=ResourceResponse)
def get_resource_details_endpoint(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve metadata information for a resource."""
    return resource_service.get_resource_details(db, resource_id, current_user)


@router.get("/{resource_id}/download")
def download_resource_endpoint(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download a resource file and record the download event."""
    local_path, filename = resource_service.get_resource_download_path(db, resource_id, current_user)
    return FileResponse(path=local_path, filename=filename)


@router.delete("/{resource_id}", response_model=dict)
def delete_resource_endpoint(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a resource file from disk and metadata from the database (uploader or admin only)."""
    resource_service.delete_resource(db, resource_id, current_user)
    return {"message": "Resource deleted successfully"}


@router.post("/{resource_id}/undo", response_model=dict)
def undo_delete_resource_endpoint(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Restore a soft-deleted resource file."""
    return resource_service.undo_delete_resource(db, resource_id, current_user)


@router.get("/{resource_id}/analytics", response_model=ResourceAnalyticsResponse)
def get_resource_analytics_endpoint(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve download statistics and analytics history for a resource."""
    return resource_service.get_resource_analytics(db, resource_id, current_user)
