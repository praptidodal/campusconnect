import sys
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.main import app
from app.database.database import get_db, SessionLocal
from app.models.user import User, UserRole
from app.models.profile import Profile, Skill, UserSkill
from app.models.follow import Follower
from app.models.post import Post, Like, Comment
from app.models.community import Community, CommunityMember
from app.models.event import Event, EventRegistration
from app.models.collaboration import Collaboration, Application
from app.models.search import SearchHistory
from app.auth.jwt_handler import create_access_token
from app.utils.hashing import hash_password
from app.database.init_db import init_db

client = TestClient(app)


def setup_search_test_data(db: Session):
    # 1. Clean up old search data
    db.query(SearchHistory).delete()
    db.query(UserSkill).delete()
    db.query(Skill).delete()
    db.query(Follower).delete()
    db.query(Like).delete()
    db.query(Comment).delete()
    db.query(Post).delete()
    db.query(CommunityMember).delete()
    db.query(Community).delete()
    db.query(EventRegistration).delete()
    db.query(Event).delete()
    db.query(Application).delete()
    db.query(Collaboration).delete()
    db.query(Profile).delete()
    db.query(User).filter(User.email.like("test_search_%@example.com")).delete()
    db.commit()

    # 2. Create index check
    init_db()

    # 3. Create test users
    u1 = User(
        name="Test Search User One",
        email="test_search_one@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.student.value,
    )
    u2 = User(
        name="Test Search User Two",
        email="test_search_two@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.student.value,
    )
    db.add(u1)
    db.add(u2)
    db.commit()
    db.refresh(u1)
    db.refresh(u2)

    # 4. Create profiles
    p1 = Profile(
        user_id=u1.user_id,
        bio="Interested in React coding and web design",
        department="Computer Science",
        year_of_study="3rd",
        profile_picture="/avatar1.png"
    )
    p2 = Profile(
        user_id=u2.user_id,
        bio="Love Python programming and systems architecture",
        department="Mechanical Engineering",
        year_of_study="4th",
        profile_picture="/avatar2.png"
    )
    db.add(p1)
    db.add(p2)
    db.commit()

    # 5. Create skills & Junction
    skill_react = Skill(skill_name="React")
    skill_python = Skill(skill_name="Python")
    db.add(skill_react)
    db.add(skill_python)
    db.commit()
    db.refresh(skill_react)
    db.refresh(skill_python)

    # Link Python to User 1 and React to User 2
    us1 = UserSkill(user_id=u1.user_id, skill_id=skill_python.skill_id)
    us2 = UserSkill(user_id=u2.user_id, skill_id=skill_react.skill_id)
    db.add(us1)
    db.add(us2)
    db.commit()

    # 6. Create posts
    post1 = Post(
        user_id=u1.user_id,
        content="Let's learn React together in CampusConnect!",
        visibility="public"
    )
    post2 = Post(
        user_id=u2.user_id,
        content="Python is also awesome for scripts.",
        visibility="public"
    )
    db.add(post1)
    db.add(post2)
    db.commit()

    # 7. Create community
    c1 = Community(
        community_name="React Club",
        description="Testing search features in React",
        category="Clubs",
        created_by=u1.user_id,
    )
    db.add(c1)
    db.commit()
    db.refresh(c1)

    cm = CommunityMember(community_id=c1.community_id, user_id=u1.user_id, role="owner")
    db.add(cm)
    db.commit()

    # 8. Create event
    e1 = Event(
        title="React Workshop",
        description="Introductory class to React hooks",
        category="Interest Groups",
        venue="Lab 4",
        start_datetime=datetime.now() + timedelta(days=2),
        end_datetime=datetime.now() + timedelta(days=2, hours=2),
        organizer_id=u1.user_id,
        community_id=c1.community_id
    )
    db.add(e1)
    db.commit()

    # 9. Create collaboration
    col1 = Collaboration(
        title="React App Dev Opportunity",
        description="Build a web app using React and FastAPI",
        category="Hackathons",
        required_skills="React, JS",
        created_by=u2.user_id,
        status="open"
    )
    db.add(col1)
    db.commit()

    return u1, u2


