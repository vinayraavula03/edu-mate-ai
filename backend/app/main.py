import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.routers import (
    health,
    classes,
    quiz,
    explain,
    leaderboard,
    teacher,
    history,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("edumate")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for EduMate AI: Classroom learning platform with AI buddy, daily quizzes, and live class leaderboards.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS setup for Netlify frontend and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_origin_regex=r"https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(classes.router)
app.include_router(quiz.router)
app.include_router(explain.router)
app.include_router(leaderboard.router)
app.include_router(teacher.router)
app.include_router(history.router)

@app.get("/")
def root():
    return {
        "message": "Welcome to EduMate AI API 🎒",
        "tagline": "Learn with an AI buddy, prove it in the daily quiz, and climb your class leaderboard.",
        "version": settings.VERSION,
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
