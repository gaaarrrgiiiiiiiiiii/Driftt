import pytest
from app.engine.scorer import compute, THESIS_FLOOR, SENSITIVITY_THRESHOLDS


def test_small_move_low_score():
    result = compute(price_return=0.001, stddev_return=0.02,
                     current_volume=1_000_000, mean_volume=1_000_000)
    assert result.materiality_score < 30


def test_large_move_high_score():
    result = compute(price_return=0.05, stddev_return=0.01,
                     current_volume=5_000_000, mean_volume=1_000_000)
    assert result.materiality_score >= 60


def test_thesis_crossed_floors_at_90():
    """Bug 1 fix: thesis events must score >= THESIS_FLOOR (90), not just +20."""
    result = compute(price_return=0.001, stddev_return=0.02,
                     current_volume=900_000, mean_volume=1_000_000,
                     thesis_crossed=True)
    assert result.materiality_score >= THESIS_FLOOR, (
        f"Expected >= {THESIS_FLOOR} (thesis floor), got {result.materiality_score}. "
        "Check THESIS_FLOOR constant and max(raw, THESIS_FLOOR) application."
    )
    assert result.thesis_bonus == 20.0
    assert result.event_type == "thesis_crossed"


def test_thesis_floor_survives_quality_penalties():
    """Even stale + conflict (-15 pts) should not drop thesis below 75."""
    result = compute(price_return=0.001, stddev_return=0.02,
                     current_volume=100_000, mean_volume=1_000_000,
                     thesis_crossed=True, is_stale=True, is_conflict=True)
    # floor(90) - 15 penalty = 75, still visible on Calm band (60+)
    assert result.materiality_score >= 70.0


def test_large_thesis_move_reaches_100():
    """A strong move + thesis crossed should still be able to hit 100."""
    result = compute(price_return=0.10, stddev_return=0.01,
                     current_volume=5_000_000, mean_volume=1_000_000,
                     thesis_crossed=True)
    assert result.materiality_score == 100.0


def test_thesis_always_clears_all_sensitivity_bands():
    """Bug 2 fix: thesis events clear calm (60), balanced (35), chattery (15)."""
    result = compute(price_return=0.0, stddev_return=0.02,
                     current_volume=1_000_000, mean_volume=1_000_000,
                     thesis_crossed=True)
    for band, threshold in SENSITIVITY_THRESHOLDS.items():
        assert result.materiality_score >= threshold, (
            f"Thesis event ({result.materiality_score}) filtered by {band} ({threshold})"
        )


def test_stale_penalty_applied():
    normal = compute(0.04, 0.01, 2_000_000, 1_000_000)
    stale  = compute(0.04, 0.01, 2_000_000, 1_000_000, is_stale=True)
    assert stale.materiality_score < normal.materiality_score


def test_intraday_volume_zeroed():
    """Bug 4: when current_volume=0 (market hours), volume_component must be 0."""
    result = compute(price_return=0.03, stddev_return=0.01,
                     current_volume=0, mean_volume=1_000_000)
    assert result.volume_component == 0.0
    assert result.volume_ratio == 0.0


def test_event_type_labels():
    # thesis_crossed
    r = compute(0.001, 0.02, 0, 1_000_000, thesis_crossed=True)
    assert r.event_type == "thesis_crossed"
    # volatility_breakout: z>=2 AND vol_ratio>=2
    r = compute(0.10, 0.01, 2_000_000, 1_000_000)
    assert r.event_type == "volatility_breakout"
    # volume_surge: vol_ratio>=2.5, low z
    r = compute(0.001, 0.02, 3_000_000, 1_000_000)
    assert r.event_type == "volume_surge"
