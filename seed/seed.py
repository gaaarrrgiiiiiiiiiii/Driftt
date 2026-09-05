import asyncio
import sys
from pathlib import Path
from sqlalchemy import select

# Ensure app package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import AsyncSessionLocal
from app.config import settings
from app.models.user import User
from app.models.watchlist import Watchlist, WatchlistItem
from app.core.auth import hash_password
try:
    from historical_pull import pull_history
    from synthetic_events import inject_events
    from seed_month import seed_month
except ModuleNotFoundError:
    from seed.historical_pull import pull_history
    from seed.synthetic_events import inject_events
    from seed.seed_month import seed_month

DEMO_SYMBOLS = [
    {"symbol": "RELIANCE.NS", "thesis_type": "price_level", "thesis_value": 1400.0, "thesis_entry": 1410.0},
    {"symbol": "IRCTC.NS", "thesis_type": "pct_move", "thesis_value": 4.0, "thesis_entry": 920.0},
    {"symbol": "HDFCBANK.NS", "thesis_type": "monitoring", "thesis_value": None, "thesis_entry": None},
    {"symbol": "ZOMATO.NS", "thesis_type": "monitoring", "thesis_value": None, "thesis_entry": None},
    {"symbol": "TCS.NS", "thesis_type": "monitoring", "thesis_value": None, "thesis_entry": None},
    {"symbol": "INFY.NS", "thesis_type": "monitoring", "thesis_value": None, "thesis_entry": None},
]


async def main():
    print("🚀 Starting Driftt seed process...")

    async with AsyncSessionLocal() as db:
        # 1. Create or get demo user
        user_res = await db.execute(select(User).where(User.email == settings.demo_user_email))
        user = user_res.scalar_one_or_none()
        if not user:
            print(f"Creating demo user: {settings.demo_user_email}...")
            user = User(
                email=settings.demo_user_email,
                name="Demo User",
                hashed_password=hash_password(settings.demo_user_password),
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            print(f"Demo user exists: {user.email}")

        # 2. Create or get default watchlist
        wl_res = await db.execute(select(Watchlist).where(Watchlist.user_id == user.id))
        watchlist = wl_res.scalars().first()
        if not watchlist:
            print("Creating default watchlist: 'Core Portfolio'...")
            watchlist = Watchlist(user_id=user.id, name="Core Portfolio")
            db.add(watchlist)
            await db.commit()
            await db.refresh(watchlist)
        else:
            print(f"Watchlist exists: {watchlist.name} ({watchlist.id})")

        # 3. Add watchlist items
        for item in DEMO_SYMBOLS:
            item_res = await db.execute(
                select(WatchlistItem).where(
                    WatchlistItem.watchlist_id == watchlist.id,
                    WatchlistItem.symbol == item["symbol"]
                )
            )
            if not item_res.scalar_one_or_none():
                wl_item = WatchlistItem(
                    watchlist_id=watchlist.id,
                    symbol=item["symbol"],
                    thesis_type=item["thesis_type"],
                    thesis_value=item["thesis_value"],
                    thesis_entry=item["thesis_entry"],
                )
                db.add(wl_item)
        await db.commit()

    # 4. Check if demo events are already initialized (idempotent guard)
    force = "--force" in sys.argv
    from app.models.event import Event
    from sqlalchemy import func

    async with AsyncSessionLocal() as db:
        ev_count = (await db.execute(select(func.count(Event.seq)))).scalar() or 0

    if ev_count >= 20 and not force:
        print(f"ℹ️ Demo data already initialized ({ev_count} events present). Skipping seed to preserve state.")
        print("💡 Use 'python seed/seed.py --force' to explicitly re-populate.")
        return

    # 5. Pull history and baselines
    print("📈 Populating 30-day baselines and snapshots...")
    symbols_list = [s["symbol"] for s in DEMO_SYMBOLS]
    await pull_history(symbols_list, days=30)

    # 6. Inject full timeline from September 1, 2026 onwards
    print("⚡ Injecting ranked demo events and daily summaries from September 1, 2026 onwards...")
    await seed_month()

    print("✅ Seed complete! You can login as demo@driftt.app / demo123 or click 'Demo Login'.")


if __name__ == "__main__":
    asyncio.run(main())
