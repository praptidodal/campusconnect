import os
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.user import User
from app.models.profile import Profile, Skill, UserSkill
from app.models.community import Community, CommunityMember, CommunityRole
from app.models.collaboration import Collaboration, Application, CollaborationStatus, ApplicationStatus


# ── File Validation Helpers ───────────────────────────────────────────────────

def validate_attachment(file: UploadFile):
    # Attachment: Max 10MB, restrict executable files
    forbidden_extensions = {".exe", ".sh", ".bat", ".cmd", ".msi"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext in forbidden_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": f"File type {ext} is not allowed."}
        )
    
    # Read file size
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    
    if size > 10 * 1024 * 1024:  # 10 MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Attachment file size exceeds 10MB limit."}
        )


def validate_resume(file: UploadFile):
    # Resume: Max 5MB, PDF/DOC/DOCX only
    allowed_extensions = {".pdf", ".doc", ".docx"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Only PDF, DOC, or DOCX formats are allowed for resumes."}
        )
    
    # Read file size
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    
    if size > 5 * 1024 * 1024:  # 5 MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Resume file size exceeds 5MB limit."}
        )


def save_uploaded_file(file: UploadFile, subfolder: str) -> str:
    upload_dir = os.path.join("uploads", subfolder)
    os.makedirs(upload_dir, exist_ok=True)
    
    ext = os.path.splitext(file.filename or "")[1].lower()
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(upload_dir, filename)
    
    # Save content
    with open(dest, "wb") as f:
        f.write(file.file.read())
        
    return f"/static/{subfolder}/{filename}"


# ── Response Builder Helpers ─────────────────────────────────────────────────

def _skill_names_for_user(user_id: int, db: Session) -> List[str]:
    rows = (
        db.query(Skill.skill_name)
        .join(UserSkill, UserSkill.skill_id == Skill.skill_id)
        .filter(UserSkill.user_id == user_id)
        .all()
    )
    return [r.skill_name for r in rows]


def _build_collaboration_response(collab: Collaboration, current_user: User, db: Session) -> dict:
    apps_count = db.query(Application).filter(
        Application.collaboration_id == collab.collaboration_id
    ).count()

    creator_profile = db.query(Profile).filter(Profile.user_id == collab.created_by).first()
    creator_avatar = creator_profile.profile_picture if creator_profile else None
    
    user_app = db.query(Application).filter(
        Application.collaboration_id == collab.collaboration_id,
        Application.applicant_id == current_user.user_id
    ).first()
    
    is_applied = user_app is not None
    app_status = user_app.status.value if user_app else None
    
    comm_name = collab.community.community_name if collab.community else None

    return {
        "collaboration_id": collab.collaboration_id,
        "title": collab.title,
        "description": collab.description,
        "category": collab.category,
        "required_skills": collab.required_skills,
        "positions_available": collab.positions_available,
        "deadline": collab.deadline,
        "status": collab.status.value,
        "created_by": collab.created_by,
        "community_id": collab.community_id,
        "attachment_path": collab.attachment_path,
        "created_at": collab.created_at,
        "creator_name": collab.creator.name if collab.creator else "Unknown",
        "creator_email": collab.creator.email if collab.creator else "",
        "creator_avatar": creator_avatar,
        "creator_role": collab.creator.role if collab.creator else "student",
        "creator_verified": collab.creator.is_verified if collab.creator else False,
        "community_name": comm_name,
        "applications_count": apps_count,
        "is_applied": is_applied,
        "application_status": app_status,
    }


