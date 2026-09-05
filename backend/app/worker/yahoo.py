import httpx
from datetime import datetime, timezone
from typing import Optional

YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"


async def fetch_quote(symbol: str, timeout: int = 10) -> Optional[dict]:
    """
    Fetch current quote from Yahoo Finance v8 chart API (unofficial, no key needed).
    Returns dict with price, volume, fetched_at, data_age_seconds.
    Returns None on any failure — caller handles gracefully.
    """
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.get(
                YAHOO_URL.format(symbol=symbol),
                params={"interval": "1d", "range": "1d"},
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
            )
            r.raise_for_status()
            data = r.json()
            meta = data["chart"]["result"][0]["meta"]
            price = meta.get("regularMarketPrice") or meta.get("previousClose")
            volume = meta.get("regularMarketVolume", 0)
            ts = meta.get("regularMarketTime", 0)
            fetched_at = datetime.now(timezone.utc)
            data_age = int(fetched_at.timestamp() - ts) if ts else None
            return {
                "price": price,
                "volume": volume,
                "fetched_at": fetched_at,
                "data_age_seconds": data_age,
                "source": "yahoo",
            }
    except Exception:
        return None


async def fetch_yahoo_history(symbol: str, days: int = 30) -> list[dict]:
    """
    Fetch 30-day historical daily bars from Yahoo Finance chart API.
    Returns list of {"close": float, "volume": int}.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                YAHOO_URL.format(symbol=symbol),
                params={"range": "1mo", "interval": "1d"},
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
            )
            r.raise_for_status()
            data = r.json()
            result = data.get("chart", {}).get("result", [{}])[0]
            quote = result.get("indicators", {}).get("quote", [{}])[0]
            closes = quote.get("close", [])
            volumes = quote.get("volume", [])
            history = []
            for c, v in zip(closes, volumes):
                if c is not None and v is not None:
                    history.append({"close": float(c), "volume": int(v)})
            return history
    except Exception:
        return []


def build_baseline_from_history(symbol: str, history: list[dict]):
    """Build a Baseline model instance by running Welford over historical daily closes."""
    from app.engine import welford
    from app.models.baseline import Baseline
    import pytz

    ist = pytz.timezone("Asia/Kolkata")
    ws = welford.WelfordState()
    if len(history) >= 2:
        for i in range(1, len(history)):
            prev = history[i - 1]["close"]
            curr = history[i]["close"]
            if prev > 0:
                ret = (curr - prev) / prev
                ws = welford.update(ws, ret)
        mean_vol = sum(h["volume"] for h in history) // len(history)
        last_c = history[-1]["close"]
    elif history:
        last_c = history[-1]["close"]
        mean_vol = history[-1]["volume"]
    else:
        last_c = 100.0
        mean_vol = 1000000

    today = datetime.now(ist).date()
    return Baseline(
        symbol=symbol,
        session_count=ws.count,
        mean_return=ws.mean,
        m2_return=ws.m2,
        stddev_return=ws.stddev,
        mean_volume=mean_vol,
        last_close=last_c,
        last_session_date=today,
    )
