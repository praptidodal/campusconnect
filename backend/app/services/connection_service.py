from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.utils.exceptions import ConnectionAPIError
from sqlalchemy import or_, and_

from app.models.user import User
from app.models.profile import Profile, Skill, UserSkill
from app.models.community import CommunityMember
from app.models.connection import ConnectionRequest, Connection, RequestStatus


# ── Helpers ───────────────────────────────────────────────────────────────────

def _norm(a: int, b: int) -> Tuple[int, int]:
    """Always return (smaller_id, larger_id) for connections table."""
    return (min(a, b), max(a, b))


def _top_skills(user_id: int, db: Session, limit: int = 3) -> List[str]:
    rows = (
        db.query(Skill.skill_name)
        .join(UserSkill, UserSkill.skill_id == Skill.skill_id)
        .filter(UserSkill.user_id == user_id)
        .order_by(Skill.skill_name)
        .limit(limit)
        .all()
    )
    return [r.skill_name for r in rows]


def are_connected(user_a: int, user_b: int, db: Session) -> bool:
    """Return True if a Connection row exists between the two users."""
    lo, hi = _norm(user_a, user_b)
    return db.query(Connection).filter(
        Connection.user_one == lo,
        Connection.user_two == hi,
    ).first() is not None


def get_connection_status(current_user: User, target_user_id: int, db: Session) -> dict:
    """Return the connection relationship from current_user's perspective."""
    if current_user.user_id == target_user_id:
        return {"status": "self", "request_id": None, "connection_id": None}

    # Check connected
    lo, hi = _norm(current_user.user_id, target_user_id)
    conn = db.query(Connection).filter(
        Connection.user_one == lo, Connection.user_two == hi
    ).first()
    if conn:
        return {"status": "connected", "request_id": None, "connection_id": conn.connection_id}

    # Check pending sent by current_user
    sent = db.query(ConnectionRequest).filter(
        ConnectionRequest.sender_id   == current_user.user_id,
        ConnectionRequest.receiver_id == target_user_id,
        ConnectionRequest.status      == RequestStatus.pending,
    ).first()
    if sent:
        return {"status": "pending_sent", "request_id": sent.request_id, "connection_id": None}

    # Check pending received by current_user
    received = db.query(ConnectionRequest).filter(
        ConnectionRequest.sender_id   == target_user_id,
        ConnectionRequest.receiver_id == current_user.user_id,
        ConnectionRequest.status      == RequestStatus.pending,
    ).first()
    if received:
        return {"status": "pending_received", "request_id": received.request_id, "connection_id": None}

    return {"status": "none", "request_id": None, "connection_id": None}


def get_connection_count(user_id: int, db: Session) -> dict:
    count = db.query(Connection).filter(
        or_(Connection.user_one == user_id, Connection.user_two == user_id)
    ).count()
    return {"connection_count": count}


def get_mutual_count(current_user: User, target_user_id: int, db: Session) -> dict:
    """Count and retrieve users connected to BOTH current_user and target."""
    def connected_ids(uid: int) -> set:
        rows = db.query(Connection).filter(
            or_(Connection.user_one == uid, Connection.user_two == uid)
        ).all()
        result = set()
        for c in rows:
            other = c.user_two if c.user_one == uid else c.user_one
            result.add(other)
        return result

    my_ids     = connected_ids(current_user.user_id)
    target_ids = connected_ids(target_user_id)
    mutual_set = my_ids & target_ids

    mutual_users = []
    if mutual_set:
        users = (
            db.query(User, Profile)
            .outerjoin(Profile, Profile.user_id == User.user_id)
            .filter(User.user_id.in_(mutual_set))
            .all()
        )
        for u, p in users:
            mutual_users.append({
                "user_id": u.user_id,
                "name": u.name,
                "role": u.role,
                "profile_picture": p.profile_picture if p else None,
                "department": p.department if p else None,
                "is_verified": u.is_verified,
            })

    return {
        "mutual_count": len(mutual_set),
        "mutual_users": mutual_users,
    }



def _mutual_count_for(user_a: int, user_b: int, db: Session) -> int:
    """Internal helper — count mutual connections between two user IDs."""
    def connected_ids(uid: int) -> set:
        rows = db.query(Connection).filter(
            or_(Connection.user_one == uid, Connection.user_two == uid)
        ).all()
        result = set()
        for c in rows:
            other = c.user_two if c.user_one == uid else c.user_one
            result.add(other)
        return result
    return len(connected_ids(user_a) & connected_ids(user_b))


