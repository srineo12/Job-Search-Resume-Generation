import Sidebar from '@/components/Sidebar'
import type { User } from '@supabase/supabase-js'

// Single-user app — auth permanently disabled
const APP_USER = {
  id: process.env.BYPASS_USER_ID ?? 'bypass',
  email: 'app@local',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '',
} as unknown as User

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar user={APP_USER} />
      <main className="flex-1 ml-64 p-8 overflow-auto">{children}</main>
    </div>
  )
}
