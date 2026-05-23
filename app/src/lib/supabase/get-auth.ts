/**
 * getAuth() — central auth helper.
 *
 * When DISABLE_AUTH=true (env var), bypasses Supabase session auth and uses
 * the service-role key + BYPASS_USER_ID. Set DISABLE_AUTH=false to re-enable.
 *
 * Returns { supabase, user: { id } } or { supabase, user: null } if unauthenticated.
 */
import { createClient as createAnonClient } from './server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function getAuth() {
  if (process.env.DISABLE_AUTH === 'true') {
    const userId = process.env.BYPASS_USER_ID
    if (!userId) throw new Error('DISABLE_AUTH=true but BYPASS_USER_ID is not set')
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    return { supabase, user: { id: userId, email: 'bypass@local' } }
  }

  const supabase = await createAnonClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}