def _build_application_response(app: Application, db: Session) -> dict:
    applicant_profile = db.query(Profile).filter(Profile.user_id == app.applicant_id).first()
    
    avatar = applicant_profile.profile_picture if applicant_profile else None
    dept = applicant_profile.department if applicant_profile else None
    skills = _skill_names_for_user(app.applicant_id, db)

    return {
        "application_id": app.application_id,
        "collaboration_id": app.collaboration_id,
        "applicant_id": app.applicant_id,
        "application_message": app.application_message,
        "resume_path": app.resume_path,
        "status": app.status.value,
        "applied_at": app.applied_at,
        "applicant_name": app.applicant.name if app.applicant else "Unknown",
        "applicant_email": app.applicant.email if app.applicant else "",
        "applicant_avatar": avatar,
        "applicant_department": dept,
        "applicant_skills": skills,
        "applicant_role": app.applicant.role if app.applicant else "student",
        "applicant_verified": app.applicant.is_verified if app.applicant else False,
    }


# ── Collaboration Service ────────────────────────────────────────────────────

def create_collaboration(
    db: Session,
    current_user: User,
    title: str,
    description: str,
    category: Optional[str],
    required_skills: Optional[str],
    positions_available: int,
    deadline: datetime,
    community_id: Optional[int],
    attachment: Optional[UploadFile],
) -> dict:
    # Validations
    if not title or not title.strip():
        raise HTTPException(status_code=400, detail={"message": "Title is required"})
    if not description or not description.strip():
        raise HTTPException(status_code=400, detail={"message": "Description is required"})
    if positions_available <= 0:
        raise HTTPException(status_code=400, detail={"message": "Positions available must be greater than 0"})
    if deadline <= datetime.now():
        raise HTTPException(status_code=400, detail={"message": "Deadline must be a future date"})

    # Check community ownership/membership if community_id provided
    if community_id is not None:
        member = db.query(CommunityMember).filter(
            CommunityMember.community_id == community_id,
            CommunityMember.user_id == current_user.user_id
        ).first()
        if not member or member.role not in [CommunityRole.owner, CommunityRole.admin]:
            raise HTTPException(status_code=403, detail={"message": "You are not authorized to post collaborations for this community"})

    # Save attachment file if present
    attachment_path = None
    if attachment:
        validate_attachment(attachment)
        attachment_path = save_uploaded_file(attachment, "collaborations")

    collab = Collaboration(
        title=title.strip(),
        description=description.strip(),
        category=category,
        required_skills=required_skills,
        positions_available=positions_available,
        deadline=deadline,
        status=CollaborationStatus.open,
        created_by=current_user.user_id,
        community_id=community_id,
        attachment_path=attachment_path,
    )
    db.add(collab)
    db.commit()
    db.refresh(collab)

    from app.services.analytics_service import log_user_activity
    log_user_activity(db, current_user.user_id, "collaboration_created", collab.collaboration_id)

    return _build_collaboration_response(collab, current_user, db)



def list_collaborations(
    db: Session,
    current_user: User,
    category: Optional[str] = None,
    skill: Optional[str] = None,
    status_filter: Optional[str] = None,
    community_id: Optional[int] = None,
) -> List[dict]:
    query = db.query(Collaboration)
    
    if category:
        query = query.filter(Collaboration.category == category)
    if status_filter:
        query = query.filter(Collaboration.status == CollaborationStatus(status_filter))
    if community_id is not None:
        query = query.filter(Collaboration.community_id == community_id)
    if skill:
        query = query.filter(Collaboration.required_skills.like(f"%{skill}%"))
        
    collaborations = query.order_by(Collaboration.created_at.desc()).all()
    return [_build_collaboration_response(c, current_user, db) for c in collaborations]


def search_collaborations(
    db: Session,
    current_user: User,
    title: Optional[str] = None,
    skill: Optional[str] = None,
    category: Optional[str] = None,
) -> List[dict]:
    query = db.query(Collaboration)
    
    if title:
        query = query.filter(Collaboration.title.like(f"%{title}%"))
    if skill:
        query = query.filter(Collaboration.required_skills.like(f"%{skill}%"))
    if category:
        query = query.filter(Collaboration.category == category)
        
    collaborations = query.order_by(Collaboration.created_at.desc()).all()
    return [_build_collaboration_response(c, current_user, db) for c in collaborations]


