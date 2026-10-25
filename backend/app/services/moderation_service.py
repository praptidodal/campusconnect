"""
moderation_service.py
────────────────────────────────────────────────────────────────────────────────
Core business logic for Enhancement Flow 6 (User Reporting & Content Moderation).
Handles report submission, queue queries, moderation actions (warn, suspend, ban,
delete content, dismiss report), audit logging, notifications, and email stubs.
────────────────────────────────────────────────────────────────────────────────
"""
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, text

from app.models.user import User
from app.models.profile import Profile
from app.models.post import Post, Like, Comment
from app.models.community import Community, CommunityMember, CommunityPost
from app.models.event import Event, EventRegistration
from app.models.chat import Message as ChatMessage
from app.models.moderation import (
    Report,
    ContentType,
    ReportReason,
    ReportStatus,
    ModerationLog,
    ModerationAction,
)
from app.services.notification_service import create_notification
from app.models.notification import NotificationType, ReferenceType


# ── Email Stub Helper ─────────────────────────────────────────────────────────

def send_moderation_email(to_email: str, recipient_name: str, subject: str, body: str) -> None:
    """
    Logs email notification to console.
    Extensible to SendGrid / SMTP when provider credentials are available.
    """
    print(f"\n[MODERATION EMAIL STUB]\nTo: {recipient_name} <{to_email}>\nSubject: {subject}\n{body}\n{'─'*65}\n")


# ── Report Submission ─────────────────────────────────────────────────────────

# ── Reason Normalization ──────────────────────────────────────────────────────

REASON_MAP = {
    "spam": ReportReason.spam,
    "harassment": ReportReason.harassment,
    "hate_speech": ReportReason.hate_speech,
    "fake_information": ReportReason.fake_information,
    "violence": ReportReason.violence,
    "violence / threats": ReportReason.violence,
    "violence_threats": ReportReason.violence,
    "copyright": ReportReason.copyright,
    "impersonation": ReportReason.harassment,        # maps to harassment (not 'other')
    "inappropriate_content": ReportReason.hate_speech,  # maps to hate_speech (not 'other')
    "inappropriate content": ReportReason.hate_speech,
    "scam_fraud": ReportReason.spam,
    "scam / fraud": ReportReason.spam,
    "bullying": ReportReason.harassment,
    "other": ReportReason.other,
}

def _normalize_reason(reason_str: str) -> ReportReason:
    clean = str(reason_str).strip().lower()
    return REASON_MAP.get(clean, ReportReason.other)


# ── Report Submission (Profile-Level Only) ────────────────────────────────────

def submit_report(db: Session, reporter_id: int, payload) -> dict:
    """
    Submits a profile report. Validates reported user, prevents self-report,
    prevents duplicate reports, and creates Report object.
    """
    cid = payload.content_id if hasattr(payload, 'content_id') else payload.reported_user_id
    if not cid:
        raise HTTPException(status_code=400, detail={"message": "Reported user ID is required."})

    target_user_id = int(cid)

    if reporter_id == target_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "You cannot report your own profile."}
        )

    target = db.query(User).filter(User.user_id == target_user_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Reported user profile not found."}
        )

    # Prevent duplicate active reports by the same reporter for target user
    existing_report = db.query(Report).filter(
        Report.reporter_id == reporter_id,
        Report.reported_user_id == target_user_id,
        Report.content_type == ContentType.profile,
        Report.status.in_([ReportStatus.pending, ReportStatus.reviewing])
    ).first()

    if existing_report:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "You have already reported this user."}
        )

    reason_enum = _normalize_reason(payload.reason)
    desc = payload.description.strip() if payload.description else None
    # Only require description when user explicitly selects 'other' (not when a label maps to other internally)
    if str(payload.reason).strip().lower() == 'other' and not desc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Please enter additional details when selecting 'Other'."}
        )

    report = Report(
        reporter_id=reporter_id,
        reported_user_id=target_user_id,
        content_type=ContentType.profile,
        content_id=target_user_id,
        reason=reason_enum,
        description=desc,
        status=ReportStatus.pending,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "message": "Your report has been submitted successfully.",
        "report_id": report.report_id,
        "status": report.status.value,
    }


