import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/supabase/get-auth'

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const importId = searchParams.get('import_id')
  const priority = searchParams.get('priority')
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 500)
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('jobs')
    .select(`
      id, title, employer, location, work_type, salary_text,
      posted_at, url, status, source, raw_payload,
      ai_score, ai_priority, ai_ranking, ai_ranked_at,
      created_at, import_id
    `)
    .eq('user_id', user.id)
    .is('is_duplicate_of', null)

  if (importId) query = query.eq('import_id', importId)
  if (priority) query = query.eq('ai_priority', priority)
  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
    .order('ai_score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get counts per priority for UI tabs
  const { data: countData } = await supabase
    .from('jobs')
    .select('ai_priority, ai_ranked_at')
    .eq('user_id', user.id)
    .is('is_duplicate_of', null)

  const counts = {
    total: countData?.length || 0,
    hot: countData?.filter(j => j.ai_priority === 'hot').length || 0,
    good: countData?.filter(j => j.ai_priority === 'good').length || 0,
    maybe: countData?.filter(j => j.ai_priority === 'maybe').length || 0,
    avoid: countData?.filter(j => j.ai_priority === 'avoid').length || 0,
    unranked: countData?.filter(j => !j.ai_ranked_at).length || 0,
  }

  return NextResponse.json({ jobs: data || [], counts, total: count })
}

export async function DELETE(request: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  const { error } = await supabase.from('jobs').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
