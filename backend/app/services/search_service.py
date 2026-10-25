from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from typing import List, Optional
from datetime import datetime

from app.models.user import User
from app.models.profile import Profile, Skill, UserSkill
from app.models.connection import Connection
from app.models.post import Post, Like, Comment
from app.models.community import Community, CommunityMember
from app.models.event import Event, EventRegistration, RegistrationStatus
from app.models.collaboration import Collaboration, Application
from app.models.search import SearchHistory


# ── Search History Service helpers ──────────────────────────────────────────

def record_search(db: Session, user_id: int, query: str):
    """Logs the user search query. Enforces uniqueness and a limit of 10 items."""
    clean_q = query.strip()
    if not clean_q:
        return

    # Delete existing occurrences of the same query for this user to prioritize the recent one
    db.query(SearchHistory).filter(
        SearchHistory.user_id == user_id,
        SearchHistory.search_query == clean_q
    ).delete()
    db.commit()

    # Add new history record
    new_entry = SearchHistory(user_id=user_id, search_query=clean_q)
    db.add(new_entry)
    db.commit()

    # Capped at 10 items
    hist = (
        db.query(SearchHistory)
        .filter(SearchHistory.user_id == user_id)
        .order_by(desc(SearchHistory.search_id))
        .all()
    )
    if len(hist) > 10:
        for entry in hist[10:]:
            db.delete(entry)
        db.commit()


def get_recent_searches(db: Session, user_id: int) -> List[SearchHistory]:
    return (
        db.query(SearchHistory)
        .filter(SearchHistory.user_id == user_id)
        .order_by(desc(SearchHistory.search_id))
        .all()
    )


def clear_recent_searches(db: Session, user_id: int):
    db.query(SearchHistory).filter(SearchHistory.user_id == user_id).delete()
    db.commit()


# ── Helper for user display headlines ──────────────────────────────────────────

def get_user_headline(user: User) -> str:
    """Computes a premium description or headline for the user."""
    profile = user.profile[0] if user.profile else None
    if profile:
        if profile.designation:
            return profile.designation
        parts = []
        if profile.year_of_study:
            parts.append(f"{profile.year_of_study} Year")
        if profile.department:
            parts.append(profile.department)
        if parts:
            return ", ".join(parts)
    
    # Defaults based on role
    if user.role == "faculty":
        return "Faculty Member"
    elif user.role == "club":
        return "Campus Club / Org"
    elif user.role == "admin":
        return "System Administrator"
    return "Student"


# ── Dynamic Trending Calculations ───────────────────────────────────────────

def get_trending(db: Session) -> dict:
    # 1. Trending Skills (most possessed by users)
    trending_skills = (
        db.query(Skill.skill_name, func.count(UserSkill.user_id).label("cnt"))
        .join(UserSkill, UserSkill.skill_id == Skill.skill_id)
        .group_by(Skill.skill_id)
        .order_by(desc("cnt"))
        .limit(5)
        .all()
    )
    skills_data = [{"skill_name": r[0], "users_count": r[1]} for r in trending_skills]

    # If empty, fall back to master list
    if not skills_data:
        master_skills = db.query(Skill).limit(5).all()
        skills_data = [{"skill_name": s.skill_name, "users_count": 0} for s in master_skills]

    # 2. Popular Communities (highest members count)
    popular_comm_query = (
        db.query(Community, func.count(CommunityMember.user_id).label("members_cnt"))
        .outerjoin(CommunityMember, CommunityMember.community_id == Community.community_id)
        .group_by(Community.community_id)
        .order_by(desc("members_cnt"))
        .limit(5)
        .all()
    )
    communities_list = []
    for c, mc in popular_comm_query:
        communities_list.append({
            "community_id": c.community_id,
            "community_name": c.community_name,
            "description": c.description,
            "logo_url": c.logo_url,
            "member_count": mc
        })

    # 3. Popular Events (highest active registrations count)
    popular_events_query = (
        db.query(Event, func.count(EventRegistration.registration_id).label("regs_cnt"))
        .outerjoin(
            EventRegistration,
            (EventRegistration.event_id == Event.event_id) & 
            (EventRegistration.registration_status == RegistrationStatus.registered)
        )
        .group_by(Event.event_id)
        .order_by(desc("regs_cnt"))
        .limit(5)
        .all()
    )
    events_list = []
    for e, rc in popular_events_query:
        events_list.append({
            "event_id": e.event_id,
            "title": e.title,
            "category": e.category,
            "start_date": e.start_datetime,
            "poster_url": e.poster_url,
            "registrations_count": rc
        })

    # 4. Popular Collaborations (highest active applications count)
    popular_collabs_query = (
        db.query(Collaboration, func.count(Application.application_id).label("apps_cnt"))
        .outerjoin(Application, Application.collaboration_id == Collaboration.collaboration_id)
        .group_by(Collaboration.collaboration_id)
        .order_by(desc("apps_cnt"))
        .limit(5)
        .all()
    )
    collaborations_list = []
    for col, ac in popular_collabs_query:
        collaborations_list.append({
            "collaboration_id": col.collaboration_id,
            "title": col.title,
            "required_skills": col.required_skills,
            "deadline": col.deadline,
            "status": col.status.value
        })

    return {
        "skills": skills_data,
        "communities": communities_list,
        "events": events_list,
        "collaborations": collaborations_list
    }


