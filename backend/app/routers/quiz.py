import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Query, Body

from backend.app.models.schemas import (
    QuizClientResponse,
    QuizSubmissionRequest,
    QuizSubmissionResult,
    PracticeQuizRequest,
)
from backend.app.services.gemini_service import generate_quiz_with_ai
from backend.app.services.quiz_service import (
    sanitize_quiz_for_client,
    calculate_quiz_score_and_points,
)
from backend.app.services.streak_service import get_ist_today, get_daily_window_ist
from backend.app.services.supabase_client import (
    get_supabase_client,
    verify_token_and_get_user,
    local_db,
)

router = APIRouter(prefix="/quiz", tags=["Quiz"])

def get_current_user(authorization: Optional[str]) -> dict:
    user = verify_token_and_get_user(authorization)
    if user:
        return user
    return {"id": "demo-student-id", "email": "student@edumate.com", "role": "student"}

@router.get("/today", response_model=QuizClientResponse)
def get_today_quiz(
    class_id: str = Query(..., description="ID of the student's class"),
    authorization: Optional[str] = Header(None)
):
    """
    Returns today's 5-question shared daily quiz for the class.
    Correct answers and explanations are stripped server-side.
    """
    user = get_current_user(authorization)
    student_id = user["id"]
    today_ist = get_ist_today()
    today_str = str(today_ist)
    quiz_cache_key = f"{class_id}_{today_str}"

    quiz_record = None

    # Try Supabase first
    client = get_supabase_client()
    if client:
        try:
            res = client.table("daily_quizzes").select("*").eq("class_id", class_id).eq("quiz_date", today_str).execute()
            if res.data:
                quiz_record = res.data[0]
            else:
                # Pre-generate or lazy-generate for today!
                ai_quiz = generate_quiz_with_ai(topic="General Science & Wonders")
                inserted = client.table("daily_quizzes").insert({
                    "class_id": class_id,
                    "quiz_date": today_str,
                    "topic": ai_quiz.topic,
                    "questions_json": [q.model_dump() for q in ai_quiz.questions]
                }).execute()
                if inserted.data:
                    quiz_record = inserted.data[0]
        except Exception:
            pass

    # Local storage fallback
    if not quiz_record:
        if quiz_cache_key not in local_db.daily_quizzes:
            ai_quiz = generate_quiz_with_ai(topic="General Science & Wonders")
            local_db.daily_quizzes[quiz_cache_key] = {
                "id": str(uuid.uuid4()),
                "class_id": class_id,
                "quiz_date": today_str,
                "topic": ai_quiz.topic,
                "questions_json": [q.model_dump() for q in ai_quiz.questions],
                "created_at": datetime.utcnow().isoformat()
            }
        quiz_record = local_db.daily_quizzes[quiz_cache_key]

    quiz_id = quiz_record["id"]
    questions_raw = quiz_record["questions_json"]
    topic = quiz_record.get("topic", "Daily Challenge")

    # Check if student already submitted this quiz
    already_completed = False
    prev_score = None
    prev_points = None

    if client:
        try:
            att_res = client.table("quiz_attempts").select("*").eq("quiz_id", quiz_id).eq("user_id", student_id).execute()
            if att_res.data:
                already_completed = True
                prev_score = att_res.data[0].get("score")
                prev_points = att_res.data[0].get("points")
        except Exception:
            pass

    if not already_completed:
        att = next((a for a in local_db.quiz_attempts if a["quiz_id"] == quiz_id and a["user_id"] == student_id), None)
        if att:
            already_completed = True
            prev_score = att.get("score")
            prev_points = att.get("points")

    return sanitize_quiz_for_client(
        questions=questions_raw,
        quiz_id=quiz_id,
        class_id=class_id,
        quiz_date=today_str,
        topic=topic,
        already_completed=already_completed,
        previous_score=prev_score,
        previous_points=prev_points
    )