def report_and_block_user(db: Session, reporter_id: int, payload) -> dict:
    """
    Submits a profile report AND blocks the target user in a single atomic DB transaction.
    """
    from app.services.block_service import block_user

    cid = payload.content_id if hasattr(payload, 'content_id') else payload.reported_user_id
    if not cid:
        raise HTTPException(status_code=400, detail={"message": "Reported user ID is required."})

    target_user_id = int(cid)

    if reporter_id == target_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "You cannot report or block yourself."}
        )

    target = db.query(User).filter(User.user_id == target_user_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Reported user profile not found."}
        )

    reason_enum = _normalize_reason(payload.reason)
    desc = payload.description.strip() if payload.description else None
    # Only require description when user explicitly selects 'other'
    if str(payload.reason).strip().lower() == 'other' and not desc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Please enter additional details when selecting 'Other'."}
        )

    # 1. Create Report (if not already reported)
    existing_report = db.query(Report).filter(
        Report.reporter_id == reporter_id,
        Report.reported_user_id == target_user_id,
        Report.content_type == ContentType.profile,
        Report.status.in_([ReportStatus.pending, ReportStatus.reviewing])
    ).first()

    report_id = None
    if not existing_report:
        report = Report(
            reporter_id=reporter_id,
            reported_user_id=target_user_id,
            content_type=ContentType.profile,
            content_id=target_user_id,
            reason=reason_enum,
            description=desc,
            status=ReportStatus.pending,
        )
        db.add(report)
        db.flush() # flush to get report_id before block
        report_id = report.report_id
    else:
        report_id = existing_report.report_id

    # 2. Create Block (if not already blocked)
    from app.models.block import UserBlock
    existing_block = db.query(UserBlock).filter(
        UserBlock.blocker_user_id == reporter_id,
        UserBlock.blocked_user_id == target_user_id
    ).first()

    if not existing_block:
        block = UserBlock(
            blocker_user_id=reporter_id,
            blocked_user_id=target_user_id
        )
        db.add(block)

    # Commit both atomically
    db.commit()

    return {
        "message": "User reported and blocked successfully.",
        "report_id": report_id,
        "is_blocked": True,
    }


# ── Content Snippet Hydration Helper ──────────────────────────────────────────

def _get_content_preview(db: Session, content_type: str, content_id: int) -> str:
    """Helper to fetch a short text snippet/preview of reported content."""
    try:
        if content_type == ContentType.post.value:
            post = db.query(Post).filter(Post.post_id == content_id).first()
            return f"Post: {post.content[:80]}..." if post and post.content else ("[Post Media]" if post else "[Post Deleted]")

        elif content_type == ContentType.comment.value:
            comment = db.query(Comment).filter(Comment.comment_id == content_id).first()
            return f"Comment: {comment.comment_text[:80]}..." if comment and comment.comment_text else "[Comment Deleted]"

        elif content_type == ContentType.message.value:
            msg = db.query(ChatMessage).filter(ChatMessage.message_id == content_id).first()
            return f"Message: {msg.message_text[:80]}..." if msg and msg.message_text else ("[Attachment]" if msg else "[Message Deleted]")

        elif content_type == ContentType.community.value:
            comm = db.query(Community).filter(Community.community_id == content_id).first()
            return f"Community: {comm.community_name}" if comm else "[Community Deleted]"

        elif content_type == ContentType.event.value:
            event = db.query(Event).filter(Event.event_id == content_id).first()
            return f"Event: {event.title}" if event else "[Event Deleted]"

        elif content_type == ContentType.profile.value:
            user = db.query(User).filter(User.user_id == content_id).first()
            return f"User Profile: {user.name} ({user.email})" if user else "[Profile Deleted]"
    except Exception:
        pass
    return "Content snippet unavailable"


# ── Admin Moderation Queue ────────────────────────────────────────────────────

