'use client'

import { useEffect, useState } from 'react'

type Actor = { id: string; source: string; actor_id: string; default_input: Record<string, unknown>; is_active: boolean }

const SOURCES = ['seek', 'indeed'] as const

export default function ActorsPage() {
  const [actors, setActors] = useState<Actor[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, { actor_id: string; default_input: string }>>({
    seek: { actor_id: '', default_input: '{\n  "maxItems": 100\n}' },
    indeed: { actor_id: '', default_input: '{\n  "maxItems": 100\n}' },
  })

  async function load() {
    const res = await fetch('/api/settings/actors')
    const d = await res.json()
    const list: Actor[] = d.actors ?? []
    setActors(list)
    const updates: typeof form = { ...form }
    list.forEach(a => {
      updates[a.source] = {
        actor_id: a.actor_id,
        default_input: JSON.stringify(a.default_input, null, 2)
      }
    })
    setForm(updates)
  }

  useEffect(() => { load() }, [])

  async function handleSave(source: string) {
    setSaving(source)
    let parsed = {}
    try { parsed = JSON.parse(form[source].default_input) } catch { }
    await fetch('/api/settings/actors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, actor_id: form[source].actor_id, default_input: parsed })
    })
    setSaving(null); load()
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Apify Actors</h1>
        <p className="text-gray-400 text-sm mt-1">Configure Apify actor IDs and default inputs per job source.</p>
      </div>

      <div className="space-y-6">
        {SOURCES.map(source => (
          <div key={source} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-medium capitalize">{source}</p>
              {actors.find(a => a.source === source) && (
                <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full">Saved</span>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Actor ID</label>
                <input
                  value={form[source]?.actor_id ?? ''}
                  onChange={e => setForm(f => ({ ...f, [source]: { ...f[source], actor_id: e.target.value } }))}
                  placeholder={`e.g. username/${source}-scraper`}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Default Input (JSON)</label>
                <textarea
                  value={form[source]?.default_input ?? ''}
                  onChange={e => setForm(f => ({ ...f, [source]: { ...f[source], default_input: e.target.value } }))}
                  rows={5}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
              <button
                onClick={() => handleSave(source)}
                disabled={saving === source || !form[source]?.actor_id?.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-medium rounded-lg"
              >
                {saving === source ? 'Saving…' : `Save ${source.charAt(0).toUpperCase() + source.slice(1)} Actor`}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
