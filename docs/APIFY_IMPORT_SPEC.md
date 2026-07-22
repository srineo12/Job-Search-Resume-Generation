# Apify Import Specification

## 1. Overview

Job imports are run on demand by the user. Vercel functions trigger Apify actor runs via the Apify API and return immediately. Apify runs the scraping externally. The app polls (or accepts a webhook) to detect completion, then fetches the dataset and inserts jobs.

## 2. Configurable Per Source

Stored in `apify_actors` table:

- `source`: `seek` or `indeed`.
- `actor_id`: Apify actor identifier (e.g. `username/seek-scraper`). User enters this in Settings.
- `default_input`: JSON template merged with per-run input.

This avoids hardcoding actor IDs, which can change.

## 3. Input Construction

Per import request, the app builds Apify input by merging:

1. `default_input` from `apify_actors`.
2. Per-run overrides:
   - Keywords from selected keyword set(s) (joined per actor's expected format).
   - Location: `Melbourne, VIC` (or `Melbourne VIC 3000` depending on actor).
   - Remote flag: included if actor supports it.
   - Result limit: default 100 per source per run.

Example merged input for Seek:

```json
{
  "keywords": ["teacher aide", "education support", "learning support assistant"],
  "location": "Melbourne VIC",
  "remoteFlag": false,
  "maxItems": 100
}
```

The exact shape depends on the actor; the app stores the input shape as a template per actor.

## 4. Triggering a Run

API endpoint (Next.js route): `POST /api/imports`

Body:
```json
{
  "source": "seek",
  "keyword_set_ids": ["uuid", "uuid"],
  "location": "Melbourne VIC",
  "max_items": 100
}
```

Server logic:
1. Loads actor config from `apify_actors`.
2. Merges input.
3. Inserts `imports` row with status `queued`.
4. Calls Apify API: `POST https://api.apify.com/v2/acts/{actor_id}/runs` with input.
5. Stores `apify_run_id`.
6. Returns immediately with `import_id` to client.

The Vercel function exits within seconds — no long polling.

## 5. Detecting Completion

Two options. MVP uses option A.

### Option A — User-Triggered Refresh (MVP)
- User opens **Imports** page; app calls `GET /api/imports/:id/refresh`.
- Server calls Apify: `GET /v2/acts/{actor_id}/runs/{run_id}`.
- If status is `SUCCEEDED`: fetch dataset, process items.
- If `RUNNING`: return current state.
- If `FAILED`: mark import failed.

### Option B — Webhook (Future)
- Configure Apify webhook → Vercel endpoint.
- Endpoint marks import succeeded and triggers processing.

## 6. Fetching Dataset

After a `SUCCEEDED` run:

1. `GET https://api.apify.com/v2/datasets/{dataset_id}/items?clean=true&format=json`
2. Iterate items.

## 7. Normalisation

Each raw item is mapped to a `jobs` row. Mapping is per-source (Seek vs Indeed have different field names). Normalisation extracts:

- `source_job_id`
- `url` (canonicalised: strip tracking params, lowercase host)
- `url_hash` = sha256 of canonical URL
- `employer`
- `title`
- `location`
- `remote_flag`
- `salary_text`
- `description_text` (HTML stripped)
- `description_html` (original)
- `posted_at`
- `raw_payload` (full original)
- `dedupe_key` = sha256(normalised `employer + title + location`)

Normalisation lives in `lib/import/normalisers/{source}.ts`.

## 8. Deduplication on Insert

For each normalised job:

1. Query existing rows for matching `url_hash` (user-scoped).
2. If match found → set `is_duplicate_of`, status `imported`, don't re-rank. Increment dupe counter.
3. Else query by `dedupe_key`.
4. If match found → same handling.
5. Else insert as a fresh job.

## 9. Import Stats

On completion, update `imports.stats`:

```json
{
  "fetched": 87,
  "inserted": 64,
  "duplicates_by_url": 18,
  "duplicates_by_employer_title": 5,
  "errors": 0
}
```

## 10. Auto-Cleanup After Import

After all jobs are inserted, the server runs automatic cleanup to mark non-matching jobs as `irrelevant`.

**Cleanup Logic:**
1. Fetch keyword sets used in the import from `imports.keyword_set_ids`
2. For each inserted job, check if `title` OR `description_text` (or stripped `description_html`) contains at least one keyword phrase (case-insensitive, substring match)
3. Jobs matching at least one keyword: remain as `imported` (default status)
4. Jobs matching NO keywords: status set to `irrelevant`
5. User can later filter by status to hide irrelevant jobs

The cleanup result (count of marked irrelevant) is stored in `imports.stats.cleanup_applied`.

**Manual Cleanup:**
Users can also manually trigger cleanup on the Jobs page by:
1. Selecting a "Keyword Set" from the dropdown
2. Clicking "Clean Up" button
3. This cleans ALL jobs (not just recent imports) against the selected keyword set

## 11. Auto-Rank After Import (Optional)

Optional setting: "Automatically rank new jobs after import."

If enabled, after insertion the server triggers ranking for each new job. Ranking is done in chunks (e.g. 10 jobs at a time) within a single Vercel function call, with a safety cap of 50 jobs per call. Remaining jobs are flagged for the next call.

## 12. Rate Limits & Cost

- Apify free tier credits are limited; user controls how many runs per day.
- The app shows estimated credit cost per run (if Apify exposes it) before triggering.
- Imports are not scheduled or automated in MVP.

## 13. Error Handling

- Apify API errors → import status `failed`, error message stored.
- Network errors → user can retry by clicking refresh.
- Malformed items → skipped, counted in `errors`.
- Cleanup errors → logged but do not block import completion.

## 14. Future Sources

To add a new source (e.g. LinkedIn, Jora):
1. Insert a new `apify_actors` row with actor ID and default input.
2. Add a normaliser file: `lib/import/normalisers/{source}.ts`.
3. No schema changes needed.