import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/supabase/get-auth'
import { makeLogger } from '@/lib/logger'
import OpenAI from 'openai'

const DEFAULT_RANKING_PROMPT = `You are ranking job listings for Priyadharshini Selvam to identify the best opportunities in Melbourne, Australia.

CANDIDATE CONTEXT:
- Based in Melbourne, Australia. Full working rights (482 dependant visa).
- Recent Melbourne customer service and administration experience.
- Strong communication, customer handling, administration, documentation, Excel, reporting, and support skills.
- Some teaching/classroom exposure.
- NO Australian Certificate III, Certificate IV, Diploma, TAFE, Bachelor/Master of Teaching, VIT registration, or ACECQA qualification.

GOAL: Identify beginner-friendly school support and teacher aide roles she has a REALISTIC chance of landing WITHOUT prior Australian teacher aide experience.

RANKING PHILOSOPHY — DO NOT overfit against her exact profile.
Target roles: teacher aide, teaching assistant, education support, learning support, classroom support, integration aide, school support, school admin assistant, school receptionist, traineeships, GTO pathways.

DO NOT downgrade a job simply because:
- she has not previously worked as a teacher aide in Australia
- the role title is slightly different from her exact experience
- the job asks for "preferred" rather than mandatory experience

HARD REJECT (mark avoid, score 0-20) if job requires:
VIT registration, qualified/registered teacher, Bachelor of Education, mandatory Certificate III/IV already completed, mandatory Diploma, ACECQA, 5+ years experience, senior/manager/lead/head teacher roles.

STRONGLY PREFER (mark hot, score 80-100):
- GTO traineeships, school-based traineeships, earn-and-learn, training provided, no experience required
- Entry-level, junior, beginner-friendly, paid training pathways into schools

Certificate III rule: If Cert III is provided DURING a traineeship/GTO = Low risk, High priority. If Cert III must already be held = High risk.

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "priority": "hot|good|maybe|avoid",
  "score": 0-100,
  "beginner_friendly": "yes|no|unclear",
  "gto_traineeship": "yes|no|unclear",
  "training_offered": "yes|no|unclear",
  "cert3_pathway": "yes|no|unclear",
  "prior_school_required": "yes|no|unclear",
  "qualification_risk": "low|medium|high",
  "experience_risk": "low|medium|high",
  "recommended_action": "apply|review_carefully|skip",
  "resume_version": "school_support|admin_customer_service|reception|avoid",
  "cover_letter_needed": "yes|no",
  "reason": "1-2 sentence explanation of priority",
  "key_skills": "top 3 matching skills from this job",
  "red_flags": "any disqualifying requirements or concerns",
  "tailoring_notes": "specific tip for applying to this role",
  "ranking_comments": ["why score is high or low", "key factor", "any risk or boost"],
  "role_description": ["what the role involves day-to-day", "type of work/environment", "who they support or work with"]
}`

