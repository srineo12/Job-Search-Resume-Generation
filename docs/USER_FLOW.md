# User Flow — Job Ranking & ATS Resume Generation App

## 1. First-Time Setup Flow

1. User signs in via Supabase Auth (magic link or email/password).
2. App detects empty state → onboarding wizard:
   - **Step 1**: Paste master resume data (or import from existing JSON) → saved as Candidate Profile.
   - **Step 2**: Paste ranking prompt → saved as `ranking` v1, set active.
   - **Step 3**: Paste resume generation prompt → saved as `resume_generation` v1, set active.
   - **Step 4**: Paste cover letter prompt → saved as `cover_letter_generation` v1, set active.
   - **Step 5**: Upload/paste YAML style config → saved as style v1, set active.
   - **Step 6**: Enter API keys (Claude, Apify) → stored as env vars or in settings table.
   - **Step 7**: Connect Google Drive via OAuth → root folder ID stored.
   - **Step 8**: Create at least one keyword set (e.g. "Teacher Aide").
3. User lands on Dashboard.

## 2. Daily Job Search Flow

### 2.1 Import Jobs
1. User opens **Imports** page.
2. Selects one or more keyword sets (toggle on/off).
3. Selects source(s): Seek, Indeed.
4. Confirms location filter (default: Melbourne, remote OK).
5. Clicks **Start Import**.
6. App calls Apify actor(s) with the configured input.
7. Apify runs externally (no Vercel function held open).
8. User sees import status: `queued` → `running` → `succeeded` / `failed`.
9. On success, app fetches the dataset, normalises jobs, dedupes against existing rows, inserts new jobs with status `imported`.
10. Auto-cleanup runs: jobs not matching any keyword from the selected sets are marked status `irrelevant`.
11. Import summary shown: X new, Y duplicates skipped, Z marked irrelevant, W errors.

### 2.2 Cleanup (Optional Manual)
1. User opens **Jobs** page.
2. Selects a "Keyword Set…" from the dropdown.
3. Clicks **Clean Up** button.
4. App marks all jobs not matching any keyword as status `irrelevant`.
5. Success message shown with count of cleaned jobs.
6. User can filter out `irrelevant` jobs using the Status filter.

### 2.3 Rank Jobs
1. Newly imported jobs default to status `imported` (or `irrelevant` if auto-cleaned).
2. User selects a "Keyword Set…" and clicks **Job-fit Score** (or auto-trigger after import).
3. App iterates over `imported` jobs (not `irrelevant`), calls Claude API with the active ranking prompt + job description + candidate profile snippet.
4. Claude returns structured JSON: `score`, `category`, `reasons[]`, `disqualifiers[]`, `recommended_action`.
5. App stores ranking result, updates job status to `ranked`.
6. Progress indicator shown; user can navigate away — ranking continues in background via batched server actions.

### 2.4 Review & Shortlist
1. User opens **Jobs** list, default sort: score descending.
2. Filters by score ≥ 70, status = `ranked`.
3. Clicks a job → **Job Detail** view.
4. Reviews score, reasons, disqualifiers, full description.
5. Actions available:
   - **Shortlist** → status becomes `shortlisted`.
   - **Skip** → status becomes `skipped` (hidden from default view).
   - **Open Job URL** → opens original posting in new tab.

### 2.5 Generate Documents
1. From a shortlisted (or any) job detail view, user clicks **Generate Resume**.
2. App checks for duplicate: if employer + title is already in `applied` status, show warning with link to existing record. User can confirm or cancel.
3. App calls Claude with active `resume_generation` prompt + job description + candidate profile.
4. Claude returns structured JSON resume (sections, bullets, skills).
5. Server renderer reads active YAML style config, produces DOCX and PDF.
6. Files uploaded to Google Drive in per-job folder: `/JobApps/{employer}_{title}_{jobId}/`.
7. DB records: file IDs, version number, prompt version, style version, timestamp.
8. User sees download links and "Open in Drive" link.
9. Same flow for **Generate Cover Letter**.
10. Job status updates to `documents_generated`.

### 2.6 Apply Manually
1. User opens job URL in a new tab.
2. Downloads resume + cover letter PDFs from Drive or app.
3. Applies on the job board manually.
4. Returns to app, clicks **Mark as Applied** on the job detail page.
5. Optionally adds notes (e.g. "Applied via Seek, ref #12345").
6. Status updates to `applied`; timestamp recorded.

### 2.7 Track Outcomes
1. User updates status as outcomes arrive:
   - `interview` → adds date/notes.
   - `offer` → adds details.
   - `rejected` → adds optional reason.
   - `withdrawn` → user pulled the application.
2. Status history visible on job detail page.

## 3. Keyword Set Management Flow

1. User opens **Settings → Keyword Sets**.
2. Creates a set with name + list of keywords.
3. Edits, duplicates, deletes sets.
4. Sets are referenced by name when triggering imports or cleanup.

## 4. Prompt Management Flow

1. User opens **Settings → Prompts**.
2. Selects prompt type (ranking / resume / cover letter).
3. Sees list of versions with active version marked.
4. Actions:
   - **Edit** active version → opens editor with current text.
   - **Save as new version** → increments version number, optionally set active.
   - **Set Active** → switch to a different stored version.
   - **Rollback** → set a previous version active.
5. Only the last N versions retained (default 5); older versions auto-pruned.

## 5. Style Config Flow

1. User opens **Settings → Style**.
2. YAML editor with syntax highlighting.
3. Save creates a new style version.
4. Set Active applies it to future document generation.
5. Last 5 versions retained.

## 6. Candidate Profile Flow

1. User opens **Settings → Profile**.
2. Edits structured fields: contact, summary, experience (per role with bullets), education, skills, certifications.
3. Save updates the master profile (single record, not versioned in MVP).
4. Used by all subsequent document generations.

## 7. Error & Edge Case Flows

- **Apify run fails** → import record marked `failed` with error message; user can retry.
- **Claude API rate limit / error** → job ranking row marked `error`; user can retry batch.
- **Google Drive auth expired** → app prompts re-auth; document generation paused until reconnected.
- **Duplicate job detected on import** → skipped silently, counted in import summary.
- **Duplicate application detected on document generation** → warning modal, user confirms or cancels.
- **Invalid YAML style config** → save blocked with validation error; previous active version remains.

## 8. Navigation Map

- **Dashboard** — counts (new, ranked, shortlisted, applied this week).
- **Imports** — trigger and history of imports (auto-cleanup applied).
- **Jobs** — list, filter, sort, search, cleanup, job-fit score.
- **Job Detail** — full info, actions, history.
- **Settings**
  - Prompts
  - Style
  - Profile
  - Keyword Sets
  - Integrations (Apify, Google Drive, Claude API keys)