@router.post("/submit", response_model=QuizSubmissionResult)
def submit_quiz_attempt(
    req: QuizSubmissionRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Server-side scoring of daily quiz attempt.
    Enforces anti-gaming: 1 scored attempt per quiz per student, points calculation, daily cap.
    """
    user = get_current_user(authorization)
    student_id = user["id"]

    # Locate quiz questions
    quiz_record = None
    client = get_supabase_client()
    if client:
        try:
            res = client.table("daily_quizzes").select("*").eq("id", req.quiz_id).execute()
            if res.data:
                quiz_record = res.data[0]
        except Exception:
            pass

    if not quiz_record:
        for q in local_db.daily_quizzes.values():
            if q["id"] == req.quiz_id:
                quiz_record = q
                break

    if not quiz_record:
        raise HTTPException(status_code=404, detail="Daily quiz not found.")

    questions_raw = quiz_record["questions_json"]

    # Anti-gaming check: has student already submitted this quiz?
    already_submitted = False
    if client:
        try:
            att_res = client.table("quiz_attempts").select("*").eq("quiz_id", req.quiz_id).eq("user_id", student_id).execute()
            if att_res.data:
                already_submitted = True
        except Exception:
            pass

    if not already_submitted:
        already_submitted = any(
            a["quiz_id"] == req.quiz_id and a["user_id"] == student_id
            for a in local_db.quiz_attempts
        )

    if already_submitted:
        # Return existing results or error
        raise HTTPException(
            status_code=400,
            detail="You have already submitted today's quiz! Only one scored attempt is allowed per day."
        )

    # Check if this is student's first scored quiz of today in IST
    today_start, today_end = get_daily_window_ist()
    today_start_iso = today_start.isoformat()

    points_earned_today = 0
    is_first_today = True

    # Calculate user's points already earned today for daily cap
    for att in local_db.quiz_attempts:
        if att["user_id"] == student_id and att.get("created_at", "") >= today_start_iso:
            points_earned_today += att.get("points", 0)
            is_first_today = False

    score, total, accuracy, breakdown, question_details = calculate_quiz_score_and_points(
        questions=questions_raw,
        student_answers=req.answers,
        is_first_today=is_first_today,
        current_today_points=points_earned_today
    )

    attempt_record = {
        "id": str(uuid.uuid4()),
        "quiz_id": req.quiz_id,
        "user_id": student_id,
        "class_id": req.class_id,
        "score": score,
        "total": total,
        "points": breakdown.total_earned,
        "accuracy": accuracy,
        "answers_json": [{"question_index": i, "selected": a} for i, a in enumerate(req.answers)],
        "created_at": datetime.utcnow().isoformat()
    }

    if client:
        try:
            client.table("quiz_attempts").insert(attempt_record).execute()
        except Exception:
            pass

    local_db.quiz_attempts.append(attempt_record)

    return QuizSubmissionResult(
        quiz_id=req.quiz_id,
        score=score,
        total=total,
        accuracy=accuracy,
        points=breakdown.total_earned,
        points_breakdown=breakdown,
        already_submitted=False,
        question_details=question_details
    )

@router.post("/practice")
def generate_practice_quiz(req: PracticeQuizRequest):
    """
    Generates a practice quiz on any topic for extra learning.
    Practice quizzes do not count for class leaderboard points.
    """
    ai_quiz = generate_quiz_with_ai(topic=req.topic, language=req.language)
    return {
        "topic": ai_quiz.topic,
        "questions": [q.model_dump() for q in ai_quiz.questions],
        "is_practice": True,
        "note": "Practice quizzes are for personal mastery and do not award leaderboard points."
    }

@router.post("/set-daily")
def set_daily_quiz_topic(
    class_id: str = Body(..., embed=True),
    topic: Optional[str] = Body(None, embed=True),
    authorization: Optional[str] = Header(None)
):
    """Teacher sets custom topic or triggers AI pick for today's class quiz."""
    user = get_current_user(authorization)
    selected_topic = topic.strip() if topic and topic.strip() else "Forces and Motion"

    today_str = str(get_ist_today())
    ai_quiz = generate_quiz_with_ai(topic=selected_topic)

    quiz_data = {
        "id": str(uuid.uuid4()),
        "class_id": class_id,
        "quiz_date": today_str,
        "topic": ai_quiz.topic,
        "questions_json": [q.model_dump() for q in ai_quiz.questions],
        "created_by": user["id"],
        "created_at": datetime.utcnow().isoformat()
    }

    client = get_supabase_client()
    if client:
        try:
            client.table("daily_quizzes").upsert(quiz_data, on_conflict="class_id,quiz_date").execute()
        except Exception:
            pass

    local_db.daily_quizzes[f"{class_id}_{today_str}"] = quiz_data

    return {
        "message": f"Daily quiz set for topic '{ai_quiz.topic}'! 🚀",
        "quiz_id": quiz_data["id"],
        "topic": ai_quiz.topic
    }
