"""
run_migration_blocks.py
Creates user_blocks table for User Blocking System.
Usage: python run_migration_blocks.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.database import engine
from sqlalchemy import text

SQL_CREATE_USER_BLOCKS = """
CREATE TABLE IF NOT EXISTS user_blocks (
    block_id INT AUTO_INCREMENT PRIMARY KEY,
    blocker_user_id INT NOT NULL,
    blocked_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blocker_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (blocker_user_id, blocked_user_id)
);
"""

def run():
    print("Starting User Blocks Database Migration...")
    with engine.connect() as conn:
        try:
            conn.execute(text(SQL_CREATE_USER_BLOCKS))
            conn.commit()
            print("  ✓  CREATE TABLE user_blocks")
        except Exception as e:
            print("  ✗  Migration failed:", e)

    print("User Blocks Migration Complete!")

if __name__ == "__main__":
    run()
