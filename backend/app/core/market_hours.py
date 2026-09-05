"""
IST market hours check. NSE is open Mon–Fri 09:15–15:30 IST.
Weekends and public holidays return False.

Trade-off: holiday list is approximate and manually maintained.
A production system would use an official NSE holiday API.
This edge case is documented in the README trade-off log.
"""
from datetime import datetime, time
import pytz

IST = pytz.timezone("Asia/Kolkata")
MARKET_OPEN  = time(9, 15)
MARKET_CLOSE = time(15, 30)

# NSE holidays 2026 (approximate — extend as needed)
NSE_HOLIDAYS_2026 = {
    (2026, 1, 26),   # Republic Day
    (2026, 3, 17),   # Holi
    (2026, 4, 2),    # Ram Navami
    (2026, 4, 14),   # Dr. Ambedkar Jayanti
    (2026, 5, 1),    # Maharashtra Day
    (2026, 8, 15),   # Independence Day
    (2026, 10, 2),   # Gandhi Jayanti
    (2026, 10, 24),  # Dussehra
    (2026, 11, 5),   # Diwali Laxmi Pujan
    (2026, 12, 25),  # Christmas
}


def is_market_open() -> bool:
    now = datetime.now(IST)
    if now.weekday() >= 5:                                       # Sat / Sun
        return False
    if (now.year, now.month, now.day) in NSE_HOLIDAYS_2026:
        return False
    return MARKET_OPEN <= now.time() <= MARKET_CLOSE
