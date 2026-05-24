# Session Handoff

_Last updated: 2026-05-24 (new session — no changes made)_

---

## 1. Session Summary

No code changes in this session. This handoff carries forward the state from the previous session.

**Previous session (last substantive work) completed Phase 6 (Document Generation) and fixed several UI/UX and stability issues:**

- Built the full resume & cover letter generation pipeline (AI → DOCX + PDF → ZIP download)
- Fixed dashboard crash caused by `user!.id` being null with auth bypassed
- Fixed "This page couldn't load" server error by adding `export const runtime = 'nodejs'` to the generate route
- Fixed login page permanently (client-side redirect to `/dashboard`)
- Added Job Category column (from Apify keyword set name) with multi-select filter
- Changed Priority and Status filters to multi-select toggle buttons
- Added toast notifications showing where generated files were saved
- Added Re-rank button that batches jobs 3 at a time with live progress
- Fixed "Bullet:" prefix in ranking_comments/role_description display
- Removed all row-level action buttons; Status column is now an inline dropdown
- Created `/handoff` and `/resume` slash command files

---

## 2. Files Changed

_(No files changed this session. See previous commits for history.)_

Last substantive changes (previous session):

| File | Purpose |
|------|---------|
| `app/src/app/(protected)/jobs/page.tsx` | Full rewrite — resizable/reorderable columns, multi-select filters, category filter, toast notifications, Gen button, Status dropdown |
| `app/src/app/(protected)/dashboard/page.tsx` | Fixed null user crash; updated stat cards to match real workflow |
| `app/src/app/(protected)/layout.tsx` | Auth permanently bypassed — no Supabase auth check |
| `app/src/app/(auth)/login/page.tsx` | Client-side redirect to /dashboard |
| `app/src/proxy.ts` | Single-line passthrough — no SSO redirect |
| `app/src/app/api/jobs/route.ts` | Added category join (imports→keyword_sets), PATCH + DELETE endpoints |
| `app/src/app/api/jobs/rank-batch/route.ts` | JSON schema always appended, force=true re-rank support, fixed bullet prefix in prompt |
| `app/src/app/api/jobs/[id]/generate/route.ts` | **NEW** — generates DOCX+PDF+ZIP via OpenAI + docx + pdfkit |
| `app/src/lib/render/types.ts` | **NEW** — ResumeData, CoverLetterData TypeScript types |
| `app/src/lib/render/resume-docx.ts` | **NEW** — Resume DOCX renderer (matches sample format) |
| `app/src/lib/render/cover-letter-docx.ts` | **NEW** — Cover letter DOCX renderer |
| `app/src/lib/render/resume-pdf.ts` | **NEW** — Resume PDF renderer via pdfkit |
| `app/src/lib/render/cover-letter-pdf.ts` | **NEW** — Cover letter PDF renderer |
| `app/src/lib/ai/generate-documents.ts` | **NEW** — Claude API calls for structured resume + cover letter JSON |
| `.claude/commands/handoff.md` | **NEW** — /handoff slash command |
| `.claude/commands/resume.md` | **NEW** — /resume slash command |

---

## 3. Current State

### ✅ Working
- Jobs page: resizable/reorderable columns, multi-select filters, category filter, save layout
- Ranking: ranks unranked jobs, Re-rank button for all jobs, batches of 3, live progress
- Document generation: Gen button on Open jobs → Claude API → DOCX + PDF → ZIP download → status → Generated
- Toast notifications: file saved location, success/failure counts
- Status dropdown inline in table (Open/Generated/Applied/Discarded)
- Login: permanently disabled, redirects to dashboard
- Dashboard: shows correct stats without auth

### ⚠️ Half-done / Untested
- **Document generation on Vercel** — pdfkit on Vercel serverless may have font-path issues (needs real-world test with a live job)
- **Category column** — only shows if jobs were imported via keyword sets (manually added jobs show `—`)
- **Profile JSON** — the Settings → Profile page shows an empty JSON template. Priya's actual profile data has NOT been entered yet — document generation will produce generic output until profile is filled

### ❌ Not started
- Google Drive upload (planned but deferred)
- Apply folder-move logic (status change works; actual folder move is manual)

---

## 4. Open Decisions / Blockers

1. **Profile data not entered** — The single most important blocker for document generation. Priya needs to paste her profile JSON into Settings → Profile and Save. The JSON structure required is:
   ```json
   {
     "contact": { "name": "Priyadharshini Selvam", "location": "Essendon North, VIC", "phone": "+61 422 489 894", "email": "PRIYA.SELVAM27@GMAIL.COM", "linkedin": "Available on request" },
     "summary": "...",
     "key_skills": ["..."],
     "experience": [{ "role": "...", "company": "...", "period": "...", "location": "...", "bullets": ["..."] }],
     "education": [{ "degree": "...", "institution": "...", "location": "...", "period": "...", "achievement": "..." }],
     "certifications": "...",
     "technical_skills": ["..."],
     "additional_info": ["..."]
   }
   ```

2. **pdfkit on Vercel** — If PDF generation fails (font not found error), the fix is to remove PDF generation and return DOCX-only ZIP. The user can convert DOCX→PDF using Word/Google Docs.

3. **app_logs table** — Still not created in Supabase. Logger fails silently; console.log still works in local dev.

---

## 5. Next Steps (ordered)

1. **Enter candidate profile** — Go to `job-search-resume-generation.vercel.app/settings/profile`, paste the full profile JSON from the sample resume, click Save Profile
2. **Test document generation** — On Jobs page, find an Open job (Hot priority), click 📄 Gen, check the downloaded ZIP opens correctly with proper resume/cover letter content tailored to that job
3. **If PDF fails on Vercel** — Remove pdfkit from generate route; return DOCX-only zip (2 files instead of 4)
4. **Re-rank the 3 score-0 jobs** — Click ↺ Re-rank to refresh Receptionist, Swim School, Teacher jobs with the fixed prompt (should now get ranking_comments and role_description)
5. **Import more jobs** — Go to Imports page, trigger another Apify run for fresh job listings

---

## 6. Gotchas

- **`export const runtime = 'nodejs'`** is required on any API route that uses `pdfkit`, `docx`, or `jszip` — without it, Next.js 15/16 may bundle these for Edge runtime and crash
- **Auth bypass** works via `getAuth()` in `lib/supabase/get-auth.ts` — always use this helper, never call `supabase.auth.getUser()` directly in server components
- **"Bullet:" prefix** — old ranked jobs (ranked before the prompt fix) store "Bullet: text" in `ranking_comments` and `role_description`. The display strips this with `stripBulletPrefix()`. Re-ranking will fix the stored data.
- **Status column width** — needs to be ≥160px or the Gen button overlaps the Salary column. Default is 160, Save Layout preserves it.
- **pdfkit font paths** — pdfkit uses Helvetica (built-in PDF font, no file system access needed). Should work on Vercel but untested.
- **Vercel SSO** — The deployed app on Vercel Hobby is NOT protected by Vercel SSO for browser access. API routes are accessible. Auth is handled by our app-level bypass.
- **`/handoff` and `/resume` commands** — Only work in Claude Code CLI (`claude` in terminal). In this chat interface, just say "do a handoff" or "resume from last session".
