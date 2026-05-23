import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import type { User } from '@supabase/supabase-js'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // Auth bypass — check DISABLE_AUTH (server components can read non-NEXT_PUBLIC_ vars)
  if (process.env.DISABLE_AUTH === 'true' || process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true') {
    const mockUser = {
      id: process.env.BYPASS_USER_ID ?? 'bypass',
      email: 'bypass@local',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '',
    } as unknown as User
    return (
      <div className="min-h-screen bg-gray-950 flex">
        <Sidebar user={mockUser} />
        <main className="flex-1 ml-64 p-8 overflow-auto">{children}</main>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar user={user} />
      <main className="flex-1 ml-64 p-8 overflow-auto">{children}</main>
    </div>
  )
}
