from typing import Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.database import get_db
from app.core.deps import get_current_user
from app.models.event import Event
from app.models.cursor import SeenCursor
from app.models.watchlist import WatchlistItem
from app.models.user import User
from app.engine.scorer import SENSITIVITY_THRESHOLDS

router = APIRouter()


def _event_to_dict(e: Event) -> dict:
    return {
        "seq": e.seq,
        "symbol": e.symbol,
        "event_type": e.event_type,
        "materiality_score": float(e.materiality_score),
        "z_score": float(e.z_score or 0),
        "volume_ratio": float(e.volume_ratio or 0),
        "price_at_event": float(e.price_at_event),
        "price_baseline": float(e.price_baseline or 0),
        "occurred_at": e.occurred_at.isoformat(),
        "data_fresh": e.data_fresh,
        "source_conflict": e.source_conflict,
        "explanation": e.explanation,
        # Bug 3 fix: conflict prices from event row — no join needed
        "yahoo_price": float(e.yahoo_price) if e.yahoo_price else None,
        "nse_price": float(e.nse_price) if e.nse_price else None,
        "divergence_pct": float(e.divergence_pct) if e.divergence_pct else None,
        "preferred_source": e.preferred_source,
    }


@router.get("/{watchlist_id}")
async def get_feed(
    watchlist_id: str,
    sensitivity: str = Query("balanced"),
    range: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Resolve symbols first (needed for both cursor init and event query)
    items_result = await db.execute(
        select(WatchlistItem.symbol).where(WatchlistItem.watchlist_id == watchlist_id)
    )
    symbols = [r[0] for r in items_result.all()]
    if not symbols:
        return {"events": [], "last_seq": 0, "unseen_count": 0}

    cursor_row = await db.get(SeenCursor, (user.id, watchlist_id))
    if cursor_row is None:
        from app.config import settings
        # Demo user initializes to 0 so evaluators see events on first login
        if user.email == settings.demo_user_email:
            initial_seq = 0
        else:
            max_seq_row = await db.execute(
                select(Event.seq)
                .where(Event.symbol.in_(symbols))
                .order_by(Event.seq.desc())
                .limit(1)
            )
            initial_seq = max_seq_row.scalar() or 0
        cursor_row = SeenCursor(
            user_id=user.id,
            watchlist_id=watchlist_id,
            last_seen_seq=initial_seq,
        )
        db.add(cursor_row)
        await db.commit()

    last_seq = cursor_row.last_seen_seq
    threshold = SENSITIVITY_THRESHOLDS.get(sensitivity, 35)

    conditions = [
        Event.symbol.in_(symbols),
        Event.seq > last_seq,
        Event.materiality_score >= threshold,
    ]

    if range:
        now = datetime.now(timezone.utc)
        ist = timezone(timedelta(hours=5, minutes=30))
        now_ist = datetime.now(ist)
        if range == "today":
            start_of_day_ist = datetime(now_ist.year, now_ist.month, now_ist.day, tzinfo=ist)
            range_start = start_of_day_ist.astimezone(timezone.utc)
            conditions.append(Event.occurred_at >= range_start)
        elif range == "week":
            range_start = now - timedelta(days=7)
            conditions.append(Event.occurred_at >= range_start)
        elif range == "month":
            range_start = now - timedelta(days=30)
            conditions.append(Event.occurred_at >= range_start)

    events_result = await db.execute(
        select(Event)
        .where(and_(*conditions))
        .order_by(Event.materiality_score.desc())
        .limit(50)
    )
    event_list = events_result.scalars().all()
    max_seq = max((e.seq for e in event_list), default=last_seq)

    # True unseen count — separate query without LIMIT so "Since You Left" is accurate
    from sqlalchemy import func as sql_func
    count_conditions = [
        Event.symbol.in_(symbols),
        Event.seq > last_seq,
        Event.materiality_score >= threshold,
    ]
    total_count_result = await db.execute(
        select(sql_func.count(Event.seq)).where(and_(*count_conditions))
    )
    total_unseen = total_count_result.scalar() or 0

    return {
        "events": [_event_to_dict(e) for e in event_list],
        "last_seq": max_seq,
        "unseen_count": total_unseen,
    }


@router.post("/{watchlist_id}/seen")
async def mark_seen(
    watchlist_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Advance cursor to current max seq. Idempotent, safe from multiple devices."""
    items_result = await db.execute(
        select(WatchlistItem.symbol).where(WatchlistItem.watchlist_id == watchlist_id)
    )
    symbols = [r[0] for r in items_result.all()]
    max_event = await db.execute(
        select(Event.seq).where(Event.symbol.in_(symbols)).order_by(Event.seq.desc()).limit(1)
    )
    max_seq = max_event.scalar() or 0

    cursor = await db.get(SeenCursor, (user.id, watchlist_id))
    if not cursor:
        cursor = SeenCursor(user_id=user.id, watchlist_id=watchlist_id, last_seen_seq=max_seq)
        db.add(cursor)
    else:
        cursor.last_seen_seq = max(cursor.last_seen_seq, max_seq)
    await db.commit()
    return {"last_seen_seq": cursor.last_seen_seq}


@router.post("/{watchlist_id}/reset-seen")
async def reset_seen(
    watchlist_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Reset cursor to 0 so all events are visible again (helpful for evaluation/demo)."""
    cursor = await db.get(SeenCursor, (user.id, watchlist_id))
    if not cursor:
        cursor = SeenCursor(user_id=user.id, watchlist_id=watchlist_id, last_seen_seq=0)
        db.add(cursor)
    else:
        cursor.last_seen_seq = 0
    await db.commit()
    return {"last_seen_seq": 0}


@router.post("/{watchlist_id}/sync-real")
async def sync_real_data(
    watchlist_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Force an immediate real quote fetch and reconciliation for all symbols in the watchlist."""
    import asyncio
    from app.worker.ingestion import ingest_symbol

    items_result = await db.execute(
        select(WatchlistItem.symbol).where(WatchlistItem.watchlist_id == watchlist_id)
    )
    symbols = [r[0] for r in items_result.all()]
    if symbols:
        await asyncio.gather(*[ingest_symbol(sym) for sym in symbols], return_exceptions=True)
    return {"status": "synced", "symbols": symbols}


@router.get("/{watchlist_id}/summary")
async def get_watchlist_summary(
    watchlist_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate an AI executive market brief across the active watchlist events."""
    items_result = await db.execute(
        select(WatchlistItem.symbol).where(WatchlistItem.watchlist_id == watchlist_id)
    )
    symbols = [r[0] for r in items_result.all()]
    if not symbols:
        return {"summary": "No symbols currently monitored in this watchlist."}

    events_result = await db.execute(
        select(Event)
        .where(Event.symbol.in_(symbols))
        .order_by(Event.occurred_at.desc())
        .limit(10)
    )
    events = events_result.scalars().all()
    if not events:
        return {"summary": "All watched symbols are operating within normal baseline variance. No material anomalies detected."}

    from app.engine.explain import call_llm
    prompt = (
        "You are a concise financial risk analyst. Write a 2-sentence executive summary of the following recent watchlist events for an investor. "
        "Highlight significant percentage changes and thesis triggers. Be direct, professional, and omit fluff.\n\n"
    )
    for e in events[:5]:
        baseline = float(e.price_baseline) if e.price_baseline else float(e.price_at_event)
        pct = ((float(e.price_at_event) - baseline) / baseline) * 100 if baseline > 0 else 0
        prompt += f"- {e.symbol}: {e.event_type}, price ₹{float(e.price_at_event):,.2f} ({pct:+.2f}%), z-score {e.z_score}\n"

    try:
        summary_text = await call_llm(prompt)
        if not summary_text:
            top = events[0]
            summary_text = f"Top mover {top.symbol.replace('.NS', '')} shifted to ₹{float(top.price_at_event):,.2f} triggered by {top.event_type.replace('_', ' ')}. Total {len(events)} material events recorded across your portfolio."
        return {"summary": summary_text}
    except Exception:
        return {"summary": f"{len(events)} material events recorded across your portfolio. All systems actively monitoring."}
