from app.database.database import engine
from sqlalchemy import text

def drop_tables():
    print("Dropping notifications tables...")
    try:
        with engine.connect() as conn:
            conn.execute(text("DROP TABLE IF EXISTS notifications;"))
            conn.execute(text("DROP TABLE IF EXISTS notification_preferences;"))
            conn.commit()
            print("Successfully dropped!")
    except Exception as e:
        print(f"Error dropping tables: {e}")

if __name__ == "__main__":
    drop_tables()
