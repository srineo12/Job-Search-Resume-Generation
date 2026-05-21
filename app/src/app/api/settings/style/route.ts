import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('style_versions')
    .select('*')
    .eq('user_id', user.id)
    .order('version', { ascending: false })

  return NextResponse.json({ styles: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { yaml_content, notes, set_active } = body

  // Basic YAML validation — just check it's non-empty text for now
  if (!yaml_content?.trim()) {
    return NextResponse.json({ error: 'YAML content is required' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('style_versions')
    .select('version')
    .eq('user_id', user.id)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (existing?.version ?? 0) + 1

  if (set_active) {
    await supabase.from('style_versions').update({ is_active: false }).eq('user_id', user.id)
  }

  const { data, error } = await supabase
    .from('style_versions')
    .insert({ user_id: user.id, yaml_content, parsed_json: {}, notes, version: nextVersion, is_active: set_active ?? true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ style: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, is_active } = await req.json()
  if (is_active) {
    await supabase.from('style_versions').update({ is_active: false }).eq('user_id', user.id)
  }

  const { data, error } = await supabase
    .from('style_versions').update({ is_active }).eq('id', id).eq('user_id', user.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ style: data })
}
