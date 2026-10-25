"""
block_service.py
────────────────────────────────────────────────────────────────────────────────
Handles User Blocking System logic (block, unblock, block status, interaction checks).
────────────────────────────────────────────────────────────────────────────────
"""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.models.user import User
from app.models.block import UserBlock


def block_user(db: Session, blocker_id: int, blocked_id: int) -> dict:
    """Blocks target user for blocker_id. Prevents self-blocking and duplicate blocks."""
    if blocker_id == blocked_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "You cannot block yourself."}
        )

    target_user = db.query(User).filter(User.user_id == blocked_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Target user not found."}
        )

    existing_block = db.query(UserBlock).filter(
        UserBlock.blocker_user_id == blocker_id,
        UserBlock.blocked_user_id == blocked_id
    ).first()

    if not existing_block:
        block = UserBlock(
            blocker_user_id=blocker_id,
            blocked_user_id=blocked_id
        )
        db.add(block)
        db.commit()

    return {
        "message": "User blocked successfully.",
        "blocker_user_id": blocker_id,
        "blocked_user_id": blocked_id,
        "is_blocked": True
    }


def unblock_user(db: Session, blocker_id: int, blocked_id: int) -> dict:
    """Removes user block relationship owned by blocker_id."""
    existing_block = db.query(UserBlock).filter(
        UserBlock.blocker_user_id == blocker_id,
        UserBlock.blocked_user_id == blocked_id
    ).first()

    if existing_block:
        db.delete(existing_block)
        db.commit()

    return {
        "message": "User unblocked successfully.",
        "blocker_user_id": blocker_id,
        "blocked_user_id": blocked_id,
        "is_blocked": False
    }


def get_block_status(db: Session, blocker_id: int, target_user_id: int) -> dict:
    """Returns whether blocker_id currently blocks target_user_id."""
    is_blocked = db.query(UserBlock).filter(
        UserBlock.blocker_user_id == blocker_id,
        UserBlock.blocked_user_id == target_user_id
    ).first() is not None

    return {
        "blocker_user_id": blocker_id,
        "target_user_id": target_user_id,
        "is_blocked": is_blocked
    }


def is_interaction_blocked(db: Session, user_a: int, user_b: int) -> bool:
    """Returns True if user_a blocked user_b OR user_b blocked user_a."""
    if not user_a or not user_b or user_a == user_b:
        return False

    return db.query(UserBlock).filter(
        or_(
            and_(UserBlock.blocker_user_id == user_a, UserBlock.blocked_user_id == user_b),
            and_(UserBlock.blocker_user_id == user_b, UserBlock.blocked_user_id == user_a)
        )
    ).first() is not None
