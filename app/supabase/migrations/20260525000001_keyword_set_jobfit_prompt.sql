-- Add jobfit_prompt to keyword_sets
-- Stores the AI-generated job-fit scoring prompt for each search term category.
-- Generated once per category run and displayed on the Keyword Sets settings page.
ALTER TABLE keyword_sets ADD COLUMN IF NOT EXISTS jobfit_prompt text;
