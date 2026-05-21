# Claude Code Project Memory

This file is read by Claude Code on every session to maintain context across coding work on this project. Keep it concise, factual, and updated when major decisions change.

## Project: Job Ranking & ATS Resume Generation App

A single-user web app for Priyadharshini Selvam to import jobs from Apify (Seek, Indeed), rank them with Claude, and generate ATS-friendly resumes and cover letters to Google Drive. Manual apply only. Free hosting tiers only.

## Tech Stack

- Next.js (App Router, TypeScript)
- Tailwind CSS, shadcn/ui
- Supabase (Postgres + Auth) — free tier
- Vercel Hobby — free tier
- Claude API (Anthropic) — pay-per-use, structured JSON output
- Apify API — free credits
- Google Drive API — OAuth, `drive.file` scope
- DOCX generation via `docx` npm package
- PDF generation server-side (no Vercel Blob)

## Hosting Constraints (Strict)

- **Zero monthly fixed cost.**
- No Vercel Blob, no paid queues, no paid storage, no always-on workers.
- No long-running scraping or browser automation inside Vercel functions.
- All scraping delegated to Apify.
- Document generation is on-demand only.

## Repo Structure (Conventional)
/app                       Next.js routes (App Router)
/components                React components
/lib
/ai                      Claude API helpers
/import                  Apify + normalisers
/ranking                 Hard rules + AI scoring
/render                  DOCX + PDF generation
/drive                   Google Drive API helpers
/supabase                Supabase client + helpers
/db                      Query helpers
/supabase/migrations       SQL migrations
/types                     Shared TS types and Zod schemas
/docs                      This blueprint + design docs

## Database

- Single Supabase project. All tables have RLS with `user_id = auth.uid()`.
- See `DATABASE_SCHEMA.md` for full schema.
- Migrations live in `/supabase/migrations`. Never edit production data directly.

## Core Domain Rules

### Ranking
- Hard reject for: Cert III, Cert IV, Diploma, VIT, ACECQA, teaching registration, mandatory Australian quals.
- Boost: entry-level, junior, training provided, no experience required.
- AI returns structured JSON: score, category, reasons, disqualifiers, recommended_action.
- See `JOB_RANKING_RULES.md`.

### Resume & Cover Letter Generation
- Never invent new jobs or qualifications.
- Tailoring allowed only within existing roles in the candidate profile.
- Two-step: Claude → structured JSON → renderer → DOCX + PDF.
- ATS-friendly: single column, no tables, no graphics, standard fonts, simple bullets.
- Renderer reads active YAML style config.
- See `RESUME_AND_COVER_LETTER_GENERATION_RULES.md`.

### Prompts and Style
- Three editable prompt types: `ranking`, `resume_generation`, `cover_letter_generation`.
- Each prompt is versioned; keep last 5 versions; one is active.
- YAML style config is versioned similarly.
- Always use the active version at runtime; record `prompt_version_id` and `style_version_id` on every output for traceability.

### Dedupe
- On import: dedupe by URL hash and by employer+title+location hash.
- On generate / mark applied: warn if same employer+title combination already has `applied` / `interview` / `offer` / `documents_generated` status.

### Google Drive
- OAuth `drive.file` scope only.
- Per-job folder: `/JobApps/{Employer}_{TitleSlug}_{jobIdPrefix}/`.
- Files versioned by name (`v1`, `v2`); never overwrite.

## API Conventions

- All API routes under `/app/api/`.
- Server-only logic in `lib/`; never expose service-role key client-side.
- Use Zod schemas for all request/response validation.
- Structured AI outputs validated against Zod before persistence.

## AI Call Conventions

- Use Claude API with the active prompt content fetched from `prompt_versions`.
- Use response schema or tool-use to enforce structured JSON.
- Store `raw_ai_response`, `model`, and `latency_ms` on every call.
- Default model: `claude-opus-4-7` (or current best Anthropic recommends — verify before changing).

## Things to Avoid

- Do not auto-apply to jobs.
- Do not store files in Vercel Blob or Supabase Storage.
- Do not invent candidate experience.
- Do not build long-running serverless functions.
- Do not add new sources without adding a normaliser.
- Do not put secrets in client bundles.

## When Starting a Task

1. Read the relevant doc in `/docs/`:
   - `PRODUCT_REQUIREMENTS.md`
   - `USER_FLOW.md`
   - `DATABASE_SCHEMA.md`
   - `JOB_RANKING_RULES.md`
   - `RESUME_AND_COVER_LETTER_GENERATION_RULES.md`
   - `APIFY_IMPORT_SPEC.md`
   - `GOOGLE_DRIVE_STORAGE_SPEC.md`
   - `MVP_BUILD_PLAN.md`
2. Check existing code in `lib/` and `app/` for related patterns.
3. Add or update migrations under `/supabase/migrations/` for any schema change.
4. Add/update Zod schemas in `/types/` for new data shapes.
5. Update this file (`CLAUDE.md`) if a major architectural decision changes.

## Useful Commands
npm run dev               # local dev
npm run build             # production build
npx supabase migration new {name}    # new migration
npx supabase db push      # apply migrations

## Open Decisions / TODOs

- Confirm DOCX → PDF approach (direct library vs render twice).
- Confirm Apify actor IDs for Seek and Indeed (user-provided at runtime).
- Decide whether to auto-rank on import or require explicit button (MVP: explicit button).

## Document Source of Truth

The nine markdown files in `/docs/` (PRODUCT_REQUIREMENTS.md, USER_FLOW.md, DATABASE_SCHEMA.md, JOB_RANKING_RULES.md, RESUME_AND_COVER_LETTER_GENERATION_RULES.md, APIFY_IMPORT_SPEC.md, GOOGLE_DRIVE_STORAGE_SPEC.md, MVP_BUILD_PLAN.md, CLAUDE.md) are the source of truth. If implementation diverges, update the docs first, then code.