import OpenAI from 'openai'
import type { ResumeData, CoverLetterData, CandidateContact } from '../render/types'

// ─── ATS Score ────────────────────────────────────────────────────────────────

export interface AtsResult {
  score: number
  matched_keywords: string[]
  missing_keywords: string[]
  verdict: string
}

const ATS_SCORE_PROMPT = `You are an ATS (Applicant Tracking System) scanner evaluating how well a resume matches a job description.

Score across five weighted dimensions (total 100 pts):
  Keywords      30 pts — required terms, phrases and role-specific language from the JD present in the resume
  Skills        25 pts — technical and soft skills the JD requires are demonstrated in the resume
  Experience    25 pts — depth and direct relevance of experience to this specific role
  Qualifications 10 pts — education, certifications and checks meet stated requirements
  Presentation  10 pts — action verbs used, achievements quantified, content clear and concise

Rules:
- Be strict. A score of 80+ means the resume is very well matched. 60-79 is reasonable. Below 60 needs work.
- matched_keywords: up to 6 important JD terms clearly present in the resume
- missing_keywords: up to 6 important JD terms absent from the resume that would improve ATS pass rate
- verdict: one sentence — state the score driver and the single most impactful improvement

Respond with valid JSON only:
{
  "score": <integer 0-100>,
  "matched_keywords": ["keyword1", "keyword2"],
  "missing_keywords": ["keyword1", "keyword2"],
  "verdict": "one sentence explanation"
}`

