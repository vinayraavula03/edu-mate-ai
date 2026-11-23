from backend.app.services.quiz_service import (
    calculate_quiz_score_and_points,
    sanitize_quiz_for_client,
)

SAMPLE_QUESTIONS = [
    {
        "question": f"Question {i}?",
        "options": ["Option 0", "Option 1", "Option 2", "Option 3"],
        "correct_index": 2,
        "explanation": f"Explanation {i}"
    }
    for i in range(5)
]

def test_perfect_score_calculation():
    # Student answers all 5 correctly on their first quiz of the day
    answers = [2, 2, 2, 2, 2]
    score, total, accuracy, breakdown, details = calculate_quiz_score_and_points(
        questions=SAMPLE_QUESTIONS,
        student_answers=answers,
        is_first_today=True,
        current_today_points=0
    )
    assert score == 5
    assert total == 5
    assert accuracy == 100.0
    assert breakdown.base_points == 50
    assert breakdown.completion_bonus == 5
    assert breakdown.perfect_bonus == 10
    assert breakdown.first_attempt_bonus == 5
    assert breakdown.total_earned == 70
    assert breakdown.daily_cap_applied is False

def test_partial_score_calculation():
    # 3 correct, 2 wrong, not first quiz today
    answers = [2, 2, 2, 0, 1]
    score, total, accuracy, breakdown, details = calculate_quiz_score_and_points(
        questions=SAMPLE_QUESTIONS,
        student_answers=answers,
        is_first_today=False,
        current_today_points=0
    )
    assert score == 3
    assert total == 5
    assert accuracy == 60.0
    assert breakdown.base_points == 30
    assert breakdown.completion_bonus == 5
    assert breakdown.perfect_bonus == 0
    assert breakdown.first_attempt_bonus == 0
    assert breakdown.total_earned == 35

def test_daily_points_cap_enforcement():
    # Student has already earned 80 points today.
    # A perfect score gives 70 points, but daily cap is 100, so only 20 points should be awarded.
    answers = [2, 2, 2, 2, 2]
    score, total, accuracy, breakdown, details = calculate_quiz_score_and_points(
        questions=SAMPLE_QUESTIONS,
        student_answers=answers,
        is_first_today=True,
        current_today_points=80
    )
    assert breakdown.base_points == 50
    assert breakdown.total_earned == 20
    assert breakdown.daily_cap_applied is True

def test_client_quiz_sanitization_removes_answers():
    client_quiz = sanitize_quiz_for_client(
        questions=SAMPLE_QUESTIONS,
        quiz_id="quiz-123",
        class_id="class-456",
        quiz_date="2026-11-21",
        topic="Water Cycle"
    )
    assert client_quiz.quiz_id == "quiz-123"
    assert len(client_quiz.questions) == 5

    for q in client_quiz.questions:
        # Check that QuizQuestionClient has only question and options
        assert hasattr(q, "question")
        assert hasattr(q, "options")
        assert not hasattr(q, "correct_index")
        assert not hasattr(q, "explanation")
