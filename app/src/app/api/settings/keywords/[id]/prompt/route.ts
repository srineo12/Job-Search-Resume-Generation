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

  // Load keyword set
  const { data: kwSet, error: kwErr } = await supabase
    .from('keyword_sets')
    .select('id, name, keywords')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (kwErr || !kwSet)
    return NextResponse.json({ error: 'Keyword set not found' }, { status: 404 })

  // Load candidate profile
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

  return NextResponse.json({ prompt })
}
