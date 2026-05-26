export const runtime = 'nodejs'

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
 * - Loads candidate profile and derives a scoring prompt programmatically.
 * - Saves the generated prompt to keyword_sets.jobfit_prompt for visibility.
 * - Scores up to `limit` unscored jobs (default 5) per call.
 * - Returns: { scored, remaining, errors, error_details }
 */
export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { keyword_set_id, job_ids, limit = 5 } = body

  if (!keyword_set_id)
    return NextResponse.json({ error: 'keyword_set_id is required' }, { status: 400 })

  // ── 1. Load keyword set (category) ──
  const { data: kwSet, error: kwErr } = await supabase
    .from('keyword_sets')
    .select('id, name, keywords')
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

  // ── 3. Build scoring prompt — deterministic, guaranteed correct JSON schema ──
  const categoryKeywords = Array.isArray(kwSet.keywords) ? kwSet.keywords as string[] : []
  const scoringPrompt = buildJobfitScoringPrompt(profile, kwSet.name, categoryKeywords)

  // Save prompt to keyword_sets so Settings → Keywords can display it.
  // Silently ignore if the column doesn't exist yet (migration not applied).
  const { error: promptSaveErr } = await supabase
    .from('keyword_sets')
    .update({ jobfit_prompt: scoringPrompt })
    .eq('id', keyword_set_id)
    .eq('user_id', user.id)
  if (promptSaveErr) console.warn('jobfit_prompt save skipped:', promptSaveErr.message)

  // ── 4. Load jobs to score ──
  let query = supabase
    .from('jobs')
    .select('id, title, employer, location, work_type, salary_text, description_text, posted_at, status')
    .eq('user_id', user.id)
    .neq('status', 'skipped')
    .limit(limit)

  if (job_ids?.length) {
    query = query.in('id', job_ids)
  } else {
    // Score only unscored jobs
    query = query.is('ai_ranked_at', null)
  }

  const { data: jobs, error: fetchErr } = await query
  if (fetchErr)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  if (!jobs?.length) {
    const { count: remaining } = await supabase
      .from('jobs').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).is('ai_ranked_at', null).neq('status', 'skipped')
    return NextResponse.json({ scored: 0, remaining: remaining ?? 0, message: 'No unscored jobs found' })
  }

  // ── 5. Score each job ──
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  let scored = 0
  const errors: string[] = []

  for (const job of jobs) {
    try {
      const jobDesc = [
        `Title: ${job.title || 'Unknown'}`,
        `Employer: ${job.employer || 'Unknown'}`,
        `Location: ${job.location || 'Melbourne VIC'}`,
        `Work Type: ${job.work_type || 'Not specified'}`,
        `Salary: ${job.salary_text || 'Not specified'}`,
        `Description:\n${(job.description_text || '').slice(0, 4000)}`,
      ].join('\n')

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
        const raw = completion.choices[0]?.message?.content ?? '{}'
        ranking = JSON.parse(extractJson(raw))
      } catch (e) {
        console.error('JSON parse failed for job', job.title, e)
      }

      const score    = Math.min(100, Math.max(0, Math.round(Number(ranking.score) || 0)))
      const priority = ['hot', 'good', 'maybe', 'avoid'].includes(String(ranking.priority))
        ? String(ranking.priority) : 'maybe'

      const { error: updateErr } = await supabase.from('jobs').update({
        ai_score:     score,
        ai_priority:  priority,
        ai_ranking:   ranking,
        ai_ranked_at: new Date().toISOString(),
        status: job.status === 'imported' ? 'ranked' : job.status,
      }).eq('id', job.id)

      if (updateErr) errors.push(`${job.title}: ${updateErr.message}`)
      else scored++
    } catch (err) {
      errors.push(`${job.title}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ── 6. Count remaining unscored ──
  const { count: remaining } = await supabase
    .from('jobs').select('*', { count: 'exact', head: true })
    .eq('user_id', user.id).is('ai_ranked_at', null).neq('status', 'skipped')

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
