import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type')
  let query = supabase.from('prompt_versions').select('*').eq('user_id', user.id).order('version', { ascending: false })
  if (type) query = query.eq('prompt_type', type)

  const { data } = await query
  return NextResponse.json({ prompts: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { prompt_type, content, notes, set_active } = body

  // Get next version number
  const { data: existing } = await supabase
    .from('prompt_versions')
    .select('version')
    .eq('user_id', user.id)
    .eq('prompt_type', prompt_type)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (existing?.version ?? 0) + 1

  // If set_active, deactivate others first
  if (set_active) {
    await supabase
      .from('prompt_versions')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('prompt_type', prompt_type)
  }

  const { data, error } = await supabase
    .from('prompt_versions')
    .insert({ user_id: user.id, prompt_type, content, notes, version: nextVersion, is_active: set_active ?? true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prompt: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, prompt_type, is_active } = body

  if (is_active) {
    await supabase
      .from('prompt_versions')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('prompt_type', prompt_type)
  }

  const { data, error } = await supabase
    .from('prompt_versions')
    .update({ is_active })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prompt: data })
}
