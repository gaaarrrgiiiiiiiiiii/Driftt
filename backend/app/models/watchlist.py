import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    watchlist_id = Column(UUID(as_uuid=True), ForeignKey("watchlists.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String, nullable=False)        # e.g. 'RELIANCE.NS'
    thesis_type = Column(String, nullable=True)    # 'price_level' | 'pct_move' | 'monitoring'
    thesis_value = Column(Numeric, nullable=True)  # target price or % move
    thesis_entry = Column(Numeric, nullable=True)  # entry price for pct_move
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("watchlist_id", "symbol"),)
