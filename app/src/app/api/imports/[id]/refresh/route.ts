import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/supabase/get-auth'

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text?.trim()) return null
  try { return JSON.parse(text) } catch { return null }
}
import { normalizeSeekJobs } from '@/lib/import/normalisers/seek'
import { normalizeIndeedJobs } from '@/lib/import/normalisers/indeed'
import { NormalizedJob } from '@/lib/import/normalisers/base'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: importId } = await params
  
  const { supabase, user } = await getAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get import record
  const { data: importRecord, error: importError } = await supabase
    .from('imports')
    .select('*')
    .eq('id', importId)
    .eq('user_id', user.id)
    .single()

  if (importError || !importRecord) {
    return NextResponse.json({ error: 'Import not found' }, { status: 404 })
  }

  // Get run status from Apify — use /actor-runs/{runId} (no actor_id needed, avoids ~ encoding issue)
  let runStatus: string
  let runData: any
  try {
    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${importRecord.apify_run_id}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.APIFY_TOKEN}`,
        },
      }
    )

    if (!statusResponse.ok) {
      console.error('Apify status error:', statusResponse.status)
      return NextResponse.json(
        { error: 'Failed to get run status from Apify' },
        { status: 500 }
      )
    }

    runData = await safeJson(statusResponse) as any
    runStatus = runData?.data?.status
  } catch (error) {
    console.error('Error checking Apify run status:', error)
    return NextResponse.json({ error: 'Failed to check run status' }, { status: 500 })
  }

  // If still running, just update status and return
  if (runStatus === 'RUNNING') {
    if (importRecord.status !== 'running') {
      await supabase
        .from('imports')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', importId)
    }
    return NextResponse.json({
      import: {
        ...importRecord,
        status: 'running',
      },
      message: 'Run in progress. Check back in a few moments.',
    })
  }

  // If failed, update and return
  if (runStatus === 'FAILED' || runStatus === 'ABORTED') {
    const errorMessage = runData.data?.statusMessage || 'Run failed'
    await supabase
      .from('imports')
      .update({
        status: 'failed',
        error_message: errorMessage,
        finished_at: new Date().toISOString(),
      })
      .eq('id', importId)

    return NextResponse.json({
      import: {
        ...importRecord,
        status: 'failed',
        error_message: errorMessage,
      },
    })
  }

  // If not succeeded, return as-is
  if (runStatus !== 'SUCCEEDED') {
    return NextResponse.json({
      import: importRecord,
      message: `Run status: ${runStatus}`,
    })
  }

  // SUCCEEDED — fetch dataset and process jobs
  const datasetId = runData.data?.defaultDatasetId
  if (!datasetId) {
    return NextResponse.json(
      { error: 'No dataset found in completed run' },
      { status: 500 }
    )
  }

  let rawJobs: any[] = []
  try {
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.APIFY_TOKEN}`,
        },
      }
    )

    if (!datasetResponse.ok) {
      console.error('Dataset fetch error:', datasetResponse.status)
      return NextResponse.json({ error: 'Failed to fetch dataset' }, { status: 500 })
    }

    const parsed = await safeJson(datasetResponse)
    rawJobs = Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Error fetching dataset:', error)
    return NextResponse.json({ error: 'Failed to fetch dataset' }, { status: 500 })
  }

  // Normalize jobs based on source
  let normalizedJobs: NormalizedJob[]
  if (importRecord.source === 'seek') {
    normalizedJobs = normalizeSeekJobs(rawJobs)
  } else if (importRecord.source === 'indeed') {
    normalizedJobs = normalizeIndeedJobs(rawJobs)
  } else {
    return NextResponse.json({ error: 'Unknown source' }, { status: 400 })
  }

  // Count how many jobs don't match title filter (for informational stats only).
  // We insert ALL jobs regardless — AI ranking assigns low scores to irrelevant ones.
  const titleFilterTerms: string[] = (importRecord.input_payload?.include_in_title || [])
    .map((t: string) => t.toLowerCase().trim())
    .filter(Boolean)

  const titleFilteredCount = titleFilterTerms.length > 0
    ? normalizedJobs.filter(job =>
        !titleFilterTerms.some(term => job.title.toLowerCase().includes(term))
      ).length
    : 0

  let stats = {
    fetched: rawJobs.length,
    title_filtered: titleFilteredCount,
    inserted: 0,
    duplicates_by_url: 0,
    duplicates_by_employer_title: 0,
    errors: 0,
  }

  for (const normalizedJob of normalizedJobs) {
    try {
      // Check for duplicate by URL hash
      const { data: byUrl } = await supabase
        .from('jobs')
        .select('id')
        .eq('user_id', user.id)
        .eq('url_hash', normalizedJob.url_hash)
        .limit(1)

      if (byUrl && byUrl.length > 0) {
        stats.duplicates_by_url++
        continue
      }

      // Check for duplicate by dedupe key
      const { data: byDedupe } = await supabase
        .from('jobs')
        .select('id')
        .eq('user_id', user.id)
        .eq('dedupe_key', normalizedJob.dedupe_key)
        .limit(1)

      if (byDedupe && byDedupe.length > 0) {
        stats.duplicates_by_employer_title++
        continue
      }

      // Insert new job
      const { error: insertError } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          import_id: importId,
          source: importRecord.source,
          source_job_id: normalizedJob.source_job_id,
          url: normalizedJob.url,
          url_hash: normalizedJob.url_hash,
          employer: normalizedJob.employer,
          title: normalizedJob.title,
          location: normalizedJob.location,
          remote_flag: normalizedJob.remote_flag,
          salary_text: normalizedJob.salary_text,
          work_type: normalizedJob.work_type,
          description_text: normalizedJob.description_text,
          description_html: normalizedJob.description_html,
          posted_at: normalizedJob.posted_at,
          raw_payload: normalizedJob.raw_payload,
          dedupe_key: normalizedJob.dedupe_key,
          status: 'imported',
        })

      if (insertError) {
        console.error('Error inserting job:', insertError)
        stats.errors++
      } else {
        stats.inserted++
      }
    } catch (error) {
      console.error('Error processing job:', error)
      stats.errors++
    }
  }

  // Update import record with stats
  const { error: updateError } = await supabase
    .from('imports')
    .update({
      status: 'succeeded',
      stats,
      finished_at: new Date().toISOString(),
    })
    .eq('id', importId)

  if (updateError) {
    console.error('Error updating import stats:', updateError)
    return NextResponse.json({ error: 'Failed to update import stats' }, { status: 500 })
  }

  // Return updated import record
  const { data: updatedImport } = await supabase
    .from('imports')
    .select('*')
    .eq('id', importId)
    .single()

  return NextResponse.json({
    import: updatedImport,
    message: `Import completed: ${stats.inserted} jobs inserted, ${stats.duplicates_by_url + stats.duplicates_by_employer_title} duplicates skipped`,
  })
}
