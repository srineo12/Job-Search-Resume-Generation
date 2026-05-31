export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/supabase/get-auth'
import { buildJobfitScoringPrompt } from '@/lib/ai/generate-documents'

/**
 * GET /api/settings/keywords/[id]/prompt
 *
 * Generates the job-fit scoring prompt for a keyword set on-demand.
 * Does NOT require the jobfit_prompt DB column — computes it at request time.
 * Returns: { prompt: string }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Load keyword set — use select('*') to avoid failing if jobfit_prompt column
  // doesn't exist yet on the production DB (migration may not have been applied).
  const { data: kwSet, error: kwErr } = await supabase
    .from('keyword_sets')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (kwErr || !kwSet) {
    console.error('keyword_sets lookup failed:', kwErr?.message)
    return NextResponse.json(
      { error: kwErr ? `DB error: ${kwErr.message}` : 'Keyword set not found' },
      { status: kwErr ? 500 : 404 }
    )
  }

  // If a user-saved prompt exists in DB, return it directly
  if (kwSet.jobfit_prompt) {
    return NextResponse.json({ prompt: kwSet.jobfit_prompt, source: 'saved' })
  }

  // Otherwise compute it from the profile
  const { data: profileRow } = await supabase
    .from('candidate_profile')
    .select('profile_json')
    .eq('user_id', user.id)
    .single()

  if (!profileRow?.profile_json)
    return NextResponse.json({ error: 'Candidate profile not found. Set it up in Settings → Profile.' }, { status: 400 })

  const profile = profileRow.profile_json as Record<string, unknown>
  const categoryKeywords = Array.isArray(kwSet.keywords) ? kwSet.keywords as string[] : []

  const prompt = buildJobfitScoringPrompt(profile, kwSet.name, categoryKeywords)

  return NextResponse.json({ prompt, source: 'computed' })
}
