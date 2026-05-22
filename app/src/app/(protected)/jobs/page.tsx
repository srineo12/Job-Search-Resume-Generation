'use client'

import { useCallback, useEffect, useState } from 'react'

interface Job {
  id: string
  title: string
  employer: string
  location: string
  work_type: string
  salary_text: string
  posted_at: string
  url: string
  status: string
  ai_score: number | null
  ai_priority: 'hot' | 'good' | 'maybe' | 'avoid' | null
  ai_ranking: {
    beginner_friendly?: string
    gto_traineeship?: string
    training_offered?: string
    qualification_risk?: string
    recommended_action?: string
    resume_version?: string
    cover_letter_needed?: string
    reason?: string
    key_skills?: string
    red_flags?: string
    tailoring_notes?: string
  } | null
  ai_ranked_at: string | null
}

const PRIORITY_STYLES: Record<string, string> = {
  hot: 'bg-red-900 text-red-300 border-red-700',
  good: 'bg-green-900 text-green-300 border-green-700',
  maybe: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  avoid: 'bg-gray-800 text-gray-500 border-gray-700',
}
const PRIORITY_LABELS: Record<string, string> = {
  hot: '🔥 Hot', good: '✅ Good', maybe: '🤔 Maybe', avoid: '❌ Avoid',
}
const ACTION_STYLES: Record<string, string> = {
  apply: 'text-green-400', review_carefully: 'text-yellow-400', skip: 'text-gray-500',
}