# ── Specialized Search Queries ───────────────────────────────────────────────

def search_users(
    db: Session,
    q: str,
    page: int = 1,
    limit: int = 10,
    role: Optional[str] = None,
    sort_by: Optional[str] = None,
    order: str = "asc"
) -> List[dict]:
    skip = (page - 1) * limit

    # Match user's name or skills
    user_ids_with_skill = (
        db.query(UserSkill.user_id)
        .join(Skill, Skill.skill_id == UserSkill.skill_id)
        .filter(Skill.skill_name.like(f"%{q}%"))
    )
    query = db.query(User).outerjoin(Profile, User.user_id == Profile.user_id)
    query = query.filter(or_(User.name.like(f"%{q}%"), User.user_id.in_(user_ids_with_skill)))

    # Apply filters
    if role:
        query = query.filter(User.role == role)

    # Apply Sorting
    if sort_by == "name":
        if order == "desc":
            query = query.order_by(User.name.desc())
        else:
            query = query.order_by(User.name.asc())
    elif sort_by in ("followers", "connections"):
        from sqlalchemy import union_all
        q1 = db.query(Connection.user_one.label("uid"))
        q2 = db.query(Connection.user_two.label("uid"))
        union_stmt = q1.union_all(q2).subquery()
        conn_sub = (
            db.query(union_stmt.c.uid, func.count(union_stmt.c.uid).label("cc"))
            .group_by(union_stmt.c.uid)
            .subquery()
        )
        query = query.outerjoin(conn_sub, User.user_id == conn_sub.c.uid)
        if order == "desc":
            query = query.order_by(desc(func.coalesce(conn_sub.c.cc, 0)))
        else:
            query = query.order_by(func.coalesce(conn_sub.c.cc, 0).asc())

    users = query.offset(skip).limit(limit).all()

    # Format result items
    results = []
    for u in users:
        # Get connections count
        c_count = db.query(Connection).filter(
            or_(Connection.user_one == u.user_id, Connection.user_two == u.user_id)
        ).count()
        # Get user skills
        user_skills = (
            db.query(Skill.skill_name)
            .join(UserSkill, UserSkill.skill_id == Skill.skill_id)
            .filter(UserSkill.user_id == u.user_id)
            .all()
        )
        skills_list = [s[0] for s in user_skills]

        # Fetch profile explicitly to avoid InstrumentedList errors
        profile = db.query(Profile).filter(Profile.user_id == u.user_id).first()
        results.append({
            "user_id": u.user_id,
            "name": u.name,
            "profile_picture": profile.profile_picture if profile else None,
            "headline": get_user_headline(u),
            "skills": skills_list,
            "connections_count": c_count
        })
    return results


