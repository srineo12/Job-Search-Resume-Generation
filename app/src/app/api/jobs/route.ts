import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/supabase/get-auth'

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const importId = searchParams.get('import_id')
  const priority  = searchParams.get('priority')
  const status    = searchParams.get('status')
  const limit     = Math.min(parseInt(searchParams.get('limit') || '500'), 500)
  const offset    = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('jobs')
    .select(`
      id, source_job_id, title, employer, location, work_type, salary_text,
      posted_at, url, status, source, raw_payload,
      description_text, description_html,
      ai_score, ai_priority, ai_ranking, ai_ranked_at,
      created_at, import_id
    `)
    .eq('user_id', user.id)
    .is('is_duplicate_of', null)

  if (importId) query = query.eq('import_id', importId)
  if (priority)  query = query.eq('ai_priority', priority)
  if (status)    query = query.eq('status', status)

  const { data, error } = await query
    .order('ai_score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Counts for header badges
  const { data: countData } = await supabase
    .from('jobs')
    .select('ai_priority, ai_ranked_at, status')
    .eq('user_id', user.id)
    .is('is_duplicate_of', null)

  const counts = {
    total:    countData?.length || 0,
    hot:      countData?.filter(j => j.ai_priority === 'hot').length || 0,
    good:     countData?.filter(j => j.ai_priority === 'good').length || 0,
    maybe:    countData?.filter(j => j.ai_priority === 'maybe').length || 0,
    avoid:    countData?.filter(j => j.ai_priority === 'avoid').length || 0,
    unranked: countData?.filter(j => !j.ai_ranked_at).length || 0,
    // workflow counts
    open:      countData?.filter(j => !['documents_generated','applied','skipped'].includes(j.status)).length || 0,
    generated: countData?.filter(j => j.status === 'documents_generated').length || 0,
    applied:   countData?.filter(j => j.status === 'applied').length || 0,
    discarded: countData?.filter(j => j.status === 'skipped').length || 0,
  }

  return NextResponse.json({ jobs: data || [], counts })
}

/** PATCH — update workflow status for a job */
export async function PATCH(request: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, workflow } = await request.json()
  if (!id || !workflow) return NextResponse.json({ error: 'id and workflow required' }, { status: 400 })

  let dbStatus: string
  if (workflow === 'generated') {
    dbStatus = 'documents_generated'
  } else if (workflow === 'applied') {
    dbStatus = 'applied'
  } else if (workflow === 'discarded') {
    dbStatus = 'skipped'
  } else {
    // 'open' — revert to ranked or imported
    const { data: job } = await supabase.from('jobs').select('ai_ranked_at').eq('id', id).single()
    dbStatus = job?.ai_ranked_at ? 'ranked' : 'imported'
  }

  const { error } = await supabase.from('jobs')
    .update({ status: dbStatus })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, status: dbStatus })
}

/** DELETE — remove a job entirely */
export async function DELETE(request: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  const { error } = await supabase.from('jobs').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
