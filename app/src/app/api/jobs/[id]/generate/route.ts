export const runtime = 'nodejs'  // pdfkit requires Node.js — not Edge

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/supabase/get-auth'
import { generateResumeData, generateCoverLetterData, generateDocumentFraming, calculateAtsScore } from '@/lib/ai/generate-documents'
import { buildResumePdf } from '@/lib/render/resume-pdf'
import { buildCoverLetterPdf } from '@/lib/render/cover-letter-pdf'
import JSZip from 'jszip'

function slugify(text: string, limit = 22): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, limit)
    .replace(/_+$/g, '') // remove trailing underscores from the slice
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: jobId } = await params

  // ── 1. Fetch job ──
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id, title, employer, location, description_text, status, source_job_id, url')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (jobErr || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // ── 2. Fetch candidate profile ──
  const { data: profileRow } = await supabase
    .from('candidate_profile')
    .select('profile_json')
    .eq('user_id', user.id)
    .single()

  if (!profileRow?.profile_json) {
    return NextResponse.json({ error: 'Candidate profile not found. Please set it up in Settings → Profile.' }, { status: 400 })
  }
  const profile = profileRow.profile_json as Record<string, unknown>

  const jobData = {
    title:            job.title ?? '',
    employer:         job.employer ?? '',
    location:         job.location ?? '',
    description_text: job.description_text ?? '',
  }

  // ── 3. Generate role-specific framing + document content in parallel ──
  // Step A: AI generates a brief framing note (which angle to take for THIS job category)
  // Step B: AI generates resume + cover letter content using that framing
  // Framing failure is non-fatal — documents still generate with base prompts.
  let resumeData, clData
  try {
    const framing = await generateDocumentFraming(profile, jobData)
    ;[resumeData, clData] = await Promise.all([
      generateResumeData(profile, jobData, undefined, framing.resumeFraming || undefined),
      generateCoverLetterData(profile, jobData, undefined, framing.coverFraming || undefined),
    ])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `AI generation failed: ${msg}` }, { status: 500 })
  }

  // ── 5. Render PDF + ATS score (parallel) ──
  // Using pdfkit with standard PDF fonts (Helvetica) — no external font files needed.
  // ATS score runs in parallel with PDF rendering — failure is non-fatal.
  let resumePdf: Buffer, clPdf: Buffer
  let atsResult: Awaited<ReturnType<typeof calculateAtsScore>> | null = null
  try {
    ;[resumePdf, clPdf, atsResult] = await Promise.all([
      buildResumePdf(resumeData),
      buildCoverLetterPdf(clData),
      calculateAtsScore(resumeData, job.title ?? '', job.description_text ?? '').catch(err => {
        console.error('ATS score failed (non-fatal):', err)
        return null
      }),
    ])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Document rendering failed: ${msg}` }, { status: 500 })
  }

  // ── 6. Package as ZIP ──
  // Format: {title}_{employer}_{jobId} — title first so it's readable at a glance
  const candidateName = resumeData.candidate.name.replace(/\s+/g, '_')
  const titleSlug     = slugify(job.title    ?? 'Role',     22)
  const employerSlug  = slugify(job.employer ?? 'Employer', 22)
  const jobIdPrefix   = (job.source_job_id ?? jobId).slice(0, 8)
  const folderName    = `${titleSlug}_${employerSlug}_${jobIdPrefix}`
  const filePrefix    = `${candidateName}_${titleSlug}_${employerSlug}`

  const zip = new JSZip()
  const folder = zip.folder(folderName)!
  folder.file(`${filePrefix}_Resume.pdf`,       resumePdf)
  folder.file(`${filePrefix}_Cover_Letter.pdf`, clPdf)

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

  // ── 7. Update job status + ATS score ──
  // Merge ATS result into existing ai_ranking JSONB (preserves ranking data)
  const { data: currentJob } = await supabase
    .from('jobs').select('ai_ranking').eq('id', jobId).single()

  const updatedRanking = {
    ...(currentJob?.ai_ranking ?? {}),
    ...(atsResult ? {
      ats_score:            atsResult.score,
      ats_matched_keywords: atsResult.matched_keywords,
      ats_missing_keywords: atsResult.missing_keywords,
      ats_verdict:          atsResult.verdict,
    } : {}),
  }

  await supabase.from('jobs')
    .update({ status: 'documents_generated', ai_ranking: updatedRanking })
    .eq('id', jobId)
    .eq('user_id', user.id)

  // ── 8. Return ZIP (ATS score in headers for immediate UI display) ──
  return new NextResponse(zipBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type':        'application/zip',
      'Content-Disposition': `attachment; filename="${folderName}.zip"`,
      'Content-Length':      String(zipBuffer.length),
      ...(atsResult ? {
        'X-ATS-Score':   String(atsResult.score),
        'X-ATS-Verdict': atsResult.verdict,
        'X-ATS-Matched': atsResult.matched_keywords.join('|'),
        'X-ATS-Missing': atsResult.missing_keywords.join('|'),
      } : {}),
    },
  })
}
