from collections import defaultdict
from typing import List, Dict, Any, Optional
from backend.app.models.schemas import LeaderboardEntry, LeaderboardResponse

def compute_leaderboard_from_attempts(
    attempts: List[Dict[str, Any]],
    profiles_map: Dict[str, str],
    current_user_id: Optional[str] = None,
    class_id: str = "",
    range_type: str = "daily"
) -> LeaderboardResponse:
    """
    Computes class leaderboard dynamically over quiz_attempts.
    Sorting:
    1. Highest total points (DESC)
    2. Higher overall accuracy (DESC)
    3. Earlier submission time (ASC)
    """
    user_stats = defaultdict(lambda: {
        "points": 0,
        "score": 0,
        "total": 0,
        "quizzes_completed": 0,
        "earliest_created_at": "9999-99-99T99:99:99"
    })

    for att in attempts:
        uid = str(att.get("user_id"))
        pts = int(att.get("points", 0))
        sc = int(att.get("score", 0))
        tot = int(att.get("total", 5))
        created_at = str(att.get("created_at", ""))

        stats = user_stats[uid]
        stats["points"] += pts
        stats["score"] += sc
        stats["total"] += tot
        stats["quizzes_completed"] += 1
        if created_at and created_at < stats["earliest_created_at"]:
            stats["earliest_created_at"] = created_at

    aggregated_list = []
    for uid, stats in user_stats.items():
        total_q = stats["total"]
        accuracy = round((stats["score"] / total_q) * 100.0, 2) if total_q > 0 else 0.0
        display_name = profiles_map.get(uid, f"Student {uid[:4]}")

        aggregated_list.append({
            "user_id": uid,
            "display_name": display_name,
            "points": stats["points"],
            "accuracy": accuracy,
            "quizzes_completed": stats["quizzes_completed"],
            "earliest_created_at": stats["earliest_created_at"]
        })

    # Sort with tie-breaking:
    # 1. points descending (-x['points'])
    # 2. accuracy descending (-x['accuracy'])
    # 3. earliest_created_at ascending (x['earliest_created_at'])
    aggregated_list.sort(key=lambda x: (-x["points"], -x["accuracy"], x["earliest_created_at"]))

    ranked_entries: List[LeaderboardEntry] = []
    current_user_entry: Optional[LeaderboardEntry] = None

    for idx, item in enumerate(aggregated_list):
        rank = idx + 1
        is_curr = (current_user_id is not None and item["user_id"] == current_user_id)
        is_champ = (range_type == "weekly" and rank == 1 and item["points"] > 0)

        entry = LeaderboardEntry(
            rank=rank,
            user_id=item["user_id"],
            display_name=item["display_name"],
            points=item["points"],
            accuracy=item["accuracy"],
            quizzes_completed=item["quizzes_completed"],
            is_current_user=is_curr,
            is_champion=is_champ
        )
        ranked_entries.append(entry)

        if is_curr:
            current_user_entry = entry

    top_10 = ranked_entries[:10]
    total_participants = len(ranked_entries)

    # Motivation message calculation
    if not current_user_entry:
        motivation_message = "Complete today's daily quiz to climb your class leaderboard!"
    elif current_user_entry.rank == 1:
        motivation_message = "🏆 You're #1 in the class! Great job defending your top rank!"
    else:
        # Find points of student right ahead
        student_ahead = ranked_entries[current_user_entry.rank - 2]
        pts_diff = student_ahead.points - current_user_entry.points
        if pts_diff == 0:
            motivation_message = f"You're tied with #{current_user_entry.rank - 1}! Next quiz could put you ahead!"
        else:
            motivation_message = f"You're #{current_user_entry.rank}, only {pts_diff} points behind #{current_user_entry.rank - 1} ({student_ahead.display_name})! 🚀"

    return LeaderboardResponse(
        class_id=class_id,
        range=range_type,
        top_10=top_10,
        current_user_entry=current_user_entry,
        total_participants=total_participants,
        motivation_message=motivation_message
    )
