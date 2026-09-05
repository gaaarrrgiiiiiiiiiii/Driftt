import json
import os
import sys
from pathlib import Path
import httpx
from datetime import datetime, timezone
from sqlalchemy import select

# Ensure app package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import AsyncSessionLocal
from app.models.baseline import Baseline
from app.models.snapshot import Snapshot
from app.engine import welford

YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
FALLBACK_JSON = Path(__file__).resolve().parent / "demo_data.json"


async def pull_history(symbols: list[str], days: int = 30) -> None:
    fallback_data = {}
    if FALLBACK_JSON.exists():
        with open(FALLBACK_JSON, "r", encoding="utf-8") as f:
            fallback_data = json.load(f)

    async with AsyncSessionLocal() as db:
        for symbol in symbols:
            existing = await db.get(Baseline, symbol)
            if existing and existing.session_count >= 5:
                continue

            fetched_prices = []
            fetched_volumes = []

            # Attempt real fetch from Yahoo Finance chart API
            try:
                async with httpx.AsyncClient(timeout=8) as client:
                    r = await client.get(
                        YAHOO_CHART_URL.format(symbol=symbol),
                        params={"range": "1mo", "interval": "1d"},
                        headers={"User-Agent": "Mozilla/5.0"},
                    )
                    if r.status_code == 200:
                        data = r.json()
                        result = data.get("chart", {}).get("result", [{}])[0]
                        quote = result.get("indicators", {}).get("quote", [{}])[0]
                        closes = quote.get("close", [])
                        volumes = quote.get("volume", [])
                        for c, v in zip(closes, volumes):
                            if c is not None and v is not None:
                                fetched_prices.append(float(c))
                                fetched_volumes.append(int(v))
            except Exception:
                pass

            # If Yahoo chart failed, use fallback JSON
            if len(fetched_prices) < 5 and symbol in fallback_data:
                meta = fallback_data[symbol]
                last_c = meta.get("last_close", 100.0)
                # Generate sample trajectory around last_close
                hist = meta.get("history", [])
                if hist:
                    fetched_prices = [h["close"] for h in hist]
                    fetched_volumes = [h["volume"] for h in hist]
                else:
                    fetched_prices = [last_c * (1.0 + (i - 10) * 0.002) for i in range(20)]
                    fetched_volumes = [meta.get("mean_volume", 1000000) for _ in range(20)]

            # Compute Welford state across history
            ws = welford.WelfordState()
            mean_vol = 0
            last_close = fetched_prices[-1] if fetched_prices else 100.0

            if len(fetched_prices) >= 2:
                for i in range(1, len(fetched_prices)):
                    ret = (fetched_prices[i] - fetched_prices[i - 1]) / fetched_prices[i - 1]
                    ws = welford.update(ws, ret)
                mean_vol = int(sum(fetched_volumes) / len(fetched_volumes)) if fetched_volumes else 1000000
            elif symbol in fallback_data:
                meta = fallback_data[symbol]
                ws = welford.WelfordState(
                    count=meta.get("session_count", 30),
                    mean=meta.get("mean_return", 0.001),
                    m2=meta.get("stddev_return", 0.015) ** 2 * 29,
                )
                mean_vol = meta.get("mean_volume", 1000000)
                last_close = meta.get("last_close", 100.0)

            baseline = Baseline(
                symbol=symbol,
                session_count=max(ws.count, 5),
                mean_return=ws.mean,
                m2_return=ws.m2,
                stddev_return=ws.stddev,
                mean_volume=mean_vol,
                last_close=last_close,
            )
            db.add(baseline)

            # Insert initial snapshot
            snap = Snapshot(
                symbol=symbol,
                source="yahoo",
                price=last_close,
                volume=mean_vol,
                fetched_at=datetime.now(timezone.utc),
                market_open=True,
                data_age_seconds=0,
                conflict_flag=False,
            )
            db.add(snap)

        await db.commit()
