-- ================================================================
-- IELTS B1 Coach App — Database Schema
-- PostgreSQL 16
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast text search

-- ----------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- APP CONFIGURATION (per user — stores API keys & service choices)
-- ----------------------------------------------------------------
CREATE TABLE app_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  -- LLM Tutor
  llm_provider VARCHAR(50) DEFAULT 'anthropic', -- anthropic | openai | mistral
  llm_model VARCHAR(100) DEFAULT 'claude-sonnet-4-20250514',
  llm_api_key_enc TEXT, -- AES-256 encrypted
  -- TTS Audio
  tts_provider VARCHAR(50) DEFAULT 'openai', -- openai | elevenlabs | google
  tts_api_key_enc TEXT,
  tts_voice VARCHAR(100) DEFAULT 'nova',
  -- Speech to Text
  stt_provider VARCHAR(50) DEFAULT 'openai', -- openai | assemblyai | deepgram
  stt_api_key_enc TEXT,
  -- Preferences
  daily_goal_minutes INTEGER DEFAULT 180, -- 3 hours
  target_exam_date DATE,
  ui_theme VARCHAR(20) DEFAULT 'dark',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ----------------------------------------------------------------
-- PROGRESS TRACKING
-- ----------------------------------------------------------------
CREATE TABLE daily_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Time tracking (minutes)
  minutes_study INTEGER DEFAULT 0,    -- flashcards, grammar exercises
  minutes_speaking INTEGER DEFAULT 0, -- speaking practice
  minutes_listening INTEGER DEFAULT 0,-- input: podcasts, series
  minutes_writing INTEGER DEFAULT 0,  -- writing tasks
  minutes_ai_tutor INTEGER DEFAULT 0, -- chat with tutor
  -- XP & gamification
  xp_earned INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_total INTEGER DEFAULT 5,
  streak_day INTEGER DEFAULT 0,
  -- Milestones
  notes TEXT, -- AI tutor can write observations here
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ----------------------------------------------------------------
-- XP & LEVELS
-- ----------------------------------------------------------------
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_xp INTEGER DEFAULT 0,
  current_level VARCHAR(10) DEFAULT 'A1', -- A1 | A2 | B1
  streak_days INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  -- Cumulative counters
  total_words_studied INTEGER DEFAULT 0,
  total_minutes_studied INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  -- Speaking
  speaking_sessions INTEGER DEFAULT 0,
  avg_speaking_score DECIMAL(3,1) DEFAULT 0,
  -- Writing
  writing_submissions INTEGER DEFAULT 0,
  avg_writing_score DECIMAL(3,1) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ----------------------------------------------------------------
-- VOCABULARY & FLASHCARDS
-- ----------------------------------------------------------------
CREATE TABLE vocabulary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word VARCHAR(100) NOT NULL,
  phonetic VARCHAR(100),
  translation VARCHAR(200) NOT NULL,
  example_sentence TEXT,
  word_type VARCHAR(50), -- noun, verb, adj, adv, phrase
  topic_tag VARCHAR(50),
  level VARCHAR(5) NOT NULL, -- A1 | A2 | B1
  audio_url TEXT, -- cached TTS audio
  ielts_relevant BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vocab_level ON vocabulary(level);
CREATE INDEX idx_vocab_word ON vocabulary USING gin(word gin_trgm_ops);

-- SRS (Spaced Repetition System) per user per card
CREATE TABLE user_vocabulary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vocab_id UUID REFERENCES vocabulary(id) ON DELETE CASCADE,
  -- SRS fields (SM-2 algorithm)
  ease_factor DECIMAL(4,2) DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  next_review DATE DEFAULT CURRENT_DATE,
  last_reviewed TIMESTAMPTZ,
  -- Performance
  times_seen INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'new', -- new | learning | review | mastered
  UNIQUE(user_id, vocab_id)
);

CREATE INDEX idx_user_vocab_review ON user_vocabulary(user_id, next_review);

-- ----------------------------------------------------------------
-- DAILY TASKS
-- ----------------------------------------------------------------
CREATE TABLE daily_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  task_key VARCHAR(50) NOT NULL, -- flash | grammar | speak | listen | write
  task_name VARCHAR(200) NOT NULL,
  target_minutes INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_reward INTEGER NOT NULL,
  -- AI generated tasks have extra context
  ai_generated BOOLEAN DEFAULT false,
  ai_context TEXT, -- what the AI suggested for this task
  UNIQUE(user_id, date, task_key)
);

