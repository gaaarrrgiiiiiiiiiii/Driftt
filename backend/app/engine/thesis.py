"""
Per-stock thesis evaluation.
Returns True if the user's stated watch reason was crossed since last observation.

Thesis types:
  'price_level'  — price moved through a specific ₹ level
  'pct_move'     — price moved N% from entry price
  'monitoring'   — user is just watching; never auto-triggers

When thesis is crossed, detect_and_score() passes thesis_crossed=True to
scorer.compute(), which floors the materiality score at THESIS_FLOOR (90).
"""
from typing import Optional


def is_thesis_crossed(
    current_price: float,
    last_price: float,
    thesis_type: Optional[str],
    thesis_value: Optional[float],
    thesis_entry: Optional[float],
) -> bool:
    if not thesis_type or not thesis_value:
        return False

    if thesis_type == "price_level":
        # Crossed = price moved THROUGH the level between last tick and now
        crossed_down = last_price > thesis_value >= current_price
        crossed_up   = last_price < thesis_value <= current_price
        return crossed_down or crossed_up

    if thesis_type == "pct_move" and thesis_entry:
        if thesis_entry == 0:
            return False
        current_pct = (current_price - thesis_entry) / thesis_entry * 100
        last_pct    = (last_price    - thesis_entry) / thesis_entry * 100
        if thesis_value > 0:
            return last_pct < thesis_value <= current_pct   # upside target
        else:
            return last_pct > thesis_value >= current_pct   # downside target

    return False  # 'monitoring' — user watching, never auto-triggers
