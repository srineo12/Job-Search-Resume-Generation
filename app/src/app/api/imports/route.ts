import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Build a seek.com.au search URL from keywords + filters.
 *
 * Multi-word keywords (e.g. "teacher aide") are quoted so Seek treats them as phrases.
 * Multiple keywords are joined with OR so Seek returns any matching role.
 * Example: keywords=["teacher aide","teaching assistant"] →
 *   ?keywords="teacher aide" OR "teaching assistant"
 */
function buildSeekUrl(keywords: string[], date_range: string): string {
  // Quote multi-word phrases, then join with OR for any-match behaviour
  const keywordQuery = keywords
    .map(k => k.trim())
    .filter(Boolean)
    .map(k => (k.includes(' ') ? `"${k}"` : k))
    .join(' OR ')

  const params = new URLSearchParams()
  params.set('keywords', keywordQuery)
  params.set('where', 'Melbourne VIC')
  params.set('distance', '50')
  if (date_range) {
    const days = date_range.replace('d', '')
    params.set('daterange', days)
  }
  return `https://www.seek.com.au/jobs?${params.toString()}`
}

/** Build an indeed.com.au search URL */
function buildIndeedUrl(keywords: string[], date_range: string): string {
  const params = new URLSearchParams()
  params.set('q', keywords.join(' '))
  params.set('l', 'Melbourne VIC')
  params.set('radius', '50')
  if (date_range) {
    const daysMap: Record<string, string> = { '1d': '1', '7d': '7', '30d': '30' }
    const fromage = daysMap[date_range]
    if (fromage) params.set('fromage', fromage)
  }
  return `https://au.indeed.com/jobs?${params.toString()}`
}

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

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  const { error } = await supabase.from('imports').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { source, keyword_set_ids, include_in_title = [], date_range = '', max_items = 10 } = body

  if (!source || !['seek', 'indeed'].includes(source))
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  if (!Array.isArray(keyword_set_ids) || keyword_set_ids.length === 0)
    return NextResponse.json({ error: 'At least one keyword set is required' }, { status: 400 })

  // Load actor config
  const { data: actor } = await supabase
    .from('apify_actors').select('*').eq('user_id', user.id).eq('source', source).single()
  if (!actor?.actor_id?.trim())
    return NextResponse.json({ error: `Apify actor not configured for ${source}. Go to Settings → Apify Actors.` }, { status: 400 })

  // Load keyword sets (search type only)
  const { data: keywordSets } = await supabase
    .from('keyword_sets').select('keywords').eq('user_id', user.id).in('id', keyword_set_ids)
  const allKeywords = (keywordSets || []).flatMap(s => s.keywords || [])
  if (!allKeywords.length)
    return NextResponse.json({ error: 'No keywords found in selected sets' }, { status: 400 })

  const maxItemsCapped = Math.min(Math.max(1, max_items), 500)

  // Build the search URL for the actor
  const searchUrl = source === 'seek'
    ? buildSeekUrl(allKeywords, date_range)
    : buildIndeedUrl(allKeywords, date_range)

  // Build Apify input.
  // websift/seek-job-scraper's actual controlling field is 'maxResults' (confirmed from
  // exported run JSON — actor ignores 'maxItems' and 'maximumResults').
  const apifyInput = {
    url: searchUrl,
    maxResults: maxItemsCapped,   // ← actual field the actor respects
  }

  // Apify URLs use '~' instead of '/' in actor IDs
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
      return NextResponse.json({ error: `Apify error: ${resp.statusText} — ${txt}` }, { status: 500 })
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
      keyword_set_ids, input_payload: { ...apifyInput, include_in_title },
      apify_run_id: apifyRunId, status: 'queued',
    })
    .select().single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  return NextResponse.json({ import: importRecord }, { status: 201 })
}
