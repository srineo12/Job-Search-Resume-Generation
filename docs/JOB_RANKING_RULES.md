# Job Ranking Rules

The ranking system combines (a) hard rules applied in code and (b) an AI scoring step using the active ranking prompt. Hard rules run first; AI scoring runs only on jobs that pass hard rules.

## 1. Hard Rules (Pre-AI Filter)

Applied in app code before sending to Claude. A job that matches any rejection rule is automatically marked `category=reject`, given `score=0`, and skipped for AI scoring. Reasons are recorded in `disqualifiers`.

### 1.1 Automatic Reject Triggers

Reject if the job description or title contains any of the following (case-insensitive, word-boundary match):

- **Australian qualifications required**:
  - `Certificate III`, `Cert III`, `Cert 3`
  - `Certificate IV`, `Cert IV`, `Cert 4`
  - `Diploma required`, `Diploma in`
  - `Bachelor of Education`, `Bachelor's in Education`
- **Teaching registrations**:
  - `VIT registration`, `VIT registered`, `Victorian Institute of Teaching`
  - `ACECQA approved`, `ACECQA`
  - `teaching registration`, `registered teacher`, `teacher registration`
  - `TRB registration`, `teacher accreditation`
- **Mandatory Australian-specific credentials**:
  - `Australian citizen only`
  - `must hold Australian qualification`
  - `Australian work experience required` (when stated as mandatory)
- **Roles outside scope**:
  - Senior or lead roles: `Senior`, `Lead`, `Head of`, `Manager` in title (unless `Assistant Manager` for an entry context)
  - `5+ years experience`, `7+ years experience`, `10+ years`

### 1.2 Soft Reject (Deprioritise, Not Auto-Reject)

These reduce score but don't auto-reject — AI is asked to weigh them:

- `Working with Children Check` mentioned but not as the only requirement → AI judges (this is obtainable).
- `Police Check` required → AI judges.
- `Driver's licence` required → AI judges based on role type.
- `2+ years experience` → AI judges based on transferability.

## 2. AI Scoring Step

Jobs that pass hard rules are sent to Claude with:
- The active `ranking` prompt.
- The job description (title, employer, location, description, salary).
- A summary of the candidate profile.

### 2.1 AI Response Schema (JSON)

```json
{
  "score": 0-100,
  "category": "teacher_aide | school_admin | customer_service | admin_office | retail | data_entry | other_entry | reject",
  "reasons": ["string", ...],
  "disqualifiers": ["string", ...],
  "matched_keywords": ["string", ...],
  "missing_requirements": ["string", ...],
  "recommended_action": "shortlist | consider | skip | reject"
}
```

### 2.2 Scoring Guidance (in Prompt)

The AI prompt instructs Claude to score using these bands:

- **90–100**: Excellent fit — entry-level, fresher-friendly, training provided, matches candidate's customer-service or admin background, no disqualifying credential.
- **75–89**: Strong fit — minor gaps (e.g. "preferred" criteria), still entry-level.
- **60–74**: Moderate fit — some experience expected but transferable from candidate's profile.
- **40–59**: Weak fit — significant gaps but worth review.
- **0–39**: Poor fit — likely skip.

### 2.3 Score Boosters

AI is instructed to boost score when the job mentions:
- "no experience required"
- "training provided"
- "entry level" / "entry-level"
- "junior"
- "graduate" / "fresher"
- "willing to train"
- "full training"
- "school holidays" (often signals teacher aide casual roles)
- "casual" / "part-time" in school context

### 2.4 Score Penalties

AI is instructed to reduce score when:
- 2+ years experience listed as required but not preferred.
- Specialised software not in candidate profile listed as required.
- Specific industry experience required (e.g. legal admin, medical admin) not in profile.

## 3. Category Definitions

| Category | Description |
|---|---|
| `teacher_aide` | Teacher aide, education support, learning support, classroom assistant. |
| `school_admin` | School receptionist, school admin assistant, school office support. |
| `customer_service` | Call centre, customer support, billing, retail customer service. |
| `admin_office` | General office admin, reception, data entry, office support. |
| `retail` | Retail assistant, sales assistant in store. |
| `data_entry` | Pure data entry, document processing. |
| `other_entry` | Other entry-level roles not in above categories. |
| `reject` | Hard-rejected or AI-rejected. |

## 4. Dedupe Rules

Runs on import before insertion:

1. **URL match**: `url_hash` matches an existing job → mark new as duplicate, link via `is_duplicate_of`.
2. **Employer + title + location match**: `dedupe_key` matches → mark as duplicate.
3. If both match, URL takes precedence.

Normalisation for `dedupe_key`:
- Lowercase.
- Strip punctuation.
- Collapse whitespace.
- Remove common suffixes from employer (`Pty Ltd`, `Ltd`, `Pty.`).
- Trim location to suburb/city level (drop postcode).

## 5. Duplicate Application Warning

When the user clicks **Generate Resume** or **Mark as Applied**:

1. Check if any job with same `dedupe_key` already has status `applied`, `interview`, `offer`, or `documents_generated`.
2. If yes → show warning modal with link to existing record.
3. User can confirm (proceed) or cancel.

## 6. Re-Ranking

- User can manually trigger re-ranking on any job.
- Re-ranking creates a new `job_rankings` row; the latest is shown.
- Useful after editing the ranking prompt or candidate profile.

## 7. Audit & Debugging

- `raw_ai_response` is stored for every ranking.
- `prompt_version_id` records which prompt produced the score.
- This allows comparing prompt versions and debugging unexpected scores.