"""
Materiality Score: 0–100 composite of z-score, volume anomaly, and thesis trigger.
Every weight is documented and defensible in Q&A.

Score components:
  price_component  0–50  primary signal (z-score of return vs own baseline)
  volume_component 0–30  volume anomaly confirms price; anomaly alone is weak
  thesis_bonus        20  user's stated watch reason was crossed
  quality_penalty -10/-5  stale data / source conflict reduces confidence
  THESIS_FLOOR       90  any thesis-crossed event is floored at 90 (Bug 1 fix)

Sensitivity thresholds (Calm / Balanced / Chattery) are defined here so the
feed router and the README appendix share the same source of truth.
"""
from dataclasses import dataclass


THESIS_FLOOR = 90.0  # M11: "force Materiality Score to 90+ regardless of z-score"


@dataclass
class ScoreBreakdown:
    materiality_score: float
    z_score: float
    volume_ratio: float
    price_component: float
    volume_component: float
    thesis_bonus: float
    quality_penalty: float
    event_type: str


def compute(
    price_return: float,        # (current_price - last_close) / last_close
    stddev_return: float,       # Welford σ of session returns
    current_volume: int,        # 0 during market hours (Bug 4: EOD-only volume)
    mean_volume: int,
    thesis_crossed: bool = False,
    is_conflict: bool = False,
    is_stale: bool = False,
) -> ScoreBreakdown:
    """
    Thesis floor:
      raw = price + volume + thesis_bonus - quality_penalty
      floored = max(raw, THESIS_FLOOR)  ← applied only when thesis_crossed
      score = clamp(floored, 0, 100)

    This means a tiny-move thesis event always clears every sensitivity band
    (calm=60, balanced=35, chattery=15) without needing a bypass in the feed
    query. Bug 2 (⭐ always-visible claim) is resolved automatically.
    """
    z = abs(price_return / stddev_return) if stddev_return > 1e-9 else 0.0
    vol_ratio = current_volume / mean_volume if mean_volume > 0 else 1.0

    price_component = min(z / 5.0, 1.0) * 50
    # volume_component is 0 when current_volume=0 (market hours, Bug 4 fix)
    volume_component = max(0.0, min((vol_ratio - 1.0) / 3.0, 1.0) * 30)
    thesis_bonus = 20.0 if thesis_crossed else 0.0
    quality_penalty = 10.0 if is_stale else (5.0 if is_conflict else 0.0)

    raw = price_component + volume_component + thesis_bonus - quality_penalty
    floored = max(raw, THESIS_FLOOR) if thesis_crossed else raw
    score = round(max(0.0, min(100.0, floored)), 1)

    if thesis_crossed:
        event_type = "thesis_crossed"
    elif z >= 2.0 and vol_ratio >= 2.0:
        event_type = "volatility_breakout"
    elif vol_ratio >= 2.5:
        event_type = "volume_surge"
    else:
        event_type = "price_spike"

    return ScoreBreakdown(
        materiality_score=score,
        z_score=round(z, 2),
        volume_ratio=round(vol_ratio, 2),
        price_component=round(price_component, 1),
        volume_component=round(volume_component, 1),
        thesis_bonus=thesis_bonus,
        quality_penalty=quality_penalty,
        event_type=event_type,
    )


# Sensitivity thresholds — single source of truth used by feed router and README
SENSITIVITY_THRESHOLDS = {
    "calm":     60,   # high-attention only; thesis events always clear (score >= 90)
    "balanced": 35,   # default
    "chattery": 15,   # everything notable
}
