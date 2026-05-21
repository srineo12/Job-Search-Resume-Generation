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
  const [editing, setEditing] = useState<Prompt | null>(null)
  const [newContent, setNewContent] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  async function loadPrompts(type: PromptType) {
    const res = await fetch(`/api/settings/prompts?type=${type}`)
    const d = await res.json()
    setPrompts(d.prompts ?? [])
  }

  useEffect(() => { loadPrompts(activeType) }, [activeType])

  async function handleSaveNew() {
    if (!newContent.trim()) return
    setSaving(true)
    await fetch('/api/settings/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt_type: activeType, content: newContent, notes: newNotes, set_active: true })
    })
    setNewContent(''); setNewNotes(''); setSaving(false)
    setStatus('Saved as new version!')
    setTimeout(() => setStatus(''), 3000)
    loadPrompts(activeType)
  }

  async function handleSetActive(prompt: Prompt) {
    await fetch('/api/settings/prompts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: prompt.id, prompt_type: prompt.prompt_type, is_active: true })
    })
    loadPrompts(activeType)
  }

  const activePrompt = prompts.find(p => p.is_active)

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

      {status && <div className="mb-4 px-4 py-2 rounded-lg text-sm bg-green-950 text-green-400 border border-green-800">{status}</div>}

      <div className="grid grid-cols-3 gap-6">
        {/* Version list */}
        <div className="col-span-1 space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Versions</p>
          {prompts.length === 0 && <p className="text-gray-600 text-sm">No prompts yet.</p>}
          {prompts.map(p => (
            <div key={p.id} onClick={() => setEditing(p)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${editing?.id === p.id ? 'border-indigo-500 bg-indigo-950' : 'border-gray-800 bg-gray-900 hover:border-gray-700'}`}>
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">v{p.version}</span>
                {p.is_active && <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full">Active</span>}
              </div>
              {p.notes && <p className="text-gray-500 text-xs mt-1 truncate">{p.notes}</p>}
              <p className="text-gray-600 text-xs mt-1">{new Date(p.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>

        {/* Editor / viewer */}
        <div className="col-span-2 space-y-4">
          {editing ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-white font-medium">v{editing.version} {editing.is_active ? '(Active)' : ''}</p>
                {!editing.is_active && (
                  <button onClick={() => handleSetActive(editing)}
                    className="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 text-white rounded-lg">
                    Set Active
                  </button>
                )}
              </div>
              <textarea value={editing.content} readOnly
                className="w-full h-80 bg-gray-950 text-gray-300 font-mono text-xs p-4 rounded-lg border border-gray-800 resize-none" />
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-white">New version for {PROMPT_LABELS[activeType]}</p>
              <input value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Notes (optional)"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
                placeholder={`Paste your ${PROMPT_LABELS[activeType].toLowerCase()} prompt here…`}
                className="w-full h-72 bg-gray-950 text-gray-300 font-mono text-xs p-4 rounded-lg border border-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
              <button onClick={handleSaveNew} disabled={saving || !newContent.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-medium rounded-lg transition-colors">
                {saving ? 'Saving…' : 'Save as New Version (Set Active)'}
              </button>
            </>
          )}
          {editing && (
            <button onClick={() => setEditing(null)} className="text-sm text-indigo-400 hover:text-indigo-300">
              + Add new version
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
