import os
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.user import User
from app.models.profile import Profile
from app.models.community import Community, CommunityMember
from app.models.collaboration import Collaboration, Application, ApplicationStatus
from app.models.chat import Conversation, ConversationParticipant, Message, MessageRead, ConversationType


async def save_chat_attachment(file: UploadFile) -> str:
    """Save an uploaded chat file locally and return its static URL path."""
    UPLOAD_DIR = "uploads/chat"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    dest = os.path.join(UPLOAD_DIR, filename)
    
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)
        
    return f"/static/chat/{filename}"


def get_conversation_with_access(db: Session, conversation_id: int, user: User) -> Conversation:
    """Fetch conversation and verify that user has permission to access it."""
    conv = db.query(Conversation).filter(Conversation.conversation_id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Conversation not found"}
        )
    
    if conv.conversation_type == ConversationType.direct:
        participant = db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user.user_id
        ).first()
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Access denied to this conversation"}
            )
            
    elif conv.conversation_type == ConversationType.community:
        member = db.query(CommunityMember).filter(
            CommunityMember.community_id == conv.community_id,
            CommunityMember.user_id == user.user_id
        ).first()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Access denied. Not a member of this community"}
            )
            
    elif conv.conversation_type == ConversationType.collaboration:
        collab = db.query(Collaboration).filter(Collaboration.collaboration_id == conv.collaboration_id).first()
        if not collab:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Collaboration not found"}
            )
        
        # Creator has access
        if collab.created_by == user.user_id:
            return conv
            
        # Accepted applicants have access
        app = db.query(Application).filter(
            Application.collaboration_id == conv.collaboration_id,
            Application.applicant_id == user.user_id,
            Application.status == ApplicationStatus.accepted
        ).first()
        if not app:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Access denied. Not accepted on this project"}
            )
            
    elif conv.conversation_type == ConversationType.group:
        participant = db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user.user_id
        ).first()
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Access denied to this group conversation"}
            )

    return conv


