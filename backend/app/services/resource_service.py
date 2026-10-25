import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.models.user import User
from app.models.community import Community, CommunityMember
from app.models.event import Event, EventRegistration, RegistrationStatus
from app.models.collaboration import Collaboration, Application, ApplicationStatus
from app.models.resource import Resource, ResourceDownload, ResourceType


def get_upload_dir(resource_type: str) -> str:
    """Resolve local directory path for uploading resources."""
    if resource_type == "community":
        return "uploads/resources/communities"
    elif resource_type == "event":
        return "uploads/resources/events"
    elif resource_type == "collaboration":
        return "uploads/resources/collaborations"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Invalid resource type"}
        )


async def save_resource_file(file: UploadFile, resource_type: str) -> tuple[str, int]:
    """Save an uploaded resource file locally and return its static URL path and file size."""
    upload_dir = get_upload_dir(resource_type)
    os.makedirs(upload_dir, exist_ok=True)
    
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    dest = os.path.join(upload_dir, filename)
    
    content = await file.read()
    file_size = len(content)
    
    with open(dest, "wb") as f:
        f.write(content)
        
    static_dir = upload_dir.replace("uploads/", "/static/")
    return f"{static_dir}/{filename}", file_size


def verify_upload_access(db: Session, user: User, resource_type: str, reference_id: int) -> None:
    """Verify if user has permission to upload resources for the given reference."""
    if user.role == "admin":
        return

    if resource_type == "community":
        member = db.query(CommunityMember).filter(
            CommunityMember.community_id == reference_id,
            CommunityMember.user_id == user.user_id
        ).first()
        if not member or member.role.value not in ["owner", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Only community owners and admins can upload resources"}
            )
            
    elif resource_type == "event":
        event = db.query(Event).filter(Event.event_id == reference_id).first()
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Event not found"}
            )
            
        # Organizer has access
        if event.organizer_id == user.user_id:
            return
            
        # Community owner/admin has access if event belongs to community
        if event.community_id:
            comm_member = db.query(CommunityMember).filter(
                CommunityMember.community_id == event.community_id,
                CommunityMember.user_id == user.user_id
            ).first()
            if comm_member and comm_member.role.value in ["owner", "admin"]:
                return
                
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Only the organizer or community moderators can upload event resources"}
        )
        
    elif resource_type == "collaboration":
        collab = db.query(Collaboration).filter(Collaboration.collaboration_id == reference_id).first()
        if not collab:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Collaboration not found"}
            )
            
        # Creator has access
        if collab.created_by == user.user_id:
            return
            
        # Accepted applicants have access
        app = db.query(Application).filter(
            Application.collaboration_id == reference_id,
            Application.applicant_id == user.user_id,
            Application.status == ApplicationStatus.accepted
        ).first()
        if not app:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Only the project creator and accepted team members can upload files"}
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Invalid resource type"}
        )


def verify_view_access(db: Session, user: User, resource_type: str, reference_id: int) -> None:
    """Verify if user has permission to view resources for the given reference."""
    if user.role == "admin":
        return

    if resource_type == "community":
        member = db.query(CommunityMember).filter(
            CommunityMember.community_id == reference_id,
            CommunityMember.user_id == user.user_id
        ).first()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Must be a member of the community to view resources"}
            )
            
    elif resource_type == "event":
        event = db.query(Event).filter(Event.event_id == reference_id).first()
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Event not found"}
            )
            
        # Organizer has access
        if event.organizer_id == user.user_id:
            return
            
        # Registered participants have access
        reg = db.query(EventRegistration).filter(
            EventRegistration.event_id == reference_id,
            EventRegistration.user_id == user.user_id,
            EventRegistration.registration_status != RegistrationStatus.cancelled
        ).first()
        if reg:
            return
            
        # Community members have access if event belongs to community
        if event.community_id:
            comm_member = db.query(CommunityMember).filter(
                CommunityMember.community_id == event.community_id,
                CommunityMember.user_id == user.user_id
            ).first()
            if comm_member:
                return
                
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Must be registered for the event or a community member to access resources"}
        )
        
    elif resource_type == "collaboration":
        collab = db.query(Collaboration).filter(Collaboration.collaboration_id == reference_id).first()
        if not collab:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Collaboration not found"}
            )
            
        # Creator has access
        if collab.created_by == user.user_id:
            return
            
        # Accepted applicants have access
        app = db.query(Application).filter(
            Application.collaboration_id == reference_id,
            Application.applicant_id == user.user_id,
            Application.status == ApplicationStatus.accepted
        ).first()
        if not app:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Only the project creator and accepted team members can access files"}
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Invalid resource type"}
        )


