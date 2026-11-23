from typing import List, Optional
from pydantic import BaseModel, Field

# --- Quiz Schemas ---

class QuizQuestion(BaseModel):
    question: str = Field(..., description="The question text")
    options: List[str] = Field(..., min_length=4, max_length=4, description="Exactly 4 choices")
    correct_index: int = Field(..., ge=0, le=3, description="0-indexed position of correct answer")
    explanation: str = Field(..., description="Why the correct answer is right")

class QuizData(BaseModel):
    topic: str
    questions: List[QuizQuestion] = Field(..., min_length=1, max_length=10)

class QuizQuestionClient(BaseModel):
    question: str
    options: List[str]

class QuizClientResponse(BaseModel):
    quiz_id: str
    class_id: str
    quiz_date: str
    topic: str
    questions: List[QuizQuestionClient]
    already_completed: bool = False
    previous_score: Optional[int] = None
    previous_points: Optional[int] = None

class QuizSubmissionRequest(BaseModel):
    quiz_id: str
    class_id: str
    answers: List[int] = Field(..., description="List of selected option indices (0-3)")

class QuestionScoreDetail(BaseModel):
    question: str
    options: List[str]
    selected_index: int
    correct_index: int
    is_correct: bool
    explanation: str

class PointsBreakdown(BaseModel):
    base_points: int = 0
    completion_bonus: int = 0
    perfect_bonus: int = 0
    first_attempt_bonus: int = 0
    total_earned: int = 0
    daily_cap_applied: bool = False

class QuizSubmissionResult(BaseModel):
    quiz_id: str
    score: int
    total: int
    accuracy: float
    points: int
    points_breakdown: PointsBreakdown
    already_submitted: bool = False
    question_details: List[QuestionScoreDetail]

class PracticeQuizRequest(BaseModel):
    topic: str
    language: str = "English"

# --- Class Schemas ---

class ClassCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=60)

class ClassResponse(BaseModel):
    id: str
    name: str
    join_code: str
    teacher_id: str
    created_at: str
    student_count: int = 0

class ClassJoinRequest(BaseModel):
    join_code: str = Field(..., min_length=4, max_length=10)

class StudentMember(BaseModel):
    user_id: str
    display_name: str
    joined_at: str
    completed_today: bool = False
    today_score: Optional[int] = None

class ClassDetailResponse(BaseModel):
    id: str
    name: str
    join_code: str
    teacher_id: str
    created_at: str
    students: List[StudentMember] = []
    today_quiz_topic: Optional[str] = None
    today_quiz_completed_count: int = 0

# --- Leaderboard Schemas ---

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    display_name: str
    points: int
    accuracy: float
    quizzes_completed: int
    is_current_user: bool = False
    is_champion: bool = False

class LeaderboardResponse(BaseModel):
    class_id: str
    range: str  # 'daily' or 'weekly'
    top_10: List[LeaderboardEntry]
    current_user_entry: Optional[LeaderboardEntry] = None
    total_participants: int
    motivation_message: str

# --- Teacher Insights ---

class WeakQuestionInsight(BaseModel):
    question: str
    wrong_count: int
    total_attempts: int
    failure_rate: float
    common_wrong_answers: List[str] = []

class TopicInsight(BaseModel):
    topic: str
    failure_rate: float
    questions_missed: List[WeakQuestionInsight]

class TeacherInsightsResponse(BaseModel):
    class_id: str
    total_attempts: int
    average_accuracy: float
    weak_topics: List[TopicInsight]

# --- Explain Schemas ---

class ExplainRequest(BaseModel):
    topic: Optional[str] = ""
    notes_text: Optional[str] = ""
    language: str = "English"
    friend: str = "Edu the Elephant 🐘"
    mode: str = "Explain Normally"

class TopicImageResponse(BaseModel):
    image_url: Optional[str] = None
    caption: str
    source: str

# --- Profile & History Schemas ---

class Badge(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    unlocked: bool = False

class UserProfileResponse(BaseModel):
    id: str
    display_name: str
    role: str
    streak: int
    total_points: int
    daily_rank: Optional[int] = None
    weekly_rank: Optional[int] = None
    class_name: Optional[str] = None
    class_id: Optional[str] = None
    join_code: Optional[str] = None
    badges: List[Badge] = []
    weekly_progress_percentage: float = 0.0

class HistoryItem(BaseModel):
    id: str
    type: str  # 'explanation' or 'quiz'
    title: str
    details: Optional[str] = None
    score: Optional[int] = None
    total: Optional[int] = None
    points: Optional[int] = None
    created_at: str