def get_or_create_conversation(
    db: Session,
    conversation_type: str,
    current_user: User,
    recipient_id: Optional[int] = None,
    community_id: Optional[int] = None,
    collaboration_id: Optional[int] = None,
    from_faculty_directory: Optional[bool] = False,
) -> Conversation:
    """Get or create a conversation for direct, community, or collaboration chats."""
    
    if conversation_type == "direct":
        if not recipient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Recipient ID required for direct message"}
            )
        if recipient_id == current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Cannot start direct message with yourself"}
            )
            
        recipient = db.query(User).filter(User.user_id == recipient_id).first()
        if not recipient or recipient.status in ["suspended", "banned"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "User not found or unavailable"}
            )

        from app.services.block_service import is_interaction_blocked
        if is_interaction_blocked(db, current_user.user_id, recipient_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Cannot message this user due to block settings."}
            )
            
        # Connection gate: only connected users can DM (faculty, admin, and teacher are exempt)
        if current_user.role not in ("faculty", "admin", "teacher"):
            is_faculty_recipient = recipient.role == "faculty"
            if not (is_faculty_recipient and from_faculty_directory):
                from app.services.connection_service import are_connected
                if not are_connected(current_user.user_id, recipient_id, db):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail={"message": "Connect with this user to start messaging."}
                    )

        # Check if direct conversation already exists between both users
        existing = db.query(Conversation).filter(
            Conversation.conversation_type == ConversationType.direct
        ).filter(
            Conversation.participants.any(user_id=current_user.user_id)
        ).filter(
            Conversation.participants.any(user_id=recipient_id)
        ).first()
        
        if existing:
            return existing
            
        # Create new direct conversation
        conv = Conversation(
            conversation_type=ConversationType.direct,
            created_by=current_user.user_id
        )
        db.add(conv)
        db.flush()
        
        p1 = ConversationParticipant(conversation_id=conv.conversation_id, user_id=current_user.user_id)
        p2 = ConversationParticipant(conversation_id=conv.conversation_id, user_id=recipient_id)
        db.add(p1)
        db.add(p2)
        db.commit()
        db.refresh(conv)
        return conv
        
    elif conversation_type == "community":
        if not community_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Community ID required"}
            )
            
        # Verify community exists
        community = db.query(Community).filter(Community.community_id == community_id).first()
        if not community:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Community not found"}
            )
            
        # Verify membership
        member = db.query(CommunityMember).filter(
            CommunityMember.community_id == community_id,
            CommunityMember.user_id == current_user.user_id
        ).first()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Must be a member of the community to access chat"}
            )
            
        # Get or create community chat
        conv = db.query(Conversation).filter(
            Conversation.conversation_type == ConversationType.community,
            Conversation.community_id == community_id
        ).first()
        
        if not conv:
            conv = Conversation(
                conversation_type=ConversationType.community,
                community_id=community_id,
                created_by=current_user.user_id
            )
            db.add(conv)
            db.commit()
            db.refresh(conv)
            
        return conv
        
    elif conversation_type == "collaboration":
        if not collaboration_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Collaboration ID required"}
            )
            
        # Verify collaboration exists
        collab = db.query(Collaboration).filter(Collaboration.collaboration_id == collaboration_id).first()
        if not collab:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Collaboration not found"}
            )
            
        # Verify access (creator or accepted applicant)
        is_creator = collab.created_by == current_user.user_id
        is_accepted = False
        if not is_creator:
            app = db.query(Application).filter(
                Application.collaboration_id == collaboration_id,
                Application.applicant_id == current_user.user_id,
                Application.status == ApplicationStatus.accepted
            ).first()
            if app:
                is_accepted = True
                
        if not is_creator and not is_accepted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Only the project creator and accepted applicants can access team chat"}
            )
            
        # Get or create collaboration chat
        conv = db.query(Conversation).filter(
            Conversation.conversation_type == ConversationType.collaboration,
            Conversation.collaboration_id == collaboration_id
        ).first()
        
        if not conv:
            conv = Conversation(
                conversation_type=ConversationType.collaboration,
                collaboration_id=collaboration_id,
                created_by=current_user.user_id
            )
            db.add(conv)
            db.commit()
            db.refresh(conv)
            
        return conv
        
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Invalid conversation type"}
        )


def create_group_conversation(
    db: Session,
    current_user: User,
    group_name: str,
    member_ids: List[int],
    group_avatar: Optional[str] = None,
) -> Conversation:
    """Create a group chat. Validates that all members are eligible connections of current_user."""
    if not group_name or not group_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Group name is required"}
        )
    if len(group_name.strip()) > 150:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Group name must be 150 characters or less"}
        )
    
    # Clean and deduplicate member IDs, exclude self
    clean_member_ids = list(dict.fromkeys([int(m) for m in member_ids if int(m) != current_user.user_id]))
    if not clean_member_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Select at least one connected member for the group"}
        )

    from app.services.connection_service import are_connected
    for mid in clean_member_ids:
        target = db.query(User).filter(User.user_id == mid).first()
        if not target or target.status in ["suspended", "banned"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": f"User not found or unavailable (ID: {mid})"}
            )
        if not are_connected(current_user.user_id, mid, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": f"You can only add people you are connected with ({target.name} is not connected)."}
            )

    conv = Conversation(
        conversation_type=ConversationType.group,
        created_by=current_user.user_id,
        group_name=group_name.strip(),
        group_avatar=group_avatar,
    )
    db.add(conv)
    db.flush()

    # Creator is automatically a participant
    p_creator = ConversationParticipant(conversation_id=conv.conversation_id, user_id=current_user.user_id)
    db.add(p_creator)

    for mid in clean_member_ids:
        p_mem = ConversationParticipant(conversation_id=conv.conversation_id, user_id=mid)
        db.add(p_mem)

    db.commit()
    db.refresh(conv)
    return conv



