from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.database import get_db
from app.models.user import User
from app.auth.jwt_handler import get_current_user
from app.schemas.notice import NoticeCreateRequest, NoticeResponse
from app.services import notice_service

router = APIRouter(prefix="/api/notices", tags=["Official Notices"])


def require_verified_faculty(current_user: User = Depends(get_current_user)) -> User:
    """Guard: only verified faculty members may manage official notices."""
    if current_user.role not in ("faculty", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Only faculty members can manage official notices."},
        )
    if not getattr(current_user, "is_verified", False) and current_user.role == "faculty":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Your faculty account is awaiting admin approval."},
        )
    return current_user


@router.post("/", response_model=NoticeResponse, status_code=201)
def create_notice(
    payload: NoticeCreateRequest,
    current_user: User = Depends(require_verified_faculty),
    db: Session = Depends(get_db),
):
    """Create an official notice (verified faculty only)."""
    notice = notice_service.create_notice(db, current_user, payload)
    return notice_service.get_notice_by_id(db, notice.notice_id)


@router.get("/my", response_model=List[NoticeResponse])
def get_my_notices(
    current_user: User = Depends(require_verified_faculty),
    db: Session = Depends(get_db),
):
    """Get notices created by the current verified faculty member."""
    return notice_service.get_my_notices(db, current_user.user_id)


@router.get("/received", response_model=List[NoticeResponse])
def get_received_notices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get notices received by the current user."""
    return notice_service.get_received_notices(db, current_user.user_id)


@router.get("/teachers", response_model=List[dict])
def get_teacher_directory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all verified teachers (teacher directory)."""
    return notice_service.get_all_teachers(db)


@router.get("/{notice_id}", response_model=NoticeResponse)
def get_notice(
    notice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific notice by ID."""
    return notice_service.get_notice_by_id(db, notice_id)


@router.get("/teacher/{teacher_id}", response_model=List[NoticeResponse])
def get_teacher_notices(
    teacher_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all notices created by a specific teacher."""
    return notice_service.get_my_notices(db, teacher_id)
