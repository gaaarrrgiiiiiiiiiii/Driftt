from sqlalchemy import Column, BigInteger, String, Numeric, Boolean, DateTime, Integer
from app.database import Base


class Snapshot(Base):
    """
    Append-only raw quote log. Never UPDATE or DELETE rows.
    Every ingestion tick writes a new row.
    """
    __tablename__ = "snapshots"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    symbol = Column(String, nullable=False, index=True)
    source = Column(String, nullable=False)            # 'yahoo' | 'nse'
    price = Column(Numeric, nullable=False)
    volume = Column(BigInteger, nullable=True)
    fetched_at = Column(DateTime(timezone=True), nullable=False, index=True)
    market_open = Column(Boolean, default=True)
    data_age_seconds = Column(Integer, nullable=True)
    conflict_flag = Column(Boolean, default=False)