def list_reports(db: Session, status_filter: Optional[str] = None, content_type: Optional[str] = None) -> List[dict]:
    query = db.query(Report)
    if status_filter:
        query = query.filter(Report.status == status_filter)
    if content_type:
        query = query.filter(Report.content_type == content_type)

    # Sort pending & reviewing first
    reports = query.order_by(
        text("CASE WHEN status = 'pending' THEN 1 WHEN status = 'reviewing' THEN 2 WHEN status = 'resolved' THEN 3 ELSE 4 END"),
        desc(Report.created_at)
    ).all()

    results = []
    for r in reports:
        reporter = db.query(User).filter(User.user_id == r.reporter_id).first()
        reported_user = db.query(User).filter(User.user_id == r.reported_user_id).first() if r.reported_user_id else None
        reviewer = db.query(User).filter(User.user_id == r.reviewed_by).first() if r.reviewed_by else None

        results.append({
            "report_id":        r.report_id,
            "reporter_id":      r.reporter_id,
            "reported_user_id": r.reported_user_id,
            "content_type":     r.content_type.value,
            "content_id":       r.content_id,
            "reason":           r.reason.value,
            "description":      r.description,
            "status":           r.status.value,
            "created_at":       r.created_at,
            "reviewed_by":      r.reviewed_by,
            "reviewed_at":      r.reviewed_at,
            "reporter_name":    reporter.name if reporter else "Unknown",
            "reporter_email":   reporter.email if reporter else "",
            "reported_user_name":  reported_user.name if reported_user else "Unknown",
            "reported_user_email": reported_user.email if reported_user else "",
            "reviewer_name":    reviewer.name if reviewer else None,
            "content_preview":  _get_content_preview(db, r.content_type.value, r.content_id),
        })

    return results


def get_report_details(db: Session, report_id: int) -> dict:
    report = db.query(Report).filter(Report.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail={"message": "Report not found"})

    reporter = db.query(User).filter(User.user_id == report.reporter_id).first()
    reported_user = db.query(User).filter(User.user_id == report.reported_user_id).first() if report.reported_user_id else None
    reviewer = db.query(User).filter(User.user_id == report.reviewed_by).first() if report.reviewed_by else None

    # Fetch user moderation logs for reported user if exists
    user_history = []
    if reported_user:
        logs = db.query(ModerationLog).filter(ModerationLog.user_id == reported_user.user_id).order_by(desc(ModerationLog.created_at)).all()
        for log in logs:
            admin_user = db.query(User).filter(User.user_id == log.admin_id).first()
            user_history.append({
                "log_id": log.log_id,
                "action": log.action.value if hasattr(log.action, 'value') else str(log.action),
                "reason": log.reason,
                "created_at": log.created_at,
                "admin_name": admin_user.name if admin_user else "Admin",
            })

    return {
        "report_id":        report.report_id,
        "reporter_id":      report.reporter_id,
        "reported_user_id": report.reported_user_id,
        "content_type":     report.content_type.value,
        "content_id":       report.content_id,
        "reason":           report.reason.value,
        "description":      report.description,
        "status":           report.status.value,
        "created_at":       report.created_at,
        "reviewed_by":      report.reviewed_by,
        "reviewed_at":      report.reviewed_at,
        "reporter": {
            "user_id": reporter.user_id,
            "name": reporter.name,
            "email": reporter.email,
        } if reporter else None,
        "reported_user": {
            "user_id": reported_user.user_id,
            "name": reported_user.name,
            "email": reported_user.email,
            "role": reported_user.role,
            "status": getattr(reported_user, 'account_status', None) or reported_user.status,
            "warning_count": getattr(reported_user, 'warning_count', 0),
        } if reported_user else None,
        "reviewer": {
            "user_id": reviewer.user_id,
            "name": reviewer.name,
        } if reviewer else None,
        "content_preview": _get_content_preview(db, report.content_type.value, report.content_id),
        "user_history":    user_history,
    }


# ── Admin Moderation Actions ──────────────────────────────────────────────────

