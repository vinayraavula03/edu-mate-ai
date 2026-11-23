from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Header

from backend.app.models.schemas import UserProfileResponse, HistoryItem, Badge
from backend.app.services.streak_service import calculate_streak, get_ist_today, get_weekly_window_ist
from backend.app.services.supabase_client import (
    get_supabase_client,
    verify_token_and_get_user,
    local_db,
)

router = APIRouter(tags=["History & Profile"])

def get_current_user(authorization: Optional[str]) -> dict:
    user = verify_token_and_get_user(authorization)
    if user:
        return user
    return {"id": "demo-student-id", "email": "student@edumate.com", "role": "student"}

@router.get("/history", response_model=List[HistoryItem])
def get_user_history(authorization: Optional[str] = Header(None)):
    """Fetch user's past explanations and quiz attempts from Supabase or fallback."""
    user = get_current_user(authorization)
    uid = user["id"]

    history_items: List[HistoryItem] = []
    client = get_supabase_client()

    # 1. Quizzes from Supabase
    if client:
        try:
            quiz_res = client.table("quiz_attempts").select("*").eq("user_id", uid).order("created_at", desc=True).execute()
            if quiz_res.data:
                for att in quiz_res.data:
                    history_items.append(
                        HistoryItem(
                            id=str(att["id"]),
                            type="quiz",
                            title="Daily Class Quiz",
                            details=f"Scored {att['score']}/{att['total']} (+{att['points']} pts)",
                            score=att["score"],
                            total=att["total"],
                            points=att["points"],
                            created_at=att.get("created_at", "")
                        )
                    )

            # 2. Explanations from Supabase
            exp_res = client.table("explanations").select("*").eq("user_id", uid).order("created_at", desc=True).execute()
            if exp_res.data:
                for exp in exp_res.data:
                    history_items.append(
                        HistoryItem(
                            id=str(exp["id"]),
                            type="explanation",
                            title=f"Explored: {exp['topic']}",
                            details=f"With {exp.get('buddy', 'AI Buddy')} in {exp.get('language', 'English')}",
                            created_at=exp.get("created_at", "")
                        )
                    )
        except Exception:
            pass

    # If Supabase had no items or failed, check local_db
    if not history_items:
        for att in local_db.quiz_attempts:
            if att["user_id"] == uid:
                history_items.append(
                    HistoryItem(
                        id=att["id"],
                        type="quiz",
                        title="Daily Class Quiz",
                        details=f"Scored {att['score']}/{att['total']} (+{att['points']} pts)",
                        score=att["score"],
                        total=att["total"],
                        points=att["points"],
                        created_at=att.get("created_at", "")
                    )
                )

        for exp in local_db.explanations:
            if exp["user_id"] == uid:
                history_items.append(
                    HistoryItem(
                        id=exp["id"],
                        type="explanation",
                        title=f"Explored: {exp['topic']}",
                        details=f"With {exp.get('buddy', 'AI Buddy')} in {exp.get('language', 'English')}",
                        created_at=exp.get("created_at", "")
                    )
                )

    history_items.sort(key=lambda x: x.created_at, reverse=True)
    return history_items

@router.get("/profile", response_model=UserProfileResponse)
def get_user_profile(authorization: Optional[str] = Header(None)):
    """
    Returns user profile with calculated streak, total points, badges,
    and real weekly goal progress from Supabase or fallback.
    """
    user = get_current_user(authorization)
    uid = user["id"]

    display_name = user.get("email", "Student Explorer").split("@")[0]
    role = user.get("role", "student")

    class_name = None
    class_id = None
    join_code = None
    user_attempts = []

    client = get_supabase_client()
    if client:
        try:
            # Profile display name and role
            p_res = client.table("profiles").select("*").eq("id", uid).execute()
            if p_res.data:
                display_name = p_res.data[0].get("display_name", display_name)
                role = p_res.data[0].get("role", role)

            # Class membership
            if role == "teacher":
                c_res = client.table("classes").select("*").eq("teacher_id", uid).limit(1).execute()
                if c_res.data:
                    class_id = c_res.data[0]["id"]
                    class_name = c_res.data[0]["name"]
                    join_code = c_res.data[0]["join_code"]
            else:
                cm_res = client.table("class_members").select("class_id, classes(*)").eq("user_id", uid).limit(1).execute()
                if cm_res.data and cm_res.data[0].get("classes"):
                    c_obj = cm_res.data[0]["classes"]
                    class_id = c_obj["id"]
                    class_name = c_obj["name"]
                    join_code = c_obj["join_code"]

            # Attempts for streak and points
            att_res = client.table("quiz_attempts").select("*").eq("user_id", uid).execute()
            if att_res.data:
                user_attempts = att_res.data
        except Exception:
            pass

    if not user_attempts:
        user_attempts = [a for a in local_db.quiz_attempts if a["user_id"] == uid]

    if not class_name:
        member_entry = next((m for m in local_db.class_members if m["user_id"] == uid), None)
        if member_entry:
            cid = member_entry["class_id"]
            cls = local_db.classes.get(cid)
            if cls:
                class_id = cls["id"]
                class_name = cls["name"]
                join_code = cls["join_code"]

    total_points = sum(a.get("points", 0) for a in user_attempts)

    # Streak calculation
    active_dates = []
    for a in user_attempts:
        dt_str = a.get("created_at", "")
        if dt_str:
            try:
                d = datetime.fromisoformat(dt_str.replace("Z", "+00:00")).date()
                active_dates.append(d)
            except Exception:
                pass

    current_streak = calculate_streak(active_dates, get_ist_today())
    if current_streak == 0 and len(user_attempts) > 0:
        current_streak = 1

    # Weekly progress (target: 5 daily quizzes)
    w_start, _ = get_weekly_window_ist()
    w_start_iso = w_start.isoformat()
    weekly_attempts_count = sum(1 for a in user_attempts if a.get("created_at", "") >= w_start_iso)
    weekly_progress = min(100.0, round((weekly_attempts_count / 5.0) * 100.0, 1))

    badges: List[Badge] = [
        Badge(
            id="first_quiz",
            title="First Step 🚀",
            description="Completed your first quiz challenge",
            icon="🎯",
            unlocked=len(user_attempts) >= 1
        ),
        Badge(
            id="perfect_score",
            title="Perfectionist ⭐",
            description="Scored 5 out of 5 on a quiz",
            icon="🏆",
            unlocked=any(a.get("score") == 5 for a in user_attempts)
        ),
        Badge(
            id="streak_master",
            title="Consistent Learner 🔥",
            description="Achieved a 3-day learning streak",
            icon="🔥",
            unlocked=current_streak >= 3
        ),
        Badge(
            id="century_club",
            title="Century Club 💯",
            description="Earned 100+ total points",
            icon="👑",
            unlocked=total_points >= 100
        )
    ]

    return UserProfileResponse(
        id=uid,
        display_name=display_name,
        role=role,
        streak=current_streak,
        total_points=total_points,
        daily_rank=1 if total_points > 0 else None,
        weekly_rank=1 if total_points > 0 else None,
        class_name=class_name,
        class_id=class_id,
        join_code=join_code,
        badges=badges,
        weekly_progress_percentage=weekly_progress
    )
