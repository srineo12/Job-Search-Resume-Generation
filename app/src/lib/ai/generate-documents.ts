import OpenAI from 'openai'
import type { ResumeData, CoverLetterData, CandidateContact } from '../render/types'

const RESUME_SYSTEM_PROMPT = `You are generating a tailored ATS-friendly resume for a job application.

STRICT RULES:
1. NEVER invent new jobs, qualifications, degrees, or skills not in the profile
2. You MAY reorder or rewrite bullet points to highlight relevance — using the same facts
3. You MAY select which key_skills to include (choose most relevant, max 12)
4. The summary MUST be tailored specifically to this job
5. Keep bullet points concise action-verb statements (start with verb, no "Bullet:" prefix)
6. Include ALL experience roles from the profile (do not omit any)
7. Keep all education entries exactly as provided
8. additional_info should only include items relevant to this specific job

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

  const schema = `{
  "summary": "3-4 sentence tailored summary. Sentence 1: candidate type + breadth of experience. Sentence 2: most relevant current role. Sentence 3: strongest transferable skills. Sentence 4: eligibility/availability/commitment.",
  "key_skills": ["skill 1", "skill 2", "...up to 12 most relevant skills from profile"],
  "experience": [
    {
      "role": "exact role title from profile",
      "company": "exact company from profile",
      "period": "Month Year - Month Year",
      "location": "City, Country",
      "bullets": ["3-5 action verb bullets per role, tailored to relevance for this job"]
    }
  ],
  "education": [
    {
      "degree": "full degree name",
      "institution": "institution name",
      "location": "City, Country",
      "period": "Month Year - Month Year",
      "achievement": "optional achievement line"
    }
  ],
  "certifications": "certifications and checks text",
  "technical_skills": ["all relevant technical skills from profile"],
  "additional_info": ["relevant availability/eligibility/willingness points for this specific job"]
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