function relativeDate(dateStr: string) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return '1d ago'
  if (d < 30) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'score' | 'posted'>('score')
  const [ranking, setRanking] = useState(false)
  const [rankProgress, setRankProgress] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadJobs = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/jobs')
    const d = await res.json()
    setJobs(d.jobs || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadJobs() }, [loadJobs])

  const filtered = jobs
    .filter(j => {
      if (filter === 'unranked') return !j.ai_ranked_at
      if (filter === 'hot') return j.ai_priority === 'hot'
      if (filter === 'good') return j.ai_priority === 'good'
      if (filter === 'maybe') return j.ai_priority === 'maybe'
      if (filter === 'avoid') return j.ai_priority === 'avoid'
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'score') {
        const sa = a.ai_score ?? -1, sb = b.ai_score ?? -1
        if (sb !== sa) return sb - sa
      }
      return new Date(b.posted_at || 0).getTime() - new Date(a.posted_at || 0).getTime()
    })

  const counts = {
    total: jobs.length,
    unranked: jobs.filter(j => !j.ai_ranked_at).length,
    hot: jobs.filter(j => j.ai_priority === 'hot').length,
    good: jobs.filter(j => j.ai_priority === 'good').length,
    maybe: jobs.filter(j => j.ai_priority === 'maybe').length,
    avoid: jobs.filter(j => j.ai_priority === 'avoid').length,
  }

  async function handleRankAll() {
    setRanking(true)
    let total = 0
    while (true) {
      setRankProgress(`Ranked ${total} jobs, processing next batch...`)
      const res = await fetch('/api/jobs/rank-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 }),
      })
      const d = await res.json()
      total += d.ranked || 0
      if (!d.ranked || d.remaining === 0) break
      setRankProgress(`Ranked ${total} jobs... ${d.remaining} remaining`)
    }
    setRankProgress(`Done! Ranked ${total} jobs.`)
    loadJobs()
    setTimeout(() => { setRanking(false); setRankProgress('') }, 3000)
  }

  async function handleRankSelected() {
    if (!selected.size) return
    setRanking(true)
    setRankProgress(`Ranking ${selected.size} selected jobs...`)
    const res = await fetch('/api/jobs/rank-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_ids: Array.from(selected), limit: selected.size }),
    })
    const d = await res.json()
    setRankProgress(`Done! Ranked ${d.ranked} jobs.`)
    setSelected(new Set())
    loadJobs()
    setTimeout(() => { setRanking(false); setRankProgress('') }, 2000)
  }

  function toggleSelect(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(j => j.id)))
  }

  return (
    <div className="max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="text-gray-400 text-sm mt-1">{counts.total} total · {counts.hot} hot · {counts.good} good · {counts.unranked} unranked</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <>
              <button onClick={handleRankSelected} disabled={ranking}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                Rank {selected.size} selected
              </button>
              <button
                onClick={() => alert(`Generate docs for ${selected.size} jobs — coming in Phase 6`)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg">
                📄 Generate Resume+Cover ({selected.size})
              </button>
            </>
          )}
          <button onClick={handleRankAll} disabled={ranking || counts.unranked === 0}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg">
            {ranking ? '⚙️ Ranking...' : `⚡ Rank All (${counts.unranked})`}
          </button>
        </div>
      </div>

      {rankProgress && (
        <div className="mb-4 p-3 bg-indigo-950 border border-indigo-800 rounded-lg text-indigo-300 text-sm">{rankProgress}</div>
      )}

      {/* Filter tabs + sort */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {[
            { key: 'all', label: `All (${counts.total})` },
            { key: 'hot', label: `🔥 Hot (${counts.hot})` },
            { key: 'good', label: `✅ Good (${counts.good})` },
            { key: 'maybe', label: `🤔 Maybe (${counts.maybe})` },
            { key: 'avoid', label: `❌ Avoid (${counts.avoid})` },
            { key: 'unranked', label: `⏳ Unranked (${counts.unranked})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                filter === tab.key ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-gray-300 text-xs focus:outline-none">
          <option value="score">Sort by Score</option>
          <option value="posted">Sort by Date Posted</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500 text-sm py-12 text-center">Loading jobs...</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-600 text-sm py-12 text-center">
          No jobs found. <a href="/imports" className="text-indigo-400">Import jobs →</a>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-8">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll} className="accent-indigo-500" />
                </th>
                <th className="px-3 py-3 text-left w-24">Priority</th>
                <th className="px-3 py-3 text-left w-12">Score</th>
                <th className="px-3 py-3 text-left">Title & Employer</th>
                <th className="px-3 py-3 text-left w-28">Type / Salary</th>
                <th className="px-3 py-3 text-left w-20">Posted</th>
                <th className="px-3 py-3 text-left w-28">Action</th>
                <th className="px-3 py-3 text-left w-20">Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map(job => (
                <>
                  <tr key={job.id}
                    className={`hover:bg-gray-800/50 transition-colors cursor-pointer ${selected.has(job.id) ? 'bg-indigo-950/30' : ''}`}
                    onClick={() => toggleSelect(job.id)}>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(job.id)}
                        onChange={() => toggleSelect(job.id)} className="accent-indigo-500" />
                    </td>
                    <td className="px-3 py-3">
                      {job.ai_priority ? (
                        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${PRIORITY_STYLES[job.ai_priority]}`}>
                          {PRIORITY_LABELS[job.ai_priority]}
                        </span>
                      ) : <span className="text-gray-600 text-xs">Unranked</span>}
                    </td>
                    <td className="px-3 py-3">
                      {job.ai_score != null ? (
                        <span className={`text-lg font-bold ${
                          job.ai_score >= 70 ? 'text-green-400' : job.ai_score >= 50 ? 'text-yellow-400' : 'text-gray-500'
                        }`}>{job.ai_score}</span>
                      ) : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <a href={job.url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-white font-medium hover:text-indigo-300 transition-colors line-clamp-1">
                          {job.title || '(no title)'}
                        </a>
                        <span className="text-gray-400 text-xs">{job.employer || '—'}</span>
                        {job.ai_ranking?.reason && (
                          <span className="text-gray-500 text-xs mt-0.5 line-clamp-1 italic">{job.ai_ranking.reason}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-300 text-xs">{job.work_type || '—'}</span>
                        <span className="text-gray-500 text-xs">{job.salary_text || '—'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-400 text-xs">{relativeDate(job.posted_at)}</td>
                    <td className="px-3 py-3">
                      {job.ai_ranking?.recommended_action ? (
                        <span className={`text-xs font-medium ${ACTION_STYLES[job.ai_ranking.recommended_action] || 'text-gray-400'}`}>
                          {job.ai_ranking.recommended_action === 'apply' ? '✓ Apply' :
                           job.ai_ranking.recommended_action === 'review_carefully' ? '👀 Review' : '↩ Skip'}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setExpanded(expanded === job.id ? null : job.id)}
                        className="text-xs text-gray-500 hover:text-white">
                        {expanded === job.id ? '▲ Less' : '▼ More'}
                      </button>
                    </td>
                  </tr>
                  {expanded === job.id && (
                    <tr key={`${job.id}-detail`} className="bg-gray-900">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-3">
                            {job.ai_ranking?.key_skills && (
                              <div>
                                <p className="text-xs font-medium text-gray-400 mb-1">KEY SKILLS</p>
                                <p className="text-sm text-green-300">{job.ai_ranking.key_skills}</p>
                              </div>
                            )}
                            {job.ai_ranking?.red_flags && (
                              <div>
                                <p className="text-xs font-medium text-gray-400 mb-1">RED FLAGS</p>
                                <p className="text-sm text-red-300">{job.ai_ranking.red_flags}</p>
                              </div>
                            )}
                            {job.ai_ranking?.tailoring_notes && (
                              <div>
                                <p className="text-xs font-medium text-gray-400 mb-1">TAILORING TIPS</p>
                                <p className="text-sm text-blue-300">{job.ai_ranking.tailoring_notes}</p>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {[
                                { label: 'Beginner Friendly', val: job.ai_ranking?.beginner_friendly },
                                { label: 'GTO/Traineeship', val: job.ai_ranking?.gto_traineeship },
                                { label: 'Training Offered', val: job.ai_ranking?.training_offered },
                                { label: 'Qual. Risk', val: job.ai_ranking?.qualification_risk },
                                { label: 'Resume Version', val: job.ai_ranking?.resume_version?.replace(/_/g, ' ') },
                                { label: 'Cover Letter', val: job.ai_ranking?.cover_letter_needed },
                              ].map(item => item.val ? (
                                <div key={item.label}>
                                  <span className="text-gray-500">{item.label}: </span>
                                  <span className="text-gray-200 capitalize">{item.val}</span>
                                </div>
                              ) : null)}
                            </div>
                            <a href={job.url} target="_blank" rel="noopener noreferrer"
                              className="inline-block mt-2 text-xs text-indigo-400 hover:text-indigo-300">
                              View on {job.url?.includes('seek') ? 'Seek' : 'Indeed'} →
                            </a>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