-- ----------------------------------------------------------------
-- SPEAKING SESSIONS
-- ----------------------------------------------------------------
CREATE TABLE speaking_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(20) NOT NULL, -- free | read | conversation
  prompt_text TEXT,
  transcript TEXT,
  duration_seconds INTEGER,
  -- AI Evaluation
  ai_feedback TEXT,
  fluency_score INTEGER, -- 1-10
  grammar_score INTEGER, -- 1-10
  vocabulary_score INTEGER, -- 1-10
  overall_score INTEGER, -- 1-10
  estimated_level VARCHAR(5), -- A1 | A2 | B1
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- WRITING SESSIONS
-- ----------------------------------------------------------------
CREATE TABLE writing_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  user_text TEXT NOT NULL,
  word_count INTEGER,
  -- AI Feedback
  ai_feedback TEXT,
  corrected_version TEXT,
  grammar_score INTEGER, -- 1-10
  vocabulary_score INTEGER, -- 1-10
  coherence_score INTEGER, -- 1-10
  overall_score INTEGER, -- 1-10
  estimated_level VARCHAR(5),
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- AI TUTOR CONVERSATIONS
-- ----------------------------------------------------------------
CREATE TABLE tutor_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL, -- group messages by session
  role VARCHAR(10) NOT NULL, -- user | assistant | system
  content TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tutor_conv_session ON tutor_conversations(user_id, session_id, created_at);

-- ----------------------------------------------------------------
-- AI TUTOR EVALUATIONS (periodic progress reports)
-- ----------------------------------------------------------------
CREATE TABLE progress_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  evaluation_date DATE DEFAULT CURRENT_DATE,
  -- Hours analysis
  total_hours_so_far DECIMAL(6,1),
  hours_needed_for_b1 DECIMAL(6,1), -- AI estimates remaining
  projected_completion_date DATE,
  on_track BOOLEAN,
  -- Scores by skill
  vocabulary_score INTEGER,
  grammar_score INTEGER,
  speaking_score INTEGER,
  writing_score INTEGER,
  listening_score INTEGER,
  overall_level VARCHAR(5),
  -- AI recommendations
  weak_areas TEXT[], -- ['grammar', 'speaking']
  recommended_focus TEXT,
  full_report TEXT, -- detailed AI narrative
  -- Adjustments
  daily_goal_adjustment INTEGER, -- suggested change in minutes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- GAMIFICATION
-- ----------------------------------------------------------------
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  xp_reward INTEGER DEFAULT 0,
  category VARCHAR(30), -- streak | vocabulary | speaking | writing | milestone
  requirement_type VARCHAR(30), -- count | streak | score | level
  requirement_value INTEGER
);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Leaderboard view (if multi-user later)
CREATE TABLE xp_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source VARCHAR(50) NOT NULL, -- flashcard_easy | speaking_session | writing | daily_complete | streak_bonus
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- SEED ACHIEVEMENTS
-- ----------------------------------------------------------------
INSERT INTO achievements (key, name, description, icon, xp_reward, category, requirement_type, requirement_value) VALUES
('first_card', 'Primera tarjeta', 'Estudia tu primera flashcard', '🎴', 10, 'vocabulary', 'count', 1),
('streak_3', 'Racha de 3 días', '3 días consecutivos estudiando', '🔥', 50, 'streak', 'streak', 3),
('streak_7', 'Semana perfecta', '7 días consecutivos', '⚡', 150, 'streak', 'streak', 7),
('streak_30', 'Mes imparable', '30 días consecutivos', '💎', 500, 'streak', 'streak', 30),
('words_50', '50 palabras', 'Aprende 50 palabras', '📚', 100, 'vocabulary', 'count', 50),
('words_200', '200 palabras', 'Aprende 200 palabras', '🏆', 300, 'vocabulary', 'count', 200),
('words_500', '500 palabras', 'Aprende 500 palabras', '👑', 1000, 'vocabulary', 'count', 500),
('first_speak', 'Primera voz', 'Completa tu primera sesión de speaking', '🎤', 30, 'speaking', 'count', 1),
('speak_10', 'Orador', '10 sesiones de speaking', '🎯', 200, 'speaking', 'count', 10),
('first_write', 'Primera pluma', 'Completa tu primer writing', '✍️', 30, 'writing', 'count', 1),
('level_a2', 'Nivel A2', 'Alcanza el nivel A2', '⭐', 500, 'milestone', 'level', 2),
('level_b1', 'Nivel B1 — Meta lograda', 'Alcanza el nivel B1', '🏅', 2000, 'milestone', 'level', 3),
('hours_50', '50 horas', 'Acumula 50 horas de estudio', '⏱️', 200, 'milestone', 'count', 50),
('hours_250', '250 horas', 'Mitad del camino a B1', '🚀', 500, 'milestone', 'count', 250),
('hours_500', '500 horas', 'Completaste el programa', '🎓', 5000, 'milestone', 'count', 500),
('perfect_day', 'Día perfecto', 'Completa todas las tareas del día', '✅', 100, 'streak', 'count', 1),
('night_owl', 'Búho nocturno', 'Estudia después de las 10pm', '🦉', 20, 'streak', 'count', 1),
('speed_run', 'Velocidad', 'Completa 20 flashcards en menos de 5 minutos', '⚡', 50, 'vocabulary', 'count', 20);

