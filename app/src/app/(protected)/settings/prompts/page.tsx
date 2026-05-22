'use client'

import { useEffect, useState } from 'react'

type Prompt = { id: string; prompt_type: string; version: number; content: string; is_active: boolean; notes: string; created_at: string }
type PromptType = 'ranking' | 'resume_generation' | 'cover_letter_generation'

const PROMPT_LABELS: Record<PromptType, string> = {
  ranking: 'Job Ranking',
  resume_generation: 'Resume Generation',
  cover_letter_generation: 'Cover Letter Generation',
}

export default function PromptsPage() {
  const [activeType, setActiveType] = useState<PromptType>('ranking')
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selected, setSelected] = useState<Prompt | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [statusOk, setStatusOk] = useState(true)

  async function loadPrompts(type: PromptType) {
    const res = await fetch(`/api/settings/prompts?type=${type}`)
    const d = await res.json()
    const list: Prompt[] = d.prompts ?? []
    setPrompts(list)
    // Auto-select the active one
    const active = list.find(p => p.is_active) ?? list[0] ?? null
    setSelected(active)
    setEditMode(false)
  }

  useEffect(() => { loadPrompts(activeType) }, [activeType])

  function showStatus(msg: string, ok = true) {
    setStatus(msg); setStatusOk(ok)
    setTimeout(() => setStatus(''), 4000)
  }

  async function handleSaveNew() {
    if (!newContent.trim()) return
    setSaving(true)
    const res = await fetch('/api/settings/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt_type: activeType, content: newContent, notes: newNotes, set_active: true }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) { showStatus(d.error || 'Save failed', false); return }
    setNewContent(''); setNewNotes('')
    showStatus('Saved as new version and set active!')
    loadPrompts(activeType)
  }

  async function handleSaveEdit() {
    if (!selected) return
    setSaving(true)
    const res = await fetch('/api/settings/prompts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, prompt_type: activeType, content: editContent, notes: editNotes }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) { showStatus(d.error || 'Save failed', false); return }
    setEditMode(false)
    showStatus('Changes saved!')
    loadPrompts(activeType)
  }

  async function handleSetActive(prompt: Prompt) {
    const res = await fetch('/api/settings/prompts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: prompt.id, prompt_type: prompt.prompt_type, is_active: true }),
    })
    if (!res.ok) { showStatus('Failed to set active', false); return }
    showStatus('Set as active!')
    loadPrompts(activeType)
  }

  async function handleDelete(prompt: Prompt) {
    if (prompt.is_active) { showStatus('Cannot delete the active version. Set another active first.', false); return }
    if (!confirm(`Delete v${prompt.version}? This cannot be undone.`)) return
    const res = await fetch('/api/settings/prompts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: prompt.id }),
    })
    const d = await res.json()
    if (!res.ok) { showStatus(d.error || 'Delete failed', false); return }
    showStatus('Deleted.')
    loadPrompts(activeType)
  }

  function startEdit(p: Prompt) {
    setSelected(p)
    setEditContent(p.content)
    setEditNotes(p.notes || '')
    setEditMode(true)
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Prompts</h1>
        <p className="text-gray-400 text-sm mt-1">Manage versioned prompts for ranking and document generation.</p>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 mb-6">
        {(Object.keys(PROMPT_LABELS) as PromptType[]).map(type => (
          <button key={type} onClick={() => setActiveType(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeType === type ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'}`}>
            {PROMPT_LABELS[type]}
          </button>
        ))}
      </div>

      {status && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm border ${statusOk ? 'bg-green-950 text-green-400 border-green-800' : 'bg-red-950 text-red-400 border-red-800'}`}>
          {status}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Version list */}
        <div className="col-span-1 space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Versions</p>
          {prompts.length === 0 && <p className="text-gray-600 text-sm">No prompts yet.</p>}
          {prompts.map(p => (
            <div key={p.id}
              onClick={() => { setSelected(p); setEditMode(false) }}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${selected?.id === p.id ? 'border-indigo-500 bg-indigo-950' : 'border-gray-800 bg-gray-900 hover:border-gray-700'}`}>
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">v{p.version}</span>
                {p.is_active && <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full">Active</span>}
              </div>
              {p.notes && <p className="text-gray-500 text-xs mt-1 truncate">{p.notes}</p>}
              <p className="text-gray-600 text-xs mt-1">{new Date(p.created_at).toLocaleDateString()}</p>
            </div>
          ))}

          <button onClick={() => { setSelected(null); setEditMode(false) }}
            className="w-full mt-2 py-2 text-xs text-indigo-400 hover:text-indigo-300 border border-dashed border-gray-700 rounded-lg hover:border-indigo-600 transition-colors">
            + New version
          </button>
        </div>

        {/* Right panel */}
        <div className="col-span-2 space-y-3">
          {selected && !editMode && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-white font-medium">v{selected.version} {selected.is_active ? '(Active)' : ''}</p>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(selected)}
                    className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                    Edit
                  </button>
                  {!selected.is_active && (
                    <button onClick={() => handleSetActive(selected)}
                      className="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 text-white rounded-lg">
                      Set Active
                    </button>
                  )}
                  {!selected.is_active && (
                    <button onClick={() => handleDelete(selected)}
                      className="px-3 py-1.5 text-xs bg-red-900 hover:bg-red-800 text-red-300 rounded-lg">
                      Delete
                    </button>
                  )}
                </div>
              </div>
              {selected.notes && <p className="text-gray-500 text-xs">{selected.notes}</p>}
              <textarea value={selected.content} readOnly
                className="w-full h-96 bg-gray-950 text-gray-300 font-mono text-xs p-4 rounded-lg border border-gray-800 resize-none" />
            </>
          )}

          {selected && editMode && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-white font-medium">Editing v{selected.version}</p>
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} disabled={saving}
                    className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-lg">
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditMode(false)}
                    className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg">
                    Cancel
                  </button>
                </div>
              </div>
              <input value={editNotes} onChange={e => setEditNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                className="w-full h-96 bg-gray-950 text-gray-300 font-mono text-xs p-4 rounded-lg border border-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
            </>
          )}

          {!selected && (
            <>
              <p className="text-sm font-medium text-white">New version for {PROMPT_LABELS[activeType]}</p>
              <input value={newNotes} onChange={e => setNewNotes(e.target.value)}
                placeholder="Notes (optional, e.g. 'Added GTO boost')"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
                placeholder={`Paste your ${PROMPT_LABELS[activeType].toLowerCase()} prompt here…`}
                className="w-full h-80 bg-gray-950 text-gray-300 font-mono text-xs p-4 rounded-lg border border-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
              <button onClick={handleSaveNew} disabled={saving || !newContent.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-medium rounded-lg transition-colors">
                {saving ? 'Saving…' : 'Save as New Version (Set Active)'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
