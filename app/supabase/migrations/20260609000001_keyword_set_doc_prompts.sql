-- Add resume_prompt and cover_prompt to keyword_sets
-- These are category-specific FRAMING prompts appended to the base resume /
-- cover-letter system prompts at generation time. They let each search-term
-- category (e.g. "Teacher Aide", "Early Childhood") steer how the candidate's
-- real experience is reframed and which keywords are injected — without an
-- extra per-job framing API call.
ALTER TABLE keyword_sets ADD COLUMN IF NOT EXISTS resume_prompt text;
ALTER TABLE keyword_sets ADD COLUMN IF NOT EXISTS cover_prompt  text;
