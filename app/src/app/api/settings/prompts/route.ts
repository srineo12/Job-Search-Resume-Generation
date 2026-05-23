import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/supabase/get-auth'

export async function GET(req: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type')
  let query = supabase.from('prompt_versions').select('*').eq('user_id', user.id).order('version', { ascending: false })
  if (type) query = query.eq('prompt_type', type)

  const { data } = await query
  return NextResponse.json({ prompts: data })
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { prompt_type, content, notes, set_active } = body

  const { data: existing } = await supabase
    .from('prompt_versions')
    .select('version')
    .eq('user_id', user.id)
    .eq('prompt_type', prompt_type)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (existing?.version ?? 0) + 1

  if (set_active) {
    await supabase.from('prompt_versions').update({ is_active: false })
      .eq('user_id', user.id).eq('prompt_type', prompt_type)
  }

  const { data, error } = await supabase
    .from('prompt_versions')
    .insert({ user_id: user.id, prompt_type, content, notes, version: nextVersion, is_active: set_active ?? true })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prompt: data })
}

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, prompt_type, is_active, content, notes } = body

  // If setting active, deactivate others of same type first
  if (is_active) {
    await supabase.from('prompt_versions').update({ is_active: false })
      .eq('user_id', user.id).eq('prompt_type', prompt_type)
  }

  const updates: Record<string, unknown> = {}
  if (is_active !== undefined) updates.is_active = is_active
  if (content !== undefined) updates.content = content
  if (notes !== undefined) updates.notes = notes

  const { data, error } = await supabase
    .from('prompt_versions').update(updates)
    .eq('id', id).eq('user_id', user.id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prompt: data })
}

export async function DELETE(req: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()

  // Refuse to delete the active prompt
  const { data: existing } = await supabase
    .from('prompt_versions').select('is_active').eq('id', id).eq('user_id', user.id).single()
  if (existing?.is_active) {
    return NextResponse.json({ error: 'Cannot delete the active prompt. Set another version active first.' }, { status: 400 })
  }

  const { error } = await supabase.from('prompt_versions').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
