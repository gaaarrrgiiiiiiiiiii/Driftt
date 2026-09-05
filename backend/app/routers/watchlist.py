import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.watchlist import Watchlist, WatchlistItem
from app.models.baseline import Baseline
from app.models.event import Event
from app.worker.yahoo import fetch_yahoo_history, build_baseline_from_history

router = APIRouter()


class WatchlistCreate(BaseModel):
    name: str


class WatchlistItemCreate(BaseModel):
    symbol: str
    thesis_type: Optional[str] = None
    thesis_value: Optional[float] = None
    thesis_entry: Optional[float] = None


@router.get("/")
async def list_watchlists(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Watchlist).where(Watchlist.user_id == user.id)
    )
    watchlists = result.scalars().all()
    return [{"id": str(w.id), "name": w.name} for w in watchlists]


@router.post("/")
async def create_watchlist(
    req: WatchlistCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    wl = Watchlist(user_id=user.id, name=req.name)
    db.add(wl)
    await db.commit()
    await db.refresh(wl)
    return {"id": str(wl.id), "name": wl.name}


@router.get("/{watchlist_id}/items")
async def list_items(
    watchlist_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WatchlistItem).where(WatchlistItem.watchlist_id == watchlist_id)
    )
    items = result.scalars().all()
    return [
        {
            "id": str(i.id), "symbol": i.symbol,
            "thesis_type": i.thesis_type, "thesis_value": float(i.thesis_value) if i.thesis_value else None,
            "thesis_entry": float(i.thesis_entry) if i.thesis_entry else None,
        }
        for i in items
    ]


@router.post("/{watchlist_id}/items")
async def add_item(
    watchlist_id: str,
    req: WatchlistItemCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = WatchlistItem(
        watchlist_id=uuid.UUID(watchlist_id),
        symbol=req.symbol.upper(),
        thesis_type=req.thesis_type,
        thesis_value=req.thesis_value,
        thesis_entry=req.thesis_entry,
    )
    db.add(item)
    try:
        await db.commit()
        await db.refresh(item)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Symbol already in watchlist")

    # Baseline backfill when a real user adds a new symbol
    try:
        baseline = await db.get(Baseline, item.symbol)
        if not baseline:
            history = await fetch_yahoo_history(item.symbol, days=30)
            baseline = build_baseline_from_history(item.symbol, history)
            db.add(baseline)
            await db.commit()
    except Exception:
        pass

    return {"id": str(item.id), "symbol": item.symbol}


@router.delete("/{watchlist_id}/items/{item_id}")
async def remove_item(
    watchlist_id: str,
    item_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await db.execute(
        delete(WatchlistItem).where(WatchlistItem.id == item_id)
    )
    await db.commit()
    return {"status": "deleted"}


@router.get("/{watchlist_id}/sparklines")
async def get_watchlist_sparklines(
    watchlist_id: str,
    range: str = "all",
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import and_

    # Date filter matching the feed's range options
    now_utc = datetime.now(timezone.utc)
    ist = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(ist)

    if range == "today":
        start_of_day_ist = datetime(now_ist.year, now_ist.month, now_ist.day, tzinfo=ist)
        range_start = start_of_day_ist.astimezone(timezone.utc)
    elif range == "week":
        range_start = now_utc - timedelta(days=7)
    elif range == "month":
        range_start = now_utc - timedelta(days=30)
    else:  # 'all' — full historical trend from seed data
        range_start = None

    items_result = await db.execute(
        select(WatchlistItem.symbol).where(WatchlistItem.watchlist_id == watchlist_id)
    )
    symbols = [r[0] for r in items_result.all()]
    if not symbols:
        return {}

    sparklines = {}
    for sym in symbols:
        filters = [Event.symbol == sym]
        if range_start:
            filters.append(Event.occurred_at >= range_start)
        res = await db.execute(
            select(Event.materiality_score, Event.occurred_at)
            .where(and_(*filters))
            .order_by(Event.occurred_at.desc())
            .limit(50)  # up to 50 points per symbol for the chart
        )
        rows = res.all()
        # Return in chronological order (oldest to newest) for line chart
        sparklines[sym] = [
            {"score": float(r[0]), "occurred_at": r[1].isoformat()}
            for r in reversed(rows)
        ]

    return sparklines
