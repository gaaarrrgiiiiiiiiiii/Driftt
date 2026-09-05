"""
Main ingestion loop. Called by APScheduler every 60s.
Flow:
1. Symbol discovery from active watchlists
2. Ingest symbol with independent session (no shared state)
3. Fetch both sources (Yahoo + NSE), compute real ages, reconcile
4. Write immutable Snapshot
5. Session-level Welford update only on IST trading-date change
6. Score and store event with deduplication & in-place update for live events
7. Fire-and-forget LLM explanation follow-up
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
import pytz

from app.database import AsyncSessionLocal
from app.models.snapshot import Snapshot
from app.models.baseline import Baseline
from app.models.event import Event
from app.models.watchlist import WatchlistItem
from app.engine import welford, scorer, thesis as thesis_engine, reconcile as rec_engine
from app.engine.explain import generate_explanation
from app.worker import yahoo, nse
from app.worker.discover import get_active_symbols
from app.core.market_hours import is_market_open
from app.config import settings
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)
redis_client = aioredis.from_url(settings.redis_url)
IST = pytz.timezone("Asia/Kolkata")
STALE_THRESHOLD_SECONDS = 300


def ist_trading_date():
    return datetime.now(IST).date()


async def score_and_store_event(
    db,
    symbol: str,
    result: rec_engine.ReconcileResult,
    prev_close: float,
    baseline: Baseline,
    fetched_at: datetime,
    data_age_seconds: int,
    volume: int,
) -> int | None:
    """
    Dedup at write time (prevents event spam):
    1. Checks if any user thesis is crossed.
    2. Computes materiality score (requires score >= 15).
    3. If an active event exists (<30 min old, same event type) and thesis wasn't just crossed:
       updates materiality_score in-place and bumps updated_at.
    4. Otherwise adds new Event row and returns event.seq.
    """
    # 1. Check thesis triggers across all watchlists for this symbol
    items_res = await db.execute(
        select(WatchlistItem).where(WatchlistItem.symbol == symbol)
    )
    items = items_res.scalars().all()
    thesis_just_crossed = False
    for item in items:
        if thesis_engine.is_thesis_crossed(
            float(result.price),
            float(prev_close),
            item.thesis_type,
            float(item.thesis_value) if item.thesis_value else None,
            float(item.thesis_entry) if item.thesis_entry else None,
        ):
            thesis_just_crossed = True
            break

    # 2. Materiality calculation
    price_return = (float(result.price) - float(prev_close)) / float(prev_close) if prev_close > 0 else 0.0
    stddev = float(baseline.stddev_return or 0.0)
    is_stale = (data_age_seconds or 0) > STALE_THRESHOLD_SECONDS

    breakdown = scorer.compute(
        price_return=price_return,
        stddev_return=stddev,
        current_volume=volume if not is_market_open() else 0,
        mean_volume=int(baseline.mean_volume or 1),
        thesis_crossed=thesis_just_crossed,
        is_conflict=result.conflict,
        is_stale=is_stale,
    )

    if breakdown.materiality_score < 15:
        return None

    # 3. Dedup: Check active event for same symbol within last 30 minutes
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
    active_res = await db.execute(
        select(Event)
        .where(
            Event.symbol == symbol,
            Event.occurred_at >= cutoff,
            Event.event_type == breakdown.event_type,
        )
        .order_by(Event.occurred_at.desc())
        .limit(1)
    )
    active = active_res.scalar_one_or_none()

    if active and not thesis_just_crossed:
        active.materiality_score = max(float(active.materiality_score), breakdown.materiality_score)
        active.updated_at = datetime.now(timezone.utc)
        return None  # update in place, don't spam a new row

    # 4. Insert new Event row
    new_event = Event(
        symbol=symbol,
        event_type=breakdown.event_type,
        materiality_score=breakdown.materiality_score,
        z_score=breakdown.z_score,
        volume_ratio=breakdown.volume_ratio,
        price_at_event=result.price,
        price_baseline=prev_close,
        occurred_at=fetched_at,
        data_fresh=not is_stale,
        source_conflict=result.conflict,
        yahoo_price=result.yahoo_price,
        nse_price=result.nse_price,
        divergence_pct=result.divergence_pct,
        preferred_source=result.preferred_source,
    )
    db.add(new_event)
    await db.flush()
    return new_event.seq


async def ingest_symbol(symbol: str) -> None:
    """
    Ingest a single symbol with its own isolated async session.
    Never shares state or sessions across gather tasks.
    """
    async with AsyncSessionLocal() as db:
        try:
            # 1. Fetch concurrently from both sources
            yahoo_data, nse_data = await asyncio.gather(
                yahoo.fetch_quote(symbol),
                nse.fetch_quote(symbol),
            )

            if not yahoo_data and not nse_data:
                return  # Both sources failed — skip tick

            # 2. Reconcile both sources
            result = rec_engine.reconcile(
                yahoo_price=float(yahoo_data["price"]) if yahoo_data else float(nse_data["price"]),
                yahoo_age_s=yahoo_data.get("data_age_seconds") if yahoo_data else 9999,
                nse_price=float(nse_data["price"]) if nse_data else None,
                nse_age_s=nse_data.get("data_age_seconds") if nse_data else None,
            )

            # 3. Cache in Redis for fast /quotes reads
            data_age = yahoo_data.get("data_age_seconds") if yahoo_data else (nse_data.get("data_age_seconds") if nse_data else 0)
            await redis_client.setex(
                f"quote:{symbol}", 60,
                f"{result.price}|{int(result.conflict)}|{data_age or 0}"
            )

            # 4. Get or initialize baseline
            baseline = await db.get(Baseline, symbol)
            if not baseline:
                baseline = Baseline(symbol=symbol)
                db.add(baseline)
                await db.flush()

            prev_close = float(baseline.last_close) if baseline.last_close else None

            # 5. Write immutable snapshot
            vol = int((yahoo_data.get("volume") if yahoo_data else None) or (nse_data.get("volume") if nse_data else None) or 0)
            fetched_at = yahoo_data["fetched_at"] if yahoo_data else nse_data["fetched_at"]

            db.add(Snapshot(
                symbol=symbol,
                source=result.preferred_source or ("yahoo" if yahoo_data else "nse"),
                price=result.price,
                volume=vol,
                fetched_at=fetched_at,
                data_age_seconds=data_age,
                conflict_flag=result.conflict,
                market_open=is_market_open(),
            ))

            # 6. Session-level Welford update only on IST trading-date change
            today = ist_trading_date()
            if prev_close is not None and baseline.last_session_date != today:
                ret = (float(result.price) - float(prev_close)) / float(prev_close)
                ws = welford.from_db(baseline.session_count, baseline.mean_return, baseline.m2_return)
                ws = welford.update(ws, ret)
                baseline.session_count = ws.count
                baseline.mean_return = ws.mean
                baseline.m2_return = ws.m2
                baseline.stddev_return = ws.stddev
                baseline.last_session_date = today

                # Volume update EOD
                if not is_market_open():
                    n = ws.count
                    baseline.mean_volume = int(
                        (float(baseline.mean_volume or 0) * (n - 1) + vol) / n
                    )

            baseline.last_close = result.price
            db.add(baseline)

            created_event_seq = None
            if prev_close is not None:
                created_event_seq = await score_and_store_event(
                    db=db,
                    symbol=symbol,
                    result=result,
                    prev_close=prev_close,
                    baseline=baseline,
                    fetched_at=fetched_at,
                    data_age_seconds=data_age,
                    volume=vol,
                )

            await db.commit()

            # 7. Follow-up: Fire-and-forget LLM explanation
            if created_event_seq and settings.enable_llm:
                asyncio.create_task(generate_explanation(created_event_seq))

        except Exception:
            await db.rollback()
            logger.exception(f"ingestion failed: {symbol}")


async def run_ingestion(force: bool = False) -> None:
    """Called by APScheduler every 60s during market hours, or on-demand with force=True."""
    if not force and not is_market_open():
        return

    async with AsyncSessionLocal() as db:
        symbols = await get_active_symbols(db)

    if not symbols:
        return

    # One independent session per symbol — avoids shared-AsyncSession bugs
    await asyncio.gather(*[ingest_symbol(sym) for sym in symbols], return_exceptions=True)
