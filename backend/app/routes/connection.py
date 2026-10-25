from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.auth.jwt_handler import get_current_user
from app.models.user import User
from app.schemas.connection import (
    ConnectionOut, ConnectionRequestOut, SentRequestOut,
    SuggestedUserOut, ConnectionStatusOut, MutualConnectionsOut,
    ConnectionCountOut, MessageResponse, UserSearchOut, SendRequestBody,
)
from app.services import connection_service

router = APIRouter(prefix="/api/connections", tags=["Connections"])
users_router = APIRouter(prefix="/api/users", tags=["User Search"])
network_router = APIRouter(prefix="/api/network", tags=["Network Summary"])


@network_router.get("/summary", response_model=dict)
def get_network_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get count totals for all network tab views."""
    return connection_service.get_network_summary(current_user, db)


@router.post("/request", response_model=dict, status_code=201)
def send_connection_request(
    payload: SendRequestBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a connection request to another user."""
    return connection_service.send_request(current_user, payload.receiver_id, db)


@router.put("/request/{request_id}/accept", response_model=dict)
def accept_connection_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Accept an incoming connection request."""
    return connection_service.accept_request(current_user, request_id, db)


@router.put("/request/{request_id}/reject", response_model=dict)
def reject_connection_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reject an incoming connection request."""
    return connection_service.reject_request(current_user, request_id, db)


@router.delete("/request/{request_id}", response_model=dict)
def withdraw_connection_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Withdraw an outgoing pending connection request."""
    return connection_service.withdraw_request(current_user, request_id, db)


@router.delete("/{user_id}", response_model=dict)
def remove_connection(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove an existing connection."""
    return connection_service.remove_connection(current_user, user_id, db)


@router.get("", response_model=List[dict])
def get_my_connections(
    search: Optional[str] = Query(None),
    page:   int           = Query(1, ge=1),
    limit:  int           = Query(20, ge=1, le=100),
    sort:   str           = Query("newest"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's connections (paginated, searchable, sortable)."""
    return connection_service.get_connections(current_user, db, search, page, limit, sort)


@router.get("/pending", response_model=List[dict])
def get_pending_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get incoming pending connection requests."""
    return connection_service.get_pending_requests(current_user, db)


@router.get("/sent", response_model=List[dict])
def get_sent_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get outgoing pending connection requests."""
    return connection_service.get_sent_requests(current_user, db)


@router.get("/suggestions", response_model=List[dict])
def get_suggestions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get suggested connections (rule-based, AI-replaceable)."""
    return connection_service.get_suggestions(current_user, db)


@router.get("/mutual/{user_id}", response_model=MutualConnectionsOut)
def get_mutual_connections(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get count of mutual connections with a user."""
    return connection_service.get_mutual_count(current_user, user_id, db)


@router.get("/status/{user_id}", response_model=ConnectionStatusOut)
def get_connection_status(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get connection status between current user and target user."""
    return connection_service.get_connection_status(current_user, user_id, db)


@router.get("/count/{user_id}", response_model=ConnectionCountOut)
def get_connection_count(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get total connection count for a user."""
    return connection_service.get_connection_count(user_id, db)


# ── Preserved: /api/users/search (used by messaging and other modules) ─────────

@users_router.get("/search", response_model=List[UserSearchOut])
def search_users(
    name:       Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    skill:      Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search users by name, department, or skill. Returns connection_status for each."""
    return connection_service.search_users(current_user, name, department, skill, db)
