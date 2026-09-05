"""
Event detector: decides whether a price snapshot warrants a new event row.

Bug fixes applied here:
  Bug 4: market_is_open param — volume component zeroed during market hours
  Bug 5: existing_event_types_today param — one event per type per IST day
  Bug 3: returns yahoo_price/nse_price/etc as None placeholders;
         ingestion.py populates them from ReconcileResult before INSERT
"""
from datetime import datetime, timezone, date
from typing import Optional
import pytz

from app.engine import welford, scorer, thesis as thesis_engine
from app.models.baseline import Baseline

STALE_THRESHOLD_SECONDS = 300   # >5 min since quote time = stale
IST = pytz.timezone("Asia/Kolkata")


def snapshot_is_stale(fetched_at: datetime) -> bool:
    age = (datetime.now(timezone.utc) - fetched_at).total_seconds()
    return age > STALE_THRESHOLD_SECONDS


def ist_today() -> date:
    return datetime.now(IST).date()


def detect_and_score(
    symbol: str,
    current_price: float,
    current_volume: int,
    last_price: float,
    baseline: Baseline,
    fetched_at: datetime,
    is_conflict: bool,
    thesis_type: Optional[str] = None,
    thesis_value: Optional[float] = None,
    thesis_entry: Optional[float] = None,
    existing_event_types_today: Optional[set] = None,  # Bug 5: cooldown set
    min_score: float = 15.0,
    market_is_open: bool = True,  # Bug 4: skip volume scoring during hours
) -> Optional[dict]:
    """
    Returns event dict if the move is material, else None.
    Caller (ingestion.py) must populate yahoo_price/nse_price/etc before INSERT.
    """
    if baseline.session_count < 5:
        return None  # insufficient history for meaningful z-score

    if last_price <= 0:
        return None  # guard against bad data

    price_return = (current_price - last_price) / last_price
    ws = welford.from_db(baseline.session_count, baseline.mean_return, baseline.m2_return)

    crossed = thesis_engine.is_thesis_crossed(
        current_price, last_price, thesis_type, thesis_value, thesis_entry
    )
    is_stale = snapshot_is_stale(fetched_at)

    # Bug 5: application-level cooldown (DB index is the authoritative guard)
    if existing_event_types_today is None:
        existing_event_types_today = set()

    breakdown = scorer.compute(
        price_return=price_return,
        stddev_return=ws.stddev,
        # Bug 4: pass 0 during market hours — intraday cumulative volume
        # is not comparable to a full-day historical mean.
        current_volume=0 if market_is_open else current_volume,
        mean_volume=int(baseline.mean_volume or 1),
        thesis_crossed=crossed,
        is_conflict=is_conflict,
        is_stale=is_stale,
    )

    if breakdown.materiality_score < min_score:
        return None

    # Bug 5: skip if same event type already fired today
    if breakdown.event_type in existing_event_types_today:
        return None

    return {
        "symbol": symbol,
        "event_type": breakdown.event_type,
        "materiality_score": breakdown.materiality_score,
        "z_score": breakdown.z_score,
        "volume_ratio": breakdown.volume_ratio,  # stored even if intraday
        "price_at_event": current_price,
        "price_baseline": float(baseline.last_close or last_price),
        "occurred_at": fetched_at,
        "data_fresh": not is_stale,
        "source_conflict": is_conflict,
        # Bug 3: placeholders — populated by ingestion.py from ReconcileResult
        "yahoo_price": None,
        "nse_price": None,
        "divergence_pct": None,
        "preferred_source": None,
    }
