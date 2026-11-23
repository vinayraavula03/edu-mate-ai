from typing import List, Dict, Any, Tuple
from backend.app.config import settings
from backend.app.models.schemas import (
    QuizQuestionClient,
    QuizClientResponse,
    QuestionScoreDetail,
    PointsBreakdown,
)

def sanitize_quiz_for_client(
    questions: List[Dict[str, Any]],
    quiz_id: str,
    class_id: str,
    quiz_date: str,
    topic: str,
    already_completed: bool = False,
    previous_score: int = None,
    previous_points: int = None
) -> QuizClientResponse:
    """
    Strips correct_index and explanation before returning quiz to the student client.
    The browser NEVER receives the answer key prior to scoring on the server.
    """
    client_questions = []
    for q in questions:
        client_questions.append(
            QuizQuestionClient(
                question=q.get("question", ""),
                options=q.get("options", [])
            )
        )

    return QuizClientResponse(
        quiz_id=quiz_id,
        class_id=class_id,
        quiz_date=str(quiz_date),
        topic=topic,
        questions=client_questions,
        already_completed=already_completed,
        previous_score=previous_score,
        previous_points=previous_points
    )

def calculate_quiz_score_and_points(
    questions: List[Dict[str, Any]],
    student_answers: List[int],
    is_first_today: bool = True,
    current_today_points: int = 0
) -> Tuple[int, int, float, PointsBreakdown, List[QuestionScoreDetail]]:
    """
    Score the quiz strictly on the server and compute points with anti-gaming caps.
    Rules:
    - 10 points per correct answer
    - +5 completion bonus if all questions answered
    - +10 perfect score bonus if 5/5
    - +5 first scored quiz of the day bonus
    - Daily cap (e.g. 100 points)
    """
    total = len(questions)
    score = 0
    question_details: List[QuestionScoreDetail] = []

    for i, q in enumerate(questions):
        correct_idx = q.get("correct_index", 0)
        selected_idx = student_answers[i] if i < len(student_answers) else -1
        is_correct = (selected_idx == correct_idx)

        if is_correct:
            score += 1

        question_details.append(
            QuestionScoreDetail(
                question=q.get("question", ""),
                options=q.get("options", []),
                selected_index=selected_idx,
                correct_index=correct_idx,
                is_correct=is_correct,
                explanation=q.get("explanation", "Good effort!")
            )
        )

    accuracy = round((score / total) * 100.0, 2) if total > 0 else 0.0

    # Points Calculation
    base_points = score * settings.POINTS_PER_CORRECT
    completion_bonus = settings.POINTS_COMPLETION if (len(student_answers) >= total and total > 0) else 0
    perfect_bonus = settings.POINTS_PERFECT_SCORE if (score == total and total > 0) else 0
    first_bonus = settings.POINTS_FIRST_OF_DAY if is_first_today else 0

    raw_total_earned = base_points + completion_bonus + perfect_bonus + first_bonus

    # Apply daily cap
    available_points_today = max(0, settings.DAILY_POINTS_CAP - current_today_points)
    final_earned = min(raw_total_earned, available_points_today)
    cap_applied = raw_total_earned > available_points_today

    breakdown = PointsBreakdown(
        base_points=base_points,
        completion_bonus=completion_bonus,
        perfect_bonus=perfect_bonus,
        first_attempt_bonus=first_bonus,
        total_earned=final_earned,
        daily_cap_applied=cap_applied
    )

    return score, total, accuracy, breakdown, question_details
