import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone

# Ensure app package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import AsyncSessionLocal
from app.models.event import Event


async def inject_events(events_list: list[dict] = None) -> None:
    now = datetime.now(timezone.utc)

    default_events = [
        {
            "symbol": "RELIANCE.NS",
            "event_type": "thesis_crossed",
            "materiality_score": 94.0,
            "z_score": 1.28,
            "volume_ratio": 1.05,
            "price_at_event": 1392.0,
            "price_baseline": 1410.0,
            "explanation": "Target thesis level ₹1,400 breached to the downside",
            "occurred_at": now - timedelta(hours=3),
            "data_fresh": True,
            "source_conflict": False,
        },
        {
            "symbol": "IRCTC.NS",
            "event_type": "volatility_breakout",
            "materiality_score": 86.5,
            "z_score": 3.42,
            "volume_ratio": 2.85,
            "price_at_event": 964.15,
            "price_baseline": 920.0,
            "explanation": "Strong breakout +4.8% on 2.85× 30-day average volume",
            "occurred_at": now - timedelta(hours=2),
            "data_fresh": True,
            "source_conflict": False,
        },
        {
            "symbol": "HDFCBANK.NS",
            "event_type": "price_spike",
            "materiality_score": 72.0,
            "z_score": 2.15,
            "volume_ratio": 1.40,
            "price_at_event": 1675.0,
            "price_baseline": 1640.0,
            "explanation": "Source divergence detected: Yahoo and NSE quotes disagreed by 0.66%",
            "occurred_at": now - timedelta(hours=5),
            "data_fresh": True,
            "source_conflict": True,
            "yahoo_price": 1675.0,
            "nse_price": 1664.0,
            "divergence_pct": 0.66,
            "preferred_source": "yahoo",
        },
        {
            "symbol": "ZOMATO.NS",
            "event_type": "volume_surge",
            "materiality_score": 68.0,
            "z_score": 0.65,
            "volume_ratio": 3.12,
            "price_at_event": 236.9,
            "price_baseline": 235.0,
            "explanation": "Heavy block order volume surge 3.12× median volume while price held steady",
            "occurred_at": now - timedelta(hours=4),
            "data_fresh": True,
            "source_conflict": False,
        },
    ]

    events_to_insert = events_list if events_list is not None else default_events

    async with AsyncSessionLocal() as db:
        for ev in events_to_insert:
            event = Event(
                symbol=ev["symbol"],
                event_type=ev["event_type"],
                materiality_score=ev["materiality_score"],
                z_score=ev.get("z_score"),
                volume_ratio=ev.get("volume_ratio"),
                price_at_event=ev["price_at_event"],
                price_baseline=ev.get("price_baseline"),
                explanation=ev.get("explanation"),
                occurred_at=ev.get("occurred_at", now),
                data_fresh=ev.get("data_fresh", True),
                source_conflict=ev.get("source_conflict", False),
                yahoo_price=ev.get("yahoo_price"),
                nse_price=ev.get("nse_price"),
                divergence_pct=ev.get("divergence_pct"),
                preferred_source=ev.get("preferred_source"),
            )
            db.add(event)
        await db.commit()
