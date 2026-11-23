-- ==============================================================================
-- EduMate AI - Supabase Database Schema & Row Level Security Policies
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
-- Extends Supabase auth.users with public nickname and role
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-create profile row whenever a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, role)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'nickname',
            split_part(NEW.email, '@', 1)
        ),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    )
    ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        role = EXCLUDED.role;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 2. CLASSES TABLE
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    join_code VARCHAR(10) UNIQUE NOT NULL,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classes_join_code ON public.classes(join_code);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON public.classes(teacher_id);

-- 3. CLASS_MEMBERS TABLE (Enrollment)
CREATE TABLE IF NOT EXISTS public.class_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (class_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_class_members_user ON public.class_members(user_id);
CREATE INDEX IF NOT EXISTS idx_class_members_class ON public.class_members(class_id);

-- 4. DAILY_QUIZZES TABLE
-- Stores pre-generated or daily generated class quiz.
-- questions_json contains questions, options, correct_index, explanation.
CREATE TABLE IF NOT EXISTS public.daily_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    quiz_date DATE NOT NULL,
    topic TEXT NOT NULL,
    questions_json JSONB NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (class_id, quiz_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_quizzes_class_date ON public.daily_quizzes(class_id, quiz_date);

-- 5. QUIZ_ATTEMPTS TABLE
-- Strictly scored on server. Unique (quiz_id, user_id) guarantees one scored attempt per quiz.
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.daily_quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score >= 0 AND score <= 5),
    total INT NOT NULL DEFAULT 5,
    points INT NOT NULL DEFAULT 0,
    accuracy NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    answers_json JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (quiz_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_class_created ON public.quiz_attempts(class_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id);

-- 6. EXPLANATIONS TABLE (History of AI learning conversations)
CREATE TABLE IF NOT EXISTS public.explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    language TEXT DEFAULT 'English',
    buddy TEXT DEFAULT 'Edu the Elephant 🐘',
    mode TEXT DEFAULT 'Explain Normally',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_explanations_user ON public.explanations(user_id, created_at DESC);

-- 7. QUESTION_BANK TABLE (Emergency offline & quota exhaustion fallback)
CREATE TABLE IF NOT EXISTS public.question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    level TEXT DEFAULT 'middle_school',
    questions_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_bank_topic ON public.question_bank(topic);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- Profiles Policies:
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Classes Policies:
DROP POLICY IF EXISTS "Teachers can view their own classes" ON public.classes;
CREATE POLICY "Teachers can view their own classes"
ON public.classes FOR SELECT
TO authenticated
USING (
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.class_members
        WHERE class_members.class_id = classes.id
        AND class_members.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
CREATE POLICY "Teachers can create classes"
ON public.classes FOR INSERT
TO authenticated
WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can update their classes" ON public.classes;
CREATE POLICY "Teachers can update their classes"
ON public.classes FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete their classes" ON public.classes;
CREATE POLICY "Teachers can delete their classes"
ON public.classes FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());

-- Class Members Policies:
DROP POLICY IF EXISTS "Members viewable by enrolled students or class teacher" ON public.class_members;
CREATE POLICY "Members viewable by enrolled students or class teacher"
ON public.class_members FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = class_members.class_id
        AND classes.teacher_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM public.class_members cm
        WHERE cm.class_id = class_members.class_id
        AND cm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Students can join a class" ON public.class_members;
CREATE POLICY "Students can join a class"
ON public.class_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Teachers or students can remove enrollment" ON public.class_members;
CREATE POLICY "Teachers or students can remove enrollment"
ON public.class_members FOR DELETE
TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = class_members.class_id
        AND classes.teacher_id = auth.uid()
    )
);

-- Daily Quizzes Policies:
DROP POLICY IF EXISTS "Daily quizzes viewable by class members and teacher" ON public.daily_quizzes;
CREATE POLICY "Daily quizzes viewable by class members and teacher"
ON public.daily_quizzes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = daily_quizzes.class_id
        AND classes.teacher_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM public.class_members
        WHERE class_members.class_id = daily_quizzes.class_id
        AND class_members.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Teachers can create or manage daily quizzes" ON public.daily_quizzes;
CREATE POLICY "Teachers can create or manage daily quizzes"
ON public.daily_quizzes FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = daily_quizzes.class_id
        AND classes.teacher_id = auth.uid()
    )
);

-- Quiz Attempts Policies:
DROP POLICY IF EXISTS "Quiz attempts viewable by class members and teacher" ON public.quiz_attempts;
CREATE POLICY "Quiz attempts viewable by class members and teacher"
ON public.quiz_attempts FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = quiz_attempts.class_id
        AND classes.teacher_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM public.class_members
        WHERE class_members.class_id = quiz_attempts.class_id
        AND class_members.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Students can submit their own attempt" ON public.quiz_attempts;
CREATE POLICY "Students can submit their own attempt"
ON public.quiz_attempts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Explanations Policies:
DROP POLICY IF EXISTS "Users can view own explanations" ON public.explanations;
CREATE POLICY "Users can view own explanations"
ON public.explanations FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own explanations" ON public.explanations;
CREATE POLICY "Users can create own explanations"
ON public.explanations FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Question Bank Policies:
DROP POLICY IF EXISTS "Question bank readable by all authenticated" ON public.question_bank;
CREATE POLICY "Question bank readable by all authenticated"
ON public.question_bank FOR SELECT
TO authenticated
USING (true);

