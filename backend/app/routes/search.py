from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.database import get_db
from app.models.user import User
from app.auth.jwt_handler import get_current_user
from app.schemas.search import (
    SearchHistoryResponse,
    UserSearchResponse,
    SkillSearchResponse,
    PostSearchResponse,
    CommunitySearchResponse,
    EventSearchResponse,
    CollaborationSearchResponse,
    GlobalSearchResponse,
    TrendingResponse,
)
from app.services import search_service

router = APIRouter(prefix="/api/search", tags=["Search & Discovery"])


@router.get("", response_model=GlobalSearchResponse)
def global_search(
    q: str = Query("", description="Search term"),
    suggest: bool = Query(False, description="Whether this is a preview suggestion"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Global search across all resource categories."""
    clean_q = q.strip()
    if clean_q and not suggest:
        search_service.record_search(db, current_user.user_id, clean_q)
    return search_service.search_all_overview(db, clean_q, current_user)


@router.get("/users", response_model=List[UserSearchResponse])
def search_users_endpoint(
    q: str = Query("", description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    role: Optional[str] = Query(None, description="Filter by User role"),
    sort_by: Optional[str] = Query(None, description="Sort by 'name' or 'followers'"),
    order: str = Query("asc", description="Sort order 'asc' or 'desc'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search users by name or skills."""
    clean_q = q.strip()
    if clean_q:
        search_service.record_search(db, current_user.user_id, clean_q)
    return search_service.search_users(
        db, clean_q, page=page, limit=limit, role=role, sort_by=sort_by, order=order
    )


@router.get("/skills", response_model=List[SkillSearchResponse])
def search_skills_endpoint(
    q: str = Query("", description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search master skills catalog."""
    clean_q = q.strip()
    if clean_q:
        search_service.record_search(db, current_user.user_id, clean_q)
    return search_service.search_skills(db, clean_q, page=page, limit=limit)


@router.get("/posts", response_model=List[PostSearchResponse])
def search_posts_endpoint(
    q: str = Query("", description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    sort_by: Optional[str] = Query(None, description="Sort by 'likes' or date"),
    order: str = Query("desc", description="Sort order 'asc' or 'desc'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search posts content. Matches posts based on feed visibility policies."""
    clean_q = q.strip()
    if clean_q:
        search_service.record_search(db, current_user.user_id, clean_q)
    return search_service.search_posts(
        db, clean_q, current_user, page=page, limit=limit, sort_by=sort_by, order=order
    )


@router.get("/communities", response_model=List[CommunitySearchResponse])
def search_communities_endpoint(
    q: str = Query("", description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    category: Optional[str] = Query(None, description="Filter by community category"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search communities by name or description."""
    clean_q = q.strip()
    if clean_q:
        search_service.record_search(db, current_user.user_id, clean_q)
    return search_service.search_communities(
        db, clean_q, page=page, limit=limit, category=category
    )


@router.get("/events", response_model=List[EventSearchResponse])
def search_events_endpoint(
    q: str = Query("", description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    category: Optional[str] = Query(None, description="Filter by event category"),
    status: Optional[str] = Query(None, description="Filter by status 'upcoming', 'ongoing', 'completed', 'cancelled'"),
    sort_by: Optional[str] = Query(None, description="Sort by 'registrations' or date"),
    order: str = Query("asc", description="Sort order 'asc' or 'desc'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search events by title, description or category."""
    clean_q = q.strip()
    if clean_q:
        search_service.record_search(db, current_user.user_id, clean_q)
    return search_service.search_events(
        db, clean_q, page=page, limit=limit, category=category, status=status, sort_by=sort_by, order=order
    )


@router.get("/collaborations", response_model=List[CollaborationSearchResponse])
def search_collaborations_endpoint(
    q: str = Query("", description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status 'open', 'closed', 'completed'"),
    sort_by: Optional[str] = Query(None, description="Sort by 'deadline' or date"),
    order: str = Query("asc", description="Sort order 'asc' or 'desc'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search collaboration postings by title, description or required skills."""
    clean_q = q.strip()
    if clean_q:
        search_service.record_search(db, current_user.user_id, clean_q)
    return search_service.search_collaborations(
        db, clean_q, page=page, limit=limit, status=status, sort_by=sort_by, order=order
    )


@router.get("/trending", response_model=TrendingResponse)
def get_trending_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches real-time trending statistics."""
    return search_service.get_trending(db)


@router.get("/recent", response_model=List[SearchHistoryResponse])
def get_recent_searches_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gets recent search history of current user."""
    return search_service.get_recent_searches(db, current_user.user_id)


@router.delete("/recent", status_code=status.HTTP_200_OK)
def clear_recent_searches_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clears search history of current user."""
    search_service.clear_recent_searches(db, current_user.user_id)
    return {"message": "Search history cleared"}
