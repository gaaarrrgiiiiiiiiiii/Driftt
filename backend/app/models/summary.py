from sqlalchemy import Column, Date, Integer, Text, DateTime, func
from app.database import Base


class DailySummary(Base):
    __tablename__ = "daily_summaries"

    date = Column(Date, primary_key=True)
    event_count = Column(Integer, nullable=False)
    text = Column(Text, nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