def get_user_conversations(db: Session, current_user: User) -> List[dict]:
    """Retrieve all conversations for the user sorted by latest message activity."""
    # 1. Direct chats user is participant of
    direct_ids = db.query(ConversationParticipant.conversation_id).filter(
        ConversationParticipant.user_id == current_user.user_id
    )

    # 2. Community chats user is member of
    community_ids = db.query(Conversation.conversation_id).join(
        CommunityMember, CommunityMember.community_id == Conversation.community_id
    ).filter(
        CommunityMember.user_id == current_user.user_id
    )

    # 3. Collaboration chats user is creator of
    collab_creator_ids = db.query(Conversation.conversation_id).join(
        Collaboration, Collaboration.collaboration_id == Conversation.collaboration_id
    ).filter(
        Collaboration.created_by == current_user.user_id
    )

    # 4. Collaboration chats user is accepted applicant of
    collab_applicant_ids = db.query(Conversation.conversation_id).join(
        Collaboration, Collaboration.collaboration_id == Conversation.collaboration_id
    ).join(
        Application, Application.collaboration_id == Collaboration.collaboration_id
    ).filter(
        Application.applicant_id == current_user.user_id,
        Application.status == ApplicationStatus.accepted
    )

    # Combine conversations
    conv_ids = direct_ids.union(community_ids).union(collab_creator_ids).union(collab_applicant_ids).all()
    conv_ids = [c[0] for c in conv_ids]
    
    if not conv_ids:
        return []
        
    conversations = db.query(Conversation).filter(Conversation.conversation_id.in_(conv_ids)).all()
    
    serialized = [serialize_conversation(db, conv, current_user.user_id) for conv in conversations]
    
    # Sort conversations by latest message timestamp, fallback to conversation creation time
    def get_sort_key(c):
        if c["latest_message"]:
            return c["latest_message"]["created_at"]
        return c["created_at"]
        
    serialized.sort(key=get_sort_key, reverse=True)
    return serialized


def serialize_message(db: Session, message: Message, current_user_id: int) -> dict:
    """Helper to convert a Message model to a dictionary response."""
    sender = db.query(User).filter(User.user_id == message.sender_id).first()
    sender_profile = db.query(Profile).filter(Profile.user_id == message.sender_id).first()
    is_read = db.query(MessageRead).filter(
        MessageRead.message_id == message.message_id,
        MessageRead.user_id == current_user_id
    ).first() is not None

    return {
        "message_id": message.message_id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "sender_name": sender.name if sender else "Deleted User",
        "sender_avatar": sender_profile.profile_picture if sender_profile else None,
        "sender_role": sender.role if sender else None,
        "sender_verified": sender.is_verified if sender else False,
        "message_text": message.message_text,
        "attachment_path": message.attachment_path,
        "created_at": message.created_at,
        "is_read": is_read,
        "is_deleted": message.is_deleted,
        "deleted_at": message.deleted_at.isoformat() if message.deleted_at else None,
    }


