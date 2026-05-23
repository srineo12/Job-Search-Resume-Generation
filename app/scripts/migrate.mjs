// Apply DB migrations
// Run: node scripts/migrate.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envFile = readFileSync('.env.local', 'utf8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => { const idx = line.indexOf('='); return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()] })
)

const { createClient: pg } = await import('@supabase/supabase-js')
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Apply migration via a series of RPC calls using pg functions
// First create a helper function
const migrations = [
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_score integer CHECK (ai_score >= 0 AND ai_score <= 100)`,
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_priority text`,
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_ranking jsonb DEFAULT '{}'`,
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_ranked_at timestamptz`,
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_type text`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_user_priority ON jobs(user_id, ai_priority)`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_user_score ON jobs(user_id, ai_score DESC NULLS LAST)`,
]

// We need to execute these - let's try using a Postgres query via Supabase's pg_query feature
const SUPABASE_REF = 'blqjqvnwmofzsbtgfdvx'
// The management API requires a personal access token, not service role
// Let's store migrations in applied_migrations table and let the app handle it

console.log('To apply migrations, run this SQL in your Supabase SQL editor:')
console.log('https://supabase.com/dashboard/project/blqjqvnwmofzsbtgfdvx/editor')
console.log('')
console.log(migrations.join(';\n') + ';')