-- ----------------------------------------------------------------
-- SEED VOCABULARY — A1 (sample, full list goes here)
-- ----------------------------------------------------------------
INSERT INTO vocabulary (word, phonetic, translation, example_sentence, word_type, topic_tag, level, ielts_relevant) VALUES
('achieve','/əˈtʃiːv/','lograr / alcanzar','She worked hard to achieve her goals.','verb','Goals',true,'A1'),
('schedule','/ˈʃedjuːl/','horario / programar','My schedule is very busy this week.','noun/verb','Daily Life',true,'A1'),
('improve','/ɪmˈpruːv/','mejorar','I want to improve my English skills.','verb','Progress',true,'A1'),
('comfortable','/ˈkʌmftəbl/','cómodo','The hotel room was very comfortable.','adjective','Feelings',false,'A1'),
('necessary','/ˈnesəsəri/','necesario','Is it necessary to bring a passport?','adjective','Essential',true,'A1'),
('usually','/ˈjuːʒuəli/','normalmente','I usually wake up at seven.','adverb','Time',false,'A1'),
('because','/bɪˈkɒz/','porque','I studied hard because I want to pass.','conjunction','Connectors',false,'A1'),
('different','/ˈdɪfrənt/','diferente','These two words have different meanings.','adjective','Comparison',true,'A1'),
('important','/ɪmˈpɔːtnt/','importante','It is important to practice every day.','adjective','Essential',true,'A1'),
('together','/təˈɡeðə/','juntos','We work better together.','adverb','Social',false,'A1'),
('opportunity','/ˌɒpəˈtjuːnɪti/','oportunidad','This job is a great opportunity.','noun','Work',true,'A2'),
('environment','/ɪnˈvaɪərənmənt/','medio ambiente','We must protect the environment.','noun','Nature',true,'A2'),
('suggest','/səˈdʒest/','sugerir','I suggest we study together.','verb','Communication',true,'A2'),
('experience','/ɪkˈspɪəriəns/','experiencia','Do you have experience with computers?','noun','Work',true,'A2'),
('community','/kəˈmjuːnɪti/','comunidad','I am proud of my local community.','noun','Society',true,'A2'),
('although','/ɔːlˈðəʊ/','aunque','Although it was raining, we went out.','conjunction','Connectors',true,'A2'),
('develop','/dɪˈveləp/','desarrollar','You need to develop your writing skills.','verb','Progress',true,'A2'),
('consequently','/ˈkɒnsɪkwəntli/','en consecuencia','He did not study; consequently, he failed.','adverb','Connectors',true,'B1'),
('furthermore','/ˈfɜːðəmɔː/','además','The hotel is cheap; furthermore, it is central.','adverb','Connectors',true,'B1'),
('nevertheless','/ˌnevəðəˈles/','sin embargo','It was difficult; nevertheless, she succeeded.','adverb','Connectors',true,'B1'),
('perspective','/pəˈspektɪv/','perspectiva','From my perspective, this is unfair.','noun','Opinion',true,'B1'),
('significant','/sɪɡˈnɪfɪkənt/','significativo','There has been a significant improvement.','adjective','IELTS Academic',true,'B1'),
('in contrast','/ɪn ˈkɒntrɑːst/','en contraste','In contrast, urban areas have more jobs.','phrase','Connectors',true,'B1');
