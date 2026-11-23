from datetime import date, datetime, timedelta
from backend.app.services.streak_service import (
    calculate_streak,
    get_daily_window_ist,
    get_weekly_window_ist,
    IST_TZ,
)

def test_streak_calculation_active_today():
    today = date(2026, 11, 21)
    # Active today, yesterday, and day before = 3 day streak
    active_dates = [
        today,
        today - timedelta(days=1),
        today - timedelta(days=2),
    ]
    assert calculate_streak(active_dates, today) == 3

def test_streak_does_not_increase_on_multiple_attempts_same_day():
    today = date(2026, 11, 21)
    # Multiple attempts on today and yesterday should still only count as 2 days
    active_dates = [today, today, today, today - timedelta(days=1), today - timedelta(days=1)]
    assert calculate_streak(active_dates, today) == 2

def test_streak_remains_active_if_pending_today():
    today = date(2026, 11, 21)
    # Student hasn't taken quiz yet today, but took it yesterday and day before
    active_dates = [
        today - timedelta(days=1),
        today - timedelta(days=2),
    ]
    # Streak should be 2 (waiting for today)
    assert calculate_streak(active_dates, today) == 2

def test_streak_resets_if_day_missed():
    today = date(2026, 11, 21)
    # Last active was 2 days ago (missed yesterday)
    active_dates = [
        today - timedelta(days=2),
        today - timedelta(days=3),
    ]
    assert calculate_streak(active_dates, today) == 0

def test_ist_daily_window():
    ref_dt = datetime(2026, 11, 21, 14, 30, tzinfo=IST_TZ)
    start, end = get_daily_window_ist(ref_dt)
    assert start.hour == 0 and start.minute == 0 and start.second == 0
    assert end.hour == 23 and end.minute == 59 and end.second == 59
    assert start.date() == ref_dt.date()

def test_ist_weekly_window_starts_monday():
    # 2026-11-21 is a Saturday (weekday 5)
    ref_dt = datetime(2026, 11, 21, 12, 0, tzinfo=IST_TZ)
    start, end = get_weekly_window_ist(ref_dt)
    # Monday was 2026-11-16
    assert start.date() == date(2026, 11, 16)
    assert start.weekday() == 0  # Monday
    # Sunday ends on 2026-11-22
    assert end.date() == date(2026, 11, 22)
    assert end.weekday() == 6  # Sunday
