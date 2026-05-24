import { getAuth } from '@/lib/supabase/get-auth'

async function getStats(userId: string) {
  const { supabase } = await getAuth()

  const [
    { count: totalJobs },
    { count: ranked },
    { count: generated },
    { count: applied },
    { count: unranked },
  ] = await Promise.all([
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('user_id', userId).is('is_duplicate_of', null),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('user_id', userId).not('ai_ranked_at', 'is', null),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'documents_generated'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'applied'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('user_id', userId).is('ai_ranked_at', null).is('is_duplicate_of', null),
  ])

  return { totalJobs, ranked, generated, applied, unranked }
}

export default async function DashboardPage() {
  const { user } = await getAuth()
  const stats = await getStats(user?.id ?? '')

  const statCards = [
    { label: 'Total Jobs',   value: stats.totalJobs  ?? 0, icon: '💼', color: 'text-blue-400' },
    { label: 'Unranked',     value: stats.unranked   ?? 0, icon: '⏳', color: 'text-yellow-400' },
    { label: 'Ranked',       value: stats.ranked     ?? 0, icon: '⭐', color: 'text-purple-400' },
    { label: 'Generated',    value: stats.generated  ?? 0, icon: '📄', color: 'text-indigo-400' },
    { label: 'Applied',      value: stats.applied    ?? 0, icon: '📨', color: 'text-green-400' },
  ]

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Your job search at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {statCards.map(card => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-gray-500 text-xs mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {(stats.totalJobs ?? 0) === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Getting started</h2>
          <ol className="space-y-3 text-sm text-gray-400">
            <li className="flex gap-3"><span className="text-indigo-400 font-bold">1.</span><span>Go to <strong className="text-white">Settings → Profile</strong> and add your resume data.</span></li>
            <li className="flex gap-3"><span className="text-indigo-400 font-bold">2.</span><span>Go to <strong className="text-white">Settings → Prompts</strong> and review the ranking + generation prompts.</span></li>
            <li className="flex gap-3"><span className="text-indigo-400 font-bold">3.</span><span>Go to <strong className="text-white">Settings → Keywords</strong> and create your first keyword set.</span></li>
            <li className="flex gap-3"><span className="text-indigo-400 font-bold">4.</span><span>Go to <strong className="text-white">Imports</strong> and trigger your first Apify job import.</span></li>
          </ol>
        </div>
      )}
    </div>
  )
}
