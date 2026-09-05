from sqlalchemy import Column, BigInteger, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class SeenCursor(Base):
    """
    Per-user, per-watchlist sequence cursor.
    Stores a seq number (not a timestamp) for race-safe multi-device consistency.
    Bug 6 fix: initialised to max(events.seq) on first visit, not 0.
    """
    __tablename__ = "seen_cursors"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    watchlist_id = Column(UUID(as_uuid=True), ForeignKey("watchlists.id", ondelete="CASCADE"), primary_key=True)
    last_seen_seq = Column(BigInteger, default=0)
    seen_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