def get_collaboration_details(db: Session, collaboration_id: int, current_user: User) -> dict:
    collab = db.query(Collaboration).filter(Collaboration.collaboration_id == collaboration_id).first()
    if not collab:
        raise HTTPException(status_code=404, detail={"message": "Collaboration opportunity not found"})
    return _build_collaboration_response(collab, current_user, db)


def update_collaboration(
    db: Session,
    collaboration_id: int,
    current_user: User,
    title: Optional[str],
    description: Optional[str],
    category: Optional[str],
    required_skills: Optional[str],
    positions_available: Optional[int],
    deadline: Optional[datetime],
    status_str: Optional[str],
    community_id: Optional[int],
    attachment: Optional[UploadFile],
    clear_attachment: bool = False,
) -> dict:
    collab = db.query(Collaboration).filter(Collaboration.collaboration_id == collaboration_id).first()
    if not collab:
        raise HTTPException(status_code=404, detail={"message": "Collaboration opportunity not found"})
    if collab.created_by != current_user.user_id:
        raise HTTPException(status_code=403, detail={"message": "You are not authorized to update this opportunity"})

    if title is not None:
        if not title.strip():
            raise HTTPException(status_code=400, detail={"message": "Title cannot be empty"})
        collab.title = title.strip()
    if description is not None:
        if not description.strip():
            raise HTTPException(status_code=400, detail={"message": "Description cannot be empty"})
        collab.description = description.strip()
    if category is not None: collab.category = category
    if required_skills is not None: collab.required_skills = required_skills
    if positions_available is not None:
        if positions_available <= 0:
            raise HTTPException(status_code=400, detail={"message": "Positions available must be greater than 0"})
        collab.positions_available = positions_available
    if deadline is not None:
        if deadline <= datetime.now():
            raise HTTPException(status_code=400, detail={"message": "Deadline must be a future date"})
        collab.deadline = deadline
    if status_str is not None:
        collab.status = CollaborationStatus(status_str)
    if community_id is not None:
        collab.community_id = community_id

    if clear_attachment:
        collab.attachment_path = None
    elif attachment:
        validate_attachment(attachment)
        collab.attachment_path = save_uploaded_file(attachment, "collaborations")

    db.commit()
    db.refresh(collab)
    return _build_collaboration_response(collab, current_user, db)


def delete_collaboration(db: Session, collaboration_id: int, current_user: User) -> dict:
    collab = db.query(Collaboration).filter(Collaboration.collaboration_id == collaboration_id).first()
    if not collab:
        raise HTTPException(status_code=404, detail={"message": "Collaboration opportunity not found"})
    if collab.created_by != current_user.user_id:
        raise HTTPException(status_code=403, detail={"message": "You are not authorized to delete this opportunity"})

    db.delete(collab)
    db.commit()
    return {"message": "Collaboration opportunity deleted successfully"}


# ── Application Service ──────────────────────────────────────────────────────