def serialize_conversation(db: Session, conv: Conversation, current_user_id: int) -> dict:
    """Helper to convert a Conversation model to a dictionary response with participants, latest message, and unread counts."""
    latest = db.query(Message).filter(Message.conversation_id == conv.conversation_id, Message.is_deleted == False).order_by(Message.created_at.desc()).first()
    latest_data = serialize_message(db, latest, current_user_id) if latest else None
    
    unread_count = db.query(Message).filter(
        Message.conversation_id == conv.conversation_id,
        Message.sender_id != current_user_id,
        Message.is_deleted == False
    ).filter(
        ~Message.message_id.in_(
            db.query(MessageRead.message_id).filter(MessageRead.user_id == current_user_id)
        )
    ).count()

    participants = []
    community_name = None
    collaboration_title = None

    if conv.conversation_type == ConversationType.direct:
        parts = db.query(ConversationParticipant).filter(ConversationParticipant.conversation_id == conv.conversation_id).all()
        for p in parts:
            # Include only the other user (or both, but we typically want participants list)
            u = db.query(User).filter(User.user_id == p.user_id).first()
            u_prof = db.query(Profile).filter(Profile.user_id == p.user_id).first()
            if u:
                participants.append({
                    "user_id": u.user_id,
                    "name": u.name,
                    "profile_picture": u_prof.profile_picture if u_prof else None,
                    "role": u.role,
                    "is_verified": u.is_verified,
                })
                
    elif conv.conversation_type == ConversationType.community:
        if conv.community:
            community_name = conv.community.community_name
            # List community members as participants
            members = db.query(CommunityMember).filter(CommunityMember.community_id == conv.community_id).limit(10).all()
            for m in members:
                u = db.query(User).filter(User.user_id == m.user_id).first()
                u_prof = db.query(Profile).filter(Profile.user_id == m.user_id).first()
                if u:
                    participants.append({
                        "user_id": u.user_id,
                        "name": u.name,
                        "profile_picture": u_prof.profile_picture if u_prof else None,
                        "role": u.role,
                        "is_verified": u.is_verified,
                    })
                    
    elif conv.conversation_type == ConversationType.collaboration:
        if conv.collaboration:
            collaboration_title = conv.collaboration.title
            # Creator
            u = db.query(User).filter(User.user_id == conv.collaboration.created_by).first()
            u_prof = db.query(Profile).filter(Profile.user_id == conv.collaboration.created_by).first()
            if u:
                participants.append({
                    "user_id": u.user_id,
                    "name": u.name,
                    "profile_picture": u_prof.profile_picture if u_prof else None,
                    "role": u.role,
                    "is_verified": u.is_verified,
                })
            # Accepted applicants
            apps = db.query(Application).filter(
                Application.collaboration_id == conv.collaboration_id,
                Application.status == ApplicationStatus.accepted
            ).all()
            for a in apps:
                au = db.query(User).filter(User.user_id == a.applicant_id).first()
                au_prof = db.query(Profile).filter(Profile.user_id == a.applicant_id).first()
                if au:
                    participants.append({
                        "user_id": au.user_id,
                        "name": au.name,
                        "profile_picture": au_prof.profile_picture if au_prof else None,
                        "role": au.role,
                        "is_verified": au.is_verified,
                    })

    elif conv.conversation_type == ConversationType.group:
        parts = db.query(ConversationParticipant).filter(ConversationParticipant.conversation_id == conv.conversation_id).all()
        for p in parts:
            u = db.query(User).filter(User.user_id == p.user_id).first()
            u_prof = db.query(Profile).filter(Profile.user_id == p.user_id).first()
            if u:
                participants.append({
                    "user_id": u.user_id,
                    "name": u.name,
                    "profile_picture": u_prof.profile_picture if u_prof else None,
                    "role": u.role,
                    "is_verified": u.is_verified,
                })

    return {
        "conversation_id": conv.conversation_id,
        "conversation_type": conv.conversation_type.value,
        "created_by": conv.created_by,
        "community_id": conv.community_id,
        "collaboration_id": conv.collaboration_id,
        "group_name": conv.group_name,
        "group_avatar": conv.group_avatar,
        "community_name": community_name,
        "collaboration_title": collaboration_title,
        "created_at": conv.created_at,
        "latest_message": latest_data,
        "unread_count": unread_count,
        "participants": participants
    }



def get_conversation_messages(
    db: Session,
    conversation_id: int,
    user: User,
    limit: int = 50,
    offset: int = 0
) -> List[dict]:
    """Retrieve message history for a conversation after verifying access."""
    # Verify access
    get_conversation_with_access(db, conversation_id, user)
    
    # Return all messages including soft-deleted so the frontend can render
    # a "This message was deleted" placeholder for is_deleted=True messages.
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id,
    ).order_by(Message.created_at.desc()).offset(offset).limit(limit).all()

    # Reverse so they are returned in chronological order
    messages.reverse()
    
    return [serialize_message(db, msg, user.user_id) for msg in messages]


