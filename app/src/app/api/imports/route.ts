import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all imports for this user, sorted by created_at DESC
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
  const { source, keyword_set_ids, location, max_items } = body

  // Validate request
  if (!source || !['seek', 'indeed'].includes(source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  }

  if (!Array.isArray(keyword_set_ids) || keyword_set_ids.length === 0) {
    return NextResponse.json({ error: 'At least one keyword set is required' }, { status: 400 })
  }

  // Get actor config for this source
  const { data: actor, error: actorError } = await supabase
    .from('apify_actors')
    .select('*')
    .eq('user_id', user.id)
    .eq('source', source)
    .single()

  if (actorError || !actor) {
    return NextResponse.json(
      { error: `Apify actor not configured for ${source}. Please set it up in Settings.` },
      { status: 400 }
    )
  }

  if (!actor.actor_id?.trim()) {
    return NextResponse.json(
      { error: `Apify actor ID is not set for ${source}` },
      { status: 400 }
    )
  }

  // Get keyword sets
  const { data: keywordSets, error: keywordsError } = await supabase
    .from('keyword_sets')
    .select('keywords')
    .eq('user_id', user.id)
    .in('id', keyword_set_ids)

  if (keywordsError || !keywordSets || keywordSets.length === 0) {
    return NextResponse.json({ error: 'Could not load keyword sets' }, { status: 400 })
  }

  // Flatten keywords from all sets
  const allKeywords = keywordSets.flatMap((set) => set.keywords || [])
  if (allKeywords.length === 0) {
    return NextResponse.json({ error: 'No keywords found in selected sets' }, { status: 400 })
  }

  // Merge Apify input
  const defaultInput = actor.default_input || {}
  const apifyInput = {
    ...defaultInput,
    keywords: allKeywords,
    location: location || 'Melbourne VIC',
    maxItems: max_items || 100,
  }

  // Call Apify API to trigger run
  let apifyRunId: string
  try {
    const apifyResponse = await fetch(
      `https://api.apify.com/v2/acts/${actor.actor_id}/runs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.APIFY_TOKEN}`,
        },
        body: JSON.stringify(apifyInput),
      }
    )

    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text()
      console.error('Apify API error:', apifyResponse.status, errorText)
      return NextResponse.json(
        { error: `Apify API error: ${apifyResponse.statusText}` },
        { status: 500 }
      )
    }

    const apifyData = await apifyResponse.json()
    apifyRunId = apifyData.data?.id
    if (!apifyRunId) {
      console.error('No run ID in Apify response:', apifyData)
      return NextResponse.json({ error: 'Failed to start Apify run' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error calling Apify API:', error)
    return NextResponse.json(
      { error: 'Failed to call Apify API' },
      { status: 500 }
    )
  }

  // Insert imports row
  const { data: importRecord, error: insertError } = await supabase
    .from('imports')
    .insert({
      user_id: user.id,
      source,
      actor_id: actor.actor_id,
      keyword_set_ids,
      input_payload: apifyInput,
      apify_run_id: apifyRunId,
      status: 'queued',
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error inserting import record:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ import: importRecord }, { status: 201 })
}
