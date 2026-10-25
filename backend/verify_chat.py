import sys
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import io

from app.main import app
from app.database.database import get_db, SessionLocal
from app.models.user import User, UserRole
from app.models.community import Community, CommunityMember, CommunityRole
from app.models.collaboration import Collaboration, Application
from app.models.chat import Conversation, ConversationParticipant, Message, MessageRead
from app.auth.jwt_handler import create_access_token
from app.utils.hashing import hash_password

client = TestClient(app)


def setup_test_data(db: Session):
    # Clear tables
    db.query(MessageRead).delete()
    db.query(Message).delete()
    db.query(ConversationParticipant).delete()
    db.query(Conversation).delete()
    db.query(CommunityMember).delete()
    db.query(Community).delete()
    db.query(User).filter(User.email.like("test_chat_%@example.com")).delete()
    db.commit()

    # Create users
    u1 = User(
        name="Chat User 1",
        email="test_chat_1@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.student.value,
    )
    u2 = User(
        name="Chat User 2",
        email="test_chat_2@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.student.value,
    )
    db.add(u1)
    db.add(u2)
    db.commit()
    db.refresh(u1)
    db.refresh(u2)

    # Create community
    comm = Community(
        community_name="Chat Club",
        description="Chat testing community",
        category="Clubs",
        created_by=u1.user_id,
    )
    db.add(comm)
    db.flush()

    m1 = CommunityMember(
        community_id=comm.community_id,
        user_id=u1.user_id,
        role=CommunityRole.owner,
    )
    m2 = CommunityMember(
        community_id=comm.community_id,
        user_id=u2.user_id,
        role=CommunityRole.member,
    )
    db.add(m1)
    db.add(m2)
    db.commit()

    return u1, u2, comm


def test_chat_workflow():
    db = SessionLocal()
    try:
        print("1. Setting up test data...")
        u1, u2, comm = setup_test_data(db)

        token1 = create_access_token({"sub": str(u1.user_id)})
        token2 = create_access_token({"sub": str(u2.user_id)})

        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}

        print("2. Testing Direct Conversation creation (API 1)...")
        res = client.post(
            "/api/conversations",
            json={"conversation_type": "direct", "recipient_id": u2.user_id},
            headers=headers1,
        )
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.json()}"
        data = res.json()
        assert data["conversation_type"] == "direct"
        assert len(data["participants"]) == 2
        conv_id = data["conversation_id"]
        print("   Direct Conversation creation passed!")

        print("3. Testing Community Conversation creation (API 2)...")
        res = client.post(
            "/api/conversations",
            json={"conversation_type": "community", "community_id": comm.community_id},
            headers=headers1,
        )
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.json()}"
        data = res.json()
        assert data["conversation_type"] == "community"
        assert data["community_name"] == "Chat Club"
        comm_conv_id = data["conversation_id"]
        print("   Community Conversation creation passed!")

        print("4. Testing Send Message with Attachment (API 3)...")
        dummy_file = io.BytesIO(b"dummy attachment for chat")
        dummy_file.name = "chat_spec.txt"

        res = client.post(
            "/api/messages",
            data={
                "conversation_id": conv_id,
                "message_text": "Hello User 2! Check out the attachment.",
            },
            files={"file": ("chat_spec.txt", dummy_file, "text/plain")},
            headers=headers1,
        )
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.json()}"
        msg_data = res.json()
        assert msg_data["message_text"] == "Hello User 2! Check out the attachment."
        assert msg_data["attachment_path"] is not None
        assert msg_data["is_read"] is True  # sender's own message is read
        message_id = msg_data["message_id"]
        print("   Send Message passed!")

        print("5. Testing Get User Conversations (API 4)...")
        res = client.get("/api/conversations", headers=headers2)
        assert res.status_code == 200
        convs = res.json()
        assert len(convs) >= 1
        # Find our conversation
        my_conv = next((c for c in convs if c["conversation_id"] == conv_id), None)
        assert my_conv is not None
        assert my_conv["unread_count"] == 1
        assert my_conv["latest_message"]["message_text"] == "Hello User 2! Check out the attachment."
        print("   Get Conversations list passed!")

        print("6. Testing Get Chat History (API 5)...")
        res = client.get(f"/api/conversations/{conv_id}/messages", headers=headers2)
        assert res.status_code == 200
        msgs = res.json()
        assert len(msgs) == 1
        assert msgs[0]["message_id"] == message_id
        print("   Get Chat History passed!")

        print("7. Testing Mark Message as Read (API 6)...")
        res = client.post(f"/api/messages/{message_id}/read", headers=headers2)
        assert res.status_code == 200
        
        # Verify unread counts
        res_count = client.get("/api/conversations/unread/count", headers=headers2)
        assert res_count.status_code == 200
        assert res_count.json()["unread_messages"] == 0
        print("   Mark Message as Read and Unread Count Check passed!")

        print("8. Testing Search Messages (API 7)...")
        res = client.get("/api/messages/search?keyword=attachment", headers=headers1)
        assert res.status_code == 200
        search_results = res.json()
        assert len(search_results) == 1
        assert search_results[0]["message_id"] == message_id
        print("   Search Messages passed!")

        print("9. Testing Delete Message (API 8)...")
        res = client.delete(f"/api/messages/{message_id}", headers=headers1)
        assert res.status_code == 200
        
        # Verify deleted
        res_history = client.get(f"/api/conversations/{conv_id}/messages", headers=headers1)
        assert res_history.status_code == 200
        assert len(res_history.json()) == 0
        print("   Delete Message passed!")

        print("\nAll 8 Messaging & Chat APIs verified successfully! 🚀💬")

    finally:
        db.close()


if __name__ == "__main__":
    from app.database.init_db import init_db
    init_db()
    test_chat_workflow()