def create_chat_message(
    db: Session,
    conversation_id: int,
    sender: User,
    message_text: Optional[str] = None,
    attachment_path: Optional[str] = None
) -> dict:
    """Create a new message inside a conversation."""
    if not message_text and not attachment_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Message cannot be empty"}
        )
        
    # Verify access
    conv = get_conversation_with_access(db, conversation_id, sender)
    if conv.conversation_type == ConversationType.direct:
        other_part = db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id != sender.user_id
        ).first()
        if other_part and sender.role not in ("faculty", "admin", "teacher"):
            other_user = db.query(User).filter(User.user_id == other_part.user_id).first()
            if not (other_user and other_user.role == "faculty"):
                from app.services.connection_service import are_connected
                if not are_connected(sender.user_id, other_part.user_id, db):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail={"message": "Connect with this user to start messaging."}
                    )
    
    msg = Message(
        conversation_id=conversation_id,
        sender_id=sender.user_id,
        message_text=message_text,
        attachment_path=attachment_path
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    # Mark sender's own message as read
    read_record = MessageRead(message_id=msg.message_id, user_id=sender.user_id)
    db.add(read_record)
    try:
        db.commit()
    except Exception:
        db.rollback()
        
    return serialize_message(db, msg, sender.user_id)


def delete_chat_message(db: Session, message_id: int, user: User) -> None:
    """Allow user to delete their own messages (soft delete)."""
    msg = db.query(Message).filter(Message.message_id == message_id, Message.is_deleted == False).first()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Message not found"}
        )
        
    if msg.sender_id != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "You can only delete your own messages"}
        )
        
    msg.is_deleted = True
    msg.deleted_at = datetime.utcnow()
    db.commit()


def undo_delete_chat_message(db: Session, message_id: int, user: User) -> dict:
    """Restore a soft-deleted message."""
    msg = db.query(Message).filter(Message.message_id == message_id, Message.is_deleted == True).first()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Message not found or cannot be restored"}
          )
          
    if msg.sender_id != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "You can only restore your own messages"}
        )
        
    msg.is_deleted = False
    msg.deleted_at = None
    db.commit()
    return serialize_message(db, msg, user.user_id)


def mark_message_as_read(db: Session, message_id: int, user: User) -> None:
    """Mark a specific message as read by the user."""
    msg = db.query(Message).filter(Message.message_id == message_id).first()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Message not found"}
        )
        
    # Verify user has access to conversation
    get_conversation_with_access(db, msg.conversation_id, user)
    
    # Check if already read
    existing = db.query(MessageRead).filter(
        MessageRead.message_id == message_id,
        MessageRead.user_id == user.user_id
    ).first()
    
    if not existing:
        read = MessageRead(message_id=message_id, user_id=user.user_id)
        db.add(read)
        try:
            db.commit()
        except Exception:
            db.rollback()


def mark_conversation_as_read(db: Session, conversation_id: int, user: User) -> int:
    """Mark all unread messages in a conversation as read by the user."""
    # Verify access
    get_conversation_with_access(db, conversation_id, user)
    
    # Find all unread messages
    unread_messages = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != user.user_id,
        Message.is_deleted == False
    ).filter(
        ~Message.message_id.in_(
            db.query(MessageRead.message_id).filter(MessageRead.user_id == user.user_id)
        )
    ).all()
    
    marked = 0
    for msg in unread_messages:
        read = MessageRead(message_id=msg.message_id, user_id=user.user_id)
        db.add(read)
        marked += 1
        
    if marked > 0:
        try:
            db.commit()
        except Exception:
            db.rollback()
            
    return marked


