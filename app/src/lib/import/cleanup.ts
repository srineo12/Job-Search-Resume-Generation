import { SupabaseClient } from '@supabase/supabase-js'
import { stripHtml } from './normalisers/base'

export interface CleanupResult {
  cleaned: number
  kept: number
  errors: number
}

/**
 * Clean up jobs by marking non-matching jobs as 'irrelevant'.
 * Matches jobs against keywords using OR logic: title OR description_text must contain at least one keyword.
 *
 * @param supabase - Supabase client
 * @param userId - User ID for scoped operations
 * @param keywordSetIds - Array of keyword set IDs to match against
 * @param jobIds - Optional array of specific job IDs to clean; if omitted, cleans all jobs
 * @returns Result with cleaned/kept/error counts
 */
export async function cleanupJobsByKeywords(
  supabase: SupabaseClient,
  userId: string,
  keywordSetIds: string[],
  jobIds?: string[],
): Promise<CleanupResult> {
  if (!keywordSetIds.length) {
    return { cleaned: 0, kept: 0, errors: 0 }
  }

  // Fetch keyword sets
  const { data: keywordSets, error: fetchError } = await supabase
    .from('keyword_sets')
    .select('id, keywords')
    .eq('user_id', userId)
    .in('id', keywordSetIds)

  if (fetchError || !keywordSets?.length) {
    console.error('Error fetching keyword sets:', fetchError)
    return { cleaned: 0, kept: 0, errors: 1 }
  }

  // Flatten all keywords from all sets
  const allKeywords = keywordSets
    .flatMap(ks => ks.keywords || [])
    .map((kw: string) => kw.toLowerCase().trim())
    .filter(Boolean)

  if (!allKeywords.length) {
    return { cleaned: 0, kept: 0, errors: 0 }
  }

  // Get jobs to check
  let query = supabase
    .from('jobs')
    .select('id, title, description_text, description_html')
    .eq('user_id', userId)

  if (jobIds?.length) {
    query = query.in('id', jobIds)
  }

  const { data: jobs, error: jobError } = await query

  if (jobError || !jobs?.length) {
    console.error('Error fetching jobs:', jobError)
    return { cleaned: 0, kept: 0, errors: 1 }
  }

  // Determine which jobs to mark as irrelevant
  const jobsToClean: string[] = []

  console.log(`[Cleanup] Checking ${jobs.length} jobs against ${allKeywords.length} keywords:`, allKeywords)

  for (const job of jobs) {
    const matches = jobMatches(job.title, job.description_text, job.description_html, allKeywords)
    if (!matches) {
      console.log(`[Cleanup] Marking irrelevant: "${job.title}" (desc length: ${(job.description_text || '').length})`)
      jobsToClean.push(job.id)
    }
  }

  console.log(`[Cleanup] Found ${jobsToClean.length} jobs to mark as irrelevant out of ${jobs.length}`)

  // Update jobs to irrelevant status
  let cleaned = 0
  if (jobsToClean.length > 0) {
    const { error: updateError, data: updated } = await supabase
      .from('jobs')
      .update({ status: 'irrelevant', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', jobsToClean)
      .select('id')

    if (updateError) {
      console.error('Error updating jobs:', updateError)
      return { cleaned: 0, kept: jobs.length, errors: jobsToClean.length }
    }

    cleaned = updated?.length || 0
  }

  return {
    cleaned,
    kept: jobs.length - cleaned,
    errors: 0,
  }
}

/**
 * Check if a job matches at least one keyword (OR logic).
 * Searches title and description_text using lowercase substring matching.
 */
function jobMatches(
  title: string | null | undefined,
  descriptionText: string | null | undefined,
  descriptionHtml: string | null | undefined,
  keywords: string[],
): boolean {
  // Prepare searchable text: title + plain text description
  const titleLower = (title || '').toLowerCase()

  // Try description_text first (already plain), fall back to stripped HTML
  let descLower = (descriptionText || '').toLowerCase()
  if (!descLower && descriptionHtml) {
    descLower = stripHtml(descriptionHtml).toLowerCase()
  }

  // OR logic: match in title OR description
  return keywords.some(keyword => titleLower.includes(keyword) || descLower.includes(keyword))
}
