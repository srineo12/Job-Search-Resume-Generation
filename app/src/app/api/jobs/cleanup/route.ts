import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/supabase/get-auth'
import { cleanupJobsByKeywords } from '@/lib/import/cleanup'

export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { keyword_set_id } = body

  if (!keyword_set_id) {
    return NextResponse.json({ error: 'keyword_set_id is required' }, { status: 400 })
  }

  try {
    const result = await cleanupJobsByKeywords(supabase, user.id, [keyword_set_id])

    return NextResponse.json({
      success: true,
      cleaned: result.cleaned,
      kept: result.kept,
      errors: result.errors,
      message: `Cleanup complete: ${result.cleaned} job${result.cleaned === 1 ? '' : 's'} marked irrelevant, ${result.kept} job${result.kept === 1 ? '' : 's'} kept`,
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
