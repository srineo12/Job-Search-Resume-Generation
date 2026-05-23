/**
 * GET /api/debug/setup
 * Creates the app_logs table if it does not exist.
 * Call this once after deployment to enable persistent logging.
 */
import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/supabase/get-auth'

const CREATE_LOGS_SQL = `
CREATE TABLE IF NOT EXISTS app_logs (
  id          bigserial PRIMARY KEY,
  context     text NOT NULL,
  level       text NOT NULL DEFAULT 'info',
  message     text NOT NULL,
  data        jsonb DEFAULT '{}',
  user_id     uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_logs_context ON app_logs(context);
CREATE INDEX IF NOT EXISTS idx_app_logs_created  ON app_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_level    ON app_logs(level);
`

export async function GET() {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Try inserting a test row — if table missing, we'll know
  const { error: testErr } = await supabase.from('app_logs').select('id').limit(1)
  if (!testErr) {
    return NextResponse.json({ ok: true, message: 'app_logs table already exists' })
  }

  // Table doesn't exist — need to create via Supabase Management API
  // Requires SUPABASE_ACCESS_TOKEN (personal access token) — not service role key
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
  const projectRef  = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]

  if (!accessToken || !projectRef) {
    return NextResponse.json({
      ok: false,
      message: 'app_logs table missing. Add SUPABASE_ACCESS_TOKEN env var (personal access token from supabase.com/dashboard/account/tokens) then call this endpoint again.',
      tableError: testErr.message,
    })
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: CREATE_LOGS_SQL }),
  })

  if (!res.ok) {
    const body = await res.text()
    return NextResponse.json({ ok: false, message: 'Failed to create table', detail: body }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'app_logs table created successfully' })
}
