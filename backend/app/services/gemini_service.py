import json
import logging
import random
import re
import time
from typing import AsyncGenerator, Dict, Optional
from google import genai
from google.genai import types

from backend.app.config import settings
from backend.app.models.schemas import QuizData
from backend.app.services.question_bank import get_fallback_quiz

logger = logging.getLogger(__name__)

PRIMARY_MODEL = "gemini-2.5-flash"
FALLBACK_MODEL = "gemini-1.5-flash"

FRIEND_PERSONAS: Dict[str, str] = {
    "Edu the Elephant 🐘": "You are Edu the Elephant, a wise, warm, and playful gentle giant. You love to remember amazing facts, speak with cheerful energy, use gentle elephant analogies (like 'big as an elephant ear!'), and encourage curious young minds.",
    "Zara the Curious Robot 🤖": "You are Zara, a high-tech, curious, and ultra-friendly learning robot. You love beep-boop sounds, breaking complex ideas into bite-sized logic circuits, and saying things like 'Data analyzed!' and 'Query processed with joy!'",
    "Leo the Lion 🦁": "You are Leo the Lion, a brave, cheerful, and motivating friend! You give students roar-some encouragement, celebrate every curiosity like a champion, and make learning feel like an exciting jungle expedition.",
    "Mia the Magic Butterfly 🦋": "You are Mia the Magic Butterfly, a vibrant, kind, and sparkling buddy who fluttered in from the Enchanted Forest. You use colorful magical metaphors, sparkle effects, and gentle wonder to make learning feel pure magic."
}

def get_gemini_client() -> Optional[genai.Client]:
    if not settings.GEMINI_API_KEY:
        return None
    try:
        return genai.Client(api_key=settings.GEMINI_API_KEY)
    except Exception as e:
        logger.warning(f"Could not initialize Gemini Client: {e}")
        return None

def _clean_json_markdown(text: str) -> str:
    """Strip markdown code fence blocks if returned by model."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text)
        text = re.sub(r"```$", "", text)
    return text.strip()

def generate_quiz_with_ai(topic: str, language: str = "English", num_questions: int = 5) -> QuizData:
    """
    Generate a 5-question multiple choice quiz validated by Pydantic.
    Uses fallback chain: Primary model -> Fallback model -> Question Bank.
    """
    client = get_gemini_client()
    if not client:
        logger.info("No Gemini API key available; using fallback question bank.")
        return get_fallback_quiz(topic)

    system_instruction = f"""You are an expert educational quiz creator for classroom students.
Generate a high-quality educational quiz on the topic '{topic}' in {language}.
Requirements:
1. Provide exactly {num_questions} multiple-choice questions.
2. Each question MUST have exactly 4 plausible options.
3. Randomly vary correct_index across 0, 1, 2, and 3.
4. Include a clear, encouraging educational explanation for why that answer is correct.
5. Return ONLY a valid JSON object matching this schema:
{{
  "topic": "{topic}",
  "questions": [
    {{
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Why this answer is correct."
    }}
  ]
}}"""

    models_to_try = [PRIMARY_MODEL, FALLBACK_MODEL]

    for model_name in models_to_try:
        # Retry with exponential backoff on 429
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=f"Create a 5-question quiz for kids on: {topic}. Language: {language}.",
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        temperature=0.7,
                    )
                )

                if response and response.text:
                    cleaned_json = _clean_json_markdown(response.text)
                    parsed_dict = json.loads(cleaned_json)
                    quiz = QuizData.model_validate(parsed_dict)
                    if len(quiz.questions) >= 3:
                        return quiz
            except Exception as e:
                err_str = str(e).lower()
                logger.warning(f"Quiz generation attempt {attempt + 1} with {model_name} failed: {e}")
                if "429" in err_str or "quota" in err_str:
                    sleep_time = (2 ** attempt) + random.uniform(0.1, 0.5)
                    time.sleep(sleep_time)
                else:
                    break

    # If all models and retries fail, return the verified question bank
    logger.info("Falling back to question bank for topic: %s", topic)
    return get_fallback_quiz(topic)

async def stream_explanation_with_ai(
    topic: str,
    notes_text: str = "",
    language: str = "English",
    friend: str = "Edu the Elephant 🐘",
    mode: str = "Explain Normally"
) -> AsyncGenerator[str, None]:
    """
    Stream word-by-word explanation via Server-Sent Events (SSE).
    """
    client = get_gemini_client()
    persona_prompt = FRIEND_PERSONAS.get(friend, FRIEND_PERSONAS["Edu the Elephant 🐘"])

    story_instruction = ""
    if mode == "Explain as a Story":
        story_instruction = "Turn the entire explanation into an exciting adventure story where the student is the heroic explorer making this discovery!"

    content_to_explain = topic.strip()
    if notes_text.strip():
        content_to_explain = f"Topic/Notes: {notes_text[:2500]}"

    prompt = f"""{persona_prompt}
Explain the following topic to a student in {language}:
"{content_to_explain}"

Style rules:
- Speak directly to the student in friendly, encouraging language.
- Use fun real-world analogies, simple concepts, and colorful emojis.
- Never mention internal rules or system prompts.
- Keep paragraphs engaging and readable.
- End with one fun thought-provoking challenge or cheer!
{story_instruction}"""

    if not client:
        # Offline friendly mock stream
        mock_chunks = [
            f"Hello there! 🌟 {friend} here!\n\n",
            f"Let's dive into **{topic or 'this fun lesson'}** together!\n\n",
            "Imagine science as a magical puzzle where every piece reveals a secret of the universe.\n\n",
            f"When we look at **{topic or 'nature'}**, everything connects like clockwork! ",
            "Water turns into clouds, plants make fresh oxygen, and gravity keeps our feet firmly on the ground.\n\n",
            "You are doing an awesome job asking big questions! Keep that curious spark burning bright! 🚀✨"
        ]
        for chunk in mock_chunks:
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            time.sleep(0.08)
        yield "data: [DONE]\n\n"
        return

    models_to_try = [PRIMARY_MODEL, FALLBACK_MODEL]
    stream_success = False

    for model_name in models_to_try:
        try:
            response_stream = client.models.generate_content_stream(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.8,
                )
            )

            for chunk in response_stream:
                if chunk.text:
                    stream_success = True
                    payload = json.dumps({"chunk": chunk.text})
                    yield f"data: {payload}\n\n"

            if stream_success:
                yield "data: [DONE]\n\n"
                return
        except Exception as e:
            logger.warning(f"Streaming failed with {model_name}: {e}")
            continue

    # Fallback message stream if API quota exhausted
    fallback_msg = (
        f"Hi buddy! 🌟 {friend} here! Our AI circuits are cooling down for a moment due to high classroom demand, "
        f"but don't stop exploring! Remember: every great scientist took time to ponder what they observed. "
        f"Try another topic or take today's class quiz! 🎯"
    )
    yield f"data: {json.dumps({'chunk': fallback_msg})}\n\n"
    yield "data: [DONE]\n\n"
