/**
 * GET /api/debug/logs
 * Query params: context, level, limit (default 50)
 * Returns recent app_logs entries so issues can be diagnosed
 * without needing Vercel function log access.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/supabase/get-auth'

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const context = searchParams.get('context')
  const level   = searchParams.get('level')
  const limit   = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

  let query = supabase
    .from('app_logs')
    .select('id, context, level, message, data, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (context) query = query.eq('context', context)
  if (level)   query = query.eq('level', level)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ logs: data || [], count: data?.length || 0 })
}

export async function DELETE(request: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const context = searchParams.get('context')
  let query = supabase.from('app_logs').delete()
  if (context) query = (query as any).eq('context', context)
  else query = (query as any).neq('id', 0)  // delete all
  await query
  return NextResponse.json({ ok: true })
}
