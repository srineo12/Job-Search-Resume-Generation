'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/imports', label: 'Imports', icon: '📥' },
  { href: '/jobs', label: 'Jobs', icon: '💼' },
]

const settingsItems = [
  { href: '/settings/profile', label: 'Profile', icon: '👤' },
  { href: '/settings/style', label: 'Style', icon: '🎨' },
  { href: '/settings/keywords', label: 'Keyword Sets', icon: '🔑' },
  { href: '/settings/actors', label: 'Apify Actors', icon: '🕷️' },
  { href: '/settings/integrations', label: 'Integrations', icon: '🔗' },
]

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* App name */}
      <div className="px-5 py-5 border-b border-gray-800">
        <h1 className="text-white font-semibold text-sm">Job Search Assistant</h1>
        <p className="text-gray-500 text-xs mt-0.5 truncate">{user.email}</p>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(item => (
          <NavLink key={item.href} item={item} active={pathname === item.href} />
        ))}

        <div className="pt-4 pb-1">
          <p className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Settings</p>
        </div>

        {settingsItems.map(item => (
          <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
      </nav>

      {/* Sign out + version */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-2">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm"
        >
          <span>🚪</span>
          <span>Sign out</span>
        </button>
        <p className="text-center text-gray-600 text-xs">v0.7.5 — 2026-05-26</p>
      </div>
    </aside>
  )
}

function NavLink({ item, active }: { item: { href: string; label: string; icon: string }; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      <span>{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  )
}
