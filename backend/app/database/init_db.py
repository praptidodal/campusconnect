from sqlalchemy import text
from app.database.database import Base, engine


def init_db():
    """Create all tables (idempotent)."""
    import app.models  # noqa: F401
    import app.models.notice  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Create requested search indexes
    queries = [
        "CREATE INDEX idx_users_name ON users(name);",
        "CREATE INDEX idx_skills_name ON skills(skill_name);",
        "CREATE INDEX idx_posts_content ON posts(content(255));",
        "CREATE INDEX idx_communities_name ON communities(community_name);",
        "CREATE INDEX idx_events_title ON events(title);",
        "CREATE INDEX idx_collaborations_title ON collaborations(title);"
    ]
    # Execute schema migrations to extend ENUM values for user role and status columns
    migrations = [
        "ALTER TABLE users MODIFY COLUMN role ENUM('student', 'faculty', 'club', 'admin', 'teacher') NOT NULL DEFAULT 'student';",
        "ALTER TABLE users MODIFY COLUMN status ENUM('active', 'suspended', 'banned') NOT NULL DEFAULT 'active';",
        "ALTER TABLE posts ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;",
        "ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;",
        "ALTER TABLE community_posts ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;",
        "ALTER TABLE community_posts ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;",
        "ALTER TABLE resources ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;",
        "ALTER TABLE resources ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;",
        "ALTER TABLE profiles ADD COLUMN avatar_is_deleted BOOLEAN NOT NULL DEFAULT FALSE;",
        "ALTER TABLE profiles ADD COLUMN avatar_deleted_at TIMESTAMP NULL DEFAULT NULL;",
        # Flow 4 — Teacher verification fields on users
        "ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE;",
        "ALTER TABLE users ADD COLUMN department VARCHAR(150) NULL;",
        "ALTER TABLE users ADD COLUMN designation VARCHAR(150) NULL;",
        "ALTER TABLE users ADD COLUMN employee_id VARCHAR(100) NULL;",
        "ALTER TABLE users ADD COLUMN office_location VARCHAR(255) NULL;",
        "ALTER TABLE users ADD COLUMN office_hours VARCHAR(255) NULL;",
        # Flow 4 — Official notices tables
        """CREATE TABLE IF NOT EXISTS official_notices (
            notice_id INT AUTO_INCREMENT PRIMARY KEY,
            teacher_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            target_audience VARCHAR(50) NOT NULL,
            reference_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (teacher_id) REFERENCES users(user_id) ON DELETE CASCADE
        );""",
        """CREATE TABLE IF NOT EXISTS notice_recipients (
            recipient_id INT AUTO_INCREMENT PRIMARY KEY,
            notice_id INT NOT NULL,
            user_id INT NOT NULL,
            notification_sent BOOLEAN DEFAULT FALSE,
            read_status BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (notice_id) REFERENCES official_notices(notice_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        );""",
        """CREATE TABLE IF NOT EXISTS password_reset_otps (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            email VARCHAR(150) NOT NULL,
            otp_hash VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            attempts INT NOT NULL DEFAULT 0,
            max_attempts INT NOT NULL DEFAULT 5,
            is_used BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_reset_otps_user (user_id),
            INDEX idx_reset_otps_email (email),
            INDEX idx_reset_otps_expires (expires_at),
            INDEX idx_reset_otps_used (is_used),
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        );""",
        """CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            is_used BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_reset_tokens_user (user_id),
            INDEX idx_reset_tokens_hash (token_hash),
            INDEX idx_reset_tokens_expires (expires_at),
            INDEX idx_reset_tokens_used (is_used),
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        );""",
    ]

    with engine.connect() as conn:
        # Set short lock timeout so migrations don't hang if tables are locked by other connections
        try:
            conn.execute(text("SET SESSION lock_wait_timeout = 1;"))
        except Exception:
            pass
            
        # Run migrations
        for m in migrations:
            try:
                conn.execute(text(m))
                try:
                    conn.commit()
                except Exception:
                    pass
            except Exception as e:
                # Silently ignore if already applied or failing due to database details
                pass

        # Run index creations
        for q in queries:
            try:
                conn.execute(text(q))
                try:
                    conn.commit()
                except Exception:
                    pass
            except Exception:
                # Ignore if index already exists
                pass
