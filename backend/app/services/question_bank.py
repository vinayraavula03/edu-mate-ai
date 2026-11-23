import random
from typing import Dict, Any, List
from backend.app.models.schemas import QuizData, QuizQuestion

FALLBACK_QUIZ_BANK: Dict[str, List[Dict[str, Any]]] = {
    "water cycle": [
        {
            "question": "What process turns liquid water into water vapor in the air?",
            "options": ["Condensation", "Evaporation", "Precipitation", "Infiltration"],
            "correct_index": 1,
            "explanation": "Evaporation happens when the sun heats water in oceans or rivers and turns it into water vapor."
        },
        {
            "question": "What happens when water vapor in the sky cools down?",
            "options": ["It disappears", "It forms clouds through condensation", "It turns directly into rocks", "It catches fire"],
            "correct_index": 1,
            "explanation": "Condensation causes water vapor molecules to cool and bunch together into clouds."
        },
        {
            "question": "Which of these is a form of precipitation?",
            "options": ["Wind", "Sunshine", "Rain", "Fog"],
            "correct_index": 2,
            "explanation": "Precipitation is any water that falls from clouds back to earth, like rain, snow, or hail."
        },
        {
            "question": "What do we call water that plants breathe out into the air?",
            "options": ["Transpiration", "Respiration", "Evaporation", "Filtration"],
            "correct_index": 0,
            "explanation": "Plants release moisture into the air from tiny pores in their leaves through transpiration."
        },
        {
            "question": "Where does most of Earth's water cycle begin and end?",
            "options": ["In swimming pools", "In the ocean", "Under mountains", "In clouds only"],
            "correct_index": 1,
            "explanation": "Oceans hold about 97% of Earth's water, driving the continuous global water cycle."
        }
    ],
    "photosynthesis": [
        {
            "question": "What green chemical inside plant leaves absorbs sunlight?",
            "options": ["Chlorophyll", "Hemoglobin", "Melanin", "Keratin"],
            "correct_index": 0,
            "explanation": "Chlorophyll gives leaves their green color and traps the sunlight energy."
        },
        {
            "question": "What gas do plants absorb from the air for photosynthesis?",
            "options": ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"],
            "correct_index": 1,
            "explanation": "Plants take in carbon dioxide through stomata to make glucose sugar."
        },
        {
            "question": "What gas do plants release into the air that humans need to breathe?",
            "options": ["Oxygen", "Carbon monoxide", "Methane", "Hydrogen"],
            "correct_index": 0,
            "explanation": "Photosynthesis produces fresh oxygen as a byproduct, which animals and humans breathe."
        },
        {
            "question": "In what part of a plant cell does photosynthesis happen?",
            "options": ["Nucleus", "Mitochondria", "Chloroplast", "Cell wall"],
            "correct_index": 2,
            "explanation": "Chloroplasts are the tiny factories inside plant cells where photosynthesis occurs."
        },
        {
            "question": "Where do plants absorb the water they need?",
            "options": ["Through the flowers", "Through the roots", "Through the bark", "Through seeds"],
            "correct_index": 1,
            "explanation": "Roots drink up water and minerals from the soil and send them up the stem."
        }
    ],
    "solar system": [
        {
            "question": "Which planet is the closest to the Sun?",
            "options": ["Venus", "Earth", "Mercury", "Mars"],
            "correct_index": 2,
            "explanation": "Mercury is the innermost and smallest planet in our solar system."
        },
        {
            "question": "Which is the largest planet in our solar system?",
            "options": ["Saturn", "Jupiter", "Neptune", "Uranus"],
            "correct_index": 1,
            "explanation": "Jupiter is a gas giant and the largest planet in our solar system."
        },
        {
            "question": "Why is Mars called the Red Planet?",
            "options": ["It is burning hot", "Its soil contains iron oxide (rust)", "It is covered in red lava", "It reflects red sunlight"],
            "correct_index": 1,
            "explanation": "The iron minerals in Martian soil oxidize (rust), giving it a reddish appearance."
        },
        {
            "question": "What is at the very center of our solar system?",
            "options": ["The Earth", "A black hole", "The Sun", "Jupiter"],
            "correct_index": 2,
            "explanation": "The Sun's immense gravity holds all planets in orbit around it."
        },
        {
            "question": "How long does it take for Earth to orbit the Sun once?",
            "options": ["24 hours", "30 days", "365 days", "10 years"],
            "correct_index": 2,
            "explanation": "One full revolution of Earth around the Sun equals one year (approx. 365 days)."
        }
    ],
    "gravity": [
        {
            "question": "What is gravity?",
            "options": [
                "A force that pulls objects toward each other",
                "A type of wind",
                "A magnetic shield around the Moon",
                "Heat energy from the core"
            ],
            "correct_index": 0,
            "explanation": "Gravity is the invisible force that pulls masses toward one another."
        },
        {
            "question": "Who formulated the law of universal gravitation after observing an apple fall?",
            "options": ["Albert Einstein", "Isaac Newton", "Galileo Galilei", "Thomas Edison"],
            "correct_index": 1,
            "explanation": "Sir Isaac Newton discovered the law of gravity in the 17th century."
        },
        {
            "question": "Why do astronauts float on the Moon more easily than on Earth?",
            "options": [
                "The Moon has stronger gravity",
                "The Moon has weaker gravity than Earth",
                "There is no gravity anywhere in space",
                "Moon dust makes them lighter"
            ],
            "correct_index": 1,
            "explanation": "The Moon has less mass than Earth, so its gravitational pull is only about 1/6th of Earth's."
        },
        {
            "question": "What keeps our Earth orbiting safely around the Sun?",
            "options": ["Solar wind", "The Sun's gravitational pull", "Cosmic rays", "Earth's magnetic pole"],
            "correct_index": 1,
            "explanation": "The balance of Earth's forward velocity and the Sun's gravity keeps Earth in orbit."
        },
        {
            "question": "If you drop a heavy ball and a light ball on the Moon with no air, what happens?",
            "options": [
                "The heavy ball falls faster",
                "The light ball falls faster",
                "Both hit the ground at the exact same time",
                "Both float upward"
            ],
            "correct_index": 2,
            "explanation": "Without air resistance, gravity accelerates all objects at the identical rate."
        }
    ]
}

def get_fallback_quiz(topic: str = "General Science") -> QuizData:
    """Return a validated QuizData from the curated offline fallback question bank."""
    clean_topic = topic.strip().lower()
    
    # Check for direct or partial match
    selected_topic = None
    for key in FALLBACK_QUIZ_BANK:
        if key in clean_topic or clean_topic in key:
            selected_topic = key
            break
            
    if not selected_topic:
        selected_topic = random.choice(list(FALLBACK_QUIZ_BANK.keys()))
        
    questions_raw = FALLBACK_QUIZ_BANK[selected_topic]
    questions = [QuizQuestion(**q) for q in questions_raw]
    
    return QuizData(
        topic=selected_topic.title(),
        questions=questions
    )
