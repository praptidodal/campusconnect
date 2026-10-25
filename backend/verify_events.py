import sys
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.database import get_db, SessionLocal
from app.models.user import User, UserRole
from app.models.community import Community, CommunityMember, CommunityRole
from app.models.event import Event, EventRegistration
from app.auth.jwt_handler import create_access_token
from app.utils.hashing import hash_password

client = TestClient(app)


def setup_test_data(db: Session):
    # Clear tables
    db.query(EventRegistration).delete()
    db.query(Event).delete()
    db.query(CommunityMember).delete()
    db.query(Community).delete()
    db.query(User).filter(User.email.like("test_event_%@example.com")).delete()
    db.commit()

    # Create users
    u1 = User(
        name="Event Organizer",
        email="test_event_org@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.student.value,
    )
    u2 = User(
        name="Event Attendee",
        email="test_event_att@example.com",
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
        community_name="Events Host Club",
        description="Hosting community events",
        category="Clubs",
        created_by=u1.user_id,
    )
    db.add(comm)
    db.flush()

    member = CommunityMember(
        community_id=comm.community_id,
        user_id=u1.user_id,
        role=CommunityRole.owner,
    )
    db.add(member)
    db.commit()
    db.refresh(comm)

    return u1, u2, comm


def test_events_workflow():
    db = SessionLocal()
    try:
        print("1. Setting up test data...")
        u1, u2, comm = setup_test_data(db)

        token1 = create_access_token({"sub": str(u1.user_id)})
        token2 = create_access_token({"sub": str(u2.user_id)})

        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}

        now = datetime.now()
        start = now + timedelta(days=2)
        end = now + timedelta(days=2, hours=4)
        deadline = now + timedelta(days=1)

        print("2. Testing event creation (API 1)...")
        res = client.post(
            "/api/events",
            json={
                "title": "Bootcamp Coding Night",
                "description": "Learn backend python.",
                "category": "Workshop",
                "venue": "Lab C",
                "start_datetime": start.isoformat(),
                "end_datetime": end.isoformat(),
                "registration_deadline": deadline.isoformat(),
                "community_id": comm.community_id,
                "max_participants": 2,
            },
            headers=headers1,
        )
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.json()}"
        data = res.json()
        assert data["title"] == "Bootcamp Coding Night"
        assert data["remaining_seats"] == 2
        assert data["registered_count"] == 0
        event_id = data["event_id"]

        # Date validation check: End before start
        res_val = client.post(
            "/api/events",
            json={
                "title": "Invalid Event",
                "description": "Validation test.",
                "start_datetime": end.isoformat(),
                "end_datetime": start.isoformat(),
            },
            headers=headers1,
        )
        assert res_val.status_code == 422
        print("   Event creation and date validation passed!")

        print("3. Testing list events (API 2)...")
        res = client.get("/api/events", headers=headers2)
        assert res.status_code == 200
        assert len(res.json()) >= 1
        print("   List events passed!")

        print("4. Testing event details (API 3)...")
        res = client.get(f"/api/events/{event_id}", headers=headers2)
        assert res.status_code == 200
        data = res.json()
        assert data["organizer_name"] == "Event Organizer"
        assert data["community_name"] == "Events Host Club"
        print("   Event details passed!")

        print("5. Testing registration (API 6)...")
        # User 2 registers
        res = client.post(f"/api/events/{event_id}/register", headers=headers2)
        assert res.status_code == 200
        assert res.json()["message"] == "Registration successful"

        # Double registration prevention
        res_double = client.post(f"/api/events/{event_id}/register", headers=headers2)
        assert res_double.status_code == 400
        print("   Event registration and double-registration block passed!")

        print("6. Testing participant listing (API 8)...")
        res = client.get(f"/api/events/{event_id}/participants", headers=headers1)
        assert res.status_code == 200
        parts = res.json()
        assert len(parts) == 1
        assert parts[0]["name"] == "Event Attendee"
        assert parts[0]["registration_status"] == "registered"
        print("   Participant listing passed!")

        print("7. Testing my registrations (API 9)...")
        res = client.get("/api/events/my-registrations", headers=headers2)
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert res.json()[0]["title"] == "Bootcamp Coding Night"
        print("   My registrations list passed!")

        print("8. Testing my events list (API 10)...")
        res = client.get("/api/events/my-events", headers=headers1)
        assert res.status_code == 200
        assert len(res.json()) == 1
        print("   My hosted events list passed!")

        print("9. Testing search events (API 11)...")
        res = client.get("/api/events/search?title=Bootcamp&category=Workshop", headers=headers2)
        assert res.status_code == 200
        assert len(res.json()) == 1
        print("   Event search passed!")

        print("10. Testing cancel registration (API 7)...")
        res = client.delete(f"/api/events/{event_id}/register", headers=headers2)
        assert res.status_code == 200
        assert res.json()["message"] == "Registration cancelled"
        
        # Verify seat recovered
        res_details = client.get(f"/api/events/{event_id}", headers=headers1).json()
        assert res_details["remaining_seats"] == 2
        print("   Cancel registration passed!")

        print("11. Testing update event (API 4)...")
        res = client.put(
            f"/api/events/{event_id}",
            json={"venue": "Seminar Room D"},
            headers=headers1,
        )
        assert res.status_code == 200
        assert res.json()["venue"] == "Seminar Room D"
        print("   Update event details passed!")

        print("12. Testing delete event (API 5)...")
        res = client.delete(f"/api/events/{event_id}", headers=headers1)
        assert res.status_code == 200
        assert res.json()["message"] == "Event deleted successfully"

        # Verify not found anymore
        res_final = client.get(f"/api/events/{event_id}", headers=headers2)
        assert res_final.status_code == 404
        print("   Delete event passed!")

        print("\nAll 11 Events APIs verified successfully! 📅🎉")

    finally:
        db.close()


if __name__ == "__main__":
    test_events_workflow()
