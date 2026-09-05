from fastapi import APIRouter
from app.core.market_hours import is_market_open

router = APIRouter()


@router.get("/")
async def health():
    return {"status": "ok", "market_open": is_market_open()}
