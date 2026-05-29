CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS h5p_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  user_name TEXT,
  module_id TEXT NOT NULL,
  module_title TEXT,
  content_type TEXT,
  event_type TEXT NOT NULL,
  question_text TEXT,
  answer_given TEXT,
  answer_correct BOOLEAN,
  score NUMERIC,
  max_score NUMERIC,
  duration_seconds INTEGER,
  raw_xapi JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_h5p_events_user ON h5p_events(user_email);
CREATE INDEX IF NOT EXISTS idx_h5p_events_module ON h5p_events(module_id);
CREATE INDEX IF NOT EXISTS idx_h5p_events_type ON h5p_events(event_type);

CREATE OR REPLACE VIEW h5p_module_scores AS
SELECT
  module_id,
  module_title,
  content_type,
  COUNT(DISTINCT user_email) AS completions,
  AVG(score / NULLIF(max_score, 0) * 100) AS avg_score_pct,
  MIN(score / NULLIF(max_score, 0) * 100) AS min_score_pct,
  MAX(score / NULLIF(max_score, 0) * 100) AS max_score_pct
FROM h5p_events
WHERE event_type = 'completed'
GROUP BY module_id, module_title, content_type;

CREATE OR REPLACE VIEW h5p_rep_scores AS
SELECT
  user_email,
  user_name,
  module_id,
  module_title,
  MAX(score) AS best_score,
  MAX(max_score) AS max_possible,
  COUNT(*) AS attempts,
  MAX(created_at) AS last_attempt
FROM h5p_events
WHERE event_type = 'completed'
GROUP BY user_email, user_name, module_id, module_title;

CREATE OR REPLACE VIEW h5p_missed_questions AS
SELECT
  module_id,
  module_title,
  question_text,
  COUNT(*) AS total_attempts,
  SUM(CASE WHEN answer_correct THEN 1 ELSE 0 END) AS correct_count,
  ROUND(
    SUM(CASE WHEN answer_correct THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100,
    1
  ) AS correct_pct
FROM h5p_events
WHERE event_type = 'answered' AND question_text IS NOT NULL
GROUP BY module_id, module_title, question_text
ORDER BY correct_pct ASC;