def issue_warning(db: Session, admin_id: int, user_id: int, report_id: Optional[int] = None, reason: Optional[str] = None) -> dict:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail={"message": "User not found"})

    user.warning_count = getattr(user, 'warning_count', 0) + 1
    db.commit()
    db.refresh(user)

    # Log action
    log = ModerationLog(
        admin_id=admin_id,
        report_id=report_id,
        user_id=user_id,
        action=ModerationAction.warning,
        reason=reason or "Issued warning for platform policy violation."
    )
    db.add(log)

    # Update report status if report_id provided
    if report_id:
        r = db.query(Report).filter(Report.report_id == report_id).first()
        if r:
            r.status = ReportStatus.resolved
            r.reviewed_by = admin_id
            r.reviewed_at = datetime.utcnow()

    db.commit()

    # In-app notification
    create_notification(
        db=db,
        receiver_id=user_id,
        notification_type=NotificationType.warning_issued.value,
        title="Official Warning Issued ⚠️",
        message=f"You have received an official warning. {('Reason: ' + reason) if reason else 'Please follow community guidelines.'} (Total warnings: {user.warning_count})",
        sender_id=admin_id,
        reference_type=ReferenceType.user.value,
        reference_id=user_id,
    )

    # Email notification
    send_moderation_email(
        to_email=user.email,
        recipient_name=user.name,
        subject="[CampusConnect] Official Warning Issued",
        body=(
            f"Dear {user.name},\n\n"
            f"An administrator has issued an official warning regarding your account on CampusConnect.\n"
            f"{('Reason: ' + reason) if reason else ''}\n\n"
            f"Your current warning count is: {user.warning_count}.\n"
            f"Repeated violations may lead to account suspension or permanent banning.\n\n"
            f"Best regards,\nCampusConnect Moderation Team"
        )
    )

    return {"message": f"Warning issued to user '{user.name}'. Total warnings: {user.warning_count}."}


def suspend_user(db: Session, admin_id: int, user_id: int, report_id: Optional[int] = None, reason: Optional[str] = None) -> dict:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail={"message": "User not found"})

    user.account_status = "suspended"
    user.status = "suspended"
    db.commit()

    log = ModerationLog(
        admin_id=admin_id,
        report_id=report_id,
        user_id=user_id,
        action=ModerationAction.suspend,
        reason=reason or "Account suspended for policy violations."
    )
    db.add(log)

    if report_id:
        r = db.query(Report).filter(Report.report_id == report_id).first()
        if r:
            r.status = ReportStatus.resolved
            r.reviewed_by = admin_id
            r.reviewed_at = datetime.utcnow()

    db.commit()

    create_notification(
        db=db,
        receiver_id=user_id,
        notification_type=NotificationType.account_suspended.value,
        title="Account Suspended 🚫",
        message=f"Your account has been suspended. {('Reason: ' + reason) if reason else 'Please contact administrator for support.'}",
        sender_id=admin_id,
    )

    send_moderation_email(
        to_email=user.email,
        recipient_name=user.name,
        subject="[CampusConnect] Account Suspended",
        body=(
            f"Dear {user.name},\n\n"
            f"Your CampusConnect account has been suspended by an administrator.\n"
            f"{('Reason: ' + reason) if reason else ''}\n\n"
            f"While suspended, you cannot post, comment, message, or create communities/events.\n"
            f"If you believe this was an error, please contact the administrator.\n\n"
            f"Best regards,\nCampusConnect Moderation Team"
        )
    )

    return {"message": f"User '{user.name}' has been suspended."}


def unsuspend_user(db: Session, admin_id: int, user_id: int, reason: Optional[str] = None) -> dict:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail={"message": "User not found"})

    user.account_status = "active"
    user.status = "active"
    db.commit()

    log = ModerationLog(
        admin_id=admin_id,
        user_id=user_id,
        action=ModerationAction.unsuspend,
        reason=reason or "Account unsuspended by administrator."
    )
    db.add(log)
    db.commit()

    create_notification(
        db=db,
        receiver_id=user_id,
        notification_type=NotificationType.account_unsuspended.value,
        title="Account Re-activated ✅",
        message="Your account suspension has been lifted. You have full access to CampusConnect.",
        sender_id=admin_id,
    )

    send_moderation_email(
        to_email=user.email,
        recipient_name=user.name,
        subject="[CampusConnect] Account Re-activated",
        body=(
            f"Dear {user.name},\n\n"
            f"Good news! Your CampusConnect account suspension has been lifted by an administrator.\n"
            f"You now have full access to interact on the platform again.\n\n"
            f"Best regards,\nCampusConnect Moderation Team"
        )
    )

    return {"message": f"User '{user.name}' account is now active."}


