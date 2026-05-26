'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Job {
  id: string
  source_job_id: string
  title: string
  employer: string
  location: string
  work_type: string
  salary_text: string
  posted_at: string
  url: string
  source: string
  status: string
  ai_score: number | null
  ai_priority: 'hot' | 'good' | 'maybe' | 'avoid' | null
  ai_ranking: {
    beginner_friendly?: string
    gto_traineeship?: string
    training_offered?: string
    cert3_pathway?: string
    prior_school_required?: string
    qualification_risk?: string
    experience_risk?: string
    recommended_action?: string
    resume_version?: string
    cover_letter_needed?: string
    reason?: string
    key_skills?: string
    red_flags?: string
    tailoring_notes?: string
    ranking_comments?: string[]
    role_description?: string[]
    ats_score?: number
    ats_verdict?: string
    ats_matched_keywords?: string[]
    ats_missing_keywords?: string[]
  } | null
  ai_ranked_at: string | null
  created_at: string
  category: string
  description_text: string | null
  description_html: string | null
  raw_payload: {
    numApplicants?: number
    resumePercentage?: number
    coverLetterPercentage?: number
    salary?: string
    workTypes?: string
    workArrangements?: string
    jobLink?: string
    applyLink?: string
    isExternalApply?: boolean
    isVerified?: boolean
    listedAt?: string
    expiresAtUtc?: string
    joblocationInfo?: { area?: string; displayLocation?: string; location?: string; suburb?: string }
    classificationInfo?: { classification?: string; subClassification?: string }
    content?: { jobHook?: string; bulletPoints?: string[]; sections?: string[]; unEditedContent?: string }
    employerQuestions?: string[]
    [key: string]: unknown
  } | null
}

interface Counts {
  total: number; hot: number; good: number; maybe: number; avoid: number; unranked: number
  open: number; generated: number; applied: number; discarded: number
}

// ─── Workflow helpers ─────────────────────────────────────────────────────────

function wfOf(status: string): 'open' | 'generated' | 'applied' | 'discarded' {
  if (status === 'documents_generated') return 'generated'
  if (status === 'applied') return 'applied'
  if (status === 'skipped') return 'discarded'
  return 'open'
}

const WF_STYLE: Record<string, string> = {
  open:      'bg-gray-700 text-white',
  generated: 'bg-blue-800 text-blue-200',
  applied:   'bg-green-800 text-green-200',
  discarded: 'bg-red-950 text-red-400',
}
const WF_LABEL: Record<string, string> = {
  open: 'Open', generated: 'Generated', applied: 'Applied', discarded: 'Discarded',
}

// ─── Column definitions ───────────────────────────────────────────────────────

interface ColDef {
  key: string; label: string; defaultWidth: number
  sortable: boolean; filterable: boolean
  filterType: 'text' | 'select' | 'range'
  filterOptions?: string[]
  sticky?: boolean
}

const ALL_COLS: ColDef[] = [
  { key: 'source_job_id',     label: 'Job ID',      defaultWidth: 90,  sortable: true,  filterable: true,  filterType: 'text' },
  { key: 'title',             label: 'Job Title',   defaultWidth: 230, sortable: true,  filterable: true,  filterType: 'text', sticky: true },
  { key: 'employer',          label: 'Employer',    defaultWidth: 140, sortable: true,  filterable: true,  filterType: 'text' },
  { key: 'location',          label: 'Location',    defaultWidth: 160, sortable: true,  filterable: true,  filterType: 'text' },
  { key: 'role_description',  label: 'Role',        defaultWidth: 190, sortable: false, filterable: false, filterType: 'text' },
  { key: 'ranking_comments',  label: 'Why',         defaultWidth: 190, sortable: false, filterable: false, filterType: 'text' },
  { key: 'ai_score',          label: 'Score',       defaultWidth: 65,  sortable: true,  filterable: true,  filterType: 'range' },
  { key: 'ats_score',         label: 'ATS',         defaultWidth: 65,  sortable: true,  filterable: true,  filterType: 'range' },
  { key: 'ai_priority',       label: 'Priority',    defaultWidth: 95,  sortable: true,  filterable: true,  filterType: 'select', filterOptions: ['hot','good','maybe','avoid'] },
  { key: 'workflow_status',   label: 'Status',      defaultWidth: 160, sortable: true,  filterable: true,  filterType: 'select', filterOptions: ['open','generated','applied','discarded'] },
  { key: 'salary_text',       label: 'Salary',      defaultWidth: 145, sortable: false, filterable: true,  filterType: 'text' },
  { key: 'work_type',         label: 'Type',        defaultWidth: 100, sortable: true,  filterable: true,  filterType: 'select', filterOptions: [] },
  { key: 'arrangement',       label: 'Arrangement', defaultWidth: 115, sortable: true,  filterable: true,  filterType: 'select', filterOptions: [] },
  { key: 'applicants',        label: 'Applicants',  defaultWidth: 90,  sortable: true,  filterable: false, filterType: 'text' },
  { key: 'posted_at',         label: 'Posted',      defaultWidth: 80,  sortable: true,  filterable: false, filterType: 'text' },
  { key: 'imported_at',       label: 'Fetched',     defaultWidth: 80,  sortable: true,  filterable: false, filterType: 'text' },
  { key: 'category',          label: 'Category',    defaultWidth: 130, sortable: true,  filterable: true,  filterType: 'select', filterOptions: [] },
]

const LS_KEY = 'jobs-col-layout-v3'

function loadLayout() {
  if (typeof window === 'undefined') return null
  try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : null } catch { return null }
}
function saveLayout(order: string[], widths: Record<string, number>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ order, widths })) } catch {}
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────

