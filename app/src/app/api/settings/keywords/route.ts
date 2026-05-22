import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, name, keywords, is_active } = await req.json()
  const { data, error } = await supabase
    .from('keyword_sets')
    .update({ name, keywords, is_active, updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keyword_set: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await supabase.from('keyword_sets').delete().eq('id', id).eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
