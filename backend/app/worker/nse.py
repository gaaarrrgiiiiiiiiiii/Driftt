import httpx
from datetime import datetime, timezone
from typing import Optional

NSE_URL = "https://www.nseindia.com/api/quote-equity"


async def fetch_quote(symbol: str, timeout: int = 8) -> Optional[dict]:
    """
    Fetch from NSE public quote API. Requires a session cookie established first.
    Falls back to None on block/failure — that's the design.
    The failure mode is handled by reconcile() which uses Yahoo alone.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json",
        "Referer": "https://www.nseindia.com/",
    }
    try:
        async with httpx.AsyncClient(timeout=timeout, headers=headers) as client:
            # Establish session cookie
            await client.get("https://www.nseindia.com/", timeout=5)
            nse_symbol = symbol.replace(".NS", "")
            r = await client.get(NSE_URL, params={"symbol": nse_symbol})
            r.raise_for_status()
            data = r.json()
            now_utc = datetime.now(timezone.utc)
            data_age = 0
            # Attempt to parse lastUpdateTime e.g. "04-Sep-2026 15:30:00" in IST
            time_str = (
                data.get("metadata", {}).get("lastUpdateTime")
                or data.get("priceInfo", {}).get("lastUpdateTime")
            )
            if time_str:
                try:
                    import pytz
                    ist = pytz.timezone("Asia/Kolkata")
                    dt_ist = datetime.strptime(time_str.strip(), "%d-%b-%Y %H:%M:%S")
                    dt_ist = ist.localize(dt_ist)
                    data_age = max(0, int((now_utc - dt_ist.astimezone(timezone.utc)).total_seconds()))
                except Exception:
                    data_age = 0

            # Extract price — try multiple known NSE response paths
            price = (
                data.get("priceInfo", {}).get("lastPrice")
                or data.get("priceInfo", {}).get("previousClose")
                or data.get("metadata", {}).get("lastPrice")
            )
            if price is None:
                return None  # No usable price — caller handles gracefully

            # Extract volume — NSE puts it under tradeInfo
            volume = int(
                data.get("marketDeptOrderBook", {}).get("tradeInfo", {}).get("totalTradedVolume", 0)
                or data.get("priceInfo", {}).get("totalTradedVolume", 0)
                or 0
            )

            return {
                "price": float(price),
                "volume": volume,
                "fetched_at": now_utc,
                "data_age_seconds": data_age,
                "source": "nse",
            }
    except Exception:
        return None
