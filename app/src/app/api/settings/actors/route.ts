import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/supabase/get-auth'

export async function GET() {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('apify_actors')
    .select('*')
    .eq('user_id', user.id)
    .order('source')

  return NextResponse.json({ actors: data })
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { source, actor_id, default_input } = await req.json()

  const { data, error } = await supabase
    .from('apify_actors')
    .upsert({ user_id: user.id, source, actor_id, default_input: default_input ?? {}, updated_at: new Date().toISOString() })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ actor: data })
}