export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const log = makeLogger(supabase, 'rank-batch', user.id)

  const body = await request.json()
  const { job_ids, import_id, limit = 20, force = false } = body
  await log.info('rank-batch started', { job_ids, import_id, limit, force, user_id: user.id })

  // Fetch jobs to rank
  let query = supabase
    .from('jobs')
    .select('id, title, employer, location, work_type, salary_text, description_text, posted_at, status')
    .eq('user_id', user.id)
    .neq('status', 'skipped')
    .limit(limit)

  // Unless force=true, only fetch unranked jobs
  if (!force) {
    query = query.is('ai_ranked_at', null)
  }

  if (job_ids?.length) {
    query = query.in('id', job_ids)
  } else if (import_id) {
    query = query.eq('import_id', import_id)
  }

  const { data: jobs, error: fetchErr } = await query
  if (fetchErr) {
    await log.error('jobs fetch failed', { error: fetchErr.message, code: fetchErr.code })
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  await log.info('jobs fetched for ranking', { count: jobs?.length ?? 0, titles: jobs?.map(j => j.title) })

  if (!jobs?.length) {
    // Check total unranked to distinguish "already all ranked" from "query broken"
    const { count: totalUnranked } = await supabase
      .from('jobs').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).is('ai_ranked_at', null)
    await log.warn('no jobs returned by rank query', { totalUnrankedIgnoringStatusFilter: totalUnranked })
    return NextResponse.json({ ranked: 0, remaining: 0, message: 'No unranked jobs found' })
  }

  // Load active ranking prompt and candidate profile
  const [promptResult, profileResult] = await Promise.all([
    supabase.from('prompt_versions').select('content').eq('user_id', user.id).eq('prompt_type', 'ranking').eq('is_active', true).single(),
    supabase.from('candidate_profiles').select('profile_json').eq('user_id', user.id).single(),
  ])
  await log.info('prompt + profile loaded', {
    promptFound: !!promptResult.data,
    promptError: promptResult.error?.message,
    profileFound: !!profileResult.data,
    profileError: profileResult.error?.message,
  })

  const systemPrompt = promptResult.data?.content || DEFAULT_RANKING_PROMPT
  const profileJson = profileResult.data?.profile_json ? JSON.stringify(profileResult.data.profile_json, null, 2) : ''

  // Always append required JSON schema — ensures ranking_comments/role_description
  // are returned even if the active DB prompt doesn't define them
  const REQUIRED_JSON_SCHEMA = `

RESPOND WITH VALID JSON ONLY (no markdown). Include ALL of these fields:
{
  "priority": "hot|good|maybe|avoid",
  "score": 0-100,
  "beginner_friendly": "yes|no|unclear",
  "gto_traineeship": "yes|no|unclear",
  "training_offered": "yes|no|unclear",
  "cert3_pathway": "yes|no|unclear",
  "prior_school_required": "yes|no|unclear",
  "qualification_risk": "low|medium|high",
  "experience_risk": "low|medium|high",
  "recommended_action": "apply|review_carefully|skip",
  "resume_version": "school_support|admin_customer_service|reception|avoid",
  "cover_letter_needed": "yes|no",
  "reason": "1-2 sentence explanation of priority",
  "key_skills": "top 3 matching skills from this job",
  "red_flags": "any disqualifying requirements or concerns",
  "tailoring_notes": "specific tip for applying to this role",
  "ranking_comments": ["why score is high or low", "key factor", "any risk or boost"],
  "role_description": ["what the role involves day-to-day", "type of work/environment", "who they support or work with"]
}`

  const fullSystemPrompt = [
    systemPrompt,
    profileJson ? `\nCANDIDATE PROFILE (use for context, not strict requirements):\n${profileJson}` : '',
    REQUIRED_JSON_SCHEMA,
  ].filter(Boolean).join('\n')

  const openaiKey = process.env.OPENAI_API_KEY
  await log.info('openai config', { keyPresent: !!openaiKey, keyPrefix: openaiKey?.slice(0, 12) ?? 'MISSING', model: process.env.OPENAI_MODEL || 'gpt-4o-mini' })

  const openai = new OpenAI({ apiKey: openaiKey })

  let ranked = 0
  const errors: string[] = []

  for (const job of jobs) {
    try {
      const jobDesc = [
        `Title: ${job.title || 'Unknown'}`,
        `Employer: ${job.employer || 'Unknown'}`,
        `Location: ${job.location || 'Melbourne VIC'}`,
        `Work Type: ${job.work_type || 'Not specified'}`,
        `Salary: ${job.salary_text || 'Not specified'}`,
        `Posted: ${job.posted_at ? new Date(job.posted_at).toLocaleDateString() : 'Unknown'}`,
        `Description:\n${(job.description_text || '').slice(0, 3000)}`,
      ].join('\n')

      await log.info('calling openai for job', { jobId: job.id, title: job.title })

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: fullSystemPrompt },
          { role: 'user', content: `Rank this job for Priyadharshini and respond with valid JSON only:\n\n${jobDesc}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      })

      const rawResponse = completion.choices[0]?.message?.content || '{}'
      let ranking: Record<string, unknown>
      try { ranking = JSON.parse(rawResponse) } catch { ranking = {} }

      await log.info('openai response received', { jobId: job.id, priority: ranking.priority, score: ranking.score })

      const score = typeof ranking.score === 'number' ? ranking.score : parseInt(String(ranking.score)) || 0
      const priority = ['hot', 'good', 'maybe', 'avoid'].includes(String(ranking.priority))
        ? String(ranking.priority) : 'maybe'

      const { error: updateErr } = await supabase.from('jobs').update({
        ai_score: score,
        ai_priority: priority,
        ai_ranking: ranking,
        ai_ranked_at: new Date().toISOString(),
        status: job.status === 'imported' ? 'ranked' : job.status,
      }).eq('id', job.id)

      if (updateErr) {
        await log.error('supabase update failed', { jobId: job.id, error: updateErr.message })
        errors.push(`${job.title}: DB update failed — ${updateErr.message}`)
      } else {
        ranked++
        await log.info('job ranked and saved', { jobId: job.id, priority, score })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await log.error('job ranking threw', { jobId: job.id, title: job.title, error: msg })
      errors.push(`${job.title}: ${msg}`)
    }
  }

  // Count remaining unranked
  const { count: remaining } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('ai_ranked_at', null)
    .neq('status', 'skipped')

  await log.info('rank-batch complete', { ranked, errors: errors.length, remaining })

  return NextResponse.json({
    ranked,
    remaining: remaining || 0,
    errors: errors.length,
    error_details: errors,
    message: ranked > 0
      ? `Ranked ${ranked} jobs. ${remaining || 0} still unranked.`
      : errors.length > 0
        ? `0 ranked — errors: ${errors.slice(0, 2).join(' | ')}`
        : `No unranked jobs found.`,
  })
}
