"""
run_migration_flow5.py
Run this once from the backend/ directory to apply the Flow 5 schema changes.
Usage: python run_migration_flow5.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.database import engine
from sqlalchemy import text

MIGRATIONS = [
    # ── Communities ──────────────────────────────────────────────────────────
    """ALTER TABLE communities
       ADD COLUMN approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'""",
    """ALTER TABLE communities
       ADD COLUMN approved_by INT NULL""",
    """ALTER TABLE communities
       ADD COLUMN approved_at TIMESTAMP NULL""",
    """ALTER TABLE communities
       ADD COLUMN approval_notes TEXT NULL""",

    # ── Events ───────────────────────────────────────────────────────────────
    """ALTER TABLE events
       ADD COLUMN approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'""",
    """ALTER TABLE events
       ADD COLUMN approved_by INT NULL""",
    """ALTER TABLE events
       ADD COLUMN approved_at TIMESTAMP NULL""",
    """ALTER TABLE events
       ADD COLUMN approval_notes TEXT NULL""",

    # ── Backfill existing rows as approved (so live data is not disrupted) ───
    """UPDATE communities
       SET approval_status = 'approved', approved_at = created_at
       WHERE approval_status = 'pending'""",
    """UPDATE events
       SET approval_status = 'approved', approved_at = created_at
       WHERE approval_status = 'pending'""",
]

def run():
    with engine.connect() as conn:
        for sql in MIGRATIONS:
            label = sql.strip().split('\n')[0][:80]
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"  ✓  {label}")
            except Exception as e:
                err = str(e)
                if "Duplicate column name" in err or "1060" in err:
                    print(f"  –  SKIP (column already exists): {label.split('ADD COLUMN')[-1].strip().split()[0]}")
                else:
                    print(f"  ✗  FAILED: {label}")
                    print(f"     {err}")

    print("\nMigration complete.")

if __name__ == "__main__":
    run()
