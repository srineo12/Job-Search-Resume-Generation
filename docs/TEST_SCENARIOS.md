# Test Scenarios

_Tell Claude: "write tests for scenario N" to implement any scenario below._

---

## How to Write a Scenario

Use plain English in Given/When/Then format:

- **Given** — the starting state (what data exists, what page is open, what config is set)
- **When** — the single action taken (a function is called, a button is clicked, an API is called)
- **Then** — the observable outcome (return value, database change, UI change, file download)

Be specific. Vague scenarios produce vague tests. Instead of "it works", write "returns a string of exactly 64 hex characters".

You do NOT need to write code — just fill in the fields below. Claude will write the test from your description.

---

## EXAMPLE — replace with your own

> This shows the format. Do not ask Claude to implement this — it is illustrative only.

**Feature:** URL canonicalization in the import normaliser
**Given:** A raw Seek job URL with UTM tracking parameters: `https://www.seek.com.au/job/12345?utm_source=google&utm_medium=cpc#apply`
**When:** `canonicalizeUrl(url)` is called
**Then:**
- Returns `https://www.seek.com.au/job/12345` (no query string, no fragment)
- Result is lowercase
- Calling it twice on the same URL returns the same string

**Test data needed:** The raw URL string above
**Expected output:** `"https://www.seek.com.au/job/12345"`
**Priority:** P1

---

## SCENARIO 1 — Document Generation (Generate button → ZIP download)

**Type:** E2E (Playwright) — local only, skipped in CI

**Feature:** Generate button on Jobs page produces a downloadable ZIP containing resume and cover letter files, updates row status, and shows success toast.

**Given:**
- App is running at `http://localhost:3000`
- At least one job exists in the Jobs table with status **Open**
- A candidate profile JSON is saved in Settings → Profile
- Active resume and cover letter prompts are saved in Settings → Prompts

**When:**
1. Navigate to `/jobs`
2. Find the first row whose Status column shows **Open**
3. Click its **📄 Gen** button
4. Wait up to 60 seconds for the response

**Then:**
- A ZIP file is downloaded to the browser Downloads folder
- The ZIP contains exactly 2 files: `*_Resume.docx`, `*_Cover_Letter.docx` (PDF removed — pdfkit font issue on Vercel; convert via Word/Google Docs)
- A toast notification appears containing the word "generated" (success style, not error)
- The row's Status column updates to **Generated**
- The Gen button is no longer visible on that row (status is no longer Open)

**Secondary assertion (same test file):**
- A row with status **Generated**, **Applied**, or **Discarded** does NOT show a Gen button

**Test data needed:** Real Open job from live DB. Real profile + real prompts from app settings. No fixtures required.

**Expected output / assertion details:**
- Response `Content-Type` = `application/zip`
- ZIP entry count = 2
- ZIP entry names (inside folder `{employer}_{title}_{jobId}/`) end with `_Resume.docx` and `_Cover_Letter.docx`
- Toast element is visible within 65 seconds of clicking Gen
- Status cell text = "Generated" after toast appears

**Priority:** P0

**CI behaviour:** Tagged `@local-only` — CI workflow skips this test. Run manually:
```bash
cd app && npx playwright test --grep "generate" --headed
```

---

## How to Add More Scenarios

Copy the `SCENARIO 1` block above, paste it at the bottom of this file, increment the number, and fill in the placeholders. Then tell Claude: "write tests for scenario 2" (or whatever number).

Each scenario becomes one test file at:
```
tests/unit/<feature>/<scenario-name>.test.ts     ← for unit/integration
tests/e2e/<scenario-name>.spec.ts                ← for E2E
```
