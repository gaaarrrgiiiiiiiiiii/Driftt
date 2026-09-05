import pytest
from pydantic import ValidationError
from app.routers.watchlist import WatchlistCreate, WatchlistItemCreate


def test_watchlist_create_schema():
    req = WatchlistCreate(name="My Core Portfolio")
    assert req.name == "My Core Portfolio"


def test_watchlist_item_create_valid():
    item = WatchlistItemCreate(
        symbol="RELIANCE.NS",
        thesis_type="price_level",
        thesis_value=1400.0,
        thesis_entry=1420.0
    )
    assert item.symbol == "RELIANCE.NS"
    assert item.thesis_type == "price_level"
    assert item.thesis_value == 1400.0


def test_watchlist_item_create_optional_thesis():
    item = WatchlistItemCreate(symbol="TCS.NS")
    assert item.symbol == "TCS.NS"
    assert item.thesis_type is None
    assert item.thesis_value is None
