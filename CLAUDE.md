# CLAUDE.md

This file provides context for AI assistants working in this repository.

## Project Purpose

An automated job search and resume generation system. The system imports job listings via Apify, scores and ranks them, then generates tailored resumes and cover letters using AI, storing the results in Google Drive.

## Key Documentation

Before writing any code, read the relevant spec files in `docs/`:

- `docs/PRODUCT_REQUIREMENTS.md` — what the product must do
- `docs/USER_FLOW.md` — how users interact with the system
- `docs/DATABASE_SCHEMA.md` — data models
- `docs/JOB_RANKING_RULES.md` — how jobs are scored and filtered
- `docs/RESUME_AND_COVER_LETTER_GENERATION_RULES.md` — AI generation rules
- `docs/APIFY_IMPORT_SPEC.md` — Apify integration details
- `docs/GOOGLE_DRIVE_STORAGE_SPEC.md` — Google Drive integration details
- `docs/MVP_BUILD_PLAN.md` — build order and milestones

## Development Guidelines

- Do not write app code until the documentation in `docs/` is complete and agreed upon.
- Follow the MVP build plan for implementation order.
- Keep each module focused on a single responsibility.
- All AI generation calls should use prompt caching where supported.

## Tech Stack

_To be defined in PRODUCT_REQUIREMENTS.md._
