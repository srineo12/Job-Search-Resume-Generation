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
- Count the number of experience roles in the candidate profile BEFORE writing anything
- Your output MUST contain EXACTLY that many entries in the "experience" array — no more, no fewer
- NEVER drop, skip, or merge roles — even if they seem unrelated to the job
- Tailor by adjusting BULLET COUNT and FOCUS, not by removing roles

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

const COVER_LETTER_SYSTEM_PROMPT = `You are writing a professional cover letter for a job application.

STRICT RULES:
1. Only reference real experience from the provided profile
2. 3-4 body paragraphs only
3. First paragraph: state the role and why she's applying
4. Middle paragraphs: connect specific experience to this job's requirements
5. Final paragraph: availability, rights, enthusiasm, call to action
6. Professional but warm, genuine tone — not generic
7. Never mention qualifications she doesn't have
8. Keep each paragraph to 4-6 sentences max

Respond with valid JSON only — no markdown, no explanation.`

export async function generateResumeData(
  profile: Record<string, unknown>,
  job: { title: string; employer: string; location: string; description_text: string },
  customPrompt?: string,
): Promise<ResumeData> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const contact = (profile.contact ?? {}) as Record<string, string>
  const candidate: CandidateContact = {
    name:     contact.name     ?? 'Priyadharshini Selvam',
    location: contact.location ?? '',
    phone:    contact.phone    ?? '',
    email:    contact.email    ?? '',
    linkedin: contact.linkedin,
  }

  const experienceCount = Array.isArray(profile.experience) ? (profile.experience as unknown[]).length : '?'

  const schema = `{
  "summary": "3-4 sentence tailored summary. Sentence 1: candidate type + breadth of experience. Sentence 2: most relevant current role. Sentence 3: strongest transferable skills. Sentence 4: eligibility/availability/commitment.",
  "key_skills": ["up to 12 most relevant skills from profile"],
  "experience": [
    /* MUST contain exactly ${experienceCount} entries — one per role in the profile. Do NOT drop any. */
    {
      "role": "exact role title from profile",
      "company": "exact company from profile",
      "period": "Month Year - Month Year",
      "location": "City, Country",
      "bullets": ["2-5 action verb bullets — count based on relevance to this job"]
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
Title: ${job.title}
Employer: ${job.employer}
Location: ${job.location}
Description:
${(job.description_text ?? '').slice(0, 3000)}

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

Generate a tailored resume matching this exact JSON schema:
${schema}

Return valid JSON only.`

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: customPrompt ?? RESUME_SYSTEM_PROMPT },
      { role: 'user', content: userMsg },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}')

  return {
    candidate,
    summary:          raw.summary ?? '',
    key_skills:       raw.key_skills ?? [],
    experience:       (raw.experience ?? []).map((e: Record<string, unknown>) => ({
      role:     String(e.role ?? ''),
      company:  String(e.company ?? ''),
      period:   String(e.period ?? ''),
      location: String(e.location ?? ''),
      bullets:  Array.isArray(e.bullets) ? e.bullets.map(String) : [],
    })),
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
  job: { title: string; employer: string; location: string; description_text: string },
  customPrompt?: string,
): Promise<CoverLetterData> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const contact = (profile.contact ?? {}) as Record<string, string>
  const candidate: CandidateContact = {
    name:     contact.name     ?? 'Priyadharshini Selvam',
    location: contact.location ?? '',
    phone:    contact.phone    ?? '',
    email:    contact.email    ?? '',
    linkedin: contact.linkedin,
  }

  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  const schema = `{
  "recipient_name": "Recruitment Team or specific name if mentioned in job",
  "company": "company/organisation name",
  "address": "City, State",
  "salutation": "Dear Recruitment Team,",
  "paragraphs": ["paragraph 1 text", "paragraph 2 text", "paragraph 3 text"],
  "closing": "Kind regards,"
}`

  const userMsg = `JOB DETAILS:
Title: ${job.title}
Employer: ${job.employer}
Location: ${job.location}
Description:
${(job.description_text ?? '').slice(0, 3000)}

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

Today's date: ${today}

Generate a tailored cover letter matching this exact JSON schema:
${schema}

Return valid JSON only.`

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: customPrompt ?? COVER_LETTER_SYSTEM_PROMPT },
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
