from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, File, UploadFile, Form, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.auth.jwt_handler import get_current_user
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.collaboration import CollaborationResponse, ApplicationResponse, MyApplicationResponse
from app.services import collaboration_service

router = APIRouter(prefix="/api/collaborations", tags=["Collaborations"])
app_router = APIRouter(prefix="/api/applications", tags=["Applications"])


# ── Collaborations Endpoints ──────────────────────────────────────────────────

@router.post("", response_model=CollaborationResponse, status_code=201)
async def create_collaboration(
    title: str = Form(...),
    description: str = Form(...),
    category: Optional[str] = Form(None),
    required_skills: Optional[str] = Form(None),
    positions_available: int = Form(1),
    deadline: str = Form(...),  # parse string manually to handle naive datetime cleanly
    community_id: Optional[int] = Form(None),
    attachment: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        parsed_deadline = datetime.fromisoformat(deadline)
    except ValueError:
        raise HTTPException(status_code=400, detail={"message": "Invalid deadline format. Use YYYY-MM-DDTHH:MM"})

    return collaboration_service.create_collaboration(
        db, current_user, title, description, category, required_skills,
        positions_available, parsed_deadline, community_id, attachment
    )


@router.get("/my", response_model=List[CollaborationResponse])
def get_my_collaborations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return collaboration_service.get_my_collaborations(db, current_user)


@router.get("/search", response_model=List[CollaborationResponse])
def search_collaborations(
    title: Optional[str] = Query(None),
    skill: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return collaboration_service.search_collaborations(db, current_user, title, skill, category)


@router.get("", response_model=List[CollaborationResponse])
def list_collaborations(
    category: Optional[str] = Query(None),
    skill: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    community_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return collaboration_service.list_collaborations(db, current_user, category, skill, status, community_id)


@router.get("/{collaboration_id}", response_model=CollaborationResponse)
def get_collaboration_details(
    collaboration_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return collaboration_service.get_collaboration_details(db, collaboration_id, current_user)


@router.put("/{collaboration_id}", response_model=CollaborationResponse)
async def update_collaboration(
    collaboration_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    required_skills: Optional[str] = Form(None),
    positions_available: Optional[int] = Form(None),
    deadline: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    community_id: Optional[int] = Form(None),
    attachment: Optional[UploadFile] = File(None),
    clear_attachment: Optional[bool] = Form(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    parsed_deadline = None
    if deadline:
        try:
            parsed_deadline = datetime.fromisoformat(deadline)
        except ValueError:
            raise HTTPException(status_code=400, detail={"message": "Invalid deadline format"})

    return collaboration_service.update_collaboration(
        db, collaboration_id, current_user, title, description, category,
        required_skills, positions_available, parsed_deadline, status,
        community_id, attachment, clear_attachment
    )


@router.delete("/{collaboration_id}", response_model=MessageResponse)
def delete_collaboration(
    collaboration_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return collaboration_service.delete_collaboration(db, collaboration_id, current_user)


# ── Applications Endpoints ────────────────────────────────────────────────────

@router.post("/{collaboration_id}/apply", response_model=MessageResponse)
async def apply_for_opportunity(
    collaboration_id: int,
    application_message: Optional[str] = Form(None),
    resume: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return collaboration_service.apply_for_opportunity(
        db, collaboration_id, current_user, application_message, resume
    )


@router.get("/{collaboration_id}/applications", response_model=List[ApplicationResponse])
def view_applications(
    collaboration_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return collaboration_service.view_applications(db, collaboration_id, current_user)


@app_router.get("/my", response_model=List[MyApplicationResponse])
def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return collaboration_service.get_my_applications(db, current_user)


@app_router.post("/{application_id}/accept", response_model=MessageResponse)
def accept_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return collaboration_service.accept_application(db, application_id, current_user)


@app_router.post("/{application_id}/reject", response_model=MessageResponse)
def reject_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return collaboration_service.reject_application(db, application_id, current_user)