const PRI_STYLE: Record<string, string> = {
  hot: 'bg-red-900/60 text-red-300 border border-red-700',
  good: 'bg-green-900/60 text-green-300 border border-green-700',
  maybe: 'bg-yellow-900/60 text-yellow-300 border border-yellow-700',
  avoid: 'bg-gray-800 text-gray-400 border border-gray-700',
}
const PRI_LABEL: Record<string, string> = {
  hot: '🔥 Hot', good: '✅ Good', maybe: '🤔 Maybe', avoid: '❌ Avoid',
}

function stripBulletPrefix(s: string): string {
  return s.replace(/^bullet:\s*/i, '')
}

function relDate(d: string) {
  if (!d) return '—'
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return '1d ago'
  if (diff < 30) return `${diff}d ago`
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function JobsPage() {
  const [jobs, setJobs]         = useState<Job[]>([])
  const [counts, setCounts]     = useState<Counts>({ total:0,hot:0,good:0,maybe:0,avoid:0,unranked:0,open:0,generated:0,applied:0,discarded:0 })
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [scoring,    setScoring]    = useState(false)
  const [scoreMsg,   setScoreMsg]   = useState('')
  const [generating, setGenerating] = useState<string | null>(null)
  // Category (keyword set) selector — required before running Job-fit Score
  const [keywordSets,       setKeywordSets]       = useState<{ id: string; name: string; keywords: string[] }[]>([])
  const [selectedCategory,  setSelectedCategory]  = useState<string>('')

  // Toast notifications
  const [toasts, setToasts] = useState<Array<{ id: number; type: 'success'|'error'|'info'; msg: string; sub?: string }>>([])
  const toastId = useRef(0)
  function toast(type: 'success'|'error'|'info', msg: string, sub?: string) {
    const id = ++toastId.current
    setToasts(t => [...t, { id, type, msg, sub }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 7000)
  }

  // Filters — multi-select Sets; empty Set = show all
  const [catFilters,  setCatFilters]  = useState<Set<string>>(new Set())
  const [priFilters,  setPriFilters]  = useState<Set<string>>(new Set())
  const [wfFilters,   setWfFilters]   = useState<Set<string>>(new Set())
  const [colFilters, setColFilters] = useState<Record<string, string>>({})
  const [scoreMin,   setScoreMin]   = useState('')

  // Sort
  const [sortKey, setSortKey] = useState<string>('ai_score')
  const [sortDir, setSortDir] = useState<'asc'|'desc'|null>('desc')

  // Column layout
  const saved = loadLayout()
  const [colOrder,  setColOrder]  = useState<string[]>(saved?.order  ?? ALL_COLS.map(c => c.key))
  const [colWidths, setColWidths] = useState<Record<string,number>>(saved?.widths ?? Object.fromEntries(ALL_COLS.map(c => [c.key, c.defaultWidth])))
  const [layoutSaved, setLayoutSaved] = useState(false)

  // Drag for reorder
  const dragFrom = useRef<string | null>(null)

  const loadJobs = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/jobs')
    const d = await res.json()
    setJobs(d.jobs || [])
    setCounts(d.counts || {})
    setLoading(false)
  }, [])

  useEffect(() => { loadJobs() }, [loadJobs])

  // Load keyword sets (search type only) for the category dropdown
  useEffect(() => {
    fetch('/api/settings/keywords?set_type=search')
      .then(r => r.json())
      .then(d => setKeywordSets(d.keyword_sets ?? []))
      .catch(() => {})
  }, [])

  // Global cursor: wait while any long operation is running
  const isBusy = scoring || !!generating
  useEffect(() => {
    document.body.style.cursor = isBusy ? 'wait' : 'default'
    return () => { document.body.style.cursor = 'default' }
  }, [isBusy])

  // ── Filter + sort pipeline ────────────────────────────────────────────────
  const visible = jobs
    .filter(j => {
      // Category multi-select (empty = show all)
      if (catFilters.size > 0 && !catFilters.has(j.category ?? '')) return false
      // Priority multi-select (empty = show all)
      if (priFilters.size > 0) {
        const matchesPri = priFilters.has(j.ai_priority ?? '') ||
          (priFilters.has('unranked') && !j.ai_ranked_at)
        if (!matchesPri) return false
      }
      // Workflow multi-select (empty = show all)
      if (wfFilters.size > 0 && !wfFilters.has(wfOf(j.status))) return false
      if (colFilters.title     && !j.title?.toLowerCase().includes(colFilters.title.toLowerCase()))    return false
      if (colFilters.employer  && !j.employer?.toLowerCase().includes(colFilters.employer.toLowerCase())) return false
      if (colFilters.location  && !j.location?.toLowerCase().includes(colFilters.location.toLowerCase())) return false
      if (colFilters.salary_text && !j.salary_text?.toLowerCase().includes(colFilters.salary_text.toLowerCase())) return false
      if (colFilters.work_type && j.work_type !== colFilters.work_type) return false
      if (colFilters.arrangement && (j.raw_payload?.workArrangements ?? '') !== colFilters.arrangement) return false
      if (colFilters.ai_priority && j.ai_priority !== colFilters.ai_priority) return false
      if (colFilters.workflow_status && wfOf(j.status) !== colFilters.workflow_status) return false
      if (colFilters.category && j.category !== colFilters.category) return false
      if (colFilters.ats_score && (j.ai_ranking?.ats_score ?? 0) < parseInt(colFilters.ats_score)) return false
      if (scoreMin && (j.ai_score ?? 0) < parseInt(scoreMin)) return false
      return true
    })
    .sort((a, b) => {
      if (!sortKey || !sortDir) return 0
      let av: unknown, bv: unknown
      if (sortKey === 'ai_score')     { av = a.ai_score ?? -1; bv = b.ai_score ?? -1 }
      else if (sortKey === 'ats_score') { av = a.ai_ranking?.ats_score ?? -1; bv = b.ai_ranking?.ats_score ?? -1 }
      else if (sortKey === 'posted_at') { av = a.posted_at; bv = b.posted_at }
      else if (sortKey === 'employer')  { av = a.employer; bv = b.employer }
      else if (sortKey === 'title')     { av = a.title; bv = b.title }
      else if (sortKey === 'location')  { av = a.location; bv = b.location }
      else if (sortKey === 'category')  { av = a.category; bv = b.category }
      else if (sortKey === 'ai_priority') { const o={hot:4,good:3,maybe:2,avoid:1} as Record<string,number>; av=o[a.ai_priority??'']??0; bv=o[b.ai_priority??'']??0 }
      else if (sortKey === 'workflow_status') { av = wfOf(a.status); bv = wfOf(b.status) }
      else if (sortKey === 'applicants') { av = a.raw_payload?.numApplicants ?? -1; bv = b.raw_payload?.numApplicants ?? -1 }
      else return 0
      if (av === bv) return 0
      const cmp = (av as string | number) < (bv as string | number) ? -1 : 1
      return sortDir === 'asc' ? cmp : -cmp
    })

  // Unique values for select filters
  const categories   = [...new Set(jobs.map(j => j.category).filter(Boolean))].sort()
  const workTypes    = [...new Set(jobs.map(j => j.work_type).filter(Boolean))]
  const arrangements = [...new Set(jobs.map(j => j.raw_payload?.workArrangements as string).filter(Boolean))]

  // ── Column resize ─────────────────────────────────────────────────────────
  function startResize(key: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = colWidths[key] ?? 120
    function onMove(ev: MouseEvent) {
      setColWidths(prev => ({ ...prev, [key]: Math.max(50, startW + ev.clientX - startX) }))
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // ── Column sort (double-click) ────────────────────────────────────────────
  function onHeaderDblClick(key: string, col: ColDef) {
    if (!col.sortable) return
    if (sortKey !== key) { setSortKey(key); setSortDir('desc') }
    else if (sortDir === 'desc') setSortDir('asc')
    else { setSortDir(null); setSortKey('') }
  }

  // ── Column reorder (drag) ─────────────────────────────────────────────────
  function onDragStart(key: string) { dragFrom.current = key }
  function onDrop(targetKey: string) {
    if (!dragFrom.current || dragFrom.current === targetKey) return
    const from = dragFrom.current
    setColOrder(prev => {
      const arr = [...prev]
      const fi = arr.indexOf(from), ti = arr.indexOf(targetKey)
      arr.splice(fi, 1); arr.splice(ti, 0, from)
      return arr
    })
    dragFrom.current = null
  }

  // ── Save layout ───────────────────────────────────────────────────────────
  function handleSaveLayout() {
    saveLayout(colOrder, colWidths)
    setLayoutSaved(true)
    setTimeout(() => setLayoutSaved(false), 2000)
  }

  // ── Workflow status update ────────────────────────────────────────────────
  async function setWorkflow(jobId: string, workflow: string, url?: string) {
    if (workflow === 'applied' && url) window.open(url, '_blank')
    await fetch('/api/jobs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: jobId, workflow }),
    })
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j
      const dbStatus = workflow === 'generated' ? 'documents_generated'
        : workflow === 'applied' ? 'applied'
        : workflow === 'discarded' ? 'skipped'
        : j.ai_ranked_at ? 'ranked' : 'imported'
      return { ...j, status: dbStatus }
    }))
  }

  // ── Bulk workflow ─────────────────────────────────────────────────────────
  async function bulkWorkflow(workflow: string) {
    if (workflow === 'generated') {
      // Bulk generate — only Open jobs
      const openIds = [...selected].filter(id => wfOf(jobs.find(j => j.id === id)?.status ?? '') === 'open')
      if (!openIds.length) { toast('info', 'No Open jobs selected for generation'); setSelected(new Set()); return }
      let ok = 0, fail = 0
      toast('info', `Generating ${openIds.length} document set${openIds.length > 1 ? 's' : ''}…`, 'Each takes ~10s. Downloads will appear one by one.')
      for (const id of openIds) {
        const success = await handleGenerate(id)
        success ? ok++ : fail++
      }
      const msg = fail === 0
        ? `✓ ${ok} document set${ok > 1 ? 's' : ''} generated — check your Downloads folder`
        : `${ok} succeeded, ${fail} failed`
      toast(fail === 0 ? 'success' : 'error', msg, 'ZIP files saved to your browser Downloads folder')
    } else {
      for (const id of selected) {
        const job = jobs.find(j => j.id === id)
        await setWorkflow(id, workflow, workflow === 'applied' ? job?.url : undefined)
      }
    }
    setSelected(new Set())
  }

  // ── Job-fit Score ─────────────────────────────────────────────────────────
  async function handleJobfitScore() {
    if (!selectedCategory) return
    setScoring(true)
    let total = 0
    const jobIds = selected.size > 0 ? [...selected] : undefined

    setScoreMsg('Building scoring context from your profile…')

    if (jobIds) {
      // ── Path A: score specific selected jobs (single call) ──
      setScoreMsg(`Scoring ${jobIds.length} selected job${jobIds.length > 1 ? 's' : ''}…`)
      try {
        const res = await fetch('/api/jobs/jobfit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword_set_id: selectedCategory, job_ids: jobIds }),
        })
        const d = await res.json()
        if (!res.ok) {
          setScoreMsg(`⚠️ ${d.error ?? 'Scoring failed'}`)
        } else {
          total = d.scored || 0
          if (total > 0) {
            setScoreMsg(`✓ ${total} job${total > 1 ? 's' : ''} scored`)
            loadJobs()
          } else if (d.errors > 0) {
            setScoreMsg(`⚠️ ${d.message}`)
          } else {
            // scored=0, no errors → those IDs weren't found (stale selection after delete/reimport)
            // Fall through to score all unscored instead
            setScoreMsg('Selection was stale — scoring all unscored jobs instead…')
            await scoreAllUnscored(selectedCategory, (n, msg) => { total = n; setScoreMsg(msg) })
          }
        }
      } catch (err) {
        setScoreMsg(`⚠️ ${err instanceof Error ? err.message : String(err)}`)
      }
    } else {
      // ── Path B: score all unscored jobs ──
      await scoreAllUnscored(selectedCategory, (n, msg) => { total = n; setScoreMsg(msg) })
    }

    if (total > 0) {
      setScoreMsg(`✓ ${total} job${total > 1 ? 's' : ''} scored`)
      loadJobs()
    } else if (total === 0 && !jobIds) {
      setScoreMsg('✓ All jobs already scored')
    }

    setTimeout(() => { setScoring(false); setScoreMsg('') }, 5000)
  }

  // Helper: loops /api/jobs/jobfit until remaining === 0 or nothing scores
  async function scoreAllUnscored(
    categoryId: string,
    onProgress: (total: number, msg: string) => void,
  ) {
    let total = 0
    let maxRounds = 60 // safety cap — 60 × 5 = 300 jobs max
    while (maxRounds-- > 0) {
      onProgress(total, `Scoring… ${total} done`)
      const res = await fetch('/api/jobs/jobfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword_set_id: categoryId, limit: 5 }),
      })
      const d = await res.json()
      if (!res.ok) { onProgress(total, `⚠️ ${d.error ?? 'Scoring failed'}`); return }
      total += d.scored || 0
      if (d.remaining === 0) break                        // all done
      if (!d.scored && d.errors === 0) break              // nothing to score
      if (!d.scored && d.errors > 0) {                    // errors but nothing scored — stop looping
        onProgress(total, `⚠️ ${d.message}`); return
      }
      onProgress(total, `Scored ${total}… ${d.remaining} remaining`)
    }
    return total
  }

  async function handleDeleteJob(id: string) {
    if (!confirm('Delete this job?')) return
    await fetch('/api/jobs', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id}) })
    loadJobs()
  }

  async function handleGenerate(jobId: string): Promise<boolean> {
    setGenerating(jobId)
    try {
      const res = await fetch(`/api/jobs/${jobId}/generate`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast('error', 'Generation failed', d.error ?? res.statusText)
        return false
      }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') ?? ''
      const filename = cd.match(/filename="([^"]+)"/)?.[1] ?? 'documents.zip'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      // Read ATS score from response headers and update local state immediately
      const atsScore   = res.headers.get('X-ATS-Score')
      const atsVerdict = res.headers.get('X-ATS-Verdict') ?? undefined
      const atsMatched = res.headers.get('X-ATS-Matched')?.split('|').filter(Boolean) ?? []
      const atsMissing = res.headers.get('X-ATS-Missing')?.split('|').filter(Boolean) ?? []
      setJobs(prev => prev.map(j => j.id === jobId ? {
        ...j,
        status: 'documents_generated',
        ai_ranking: {
          ...j.ai_ranking,
          ...(atsScore ? {
            ats_score:            Number(atsScore),
            ats_verdict:          atsVerdict,
            ats_matched_keywords: atsMatched,
            ats_missing_keywords: atsMissing,
          } : {}),
        },
      } : j))
      setCounts(prev => ({ ...prev, open: Math.max(0, prev.open - 1), generated: prev.generated + 1 }))
      const atsLabel = atsScore ? `  ·  ATS ${atsScore}/100` : ''
      toast('success', `✓ Documents ready${atsLabel}`, `${filename}  ·  Resume + Cover Letter`)
      return true
    } catch (err) {
      toast('error', 'Generation error', err instanceof Error ? err.message : String(err))
      return false
    } finally {
      setGenerating(null)
    }
  }

  function toggleSelect(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    if (selected.size === visible.length) setSelected(new Set())
    else setSelected(new Set(visible.map(j => j.id)))
  }

  // ── Ordered column defs ───────────────────────────────────────────────────
  const orderedCols = colOrder.map(k => ALL_COLS.find(c => c.key === k)!).filter(Boolean)

  // ─────────────────────────────────────────────────────────────────────────
  const TOAST_STYLE: Record<string, string> = {
    success: 'bg-green-950 border-green-700 text-green-200',
    error:   'bg-red-950 border-red-700 text-red-300',
    info:    'bg-indigo-950 border-indigo-700 text-indigo-200',
  }

  return (
    <div className="max-w-full">

      {/* ── Toast stack ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md">
        {toasts.map(t => (
          <div key={t.id} data-testid={`toast-${t.type}`} className={`border rounded-xl px-4 py-3 shadow-2xl text-sm ${TOAST_STYLE[t.type]}`}>
            <div className="font-semibold">{t.msg}</div>
            {t.sub && <div className="mt-1 text-xs opacity-75 break-all">{t.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Jobs <span className="text-xs font-normal text-gray-600 ml-1">v0.7.3</span></h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {counts.total} total · {counts.hot} hot · {counts.good} good · {counts.unranked} unscored
          </p>
        </div>

        {/* Right-side actions */}
        <div className="flex gap-2 flex-wrap items-center">
          {selected.size > 0 && (
            <>
              <span className="text-gray-500 text-xs">{selected.size} selected:</span>
              <button onClick={() => bulkWorkflow('generated')} disabled={!!generating} className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 disabled:opacity-60 text-white text-xs rounded-lg flex items-center gap-1.5">
                {generating ? <><span className="animate-spin inline-block">⚙</span> Generating…</> : <>📄 Generate</>}
              </button>
              <button onClick={() => bulkWorkflow('applied')}   className="px-3 py-1.5 bg-green-800 hover:bg-green-700 text-white text-xs rounded-lg">✓ Apply</button>
              <button onClick={() => bulkWorkflow('discarded')} className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white text-xs rounded-lg">✗ Discard</button>
              <button onClick={() => bulkWorkflow('open')}      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg">↺ Re-open</button>
              <button onClick={async () => {
                if (!confirm(`Delete ${selected.size} job${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return
                for (const id of selected) {
                  await fetch('/api/jobs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
                }
                setSelected(new Set())
                loadJobs()
              }} className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-400 text-xs rounded-lg">🗑 Delete</button>
            </>
          )}
          {/* Category dropdown — required to enable Job-fit Score */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="">Category…</option>
            {keywordSets.map(ks => (
              <option key={ks.id} value={ks.id}>{ks.name}</option>
            ))}
          </select>
          <button
            onClick={handleJobfitScore}
            disabled={scoring || !selectedCategory}
            title={!selectedCategory ? 'Select a category first' : `Score unscored jobs in ${keywordSets.find(k => k.id === selectedCategory)?.name ?? 'selected category'}`}
            className="px-4 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-xs font-medium rounded-lg">
            {scoring ? '⚙️ Scoring…' : `⚡ Job-fit Score`}
          </button>
          <button onClick={handleSaveLayout}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${layoutSaved ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
            {layoutSaved ? '✓ Saved' : '💾 Save Layout'}
          </button>
        </div>
      </div>

      {scoreMsg && (
        <div className="mb-3 p-2.5 bg-indigo-950 border border-indigo-800 rounded-lg text-indigo-300 text-xs">{scoreMsg}</div>
      )}

      {/* ── Category + Priority + Status filter bar ── */}
      <div className="flex flex-col gap-2 mb-4">

        {/* Category pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-gray-400 text-sm font-medium w-20 shrink-0">Category:</span>
            <div className="flex gap-1.5 flex-wrap">
              {categories.map(cat => {
                const on = catFilters.has(cat)
                return (
                  <button key={cat}
                    onClick={() => setCatFilters(s => { const n = new Set(s); n.has(cat) ? n.delete(cat) : n.add(cat); return n })}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors border ${on ? 'bg-teal-700 border-teal-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                    {cat}
                  </button>
                )
              })}
              {catFilters.size > 0 && (
                <button onClick={() => setCatFilters(new Set())} className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-300">✕ clear</button>
              )}
            </div>
          </div>
        )}

        {/* Priority + Status in one row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Priority multi-select */}
          <span className="text-gray-400 text-sm font-medium w-20 shrink-0">Priority:</span>
          <div className="flex gap-1.5 flex-wrap">
            {([
              { k:'hot',      l:`🔥 Hot (${counts.hot})` },
              { k:'good',     l:`✅ Good (${counts.good})` },
              { k:'maybe',    l:`🤔 Maybe (${counts.maybe})` },
              { k:'avoid',    l:`❌ Avoid (${counts.avoid})` },
              { k:'unranked', l:`⏳ Unranked (${counts.unranked})` },
            ] as {k:string,l:string}[]).map(t => {
              const on = priFilters.has(t.k)
              return (
                <button key={t.k}
                  onClick={() => setPriFilters(s => { const n = new Set(s); n.has(t.k) ? n.delete(t.k) : n.add(t.k); return n })}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors border ${on ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                  {t.l}
                </button>
              )
            })}
            {priFilters.size > 0 && (
              <button onClick={() => setPriFilters(new Set())} className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-300">✕</button>
            )}
          </div>

          <div className="w-px bg-gray-700 self-stretch" />

          {/* Workflow status multi-select */}
          <span className="text-gray-400 text-sm font-medium shrink-0">Status:</span>
          <div className="flex gap-1.5 flex-wrap">
            {([
              { k:'open',      l:`Open (${counts.open})` },
              { k:'generated', l:`Generated (${counts.generated})` },
              { k:'applied',   l:`Applied (${counts.applied})` },
              { k:'discarded', l:`Discarded (${counts.discarded})` },
            ] as {k:string,l:string}[]).map(t => {
              const on = wfFilters.has(t.k)
              return (
                <button key={t.k}
                  onClick={() => setWfFilters(s => { const n = new Set(s); n.has(t.k) ? n.delete(t.k) : n.add(t.k); return n })}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors border ${on ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                  {t.l}
                </button>
              )
            })}
            {wfFilters.size > 0 && (
              <button onClick={() => setWfFilters(new Set())} className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-300">✕</button>
            )}
          </div>
        </div>

      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="text-gray-500 text-sm py-12 text-center">Loading jobs…</div>
      ) : visible.length === 0 ? (
        <div className="text-gray-600 text-sm py-12 text-center">
          No jobs found. <a href="/imports" className="text-indigo-400">Import jobs →</a>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
          <table className="text-xs border-collapse" style={{ tableLayout: 'fixed', width: colOrder.reduce((s,k) => s + (colWidths[k]??120), 48) + 'px' }}>
            {/* col widths */}
            <colgroup>
              <col style={{ width: 40 }} />
              {orderedCols.map(c => <col key={c.key} style={{ width: colWidths[c.key] ?? c.defaultWidth }} />)}
              <col style={{ width: 36 }} />
            </colgroup>

            <thead>
              {/* ── Column headers ── */}
              <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider">
                <th className="px-2 py-2.5 sticky left-0 bg-gray-900 z-20 w-10">
                  <input type="checkbox" checked={selected.size===visible.length && visible.length>0}
                    onChange={toggleAll} className="accent-indigo-500" />
                </th>
                {orderedCols.map((col, idx) => {
                  const isSticky = col.sticky
                  const stickyLeft = isSticky ? 40 : undefined
                  const isSorted = sortKey === col.key
                  return (
                    <th key={col.key}
                      className={`relative px-2 py-2.5 text-left select-none cursor-pointer ${isSticky ? 'sticky z-20 bg-gray-900' : ''} ${isSorted ? 'text-white' : ''}`}
                      style={isSticky ? { left: stickyLeft } : {}}
                      draggable
                      onDragStart={() => onDragStart(col.key)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => onDrop(col.key)}
                      onDoubleClick={() => onHeaderDblClick(col.key, col)}
                      title="Double-click to sort · Drag to reorder"
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {isSorted && <span className="text-indigo-400">{sortDir==='asc'?'↑':'↓'}</span>}
                      </span>
                      {/* Resize handle */}
                      <div
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-indigo-500/40"
                        onMouseDown={e => startResize(col.key, e)}
                        onClick={e => e.stopPropagation()}
                      />
                    </th>
                  )
                })}
                <th className="w-9 px-1" />
              </tr>

              {/* ── Filter row ── */}
              <tr className="border-b border-gray-800 bg-gray-950">
                <td />
                {orderedCols.map(col => (
                  <td key={col.key} className="px-1 py-1">
                    {col.key === 'ai_score' ? (
                      <input type="number" placeholder="min" value={scoreMin}
                        onChange={e => setScoreMin(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
                    ) : col.filterable && col.filterType === 'text' ? (
                      <input type="text" placeholder="filter…" value={colFilters[col.key] ?? ''}
                        onChange={e => setColFilters(p => ({ ...p, [col.key]: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
                    ) : col.filterable && col.filterType === 'select' ? (
                      <select value={colFilters[col.key] ?? ''}
                        onChange={e => setColFilters(p => ({ ...p, [col.key]: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-white text-xs focus:outline-none focus:border-indigo-500">
                        <option value="">All</option>
                        {(col.key === 'work_type' ? workTypes : col.key === 'arrangement' ? arrangements : col.key === 'category' ? categories : col.filterOptions ?? []).map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : null}
                  </td>
                ))}
                <td />
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-800/60">
              {visible.map(job => {
                const rp  = job.raw_payload ?? {}
                const wf  = wfOf(job.status)
                const sel = selected.has(job.id)
                const exp = expanded === job.id

                function cell(content: React.ReactNode, extraClass = '') {
                  return <td className={`px-2 py-2 text-white overflow-hidden ${extraClass}`}>{content}</td>
                }

                function trunc(text: string | null | undefined, max = 999) {
                  if (!text) return <span className="text-gray-600">—</span>
                  return <span className="block truncate" title={text}>{text}</span>
                }

                const rowBg = sel ? 'bg-indigo-950/40' : 'hover:bg-gray-800/40'

                return (
                  <>
                    <tr key={job.id} data-testid={`job-row-${job.id}`} data-wf={wf} className={`group transition-colors ${rowBg}`}>
                      {/* Checkbox */}
                      <td className={`px-2 py-2 text-center sticky left-0 z-10 ${sel ? 'bg-indigo-950' : 'bg-gray-900 group-hover:bg-gray-800'}`}>
                        <input type="checkbox" checked={sel} onChange={() => toggleSelect(job.id)} className="accent-indigo-500" />
                      </td>

                      {orderedCols.map(col => {
                        const isSticky = col.sticky
                        const stickyCls = isSticky ? `sticky z-10 ${sel ? 'bg-indigo-950' : 'bg-gray-900 group-hover:bg-gray-800'}` : ''

                        switch (col.key) {
                          case 'source_job_id':
                            return <td key={col.key} className={`px-2 py-2 text-white overflow-hidden ${stickyCls}`} style={isSticky ? { left: 40 } : {}}>
                              <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:text-indigo-100 font-mono truncate block" title={job.source_job_id}>
                                {job.source_job_id || '—'}
                              </a>
                            </td>

                          case 'title':
                            return <td key={col.key} className={`px-2 py-2 overflow-hidden ${stickyCls}`} style={isSticky ? { left: 40 } : {}}>
                              <a href={job.url} target="_blank" rel="noopener noreferrer"
                                className="text-white font-medium hover:text-indigo-300 transition-colors block truncate"
                                title={job.title}>{job.title || '(no title)'}</a>
                              {job.ai_ranking?.reason && (
                                <p className="text-gray-500 text-xs mt-0.5 truncate italic" title={job.ai_ranking.reason}>{job.ai_ranking.reason}</p>
                              )}
                            </td>

                          case 'category':
                            return <td key={col.key} className="px-2 py-2 text-white overflow-hidden">
                              {job.category
                                ? <span className="px-1.5 py-0.5 rounded bg-teal-900/60 text-teal-300 border border-teal-700 text-xs truncate block" title={job.category}>{job.category}</span>
                                : <span className="text-gray-600">—</span>}
                            </td>

                          case 'employer':
                            return cell(trunc(job.employer), stickyCls)

                          case 'location':
                            return cell(trunc(job.location), stickyCls)

                          case 'role_description': {
                            const rd = job.ai_ranking?.role_description?.map(stripBulletPrefix) ?? []
                            return <td key={col.key} className="px-2 py-2 text-white overflow-hidden">
                              {rd.length
                                ? <span className="block truncate" title={rd.join('\n')}>{rd[0]}</span>
                                : <span className="text-gray-600">—</span>}
                            </td>
                          }

                          case 'ranking_comments': {
                            const rc = job.ai_ranking?.ranking_comments?.map(stripBulletPrefix) ?? []
                            return <td key={col.key} className="px-2 py-2 text-white overflow-hidden">
                              {rc.length
                                ? <span className="block truncate" title={rc.join('\n')}>{rc[0]}</span>
                                : <span className="text-gray-600">—</span>}
                            </td>
                          }

                          case 'ai_score':
                            return <td key={col.key} className="px-2 py-2 text-center">
                              {job.ai_score != null
                                ? <span className={`text-sm font-bold ${job.ai_score>=70?'text-green-400':job.ai_score>=50?'text-yellow-400':'text-red-400'}`}>{job.ai_score}</span>
                                : <span className="text-gray-700">—</span>}
                            </td>

                          case 'ats_score': {
                            const ats = job.ai_ranking?.ats_score
                            const verdict = job.ai_ranking?.ats_verdict ?? ''
                            const matched = job.ai_ranking?.ats_matched_keywords ?? []
                            const missing = job.ai_ranking?.ats_missing_keywords ?? []
                            const tooltip = ats != null
                              ? [
                                  verdict,
                                  matched.length ? `✓ ${matched.join(', ')}` : '',
                                  missing.length ? `✗ missing: ${missing.join(', ')}` : '',
                                ].filter(Boolean).join('\n')
                              : 'Generate documents to calculate ATS score'
                            return <td key={col.key} className="px-2 py-2 text-center">
                              {ats != null
                                ? <span
                                    title={tooltip}
                                    className={`text-sm font-bold cursor-help ${ats>=80?'text-emerald-400':ats>=65?'text-yellow-400':'text-red-400'}`}
                                  >{ats}</span>
                                : <span className="text-gray-700" title={tooltip}>—</span>}
                            </td>
                          }

                          case 'ai_priority':
                            return <td key={col.key} className="px-2 py-2">
                              {job.ai_priority
                                ? <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${PRI_STYLE[job.ai_priority]}`}>{PRI_LABEL[job.ai_priority]}</span>
                                : <span className="text-gray-600">—</span>}
                            </td>

                          case 'workflow_status':
                            return <td key={col.key} className="px-2 py-1.5">
                              <div className="flex items-center gap-1">
                                <select
                                  data-testid={`status-select-${job.id}`}
                                  value={wf}
                                  onChange={e => setWorkflow(job.id, e.target.value, e.target.value === 'applied' ? job.url : undefined)}
                                  className={`w-full rounded px-1.5 py-0.5 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 ${WF_STYLE[wf]}`}
                                >
                                  <option value="open">Open</option>
                                  <option value="generated">Generated</option>
                                  <option value="applied">Applied</option>
                                  <option value="discarded">Discarded</option>
                                </select>
                              </div>
                            </td>

                          case 'salary_text':
                            return cell(trunc(job.salary_text))

                          case 'work_type':
                            return cell(<span className="text-white">{job.work_type || '—'}</span>)

                          case 'arrangement':
                            return cell(<span className="text-white">{String(rp.workArrangements || '—')}</span>)

                          case 'applicants':
                            return <td key={col.key} className="px-2 py-2 text-white text-right">
                              {rp.numApplicants != null ? rp.numApplicants.toLocaleString() : '—'}
                            </td>

                          case 'posted_at':
                            return <td key={col.key} className="px-2 py-2 text-white">{relDate(job.posted_at)}</td>

                          case 'imported_at':
                            return <td key={col.key} className="px-2 py-2 text-white">{relDate(job.created_at)}</td>

                          default:
                            return <td key={col.key} className="px-2 py-2 text-gray-600">—</td>
                        }
                      })}

                      {/* Expand toggle */}
                      <td className="px-1 py-2 text-center">
                        <button onClick={() => setExpanded(exp ? null : job.id)}
                          className="text-gray-500 hover:text-gray-300 text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-gray-700">
                          {exp ? '▲' : '▼'}
                        </button>
                      </td>
                    </tr>

                    {/* ── Expanded row ── */}
                    {exp && (
                      <tr key={`${job.id}-exp`}>
                        <td colSpan={orderedCols.length + 2} className="bg-gray-950 border-t border-b border-gray-800 px-6 py-5">
                          <div className="grid grid-cols-3 gap-6 mb-5">

                            {/* AI Analysis */}
                            <div className="space-y-2.5">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-1">AI Analysis</p>
                              {job.ai_ranking ? (
                                <>
                                  {job.ai_ranking.role_description?.length && (
                                    <div><p className="text-xs text-gray-500 mb-1">Role Description</p>
                                      <ul className="space-y-0.5">{job.ai_ranking.role_description.map((b,i) => <li key={i} className="text-sm text-cyan-300">• {stripBulletPrefix(b)}</li>)}</ul>
                                    </div>
                                  )}
                                  {job.ai_ranking.ranking_comments?.length && (
                                    <div><p className="text-xs text-gray-500 mb-1">Why this score</p>
                                      <ul className="space-y-0.5">{job.ai_ranking.ranking_comments.map((b,i) => <li key={i} className="text-sm text-amber-300">• {stripBulletPrefix(b)}</li>)}</ul>
                                    </div>
                                  )}
                                  {job.ai_ranking.ats_score != null && (
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">ATS Score</p>
                                      <p className={`text-lg font-bold ${job.ai_ranking.ats_score>=80?'text-emerald-400':job.ai_ranking.ats_score>=65?'text-yellow-400':'text-red-400'}`}>
                                        {job.ai_ranking.ats_score}/100
                                      </p>
                                      {job.ai_ranking.ats_verdict && <p className="text-xs text-gray-400 mt-0.5 italic">{job.ai_ranking.ats_verdict}</p>}
                                      {(job.ai_ranking.ats_matched_keywords?.length ?? 0) > 0 && (
                                        <p className="text-xs text-emerald-400 mt-1">✓ {job.ai_ranking.ats_matched_keywords!.join(', ')}</p>
                                      )}
                                      {(job.ai_ranking.ats_missing_keywords?.length ?? 0) > 0 && (
                                        <p className="text-xs text-red-400 mt-0.5">✗ missing: {job.ai_ranking.ats_missing_keywords!.join(', ')}</p>
                                      )}
                                    </div>
                                  )}
                                  {job.ai_ranking.key_skills && <div><p className="text-xs text-gray-500">Key Skills</p><p className="text-sm text-green-300">{job.ai_ranking.key_skills}</p></div>}
                                  {job.ai_ranking.red_flags && <div><p className="text-xs text-gray-500">Red Flags</p><p className="text-sm text-red-300">{job.ai_ranking.red_flags}</p></div>}
                                  {job.ai_ranking.tailoring_notes && <div><p className="text-xs text-gray-500">Tailoring Tips</p><p className="text-sm text-blue-300">{job.ai_ranking.tailoring_notes}</p></div>}
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs pt-1 border-t border-gray-800">
                                    {([
                                      ['Beginner Friendly', job.ai_ranking.beginner_friendly],
                                      ['GTO/Traineeship',   job.ai_ranking.gto_traineeship],
                                      ['Training Offered',  job.ai_ranking.training_offered],
                                      ['Cert III Pathway',  job.ai_ranking.cert3_pathway],
                                      ['Prior School Req.', job.ai_ranking.prior_school_required],
                                      ['Qual. Risk',        job.ai_ranking.qualification_risk],
                                      ['Exp. Risk',         job.ai_ranking.experience_risk],
                                      ['Resume Version',    job.ai_ranking.resume_version?.replace(/_/g,' ')],
                                      ['Cover Letter',      job.ai_ranking.cover_letter_needed],
                                    ] as [string,string|undefined][]).filter(([,v])=>v).map(([l,v]) => (
                                      <div key={l}><span className="text-gray-500">{l}: </span><span className="text-white capitalize">{v}</span></div>
                                    ))}
                                  </div>
                                </>
                              ) : <p className="text-gray-600 text-xs italic">Not yet ranked</p>}
                            </div>

                            {/* Job Details */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-1">Job Details</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                {([
                                  ['Job ID',       job.source_job_id],
                                  ['Employer',     job.employer],
                                  ['Category',     rp.classificationInfo?.classification],
                                  ['Sub-Category', rp.classificationInfo?.subClassification],
                                  ['Area',         rp.joblocationInfo?.area],
                                  ['Suburb',       rp.joblocationInfo?.suburb],
                                  ['Location',     rp.joblocationInfo?.displayLocation || job.location],
                                  ['Work Type',    rp.workTypes as string || job.work_type],
                                  ['Arrangement',  rp.workArrangements as string],
                                  ['Salary',       rp.salary as string || job.salary_text],
                                  ['Applicants',   rp.numApplicants?.toString()],
                                  ['Resume %',     rp.resumePercentage != null ? `${rp.resumePercentage}%` : undefined],
                                  ['Cover Letter %',rp.coverLetterPercentage != null ? `${rp.coverLetterPercentage}%` : undefined],
                                  ['Posted',       job.posted_at ? new Date(job.posted_at).toLocaleDateString('en-AU') : undefined],
                                  ['Expires',      rp.expiresAtUtc ? new Date(rp.expiresAtUtc).toLocaleDateString('en-AU') : undefined],
                                  ['External Apply',rp.isExternalApply === true ? 'Yes' : rp.isExternalApply === false ? 'No' : undefined],
                                  ['Verified',     rp.isVerified === true ? '✓ Yes' : rp.isVerified === false ? 'No' : undefined],
                                  ['Workflow',     WF_LABEL[wf]],
                                ] as [string,string|undefined][]).filter(([,v])=>v!=null&&v!=='').map(([l,v]) => (
                                  <div key={l}><span className="text-gray-500">{l}: </span><span className="text-white">{v}</span></div>
                                ))}
                              </div>
                              {Array.isArray(rp.employerQuestions) && rp.employerQuestions.length > 0 && (
                                <div className="pt-2 border-t border-gray-800">
                                  <p className="text-xs text-gray-500 mb-1">Employer Questions</p>
                                  <ul className="space-y-0.5">{rp.employerQuestions.map((q,i) => <li key={i} className="text-xs text-yellow-300">• {q}</li>)}</ul>
                                </div>
                              )}
                            </div>

                            {/* Links & Actions */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-1">Links & Actions</p>
                              <div className="space-y-1.5">
                                {(rp.jobLink as string || job.url) && (
                                  <a href={(rp.jobLink as string || job.url)} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-white">
                                    🔗 View on Seek
                                  </a>
                                )}
                                {rp.applyLink && rp.applyLink !== rp.jobLink && (
                                  <a href={rp.applyLink as string} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-indigo-900 hover:bg-indigo-800 rounded-lg text-xs text-white">
                                    ✉️ Apply directly
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Job description */}
                          {(rp.content?.jobHook || rp.content?.bulletPoints?.length || job.description_html || job.description_text) && (
                            <div className="border-t border-gray-800 pt-4">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Job Description</p>
                              {rp.content?.jobHook && (
                                <p className="text-sm text-cyan-300 italic mb-3">"{rp.content.jobHook}"</p>
                              )}
                              {rp.content?.bulletPoints?.length && (
                                <ul className="mb-3 space-y-1">
                                  {rp.content.bulletPoints.map((b,i) => <li key={i} className="text-sm text-white">• {b}</li>)}
                                </ul>
                              )}
                              {(job.description_html || job.description_text) && (
                                <div className="bg-gray-900 rounded-lg p-4 max-h-72 overflow-y-auto">
                                  {job.description_html
                                    ? <div className="text-white text-sm leading-relaxed prose prose-invert prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: job.description_html }} />
                                    : <p className="text-white text-sm whitespace-pre-line leading-relaxed">{job.description_text}</p>
                                  }
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Global processing lock overlay ──────────────────────────────────────
          Covers the full viewport (including sidebar) while scoring or generating.
          Blocks all clicks and navigation until the operation completes.        */}
      {isBusy && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)' }}
          className="flex flex-col items-center justify-center gap-4 backdrop-blur-sm"
          aria-modal="true"
          aria-label="Processing — please wait"
        >
          {/* Spinner */}
          <svg
            className="animate-spin"
            style={{ width: 52, height: 52, color: '#818cf8' }}
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>

          {/* Message */}
          <p className="text-white text-lg font-semibold tracking-wide">
            {scoring ? 'Running Job-fit Score…' : 'Generating Documents…'}
          </p>
          {scoring && scoreMsg && (
            <p className="text-gray-300 text-sm max-w-sm text-center">{scoreMsg}</p>
          )}
          {generating && (
            <p className="text-gray-300 text-sm">This takes about 10–20 seconds. Do not navigate away.</p>
          )}
        </div>
      )}
    </div>
  )
}
