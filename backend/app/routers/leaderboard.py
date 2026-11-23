from typing import Optional
from fastapi import APIRouter, Header, Query

from backend.app.models.schemas import LeaderboardResponse
from backend.app.services.leaderboard_service import compute_leaderboard_from_attempts
from backend.app.services.streak_service import get_daily_window_ist, get_weekly_window_ist
from backend.app.services.supabase_client import (
    get_supabase_client,
    verify_token_and_get_user,
    local_db,
)

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])

def get_current_user(authorization: Optional[str]) -> dict:
    user = verify_token_and_get_user(authorization)
    if user:
        return user
    return {"id": "demo-student-id", "email": "student@edumate.com", "role": "student"}

@router.get("", response_model=LeaderboardResponse)
def get_class_leaderboard(
    class_id: str = Query(..., description="Class ID"),
    range: str = Query("daily", pattern="^(daily|weekly)$"),
    authorization: Optional[str] = Header(None)
):
    """
    Returns live class leaderboard computed dynamically from quiz_attempts.
    - daily: window from midnight IST today to now.
    - weekly: window from Monday 00:00 IST to Sunday 23:59 IST.
    """
    user = get_current_user(authorization)
    current_uid = user["id"]

    # Determine window
    if range == "daily":
        start_dt, end_dt = get_daily_window_ist()
    else:
        start_dt, end_dt = get_weekly_window_ist()

    start_iso = start_dt.isoformat()
    end_iso = end_dt.isoformat()

    attempts = []
    profiles_map = {}

    client = get_supabase_client()
    if client:
        try:
            # Query attempts for this class in date window
            att_res = client.table("quiz_attempts")\
                .select("user_id, points, score, total, accuracy, created_at")\
                .eq("class_id", class_id)\
                .gte("created_at", start_iso)\
                .lte("created_at", end_iso)\
                .execute()

            if att_res.data:
                attempts = att_res.data

            # Fetch profiles (display_name only - privacy!)
            prof_res = client.table("profiles").select("id, display_name").execute()
            if prof_res.data:
                profiles_map = {p["id"]: p["display_name"] for p in prof_res.data}
        except Exception:
            pass

    if not attempts:
        # Fallback to local_db attempts
        attempts = [
            a for a in local_db.quiz_attempts
            if a["class_id"] == class_id and start_iso <= a.get("created_at", "") <= end_iso
        ]
        # Include profiles from local_db
        profiles_map = {uid: p["display_name"] for uid, p in local_db.profiles.items()}

    # If no attempts yet in demo, add a friendly mock competitor to show live leaderboard UI
    if not attempts and class_id == "demo-class-id":
        attempts = [
            {"user_id": "student-2-id", "points": 65, "score": 5, "total": 5, "accuracy": 100.0, "created_at": start_iso},
            {"user_id": "student-3-id", "points": 45, "score": 4, "total": 5, "accuracy": 80.0, "created_at": start_iso},
        ]

    return compute_leaderboard_from_attempts(
        attempts=attempts,
        profiles_map=profiles_map,
        current_user_id=current_uid,
        class_id=class_id,
        range_type=range
    )
