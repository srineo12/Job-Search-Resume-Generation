/**
 * App-level logger — writes to app_logs table in Supabase.
 * Used throughout API routes so issues can be investigated without
 * needing access to Vercel function logs.
 *
 * Usage:
 *   const log = makeLogger(supabase, 'rank-batch', userId)
 *   await log.info('Jobs fetched', { count: jobs.length })
 *   await log.error('OpenAI failed', { error: err.message, jobId })
 *
 * Read recent logs:
 *   GET /api/debug/logs?context=rank-batch&limit=50
 */

import type { SupabaseClient } from '@supabase/supabase-js'

type Level = 'info' | 'warn' | 'error'

async function writeLog(
  supabase: SupabaseClient,
  context: string,
  level: Level,
  message: string,
  data: Record<string, unknown> = {},
  userId?: string,
) {
  // Always console.log so Vercel function logs also capture it
  const prefix = `[${context}][${level.toUpperCase()}]`
  if (level === 'error') console.error(prefix, message, data)
  else console.log(prefix, message, data)

  // Fire-and-forget DB write — never throw on logging failure
  supabase.from('app_logs').insert({
    context,
    level,
    message,
    data,
    user_id: userId ?? null,
  }).then(({ error }) => {
    if (error) console.error('[logger] DB write failed:', error.message)
  })
}

export function makeLogger(supabase: SupabaseClient, context: string, userId?: string) {
  return {
    info:  (msg: string, data?: Record<string, unknown>) => writeLog(supabase, context, 'info',  msg, data, userId),
    warn:  (msg: string, data?: Record<string, unknown>) => writeLog(supabase, context, 'warn',  msg, data, userId),
    error: (msg: string, data?: Record<string, unknown>) => writeLog(supabase, context, 'error', msg, data, userId),
  }
}
