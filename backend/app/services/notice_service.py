from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.notice import OfficialNotice, NoticeRecipient
from app.models.user import User
from app.models.community import CommunityMember
from app.models.event import EventRegistration
from app.services.notification_service import create_notification


def resolve_recipients(db: Session, target_audience: str, reference_id: Optional[int]) -> List[int]:
    """Return list of user_ids who should receive this notice."""
    if target_audience == "all_students":
        users = db.query(User.user_id).filter(User.role == "student").all()
        return [u.user_id for u in users]

    elif target_audience == "all_teachers":
        users = db.query(User.user_id).filter(User.role == "faculty").all()
        return [u.user_id for u in users]

    elif target_audience == "specific_community":
        if not reference_id:
            return []
        members = db.query(CommunityMember.user_id).filter(
            CommunityMember.community_id == reference_id
        ).all()
        return [m.user_id for m in members]

    elif target_audience == "specific_event":
        if not reference_id:
            return []
        regs = db.query(EventRegistration.user_id).filter(
            EventRegistration.event_id == reference_id
        ).all()
        return [r.user_id for r in regs]

    return []


def create_notice(db: Session, teacher: User, payload) -> OfficialNotice:
    """Create an official notice and fan-out notifications to recipients."""
    if teacher.role not in ("faculty", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Only verified faculty members can create notices"}
        )

    notice = OfficialNotice(
        teacher_id=teacher.user_id,
        title=payload.title,
        description=payload.description,
        target_audience=payload.target_audience,
        reference_id=payload.reference_id,
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)

    # Fan-out: resolve recipients and create NoticeRecipient + Notification
    recipient_ids = resolve_recipients(db, payload.target_audience, payload.reference_id)
    for uid in recipient_ids:
        if uid == teacher.user_id:
            continue
        nr = NoticeRecipient(
            notice_id=notice.notice_id,
            user_id=uid,
            notification_sent=False,
            read_status=False,
        )
        db.add(nr)

        # Dispatch bell notification
        try:
            create_notification(
                db=db,
                receiver_id=uid,
                notification_type="official_notice",
                title="📢 Important Notice",
                message=f"{teacher.name}: {payload.title}",
                sender_id=teacher.user_id,
                reference_type="notice",
                reference_id=notice.notice_id,
            )
        except Exception:
            pass

    db.commit()
    return notice


def _serialize_notice(db: Session, notice: OfficialNotice) -> dict:
    recipient_count = db.query(NoticeRecipient).filter(
        NoticeRecipient.notice_id == notice.notice_id
    ).count()
    return {
        "notice_id":        notice.notice_id,
        "teacher_id":       notice.teacher_id,
        "teacher_name":     notice.teacher.name if notice.teacher else "Unknown",
        "teacher_verified": notice.teacher.is_verified if notice.teacher else False,
        "title":            notice.title,
        "description":      notice.description,
        "target_audience":  notice.target_audience,
        "reference_id":     notice.reference_id,
        "created_at":       notice.created_at,
        "recipient_count":  recipient_count,
    }


def get_my_notices(db: Session, teacher_id: int) -> list:
    notices = db.query(OfficialNotice).filter(
        OfficialNotice.teacher_id == teacher_id
    ).order_by(OfficialNotice.created_at.desc()).all()
    return [_serialize_notice(db, n) for n in notices]


def get_received_notices(db: Session, user_id: int) -> list:
    recipients = (
        db.query(NoticeRecipient)
        .filter(NoticeRecipient.user_id == user_id)
        .order_by(NoticeRecipient.recipient_id.desc())
        .all()
    )
    result = []
    for nr in recipients:
        notice = db.query(OfficialNotice).filter(
            OfficialNotice.notice_id == nr.notice_id
        ).first()
        if notice:
            result.append(_serialize_notice(db, notice))
    return result


def get_notice_by_id(db: Session, notice_id: int) -> dict:
    notice = db.query(OfficialNotice).filter(
        OfficialNotice.notice_id == notice_id
    ).first()
    if not notice:
        raise HTTPException(status_code=404, detail={"message": "Notice not found"})
    return _serialize_notice(db, notice)


def get_all_teachers(db: Session) -> list:
    """Return all verified faculty members for the Faculty Directory."""
    teachers = db.query(User).filter(
        User.role == "faculty",
        User.is_verified == True
    ).all()
    result = []
    for t in teachers:
        profile = t.profile if not isinstance(t.profile, list) else (t.profile[0] if t.profile else None)
        result.append({
            "user_id":        t.user_id,
            "name":           t.name,
            "email":          t.email,
            "is_verified":    t.is_verified,
            "department":     t.department,
            "designation":    t.designation,
            "office_hours":   t.office_hours,
            "office_location":t.office_location,
            "profile_picture":profile.profile_picture if profile else None,
            "bio":            profile.bio if profile else None,
        })
    return result


def get_pending_teachers(db: Session) -> list:
    """Return faculty accounts pending admin approval (is_verified=False)."""
    teachers = db.query(User).filter(
        User.role == "faculty",
        User.is_verified == False
    ).order_by(User.created_at.desc()).all()
    result = []
    for t in teachers:
        result.append({
            "user_id":        t.user_id,
            "name":           t.name,
            "email":          t.email,
            "is_verified":    t.is_verified,
            "department":     t.department,
            "designation":    t.designation,
            "employee_id":    t.employee_id,
            "office_location":t.office_location,
            "office_hours":   t.office_hours,
            "created_at":     t.created_at,
        })
    return result
