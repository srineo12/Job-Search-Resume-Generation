'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface KeywordSet {
  id: string
  name: string
  keywords: string[]
  set_type: string
}

interface Import {
  id: string
  source: 'seek' | 'indeed'
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  stats?: { fetched?: number; inserted?: number; duplicates_by_url?: number; duplicates_by_employer_title?: number; title_filtered?: number }
  input_payload?: Record<string, unknown>
  apify_run_id?: string
  error_message?: string
  created_at: string
}

const DATE_RANGES = [
  { value: '', label: 'Any time' },
  { value: '1d', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
]

export default function ImportsPage() {
  const [imports, setImports] = useState<Import[]>([])
  const [searchSets, setSearchSets] = useState<KeywordSet[]>([])
  const [titleSets, setTitleSets] = useState<KeywordSet[]>([])
  const [triggering, setTriggering] = useState(false)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedImport, setExpandedImport] = useState<string | null>(null)
  const [form, setForm] = useState({
    source: 'seek' as 'seek' | 'indeed',
    keyword_set_ids: [] as string[],
    title_set_ids: [] as string[],
    date_range: '30d',
    max_items: 10,
  })

  useEffect(() => {
    loadKeywordSets()
    loadImports()
    const interval = setInterval(loadImports, 10000)
    return () => clearInterval(interval)
  }, [])

  async function loadKeywordSets() {
    const [searchRes, titleRes] = await Promise.all([
      fetch('/api/settings/keywords?set_type=search'),
      fetch('/api/settings/keywords?set_type=title'),
    ])
    const [searchData, titleData] = await Promise.all([searchRes.json(), titleRes.json()])
    setSearchSets(searchData.keyword_sets || [])
    setTitleSets(titleData.keyword_sets || [])
  }

  async function loadImports() {
    const res = await fetch('/api/imports')
    const d = await res.json()
    setImports(d.imports || [])
  }

  async function handleTrigger(e: React.FormEvent) {
    e.preventDefault()
    setTriggering(true)
    setError('')
    setSuccess('')
    try {
      // Collect include_in_title terms from selected title sets
      const selectedTitleSets = titleSets.filter(s => form.title_set_ids.includes(s.id))
      const include_in_title = selectedTitleSets.flatMap(s => s.keywords)

      const res = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: form.source,
          keyword_set_ids: form.keyword_set_ids,
          include_in_title,
          date_range: form.date_range,
          max_items: form.max_items,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Failed'); return }
      setSuccess(`Import queued! Apify run: ${d.import.apify_run_id}`)
      setForm(f => ({ ...f, keyword_set_ids: [], title_set_ids: [] }))
      loadImports()
    } catch (err) {
      setError(String(err))
    } finally {
      setTriggering(false)
    }
  }

  async function handleDelete(importId: string) {
    if (!confirm('Delete this import record? Jobs already imported will remain.')) return
    await fetch('/api/imports', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: importId }),
    })
    loadImports()
  }

  async function handleRefresh(importId: string) {
    setRefreshing(importId)
    setError('')
    try {
      const res = await fetch(`/api/imports/${importId}/refresh`)
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Refresh failed'); return }
      setSuccess(d.message || `Status: ${d.import?.status}`)
      loadImports()
    } catch (err) {
      setError(String(err))
    } finally {
      setRefreshing(null)
    }
  }

  const KeywordCheckboxList = ({
    sets, selectedIds, onChange, emptyHref, emptyLabel,
  }: { sets: KeywordSet[]; selectedIds: string[]; onChange: (id: string, checked: boolean) => void; emptyHref: string; emptyLabel: string }) => (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 max-h-36 overflow-y-auto space-y-1.5">
      {sets.length === 0 ? (
        <p className="text-gray-600 text-xs">
          No sets yet — <Link href={emptyHref} className="text-indigo-400">{emptyLabel}</Link>.
        </p>
      ) : sets.map(set => (
        <label key={set.id} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedIds.includes(set.id)}
            disabled={triggering}
            onChange={e => onChange(set.id, e.target.checked)}
            className="w-3.5 h-3.5 accent-indigo-500"
          />
          <span className="text-white text-sm">{set.name}</span>
          <span className="text-gray-600 text-xs">({set.keywords?.length || 0} terms)</span>
        </label>
      ))}
    </div>
  )

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Imports</h1>
        <p className="text-gray-400 text-sm mt-1">Pull jobs from Seek / Indeed via Apify. Location hardcoded to Melbourne VIC, 50km radius.</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-950 border border-red-800 rounded-lg text-red-400 text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-950 border border-green-800 rounded-lg text-green-400 text-sm">{success}</div>}

      {/* Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <p className="text-white font-medium mb-4">New Import</p>
        <form onSubmit={handleTrigger} className="space-y-4">

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Source</label>
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value as 'seek' | 'indeed' }))} disabled={triggering}
                className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50">
                <option value="seek">Seek</option>
                <option value="indeed">Indeed</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Date Range</label>
              <select value={form.date_range} onChange={e => setForm(f => ({ ...f, date_range: e.target.value }))} disabled={triggering}
                className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50">
                {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Max Results</label>
              <input type="number" value={form.max_items} min={10} max={500}
                onChange={e => setForm(f => ({ ...f, max_items: parseInt(e.target.value) || 100 }))}
                disabled={triggering}
                className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50" />
            </div>
          </div>

          {/* Search Terms */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Search Terms <span className="text-gray-600">(select keyword sets)</span>
            </label>
            <KeywordCheckboxList
              sets={searchSets}
              selectedIds={form.keyword_set_ids}
              onChange={(id, checked) => setForm(f => ({
                ...f,
                keyword_set_ids: checked ? [...f.keyword_set_ids, id] : f.keyword_set_ids.filter(x => x !== id),
              }))}
              emptyHref="/settings/keywords"
              emptyLabel="create one in Keyword Sets"
            />
          </div>

          {/* Title Filters */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Title Filters <span className="text-gray-600">(at least one term must appear in the job title)</span>
            </label>
            <KeywordCheckboxList
              sets={titleSets}
              selectedIds={form.title_set_ids}
              onChange={(id, checked) => setForm(f => ({
                ...f,
                title_set_ids: checked ? [...f.title_set_ids, id] : f.title_set_ids.filter(x => x !== id),
              }))}
              emptyHref="/settings/keywords"
              emptyLabel="create a Title Filter set in Keyword Sets"
            />
          </div>

          <button type="submit" disabled={triggering || form.keyword_set_ids.length === 0}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors">
            {triggering ? 'Starting...' : 'Start Import'}
          </button>
        </form>
      </div>

      {/* Import history */}
      <div>
        <p className="text-white font-medium mb-3">Import History</p>
        {imports.length === 0
          ? <p className="text-gray-600 text-sm">No imports yet.</p>
          : <div className="space-y-2">
              {imports.map(imp => {
                const dupes = (imp.stats?.duplicates_by_url || 0) + (imp.stats?.duplicates_by_employer_title || 0)
                const isExpanded = expandedImport === imp.id
                const payload = imp.input_payload || {}
                return (
                  <div key={imp.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    {/* Main row */}
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-white font-medium capitalize">{imp.source}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          imp.status === 'succeeded' ? 'bg-green-900 text-green-400' :
                          imp.status === 'failed' ? 'bg-red-900 text-red-400' :
                          imp.status === 'running' ? 'bg-yellow-900 text-yellow-400' : 'bg-gray-800 text-gray-400'
                        }`}>
                          {imp.status === 'queued' && '⏳ Queued'}
                          {imp.status === 'running' && '⚙️ Running'}
                          {imp.status === 'succeeded' && '✓ Done'}
                          {imp.status === 'failed' && '✗ Failed'}
                        </span>
                        <span className="text-gray-500 text-xs truncate">
                          {imp.status === 'succeeded' && imp.stats
                            ? `${imp.stats.inserted} new · ${dupes} dupes · ${imp.stats.fetched ?? 0} fetched`
                            : ''}
                          {imp.status === 'failed' && imp.error_message ? imp.error_message : ''}
                          {(imp.status === 'queued' || imp.status === 'running') ? new Date(imp.created_at).toLocaleString() : ''}
                        </span>
                        <button onClick={() => setExpandedImport(isExpanded ? null : imp.id)}
                          className="text-xs text-gray-600 hover:text-gray-400 shrink-0">
                          {isExpanded ? '▲ hide params' : '▼ show params'}
                        </button>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {(imp.status === 'queued' || imp.status === 'running') && (
                          <button onClick={() => handleRefresh(imp.id)} disabled={refreshing === imp.id}
                            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-lg">
                            {refreshing === imp.id ? 'Checking...' : 'Check Status'}
                          </button>
                        )}
                        {imp.status === 'succeeded' && (
                          <>
                            <button onClick={() => handleRefresh(imp.id)} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg">Re-check</button>
                            <Link href="/jobs" className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg">View Jobs →</Link>
                          </>
                        )}
                        {imp.status === 'failed' && (
                          <button onClick={() => handleRefresh(imp.id)} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg">Retry</button>
                        )}
                        <button onClick={() => handleDelete(imp.id)} className="px-3 py-1.5 text-xs bg-red-950 hover:bg-red-900 text-red-400 rounded-lg">Delete</button>
                      </div>
                    </div>

                    {/* Expanded: API call parameters */}
                    {isExpanded && (
                      <div className="border-t border-gray-800 bg-gray-950 px-4 py-3 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Apify API call parameters</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                          <div><span className="text-gray-500">Source:</span> <span className="text-gray-300 capitalize">{imp.source}</span></div>
                          <div><span className="text-gray-500">Max Results:</span> <span className="text-gray-300">{String(payload.maxResults ?? '—')}</span></div>
                          {payload.includeOneInTitle ? (
                            <div className="col-span-2">
                              <span className="text-gray-500">Include One In Title:</span>{' '}
                              <span className="text-yellow-300">{String(payload.includeOneInTitle)}</span>
                            </div>
                          ) : Array.isArray(payload.include_in_title) && payload.include_in_title.length > 0 ? (
                            <div className="col-span-2">
                              <span className="text-gray-500">Title filter terms:</span>{' '}
                              <span className="text-yellow-300">{(payload.include_in_title as string[]).join(', ')}</span>
                            </div>
                          ) : null}
                        </div>
                        {payload.url ? (
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Search URL sent to Apify:</p>
                            <a href={String(payload.url)} target="_blank" rel="noopener noreferrer"
                              className="text-indigo-400 text-xs break-all hover:text-indigo-300">
                              {String(payload.url)}
                            </a>
                          </div>
                        ) : null}
                        <div className="pt-1">
                          <p className="text-gray-600 text-xs">Apify run ID: {imp.apify_run_id || '—'} · Started: {new Date(imp.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        }
      </div>
    </div>
  )
}
