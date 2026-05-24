export const runtime = 'nodejs'  // docx requires Node.js — not Edge

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/supabase/get-auth'
import { generateResumeData, generateCoverLetterData } from '@/lib/ai/generate-documents'
import { buildResumeDocx } from '@/lib/render/resume-docx'
import { buildCoverLetterDocx } from '@/lib/render/cover-letter-docx'
import JSZip from 'jszip'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
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

  // ── 3. Fetch active prompts (optional — fall back to defaults) ──
  const [resumePromptRow, clPromptRow] = await Promise.all([
    supabase.from('prompt_versions').select('content')
      .eq('user_id', user.id).eq('prompt_type', 'resume_generation').eq('is_active', true).single(),
    supabase.from('prompt_versions').select('content')
      .eq('user_id', user.id).eq('prompt_type', 'cover_letter_generation').eq('is_active', true).single(),
  ])

  const jobData = {
    title:            job.title ?? '',
    employer:         job.employer ?? '',
    location:         job.location ?? '',
    description_text: job.description_text ?? '',
  }

  // ── 4. Generate structured content via AI ──
  let resumeData, clData
  try {
    ;[resumeData, clData] = await Promise.all([
      generateResumeData(profile, jobData, resumePromptRow.data?.content),
      generateCoverLetterData(profile, jobData, clPromptRow.data?.content),
    ])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `AI generation failed: ${msg}` }, { status: 500 })
  }

  // ── 5. Render DOCX ──
  // PDF generation via pdfkit is disabled — Helvetica font paths fail on Vercel.
  // Convert DOCX → PDF using Word or Google Docs if needed.
  let resumeDocx: Buffer, clDocx: Buffer
  try {
    ;[resumeDocx, clDocx] = await Promise.all([
      buildResumeDocx(resumeData),
      buildCoverLetterDocx(clData),
    ])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Document rendering failed: ${msg}` }, { status: 500 })
  }

  // ── 6. Package as ZIP ──
  const candidateName = resumeData.candidate.name.replace(/\s+/g, '_')
  const employerSlug  = slugify(job.employer ?? 'Employer')
  const titleSlug     = slugify(job.title ?? 'Role')
  const jobIdPrefix   = (job.source_job_id ?? jobId).slice(0, 8)
  const folderName    = `${employerSlug}_${titleSlug}_${jobIdPrefix}`
  const filePrefix    = `${candidateName}_${employerSlug}_${titleSlug}`

  const zip = new JSZip()
  const folder = zip.folder(folderName)!
  folder.file(`${filePrefix}_Resume.docx`,       resumeDocx)
  folder.file(`${filePrefix}_Cover_Letter.docx`, clDocx)

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

  // ── 7. Update job status ──
  await supabase.from('jobs')
    .update({ status: 'documents_generated' })
    .eq('id', jobId)
    .eq('user_id', user.id)

  // ── 8. Return ZIP ──
  return new NextResponse(zipBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type':        'application/zip',
      'Content-Disposition': `attachment; filename="${folderName}.zip"`,
      'Content-Length':      String(zipBuffer.length),
    },
  })
}
