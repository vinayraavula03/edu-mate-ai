import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse

from backend.app.models.schemas import ExplainRequest, TopicImageResponse
from backend.app.services.gemini_service import stream_explanation_with_ai
from backend.app.services.rate_limit_service import explain_rate_limiter
from backend.app.services.pdf_service import extract_text_from_pdf
from backend.app.services.pexels_service import get_educational_image
from backend.app.services.supabase_client import (
    get_supabase_client,
    verify_token_and_get_user,
    local_db,
)

router = APIRouter(prefix="/explain", tags=["Explain"])

def get_current_user(authorization: Optional[str]) -> dict:
    user = verify_token_and_get_user(authorization)
    if user:
        return user
    return {"id": "demo-student-id", "email": "student@edumate.com", "role": "student"}

@router.post("")
async def explain_topic(
    req: ExplainRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Streams an AI explanation word by word via Server-Sent Events (SSE).
    Saves the explanation to user's history.
    """
    user = get_current_user(authorization)
    uid = user["id"]

    # Check per-user rate limit
    allowed, retry_after = explain_rate_limiter.check_rate_limit(uid)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit reached! You can ask {explain_rate_limiter.max_requests} questions per hour. Please wait {retry_after}s 😊"
        )

    topic_title = req.topic.strip() if req.topic and req.topic.strip() else "Uploaded Notes / Question"

    # Save to history
    explanation_record = {
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "topic": topic_title[:150],
        "language": req.language,
        "buddy": req.friend,
        "mode": req.mode,
        "content": f"Explanation on {topic_title}",
        "created_at": datetime.utcnow().isoformat()
    }

    client = get_supabase_client()
    if client:
        try:
            client.table("explanations").insert(explanation_record).execute()
        except Exception:
            pass

    local_db.explanations.append(explanation_record)

    return StreamingResponse(
        stream_explanation_with_ai(
            topic=req.topic or "",
            notes_text=req.notes_text or "",
            language=req.language,
            friend=req.friend,
            mode=req.mode
        ),
        media_type="text/event-stream"
    )

@router.post("/upload-notes")
async def upload_pdf_or_notes(file: UploadFile = File(...)):
    """Extracts text from uploaded PDF or text file server-side safely."""
    contents = await file.read()
    filename = file.filename or "notes.txt"

    if filename.lower().endswith(".pdf") or file.content_type == "application/pdf":
        extracted_text = extract_text_from_pdf(contents, max_chars=4000)
    else:
        try:
            extracted_text = contents.decode("utf-8")[:4000]
        except Exception:
            extracted_text = "Could not decode text file."

    return {
        "filename": filename,
        "text": extracted_text,
        "length": len(extracted_text)
    }

@router.get("/image", response_model=TopicImageResponse)
def get_topic_image(topic: str = Query(..., min_length=1)):
    """Fetch educational visual for a topic through server proxy (keeps Pexels key hidden)."""
    img_url, caption, source = get_educational_image(topic)
    return TopicImageResponse(
        image_url=img_url,
        caption=caption,
        source=source
    )
