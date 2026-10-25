from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.auth.jwt_handler import get_current_user
from app.services import block_service

router = APIRouter(prefix="/api/users", tags=["User Blocking"])


@router.post("/{user_id}/block")
def block_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Blocks a user profile.
    Prevents interaction requests and direct messages.
    """
    return block_service.block_user(db, blocker_id=current_user.user_id, blocked_id=user_id)


@router.post("/{user_id}/unblock")
def unblock_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Unblocks a previously blocked user profile.
    Does not change user account status.
    """
    return block_service.unblock_user(db, blocker_id=current_user.user_id, blocked_id=user_id)


@router.get("/{user_id}/block-status")
def check_block_status(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Checks if the authenticated user has blocked user_id.
    """
    return block_service.get_block_status(db, blocker_id=current_user.user_id, target_user_id=user_id)
