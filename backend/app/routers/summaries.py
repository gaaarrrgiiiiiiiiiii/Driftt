import logging
from datetime import date, datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.summary import DailySummary
from app.worker.daily_summary import generate_daily_summary

logger = logging.getLogger(__name__)

router = APIRouter()
admin_router = APIRouter()


@router.get("/{target_date}")
async def get_summary(
    target_date: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch daily summary for a calendar date (YYYY-MM-DD).
    Returns 404 if summary has not been generated yet.
    """
    try:
        parsed_date = datetime.strptime(target_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    result = await db.execute(
        select(DailySummary).where(DailySummary.date == parsed_date)
    )
    summary = result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not generated yet")

    return {
        "date": summary.date.isoformat(),
        "event_count": summary.event_count,
        "text": summary.text,
    }


@router.post("/generate")
@admin_router.post("/generate")
async def trigger_generate_summary(
    date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Manual trigger for demo and testing (no auth required).
    Generates or regenerates daily summary for the given date (default today).
    """
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    else:
        ist = timezone(timedelta(hours=5, minutes=30))
        target_date = datetime.now(ist).date()

    await generate_daily_summary(target_date)

    result = await db.execute(
        select(DailySummary).where(DailySummary.date == target_date)
    )
    summary = result.scalar_one_or_none()

    return {
        "status": "generated",
        "date": target_date.isoformat(),
        "event_count": summary.event_count if summary else 0,
        "text": summary.text if summary else None,
    }
