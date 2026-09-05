from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.watchlist import Watchlist, WatchlistItem


async def get_active_symbols(db: AsyncSession) -> list[str]:
    """
    Dynamically discover all symbols in active user watchlists.
    Replaces any hardcoded symbol lists.
    """
    result = await db.execute(
        select(WatchlistItem.symbol)
        .join(Watchlist, WatchlistItem.watchlist_id == Watchlist.id)
        .distinct()
    )
    return [row[0] for row in result.all()]