# ── Send / Accept / Reject / Withdraw / Remove ────────────────────────────────

def send_request(current_user: User, receiver_id: int, db: Session) -> dict:
    if current_user.user_id == receiver_id:
        raise ConnectionAPIError(400, "Cannot connect to self")

    target = db.query(User).filter(User.user_id == receiver_id).first()
    if not target:
        raise ConnectionAPIError(404, "User not found")

    # Already connected?
    if are_connected(current_user.user_id, receiver_id, db):
        raise ConnectionAPIError(400, "Already connected")

    # Existing pending request in either direction?
    existing = db.query(ConnectionRequest).filter(
        or_(
            and_(ConnectionRequest.sender_id == current_user.user_id,
                 ConnectionRequest.receiver_id == receiver_id),
            and_(ConnectionRequest.sender_id == receiver_id,
                 ConnectionRequest.receiver_id == current_user.user_id),
        ),
        ConnectionRequest.status == RequestStatus.pending,
    ).first()
    if existing:
        raise ConnectionAPIError(400, "Request already pending")

    req = ConnectionRequest(
        sender_id=current_user.user_id,
        receiver_id=receiver_id,
        status=RequestStatus.pending,
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Fire notification
    from app.services.notification_service import create_notification
    create_notification(
        db=db,
        receiver_id=receiver_id,
        notification_type="connection_request",
        title="New Connection Request",
        message=f"{current_user.name} wants to connect with you.",
        sender_id=current_user.user_id,
        reference_type="connection",
        reference_id=req.request_id,
    )

    return {"success": True, "status": "pending", "request_id": req.request_id}


def accept_request(current_user: User, request_id: int, db: Session) -> dict:
    req = db.query(ConnectionRequest).filter(ConnectionRequest.request_id == request_id).first()
    if not req:
        raise ConnectionAPIError(404, "Connection request not found.")
    if req.receiver_id != current_user.user_id:
        raise ConnectionAPIError(403, "You are not the receiver of this connection request.")
    if req.status != RequestStatus.pending:
        raise ConnectionAPIError(400, f"Connection request is already {req.status.value}.")

    sender_id = req.sender_id

    # Delete the request row
    db.delete(req)
    # Delete associated notifications
    from app.models.notification import Notification
    db.query(Notification).filter(
        Notification.notification_type == "connection_request",
        Notification.reference_id == request_id
    ).delete(synchronize_session=False)
    db.flush()

    # Create mutual connection
    lo, hi = _norm(current_user.user_id, sender_id)
    conn = Connection(user_one=lo, user_two=hi)
    db.add(conn)
    db.commit()
    db.refresh(conn)

    # Notify the original sender
    from app.services.notification_service import create_notification
    create_notification(
        db=db,
        receiver_id=sender_id,
        notification_type="connection_accepted",
        title="Connection Accepted",
        message=f"{current_user.name} accepted your connection request.",
        sender_id=current_user.user_id,
        reference_type="connection",
        reference_id=conn.connection_id,
    )

    return {"success": True, "status": "connected", "connection_id": conn.connection_id}


def reject_request(current_user: User, request_id: int, db: Session) -> dict:
    req = db.query(ConnectionRequest).filter(ConnectionRequest.request_id == request_id).first()
    if not req:
        raise ConnectionAPIError(404, "Connection request not found.")
    if req.receiver_id != current_user.user_id:
        raise ConnectionAPIError(403, "You are not the receiver of this connection request.")
    if req.status != RequestStatus.pending:
        raise ConnectionAPIError(400, f"Connection request is already {req.status.value}.")
    db.delete(req)
    # Delete associated notifications
    from app.models.notification import Notification
    db.query(Notification).filter(
        Notification.notification_type == "connection_request",
        Notification.reference_id == request_id
    ).delete(synchronize_session=False)
    db.commit()
    return {"success": True, "status": "none"}


def withdraw_request(current_user: User, request_id: int, db: Session) -> dict:
    req = db.query(ConnectionRequest).filter(
        ConnectionRequest.request_id == request_id,
        ConnectionRequest.sender_id  == current_user.user_id,
        ConnectionRequest.status     == RequestStatus.pending,
    ).first()
    if not req:
        raise ConnectionAPIError(404, "Request not found")
    db.delete(req)
    # Delete associated notifications
    from app.models.notification import Notification
    db.query(Notification).filter(
        Notification.notification_type == "connection_request",
        Notification.reference_id == request_id
    ).delete(synchronize_session=False)
    db.commit()
    return {"success": True, "status": "none"}


def remove_connection(current_user: User, target_user_id: int, db: Session) -> dict:
    lo, hi = _norm(current_user.user_id, target_user_id)
    conn = db.query(Connection).filter(
        Connection.user_one == lo, Connection.user_two == hi
    ).first()
    if not conn:
        raise ConnectionAPIError(404, "Connection not found")
    db.delete(conn)
    db.commit()
    return {"success": True, "status": "none"}


# ── List Endpoints ────────────────────────────────────────────────────────────

def get_connections(
    current_user: User,
    db: Session,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    sort: str = "newest",
) -> List[dict]:
    rows = db.query(Connection).filter(
        or_(
            Connection.user_one == current_user.user_id,
            Connection.user_two == current_user.user_id,
        )
    )
    if sort == "newest":
        rows = rows.order_by(Connection.connected_at.desc())
    else:
        rows = rows.order_by(Connection.connected_at.asc())

    rows = rows.offset((page - 1) * limit).limit(limit).all()

    result = []
    for conn in rows:
        other_id = conn.user_two if conn.user_one == current_user.user_id else conn.user_one
        other    = db.query(User).filter(User.user_id == other_id).first()
        profile  = db.query(Profile).filter(Profile.user_id == other_id).first()
        if not other:
            continue
        if search and search.lower() not in other.name.lower():
            continue
        mutual = _mutual_count_for(current_user.user_id, other_id, db)
        result.append({
            "connection_id":   conn.connection_id,
            "user_id":         other.user_id,
            "name":            other.name,
            "role":            other.role,
            "profile_picture": profile.profile_picture if profile else None,
            "department":      profile.department if profile else None,
            "headline":        (profile.bio[:80] + "…") if profile and profile.bio and len(profile.bio) > 80 else (profile.bio if profile else None),
            "is_verified":     other.is_verified,
            "connected_at":    conn.connected_at,
            "mutual_count":    mutual,
        })
    return result


def get_pending_requests(current_user: User, db: Session) -> List[dict]:
    """Incoming (to current_user) pending requests."""
    rows = db.query(ConnectionRequest).filter(
        ConnectionRequest.receiver_id == current_user.user_id,
        ConnectionRequest.status      == RequestStatus.pending,
    ).order_by(ConnectionRequest.created_at.desc()).all()

    result = []
    for req in rows:
        sender  = db.query(User).filter(User.user_id == req.sender_id).first()
        profile = db.query(Profile).filter(Profile.user_id == req.sender_id).first()
        if not sender:
            continue
        mutual = _mutual_count_for(current_user.user_id, req.sender_id, db)
        result.append({
            "request_id":        req.request_id,
            "sender_id":         sender.user_id,
            "sender_name":       sender.name,
            "sender_role":       sender.role,
            "sender_picture":    profile.profile_picture if profile else None,
            "sender_department": profile.department if profile else None,
            "sender_verified":   sender.is_verified,
            "mutual_count":      mutual,
            "created_at":        req.created_at,
            "status":            req.status.value,
        })
    return result


def get_sent_requests(current_user: User, db: Session) -> List[dict]:
    """Outgoing (from current_user) pending requests."""
    rows = db.query(ConnectionRequest).filter(
        ConnectionRequest.sender_id == current_user.user_id,
        ConnectionRequest.status    == RequestStatus.pending,
    ).order_by(ConnectionRequest.created_at.desc()).all()

    result = []
    for req in rows:
        receiver = db.query(User).filter(User.user_id == req.receiver_id).first()
        profile  = db.query(Profile).filter(Profile.user_id == req.receiver_id).first()
        if not receiver:
            continue
        result.append({
            "request_id":          req.request_id,
            "receiver_id":         receiver.user_id,
            "receiver_name":       receiver.name,
            "receiver_role":       receiver.role,
            "receiver_picture":    profile.profile_picture if profile else None,
            "receiver_department": profile.department if profile else None,
            "receiver_verified":   receiver.is_verified,
            "created_at":          req.created_at,
            "status":              req.status.value,
        })
    return result


# ── Suggestions (rule-based, AI-replaceable service boundary) ─────────────────

def get_suggestions(current_user: User, db: Session, limit: int = 20) -> List[dict]:
    """
    Rule-based suggested connections.

    Scoring rules:
    - Same department   → reason chip (+3)
    - Same year_of_study → reason chip (+2)
    - Shared skills     → reason chips (+2 each)
    - Shared communities → reason chip (+2 each)
    - Mutual connections → reason chip (+1 each)

    AI BOUNDARY: Replace this function body with an ML call —
    frontend components and API contracts stay unchanged.
    """
    my_profile = db.query(Profile).filter(Profile.user_id == current_user.user_id).first()

    # Users current_user is already connected to
    conn_rows = db.query(Connection).filter(
        or_(
            Connection.user_one == current_user.user_id,
            Connection.user_two == current_user.user_id,
        )
    ).all()
    connected_ids = set()
    for c in conn_rows:
        connected_ids.add(c.user_two if c.user_one == current_user.user_id else c.user_one)
    connected_ids.add(current_user.user_id)  # exclude self

    # Pending requests (both directions)
    pending_ids = set()
    pending_rows = db.query(ConnectionRequest).filter(
        or_(
            ConnectionRequest.sender_id   == current_user.user_id,
            ConnectionRequest.receiver_id == current_user.user_id,
        ),
        ConnectionRequest.status == RequestStatus.pending,
    ).all()
    for r in pending_rows:
        pending_ids.add(r.sender_id)
        pending_ids.add(r.receiver_id)

    exclude = connected_ids | pending_ids

    # My skills
    my_skill_ids = set(
        r.skill_id for r in
        db.query(UserSkill.skill_id).filter(UserSkill.user_id == current_user.user_id).all()
    )
    # My communities
    my_community_ids = set(
        r.community_id for r in
        db.query(CommunityMember.community_id).filter(
            CommunityMember.user_id == current_user.user_id
        ).all()
    )

    # Candidate pool — all users except excluded
    all_users = (
        db.query(User, Profile)
        .outerjoin(Profile, Profile.user_id == User.user_id)
        .filter(User.user_id.notin_(exclude))
        .limit(200)  # pre-limit candidate pool for performance
        .all()
    )

    candidate_ids = [u.user_id for u, p in all_users]

    # Bulk-load user skills
    candidate_skills = {}
    if candidate_ids:
        skills_rows = db.query(UserSkill.user_id, Skill.skill_name, UserSkill.skill_id).join(
            Skill, Skill.skill_id == UserSkill.skill_id
        ).filter(UserSkill.user_id.in_(candidate_ids)).all()
        for uid, sname, sid in skills_rows:
            candidate_skills.setdefault(uid, []).append((sid, sname))

    # Bulk-load user community memberships
    candidate_communities = {}
    if candidate_ids:
        comm_rows = db.query(CommunityMember.user_id, CommunityMember.community_id).filter(
            CommunityMember.user_id.in_(candidate_ids)
        ).all()
        for uid, cid in comm_rows:
            candidate_communities.setdefault(uid, set()).add(cid)

    # Bulk-load connections for mutual calculation
    my_connections_rows = db.query(Connection).filter(
        or_(Connection.user_one == current_user.user_id, Connection.user_two == current_user.user_id)
    ).all()
    my_connected_ids = set(
        c.user_two if c.user_one == current_user.user_id else c.user_one
        for c in my_connections_rows
    )

    candidate_connections = {}
    if candidate_ids:
        conn_rows = db.query(Connection).filter(
            or_(Connection.user_one.in_(candidate_ids), Connection.user_two.in_(candidate_ids))
        ).all()
        for c in conn_rows:
            candidate_connections.setdefault(c.user_one, set()).add(c.user_two)
            candidate_connections.setdefault(c.user_two, set()).add(c.user_one)

    scored = []
    for user, profile in all_users:
        reasons = []
        score   = 0

        # Same department
        if my_profile and profile and my_profile.department and profile.department:
            if my_profile.department.lower() == profile.department.lower():
                reasons.append("Same department")
                score += 3

        # Same year
        if my_profile and profile and my_profile.year_of_study and profile.year_of_study:
            if my_profile.year_of_study == profile.year_of_study:
                reasons.append("Same year")
                score += 2

        # Shared skills
        their_skills = candidate_skills.get(user.user_id, [])
        their_skill_ids = set(sid for sid, sname in their_skills)
        shared_skills = my_skill_ids & their_skill_ids
        if shared_skills:
            # Get up to 2 names
            shared_names = [sname for sid, sname in their_skills if sid in shared_skills][:2]
            for name in shared_names:
                reasons.append(f"Both know {name}")
            score += len(shared_skills) * 2

        # Shared communities
        their_comms = candidate_communities.get(user.user_id, set())
        shared_communities = my_community_ids & their_comms
        if shared_communities:
            reasons.append(f"{len(shared_communities)} shared {'community' if len(shared_communities)==1 else 'communities'}")
            score += len(shared_communities) * 2

        # Mutual connections
        their_conns = candidate_connections.get(user.user_id, set())
        mutual_ids = my_connected_ids & their_conns
        mutual = len(mutual_ids)
        if mutual > 0:
            reasons.append(f"{mutual} mutual {'connection' if mutual==1 else 'connections'}")
            score += mutual

        scored.append((score, user, profile, reasons, mutual))

    # Sort by score descending, take top N
    scored.sort(key=lambda x: x[0], reverse=True)

    result = []
    for _, user, profile, reasons, mutual in scored[:limit]:
        their_skills = candidate_skills.get(user.user_id, [])
        skills = [sname for sid, sname in their_skills][:3]
        result.append({
            "user_id":          user.user_id,
            "name":             user.name,
            "role":             user.role,
            "profile_picture":  profile.profile_picture if profile else None,
            "department":       profile.department if profile else None,
            "skills":           skills,
            "mutual_count":     mutual,
            "reasons":          reasons if reasons else ["People you may know"],
            "connection_status": "none",
            "request_id":       None,
            "is_verified":      user.is_verified,
        })
    return result


# ── User Search (replaces follow_service.search_users) ────────────────────────

def search_users(
    current_user: User,
    name:         Optional[str],
    department:   Optional[str],
    skill:        Optional[str],
    db:           Session,
) -> List[dict]:
    query = (
        db.query(User, Profile)
        .outerjoin(Profile, Profile.user_id == User.user_id)
        .filter(User.user_id != current_user.user_id)
    )

    if name:
        query = query.filter(User.name.ilike(f"%{name}%"))
    if department:
        query = query.filter(Profile.department.ilike(f"%{department}%"))
    if skill:
        skill_subq = (
            db.query(UserSkill.user_id)
            .join(Skill, Skill.skill_id == UserSkill.skill_id)
            .filter(Skill.skill_name.ilike(f"%{skill}%"))
            .subquery()
        )
        query = query.filter(User.user_id.in_(skill_subq))

    rows = query.order_by(User.name).limit(50).all()

    results = []
    for user, profile in rows:
        cs = get_connection_status(current_user, user.user_id, db)
        results.append({
            "user_id":           user.user_id,
            "name":              user.name,
            "role":              user.role,
            "department":        profile.department if profile else None,
            "skills":            _top_skills(user.user_id, db),
            "profile_picture":   profile.profile_picture if profile else None,
            "connection_status": cs["status"],
            "request_id":        cs["request_id"],
            "connection_id":     cs["connection_id"],
            "is_verified":       user.is_verified,
        })
    return results


def get_network_summary(current_user: User, db: Session) -> dict:
    discover_count = db.query(User).filter(User.user_id != current_user.user_id).count()
    connections_count = db.query(Connection).filter(
        or_(Connection.user_one == current_user.user_id, Connection.user_two == current_user.user_id)
    ).count()
    pending_requests_count = db.query(ConnectionRequest).filter(
        ConnectionRequest.receiver_id == current_user.user_id,
        ConnectionRequest.status == RequestStatus.pending
    ).count()
    sent_requests_count = db.query(ConnectionRequest).filter(
        ConnectionRequest.sender_id == current_user.user_id,
        ConnectionRequest.status == RequestStatus.pending
    ).count()
    suggested_count = len(get_suggestions(current_user, db, limit=100))
    return {
        "discover_count": discover_count,
        "connections_count": connections_count,
        "pending_requests_count": pending_requests_count,
        "sent_requests_count": sent_requests_count,
        "suggested_count": suggested_count
    }
