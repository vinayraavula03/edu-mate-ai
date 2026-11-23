import requests
from typing import Tuple, Optional
from backend.app.config import settings

def get_educational_image(topic: str) -> Tuple[Optional[str], str, str]:
    """
    Fetch an educational image for a topic.
    Returns: (image_url: Optional[str], caption: str, source: str)
    """
    topic_clean = topic.strip()
    if not topic_clean:
        return None, "EduMate Learning Visual", "system"

    if settings.PEXELS_API_KEY:
        try:
            headers = {"Authorization": settings.PEXELS_API_KEY}
            query = f"{topic_clean} science education diagram illustration"
            url = f"https://api.pexels.com/v1/search?query={requests.utils.quote(query)}&per_page=5"
            
            resp = requests.get(url, headers=headers, timeout=6)
            if resp.status_code == 200:
                data = resp.json()
                photos = data.get("photos", [])
                if photos:
                    photo = photos[0]
                    img_url = photo.get("src", {}).get("large") or photo.get("src", {}).get("medium")
                    caption = photo.get("alt") or f"Educational visual for {topic_clean}"
                    return img_url, caption, "pexels"
        except Exception:
            pass

    # Curated fallbacks for common topics or Unsplash education photos
    fallback_map = {
        "water cycle": "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&auto=format&fit=crop",
        "photosynthesis": "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop",
        "solar system": "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&auto=format&fit=crop",
        "gravity": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop",
    }

    for key, fallback_url in fallback_map.items():
        if key in topic_clean.lower():
            return fallback_url, f"Visual illustration: {topic_clean}", "curated"

    return "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop", f"Learning about {topic_clean}", "curated"