-- Enable Supabase Realtime for live leaderboard updates safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'quiz_attempts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_attempts;
    END IF;
END $$;

-- ==============================================================================
-- SEED DATA FOR QUESTION BANK (Offline fallback)
-- ==============================================================================

INSERT INTO public.question_bank (topic, level, questions_json)
VALUES 
(
    'Water Cycle',
    'middle_school',
    '[
        {
            "question": "What process turns liquid water into water vapor in the air?",
            "options": ["Condensation", "Evaporation", "Precipitation", "Infiltration"],
            "correct_index": 1,
            "explanation": "Evaporation is the process where liquid water absorbs heat energy and turns into water vapor gas."
        },
        {
            "question": "Which of these causes water vapor to condense and form clouds?",
            "options": ["Rising temperatures", "Cooling temperatures in the atmosphere", "Wind blowing across the ocean", "Photosynthesis"],
            "correct_index": 1,
            "explanation": "As warm water vapor rises, it cools down and condenses into tiny liquid droplets that gather to form clouds."
        },
        {
            "question": "Rain, snow, sleet, and hail are all forms of what?",
            "options": ["Transpiration", "Precipitation", "Sublimation", "Evaporation"],
            "correct_index": 1,
            "explanation": "Precipitation is any liquid or frozen water that forms in the atmosphere and falls back to Earth."
        },
        {
            "question": "What is the release of water vapor from plant leaves into the atmosphere called?",
            "options": ["Transpiration", "Respiration", "Filtration", "Perspiration"],
            "correct_index": 0,
            "explanation": "Transpiration is the biological process where plants release water vapor through microscopic openings called stomata."
        },
        {
            "question": "Where is the majority of Earth''s water stored?",
            "options": ["Glaciers and ice caps", "Rivers and lakes", "Oceans", "Underground aquifers"],
            "correct_index": 2,
            "explanation": "Around 97% of Earth''s water is stored in the oceans as saltwater."
        }
    ]'::jsonb
),
(
    'Photosynthesis',
    'middle_school',
    '[
        {
            "question": "What green pigment absorbs sunlight for photosynthesis in plants?",
            "options": ["Carotene", "Hemoglobin", "Chlorophyll", "Melanin"],
            "correct_index": 2,
            "explanation": "Chlorophyll is the green pigment inside plant chloroplasts that captures sunlight energy."
        },
        {
            "question": "Which gas do plants absorb from the air to perform photosynthesis?",
            "options": ["Oxygen", "Carbon Dioxide", "Nitrogen", "Methane"],
            "correct_index": 1,
            "explanation": "Plants take in carbon dioxide (CO2) from the air through their leaves."
        },
        {
            "question": "What are the two main products produced by photosynthesis?",
            "options": ["Glucose and Oxygen", "Water and Carbon Dioxide", "Nitrogen and Starch", "Salt and Glucose"],
            "correct_index": 0,
            "explanation": "Photosynthesis uses sunlight, water, and carbon dioxide to create glucose sugar for food and releases oxygen gas."
        },
        {
            "question": "In which cellular organelle does photosynthesis take place?",
            "options": ["Mitochondria", "Nucleus", "Ribosome", "Chloroplast"],
            "correct_index": 3,
            "explanation": "Chloroplasts are the specialized plant cell organelles where photosynthetic reactions occur."
        },
        {
            "question": "Where do plants absorb the water required for photosynthesis?",
            "options": ["Stems", "Roots", "Flowers", "Bark"],
            "correct_index": 1,
            "explanation": "Plant roots absorb water and dissolved minerals from the soil and transport them upward through the xylem."
        }
    ]'::jsonb
),
(
    'Solar System',
    'middle_school',
    '[
        {
            "question": "Which planet is closest to the Sun?",
            "options": ["Venus", "Mars", "Mercury", "Earth"],
            "correct_index": 2,
            "explanation": "Mercury is the smallest and innermost planet in the Solar System."
        },
        {
            "question": "Which planet is known as the Red Planet due to iron oxide on its surface?",
            "options": ["Jupiter", "Mars", "Saturn", "Mercury"],
            "correct_index": 1,
            "explanation": "Mars has iron-rich dust and rocks that oxidize (rust), giving it a distinctive reddish color."
        },
        {
            "question": "What is the largest planet in our solar system?",
            "options": ["Saturn", "Neptune", "Jupiter", "Uranus"],
            "correct_index": 2,
            "explanation": "Jupiter is a gas giant and the largest planet, with a mass more than double all other planets combined."
        },
        {
            "question": "What separates the inner rocky planets from the outer gas giants?",
            "options": ["Kuiper Belt", "Oort Cloud", "Asteroid Belt", "Saturn''s Rings"],
            "correct_index": 2,
            "explanation": "The main Asteroid Belt is located between Mars and Jupiter and divides inner and outer planets."
        },
        {
            "question": "How long does it take for Earth to complete one full orbit around the Sun?",
            "options": ["24 hours", "30 days", "365.25 days", "100 days"],
            "correct_index": 2,
            "explanation": "Earth completes one revolution around the Sun in approximately 365.25 days (one solar year)."
        }
    ]'::jsonb
)
ON CONFLICT DO NOTHING;
