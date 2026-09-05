from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.database import get_db
from app.core.deps import get_current_user
from app.models.event import Event
from app.models.watchlist import WatchlistItem
from app.models.user import User

router = APIRouter()


@router.get("/{watchlist_id}")
async def replay_events(
    watchlist_id: str,
    from_seq: int = Query(0),
    to_seq: int = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Return events in a seq range for the timeline replay slider.
    Frontend uses this to scrub backwards through history.
    """
    items_result = await db.execute(
        select(WatchlistItem.symbol).where(WatchlistItem.watchlist_id == watchlist_id)
    )
    symbols = [r[0] for r in items_result.all()]
    if not symbols:
        return {"events": []}

    filters = [
        Event.symbol.in_(symbols),
        Event.seq >= from_seq,
    ]
    if to_seq is not None:
        filters.append(Event.seq <= to_seq)

    events_result = await db.execute(
        select(Event)
        .where(and_(*filters))
        .order_by(Event.seq.asc())
        .limit(200)
    )
    events = events_result.scalars().all()
    return {
        "events": [
            {
                "seq": e.seq,
                "symbol": e.symbol,
                "event_type": e.event_type,
                "materiality_score": float(e.materiality_score),
                "z_score": float(e.z_score or 0),
                "volume_ratio": float(e.volume_ratio or 0),
                "price_at_event": float(e.price_at_event),
                "price_baseline": float(e.price_baseline or e.price_at_event),
                "occurred_at": e.occurred_at.isoformat(),
                "data_fresh": e.data_fresh,
                "source_conflict": e.source_conflict,
                "explanation": e.explanation,
                "yahoo_price": float(e.yahoo_price) if e.yahoo_price else None,
                "nse_price": float(e.nse_price) if e.nse_price else None,
                "divergence_pct": float(e.divergence_pct) if e.divergence_pct else None,
                "preferred_source": e.preferred_source,
            }
            for e in events
        ]
    }
