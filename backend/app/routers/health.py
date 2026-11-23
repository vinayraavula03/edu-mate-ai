from fastapi import APIRouter
from datetime import datetime, timezone
from backend.app.config import settings
from backend.app.services.streak_service import get_ist_now

router = APIRouter(tags=["Health"])

START_TIME = datetime.now(timezone.utc)

@router.get("/health")
def health_check():
    """Health check endpoint for UptimeRobot monitoring on free Render tier."""
    now_utc = datetime.now(timezone.utc)
    uptime_seconds = int((now_utc - START_TIME).total_seconds())

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "ist_time": get_ist_now().isoformat(),
        "uptime_seconds": uptime_seconds
    }