def search_skills(db: Session, q: str, page: int = 1, limit: int = 10) -> List[dict]:
    skip = (page - 1) * limit
    query = db.query(Skill).filter(Skill.skill_name.like(f"%{q}%"))
    skills = query.offset(skip).limit(limit).all()

    results = []
    for sk in skills:
        # Compute possessors count
        u_count = db.query(UserSkill).filter(UserSkill.skill_id == sk.skill_id).count()
        # Fetch related users info (top 5 users with this skill)
        related_users_query = (
            db.query(User)
            .join(UserSkill, UserSkill.user_id == User.user_id)
            .outerjoin(Profile, Profile.user_id == User.user_id)
            .filter(UserSkill.skill_id == sk.skill_id)
            .limit(5)
            .all()
        )
        related = []
        for ru in related_users_query:
            prof = db.query(Profile).filter(Profile.user_id == ru.user_id).first()
            related.append({
                "user_id": ru.user_id,
                "name": ru.name,
                "profile_picture": prof.profile_picture if prof else None
            })

        results.append({
            "skill_name": sk.skill_name,
            "users_count": u_count,
            "related_users": related
        })
    return results


def search_posts(
    db: Session,
    q: str,
    current_user: User,
    page: int = 1,
    limit: int = 10,
    sort_by: Optional[str] = None,
    order: str = "desc"
) -> List[dict]:
    skip = (page - 1) * limit

    query = db.query(Post).filter(Post.content.like(f"%{q}%"))

    # Apply visibility filter based on user relations
    following_ids = [
        r[0] for r in db.query(Follower.following_user_id)
        .filter(Follower.follower_user_id == current_user.user_id)
        .all()
    ]
    query = query.filter(
        or_(
            Post.visibility == "public",
            Post.user_id == current_user.user_id,
            (Post.visibility == "followers") & Post.user_id.in_(following_ids)
        )
    )

    # Sort
    if sort_by == "likes":
        likes_sub = (
            db.query(Like.post_id, func.count(Like.like_id).label("lc"))
            .group_by(Like.post_id)
            .subquery()
        )
        query = query.outerjoin(likes_sub, Post.post_id == likes_sub.c.post_id)
        if order == "asc":
            query = query.order_by(func.coalesce(likes_sub.c.lc, 0).asc())
        else:
            query = query.order_by(desc(func.coalesce(likes_sub.c.lc, 0)))
    else:
        if order == "asc":
            query = query.order_by(Post.created_at.asc())
        else:
            query = query.order_by(Post.created_at.desc())

    posts = query.offset(skip).limit(limit).all()

    results = []
    for p in posts:
        # Fetch author details
        author_user = db.query(User).filter(User.user_id == p.user_id).first()
        author_profile = db.query(Profile).filter(Profile.user_id == p.user_id).first()

        author_data = {
            "user_id": p.user_id,
            "name": author_user.name if author_user else "Unknown User",
            "profile_picture": author_profile.profile_picture if author_profile else None
        }

        # Likes/Comments counts
        lc = db.query(Like).filter(Like.post_id == p.post_id).count()
        cc = db.query(Comment).filter(Comment.post_id == p.post_id).count()

        results.append({
            "post_id": p.post_id,
            "author": author_data,
            "content_preview": p.content[:200] + ("..." if len(p.content) > 200 else ""),
            "like_count": lc,
            "comment_count": cc
        })
    return results


def search_communities(
    db: Session,
    q: str,
    page: int = 1,
    limit: int = 10,
    category: Optional[str] = None
) -> List[dict]:
    skip = (page - 1) * limit
    query = db.query(Community).filter(
        or_(
            Community.community_name.like(f"%{q}%"),
            Community.description.like(f"%{q}%")
        )
    )

    if category:
        query = query.filter(Community.category == category)

    # Sort by member count desc by default
    members_sub = (
        db.query(CommunityMember.community_id, func.count(CommunityMember.user_id).label("mc"))
        .group_by(CommunityMember.community_id)
        .subquery()
    )
    query = query.outerjoin(members_sub, Community.community_id == members_sub.c.community_id).order_by(
        desc(func.coalesce(members_sub.c.mc, 0))
    )

    communities = query.offset(skip).limit(limit).all()

    results = []
    for c in communities:
        mc = db.query(CommunityMember).filter(CommunityMember.community_id == c.community_id).count()
        results.append({
            "community_id": c.community_id,
            "community_name": c.community_name,
            "description": c.description,
            "logo_url": c.logo_url,
            "member_count": mc
        })
    return results


