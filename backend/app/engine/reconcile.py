"""
Dual-source reconciliation.
When Yahoo and NSE disagree beyond tolerance, expose it — don't hide it.
This is a system-correctness decision, not UI decoration.

Design: ReconcileResult carries both prices so the caller (ingestion.py)
can persist them directly on the Event row (Bug 3 fix).
"""
from dataclasses import dataclass
from typing import Optional
from app.config import settings


@dataclass
class ReconcileResult:
    price: float
    conflict: bool
    yahoo_price: Optional[float] = None
    nse_price: Optional[float] = None
    divergence_pct: Optional[float] = None
    preferred_source: Optional[str] = None
    data_age_seconds: Optional[int] = None


def reconcile(
    yahoo_price: float,
    yahoo_age_s: int,
    nse_price: Optional[float],
    nse_age_s: Optional[int],
) -> ReconcileResult:
    """
    Returns a ReconcileResult with conflict=True and both prices populated
    when sources disagree beyond settings.conflict_threshold (default 0.5%).
    Falls back gracefully when NSE is unavailable.
    """
    if nse_price is None:
        # NSE unavailable — use Yahoo, note it, no conflict
        return ReconcileResult(
            price=yahoo_price,
            conflict=False,
            yahoo_price=yahoo_price,
            data_age_seconds=yahoo_age_s,
        )

    divergence = abs(yahoo_price - nse_price) / max(yahoo_price, nse_price)
    if divergence > settings.conflict_threshold:
        # Sources disagree — prefer fresher source, surface both
        if yahoo_age_s <= (nse_age_s or 9999):
            primary, preferred = yahoo_price, "yahoo"
        else:
            primary, preferred = nse_price, "nse"
        return ReconcileResult(
            price=primary,
            conflict=True,
            yahoo_price=yahoo_price,
            nse_price=nse_price,
            divergence_pct=round(divergence * 100, 3),
            preferred_source=preferred,
        )

    # Sources agree — use average, take fresher age
    return ReconcileResult(
        price=(yahoo_price + nse_price) / 2,
        conflict=False,
        data_age_seconds=min(yahoo_age_s, nse_age_s or yahoo_age_s),
    )