def test_search_workflow():
    db = SessionLocal()
    try:
        print("1. Setting up search test data...")
        u1, u2 = setup_search_test_data(db)

        token1 = create_access_token({"sub": str(u1.user_id)})
        token2 = create_access_token({"sub": str(u2.user_id)})
        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}

        # ----------------------------------------------------------------------
        # Test 1: Recent searches empty initially
        # ----------------------------------------------------------------------
        print("2. Verifying recent searches is empty initially...")
        res = client.get("/api/search/recent", headers=headers1)
        assert res.status_code == 200
        assert len(res.json()) == 0

        # ----------------------------------------------------------------------
        # Test 1b: Preview suggestions should not log to history
        # ----------------------------------------------------------------------
        print("2b. Verifying suggest=true does not record search history...")
        res = client.get("/api/search?q=ReactPreview&suggest=true", headers=headers1)
        assert res.status_code == 200
        res = client.get("/api/search/recent", headers=headers1)
        assert len(res.json()) == 0, f"Expected 0 history items, got {len(res.json())}"

        # ----------------------------------------------------------------------
        # Test 2: Global Search Overview (API 1)
        # ----------------------------------------------------------------------
        print("3. Testing Global Search Overview API...")
        res = client.get("/api/search?q=React", headers=headers1)
        assert res.status_code == 200, f"Global search failed: {res.text}"
        data = res.json()

        # Should match User Two (has React skill)
        assert any(u["user_id"] == u2.user_id for u in data["users"]), "User Two not found in users list"
        # Should match Post 1 ("React together")
        assert len(data["posts"]) > 0
        assert "React" in data["posts"][0]["content_preview"]
        # Should match Community 1 ("React Club")
        assert any(c["community_name"] == "React Club" for c in data["communities"])
        # Should match Event 1 ("React Workshop")
        assert any(e["title"] == "React Workshop" for e in data["events"])
        # Should match Collaboration 1 ("React App Dev Opportunity")
        assert any(col["title"] == "React App Dev Opportunity" for col in data["collaborations"])
        print("   Global search passed!")

        # ----------------------------------------------------------------------
        # Test 3: Recent search updated automatically
        # ----------------------------------------------------------------------
        print("4. Verifying search query logged to search history...")
        res = client.get("/api/search/recent", headers=headers1)
        assert len(res.json()) == 1
        assert res.json()[0]["search_query"] == "React"

        # ----------------------------------------------------------------------
        # Test 4: Specialized Search: Users (API 2)
        # ----------------------------------------------------------------------
        print("5. Testing User Search with pagination and sorting...")
        # Search by skill matching
        res = client.get("/api/search/users?q=React&page=1&limit=10", headers=headers1)
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert res.json()[0]["user_id"] == u2.user_id
        assert "React" in res.json()[0]["skills"]

        # Search by name match, sorting
        res = client.get("/api/search/users?q=Search&sort_by=name&order=desc", headers=headers1)
        assert res.status_code == 200
        # Ordered Test Search User Two, then Test Search User One
        names = [u["name"] for u in res.json()]
        assert names == ["Test Search User Two", "Test Search User One"], f"Ordering failed: {names}"
        print("   User search passed!")

        # ----------------------------------------------------------------------
        # Test 5: Specialized Search: Skills (API 3)
        # ----------------------------------------------------------------------
        print("6. Testing Skills Search...")
        res = client.get("/api/search/skills?q=React", headers=headers1)
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert res.json()[0]["skill_name"] == "React"
        assert res.json()[0]["users_count"] == 1
        assert res.json()[0]["related_users"][0]["user_id"] == u2.user_id
        print("   Skills search passed!")

        # ----------------------------------------------------------------------
        # Test 6: Specialized Search: Posts, Communities, Events, Collabs
        # ----------------------------------------------------------------------
        print("7. Testing Posts, Communities, Events, and Collaboration Searches...")
        # Posts search (API 4)
        res = client.get("/api/search/posts?q=React", headers=headers1)
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert "React" in res.json()[0]["content_preview"]

        # Communities search (API 5)
        res = client.get("/api/search/communities?q=React&category=Clubs", headers=headers1)
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert res.json()[0]["community_name"] == "React Club"

        # Events search (API 6)
        res = client.get("/api/search/events?q=React&category=Interest+Groups", headers=headers1)
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert res.json()[0]["title"] == "React Workshop"

        # Collaborations search (API 7)
        res = client.get("/api/search/collaborations?q=React&status=open", headers=headers1)
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert res.json()[0]["title"] == "React App Dev Opportunity"
        print("   Specialized searches passed!")

        # ----------------------------------------------------------------------
        # Test 7: Trending (API 8)
        # ----------------------------------------------------------------------
        print("8. Testing Trending API...")
        res = client.get("/api/search/trending", headers=headers1)
        assert res.status_code == 200
        trend = res.json()
        assert any(s["skill_name"] == "React" for s in trend["skills"])
        assert any(c["community_name"] == "React Club" for c in trend["communities"])
        assert any(e["title"] == "React Workshop" for e in trend["events"])
        assert any(col["title"] == "React App Dev Opportunity" for col in trend["collaborations"])
        print("   Trending API passed!")

        # ----------------------------------------------------------------------
        # Test 8: Search History Unique & Capped at 10 items
        # ----------------------------------------------------------------------
        print("9. Testing search history limit of 10 items and deduplication...")
        # Search 12 distinct queries
        for i in range(12):
            client.get(f"/api/search?q=Query{i}", headers=headers1)

        # Get recent searches
        res = client.get("/api/search/recent", headers=headers1)
        recent_queries = res.json()
        assert len(recent_queries) == 10, f"Expected history size 10, got {len(recent_queries)}"
        
        # Check that Query0 and Query1 were evicted (Query11 is newest, Query2 is oldest in list)
        queries_list = [h["search_query"] for h in recent_queries]
        assert "Query11" in queries_list
        assert "Query0" not in queries_list
        assert "Query1" not in queries_list

        # Search Query5 again (duplicate check)
        client.get("/api/search?q=Query5", headers=headers1)
        res = client.get("/api/search/recent", headers=headers1)
        queries_list = [h["search_query"] for h in res.json()]
        assert len(queries_list) == 10
        # Query5 must be at the very front now (newest)
        assert queries_list[0] == "Query5"
        print("   Search History cap & deduplication passed!")

        # ----------------------------------------------------------------------
        # Test 9: Clear Search History (API 10)
        # ----------------------------------------------------------------------
        print("10. Testing clear search history...")
        res = client.delete("/api/search/recent", headers=headers1)
        assert res.status_code == 200
        
        res = client.get("/api/search/recent", headers=headers1)
        assert len(res.json()) == 0
        print("    Clear search history passed!")

        print("\nAll 10 Global Search & Discovery APIs verified successfully! 🚀💼")

    except AssertionError as e:
        print(f"\nAssertion Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected Error: {e}")
        sys.exit(1)
    finally:
        # Clean up database test records
        db.query(SearchHistory).delete()
        db.query(UserSkill).delete()
        db.query(Skill).delete()
        db.query(Follower).delete()
        db.query(Like).delete()
        db.query(Comment).delete()
        db.query(Post).delete()
        db.query(CommunityMember).delete()
        db.query(Community).delete()
        db.query(EventRegistration).delete()
        db.query(Event).delete()
        db.query(Application).delete()
        db.query(Collaboration).delete()
        db.query(Profile).delete()
        db.query(User).filter(User.email.like("test_search_%@example.com")).delete()
        db.commit()
        db.close()


if __name__ == "__main__":
    test_search_workflow()
