// One-time script to set the password for the single user
// Run from the /app directory: node scripts/set-password.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load .env.local
const envFile = readFileSync('.env.local', 'utf8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=')
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
    })
)

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const { data, error } = await supabase.auth.admin.listUsers()
if (error) {
  console.error('Error listing users:', error.message)
  process.exit(1)
}

if (!data.users.length) {
  console.error('No users found. Please send a magic link first so the account exists.')
  process.exit(1)
}

const user = data.users[0]
console.log(`Setting password for: ${user.email}`)

const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
  password: 'Sritcs86',
  email_confirm: true,
})

if (updateError) {
  console.error('Error setting password:', updateError.message)
  process.exit(1)
}

console.log('Password set successfully!')
console.log(`Email: ${user.email}`)
console.log(`Password: Sritcs86`)