def apply_for_opportunity(
    db: Session,
    collaboration_id: int,
    current_user: User,
    application_message: Optional[str],
    resume: Optional[UploadFile],
) -> dict:
    collab = db.query(Collaboration).filter(Collaboration.collaboration_id == collaboration_id).first()
    if not collab:
        raise HTTPException(status_code=404, detail={"message": "Collaboration opportunity not found"})

    if collab.status != CollaborationStatus.open:
        raise HTTPException(status_code=400, detail={"message": "Opportunity is not open for applications"})
    if collab.deadline and collab.deadline <= datetime.now():
        raise HTTPException(status_code=400, detail={"message": "Deadline has passed"})
    if collab.created_by == current_user.user_id:
        raise HTTPException(status_code=400, detail={"message": "You cannot apply to your own opportunity"})

    # Check duplicate application
    existing = db.query(Application).filter(
        Application.collaboration_id == collaboration_id,
        Application.applicant_id == current_user.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail={"message": "You have already applied to this opportunity"})

    resume_path = None
    if resume:
        validate_resume(resume)
        resume_path = save_uploaded_file(resume, "resumes")

    app = Application(
        collaboration_id=collaboration_id,
        applicant_id=current_user.user_id,
        application_message=application_message,
        resume_path=resume_path,
        status=ApplicationStatus.pending,
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    from app.services.analytics_service import log_user_activity
    log_user_activity(db, current_user.user_id, "collaboration_applied", collab.collaboration_id)

    from app.services.notification_service import create_notification
    from app.models.notification import NotificationType, ReferenceType
    create_notification(
        db=db,
        receiver_id=collab.created_by,
        notification_type=NotificationType.application_received,
        title="New Collaboration Application",
        message=f"{current_user.name} applied to your posting: {collab.title}.",
        sender_id=current_user.user_id,
        reference_type=ReferenceType.collaboration,
        reference_id=collab.collaboration_id,
    )

    return {"message": "Application submitted successfully"}



def view_applications(db: Session, collaboration_id: int, current_user: User) -> List[dict]:
    collab = db.query(Collaboration).filter(Collaboration.collaboration_id == collaboration_id).first()
    if not collab:
        raise HTTPException(status_code=404, detail={"message": "Collaboration opportunity not found"})
    if collab.created_by != current_user.user_id:
        raise HTTPException(status_code=403, detail={"message": "You are not authorized to view applications"})

    apps = db.query(Application).filter(Application.collaboration_id == collaboration_id).all()
    return [_build_application_response(a, db) for a in apps]


def accept_application(db: Session, application_id: int, current_user: User) -> dict:
    app = db.query(Application).filter(Application.application_id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail={"message": "Application not found"})
        
    if app.collaboration.created_by != current_user.user_id:
        raise HTTPException(status_code=403, detail={"message": "You are not authorized to accept this application"})

    app.status = ApplicationStatus.accepted
    db.commit()

    from app.services.notification_service import create_notification
    from app.models.notification import NotificationType, ReferenceType
    create_notification(
        db=db,
        receiver_id=app.applicant_id,
        notification_type=NotificationType.application_accepted,
        title="Application Accepted",
        message=f"Your application for {app.collaboration.title} has been accepted!",
        sender_id=current_user.user_id,
        reference_type=ReferenceType.collaboration,
        reference_id=app.collaboration_id,
    )

    return {"message": "Application accepted"}


def reject_application(db: Session, application_id: int, current_user: User) -> dict:
    app = db.query(Application).filter(Application.application_id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail={"message": "Application not found"})

    if app.collaboration.created_by != current_user.user_id:
        raise HTTPException(status_code=403, detail={"message": "You are not authorized to reject this application"})

    app.status = ApplicationStatus.rejected
    db.commit()

    from app.services.notification_service import create_notification
    from app.models.notification import NotificationType, ReferenceType
    create_notification(
        db=db,
        receiver_id=app.applicant_id,
        notification_type=NotificationType.application_rejected,
        title="Application Status Update",
        message=f"Your application for {app.collaboration.title} was not selected.",
        sender_id=current_user.user_id,
        reference_type=ReferenceType.collaboration,
        reference_id=app.collaboration_id,
    )

    return {"message": "Application rejected"}


def get_my_applications(db: Session, current_user: User) -> List[dict]:
    apps = db.query(Application).filter(Application.applicant_id == current_user.user_id).all()
    res = []
    for a in apps:
        res.append({
            "application_id": a.application_id,
            "collaboration_id": a.collaboration_id,
            "application_message": a.application_message,
            "resume_path": a.resume_path,
            "status": a.status.value,
            "applied_at": a.applied_at,
            "collaboration": _build_collaboration_response(a.collaboration, current_user, db)
        })
    return res


def get_my_collaborations(db: Session, current_user: User) -> List[dict]:
    collaborations = db.query(Collaboration).filter(Collaboration.created_by == current_user.user_id).all()
    return [_build_collaboration_response(c, current_user, db) for c in collaborations]
