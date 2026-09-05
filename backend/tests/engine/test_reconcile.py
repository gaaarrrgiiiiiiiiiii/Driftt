from app.engine.reconcile import reconcile, ReconcileResult


def test_sources_agree():
    r = reconcile(100.0, 5, 100.2, 6)
    assert not r.conflict
    assert 100.0 <= r.price <= 100.2


def test_sources_disagree_prefers_fresher():
    r = reconcile(100.0, 5, 101.0, 8)
    assert r.conflict
    assert r.preferred_source == "yahoo"   # yahoo is fresher (5s < 8s)
    assert r.divergence_pct is not None
    assert r.yahoo_price == 100.0
    assert r.nse_price == 101.0


def test_sources_disagree_prefers_nse_when_fresher():
    r = reconcile(100.0, 10, 101.0, 2)
    assert r.conflict
    assert r.preferred_source == "nse"     # nse is fresher (2s < 10s)


def test_nse_unavailable():
    r = reconcile(99.5, 3, None, None)
    assert not r.conflict
    assert r.price == 99.5
    assert r.yahoo_price == 99.5


def test_conflict_prices_populated():
    """Bug 3 fix: both prices must be on the result so ingestion.py can store them."""
    r = reconcile(100.0, 5, 101.0, 8)
    assert r.yahoo_price == 100.0
    assert r.nse_price == 101.0
    assert r.divergence_pct is not None
    assert r.preferred_source is not None


def test_divergence_below_threshold_no_conflict():
    # 0.1% divergence — below 0.5% threshold
    r = reconcile(100.0, 5, 100.1, 6)
    assert not r.conflict
