from typing import Optional, List
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from app.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.event import Event
from app.models.watchlist import Watchlist, WatchlistItem

router = APIRouter()


def _get_range_start(range_param: Optional[str]) -> datetime:
    now = datetime.now(timezone.utc)
    ist = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(ist)

    if range_param == "week":
        return now - timedelta(days=7)
    elif range_param == "month":
        return now - timedelta(days=30)
    else:  # default today
        start_of_day_ist = datetime(now_ist.year, now_ist.month, now_ist.day, tzinfo=ist)
        return start_of_day_ist.astimezone(timezone.utc)


async def _get_user_symbols(
    db: AsyncSession,
    user_id,
    watchlist_id: Optional[str] = None
) -> List[str]:
    if watchlist_id:
        result = await db.execute(
            select(WatchlistItem.symbol).where(WatchlistItem.watchlist_id == watchlist_id)
        )
        return [r[0] for r in result.all()]
    else:
        result = await db.execute(
            select(WatchlistItem.symbol)
            .join(Watchlist, WatchlistItem.watchlist_id == Watchlist.id)
            .where(Watchlist.user_id == user_id)
        )
        return [r[0] for r in result.all()]


@router.get("/event-types")
async def get_event_types_breakdown(
    range: Optional[str] = Query("today"),
    watchlist_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    symbols = await _get_user_symbols(db, user.id, watchlist_id)
    if not symbols:
        return []

    range_start = _get_range_start(range)

    result = await db.execute(
        select(Event.event_type, func.count(Event.seq))
        .where(
            and_(
                Event.symbol.in_(symbols),
                Event.occurred_at >= range_start,
            )
        )
        .group_by(Event.event_type)
        .order_by(desc(func.count(Event.seq)))
    )
    rows = result.all()
    return [{"event_type": r[0], "count": int(r[1])} for r in rows]


@router.get("/most-active")
async def get_most_active_symbol(
    range: Optional[str] = Query("today"),
    watchlist_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    symbols = await _get_user_symbols(db, user.id, watchlist_id)
    if not symbols:
        return None

    range_start = _get_range_start(range)

    result = await db.execute(
        select(Event.symbol, func.count(Event.seq).label("c"))
        .where(
            and_(
                Event.symbol.in_(symbols),
                Event.occurred_at >= range_start,
            )
        )
        .group_by(Event.symbol)
        .order_by(desc("c"))
        .limit(1)
    )
    row = result.first()
    if not row:
        return None
    return {"symbol": row[0], "event_count": int(row[1])}
