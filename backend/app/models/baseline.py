from sqlalchemy import Column, String, Integer, Numeric, BigInteger, DateTime, Date, func
from app.database import Base


class Baseline(Base):
    """
    Welford online state per symbol.
    Updated incrementally — never recomputed from raw data.
    """
    __tablename__ = "baselines"

    symbol = Column(String, primary_key=True)
    session_count = Column(Integer, default=0)
    mean_return = Column(Numeric, default=0)
    m2_return = Column(Numeric, default=0)         # Welford M2 accumulator
    stddev_return = Column(Numeric, default=0)     # cached √(M2 / n-1)
    mean_volume = Column(BigInteger, default=0)    # EOD-only mean (Bug 4 fix)
    last_close = Column(Numeric, nullable=True)
    last_session_date = Column(Date, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