def ban_user(db: Session, admin_id: int, user_id: int, report_id: Optional[int] = None, reason: Optional[str] = None) -> dict:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail={"message": "User not found"})

    user.account_status = "banned"
    user.status = "banned"
    db.commit()

    log = ModerationLog(
        admin_id=admin_id,
        report_id=report_id,
        user_id=user_id,
        action=ModerationAction.ban,
        reason=reason or "Account permanently banned for severe violations."
    )
    db.add(log)

    if report_id:
        r = db.query(Report).filter(Report.report_id == report_id).first()
        if r:
            r.status = ReportStatus.resolved
            r.reviewed_by = admin_id
            r.reviewed_at = datetime.utcnow()

    db.commit()

    create_notification(
        db=db,
        receiver_id=user_id,
        notification_type=NotificationType.account_banned.value,
        title="Account Banned 🚫",
        message=f"Your account has been banned. {('Reason: ' + reason) if reason else ''}",
        sender_id=admin_id,
    )

    send_moderation_email(
        to_email=user.email,
        recipient_name=user.name,
        subject="[CampusConnect] Account Banned",
        body=(
            f"Dear {user.name},\n\n"
            f"Your CampusConnect account has been permanently banned due to policy violations.\n"
            f"{('Reason: ' + reason) if reason else ''}\n\n"
            f"Best regards,\nCampusConnect Moderation Team"
        )
    )

    return {"message": f"User '{user.name}' has been banned."}


def unban_user(db: Session, admin_id: int, user_id: int, reason: Optional[str] = None) -> dict:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail={"message": "User not found"})

    user.account_status = "active"
    user.status = "active"
    db.commit()

    log = ModerationLog(
        admin_id=admin_id,
        user_id=user_id,
        action=ModerationAction.unban,
        reason=reason or "Account unbanned by administrator."
    )
    db.add(log)
    db.commit()

    create_notification(
        db=db,
        receiver_id=user_id,
        notification_type=NotificationType.account_unbanned.value,
        title="Account Unbanned ✅",
        message="Your account ban has been lifted.",
        sender_id=admin_id,
    )

    send_moderation_email(
        to_email=user.email,
        recipient_name=user.name,
        subject="[CampusConnect] Account Unbanned",
        body=(
            f"Dear {user.name},\n\n"
            f"Your CampusConnect account ban has been lifted by an administrator.\n"
            f"Best regards,\nCampusConnect Moderation Team"
        )
    )

    return {"message": f"User '{user.name}' account unbanned successfully."}


