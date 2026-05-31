import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/supabase/get-auth'

export async function GET(req: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const set_type = req.nextUrl.searchParams.get('set_type') // 'search' | 'title' | null (all)

  let query = supabase
    .from('keyword_sets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (set_type) query = query.eq('set_type', set_type)

  const { data } = await query
  return NextResponse.json({ keyword_sets: data })
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, keywords, set_type = 'search' } = await req.json()
  const { data, error } = await supabase
    .from('keyword_sets')
    .insert({ user_id: user.id, name, keywords, set_type })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keyword_set: data })
}

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, name, keywords, is_active, jobfit_prompt } = await req.json()
  // Build update object — only include jobfit_prompt when explicitly provided
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = { name, keywords, is_active, updated_at: new Date().toISOString() }
  if (jobfit_prompt !== undefined) updates.jobfit_prompt = jobfit_prompt
  const { data, error } = await supabase
    .from('keyword_sets')
    .update(updates)
    .eq('id', id).eq('user_id', user.id)
    .select().single()

  if (error) {
    // Give a clear message if the jobfit_prompt column hasn't been migrated yet
    const msg = error.message.includes('jobfit_prompt')
      ? 'Database migration needed: run  ALTER TABLE keyword_sets ADD COLUMN IF NOT EXISTS jobfit_prompt text;  in your Supabase SQL editor.'
      : error.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }
  return NextResponse.json({ keyword_set: data })
}

export async function DELETE(req: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await supabase.from('keyword_sets').delete().eq('id', id).eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
