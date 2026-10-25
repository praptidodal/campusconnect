import json
import sys
import os
import urllib.request
import urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.database import engine
from sqlalchemy import text

BASE_URL = "http://127.0.0.1:8000"

def make_request(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    req_data = None
    if data is not None:
        if isinstance(data, dict):
            req_data = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        else:
            req_data = data

    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = body
        return e.code, parsed

def get_auth_token(email, password):
    status_code, resp = make_request(f"{BASE_URL}/api/auth/login", method="POST", data={"email": email, "password": password})
    if status_code == 200:
        return resp.get("access_token")
    print(f"Login failed for {email}: {status_code} {resp}")
    return None

def query_db_blocks(blocker_id, blocked_id):
    with engine.connect() as conn:
        res = conn.execute(
            text("SELECT block_id, blocker_user_id, blocked_user_id, created_at FROM user_blocks WHERE blocker_user_id = :a AND blocked_user_id = :b"),
            {"a": blocker_id, "b": blocked_id}
        ).fetchall()
        return [dict(r._mapping) for r in res]

def main():
    print("=== EMPIRICAL BLOCK / UNBLOCK & REPORT & BLOCK SYSTEM TEST ===")
    
    # 1. Login user A (student/user)
    with engine.connect() as conn:
        users = conn.execute(text("SELECT user_id, email FROM users WHERE role='student' LIMIT 2")).fetchall()
        if len(users) < 2:
            print("Need at least 2 users in DB")
            return
        u1_id, u1_email = users[0][0], users[0][1]
        u2_id, u2_email = users[1][0], users[1][1]

    print(f"User A (Blocker): ID={u1_id}, Email={u1_email}")
    print(f"User B (Target):  ID={u2_id}, Email={u2_email}")

    token = get_auth_token(u1_email, "Password@123")
    if not token:
        token = get_auth_token(u1_email, "password123")
    
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    print("\n--- TEST 1: Initial Block Status ---")
    status_code, resp = make_request(f"{BASE_URL}/api/users/{u2_id}/block-status", method="GET", headers=headers)
    print(f"GET /api/users/{u2_id}/block-status -> Status {status_code}: {resp}")

    print("\n--- TEST 2: User A Blocks User B ---")
    status_code, resp = make_request(f"{BASE_URL}/api/users/{u2_id}/block", method="POST", headers=headers)
    print(f"POST /api/users/{u2_id}/block -> Status {status_code}: {resp}")
    assert status_code == 200, f"Expected status 200, got {status_code}"

    print("Checking Database user_blocks table:")
    rows = query_db_blocks(u1_id, u2_id)
    print(f"DB user_blocks records: {rows}")
    assert len(rows) == 1, "Expected 1 row in user_blocks"

    print("\n--- TEST 3: Block Status After Blocking ---")
    status_code, resp = make_request(f"{BASE_URL}/api/users/{u2_id}/block-status", method="GET", headers=headers)
    print(f"GET /api/users/{u2_id}/block-status -> Status {status_code}: {resp}")
    assert resp.get("is_blocked") == True, "Expected is_blocked to be True"

    print("\n--- TEST 4: Direct Message Block Enforcement ---")
    status_code, resp = make_request(
        f"{BASE_URL}/api/conversations",
        method="POST",
        data={"conversation_type": "direct", "recipient_id": u2_id},
        headers=headers
    )
    print(f"POST /api/conversations (Direct Chat while blocked) -> Status {status_code}: {resp}")
    assert status_code == 403, "Expected 403 Forbidden due to block"

    print("\n--- TEST 5: User A Unblocks User B ---")
    status_code, resp = make_request(f"{BASE_URL}/api/users/{u2_id}/unblock", method="POST", headers=headers)
    print(f"POST /api/users/{u2_id}/unblock -> Status {status_code}: {resp}")
    assert status_code == 200, f"Expected status 200, got {status_code}"

    print("Checking Database user_blocks table after unblock:")
    rows = query_db_blocks(u1_id, u2_id)
    print(f"DB user_blocks records: {rows}")
    assert len(rows) == 0, "Expected 0 rows in user_blocks after unblock"

    print("\n--- TEST 6: Atomic Report & Block ---")
    status_code, resp = make_request(
        f"{BASE_URL}/api/reports/report-and-block",
        method="POST",
        data={
            "content_type": "profile",
            "content_id": u2_id,
            "reason": "harassment",
            "description": "Empirical testing report and block integration."
        },
        headers=headers
    )
    print(f"POST /api/reports/report-and-block -> Status {status_code}: {resp}")
    assert status_code == 201, "Expected 201 Created for report-and-block"

    print("Checking DB for both report and block:")
    rows = query_db_blocks(u1_id, u2_id)
    print(f"DB user_blocks records: {rows}")
    assert len(rows) == 1, "Expected 1 row in user_blocks after report-and-block"

    with engine.connect() as conn:
        reports = conn.execute(
            text("SELECT report_id, reporter_id, reported_user_id, reason, status FROM reports WHERE reporter_id = :a AND reported_user_id = :b"),
            {"a": u1_id, "b": u2_id}
        ).fetchall()
        print(f"DB reports records: {[dict(r._mapping) for r in reports]}")
        assert len(reports) >= 1, "Expected report record in DB"

    print("\n=== ALL EMPIRICAL TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    main()
