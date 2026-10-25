import asyncio
import json
from typing import List, Optional
from pydantic import BaseModel
from jose import jwt

from fastapi import (
    APIRouter,
    Depends,
    WebSocket,
    WebSocketDisconnect,
    Query,
    status,
    File,
    UploadFile,
    Form,
    HTTPException,
)
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.auth.jwt_handler import get_current_user, SECRET_KEY, ALGORITHM
from app.models.user import User
from app.models.chat import Message
from app.schemas.chat import (
    ChatMessageResponse,
    ConversationResponse,
    UnreadCountsResponse,
    GroupCreateBody,
)
from app.services import chat_service

router = APIRouter(tags=["Messaging & Chat"])


# ── WebSocket Connection Manager ──────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        # Maps conversation_id -> list of (user_id, WebSocket) tuples
        self.active_connections: dict[int, list[tuple[int, WebSocket]]] = {}

    async def connect(self, conversation_id: int, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append((user_id, websocket))
        print(f"[WS] Connection added: conversation_id={conversation_id}, user_id={user_id}, total_connections_for_room={len(self.active_connections[conversation_id])}, active_rooms={list(self.active_connections.keys())}")

    def disconnect(self, conversation_id: int, user_id: int, websocket: WebSocket):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id] = [
                conn for conn in self.active_connections[conversation_id] if conn[1] != websocket
            ]
            print(f"[WS] Connection removed: conversation_id={conversation_id}, user_id={user_id}, remaining_connections_for_room={len(self.active_connections[conversation_id])}")
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

    async def broadcast_message(self, conversation_id: int, payload: dict):
        print(f"[WS] Broadcast request: conversation_id={conversation_id}, payload_type={payload.get('type')}, active_connections_in_room={len(self.active_connections.get(conversation_id, []))}")
        if conversation_id in self.active_connections:
            for uid, ws in self.active_connections[conversation_id]:
                try:
                    await ws.send_json(payload)
                    print(f"[WS] Sent payload to user_id={uid}")
                except Exception as e:
                    print(f"[WS] Failed to send payload to user_id={uid}: {e}")
                    pass


manager = ConnectionManager()


# ── REST Schema Payloads ──────────────────────────────────────────────────────

class ConversationCreateBody(BaseModel):
    conversation_type: str
    recipient_id: Optional[int] = None
    community_id: Optional[int] = None
    collaboration_id: Optional[int] = None
    from_faculty_directory: Optional[bool] = False


# ── REST API Endpoints ────────────────────────────────────────────────────────

