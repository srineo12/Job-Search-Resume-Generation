# Product Requirements — Job Ranking & ATS Resume Generation App

## 1. Purpose

A personal web app to import job listings from Apify (Seek, Indeed), rank them against the candidate's profile and preferences, and generate ATS-friendly tailored resumes and cover letters on demand. The candidate applies to jobs manually outside the app; the app tracks application status to avoid duplicates and provide visibility.

This is a single-user app for Priyadharshini Selvam, currently job-seeking in Melbourne, Australia, with a focus on education support, teacher aide, and school administration roles.

## 2. Goals

- Reduce time spent searching, filtering, and tailoring applications.
- Surface the highest-quality matches first, deprioritise unqualified roles.
- Produce ATS-friendly resumes and cover letters without inventing experience.
- Maintain a clean record of every job seen, ranked, applied to, or skipped.
- Run entirely on free hosting tiers with zero monthly cost.

## 3. Non-Goals (MVP)

- No auto-apply or auto-submit to job boards.
- No multi-user support or authentication beyond a single-user login.
- No mobile app — web only (responsive is fine but not required).
- No browser automation, scraping, or long-running jobs inside Vercel functions.
- No paid integrations (Vercel Blob, paid queues, paid storage).
- No analytics dashboard beyond basic counts.
- No interview prep, salary negotiation, or career coaching features.

## 4. Target User

Single user: the candidate. Comfortable with a simple admin-style UI. Will operate the app daily during active job search.

## 5. Core Features (MVP)

### 5.1 Keyword Set Management
- Save named keyword sets (e.g. "Teacher Aide", "School Admin", "Customer Service").
- Each set contains a list of search keywords/phrases.
- Toggle sets on/off before triggering an import.
- Edit, duplicate, delete sets.

### 5.2 Job Import (Apify)
- Trigger Apify actor runs on demand from the UI.
- Configurable actor IDs per source (Seek, Indeed) stored in app settings.
- Pass selected keyword set(s), location filter (Melbourne, remote-OK), and source as input.
- On completion, fetch results from Apify API and store normalised jobs in the database.
- Detect duplicates on import using both (a) job URL and (b) employer + title + location.

### 5.3 Job Ranking
- After import, run ranking against each new job using the active ranking prompt (Claude API).
- AI returns structured JSON: score, category, reasons, disqualifiers.
- Hard-reject jobs requiring Cert III, Cert IV, Diploma, VIT registration, ACECQA approval, teaching registration, or mandatory Australian qualifications.
- Strongly boost entry-level, junior, no-experience, training-provided, fresher-friendly roles.
- Store scores and ranking metadata in the database.

### 5.4 Job List & Filtering
- Sortable, filterable list of imported jobs.
- Filter by: score range, source, status, keyword set, date imported, employer.
- Search by free text.
- Show duplicates clearly with a link to the original.
- One-click access to original job URL.

### 5.5 Job Detail View
- Full job description.
- Ranking score and reasons.
- Buttons: Generate Resume, Generate Cover Letter, Mark as Applied, Skip/Reject, Open Job URL.
- Status history timeline.

### 5.6 Resume & Cover Letter Generation
- On demand only — never bulk-generated.
- Two-step generation: AI produces structured JSON first, then a server-side renderer produces DOCX/PDF using the YAML style config.
- Active resume prompt and cover letter prompt versions are used.
- Output is ATS-friendly: single column, no tables, no graphics, simple bullets, standard headings.
- AI may slightly tailor bullets within existing roles to fit the job but must not invent new jobs, employers, or qualifications.
- Generated files are saved to Google Drive in a per-job folder.
- Generated file metadata (Drive file ID, version, generated_at, prompt version used) stored in DB.

### 5.7 Application Status Tracking
- Statuses: `imported`, `ranked`, `shortlisted`, `documents_generated`, `applied`, `interview`, `offer`, `rejected`, `withdrawn`, `skipped`.
- Manual status updates from the UI.
- Status history (audit log) per job.
- Duplicate guard: warn before generating documents for an employer + title combination already in `applied` status.

### 5.8 Prompt Management
- Three editable prompt types: `ranking`, `resume_generation`, `cover_letter_generation`.
- Each prompt has versions. A small number of previous versions are retained for rollback.
- One version per prompt type is marked `active` and used by the app.
- Edit, save as new version, set active, rollback.

### 5.9 Style Configuration
- The YAML style file (page size, fonts, margins, section order, content limits) is editable in the UI.
- Style config is also versioned, with rollback to recent versions.
- Resume/cover letter renderer reads the active style version at generation time.

### 5.10 Candidate Profile (Master Record)
- The candidate's master resume data is the single source of truth.
- Stored as structured JSON in the database.
- Editable in the UI.
- AI references this profile when generating tailored documents.
- AI cannot add experiences not in the profile; can lightly tailor existing role bullets.

## 6. Hosting & Cost Constraints

- **Vercel Hobby** for Next.js hosting.
- **Supabase Free** for Postgres database and auth.
- **Google Drive API** for PDF/DOCX storage (free quota).
- **Apify free tier** for job imports (user manages credits).
- **Claude API** — pay-per-use, the only intentional cost.
- No Vercel Blob, no paid queues, no paid storage, no always-on workers.
- All long-running work avoided inside Vercel functions; Apify handles scraping externally.

## 7. Technical Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS, shadcn/ui.
- **Backend**: Next.js API routes / Server Actions.
- **Database**: Supabase (Postgres).
- **Auth**: Supabase Auth (single user, email/password or magic link).
- **AI**: Claude API (Anthropic) — structured JSON output with tool use or response schema.
- **Job Import**: Apify API.
- **Document Generation**: server-side DOCX (e.g. `docx` npm library) and PDF (e.g. `pdf-lib` or DOCX → PDF via library) using YAML style config.
- **Storage**: Google Drive API via OAuth or service account.

## 8. Security & Privacy

- Single user only; Supabase Auth restricts access.
- API keys (Claude, Apify, Google) stored as Vercel environment variables.
- Google Drive OAuth tokens stored in Supabase (encrypted at rest by Supabase).
- No third-party analytics or trackers.
- Personal candidate data (resume, contact info) never sent to systems other than Claude API and Google Drive.

## 9. Out-of-Scope Items (Future Considerations)

- Email integration to detect application replies.
- Calendar integration for interview scheduling.
- Multiple resume templates per role category.
- Multi-user/family accounts.
- Cover letter A/B testing.
- LinkedIn/Easy Apply automation.

## 10. Success Criteria (MVP)

- Import 50+ jobs from a single Apify run without errors.
- Ranking completes within 2 minutes for 50 jobs.
- Resume + cover letter generation completes within 30 seconds per job.
- Output passes basic ATS-friendliness checks (no tables, single column, standard fonts, parseable headings).
- Duplicate jobs are detected reliably.
- Total monthly hosting cost: $0 (excluding Claude API per-use cost).