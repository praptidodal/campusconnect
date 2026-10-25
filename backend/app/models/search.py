from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from app.database.database import Base


class SearchHistory(Base):
    __tablename__ = "search_history"

    search_id    = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    search_query = Column(String(255), nullable=False)
    created_at   = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<SearchHistory id={self.search_id} user_id={self.user_id} query={self.search_query}>"