@router.post("/api/conversations", response_model=ConversationResponse, status_code=201)
def create_or_get_conversation_endpoint(
    payload: ConversationCreateBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start or retrieve a direct message, community chat, or collaboration chat."""
    conv = chat_service.get_or_create_conversation(
        db=db,
        conversation_type=payload.conversation_type,
        current_user=current_user,
        recipient_id=payload.recipient_id,
        community_id=payload.community_id,
        collaboration_id=payload.collaboration_id,
        from_faculty_directory=payload.from_faculty_directory,
    )
    return chat_service.serialize_conversation(db, conv, current_user.user_id)


@router.post("/api/conversations/group", response_model=ConversationResponse, status_code=201)
def create_group_conversation_endpoint(
    payload: GroupCreateBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new group conversation with connected members only."""
    conv = chat_service.create_group_conversation(
        db=db,
        current_user=current_user,
        group_name=payload.group_name,
        member_ids=payload.member_ids,
        group_avatar=payload.group_avatar,
    )
    return chat_service.serialize_conversation(db, conv, current_user.user_id)



@router.get("/api/conversations", response_model=List[ConversationResponse])
def get_user_conversations_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's list of conversations with latest message activity."""
    return chat_service.get_user_conversations(db, current_user)


@router.get("/api/conversations/unread/count", response_model=UnreadCountsResponse)
def get_unread_counts_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve aggregate unread messages and unread conversations count."""
    return chat_service.get_unread_counts(db, current_user)


@router.get("/api/conversations/{conversation_id}/messages", response_model=List[ChatMessageResponse])
def get_conversation_messages_endpoint(
    conversation_id: int,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve paginated message history for a conversation."""
    return chat_service.get_conversation_messages(
        db=db,
        conversation_id=conversation_id,
        user=current_user,
        limit=limit,
        offset=offset,
    )


@router.post("/api/conversations/{conversation_id}/read", response_model=dict)
async def mark_conversation_read_endpoint(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all unread messages in a conversation as read by the user."""
    marked = chat_service.mark_conversation_as_read(db, conversation_id, current_user)
    # Broadcast read all event
    await manager.broadcast_message(conversation_id, {
        "type": "read_all",
        "user_id": current_user.user_id
    })
    return {"message": f"Marked {marked} messages as read"}


@router.post("/api/messages", response_model=ChatMessageResponse, status_code=201)
async def create_message_endpoint(
    conversation_id: int = Form(...),
    message_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a new message with optional local attachment."""
    attachment_path = None
    if file:
        attachment_path = await chat_service.save_chat_attachment(file)
        
    created_msg = chat_service.create_chat_message(
        db=db,
        conversation_id=conversation_id,
        sender=current_user,
        message_text=message_text,
        attachment_path=attachment_path,
    )
    
    # Broadcast to WebSocket clients
    await manager.broadcast_message(conversation_id, {
        "type": "message",
        "message": created_msg
    })
    
    return created_msg


@router.post("/api/messages/{message_id}/read", response_model=dict)
async def mark_message_read_endpoint(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a specific message as read by the user."""
    chat_service.mark_message_as_read(db, message_id, current_user)
    msg = db.query(Message).filter(Message.message_id == message_id).first()
    if msg:
        await manager.broadcast_message(msg.conversation_id, {
            "type": "read",
            "message_id": message_id,
            "user_id": current_user.user_id
        })
    return {"message": "Message marked as read"}


@router.delete("/api/messages/{message_id}", response_model=dict)
async def delete_message_endpoint(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft-delete a user's own message and notify all conversation participants."""
    msg = db.query(Message).filter(Message.message_id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail={"message": "Message not found"})

    conversation_id = msg.conversation_id
    chat_service.delete_chat_message(db, message_id, current_user)

    # Re-fetch so deleted_at is populated, then broadcast the full updated message
    db.refresh(msg)
    deleted_msg_data = chat_service.serialize_message(db, msg, current_user.user_id)
    await manager.broadcast_message(conversation_id, {
        "type": "message_deleted",
        "message": deleted_msg_data
    })
    return {"message": "Message deleted successfully"}


@router.post("/api/messages/{message_id}/undo", response_model=dict)
async def undo_delete_message_endpoint(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Restore a soft-deleted message and notify all conversation participants."""
    msg = db.query(Message).filter(Message.message_id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail={"message": "Message not found"})

    conversation_id = msg.conversation_id
    restored_msg = chat_service.undo_delete_chat_message(db, message_id, current_user)

    # Broadcast the fully restored message to all participants via WebSocket
    await manager.broadcast_message(conversation_id, {
        "type": "message_restored",
        "message": restored_msg
    })
    return {"message": "Message restored successfully"}


@router.get("/api/messages/search", response_model=List[ChatMessageResponse])
def search_messages_endpoint(
    keyword: str = Query(...),
    conversation_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search for keywords within messages user has access to."""
    return chat_service.search_chat_messages(db, current_user, keyword, conversation_id)


# ── WebSocket Endpoint ────────────────────────────────────────────────────────

@router.websocket("/ws/chat/{conversation_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    conversation_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """Real-time chat endpoint via WebSockets."""
    # Verify auth
    user = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id:
            user = db.query(User).filter(User.user_id == int(user_id)).first()
    except Exception:
        pass

    if not user or user.status in ["suspended", "banned"]:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Verify conversation access
    try:
        chat_service.get_conversation_with_access(db, conversation_id, user)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Accept connection and track in connection manager
    await manager.connect(conversation_id, user.user_id, websocket)

    try:
        while True:
            # Wait for text from WebSocket
            data = await websocket.receive_text()
            try:
                msg_payload = json.loads(data)
                text = msg_payload.get("message_text")
                if text and text.strip():
                    created_msg = chat_service.create_chat_message(
                        db=db,
                        conversation_id=conversation_id,
                        sender=user,
                        message_text=text.strip(),
                    )
                    
                    broadcast_payload = {
                        "type": "message",
                        "message": created_msg
                    }
                    await manager.broadcast_message(conversation_id, broadcast_payload)
            except json.JSONDecodeError:
                pass
            except Exception as e:
                # Send error payload if message creation/access verification fails
                try:
                    await websocket.send_json({"error": str(e)})
                except Exception:
                    pass
    except WebSocketDisconnect:
        manager.disconnect(conversation_id, user.user_id, websocket)