def search_events(
    db: Session,
    q: str,
    page: int = 1,
    limit: int = 10,
    category: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: Optional[str] = None,
    order: str = "asc"
) -> List[dict]:
    skip = (page - 1) * limit
    query = db.query(Event).filter(
        or_(
            Event.title.like(f"%{q}%"),
            Event.description.like(f"%{q}%"),
            Event.category.like(f"%{q}%")
        )
    )

    if category:
        query = query.filter(Event.category == category)
    if status:
        query = query.filter(Event.status == status)

    # Sort
    if sort_by == "registrations":
        reg_sub = (
            db.query(EventRegistration.event_id, func.count(EventRegistration.registration_id).label("rc"))
            .filter(EventRegistration.registration_status == RegistrationStatus.registered)
            .group_by(EventRegistration.event_id)
            .subquery()
        )
        query = query.outerjoin(reg_sub, Event.event_id == reg_sub.c.event_id)
        if order == "desc":
            query = query.order_by(desc(func.coalesce(reg_sub.c.rc, 0)))
        else:
            query = query.order_by(func.coalesce(reg_sub.c.rc, 0).asc())
    else:
        if order == "desc":
            query = query.order_by(Event.start_datetime.desc())
        else:
            query = query.order_by(Event.start_datetime.asc())

    events = query.offset(skip).limit(limit).all()

    results = []
    for e in events:
        rc = db.query(EventRegistration).filter(
            EventRegistration.event_id == e.event_id,
            EventRegistration.registration_status == RegistrationStatus.registered
        ).count()

        results.append({
            "event_id": e.event_id,
            "title": e.title,
            "category": e.category,
            "start_date": e.start_datetime,
            "poster_url": e.poster_url,
            "registrations_count": rc
        })
    return results


def search_collaborations(
    db: Session,
    q: str,
    page: int = 1,
    limit: int = 10,
    status: Optional[str] = None,
    sort_by: Optional[str] = None,
    order: str = "asc"
) -> List[dict]:
    skip = (page - 1) * limit
    query = db.query(Collaboration).filter(
        or_(
            Collaboration.title.like(f"%{q}%"),
            Collaboration.description.like(f"%{q}%"),
            Collaboration.required_skills.like(f"%{q}%")
        )
    )

    if status:
        query = query.filter(Collaboration.status == status)

    # Sort
    if sort_by == "deadline":
        if order == "desc":
            query = query.order_by(Collaboration.deadline.desc())
        else:
            query = query.order_by(Collaboration.deadline.asc())
    else:
        if order == "desc":
            query = query.order_by(Collaboration.created_at.desc())
        else:
            query = query.order_by(Collaboration.created_at.asc())

    collaborations = query.offset(skip).limit(limit).all()

    results = []
    for col in collaborations:
        results.append({
            "collaboration_id": col.collaboration_id,
            "title": col.title,
            "required_skills": col.required_skills,
            "deadline": col.deadline,
            "status": col.status.value
        })
    return results


def search_all_overview(db: Session, q: str, current_user: User) -> dict:
    """Returns top 5 matching items from each category as a global preview."""
    users = search_users(db, q, page=1, limit=5)
    skills = search_skills(db, q, page=1, limit=5)
    posts = search_posts(db, q, current_user, page=1, limit=5)
    communities = search_communities(db, q, page=1, limit=5)
    events = search_events(db, q, page=1, limit=5)
    collaborations = search_collaborations(db, q, page=1, limit=5)

    return {
        "users": users,
        "skills": skills,
        "posts": posts,
        "communities": communities,
        "events": events,
        "collaborations": collaborations
    }
