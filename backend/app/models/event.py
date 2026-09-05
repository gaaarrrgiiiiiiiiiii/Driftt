from sqlalchemy import Column, BigInteger, String, Numeric, Boolean, DateTime, Text
from app.database import Base


class Event(Base):
    """
    Append-only scored change events.
    One row per (symbol, event_type) per IST calendar day (enforced by DB index).
    Never UPDATE or DELETE rows.
    """
    __tablename__ = "events"

    seq = Column(BigInteger, primary_key=True, autoincrement=True)
    symbol = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False)
    # 'price_spike' | 'volume_surge' | 'volatility_breakout' | 'thesis_crossed'

    materiality_score = Column(Numeric, nullable=False)
    z_score = Column(Numeric, nullable=True)
    volume_ratio = Column(Numeric, nullable=True)
    price_at_event = Column(Numeric, nullable=False)
    price_baseline = Column(Numeric, nullable=True)
    explanation = Column(Text, nullable=True)          # optional LLM one-liner

    occurred_at = Column(DateTime(timezone=True), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    data_fresh = Column(Boolean, default=True)
    source_conflict = Column(Boolean, default=False)

    # Bug 3 fix: conflict prices stored on the event row so UI can show both
    # values without a separate join. NULL when sources agreed.
    yahoo_price = Column(Numeric, nullable=True)
    nse_price = Column(Numeric, nullable=True)
    divergence_pct = Column(Numeric, nullable=True)
    preferred_source = Column(String, nullable=True)   # 'yahoo' | 'nse'

    # Note: the daily dedup unique index
    #   CREATE UNIQUE INDEX ix_events_symbol_type_day
    #   ON events (symbol, event_type, DATE(occurred_at AT TIME ZONE 'Asia/Kolkata'));
    # is added manually in the Alembic migration (Alembic cannot auto-generate
    # functional indexes with AT TIME ZONE expressions).
