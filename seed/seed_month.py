import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Ensure app package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete
from app.database import AsyncSessionLocal
from app.models.event import Event
from app.models.cursor import SeenCursor
from app.models.summary import DailySummary
from app.worker.daily_summary import generate_daily_summary

MONTH_EVENTS = [
    # --- September 1, 2026 (Tuesday) ---
    {
        "symbol": "RELIANCE.NS",
        "event_type": "price_spike",
        "materiality_score": 68.0,
        "z_score": 1.95,
        "volume_ratio": 1.45,
        "price_at_event": 1418.50,
        "price_baseline": 1395.00,
        "explanation": "RELIANCE gained +1.68% on morning energy demand surge (1.95σ)",
        "occurred_at": datetime(2026, 9, 1, 4, 15, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "TCS.NS",
        "event_type": "volume_surge",
        "materiality_score": 48.0,
        "z_score": 0.85,
        "volume_ratio": 2.80,
        "price_at_event": 2280.00,
        "price_baseline": 2270.00,
        "explanation": "TCS saw heavy institutional accumulation at 2.80× 30-day median volume",
        "occurred_at": datetime(2026, 9, 1, 5, 45, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "HDFCBANK.NS",
        "event_type": "price_drop",
        "materiality_score": 64.0,
        "z_score": -2.20,
        "volume_ratio": 1.70,
        "price_at_event": 1635.00,
        "price_baseline": 1662.00,
        "explanation": "HDFCBANK declined -1.62% under banking sector intraday profit booking",
        "occurred_at": datetime(2026, 9, 1, 8, 0, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "INFY.NS",
        "event_type": "price_spike",
        "materiality_score": 52.0,
        "z_score": 1.40,
        "volume_ratio": 1.25,
        "price_at_event": 1820.00,
        "price_baseline": 1795.00,
        "explanation": "INFY rebounded +1.39% to ₹1,820 after European contract renewal announcement",
        "occurred_at": datetime(2026, 9, 1, 8, 40, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "ZOMATO.NS",
        "event_type": "volatility_breakout",
        "materiality_score": 78.0,
        "z_score": 2.75,
        "volume_ratio": 3.40,
        "price_at_event": 242.50,
        "price_baseline": 235.00,
        "explanation": "ZOMATO surged +3.19% on 3.40× volume hitting fresh 52-week breakout momentum",
        "occurred_at": datetime(2026, 9, 1, 9, 35, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },

    # --- September 2, 2026 (Wednesday) ---
    {
        "symbol": "IRCTC.NS",
        "event_type": "thesis_crossed",
        "materiality_score": 92.0,
        "z_score": 2.45,
        "volume_ratio": 2.10,
        "price_at_event": 945.00,
        "price_baseline": 920.00,
        "explanation": "IRCTC crossed stated thesis threshold (+2.72% gain from entry ₹920.00)",
        "occurred_at": datetime(2026, 9, 2, 4, 30, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "RELIANCE.NS",
        "event_type": "price_drop",
        "materiality_score": 54.0,
        "z_score": -1.65,
        "volume_ratio": 1.15,
        "price_at_event": 1402.00,
        "price_baseline": 1418.50,
        "explanation": "RELIANCE eased -1.16% towards key ₹1,400 psychological support baseline",
        "occurred_at": datetime(2026, 9, 2, 6, 10, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "HDFCBANK.NS",
        "event_type": "source_conflict",
        "materiality_score": 58.0,
        "z_score": 1.55,
        "volume_ratio": 1.30,
        "price_at_event": 1655.00,
        "price_baseline": 1635.00,
        "explanation": "Data divergence detected: Yahoo quote ₹1,655 vs NSE quote ₹1,646 (0.54% variance)",
        "occurred_at": datetime(2026, 9, 2, 7, 20, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": True,
        "yahoo_price": 1655.0,
        "nse_price": 1646.0,
        "divergence_pct": 0.54,
        "preferred_source": "yahoo",
    },
    {
        "symbol": "TCS.NS",
        "event_type": "volatility_breakout",
        "materiality_score": 70.0,
        "z_score": 2.10,
        "volume_ratio": 2.20,
        "price_at_event": 2315.00,
        "price_baseline": 2280.00,
        "explanation": "TCS expanded volatility to ₹2,315 (+1.54%) backed by large block deal volume",
        "occurred_at": datetime(2026, 9, 2, 8, 50, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "INFY.NS",
        "event_type": "volume_surge",
        "materiality_score": 46.0,
        "z_score": 1.15,
        "volume_ratio": 2.45,
        "price_at_event": 1835.00,
        "price_baseline": 1820.00,
        "explanation": "INFY recorded unusual volume surge of 2.45× 30-day baseline during closing hours",
        "occurred_at": datetime(2026, 9, 2, 9, 40, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },

    # --- September 3, 2026 (Thursday) ---
    {
        "symbol": "ZOMATO.NS",
        "event_type": "price_spike",
        "materiality_score": 66.0,
        "z_score": 2.30,
        "volume_ratio": 2.05,
        "price_at_event": 248.00,
        "price_baseline": 242.50,
        "explanation": "ZOMATO continued upward climb +2.27% to ₹248 on accelerating retail flow",
        "occurred_at": datetime(2026, 9, 3, 4, 5, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "RELIANCE.NS",
        "event_type": "thesis_crossed",
        "materiality_score": 95.0,
        "z_score": -1.80,
        "volume_ratio": 1.20,
        "price_at_event": 1396.00,
        "price_baseline": 1402.00,
        "explanation": "RELIANCE breached stated thesis price level of ₹1,400 to the downside (floor ≥90 triggered)",
        "occurred_at": datetime(2026, 9, 3, 5, 50, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "TCS.NS",
        "event_type": "price_spike",
        "materiality_score": 44.0,
        "z_score": 1.10,
        "volume_ratio": 1.30,
        "price_at_event": 2330.00,
        "price_baseline": 2315.00,
        "explanation": "TCS notched modest gain to ₹2,330 (+0.65%) maintaining steady baseline trend",
        "occurred_at": datetime(2026, 9, 3, 7, 15, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "IRCTC.NS",
        "event_type": "volume_surge",
        "materiality_score": 56.0,
        "z_score": 1.45,
        "volume_ratio": 2.65,
        "price_at_event": 952.00,
        "price_baseline": 945.00,
        "explanation": "IRCTC trading activity surged 2.65× average as catering expansion news broke",
        "occurred_at": datetime(2026, 9, 3, 8, 30, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "INFY.NS",
        "event_type": "price_drop",
        "materiality_score": 58.0,
        "z_score": -1.90,
        "volume_ratio": 1.60,
        "price_at_event": 1815.00,
        "price_baseline": 1835.00,
        "explanation": "INFY pulled back -1.09% following broader tech sector global risk-off sentiment",
        "occurred_at": datetime(2026, 9, 3, 9, 45, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },

    # --- September 4, 2026 (Friday - Today) ---
    {
        "symbol": "RELIANCE.NS",
        "event_type": "thesis_crossed",
        "materiality_score": 94.0,
        "z_score": 1.28,
        "volume_ratio": 1.10,
        "price_at_event": 1392.00,
        "price_baseline": 1410.00,
        "explanation": "Target thesis level ₹1,400 breached to downside; materiality floored to 94",
        "occurred_at": datetime(2026, 9, 4, 4, 0, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "IRCTC.NS",
        "event_type": "volatility_breakout",
        "materiality_score": 87.0,
        "z_score": 3.42,
        "volume_ratio": 2.90,
        "price_at_event": 964.15,
        "price_baseline": 920.00,
        "explanation": "Strong breakout +4.80% on 2.90× 30-day average volume after earnings optimism",
        "occurred_at": datetime(2026, 9, 4, 5, 15, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "HDFCBANK.NS",
        "event_type": "source_conflict",
        "materiality_score": 72.0,
        "z_score": 2.15,
        "volume_ratio": 1.40,
        "price_at_event": 1675.00,
        "price_baseline": 1640.00,
        "explanation": "Source divergence: Yahoo quote ₹1,675.00 vs NSE quote ₹1,664.00 (0.66% variance)",
        "occurred_at": datetime(2026, 9, 4, 6, 0, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": True,
        "yahoo_price": 1675.0,
        "nse_price": 1664.0,
        "divergence_pct": 0.66,
        "preferred_source": "yahoo",
    },
    {
        "symbol": "TCS.NS",
        "event_type": "price_spike",
        "materiality_score": 52.0,
        "z_score": 1.30,
        "volume_ratio": 1.80,
        "price_at_event": 2384.00,
        "price_baseline": 2348.00,
        "explanation": "TCS advanced +1.53% to ₹2,384 on steady buy orders exceeding 35 balanced filter",
        "occurred_at": datetime(2026, 9, 4, 7, 45, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "ZOMATO.NS",
        "event_type": "volume_surge",
        "materiality_score": 68.0,
        "z_score": 0.65,
        "volume_ratio": 3.12,
        "price_at_event": 236.90,
        "price_baseline": 235.00,
        "explanation": "Heavy block order volume surge of 3.12× median volume while price held steady",
        "occurred_at": datetime(2026, 9, 4, 8, 30, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "INFY.NS",
        "event_type": "price_spike",
        "materiality_score": 60.0,
        "z_score": 1.80,
        "volume_ratio": 1.70,
        "price_at_event": 1848.00,
        "price_baseline": 1815.00,
        "explanation": "INFY climbed +1.82% to ₹1,848.00 testing weekly resistance on elevated volume",
        "occurred_at": datetime(2026, 9, 4, 9, 30, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },

    # --- September 5, 2026 (Saturday - Today) ---
    {
        "symbol": "RELIANCE.NS",
        "event_type": "thesis_crossed",
        "materiality_score": 94.0,
        "z_score": -1.95,
        "volume_ratio": 1.15,
        "price_at_event": 1392.00,
        "price_baseline": 1410.00,
        "explanation": "Target thesis level ₹1,400 breached to the downside (floor ≥90 guaranteed)",
        "occurred_at": datetime(2026, 9, 5, 4, 15, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "IRCTC.NS",
        "event_type": "volatility_breakout",
        "materiality_score": 87.0,
        "z_score": 3.42,
        "volume_ratio": 2.90,
        "price_at_event": 964.15,
        "price_baseline": 920.00,
        "explanation": "Strong breakout +4.80% on 2.90× 30-day average volume after earnings optimism",
        "occurred_at": datetime(2026, 9, 5, 5, 30, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "HDFCBANK.NS",
        "event_type": "source_conflict",
        "materiality_score": 72.0,
        "z_score": 2.15,
        "volume_ratio": 1.40,
        "price_at_event": 1675.00,
        "price_baseline": 1640.00,
        "explanation": "Source divergence detected: Yahoo quote ₹1,675.00 vs NSE quote ₹1,664.00 (0.66% variance)",
        "occurred_at": datetime(2026, 9, 5, 6, 20, tzinfo=timezone.utc),
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
        "price_at_event": 236.90,
        "price_baseline": 235.00,
        "explanation": "Heavy block order volume surge of 3.12× median volume while price held steady",
        "occurred_at": datetime(2026, 9, 5, 7, 45, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "TCS.NS",
        "event_type": "price_spike",
        "materiality_score": 55.0,
        "z_score": 1.45,
        "volume_ratio": 1.65,
        "price_at_event": 2395.00,
        "price_baseline": 2360.00,
        "explanation": "TCS advanced +1.48% to ₹2,395 with steady institutional buy-side orders",
        "occurred_at": datetime(2026, 9, 5, 8, 30, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
    {
        "symbol": "INFY.NS",
        "event_type": "volatility_breakout",
        "materiality_score": 74.0,
        "z_score": 2.35,
        "volume_ratio": 2.10,
        "price_at_event": 1862.00,
        "price_baseline": 1820.00,
        "explanation": "INFY jumped +2.31% to ₹1,862 crossing multi-week channel resistance",
        "occurred_at": datetime(2026, 9, 5, 9, 15, tzinfo=timezone.utc),
        "data_fresh": True,
        "source_conflict": False,
    },
]

DAY_SUMMARIES = {
    datetime(2026, 9, 1).date(): "ZOMATO led the opening session of September with a +3.19% volatility breakout on 3.4× volume, while HDFCBANK experienced elevated selling pressure (-1.62%, 2.2σ). RELIANCE and INFY recorded healthy buying interest.",
    datetime(2026, 9, 2).date(): "IRCTC breached its thesis target at ₹945.00 (+2.72%) with surging institutional volume. TCS expanded volatility to ₹2,315.00 while HDFCBANK exhibited a 0.54% dual-source exchange price divergence.",
    datetime(2026, 9, 3).date(): "RELIANCE crossed its critical ₹1,400 downside thesis support level to ₹1,396.00 (materiality floored to 95). ZOMATO extended weekly momentum with a +2.27% climb to ₹248.00.",
    datetime(2026, 9, 4).date(): "Top movers IRCTC surged +4.80% on 2.9× volume and RELIANCE broke down further below thesis to ₹1,392.00. Total 6 material events recorded today across active watchlist assets.",
    datetime(2026, 9, 5).date(): "RELIANCE sustained a downside thesis breach below ₹1,400 to ₹1,392.00 (materiality floored to 94). IRCTC recorded a 3.4σ volatility breakout to ₹964.15 on 2.9× volume, while HDFCBANK triggered dual-source conflict reconciliation.",
}


async def seed_month():
    print("🌱 Seeding events from September 1, 2026 onwards...")

    async with AsyncSessionLocal() as db:
        # Clear existing events and cursors for clean demo state
        await db.execute(delete(Event))
        await db.execute(delete(SeenCursor))
        await db.execute(delete(DailySummary))
        await db.commit()

        # Insert all 27 events in chronological order
        for ev in MONTH_EVENTS:
            event = Event(
                symbol=ev["symbol"],
                event_type=ev["event_type"],
                materiality_score=ev["materiality_score"],
                z_score=ev.get("z_score"),
                volume_ratio=ev.get("volume_ratio"),
                price_at_event=ev["price_at_event"],
                price_baseline=ev.get("price_baseline"),
                explanation=ev.get("explanation"),
                occurred_at=ev["occurred_at"],
                data_fresh=ev.get("data_fresh", True),
                source_conflict=ev.get("source_conflict", False),
                yahoo_price=ev.get("yahoo_price"),
                nse_price=ev.get("nse_price"),
                divergence_pct=ev.get("divergence_pct"),
                preferred_source=ev.get("preferred_source"),
            )
            db.add(event)
        await db.commit()

        # Insert daily summaries for each calendar day
        for target_date, text in DAY_SUMMARIES.items():
            ev_count = len([e for e in MONTH_EVENTS if e["occurred_at"].date() == target_date])
            summary = DailySummary(
                date=target_date,
                event_count=ev_count,
                text=text,
            )
            db.add(summary)
        await db.commit()

        print(f"✅ Successfully seeded {len(MONTH_EVENTS)} events and {len(DAY_SUMMARIES)} daily summaries from Sep 1, 2026!")


async def main():
    await seed_month()


if __name__ == "__main__":
    asyncio.run(main())
