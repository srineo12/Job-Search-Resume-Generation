# MVP Build Plan

## Phase 0 — Project Setup (½ day)

1. Create Next.js app (App Router, TypeScript, Tailwind, shadcn/ui).
2. Set up GitHub repo.
3. Deploy empty app to Vercel Hobby.
4. Create Supabase project (free tier).
5. Add env vars in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `APIFY_TOKEN`
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
   - `GOOGLE_OAUTH_REDIRECT_URI`
6. Initialise Supabase migration workflow.

## Phase 1 — Auth & Schema (½ day)

1. Supabase Auth (magic link).
2. Implement initial migrations for all tables in DATABASE_SCHEMA.md.
3. Enable RLS with `user_id = auth.uid()` policies.
4. Build a protected layout (redirect unauth users to login).
5. Seed empty rows for current user: candidate_profile placeholder, etc.

## Phase 2 — Settings & Master Profile (1 day)

1. **Settings → Profile** page: editable JSON form for candidate profile.
2. **Settings → Prompts** page: list, edit, version, set active for the three prompt types.
3. **Settings → Style** page: YAML editor, validation, version, set active.
4. **Settings → Keyword Sets** page: CRUD for keyword sets.
5. **Settings → Integrations** page: connect Google Drive (OAuth flow), enter Apify token, enter Claude key (or rely on env).
6. **Settings → Apify Actors** page: enter actor IDs and default input per source.

## Phase 3 — Apify Import (1 day)

1. `POST /api/imports` endpoint: triggers actor run.
2. `GET /api/imports/:id/refresh` endpoint: polls Apify status, fetches dataset on completion.
3. Normaliser files per source: `lib/import/normalisers/seek.ts`, `indeed.ts`.
4. Insert-with-dedupe logic.
5. **Imports** page: trigger form + history table + refresh button.

## Phase 4 — Job List & Detail (1 day)

1. **Jobs** page: list with sort, filter, search.
2. **Job Detail** page: full info, status actions, history, original URL link.
3. Status update endpoint with `job_status_history` insert.
4. Skip / shortlist / mark applied buttons.

## Phase 5 — Ranking (1 day)

1. Hard-rules pre-filter (`lib/ranking/hardRules.ts`).
2. Claude API call with active ranking prompt (`lib/ai/claude.ts`).
3. `POST /api/jobs/:id/rank` and `POST /api/imports/:id/rank-batch` endpoints.
4. UI: "Rank new jobs" button on Imports and Jobs pages, progress feedback.
5. Display score, category, reasons, disqualifiers on Job Detail.

## Phase 6 — Document Generation (2 days)

1. Claude call with active prompt → structured JSON output (`lib/ai/generate.ts`).
2. JSON validation against Zod schema.
3. DOCX renderer using `docx` npm package, reading active YAML style (`lib/render/docx.ts`).
4. PDF generation: either via `docx` → PDF library or render PDF directly with `pdf-lib`.
5. Google Drive upload helper (`lib/drive/upload.ts`).
6. Per-job folder creation.
7. `POST /api/jobs/:id/generate-resume` and `POST /api/jobs/:id/generate-cover-letter` endpoints.
8. UI: Generate buttons on Job Detail, show structured JSON for review/edit, re-render button, download links.
9. Duplicate-application warning modal.

## Phase 7 — Dashboard & Polish (½ day)

1. **Dashboard** page: counts of new, ranked, shortlisted, applied this week.
2. Recent activity feed.
3. Final UX polish: loading states, error toasts, empty states.
4. Brief inline help text on each page.

## Phase 8 — Testing & Initial Run (½ day)

1. Manual end-to-end test: import → rank → generate → mark applied.
2. Verify ATS checks on output (open in Word, parse with simple ATS test tool).
3. Verify Drive folder structure.
4. Verify dedupe across two import runs.

## Out of MVP Phase (Phase 9+, Future)

- Webhook-based import completion.
- Auto-ranking after import.
- Cover letter A/B variants.
- Multiple resume templates.
- Email reply detection.
- Calendar integration for interviews.

## Estimated Total: ~7–8 working days for one developer.

## Deliverables Checklist

- [ ] Vercel-hosted Next.js app
- [ ] Supabase schema with RLS
- [ ] Auth working
- [ ] Settings (profile, prompts, style, keyword sets, integrations, actors)
- [ ] Apify import working end-to-end
- [ ] Hard rules + AI ranking working
- [ ] Resume + cover letter generation to Drive
- [ ] Status tracking + dedupe + history
- [ ] Dashboard
- [ ] Documentation in repo (this blueprint + README)

## Cost Validation (Post-Build)

- Vercel Hobby: $0
- Supabase Free: $0
- Google Drive: $0
- Apify: covered by free credits (user-managed)
- Claude API: pay per use (only intentional cost)
- **Total fixed monthly: $0** ✓