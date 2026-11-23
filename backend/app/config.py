import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Search for .env in current directory, parent directory, and root
base_dir = Path(__file__).resolve().parent.parent
root_dir = base_dir.parent

env_paths = [
    root_dir / ".env",
    base_dir / ".env",
    Path(".env")
]

for env_path in env_paths:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=True)
        break
else:
    load_dotenv(override=True)

class Settings:
    PROJECT_NAME: str = "EduMate AI"
    VERSION: str = "2.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PORT: int = int(os.getenv("PORT", 8000))

    # API Keys & Supabase
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_ANON_KEY", ""))
    PEXELS_API_KEY: str = os.getenv("PEXELS_API_KEY", "")

    # CORS
    _cors_raw: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
    CORS_ORIGINS: List[str] = [origin.strip() for origin in _cors_raw.split(",") if origin.strip()]

    # Points & Anti-gaming rules
    POINTS_PER_CORRECT: int = 10
    POINTS_COMPLETION: int = 5
    POINTS_PERFECT_SCORE: int = 10
    POINTS_FIRST_OF_DAY: int = 5
    DAILY_POINTS_CAP: int = 100

    # Rate Limiting
    MAX_EXPLANATIONS_PER_HOUR: int = 15

settings = Settings()