def search_chat_messages(
    db: Session,
    user: User,
    keyword: str,
    conversation_id: Optional[int] = None
) -> List[dict]:
    """Search messages containing keyword in conversations accessible to user."""
    if not keyword.strip():
        return []
        
    query = db.query(Message).filter(
        Message.message_text.like(f"%{keyword}%"),
        Message.is_deleted == False
    )
    
    if conversation_id:
        # Restrict to conversation after verifying access
        get_conversation_with_access(db, conversation_id, user)
        query = query.filter(Message.conversation_id == conversation_id)
    else:
        # Get all user's conversation IDs
        direct_ids = db.query(ConversationParticipant.conversation_id).filter(
            ConversationParticipant.user_id == user.user_id
        )
        community_ids = db.query(Conversation.conversation_id).join(
            CommunityMember, CommunityMember.community_id == Conversation.community_id
        ).filter(
            CommunityMember.user_id == user.user_id
        )
        collab_creator_ids = db.query(Conversation.conversation_id).join(
            Collaboration, Collaboration.collaboration_id == Conversation.collaboration_id
        ).filter(
            Collaboration.created_by == user.user_id
        )
        collab_applicant_ids = db.query(Conversation.conversation_id).join(
            Collaboration, Collaboration.collaboration_id == Conversation.collaboration_id
        ).join(
            Application, Application.collaboration_id == Collaboration.collaboration_id
        ).filter(
            Application.applicant_id == user.user_id,
            Application.status == ApplicationStatus.accepted
        )
        
        conv_ids = direct_ids.union(community_ids).union(collab_creator_ids).union(collab_applicant_ids).all()
        conv_ids = [c[0] for c in conv_ids]
        
        if not conv_ids:
            return []
            
        query = query.filter(Message.conversation_id.in_(conv_ids))
        
    messages = query.order_by(Message.created_at.desc()).limit(100).all()
    return [serialize_message(db, msg, user.user_id) for msg in messages]


def get_unread_counts(db: Session, user: User) -> dict:
    """Get total unread messages and total conversations with unread messages."""
    # Find all user conversation IDs
    direct_ids = db.query(ConversationParticipant.conversation_id).filter(
        ConversationParticipant.user_id == user.user_id
    )
    community_ids = db.query(Conversation.conversation_id).join(
        CommunityMember, CommunityMember.community_id == Conversation.community_id
    ).filter(
        CommunityMember.user_id == user.user_id
    )
    collab_creator_ids = db.query(Conversation.conversation_id).join(
        Collaboration, Collaboration.collaboration_id == Conversation.collaboration_id
    ).filter(
        Collaboration.created_by == user.user_id
    )
    collab_applicant_ids = db.query(Conversation.conversation_id).join(
        Collaboration, Collaboration.collaboration_id == Conversation.collaboration_id
    ).join(
        Application, Application.collaboration_id == Collaboration.collaboration_id
    ).filter(
        Application.applicant_id == user.user_id,
        Application.status == ApplicationStatus.accepted
    )
    
    conv_ids = direct_ids.union(community_ids).union(collab_creator_ids).union(collab_applicant_ids).all()
    conv_ids = [c[0] for c in conv_ids]
    
    if not conv_ids:
        return {"unread_messages": 0, "unread_conversations": 0}
        
    # Query unread messages
    unread_query = db.query(Message).filter(
        Message.conversation_id.in_(conv_ids),
        Message.sender_id != user.user_id,
        Message.is_deleted == False
    ).filter(
        ~Message.message_id.in_(
            db.query(MessageRead.message_id).filter(MessageRead.user_id == user.user_id)
        )
    )
    
    unread_messages = unread_query.count()
    
    # Count conversations that have at least one unread message
    from sqlalchemy import func
    unread_conversations = db.query(Message.conversation_id).filter(
        Message.conversation_id.in_(conv_ids),
        Message.sender_id != user.user_id,
        Message.is_deleted == False
    ).filter(
        ~Message.message_id.in_(
            db.query(MessageRead.message_id).filter(MessageRead.user_id == user.user_id)
        )
    ).group_by(Message.conversation_id).count()
    
    return {
        "unread_messages": unread_messages,
        "unread_conversations": unread_conversations
    }
