from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.auth.jwt_handler import get_current_user
from app.schemas.moderation import ReportCreate
from app.services import moderation_service

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.post("", status_code=status.HTTP_201_CREATED)
def submit_report(
    payload: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits a profile-level report on a user.
    Enforces uniqueness per reporter & target user profile.
    """
    return moderation_service.submit_report(db, reporter_id=current_user.user_id, payload=payload)


@router.post("/report-and-block", status_code=status.HTTP_201_CREATED)
def report_and_block_user(
    payload: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Atomically submits a profile report and blocks the target user.
    Executed in a single database transaction.
    """
    return moderation_service.report_and_block_user(db, reporter_id=current_user.user_id, payload=payload)
