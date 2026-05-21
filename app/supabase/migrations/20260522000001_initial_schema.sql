-- ============================================================
-- Job Search & Resume Generation App — Initial Schema
-- ============================================================

-- candidate_profile
CREATE TABLE IF NOT EXISTS candidate_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- keyword_sets
CREATE TABLE IF NOT EXISTS keyword_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  keywords jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_keyword_sets_user ON keyword_sets(user_id, name);

-- imports
CREATE TABLE IF NOT EXISTS imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('seek', 'indeed')),
  actor_id text NOT NULL,
  keyword_set_ids jsonb NOT NULL DEFAULT '[]',
  input_payload jsonb NOT NULL DEFAULT '{}',
  apify_run_id text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  stats jsonb NOT NULL DEFAULT '{}',
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_imports_user ON imports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_imports_apify_run ON imports(apify_run_id);

-- jobs
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_id uuid REFERENCES imports(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual',
  source_job_id text,
  url text,
  url_hash text,
  employer text,
  title text,
  location text,
  remote_flag boolean DEFAULT false,
  salary_text text,
  description_text text,
  description_html text,
  posted_at timestamptz,
  raw_payload jsonb DEFAULT '{}',
  dedupe_key text,
  status text NOT NULL DEFAULT 'imported' CHECK (status IN (
    'imported', 'ranked', 'shortlisted', 'documents_generated',
    'applied', 'interview', 'offer', 'rejected', 'withdrawn', 'skipped', 'error'
  )),
  is_duplicate_of uuid REFERENCES jobs(id) ON DELETE SET NULL,
  drive_folder_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_user_url_hash ON jobs(user_id, url_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_user_dedupe ON jobs(user_id, dedupe_key);
CREATE INDEX IF NOT EXISTS idx_jobs_user_created ON jobs(user_id, created_at DESC);

-- prompt_versions
CREATE TABLE IF NOT EXISTS prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_type text NOT NULL CHECK (prompt_type IN ('ranking', 'resume_generation', 'cover_letter_generation')),
  version integer NOT NULL DEFAULT 1,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_user_type ON prompt_versions(user_id, prompt_type, version DESC);

-- style_versions
CREATE TABLE IF NOT EXISTS style_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  yaml_content text NOT NULL,
  parsed_json jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_style_versions_user ON style_versions(user_id, version DESC);

-- job_rankings
CREATE TABLE IF NOT EXISTS job_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  prompt_version_id uuid REFERENCES prompt_versions(id) ON DELETE SET NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  category text NOT NULL,
  reasons jsonb NOT NULL DEFAULT '[]',
  disqualifiers jsonb NOT NULL DEFAULT '[]',
  matched_keywords jsonb NOT NULL DEFAULT '[]',
  missing_requirements jsonb NOT NULL DEFAULT '[]',
  recommended_action text NOT NULL CHECK (recommended_action IN ('shortlist', 'consider', 'skip', 'reject')),
  raw_ai_response jsonb DEFAULT '{}',
  model text,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_rankings_job ON job_rankings(job_id, created_at DESC);

-- job_status_history
CREATE TABLE IF NOT EXISTS job_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_status_history_job ON job_status_history(job_id, created_at DESC);

-- generated_documents
CREATE TABLE IF NOT EXISTS generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('resume', 'cover_letter')),
  version integer NOT NULL DEFAULT 1,
  prompt_version_id uuid REFERENCES prompt_versions(id) ON DELETE SET NULL,
  style_version_id uuid REFERENCES style_versions(id) ON DELETE SET NULL,
  structured_json jsonb NOT NULL DEFAULT '{}',
  drive_folder_id text,
  drive_pdf_file_id text,
  drive_docx_file_id text,
  pdf_url text,
  docx_url text,
  model text,
  raw_ai_response jsonb DEFAULT '{}',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_generated_docs_job ON generated_documents(job_id, doc_type, version DESC);

-- integrations
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('openai', 'apify', 'google_drive')),
  credentials jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- apify_actors
CREATE TABLE IF NOT EXISTS apify_actors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('seek', 'indeed')),
  actor_id text NOT NULL,
  default_input jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE candidate_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE apify_actors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users own their data" ON candidate_profile FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON keyword_sets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON imports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON prompt_versions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON style_versions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON job_rankings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON job_status_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON generated_documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON integrations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their data" ON apify_actors FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_candidate_profile_updated_at BEFORE UPDATE ON candidate_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_keyword_sets_updated_at BEFORE UPDATE ON keyword_sets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_apify_actors_updated_at BEFORE UPDATE ON apify_actors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
