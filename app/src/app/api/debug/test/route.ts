/**
 * GET /api/debug/test
 * Tests every critical component and returns a full diagnostic report.
 * Use this to investigate any issue without needing Vercel log access.
 *
 * Tests:
 * - Auth bypass (user resolved)
 * - Supabase connectivity
 * - Jobs table (count, sample)
 * - Unranked jobs count
 * - OpenAI API key validity (fast $0 call)
 * - Active ranking prompt exists
 * - Candidate profile exists
 * - app_logs table exists
 */
import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/supabase/get-auth'
import OpenAI from 'openai'

export async function GET() {
  const report: Record<string, unknown> = {}
  const t = (label: string, val: unknown) => { report[label] = val }

  // 1. Auth
  let supabase: any, user: any
  try {
    const auth = await getAuth()
    supabase = auth.supabase
    user = auth.user
    t('auth', { ok: !!user, userId: user?.id, email: user?.email })
  } catch (e: any) {
    t('auth', { ok: false, error: e.message })
    return NextResponse.json({ report }, { status: 500 })
  }

  // 2. Supabase jobs table
  try {
    const { count, error } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    t('jobs_total', { ok: !error, count, error: error?.message })
  } catch (e: any) { t('jobs_total', { ok: false, error: e.message }) }

  // 3. Unranked jobs
  try {
    const { data, count, error } = await supabase
      .from('jobs').select('id, title, status, ai_ranked_at', { count: 'exact' })
      .eq('user_id', user.id).is('ai_ranked_at', null).neq('status', 'skipped').limit(5)
    t('unranked_jobs', { ok: !error, count, sample: data?.map((j: any) => ({ id: j.id, title: j.title, status: j.status })), error: error?.message })
  } catch (e: any) { t('unranked_jobs', { ok: false, error: e.message }) }

  // 4. OpenAI API key
  try {
    const key = process.env.OPENAI_API_KEY
    t('openai_key', { present: !!key, prefix: key?.slice(0, 12) ?? 'MISSING' })
    if (key) {
      const openai = new OpenAI({ apiKey: key })
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini', temperature: 0,
        messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
        max_tokens: 5,
      })
      t('openai_call', { ok: true, response: res.choices[0]?.message?.content })
    }
  } catch (e: any) { t('openai_call', { ok: false, error: e.message }) }

  // 5. Active ranking prompt
  try {
    const { data, error } = await supabase.from('prompt_versions').select('id, prompt_type, is_active, created_at').eq('user_id', user.id).eq('prompt_type', 'ranking').eq('is_active', true).single()
    t('ranking_prompt', { ok: !error && !!data, found: !!data, error: error?.message })
  } catch (e: any) { t('ranking_prompt', { ok: false, error: e.message }) }

  // 6. Candidate profile
  try {
    const { data, error } = await supabase.from('candidate_profiles').select('id').eq('user_id', user.id).single()
    t('candidate_profile', { ok: !error && !!data, found: !!data, error: error?.message })
  } catch (e: any) { t('candidate_profile', { ok: false, error: e.message }) }

  // 7. app_logs table
  try {
    const { error } = await supabase.from('app_logs').select('id').limit(1)
    t('app_logs_table', { ok: !error, error: error?.message })
  } catch (e: any) { t('app_logs_table', { ok: false, error: e.message }) }

  // 8. Env vars present
  t('env_vars', {
    OPENAI_API_KEY:          !!process.env.OPENAI_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_DISABLE_AUTH: process.env.NEXT_PUBLIC_DISABLE_AUTH,
    DISABLE_AUTH:             process.env.DISABLE_AUTH,
    BYPASS_USER_ID:           process.env.BYPASS_USER_ID,
    APIFY_TOKEN:              !!process.env.APIFY_TOKEN,
  })

  return NextResponse.json({ report, timestamp: new Date().toISOString() })
}
