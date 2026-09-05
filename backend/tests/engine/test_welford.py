import math
import pytest
from app.engine.welford import WelfordState, update, from_db


def test_single_update():
    s = update(WelfordState(), 5.0)
    assert s.count == 1
    assert s.mean == 5.0
    assert s.stddev == 0.0  # need >= 2 samples for stddev


def test_known_sequence():
    """Known sequence: [2,4,4,4,5,5,7,9] → mean=5, sample stddev=√(32/7)."""
    s = WelfordState()
    for v in [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]:
        s = update(s, v)
    assert abs(s.mean - 5.0) < 1e-9
    assert abs(s.stddev - math.sqrt(32 / 7)) < 1e-6


def test_immutability():
    """update() must return a new state, not mutate the original."""
    original = WelfordState(count=1, mean=5.0, m2=0.0)
    new_state = update(original, 10.0)
    assert original.count == 1      # unchanged
    assert new_state.count == 2


def test_reconstruct_from_db():
    """Round-trip: state → DB columns → WelfordState → same stddev."""
    s = WelfordState()
    for v in [1.0, 2.0, 3.0, 4.0, 5.0]:
        s = update(s, v)
    s2 = from_db(s.count, s.mean, s.m2)
    assert s2.count == s.count
    assert abs(s2.mean - s.mean) < 1e-12
    assert abs(s2.stddev - s.stddev) < 1e-12


def test_two_sample_variance():
    s = WelfordState()
    s = update(s, 0.0)
    s = update(s, 2.0)
    assert abs(s.mean - 1.0) < 1e-9
    assert abs(s.variance - 2.0) < 1e-9   # sample variance of [0, 2]
