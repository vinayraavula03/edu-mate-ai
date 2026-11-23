from datetime import datetime, date, timedelta, timezone
from typing import List, Tuple, Optional

# IST is UTC + 5:30
IST_TZ = timezone(timedelta(hours=5, minutes=30))

def get_ist_now() -> datetime:
    """Return the current datetime in India Standard Time (IST)."""
    return datetime.now(IST_TZ)

def get_ist_today() -> date:
    """Return today's date in IST."""
    return get_ist_now().date()

def get_daily_window_ist(ref_dt: Optional[datetime] = None) -> Tuple[datetime, datetime]:
    """
    Return (start_datetime, end_datetime) for today's daily leaderboard in IST.
    Daily: sum of points earned since midnight IST (00:00:00) until 23:59:59.999999 IST.
    """
    if ref_dt is None:
        ref_dt = get_ist_now()
    else:
        if ref_dt.tzinfo is None:
            ref_dt = ref_dt.replace(tzinfo=IST_TZ)
        else:
            ref_dt = ref_dt.astimezone(IST_TZ)

    start = datetime(ref_dt.year, ref_dt.month, ref_dt.day, 0, 0, 0, 0, tzinfo=IST_TZ)
    end = start + timedelta(days=1) - timedelta(microseconds=1)
    return start, end

def get_weekly_window_ist(ref_dt: Optional[datetime] = None) -> Tuple[datetime, datetime]:
    """
    Return (start_datetime, end_datetime) for this week's leaderboard in IST.
    Weekly: Monday 00:00:00 IST to Sunday 23:59:59.999999 IST.
    """
    if ref_dt is None:
        ref_dt = get_ist_now()
    else:
        if ref_dt.tzinfo is None:
            ref_dt = ref_dt.replace(tzinfo=IST_TZ)
        else:
            ref_dt = ref_dt.astimezone(IST_TZ)

    # In Python, Monday is weekday 0, Sunday is weekday 6
    weekday = ref_dt.weekday()
    monday_date = ref_dt.date() - timedelta(days=weekday)
    
    start = datetime(monday_date.year, monday_date.month, monday_date.day, 0, 0, 0, 0, tzinfo=IST_TZ)
    sunday_end = start + timedelta(days=7) - timedelta(microseconds=1)
    return start, sunday_end

def calculate_streak(active_dates: List[date], today: Optional[date] = None) -> int:
    """
    Calculate consecutive daily learning streak.
    - Streak increases at most once per day.
    - If user has completed a quiz today: streak includes today and consecutive preceding days.
    - If user has NOT yet completed today, but did yesterday: streak remains intact (active), waiting for today.
    - If user missed yesterday: streak is 0.
    """
    if not active_dates:
        return 0

    if today is None:
        today = get_ist_today()

    unique_dates = set(active_dates)

    # Check if streak starts today or yesterday
    if today in unique_dates:
        check_date = today
    elif (today - timedelta(days=1)) in unique_dates:
        check_date = today - timedelta(days=1)
    else:
        return 0

    streak = 0
    while check_date in unique_dates:
        streak += 1
        check_date -= timedelta(days=1)

    return streak
