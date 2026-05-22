-- Add AI ranking columns to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_score integer CHECK (ai_score >= 0 AND ai_score <= 100);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_priority text CHECK (ai_priority IN ('hot', 'good', 'maybe', 'avoid'));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_ranking jsonb DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_ranked_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_type text;

CREATE INDEX IF NOT EXISTS idx_jobs_user_priority ON jobs(user_id, ai_priority);
CREATE INDEX IF NOT EXISTS idx_jobs_user_score ON jobs(user_id, ai_score DESC);
