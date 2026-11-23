from backend.app.services.question_bank import get_fallback_quiz

def test_fallback_quiz_for_known_topic():
    quiz = get_fallback_quiz("water cycle")
    assert quiz.topic == "Water Cycle"
    assert len(quiz.questions) == 5
    for q in quiz.questions:
        assert len(q.options) == 4
        assert 0 <= q.correct_index <= 3
        assert len(q.explanation) > 0

def test_fallback_quiz_for_unknown_topic():
    quiz = get_fallback_quiz("quantum quantum unknown")
    # Should safely return a valid fallback quiz
    assert len(quiz.questions) == 5
    for q in quiz.questions:
        assert len(q.options) == 4
        assert 0 <= q.correct_index <= 3
