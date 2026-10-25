"""
run_migration_flow6.py
Run this script to execute Enhancement Flow 6 Database Schema updates.
Usage: python run_migration_flow6.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.database import engine
from sqlalchemy import text

MIGRATION_STEPS = [
    # 1. Update users table with warning_count and account_status
    """
    ALTER TABLE users
    ADD COLUMN warning_count INT DEFAULT 0;
    """,
    """
    ALTER TABLE users
    ADD COLUMN account_status ENUM('active', 'suspended', 'banned') DEFAULT 'active';
    """,

    # 2. Sync existing status column to account_status if needed
    """
    UPDATE users
    SET account_status = CASE
        WHEN status = 'suspended' THEN 'suspended'
        WHEN status = 'banned' THEN 'banned'
        ELSE 'active'
    END;
    """,

    # 3. Drop existing reports table if incompatible structure exists, or create fresh
    """
    DROP TABLE IF EXISTS moderation_logs;
    """,
    """
    DROP TABLE IF EXISTS reports;
    """,

    # 4. Create reports table with exact specified schema
    """
    CREATE TABLE reports (
        report_id INT AUTO_INCREMENT PRIMARY KEY,
        reporter_id INT NOT NULL,
        reported_user_id INT NULL,
        content_type ENUM('post', 'comment', 'message', 'community', 'event', 'profile') NOT NULL,
        content_id INT NOT NULL,
        reason ENUM('spam', 'harassment', 'hate_speech', 'fake_information', 'violence', 'copyright', 'other') NOT NULL,
        description TEXT NULL,
        status ENUM('pending', 'reviewing', 'resolved', 'dismissed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_by INT NULL,
        reviewed_at TIMESTAMP NULL,
        FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (reported_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
        FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
    );
    """,

    # 5. Create moderation_logs table with exact specified schema
    """
    CREATE TABLE moderation_logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        report_id INT NULL,
        user_id INT NULL,
        action ENUM(
            'warning',
            'suspend',
            'unsuspend',
            'ban',
            'unban',
            'delete_post',
            'delete_comment',
            'delete_message',
            'delete_event',
            'delete_community',
            'dismiss_report'
        ) NOT NULL,
        reason TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (report_id) REFERENCES reports(report_id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
    );
    """
]

def run():
    print("Starting Flow 6 Database Migration...")
    with engine.connect() as conn:
        for sql in MIGRATION_STEPS:
            clean_sql = sql.strip()
            label = clean_sql.split('\n')[0][:80]
            try:
                conn.execute(text(clean_sql))
                conn.commit()
                print(f"  ✓  {label}")
            except Exception as e:
                err = str(e)
                if "Duplicate column name" in err or "1060" in err:
                    print(f"  –  SKIP (column already exists): {label}")
                else:
                    print(f"  ✗  ERROR on: {label}")
                    print(f"     Details: {err}")

    print("\nFlow 6 Migration Complete!")

if __name__ == "__main__":
    run()
