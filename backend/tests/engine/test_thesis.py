from app.engine.thesis import is_thesis_crossed


def test_price_level_crossed_down():
    assert is_thesis_crossed(
        current_price=1390.0, last_price=1420.0,
        thesis_type="price_level", thesis_value=1400.0, thesis_entry=None
    ) is True


def test_price_level_crossed_up():
    assert is_thesis_crossed(
        current_price=1420.0, last_price=1380.0,
        thesis_type="price_level", thesis_value=1400.0, thesis_entry=None
    ) is True


def test_price_level_not_crossed():
    assert is_thesis_crossed(
        current_price=1410.0, last_price=1420.0,
        thesis_type="price_level", thesis_value=1400.0, thesis_entry=None
    ) is False


def test_pct_move_upside_crossed():
    # Target +10% from ₹1000 entry = ₹1100 target
    assert is_thesis_crossed(
        current_price=1105.0, last_price=1090.0,
        thesis_type="pct_move", thesis_value=10.0, thesis_entry=1000.0
    ) is True


def test_pct_move_downside_crossed():
    # Target -5% from ₹1000 = ₹950
    assert is_thesis_crossed(
        current_price=945.0, last_price=960.0,
        thesis_type="pct_move", thesis_value=-5.0, thesis_entry=1000.0
    ) is True


def test_monitoring_never_triggers():
    assert is_thesis_crossed(
        current_price=2000.0, last_price=1000.0,
        thesis_type="monitoring", thesis_value=None, thesis_entry=None
    ) is False


def test_no_thesis_type_returns_false():
    assert is_thesis_crossed(1000.0, 900.0, None, None, None) is False