def serialize_resource(db: Session, resource: Resource) -> dict:
    """Helper to convert Resource model to dictionary with calculated counts and names."""
    download_count = db.query(ResourceDownload).filter(ResourceDownload.resource_id == resource.resource_id).count()
    uploader_name = resource.uploader.name if resource.uploader else "Deleted User"
    uploader_role = resource.uploader.role if resource.uploader else "student"
    uploader_verified = resource.uploader.is_verified if resource.uploader else False

    return {
        "resource_id": resource.resource_id,
        "title": resource.title,
        "description": resource.description,
        "resource_type": resource.resource_type.value,
        "reference_id": resource.reference_id,
        "uploaded_by": resource.uploaded_by,
        "uploader_name": uploader_name,
        "uploader_role": uploader_role,
        "uploader_verified": uploader_verified,
        "file_path": resource.file_path,
        "file_size": resource.file_size,
        "file_type": resource.file_type,
        "created_at": resource.created_at,
        "download_count": download_count
    }


async def create_resource(
    db: Session,
    uploader: User,
    title: str,
    description: Optional[str],
    resource_type: str,
    reference_id: int,
    file: UploadFile
) -> dict:
    """Create a new resource, saving the file locally."""
    # Verify upload permissions
    verify_upload_access(db, uploader, resource_type, reference_id)
    
    file_path, file_size = await save_resource_file(file, resource_type)
    
    # Extract file extension for formatting
    file_ext = (file.filename or "file").rsplit(".", 1)[-1].lower()
    
    res = Resource(
        title=title,
        description=description,
        resource_type=ResourceType(resource_type),
        reference_id=reference_id,
        uploaded_by=uploader.user_id,
        file_path=file_path,
        file_size=file_size,
        file_type=file_ext
    )
    
    db.add(res)
    db.commit()
    db.refresh(res)
    return serialize_resource(db, res)


def get_resource_details(db: Session, resource_id: int, user: User) -> dict:
    """Retrieve metadata details for a resource after verifying view access."""
    res = db.query(Resource).filter(Resource.resource_id == resource_id, Resource.is_deleted == False).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Resource not found"}
        )
        
    verify_view_access(db, user, res.resource_type.value, res.reference_id)
    return serialize_resource(db, res)


def list_resources(db: Session, user: User, resource_type: str, reference_id: int) -> List[dict]:
    """Retrieve resources for a specific entity after verifying view access."""
    verify_view_access(db, user, resource_type, reference_id)
    
    resources = db.query(Resource).filter(
        Resource.resource_type == ResourceType(resource_type),
        Resource.reference_id == reference_id,
        Resource.is_deleted == False
    ).order_by(Resource.created_at.desc()).all()
    
    return [serialize_resource(db, r) for r in resources]


def get_resource_download_path(db: Session, resource_id: int, user: User) -> tuple[str, str]:
    """Verify download permissions, log download event, and return the local path and filename."""
    res = db.query(Resource).filter(Resource.resource_id == resource_id, Resource.is_deleted == False).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Resource not found"}
        )
        
    verify_view_access(db, user, res.resource_type.value, res.reference_id)
    
    # Record download
    download = ResourceDownload(resource_id=resource_id, user_id=user.user_id)
    db.add(download)
    db.commit()
    
    # Map static URL back to local uploads directory path
    local_path = res.file_path.replace("/static/", "uploads/")
    filename = res.file_path.rsplit("/", 1)[-1]
    
    if not os.path.exists(local_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "File not found on storage server"}
        )
        
    return local_path, filename


def delete_resource(db: Session, resource_id: int, user: User) -> None:
    """Delete resource metadata and remove the physical file from disk."""
    res = db.query(Resource).filter(Resource.resource_id == resource_id, Resource.is_deleted == False).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Resource not found"}
        )
        
    # Only uploader or admin can delete
    if user.role != "admin" and res.uploaded_by != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Only the uploader or administrators can delete resources"}
        )
        
    res.is_deleted = True
    res.deleted_at = datetime.utcnow()
    db.commit()


def undo_delete_resource(db: Session, resource_id: int, user: User) -> dict:
    """Restore a soft-deleted resource."""
    res = db.query(Resource).filter(Resource.resource_id == resource_id, Resource.is_deleted == True).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Resource not found or cannot be restored"}
        )
        
    # Only uploader or admin can undo
    if user.role != "admin" and res.uploaded_by != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Only the uploader or administrators can restore resources"}
        )
        
    res.is_deleted = False
    res.deleted_at = None
    db.commit()
    return {"message": "Resource restored successfully"}


