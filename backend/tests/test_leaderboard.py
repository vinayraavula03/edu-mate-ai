from backend.app.services.leaderboard_service import compute_leaderboard_from_attempts

def test_leaderboard_ranking_and_tie_breaking():
    attempts = [
        # Student A: 60 points, 80% accuracy, submitted at 10:00
        {"user_id": "u-a", "points": 60, "score": 4, "total": 5, "accuracy": 80.0, "created_at": "2026-11-21T10:00:00Z"},
        # Student B: 70 points, 100% accuracy, submitted at 10:05
        {"user_id": "u-b", "points": 70, "score": 5, "total": 5, "accuracy": 100.0, "created_at": "2026-11-21T10:05:00Z"},
        # Student C: 60 points, 90% accuracy, submitted at 10:10 (Higher accuracy than A and D, so should beat them)
        {"user_id": "u-c", "points": 60, "score": 9, "total": 10, "created_at": "2026-11-21T10:10:00Z"},
        # Student D: 60 points, 80% accuracy, submitted at 09:30 (Equal accuracy with A, earlier time, so should beat A)
        {"user_id": "u-d", "points": 60, "score": 4, "total": 5, "accuracy": 80.0, "created_at": "2026-11-21T09:30:00Z"},
    ]

    profiles = {
        "u-a": "Alex_Tiger",
        "u-b": "Bella_Star",
        "u-c": "Charlie_Ace",
        "u-d": "Daisy_Champ"
    }

    resp = compute_leaderboard_from_attempts(
        attempts=attempts,
        profiles_map=profiles,
        current_user_id="u-c",
        class_id="class-test",
        range_type="daily"
    )

    # Expected order:
    # 1. u-b (70 pts)
    # 2. u-c (60 pts, 90% acc)
    # 3. u-d (60 pts, 80% acc, 09:30 time)
    # 4. u-a (60 pts, 80% acc, 10:00 time)
    order = [e.user_id for e in resp.top_10]
    assert order == ["u-b", "u-c", "u-d", "u-a"]

    # Current user is u-c (rank 2)
    assert resp.current_user_entry is not None
    assert resp.current_user_entry.rank == 2
    assert resp.current_user_entry.display_name == "Charlie_Ace"

    # Motivation message should indicate delta to rank 1 (70 - 60 = 10 pts behind)
    assert "10 points behind #1 (Bella_Star)" in resp.motivation_message

def test_leaderboard_top_student_message():
    attempts = [
        {"user_id": "u-winner", "points": 70, "score": 5, "total": 5, "created_at": "2026-11-21T10:00:00Z"},
        {"user_id": "u-runnerup", "points": 50, "score": 4, "total": 5, "created_at": "2026-11-21T10:05:00Z"},
    ]
    profiles = {"u-winner": "Winner_Kid", "u-runnerup": "Runner_Kid"}

    resp = compute_leaderboard_from_attempts(
        attempts=attempts,
        profiles_map=profiles,
        current_user_id="u-winner",
        class_id="class-test",
        range_type="weekly"
    )
    assert resp.current_user_entry.rank == 1
    assert resp.current_user_entry.is_champion is True
    assert "You're #1 in the class!" in resp.motivation_message
