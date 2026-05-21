'use client'

import { useEffect, useState } from 'react'

type StyleVersion = { id: string; version: number; yaml_content: string; is_active: boolean; notes: string; created_at: string }

const DEFAULT_YAML = `# Resume Style Configuration
font:
  family: Arial
  size_body: 10
  size_heading: 11
  size_name: 14

resume_margins_inches:
  top: 0.6
  bottom: 0.6
  left: 0.7
  right: 0.7

cover_letter_margins_inches:
  top: 1.0
  bottom: 1.0
  left: 1.0
  right: 1.0

section_headings_uppercase: true
line_spacing: 1.15

resume_sections:
  - SUMMARY
  - KEY SKILLS
  - CERTIFICATIONS AND CHECKS
  - PROFESSIONAL EXPERIENCE
  - EDUCATION
  - ADDITIONAL INFORMATION

cover_letter_max_words: 360
resume_bullet_max_words: 24
`

export default function StylePage() {
  const [styles, setStyles] = useState<StyleVersion[]>([])
  const [selected, setSelected] = useState<StyleVersion | null>(null)
  const [newYaml, setNewYaml] = useState(DEFAULT_YAML)
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [isNew, setIsNew] = useState(true)

  async function loadStyles() {
    const res = await fetch('/api/settings/style')
    const d = await res.json()
    setStyles(d.styles ?? [])
    const active = d.styles?.find((s: StyleVersion) => s.is_active)
    if (active) { setSelected(active); setIsNew(false) }
  }

  useEffect(() => { loadStyles() }, [])

  async function handleSave() {
    setSaving(true)
    await fetch('/api/settings/style', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yaml_content: newYaml, notes: newNotes, set_active: true })
    })
    setSaving(false); setNewNotes('')
    setStatus('Saved as new version!'); setTimeout(() => setStatus(''), 3000)
    loadStyles()
  }

  async function handleSetActive(style: StyleVersion) {
    await fetch('/api/settings/style', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: style.id, is_active: true })
    })
    loadStyles()
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Style Config</h1>
        <p className="text-gray-400 text-sm mt-1">YAML configuration for resume and cover letter rendering.</p>
      </div>

      {status && <div className="mb-4 px-4 py-2 rounded-lg text-sm bg-green-950 text-green-400 border border-green-800">{status}</div>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Versions</p>
          <button onClick={() => { setIsNew(true); setSelected(null) }}
            className={`w-full p-3 rounded-lg border text-left text-sm transition-colors ${isNew ? 'border-indigo-500 bg-indigo-950 text-white' : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700'}`}>
            + New version
          </button>
          {styles.map(s => (
            <div key={s.id} onClick={() => { setSelected(s); setIsNew(false) }}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${selected?.id === s.id && !isNew ? 'border-indigo-500 bg-indigo-950' : 'border-gray-800 bg-gray-900 hover:border-gray-700'}`}>
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">v{s.version}</span>
                {s.is_active && <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full">Active</span>}
              </div>
              {s.notes && <p className="text-gray-500 text-xs mt-1 truncate">{s.notes}</p>}
            </div>
          ))}
        </div>

        <div className="col-span-2">
          {isNew ? (
            <div className="space-y-4">
              <input value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Notes (optional)"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <textarea value={newYaml} onChange={e => setNewYaml(e.target.value)}
                className="w-full h-96 bg-gray-950 text-yellow-300 font-mono text-xs p-4 rounded-lg border border-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-medium rounded-lg">
                {saving ? 'Saving…' : 'Save as New Version (Set Active)'}
              </button>
            </div>
          ) : selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-white font-medium">v{selected.version} {selected.is_active ? '— Active' : ''}</p>
                {!selected.is_active && (
                  <button onClick={() => handleSetActive(selected)}
                    className="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 text-white rounded-lg">
                    Set Active
                  </button>
                )}
              </div>
              <textarea value={selected.yaml_content} readOnly
                className="w-full h-96 bg-gray-950 text-yellow-300 font-mono text-xs p-4 rounded-lg border border-gray-800 resize-none" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
