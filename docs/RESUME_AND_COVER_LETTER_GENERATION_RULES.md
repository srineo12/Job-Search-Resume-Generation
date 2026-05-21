# Resume and Cover Letter Generation Rules

## 1. Core Principles

1. **Never invent experience.** AI cannot add jobs, employers, education, certifications, or years of experience not present in the candidate profile.
2. **Tailoring is allowed within existing roles.** AI may rewrite bullets, add plausible accomplishments, and reorder content within each existing role to fit the job description.
3. **ATS-friendly output.** No tables, no columns, no graphics, no text boxes, no icons. Single-column, standard fonts, simple bullets, standard section headings.
4. **Two-step generation.** AI returns structured JSON; renderer converts JSON to DOCX/PDF using the YAML style config. No direct DOCX generation by AI.
5. **Versioned outputs.** Every regeneration creates a new version row.

## 2. Inputs to Generation

- Active `resume_generation` or `cover_letter_generation` prompt.
- Job record (title, employer, location, description, salary, source).
- Candidate profile JSON (full master record).
- Optional: previous generated documents for this job (for comparison).

## 3. Structured JSON Output Schema

### 3.1 Resume JSON

```json
{
  "name": "string",
  "contact": {
    "address": "string",
    "phone": "string",
    "email": "string"
  },
  "summary": "string (75–95 words)",
  "key_skills": ["string", ... up to 12],
  "certifications_and_checks": ["string", ...],
  "additional_information": "string (up to 55 words)",
  "education_support_readiness": "string (up to 65 words, only if role is education-related)",
  "professional_experience": [
    {
      "title": "string",
      "employer": "string",
      "location": "string",
      "start_date": "string (e.g. 'May 2025')",
      "end_date": "string (e.g. 'Dec 2025' or 'Present')",
      "bullets": ["string (≤24 words)", ...]
    }
  ],
  "education": [
    {
      "qualification": "string",
      "institution": "string",
      "location": "string",
      "start_date": "string",
      "end_date": "string",
      "notes": "string (optional, e.g. 'Graduated with distinction – 81.7%')"
    }
  ],
  "technical_skills": ["string", ...]
}
```

### 3.2 Cover Letter JSON

```json
{
  "date": "string",
  "recipient": {
    "name": "string (optional)",
    "title": "string (optional)",
    "company": "string",
    "address": "string (optional)"
  },
  "subject": "string (e.g. 'Application for Teacher Aide role')",
  "salutation": "string (e.g. 'Dear Hiring Manager')",
  "paragraphs": ["string", ...],
  "closing": "string (e.g. 'Yours sincerely')",
  "signature_name": "string"
}
```

Total word count for the cover letter body: ≤ 360 words (from style config).

## 4. Constraints Enforced by Prompt

Prompts must instruct Claude to:

- Only use experiences, employers, dates, education, and certifications from the candidate profile.
- Match keywords from the job description naturally inside existing role bullets.
- Use Australian English spelling.
- Quantify achievements where the candidate profile supports it.
- Avoid clichés ("results-driven", "team player") unless essential.
- Limit each bullet to ≤ 24 words.
- For the recent role: up to 5 bullets. For older roles: up to 2 bullets.
- Key skills: maximum 12, plain text strings.
- Summary: 75–95 words.

## 5. Renderer Rules

The server-side renderer reads the active YAML style config and produces:

- **DOCX**: using a DOCX library (e.g. `docx` npm package).
- **PDF**: either via direct PDF library or DOCX → PDF conversion library.

Renderer rules:

- **Single column**, no tables, no text boxes, no images.
- Font: `font.family` from YAML (Arial).
- Margins: from YAML resume_margins_inches / cover_letter_margins_inches.
- Section headings: uppercase if `section_headings_uppercase: true`.
- Bullets: simple round bullets (`•`).
- Line spacing: from YAML.
- Page size: A4.
- Section order: from `resume_sections` in YAML.
- Skip empty sections (e.g. omit `EDUCATION SUPPORT READINESS` if not generated for non-education roles).

## 6. File Naming

Files saved to Google Drive with naming:

- Resume: `Resume_PriyadharshiniSelvam_{Employer}_{TitleSlug}_v{version}.pdf`
- Cover letter: `CoverLetter_PriyadharshiniSelvam_{Employer}_{TitleSlug}_v{version}.pdf`
- DOCX counterparts use `.docx`.

`TitleSlug`: lowercase, hyphenated, max 40 chars (e.g. `teacher-aide-primary`).

## 7. Regeneration

- User can regenerate a resume or cover letter at any time.
- Each regeneration creates a new `generated_documents` row with `version` incremented.
- Previous versions remain in Drive and in DB (for history).
- UI shows latest by default, with a "Show previous versions" toggle.

## 8. Quality Checks (Post-Render)

Before returning to user, the app checks:

- DOCX file is non-empty.
- PDF file is non-empty and parses.
- Word count of cover letter ≤ 360.
- Number of pages: resume should be 1–2 pages, cover letter 1 page.
- No forbidden elements in DOCX XML (no `<w:tbl>`, no `<w:pict>`, no `<w:drawing>`).

If a check fails, the generation is marked `error` and the user is notified with the reason.

## 9. Editing Generated Documents

- The structured JSON output is editable in the app before final render.
- User can tweak bullets, summary, etc., then click **Re-render** to produce a new PDF/DOCX without calling Claude again.

## 10. Prompt-Version and Style-Version Linkage

Every generated document records:
- `prompt_version_id` used.
- `style_version_id` used.

This allows tracing why a particular output looks the way it does.