"""
Welford's online algorithm for running mean and variance.
O(1) per update. No full-window data needed. Numerically stable.

Reference: Welford, B.P. (1962). "Note on a method for calculating corrected
sums of squares and products." Technometrics 4(3): 419–420.
"""
from dataclasses import dataclass


@dataclass
class WelfordState:
    count: int = 0
    mean: float = 0.0
    m2: float = 0.0

    @property
    def stddev(self) -> float:
        if self.count < 2:
            return 0.0
        return (self.m2 / (self.count - 1)) ** 0.5

    @property
    def variance(self) -> float:
        if self.count < 2:
            return 0.0
        return self.m2 / (self.count - 1)


def update(state: WelfordState, new_value: float) -> WelfordState:
    """Returns a NEW state. Does NOT mutate the original (immutable pattern)."""
    count = state.count + 1
    delta = new_value - state.mean
    mean = state.mean + delta / count
    delta2 = new_value - mean
    m2 = state.m2 + delta * delta2
    return WelfordState(count=count, mean=mean, m2=m2)


def from_db(session_count: int, mean_return, m2_return) -> WelfordState:
    """Reconstruct WelfordState from DB column values (Numeric → float)."""
    return WelfordState(
        count=int(session_count),
        mean=float(mean_return),
        m2=float(m2_return),
    )