def get_resource_analytics(db: Session, resource_id: int, user: User) -> dict:
    """Calculate and return download statistics for a resource."""
    res = db.query(Resource).filter(Resource.resource_id == resource_id, Resource.is_deleted == False).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Resource not found"}
        )
        
    verify_view_access(db, user, res.resource_type.value, res.reference_id)
    
    total_downloads = db.query(ResourceDownload).filter(ResourceDownload.resource_id == resource_id).count()
    
    # Calculate downloads in the past 7 days
    seven_days_ago = datetime.now() - timedelta(days=7)
    recent_downloads_count = db.query(ResourceDownload).filter(
        ResourceDownload.resource_id == resource_id,
        ResourceDownload.downloaded_at >= seven_days_ago
    ).count()
    
    # Fetch recent downloads list
    downloads = db.query(ResourceDownload).filter(
        ResourceDownload.resource_id == resource_id
    ).order_by(ResourceDownload.downloaded_at.desc()).limit(20).all()
    
    downloads_list = []
    for d in downloads:
        downloads_list.append({
            "download_id": d.download_id,
            "user_id": d.user_id,
            "user_name": d.user.name if d.user else "Deleted User",
            "downloaded_at": d.downloaded_at
        })
        
    return {
        "resource_id": resource_id,
        "total_downloads": total_downloads,
        "recent_downloads_count": recent_downloads_count,
        "downloads": downloads_list
    }


def search_and_filter_resources(
    db: Session,
    user: User,
    keyword: Optional[str] = None,
    resource_type: Optional[str] = None,
    file_type: Optional[str] = None
) -> List[dict]:
    """Search files user has permission to access, with title/type filters."""
    query = db.query(Resource).filter(Resource.is_deleted == False)
    
    if keyword and keyword.strip():
        query = query.filter(
            or_(
                Resource.title.like(f"%{keyword}%"),
                Resource.description.like(f"%{keyword}%")
            )
        )
        
    if resource_type:
        query = query.filter(Resource.resource_type == ResourceType(resource_type))
        
    if file_type and file_type.strip():
        query = query.filter(Resource.file_type == file_type.lower())
        
    all_matched = query.order_by(Resource.created_at.desc()).all()
    
    # Filter only resources the user has authorization to view
    authorized = []
    
    # Pre-cache user's authorizations to avoid redundant queries in loops
    # 1. Communities user is a member of
    joined_comm_ids = {m[0] for m in db.query(CommunityMember.community_id).filter(CommunityMember.user_id == user.user_id).all()}
    
    # 2. Events user is registered for or organized
    organized_event_ids = {e[0] for e in db.query(Event.event_id).filter(Event.organizer_id == user.user_id).all()}
    registered_event_ids = {r[0] for r in db.query(EventRegistration.event_id).filter(
        EventRegistration.user_id == user.user_id,
        EventRegistration.registration_status != RegistrationStatus.cancelled
    ).all()}
    all_event_ids = organized_event_ids.union(registered_event_ids)
    
    # 3. Collaborations user is creator or accepted applicant of
    created_collab_ids = {c[0] for c in db.query(Collaboration.collaboration_id).filter(Collaboration.created_by == user.user_id).all()}
    accepted_collab_ids = {a[0] for a in db.query(Application.collaboration_id).filter(
        Application.applicant_id == user.user_id,
        Application.status == ApplicationStatus.accepted
    ).all()}
    all_collab_ids = created_collab_ids.union(accepted_collab_ids)
    
    for r in all_matched:
        if user.role == "admin":
            authorized.append(r)
            continue
            
        if r.resource_type == ResourceType.community:
            if r.reference_id in joined_comm_ids:
                authorized.append(r)
        elif r.resource_type == ResourceType.event:
            # Event access
            if r.reference_id in all_event_ids:
                authorized.append(r)
            else:
                # Check if event belongs to a joined community
                event = db.query(Event).filter(Event.event_id == r.reference_id).first()
                if event and event.community_id and event.community_id in joined_comm_ids:
                    authorized.append(r)
        elif r.resource_type == ResourceType.collaboration:
            if r.reference_id in all_collab_ids:
                authorized.append(r)
                
    return [serialize_resource(db, r) for r in authorized]
