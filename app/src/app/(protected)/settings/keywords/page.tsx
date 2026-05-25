'use client'

import { useEffect, useState } from 'react'

type KeywordSet = { id: string; name: string; keywords: string[]; set_type: string; is_active: boolean; created_at: string; jobfit_prompt?: string }

function SetSection({
  title, description, setType, accentClass,
}: { title: string; description: string; setType: 'search' | 'title'; accentClass: string }) {
  const [sets, setSets] = useState<KeywordSet[]>([])
  const [newName, setNewName] = useState('')
  const [newKeywords, setNewKeywords] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<KeywordSet | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    const res = await fetch(`/api/settings/keywords?set_type=${setType}`)
    const d = await res.json()
    setSets(d.keyword_sets ?? [])
  }

  useEffect(() => { load() }, [setType])

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    const keywords = newKeywords.split('\n').map(k => k.trim()).filter(Boolean)
    await fetch('/api/settings/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, keywords, set_type: setType }),
    })
    setNewName(''); setNewKeywords(''); setSaving(false); load()
  }

  async function handleUpdate() {
    if (!editing) return
    setSaving(true)
    const keywords = Array.isArray(editing.keywords)
      ? editing.keywords
      : (editing.keywords as unknown as string).split('\n').map((k: string) => k.trim()).filter(Boolean)
    await fetch('/api/settings/keywords', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editing.id, name: editing.name, keywords, is_active: editing.is_active }),
    })
    setSaving(false); setEditing(null); load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this set?')) return
    await fetch('/api/settings/keywords', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  const placeholder = setType === 'search'
    ? 'One keyword per line:\nteacher aide\neducation support\nlearning support'
    : 'One term per line:\nteacher aide\nteaching assistant\nclassroom support'

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-gray-400 text-sm mt-0.5">{description}</p>
      </div>

      {/* Create */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
        <p className="text-white text-sm font-medium mb-3">New {title} Set</p>
        <div className="space-y-3">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Set name (e.g. Teacher Aide Terms)"
            className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <textarea
            value={newKeywords}
            onChange={e => setNewKeywords(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          />
          <button
            onClick={handleCreate}
            disabled={saving || !newName.trim()}
            className={`px-4 py-2 ${accentClass} text-white text-sm font-medium rounded-lg disabled:opacity-50`}
          >
            {saving ? 'Saving…' : 'Create Set'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {sets.length === 0 && <p className="text-gray-600 text-sm">No sets yet.</p>}
        {sets.map(s => (
          <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            {editing?.id === s.id ? (
              <div className="space-y-3">
                <input
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <textarea
                  value={Array.isArray(editing.keywords) ? editing.keywords.join('\n') : editing.keywords}
                  onChange={e => setEditing({ ...editing, keywords: e.target.value.split('\n') })}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={handleUpdate} disabled={saving}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg">Save</button>
                  <button onClick={() => setEditing(null)}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg">Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                {/* Header row — click to expand/collapse */}
                <button
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                  className="w-full flex items-start justify-between text-left"
                >
                  <div>
                    <p className="text-white font-medium text-sm">{s.name}</p>
                    <p className="text-gray-500 text-xs mt-1 leading-relaxed">{s.keywords.join(', ')}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-gray-600 text-xs">{expanded === s.id ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Expanded: job-fit prompt + edit/delete */}
                {expanded === s.id && (
                  <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-1.5">⚡ Saved Job-fit Prompt</p>
                      {s.jobfit_prompt ? (
                        <pre className="text-xs text-gray-300 bg-gray-950 border border-gray-700 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                          {s.jobfit_prompt}
                        </pre>
                      ) : (
                        <p className="text-gray-600 text-xs italic">No prompt generated yet — run Job-fit Score on the Jobs page to generate one.</p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setEditing(s)} className="text-xs text-indigo-400 hover:text-indigo-300">Edit</button>
                      <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function KeywordsPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white">Keyword Sets</h1>
        <p className="text-gray-400 text-sm mt-1">Search term categories used when importing jobs and selecting context for Job-fit Scoring.</p>
      </div>

      <SetSection
        title="Search Terms"
        description="Keywords sent as the Apify search query. Each set is a category you select on the Jobs page before running Job-fit Score."
        setType="search"
        accentClass="bg-indigo-600 hover:bg-indigo-500"
      />
    </div>
  )
}
