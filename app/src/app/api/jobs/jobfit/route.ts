export const runtime = 'nodejs'
export const maxDuration = 60 // ignored on Vercel Hobby (10s cap), respected on Pro/Enterprise

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/supabase/get-auth'
import { buildJobfitScoringPrompt } from '@/lib/ai/generate-documents'
import OpenAI from 'openai'

/** Strip markdown code fences so JSON.parse never fails on ```json blocks */
function extractJson(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
}

/**
 * POST /api/jobs/jobfit
 *
 * Scores jobs based on "application worthiness" — not profile-to-job match.
 * Called in a loop from the client until remaining === 0.
 *
 * Body: { keyword_set_id: string, job_ids?: string[], limit?: number }
 *
 * Jobs are scored IN PARALLEL (Promise.allSettled) so the route completes
 * in ~4-6s regardless of batch size, staying within Vercel's 10s limit.
 * Individual job failures never abort the batch — partial success is returned.
 */
export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  // Default limit = 3: safe for parallel execution within Vercel's 10s function timeout.
  const { keyword_set_id, job_ids, limit = 3 } = body

  if (!keyword_set_id)
    return NextResponse.json({ error: 'keyword_set_id is required' }, { status: 400 })

  // ── 1. Load keyword set — use select('*') to avoid column-not-found errors ──
  const { data: kwSet, error: kwErr } = await supabase
    .from('keyword_sets')
    .select('*')
    .eq('id', keyword_set_id)
    .eq('user_id', user.id)
    .single()

  if (kwErr) {
    console.error('keyword_sets query error:', kwErr.message)
    return NextResponse.json({ error: `Keyword set lookup failed: ${kwErr.message}` }, { status: 500 })
  }
  if (!kwSet)
    return NextResponse.json({ error: 'Keyword set not found' }, { status: 404 })

  // ── 2. Load candidate profile ──
  const { data: profileRow } = await supabase
    .from('candidate_profile')
    .select('profile_json')
    .eq('user_id', user.id)
    .single()

  if (!profileRow?.profile_json)
    return NextResponse.json({ error: 'Candidate profile not found. Go to Settings → Profile.' }, { status: 400 })

  const profile = profileRow.profile_json as Record<string, unknown>

  // ── 3. Build scoring prompt ──
  // Use the user-edited prompt from DB if available; otherwise build it deterministically.
  const categoryKeywords = Array.isArray(kwSet.keywords) ? kwSet.keywords as string[] : []
  const scoringPrompt = kwSet.jobfit_prompt
    ? String(kwSet.jobfit_prompt)
    : buildJobfitScoringPrompt(profile, kwSet.name, categoryKeywords)

  // If we just computed it (no saved version), persist it so the user can see/edit it.
  if (!kwSet.jobfit_prompt) {
    const { error: promptSaveErr } = await supabase
      .from('keyword_sets')
      .update({ jobfit_prompt: scoringPrompt })
      .eq('id', keyword_set_id)
      .eq('user_id', user.id)
    if (promptSaveErr) console.warn('jobfit_prompt save skipped:', promptSaveErr.message)
  }

  // ── 4. Find imports that used this keyword set ──
  const { data: matchingImports } = await supabase
    .from('imports')
    .select('id')
    .eq('user_id', user.id)
    .contains('keyword_set_ids', [keyword_set_id])

  const importIds = (matchingImports ?? []).map(i => i.id as string)

  // ── 5. Load jobs to score ──
  let query = supabase
    .from('jobs')
    .select('id, title, employer, location, work_type, salary_text, description_text, raw_payload, posted_at, status')
    .eq('user_id', user.id)
    .neq('status', 'skipped')
    .limit(limit)

  if (job_ids?.length) {
    query = query.in('id', job_ids)
  } else {
    query = query.is('ai_ranked_at', null)
    if (importIds.length > 0) query = query.in('import_id', importIds)
  }

  const { data: jobs, error: fetchErr } = await query
  if (fetchErr)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  if (!jobs?.length) {
    let remQuery = supabase
      .from('jobs').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).is('ai_ranked_at', null).neq('status', 'skipped')
    if (importIds.length > 0) remQuery = remQuery.in('import_id', importIds)
    const { count: remaining } = await remQuery
    return NextResponse.json({ scored: 0, remaining: remaining ?? 0, message: 'No unscored jobs found for this category' })
  }

  // ── 6. Score all jobs in parallel (Promise.allSettled) ──
  // Each job gets its own OpenAI call. Failures are isolated — one bad job
  // never aborts the rest. Timeout is 8s per call to fit within Vercel Hobby's
  // 10s function limit even when running in parallel.
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 8000, // 8s per call — safe for parallel execution within Vercel Hobby 10s limit
  })

  function buildJobDesc(job: Record<string, unknown>): string {
    const rp = (job.raw_payload ?? {}) as Record<string, unknown>
    const rpContent = rp.content as Record<string, unknown> | undefined
    return [
      `Title: ${job.title || 'Unknown'}`,
      `Employer: ${job.employer || 'Unknown'}`,
      `Location: ${job.location || 'Melbourne VIC'}`,
      `Work Type: ${rp.workTypes as string || job.work_type || 'Not specified'}`,
      `Work Arrangement: ${rp.workArrangements as string || 'Not specified'}`,
      `Salary: ${rp.salary as string || job.salary_text || 'Not specified'}`,
      rp.numApplicants != null ? `Applicants: ${rp.numApplicants}` : '',
      rp.classificationInfo
        ? `Classification: ${(rp.classificationInfo as Record<string,string>).classification} / ${(rp.classificationInfo as Record<string,string>).subClassification}`
        : '',
      rpContent?.jobHook ? `Job Hook: "${rpContent.jobHook}"` : '',
      rpContent?.bulletPoints && Array.isArray(rpContent.bulletPoints) && rpContent.bulletPoints.length
        ? `Key Points:\n${(rpContent.bulletPoints as string[]).map((b: string) => `• ${b}`).join('\n')}` : '',
      rp.employerQuestions && Array.isArray(rp.employerQuestions) && (rp.employerQuestions as string[]).length
        ? `Employer Questions:\n${(rp.employerQuestions as string[]).map((q: string) => `• ${q}`).join('\n')}` : '',
      job.description_text ? `Full Description:\n${job.description_text}` : '',
    ].filter(Boolean).join('\n')
  }

  async function scoreOneJob(job: Record<string, unknown>): Promise<{ scored: boolean; error?: string }> {
    const jobDesc = buildJobDesc(job)
    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        messages: [
          { role: 'system', content: scoringPrompt },
          { role: 'user', content: `Score this job listing and respond with valid JSON only:\n\n${jobDesc}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      })

      let ranking: Record<string, unknown> = {}
      try {
        ranking = JSON.parse(extractJson(completion.choices[0]?.message?.content ?? '{}'))
      } catch {
        // JSON parse failed — save with defaults so job isn't re-queued endlessly
        console.warn('JSON parse failed for job:', job.title)
      }

      const score    = Math.min(100, Math.max(0, Math.round(Number(ranking.score) || 0)))
      const priority = ['hot', 'good', 'maybe', 'avoid'].includes(String(ranking.priority))
        ? String(ranking.priority) : 'maybe'

      const { error: updateErr } = await supabase.from('jobs').update({
        ai_score:     score,
        ai_priority:  priority,
        ai_ranking:   ranking,
        ai_ranked_at: new Date().toISOString(),
        status: (job.status as string) === 'imported' ? 'ranked' : job.status as string,
      }).eq('id', job.id as string)

      if (updateErr) return { scored: false, error: `${job.title}: ${updateErr.message}` }
      return { scored: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`Scoring failed for "${job.title}":`, msg)
      return { scored: false, error: `${job.title}: ${msg}` }
    }
  }

  // Fire all jobs simultaneously, collect results regardless of individual failures
  const results = await Promise.allSettled(
    (jobs as Record<string, unknown>[]).map(job => scoreOneJob(job))
  )

  let scored = 0
  const errors: string[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') {
      if (r.value.scored) scored++
      else if (r.value.error) errors.push(r.value.error)
    } else {
      errors.push(String(r.reason))
    }
  }

  // ── 7. Count remaining unscored in this category ──
  let remQuery = supabase
    .from('jobs').select('*', { count: 'exact', head: true })
    .eq('user_id', user.id).is('ai_ranked_at', null).neq('status', 'skipped')
  if (importIds.length > 0) remQuery = remQuery.in('import_id', importIds)
  const { count: remaining } = await remQuery

  return NextResponse.json({
    scored,
    remaining: remaining ?? 0,
    errors: errors.length,
    error_details: errors,
    message: scored > 0
      ? `Scored ${scored} jobs. ${remaining ?? 0} remaining.`
      : errors.length > 0
        ? `0 scored — ${errors.slice(0, 2).join(' | ')}`
        : 'No unscored jobs found.',
  })
}
