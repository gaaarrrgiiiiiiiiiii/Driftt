from fastapi import APIRouter, Depends
from app.core.deps import get_current_user
from app.config import settings
from app.models.user import User
import redis.asyncio as aioredis

router = APIRouter()
_redis: aioredis.Redis = None


def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url)
    return _redis


@router.get("/{symbol}")
async def get_quote(
    symbol: str,
    user: User = Depends(get_current_user),
):
    """Return cached quote from Redis. Stale if ingestion hasn't run yet."""
    r = get_redis()
    raw = await r.get(f"quote:{symbol.upper()}")
    if not raw:
        return {"symbol": symbol, "price": None, "conflict": False, "data_age_seconds": None}
    parts = raw.decode().split("|")
    return {
        "symbol": symbol,
        "price": float(parts[0]),
        "conflict": parts[1] == "1",
        "data_age_seconds": int(parts[2]) if parts[2] else None,
    }