export async function calculateAtsScore(
  resumeData: ResumeData,
  jobTitle: string,
  jobDescription: string,
): Promise<AtsResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // Flatten resume to plain text for scoring
  const resumeText = [
    `SUMMARY: ${resumeData.summary}`,
    `KEY SKILLS: ${resumeData.key_skills.join(', ')}`,
    `TECHNICAL SKILLS: ${resumeData.technical_skills.join(', ')}`,
    `CERTIFICATIONS: ${resumeData.certifications}`,
    ...resumeData.experience.map(e =>
      `ROLE: ${e.role} at ${e.company} (${e.period})\n${e.bullets.map(b => `- ${b}`).join('\n')}`
    ),
    ...resumeData.education.map(e =>
      `EDUCATION: ${e.degree}, ${e.institution}`
    ),
    `ADDITIONAL: ${resumeData.additional_info.join(' | ')}`,
  ].join('\n\n')

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: ATS_SCORE_PROMPT },
      { role: 'user', content: `JOB TITLE: ${jobTitle}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 3000)}\n\nRESUME:\n${resumeText}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  })

  const raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
  return {
    score:            Math.min(100, Math.max(0, Math.round(Number(raw.score) || 0))),
    matched_keywords: Array.isArray(raw.matched_keywords) ? raw.matched_keywords.map(String) : [],
    missing_keywords: Array.isArray(raw.missing_keywords) ? raw.missing_keywords.map(String) : [],
    verdict:          String(raw.verdict ?? ''),
  }
}

const RESUME_SYSTEM_PROMPT = `You are generating a tailored ATS-friendly resume for a job application.

CRITICAL — EXPERIENCE COMPLETENESS (most common failure):
- Count the number of roles in the profile's "experience" array BEFORE writing anything
- The output "experience" array MUST include EVERY one of those paid roles — never drop, skip, merge, or SUBSTITUTE one role for another
- If the profile has a "volunteering" array, ADD those entries to the experience array as well (they are extra — they never replace a paid role)
- Tailor by adjusting BULLET COUNT and FOCUS, never by removing roles

CRITICAL — ORDERING (do not get this wrong):
- List experience in STRICT reverse-chronological order: most recent end date first, oldest last
- A current role ("Present") is the most recent. Order purely by date — NEVER reorder by relevance
- "Lead with" / "emphasise" guidance means give a role MORE bullets and stronger wording — it does NOT mean moving it out of date order
- Volunteering entries are placed by their own dates, interleaved with paid roles

CRITICAL — PRESERVE METRICS AND ACHIEVEMENTS:
- Carry every concrete number, metric, and named achievement from the profile into the tailored bullets, verbatim where truthful
- Examples: "~50 calls per day", "500+ customers", "2,000+ orders", "Best Performer recognition (Feb 2025)", percentages, KPIs, award names
- NEVER generalise a specific figure into vague language (do not turn "50 calls per day" into "high volume", or drop an award)
- Quantified bullets outperform generic ones for both ATS and human reviewers

KEYWORD INJECTION FOR ATS (critical — do this for every resume):
- Read the job description and extract important keywords, role-specific phrases, and required skills
- Weave these exact keywords into bullet points and summary wherever TRUTHFULLY applicable
- Use the employer's vocabulary: if the job says "student wellbeing", use that exact phrase where the work involved welfare; if it says "inclusive learning", use that phrasing
- Add job-specific keywords to key_skills only if the candidate genuinely has that skill
- Goal: same true facts, expressed using the employer's language — maximise ATS keyword density without fabricating
- Do NOT force keywords where they don't fit — natural placement only

BULLET COUNT GUIDE per role:
- Primary relevant role (most directly matches the job): 5 bullets
- Secondary relevant roles (transferable skills): 3–4 bullets
- Older or less relevant roles: 2–3 bullets — keep factual, highlight transferable aspects only

STRICT RULES:
1. NEVER invent new jobs, qualifications, degrees, or skills not in the profile
2. Rewrite bullets to highlight what is most relevant to this specific job — same facts, different emphasis
3. Summary: 3–4 sentences — candidate type, most relevant experience, key transferable strengths, availability/eligibility
4. Bullet points: start with action verb, concise, no "Bullet:" prefix, no invented content
5. key_skills: up to 12 most relevant from the profile
6. technical_skills: include ALL from the profile
7. education: include ALL degrees exactly as provided
8. additional_info: include only items directly relevant to this job (rights, availability, willingness)

Respond with valid JSON only — no markdown, no explanation.`

const COVER_LETTER_SYSTEM_PROMPT = `You are writing a professional first-person cover letter for a job application.

STRICT RULES:
1. Write in first person ("I") throughout — never refer to the candidate as "she" or in third person
2. Only reference real experience from the provided profile — never invent
3. Exactly 4 body paragraphs:
   - Paragraph 1 (2-3 sentences): State the specific role being applied for and why genuinely interested
   - Paragraph 2 (4-5 sentences): Most relevant current/recent experience — specific examples matching the job
   - Paragraph 3 (4-5 sentences): Additional transferable skills or experience that strengthen the application
   - Paragraph 4 (3-4 sentences): Availability, work rights, enthusiasm, specific call to action
4. Professional but warm and genuine tone — not generic, not formulaic
5. Never mention qualifications or certifications the candidate does not hold
6. Each paragraph must add distinct value — no repetition between paragraphs

Respond with valid JSON only — no markdown, no explanation.`

export interface FullJobData {
  title: string
  employer: string
  location: string
  description_text: string
  description_html?: string
  salary_text?: string
  work_type?: string
  raw_payload?: Record<string, unknown>
}

function buildJobContext(job: FullJobData): string {
  const rp = job.raw_payload ?? {}
  const rpContent = rp.content as Record<string, unknown> | undefined
  const parts = [
    `Title: ${job.title}`,
    `Employer: ${job.employer}`,
    `Location: ${job.location}`,
    `Work Type: ${rp.workTypes as string || job.work_type || 'Not specified'}`,
    `Work Arrangement: ${rp.workArrangements as string || 'Not specified'}`,
    `Salary: ${rp.salary as string || job.salary_text || 'Not specified'}`,
    rp.classificationInfo ? `Classification: ${(rp.classificationInfo as Record<string,string>).classification} / ${(rp.classificationInfo as Record<string,string>).subClassification}` : '',
    rpContent?.jobHook ? `Job Hook: "${rpContent.jobHook}"` : '',
    rpContent?.bulletPoints && Array.isArray(rpContent.bulletPoints) && rpContent.bulletPoints.length
      ? `Key Points:\n${(rpContent.bulletPoints as string[]).map((b: string) => `• ${b}`).join('\n')}` : '',
    rp.employerQuestions && Array.isArray(rp.employerQuestions) && (rp.employerQuestions as string[]).length
      ? `Employer Questions:\n${(rp.employerQuestions as string[]).map((q: string) => `• ${q}`).join('\n')}` : '',
    job.description_text ? `Full Description:\n${job.description_text}` : '',
  ].filter(Boolean)
  return parts.join('\n')
}

// Parse a "period" string into a comparable number (year*12 + monthIndex).
// "Present"/"Current"/"Now" → a sentinel far in the future so current roles sort first.
const MONTHS: Record<string, number> = {
  jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11,
}
function periodPointToValue(s: string): number {
  const t = s.trim().toLowerCase()
  if (/present|current|now|ongoing/.test(t)) return Number.MAX_SAFE_INTEGER
  const year = t.match(/\b(19|20)\d{2}\b/)?.[0]
  if (!year) return 0
  const mon = Object.keys(MONTHS).find(m => t.includes(m))
  return Number(year) * 12 + (mon ? MONTHS[mon] : 0)
}
function splitPeriod(period: string): { start: number; end: number } {
  // Separator is typically " - " (also handle en/em dashes). Last segment = end.
  const parts = period.split(/[-–—]/).map(p => p.trim()).filter(Boolean)
  if (parts.length === 0) return { start: 0, end: 0 }
  const start = periodPointToValue(parts[0])
  const end   = periodPointToValue(parts[parts.length - 1])
  return { start, end }
}
/** Sort experience entries newest-first by end date, tie-broken by start date. Stable for equal dates. */
function sortExperienceReverseChrono<T extends { period: string }>(entries: T[]): T[] {
  return entries
    .map((e, i) => ({ e, i, ...splitPeriod(e.period) }))
    .sort((a, b) => (b.end - a.end) || (b.start - a.start) || (a.i - b.i))
    .map(x => x.e)
}

export async function generateResumeData(
  profile: Record<string, unknown>,
  job: FullJobData,
  customPrompt?: string,
  framingNote?: string,
): Promise<ResumeData> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const contact = (profile.contact ?? {}) as Record<string, string>
  // Only include LinkedIn if it looks like a real URL/profile (not placeholder text)
  const rawLinkedin = contact.linkedin ?? ''
  const candidate: CandidateContact = {
    name:     contact.name     ?? 'Priyadharshini Selvam',
    location: contact.location ?? '',
    phone:    contact.phone    ?? '',
    email:    contact.email    ?? '',
    linkedin: (rawLinkedin.includes('linkedin') || rawLinkedin.startsWith('http')) ? rawLinkedin : undefined,
  }

  const experienceCount = Array.isArray(profile.experience) ? (profile.experience as unknown[]).length : '?'

  const schema = `{
  "summary": "3-4 sentence tailored summary. Sentence 1: describe the candidate by their CURRENT background/experience (NOT the role they are applying for). Sentence 2: most relevant current or recent role. Sentence 3: strongest transferable skills for this job. Sentence 4: eligibility/availability/commitment.",
  "key_skills": ["up to 12 most relevant skills from profile"],
  "experience": [
    /* MUST include all ${experienceCount} paid roles from profile.experience (never drop or substitute),
       PLUS any entries from profile.volunteering. Order STRICTLY reverse-chronological by date — newest first. */
    {
      "role": "exact role title from profile",
      "company": "exact company (or organisation, for volunteering) from profile",
      "period": "Month Year - Month Year",
      "location": "City, Country",
      "bullets": ["2-5 action verb bullets — count based on relevance; keep concrete numbers/metrics verbatim"]
    }
  ],
  "education": [
    /* Include ALL degrees from profile */
    {
      "degree": "full degree name",
      "institution": "institution name",
      "location": "City, Country",
      "period": "Month Year - Month Year",
      "achievement": "optional achievement line"
    }
  ],
  "certifications": "certifications and checks text",
  "technical_skills": ["ALL technical skills from profile"],
  "additional_info": ["only items relevant to this specific job"]
}`

  const userMsg = `JOB DETAILS:
${buildJobContext(job)}

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

Generate a tailored resume matching this exact JSON schema:
${schema}

Return valid JSON only.`

  const basePrompt = customPrompt ?? RESUME_SYSTEM_PROMPT
  const systemPrompt = framingNote
    ? `${basePrompt}\n\nROLE-SPECIFIC FRAMING FOR THIS JOB:\n${framingNote}`
    : basePrompt

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMsg },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}')

  const mappedExperience = (raw.experience ?? []).map((e: Record<string, unknown>) => ({
    role:     String(e.role ?? ''),
    company:  String(e.company ?? ''),
    period:   String(e.period ?? ''),
    location: String(e.location ?? ''),
    // Strip any leading "- " or "• " the AI may have added (renderer adds its own prefix)
    bullets:  Array.isArray(e.bullets)
      ? e.bullets.map(b => String(b).replace(/^[-•]\s+/, '').trim())
      : [],
  }))

  return {
    candidate,
    summary:          raw.summary ?? '',
    key_skills:       raw.key_skills ?? [],
    // Enforce reverse-chronological order in code — the model is not reliable at this.
    experience:       sortExperienceReverseChrono(mappedExperience),
    education:        (raw.education ?? []).map((e: Record<string, unknown>) => ({
      degree:      String(e.degree ?? ''),
      institution: String(e.institution ?? ''),
      location:    String(e.location ?? ''),
      period:      String(e.period ?? ''),
      achievement: e.achievement ? String(e.achievement) : undefined,
    })),
    certifications:   raw.certifications ?? '',
    technical_skills: raw.technical_skills ?? [],
    additional_info:  raw.additional_info ?? [],
  }
}

export async function generateCoverLetterData(
  profile: Record<string, unknown>,
  job: FullJobData,
  customPrompt?: string,
  framingNote?: string,
): Promise<CoverLetterData> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const contact = (profile.contact ?? {}) as Record<string, string>
  const rawLinkedin2 = contact.linkedin ?? ''
  const candidate: CandidateContact = {
    name:     contact.name     ?? 'Priyadharshini Selvam',
    location: contact.location ?? '',
    phone:    contact.phone    ?? '',
    email:    contact.email    ?? '',
    linkedin: (rawLinkedin2.includes('linkedin') || rawLinkedin2.startsWith('http')) ? rawLinkedin2 : undefined,
  }

  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  const schema = `{
  "recipient_name": "Recruitment Team or specific name if mentioned in job",
  "company": "company/organisation name",
  "address": "City, State",
  "salutation": "Dear Recruitment Team,",
  "paragraphs": ["paragraph 1 — role + genuine interest", "paragraph 2 — most relevant experience with specifics", "paragraph 3 — additional transferable skills", "paragraph 4 — availability, rights, call to action"],
  "closing": "Kind regards,"
}`

  const userMsg = `JOB DETAILS:
${buildJobContext(job)}

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

Today's date: ${today}

Generate a tailored cover letter matching this exact JSON schema:
${schema}

Return valid JSON only.`

  const basePrompt2 = customPrompt ?? COVER_LETTER_SYSTEM_PROMPT
  const systemPrompt2 = framingNote
    ? `${basePrompt2}\n\nROLE-SPECIFIC FRAMING FOR THIS JOB:\n${framingNote}`
    : basePrompt2

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt2 },
      { role: 'user', content: userMsg },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  })

  const raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
  const today2 = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  return {
    candidate,
    date:           today2,
    recipient_name: raw.recipient_name ?? 'Recruitment Team',
    company:        raw.company ?? job.employer,
    address:        raw.address ?? job.location,
    salutation:     raw.salutation ?? `Dear Recruitment Team,`,
    paragraphs:     Array.isArray(raw.paragraphs) ? raw.paragraphs.map(String) : [],
    closing:        raw.closing ?? 'Kind regards,',
  }
}

// ── Meta-prompt: generates resume + cover letter framing for a specific job ──

const META_DOCUMENT_FRAMING_PROMPT = `You are a resume strategist. Given a candidate profile and a specific job description, write brief role-specific framing instructions that will guide an AI to write a highly targeted resume and cover letter.

Rules:
- Be specific to THIS job category — admin, childcare, retail, healthcare, etc.
- Identify which parts of the candidate's background to lead with for THIS role
- Note any vocabulary, terminology, or framing that matches the employer's language
- Keep each framing note concise (3-5 bullet points max)
- Do NOT invent new experience — only guide framing of existing experience

Return valid JSON only:
{
  "resume_framing": "3-5 bullet points as a single string. Which experience to emphasise, which skills to lead with, what keywords to weave in for THIS specific role.",
  "cover_framing": "3-5 bullet points as a single string. What narrative angle to take, which experience to highlight in each paragraph, tone guidance for THIS specific employer/role."
}`

/**
 * Generates job-specific framing notes for resume and cover letter.
 * Called once per document generation; notes are appended to base prompts.
 * Adds ~1 second but makes every document genuinely role-aware.
 */
export async function generateDocumentFraming(
  profile: Record<string, unknown>,
  job: FullJobData,
): Promise<{ resumeFraming: string; coverFraming: string }> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const exp       = Array.isArray(profile.experience) ? profile.experience as Record<string, unknown>[] : []
  const keySkills = Array.isArray(profile.key_skills) ? profile.key_skills as string[] : []
  const certs     = String(profile.certifications ?? '')

  const profileSummary = [
    `Recent roles: ${exp.slice(0, 3).map(e => `${e.role} at ${e.company}`).join(', ')}`,
    `Key skills: ${keySkills.slice(0, 10).join(', ')}`,
    `Certifications: ${certs || 'none'}`,
  ].join('\n')

  const userMsg = `JOB:
${buildJobContext(job)}

CANDIDATE SUMMARY:
${profileSummary}

Write framing instructions for tailoring resume and cover letter to this specific role.`

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [
        { role: 'system', content: META_DOCUMENT_FRAMING_PROMPT },
        { role: 'user', content: userMsg },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    return {
      resumeFraming: String(raw.resume_framing ?? ''),
      coverFraming:  String(raw.cover_framing  ?? ''),
    }
  } catch {
    // Non-fatal — fall back to empty framing (base prompts still work)
    return { resumeFraming: '', coverFraming: '' }
  }
}

// ── Scoring prompt: deterministic, correct JSON schema guaranteed ────────────
// Exported so jobfit/route.ts can use it directly without an extra AI call.

export function buildJobfitScoringPrompt(
  profile: Record<string, unknown>,
  categoryName: string,
  categoryKeywords: string[],
): string {
  const contact   = (profile.contact ?? {}) as Record<string, string>
  const exp       = Array.isArray(profile.experience)      ? profile.experience      as Record<string, unknown>[] : []
  const keySkills = Array.isArray(profile.key_skills)      ? profile.key_skills      as string[] : []
  const certs     = String(profile.certifications ?? '')
  const addInfo   = Array.isArray(profile.additional_info) ? profile.additional_info as string[] : []

  const careerHistory = exp.map(e => `${e.role} at ${e.company}`).join(' → ')
  const recentRole    = exp[0] ? `${exp[0].role} at ${exp[0].company}` : 'see profile'
  const skills        = keySkills.slice(0, 10).join(', ')
  const rights        = addInfo.join(' | ') || 'see profile'

  return `You are scoring job listings to determine APPLICATION WORTHINESS for ${contact.name || 'this candidate'}.

CRITICAL: Score "Should this person apply?" — NOT "Does her resume perfectly match?"
This candidate is deliberately targeting entry-level roles as a career transitioner.
A zero-experience job that suits her transferable skills should score 90+.
A perfect-match role that requires a mandatory qualification she lacks should score ≤25.

CANDIDATE CONTEXT:
- Name: ${contact.name || 'Candidate'}
- Career path: ${careerHistory || recentRole}
- Most recent role: ${recentRole}
- Target category: "${categoryName}" (${categoryKeywords.join(', ')})
- Transferable strengths: ${skills || 'see profile'}
- Certifications: ${certs || 'none listed'}
- Rights / availability: ${rights}

SCORING BANDS:
90-100 → HOT   Entry-level / no experience required; duties suit transferable skills
70-89  → GOOD  Experience preferred not mandatory; strong transferable case
50-69  → MAYBE Stretch — transferable case exists but is a reach
30-49  → MAYBE Significant prior experience expected; unclear if open to career changers
0-29   → AVOID Hard disqualifier present

QUALIFICATION RULE (THE most common scoring mistake — read carefully):
The candidate does NOT hold, and is NOT currently enrolled in, any Cert III, Cert IV, Diploma,
ACECQA-approved, VIT, or teaching qualification. She is willing to study toward one ONLY IF an
employer enrols and funds it through a traineeship.
• If the role requires the applicant to ALREADY HOLD — or to ALREADY BE "working towards" /
  "enrolled in" / "studying" — a Cert III, Cert IV, Diploma, or ACECQA-approved qualification,
  this is a HARD DISQUALIFIER. Set qualification_risk="high", recommended_action="skip",
  priority="avoid", score ≤ 30. This holds EVEN IF the ad also says "no experience required"
  or "full training provided".
• EXCEPTION — genuine traineeship/GTO: ONLY if the employer EXPLICITLY promises to enrol you in
  and fund/support the formal qualification as part of the job (e.g. "earn while you learn",
  "complete your Cert III while working", "we sponsor your qualification", "traineeship"), it is
  NOT a disqualifier — treat it as a strong green flag (qualification_risk="low", score 85–100).
• Do NOT confuse generic "full training provided" / "on-the-job training" (operational induction)
  with formal qualification sponsorship. Only an explicit promise to enrol/fund the
  Cert III/Diploma qualifies for the exception.

OTHER HARD DISQUALIFIERS → score ≤ 25, priority = avoid:
• Mandatory professional registration or licence candidate does not hold (e.g. VIT, nursing reg)
• "Must have N+ years experience" where candidate has none in that field
• Senior / manager / lead roles requiring team management experience

GREEN FLAGS that boost score:
• "No experience required" / "no qualification required" / "we will train you"
• Genuine traineeship/GTO that enrols & funds the formal qualification
• Entry-level / junior / casual / trainee / assistant
• Duties match transferable skills from career history

Respond with valid JSON only — no markdown:
{
  "priority": "hot|good|maybe|avoid",
  "score": <0-100>,
  "beginner_friendly": "yes|no|unclear",
  "training_offered": "yes|no|unclear",
  "qualification_risk": "low|medium|high",
  "experience_risk": "low|medium|high",
  "recommended_action": "apply|review_carefully|skip",
  "reason": "1-2 sentence explanation focused on entry accessibility",
  "key_skills": "top 3 transferable skills matching this job",
  "red_flags": "specific disqualifying requirements found, or none",
  "tailoring_notes": "one concrete tip for the application",
  "ranking_comments": ["entry accessibility assessment", "strongest matching factor", "main risk"],
  "role_description": ["what this role involves day-to-day", "who they work with", "environment and setting"]
}`
}
