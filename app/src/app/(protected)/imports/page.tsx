'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface KeywordSet {
  id: string
  name: string
  keywords: string[]
}

interface Import {
  id: string
  source: 'seek' | 'indeed'
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  stats?: Record<string, number>
  error_message?: string
  created_at: string
  finished_at?: string
}

export default function ImportsPage() {
  const [imports, setImports] = useState<Import[]>([])
  const [keywordSets, setKeywordSets] = useState<KeywordSet[]>([])
  const [triggering, setTriggering] = useState(false)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    source: 'seek' as 'seek' | 'indeed',
    keyword_set_ids: [] as string[],
    location: 'Melbourne VIC',
    max_items: 100,
  })

  useEffect(() => {
    loadKeywordSets()
    loadImports()
    const interval = setInterval(loadImports, 10000)
    return () => clearInterval(interval)
  }, [])

  async function loadKeywordSets() {
    try {
      const res = await fetch('/api/settings/keywords')
      const data = await res.json()
      setKeywordSets(data.keyword_sets || [])
    } catch (err) {
      console.error('Failed to load keyword sets:', err)
    }
  }

  async function loadImports() {
    try {
      const res = await fetch('/api/imports')
      const data = await res.json()
      setImports(data.imports || [])
    } catch (err) {
      console.error('Failed to load imports:', err)
    }
  }

  async function handleTrigger(e: React.FormEvent) {
    e.preventDefault()
    setTriggering(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to trigger import')
        return
      }

      setSuccess(`Import started for ${form.source}. Run ID: ${data.import.apify_run_id}`)
      setForm({ ...form, keyword_set_ids: [] })
      loadImports()
    } catch (err) {
      setError(String(err))
    } finally {
      setTriggering(false)
    }
  }

  async function handleRefresh(importId: string) {
    setRefreshing(importId)
    setError('')

    try {
      const res = await fetch(`/api/imports/${importId}/refresh`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to refresh')
        return
      }

      setSuccess(`Import status: ${data.import.status}`)
      loadImports()
    } catch (err) {
      setError(String(err))
    } finally {
      setRefreshing(null)
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Imports</h1>
        <p className="text-gray-400 text-sm mt-1">Trigger job imports from Seek or Indeed using Apify.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-950 border border-green-800 rounded-lg text-green-400 text-sm">
          {success}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <p className="text-white font-medium mb-6">Trigger New Import</p>

        <form onSubmit={handleTrigger} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value as 'seek' | 'indeed' })}
                disabled={triggering}
                className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              >
                <option value="seek">Seek</option>
                <option value="indeed">Indeed</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 block">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                disabled={triggering}
                className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Max Items</label>
              <input
                type="number"
                value={form.max_items}
                onChange={(e) => setForm({ ...form, max_items: parseInt(e.target.value) })}
                min="10"
                max="1000"
                disabled={triggering}
                className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Keyword Sets</label>
            <div className="space-y-2 bg-gray-950 border border-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto">
              {keywordSets.length === 0 ? (
                <p className="text-gray-600 text-sm">
                  No keyword sets. Create one in{' '}
                  <Link href="/settings/keywords" className="text-indigo-400 hover:text-indigo-300">
                    Settings
                  </Link>
                  .
                </p>
              ) : (
                keywordSets.map((set) => (
                  <label key={set.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.keyword_set_ids.includes(set.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({ ...form, keyword_set_ids: [...form.keyword_set_ids, set.id] })
                        } else {
                          setForm({
                            ...form,
                            keyword_set_ids: form.keyword_set_ids.filter((id) => id !== set.id),
                          })
                        }
                      }}
                      disabled={triggering}
                      className="w-4 h-4 accent-indigo-500 disabled:opacity-50"
                    />
                    <span className="text-white text-sm">{set.name}</span>
                    <span className="text-gray-500 text-xs">({set.keywords?.length || 0} keywords)</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={triggering || form.keyword_set_ids.length === 0 || keywordSets.length === 0}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors"
          >
            {triggering ? 'Starting import...' : 'Start Import'}
          </button>
        </form>
      </div>

      <div>
        <p className="text-white font-medium mb-4">Import History</p>

        {imports.length === 0 ? (
          <p className="text-gray-600 text-sm">No imports yet.</p>
        ) : (
          <div className="space-y-3">
            {imports.map((imp) => (
              <div
                key={imp.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-white font-medium capitalize">{imp.source}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        imp.status === 'succeeded'
                          ? 'bg-green-900 text-green-400'
                          : imp.status === 'failed'
                            ? 'bg-red-900 text-red-400'
                            : imp.status === 'running'
                              ? 'bg-yellow-900 text-yellow-400'
                              : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {imp.status === 'queued' && '⏳ Queued'}
                      {imp.status === 'running' && '⚙️ Running'}
                      {imp.status === 'succeeded' && '✓ Succeeded'}
                      {imp.status === 'failed' && '✗ Failed'}
                    </span>
                  </div>

                  <div className="text-gray-400 text-xs space-y-1">
                    <p>Created: {new Date(imp.created_at).toLocaleString()}</p>
                    {imp.status === 'succeeded' && imp.stats ? (
                      <p>
                        {imp.stats.inserted} inserted, {(imp.stats.duplicates_by_url || 0) + (imp.stats.duplicates_by_employer_title || 0)} duplicates
                      </p>
                    ) : null}
                    {imp.status === 'failed' && imp.error_message ? (
                      <p className="text-red-400">Error: {imp.error_message}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {(imp.status === 'queued' || imp.status === 'running') && (
                    <button
                      onClick={() => handleRefresh(imp.id)}
                      disabled={refreshing === imp.id}
                      className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-lg"
                    >
                      {refreshing === imp.id ? 'Refreshing...' : 'Refresh'}
                    </button>
                  )}

                  {imp.status === 'succeeded' && (
                    <>
                      <button
                        onClick={() => handleRefresh(imp.id)}
                        className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg"
                      >
                        Refresh
                      </button>
                      <Link
                        href={`/jobs?import_id=${imp.id}`}
                        className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg"
                      >
                        View Jobs
                      </Link>
                    </>
                  )}

                  {imp.status === 'failed' && (
                    <button
                      onClick={() => handleRefresh(imp.id)}
                      className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg"
                    >
                      Retry Check
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
