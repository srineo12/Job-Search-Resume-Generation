'use client'

import { useEffect, useState } from 'react'

type KeywordSet = { id: string; name: string; keywords: string[]; is_active: boolean; created_at: string }

export default function KeywordsPage() {
  const [sets, setSets] = useState<KeywordSet[]>([])
  const [newName, setNewName] = useState('')
  const [newKeywords, setNewKeywords] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<KeywordSet | null>(null)

  async function load() {
    const res = await fetch('/api/settings/keywords')
    const d = await res.json()
    setSets(d.keyword_sets ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    const keywords = newKeywords.split('\n').map(k => k.trim()).filter(Boolean)
    await fetch('/api/settings/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, keywords })
    })
    setNewName(''); setNewKeywords(''); setSaving(false); load()
  }

  async function handleUpdate() {
    if (!editing) return
    setSaving(true)
    const keywords = typeof editing.keywords === 'string'
      ? (editing.keywords as string).split('\n').map((k: string) => k.trim()).filter(Boolean)
      : editing.keywords
    await fetch('/api/settings/keywords', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editing.id, name: editing.name, keywords, is_active: editing.is_active })
    })
    setSaving(false); setEditing(null); load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this keyword set?')) return
    await fetch('/api/settings/keywords', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    load()
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Keyword Sets</h1>
        <p className="text-gray-400 text-sm mt-1">Saved keyword groups used when triggering Apify imports.</p>
      </div>

      {/* Create new */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <p className="text-white font-medium mb-4">New Keyword Set</p>
        <div className="space-y-3">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Set name (e.g. Teacher Aide)"
            className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          <textarea value={newKeywords} onChange={e => setNewKeywords(e.target.value)}
            placeholder={"One keyword per line:\nteacher aide\neducation support\nlearning support assistant"}
            rows={5}
            className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-mono" />
          <button onClick={handleCreate} disabled={saving || !newName.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-medium rounded-lg">
            {saving ? 'Saving…' : 'Create Set'}
          </button>
        </div>
      </div>

      {/* Existing sets */}
      <div className="space-y-3">
        {sets.length === 0 && <p className="text-gray-600 text-sm">No keyword sets yet.</p>}
        {sets.map(s => (
          <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            {editing?.id === s.id ? (
              <div className="space-y-3">
                <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <textarea
                  value={Array.isArray(editing.keywords) ? editing.keywords.join('\n') : editing.keywords}
                  onChange={e => setEditing({ ...editing, keywords: e.target.value.split('\n') })}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
                <div className="flex gap-2">
                  <button onClick={handleUpdate} disabled={saving}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg">Save</button>
                  <button onClick={() => setEditing(null)}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{s.name}</p>
                    {s.is_active
                      ? <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full">Active</span>
                      : <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                  </div>
                  <p className="text-gray-500 text-xs mt-1">{s.keywords.length} keywords: {s.keywords.slice(0, 3).join(', ')}{s.keywords.length > 3 ? '…' : ''}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(s)} className="text-xs text-indigo-400 hover:text-indigo-300">Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
