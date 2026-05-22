import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
  "tailoring_notes": "specific tip for applying to this role"
}`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { job_ids, import_id, limit = 20 } = body

  // Fetch jobs to rank
  let query = supabase
    .from('jobs')
    .select('id, title, employer, location, work_type, salary_text, description_text, posted_at, status')
    .eq('user_id', user.id)
    .is('ai_ranked_at', null)
    .neq('status', 'skipped')
    .limit(limit)

  if (job_ids?.length) {
    query = query.in('id', job_ids)
  } else if (import_id) {
    query = query.eq('import_id', import_id)
  }

  const { data: jobs, error: fetchErr } = await query
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!jobs?.length) return NextResponse.json({ ranked: 0, remaining: 0, message: 'No unranked jobs found' })

  // Load active ranking prompt and candidate profile
  const [promptResult, profileResult] = await Promise.all([
    supabase.from('prompt_versions').select('content').eq('user_id', user.id).eq('prompt_type', 'ranking').eq('is_active', true).single(),
    supabase.from('candidate_profiles').select('profile_json').eq('user_id', user.id).single(),
  ])

  const systemPrompt = promptResult.data?.content || DEFAULT_RANKING_PROMPT
  const profileJson = profileResult.data?.profile_json ? JSON.stringify(profileResult.data.profile_json, null, 2) : ''

  const fullSystemPrompt = profileJson
    ? `${systemPrompt}\n\nCANDIDATE PROFILE (use this for context, not as strict requirements):\n${profileJson}`
    : systemPrompt

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: fullSystemPrompt },
          { role: 'user', content: `Rank this job for Priyadharshini:\n\n${jobDesc}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      })

      const rawResponse = completion.choices[0]?.message?.content || '{}'
      let ranking: Record<string, unknown>
      try { ranking = JSON.parse(rawResponse) } catch { ranking = {} }

      const score = typeof ranking.score === 'number' ? ranking.score : parseInt(String(ranking.score)) || 0
      const priority = ['hot', 'good', 'maybe', 'avoid'].includes(String(ranking.priority))
        ? String(ranking.priority) : 'maybe'

      await supabase.from('jobs').update({
        ai_score: score,
        ai_priority: priority,
        ai_ranking: ranking,
        ai_ranked_at: new Date().toISOString(),
        status: job.status === 'imported' ? 'ranked' : job.status,
      }).eq('id', job.id)

      ranked++
    } catch (err) {
      console.error(`Error ranking job ${job.id}:`, err)
      errors.push(String(err))
    }
  }

  // Count remaining unranked
  const { count: remaining } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('ai_ranked_at', null)
    .neq('status', 'skipped')

  return NextResponse.json({
    ranked,
    remaining: remaining || 0,
    errors: errors.length,
    message: `Ranked ${ranked} jobs. ${remaining || 0} still unranked.`,
  })
}
