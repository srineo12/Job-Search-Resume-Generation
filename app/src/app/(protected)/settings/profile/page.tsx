'use client'

import { useEffect, useState } from 'react'

const DEFAULT_PROFILE = {
  contact: { name: '', email: '', phone: '', address: '' },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  certifications: []
}

export default function ProfilePage() {
  const [json, setJson] = useState(JSON.stringify(DEFAULT_PROFILE, null, 2))
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [jsonError, setJsonError] = useState('')

  useEffect(() => {
    fetch('/api/settings/profile')
      .then(r => r.json())
      .then(d => {
        if (d.profile?.profile_json) setJson(JSON.stringify(d.profile.profile_json, null, 2))
      })
  }, [])

  function validateJson(val: string) {
    try { JSON.parse(val); setJsonError(''); return true }
    catch (e: unknown) { setJsonError(e instanceof Error ? e.message : 'Invalid JSON'); return false }
  }

  async function handleSave() {
    if (!validateJson(json)) return
    setSaving(true)
    setStatus('')
    const res = await fetch('/api/settings/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_json: JSON.parse(json) })
    })
    setSaving(false)
    setStatus(res.ok ? 'Saved!' : 'Error saving')
    setTimeout(() => setStatus(''), 3000)
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Candidate Profile</h1>
          <p className="text-gray-400 text-sm mt-1">Your master resume data used for all document generation.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !!jsonError}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>

      {status && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${status === 'Saved!' ? 'bg-green-950 text-green-400 border border-green-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
          {status}
        </div>
      )}

      {jsonError && (
        <div className="mb-4 px-4 py-2 rounded-lg text-sm bg-red-950 text-red-400 border border-red-800">
          JSON Error: {jsonError}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-3">Edit your profile as JSON. All fields are used by the AI for resume generation.</p>
        <textarea
          value={json}
          onChange={e => { setJson(e.target.value); validateJson(e.target.value) }}
          className="w-full h-[600px] bg-gray-950 text-green-400 font-mono text-xs p-4 rounded-lg border border-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          spellCheck={false}
        />
      </div>
    </div>
  )
}
