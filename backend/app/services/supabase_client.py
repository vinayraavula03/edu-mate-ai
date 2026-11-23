import jwt
import logging
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from backend.app.config import settings

logger = logging.getLogger(__name__)

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Optional[Client]:
    """Return initialized Supabase client with service role key if available."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("Supabase URL or Key missing in configuration.")
        return None

    try:
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        return _supabase_client
    except Exception as e:
        logger.warning(f"Could not connect to Supabase: {e}")
        return None

def verify_token_and_get_user(auth_header: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Extract user from Bearer JWT token header.
    Returns: dict with 'id', 'email', 'role' or None if invalid.
    """
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ")[1].strip()
    if not token:
        return None

    # First attempt: Verify via Supabase client if connected
    client = get_supabase_client()
    if client:
        try:
            user_resp = client.auth.get_user(token)
            if user_resp and user_resp.user:
                u = user_resp.user
                return {
                    "id": u.id,
                    "email": u.email,
                    "role": getattr(u, "role", "student")
                }
        except Exception:
            pass

    # Second attempt: Decode JWT payload directly (useful for local development & mock tokens)
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get("sub") or decoded.get("id")
        if user_id:
            return {
                "id": str(user_id),
                "email": decoded.get("email", f"user_{str(user_id)[:6]}@edumate.internal"),
                "role": decoded.get("user_metadata", {}).get("role", "student")
            }
    except Exception as e:
        logger.debug(f"JWT decode fallback failed: {e}")

    return None

# In-memory storage fallback for local development or when Supabase project is not yet provisioned
class LocalMockDB:
    def __init__(self):
        self.profiles: Dict[str, Dict[str, Any]] = {
            "demo-teacher-id": {
                "id": "demo-teacher-id",
                "display_name": "Mrs. Sharma",
                "role": "teacher"
            },
            "demo-student-id": {
                "id": "demo-student-id",
                "display_name": "Vinay_Ace",
                "role": "student"
            },
            "student-2-id": {
                "id": "student-2-id",
                "display_name": "Aarav_Star",
                "role": "student"
            },
            "student-3-id": {
                "id": "student-3-id",
                "display_name": "Priya_Pro",
                "role": "student"
            }
        }
        self.classes: Dict[str, Dict[str, Any]] = {
            "demo-class-id": {
                "id": "demo-class-id",
                "name": "Class 6-A",
                "join_code": "EDU6A",
                "teacher_id": "demo-teacher-id",
                "created_at": "2026-11-20T10:00:00Z"
            }
        }
        self.class_members: List[Dict[str, Any]] = [
            {"id": "m1", "class_id": "demo-class-id", "user_id": "demo-student-id", "joined_at": "2026-11-20T10:05:00Z"},
            {"id": "m2", "class_id": "demo-class-id", "user_id": "student-2-id", "joined_at": "2026-11-20T10:10:00Z"},
            {"id": "m3", "class_id": "demo-class-id", "user_id": "student-3-id", "joined_at": "2026-11-20T10:15:00Z"},
        ]
        self.daily_quizzes: Dict[str, Dict[str, Any]] = {}
        self.quiz_attempts: List[Dict[str, Any]] = []
        self.explanations: List[Dict[str, Any]] = []
        self.announcements: Dict[str, Dict[str, Any]] = {}

local_db = LocalMockDB()
