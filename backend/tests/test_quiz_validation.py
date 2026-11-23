import pytest
from pydantic import ValidationError
from backend.app.models.schemas import QuizQuestion, QuizData

def test_valid_quiz_question():
    q = QuizQuestion(
        question="What is condensation?",
        options=["Liquid to gas", "Gas to liquid", "Solid to gas", "Liquid to solid"],
        correct_index=1,
        explanation="Condensation turns gas into liquid droplets."
    )
    assert q.correct_index == 1
    assert len(q.options) == 4

def test_quiz_question_requires_four_options():
    with pytest.raises(ValidationError):
        QuizQuestion(
            question="Invalid question?",
            options=["Option 1", "Option 2"],  # Less than 4
            correct_index=0,
            explanation="Invalid"
        )

def test_quiz_question_correct_index_bounds():
    with pytest.raises(ValidationError):
        QuizQuestion(
            question="Invalid index?",
            options=["A", "B", "C", "D"],
            correct_index=4,  # Out of bounds (must be 0-3)
            explanation="Invalid"
        )

def test_valid_quiz_data():
    data = {
        "topic": "Solar System",
        "questions": [
            {
                "question": f"Question {i}?",
                "options": ["A", "B", "C", "D"],
                "correct_index": i % 4,
                "explanation": "Valid explanation"
            }
            for i in range(5)
        ]
    }
    quiz = QuizData.model_validate(data)
    assert quiz.topic == "Solar System"
    assert len(quiz.questions) == 5
