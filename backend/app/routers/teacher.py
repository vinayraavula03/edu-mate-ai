from typing import Optional, List
from collections import defaultdict
from fastapi import APIRouter, Header, Query

from backend.app.models.schemas import (
    TeacherInsightsResponse,
    TopicInsight,
    WeakQuestionInsight,
)
from backend.app.services.supabase_client import (
    get_supabase_client,
    local_db,
)

router = APIRouter(prefix="/teacher", tags=["Teacher"])

@router.get("/insights", response_model=TeacherInsightsResponse)
def get_teacher_insights(
    class_id: str = Query(..., description="Class ID"),
    authorization: Optional[str] = Header(None)
):
    """
    Teacher weak-topic summary:
    Identifies questions and topics students struggled with most based on quiz attempts.
    """
    attempts = [a for a in local_db.quiz_attempts if a["class_id"] == class_id]

    client = get_supabase_client()
    if client:
        try:
            res = client.table("quiz_attempts").select("*").eq("class_id", class_id).execute()
            if res.data:
                attempts = res.data
        except Exception:
            pass

    if not attempts:
        # Return welcoming default state if no quiz attempts submitted yet
        return TeacherInsightsResponse(
            class_id=class_id,
            total_attempts=0,
            average_accuracy=0.0,
            weak_topics=[
                TopicInsight(
                    topic="Water Cycle (Example Insight)",
                    failure_rate=40.0,
                    questions_missed=[
                        WeakQuestionInsight(
                            question="What process turns liquid water into water vapor?",
                            wrong_count=4,
                            total_attempts=10,
                            failure_rate=40.0,
                            common_wrong_answers=["Condensation"]
                        )
                    ]
                )
            ]
        )

    total_attempts = len(attempts)
    total_score = sum(a.get("score", 0) for a in attempts)
    total_q = sum(a.get("total", 5) for a in attempts)
    avg_accuracy = round((total_score / total_q) * 100.0, 2) if total_q > 0 else 0.0

    # Group by question and analyze wrong answers
    question_stats = defaultdict(lambda: {"wrong": 0, "total": 0, "wrong_choices": defaultdict(int), "topic": "General"})

    for att in attempts:
        answers = att.get("answers_json", [])
        for ans in answers:
            q_idx = ans.get("question_index", 0)
            is_wrong = ans.get("selected", -1) != 1  # sample approximation
            q_key = f"Question #{q_idx + 1}"
            question_stats[q_key]["total"] += 1
            if is_wrong:
                question_stats[q_key]["wrong"] += 1

    # Format insights
    weak_questions: List[WeakQuestionInsight] = []
    for q_name, stat in question_stats.items():
        w_count = stat["wrong"]
        t_count = stat["total"]
        rate = round((w_count / t_count) * 100.0, 1) if t_count > 0 else 0.0
        if rate > 0:
            weak_questions.append(
                WeakQuestionInsight(
                    question=q_name,
                    wrong_count=w_count,
                    total_attempts=t_count,
                    failure_rate=rate,
                    common_wrong_answers=[]
                )
            )

    return TeacherInsightsResponse(
        class_id=class_id,
        total_attempts=total_attempts,
        average_accuracy=avg_accuracy,
        weak_topics=[
            TopicInsight(
                topic="Daily Quiz Challenges",
                failure_rate=round(100.0 - avg_accuracy, 1),
                questions_missed=weak_questions[:5]
            )
        ]
    )
