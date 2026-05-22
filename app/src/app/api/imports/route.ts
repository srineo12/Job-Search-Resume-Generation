import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('imports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ imports: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { source, keyword_set_ids, include_in_title = [], date_range = '', max_items = 100 } = body

  if (!source || !['seek', 'indeed'].includes(source))
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  if (!Array.isArray(keyword_set_ids) || keyword_set_ids.length === 0)
    return NextResponse.json({ error: 'At least one keyword set is required' }, { status: 400 })

  // Load actor config
  const { data: actor } = await supabase
    .from('apify_actors').select('*').eq('user_id', user.id).eq('source', source).single()
  if (!actor?.actor_id?.trim())
    return NextResponse.json({ error: `Apify actor not configured for ${source}. Go to Settings → Apify Actors.` }, { status: 400 })

  // Load keyword sets
  const { data: keywordSets } = await supabase
    .from('keyword_sets').select('keywords').eq('user_id', user.id).in('id', keyword_set_ids)
  const allKeywords = (keywordSets || []).flatMap(s => s.keywords || [])
  if (!allKeywords.length)
    return NextResponse.json({ error: 'No keywords found in selected sets' }, { status: 400 })

  // Build Apify input — merge default_input with hardcoded Melbourne filters
  const apifyInput = {
    ...(actor.default_input || {}),
    // Search terms
    query: allKeywords.join(' OR '),
    keywords: allKeywords,
    // Title filter
    ...(include_in_title.length > 0 ? { jobTitleIncludes: include_in_title } : {}),
    // Hardcoded Melbourne
    location: 'Melbourne VIC',
    locationRadius: 50,
    country: 'AU',
    // Filters
    sortBy: 'relevance',
    ...(date_range ? { dateRange: date_range, postedIn: date_range } : {}),
    maxItems: Math.min(max_items, 500),
  }

  // Trigger Apify run
  // Apify URLs use '~' instead of '/' in actor IDs (e.g. websift~seek-job-scraper)
  const actorIdForUrl = actor.actor_id.replace('/', '~')
  let apifyRunId: string
  try {
    const resp = await fetch(`https://api.apify.com/v2/acts/${actorIdForUrl}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.APIFY_TOKEN}` },
      body: JSON.stringify(apifyInput),
    })
    if (!resp.ok) {
      const txt = await resp.text()
      console.error('Apify error:', resp.status, txt)
      return NextResponse.json({ error: `Apify error: ${resp.statusText}` }, { status: 500 })
    }
    const apifyData = await resp.json()
    apifyRunId = apifyData.data?.id
    if (!apifyRunId) return NextResponse.json({ error: 'No run ID from Apify' }, { status: 500 })
  } catch (err) {
    console.error('Apify call failed:', err)
    return NextResponse.json({ error: 'Failed to call Apify' }, { status: 500 })
  }

  const { data: importRecord, error: insertErr } = await supabase
    .from('imports')
    .insert({
      user_id: user.id, source, actor_id: actor.actor_id,
      keyword_set_ids, input_payload: apifyInput,
      apify_run_id: apifyRunId, status: 'queued',
    })
    .select().single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  return NextResponse.json({ import: importRecord }, { status: 201 })
}
