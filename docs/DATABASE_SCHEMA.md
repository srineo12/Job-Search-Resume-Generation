# Database Schema — Supabase / Postgres

All tables use `uuid` primary keys, `created_at` and `updated_at` timestamps, and `user_id` foreign key (even in single-user MVP, to future-proof for multi-user).

## Conventions
- Timestamps: `timestamptz` default `now()`.
- JSON columns: `jsonb`.
- Status enums: implemented as Postgres `text` with CHECK constraints (simpler to evolve than enum types).
- Indexes noted per table.

## Tables

### `users`
Managed by Supabase Auth. Referenced via `auth.users.id`.

---

### `candidate_profile`
Single row per user. Master source of truth for resume content.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | unique |
| profile_json | jsonb | structured: contact, summary, experience[], education[], skills[], certifications[] |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### `keyword_sets`
Saved keyword groups for Apify imports.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text | e.g. "Teacher Aide" |
| keywords | jsonb | array of strings/phrases |
| is_active | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Index: `(user_id, name)`.

---

### `imports`
One row per Apify run.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| source | text | `seek` / `indeed` |
| actor_id | text | Apify actor used |
| keyword_set_ids | jsonb | array of UUIDs |
| input_payload | jsonb | full Apify input |
| apify_run_id | text | from Apify |
| status | text | `queued` / `running` / `succeeded` / `failed` |
| stats | jsonb | { fetched, inserted, duplicates, errors } |
| error_message | text | nullable |
| started_at | timestamptz | |
| finished_at | timestamptz | nullable |
| created_at | timestamptz | |

Index: `(user_id, created_at desc)`, `apify_run_id`.

---

### `jobs`
Normalised job listings.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| import_id | uuid FK → imports | nullable (for manual adds) |
| source | text | `seek` / `indeed` / `manual` |
| source_job_id | text | platform's job ID, nullable |
| url | text | job posting URL |
| url_hash | text | sha256 of normalised URL — used for dedupe |
| employer | text | |
| title | text | |
| location | text | |
| remote_flag | boolean | |
| salary_text | text | raw salary string if present |
| description_text | text | plain text job description |
| description_html | text | original HTML if available |
| posted_at | timestamptz | nullable |
| raw_payload | jsonb | full Apify item for debugging |
| dedupe_key | text | sha256(`normalise(employer + title + location)`) |
| status | text | see enum below |
| is_duplicate_of | uuid FK → jobs.id | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Status values: `imported`, `ranked`, `shortlisted`, `documents_generated`, `applied`, `interview`, `offer`, `rejected`, `withdrawn`, `skipped`, `error`.

Indexes:
- `(user_id, status)`
- `(user_id, url_hash)` — dedupe lookup.
- `(user_id, dedupe_key)` — dedupe lookup.
- `(user_id, created_at desc)`.

---

### `job_rankings`
One row per ranking attempt. Latest is shown in UI.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| job_id | uuid FK → jobs | |
| prompt_version_id | uuid FK → prompt_versions | |
| score | integer | 0–100 |
| category | text | e.g. `teacher_aide`, `school_admin`, `customer_service`, `reject` |
| reasons | jsonb | array of strings |
| disqualifiers | jsonb | array of strings (e.g. "requires VIT") |
| recommended_action | text | `shortlist` / `consider` / `skip` / `reject` |
| raw_ai_response | jsonb | full Claude response |
| model | text | e.g. `claude-opus-4-7` |
| latency_ms | integer | |
| created_at | timestamptz | |

Index: `(job_id, created_at desc)`.

---

### `job_status_history`
Audit log of status changes.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| job_id | uuid FK | |
| from_status | text | nullable |
| to_status | text | |
| note | text | nullable |
| created_at | timestamptz | |

Index: `(job_id, created_at desc)`.

---

### `generated_documents`
Resumes and cover letters generated per job.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| job_id | uuid FK | |
| doc_type | text | `resume` / `cover_letter` |
| version | integer | per (job_id, doc_type) starting at 1 |
| prompt_version_id | uuid FK → prompt_versions | |
| style_version_id | uuid FK → style_versions | |
| structured_json | jsonb | AI structured output before render |
| drive_folder_id | text | parent folder in Drive |
| drive_pdf_file_id | text | |
| drive_docx_file_id | text | |
| pdf_url | text | shareable Drive link |
| docx_url | text | shareable Drive link |
| model | text | |
| raw_ai_response | jsonb | |
| created_at | timestamptz | |

Index: `(job_id, doc_type, version desc)`.

---

### `prompt_versions`
Versioned editable prompts.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| prompt_type | text | `ranking` / `resume_generation` / `cover_letter_generation` |
| version | integer | per (user_id, prompt_type) |
| content | text | full prompt text |
| is_active | boolean | only one true per (user_id, prompt_type) |
| notes | text | nullable |
| created_at | timestamptz | |

Index: `(user_id, prompt_type, version desc)`.
Trigger: when `is_active` set true, unset others for same (user_id, prompt_type).
Retention: keep latest 5 per type; older auto-pruned.

---

### `style_versions`
Versioned YAML style configs.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| version | integer | |
| yaml_content | text | raw YAML |
| parsed_json | jsonb | parsed for runtime use |
| is_active | boolean | only one true per user |
| notes | text | nullable |
| created_at | timestamptz | |

Retention: keep latest 5 per user.

---

### `integrations`
API keys and connection state.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| provider | text | `claude` / `apify` / `google_drive` |
| credentials | jsonb | encrypted at rest by Supabase; tokens, refresh tokens, root folder ID |
| status | text | `connected` / `disconnected` / `error` |
| last_checked_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Unique: `(user_id, provider)`.

---

### `apify_actors`
Configurable actor IDs per source.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| source | text | `seek` / `indeed` |
| actor_id | text | e.g. `username/actor-name` |
| default_input | jsonb | base input template |
| is_active | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

## Row Level Security (RLS)

All tables have RLS enabled with policy: `user_id = auth.uid()`.

## Migrations Approach

- Use Supabase migrations (SQL files under `supabase/migrations/`).
- Each schema change is a new timestamped migration.
- No destructive migrations on production.