def delete_content(
    db: Session,
    admin_id: int,
    content_type: str,
    content_id: int,
    report_id: Optional[int] = None,
    reason: Optional[str] = None
) -> dict:
    """Deletes post, comment, message, community, or event and logs moderation action."""
    ctype = content_type.lower()
    owner_id = None
    action_type = None

    if ctype == ContentType.post.value:
        post = db.query(Post).filter(Post.post_id == content_id).first()
        if not post:
            raise HTTPException(status_code=404, detail={"message": "Post not found"})
        owner_id = post.user_id
        action_type = ModerationAction.delete_post
        db.query(Like).filter(Like.post_id == content_id).delete()
        db.query(Comment).filter(Comment.post_id == content_id).delete()
        db.delete(post)

    elif ctype == ContentType.comment.value:
        comment = db.query(Comment).filter(Comment.comment_id == content_id).first()
        if not comment:
            raise HTTPException(status_code=404, detail={"message": "Comment not found"})
        owner_id = comment.user_id
        action_type = ModerationAction.delete_comment
        db.delete(comment)

    elif ctype == ContentType.message.value:
        msg = db.query(ChatMessage).filter(ChatMessage.message_id == content_id).first()
        if not msg:
            raise HTTPException(status_code=404, detail={"message": "Message not found"})
        owner_id = msg.sender_id
        action_type = ModerationAction.delete_message
        db.delete(msg)

    elif ctype == ContentType.community.value:
        comm = db.query(Community).filter(Community.community_id == content_id).first()
        if not comm:
            raise HTTPException(status_code=404, detail={"message": "Community not found"})
        owner_id = comm.created_by
        action_type = ModerationAction.delete_community
        db.query(CommunityMember).filter(CommunityMember.community_id == content_id).delete()
        db.query(CommunityPost).filter(CommunityPost.community_id == content_id).delete()
        db.delete(comm)

    elif ctype == ContentType.event.value:
        event = db.query(Event).filter(Event.event_id == content_id).first()
        if not event:
            raise HTTPException(status_code=404, detail={"message": "Event not found"})
        owner_id = event.organizer_id
        action_type = ModerationAction.delete_event
        db.query(EventRegistration).filter(EventRegistration.event_id == content_id).delete()
        db.delete(event)

    else:
        raise HTTPException(status_code=400, detail={"message": f"Unsupported content deletion type: '{content_type}'"})

    # Mark matching reports as resolved
    db.query(Report).filter(
        Report.content_type == ctype,
        Report.content_id == content_id
    ).update(
        {Report.status: ReportStatus.resolved, Report.reviewed_by: admin_id, Report.reviewed_at: datetime.utcnow()},
        synchronize_session=False
    )

    log = ModerationLog(
        admin_id=admin_id,
        report_id=report_id,
        user_id=owner_id,
        action=action_type,
        reason=reason or f"Deleted violating {ctype} content ID {content_id}."
    )
    db.add(log)
    db.commit()

    # Notify & Email content owner if found
    if owner_id:
        owner = db.query(User).filter(User.user_id == owner_id).first()
        if owner:
            create_notification(
                db=db,
                receiver_id=owner_id,
                notification_type=NotificationType.content_removed.value,
                title="Content Removed 🗑️",
                message=f"Your {ctype} was removed for policy violation. {('Reason: ' + reason) if reason else ''}",
                sender_id=admin_id,
            )
            send_moderation_email(
                to_email=owner.email,
                recipient_name=owner.name,
                subject=f"[CampusConnect] {ctype.capitalize()} Removed for Policy Violation",
                body=(
                    f"Dear {owner.name},\n\n"
                    f"Your {ctype} (ID: {content_id}) was removed by an administrator after content review.\n"
                    f"{('Reason: ' + reason) if reason else ''}\n\n"
                    f"Please review our platform community guidelines.\n\n"
                    f"Best regards,\nCampusConnect Moderation Team"
                )
            )

    return {"message": f"{ctype.capitalize()} content deleted successfully"}


def dismiss_report(db: Session, admin_id: int, report_id: int, reason: Optional[str] = None) -> dict:
    report = db.query(Report).filter(Report.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail={"message": "Report not found"})

    report.status = ReportStatus.dismissed
    report.reviewed_by = admin_id
    report.reviewed_at = datetime.utcnow()

    log = ModerationLog(
        admin_id=admin_id,
        report_id=report_id,
        user_id=report.reported_user_id,
        action=ModerationAction.dismiss_report,
        reason=reason or "Report dismissed after administrative review."
    )
    db.add(log)
    db.commit()

    return {"message": f"Report ID {report_id} dismissed."}


def get_moderation_logs(db: Session, page: int = 1, limit: int = 20) -> List[dict]:
    offset = (page - 1) * limit
    logs = db.query(ModerationLog).order_by(desc(ModerationLog.created_at)).offset(offset).limit(limit).all()

    results = []
    for log in logs:
        admin_user = db.query(User).filter(User.user_id == log.admin_id).first()
        affected_user = db.query(User).filter(User.user_id == log.user_id).first() if log.user_id else None
        action_str = log.action.value if hasattr(log.action, 'value') else str(log.action)

        results.append({
            "log_id": log.log_id,
            "admin_id": log.admin_id,
            "report_id": log.report_id,
            "user_id": log.user_id,
            "action": action_str,
            "reason": log.reason,
            "created_at": log.created_at,
            "admin_name": admin_user.name if admin_user else "Admin",
            "admin_email": admin_user.email if admin_user else "",
            "affected_user_name": affected_user.name if affected_user else "N/A",
            "affected_user_email": affected_user.email if affected_user else "",
        })

    return results
