import {
  NormalizedJob,
  canonicalizeUrl,
  generateUrlHash,
  generateDedupeKey,
  stripHtml,
  extractString,
  extractBoolean,
  extractDate,
} from './base'

/**
 * Normalize a single Seek job from Apify into canonical format
 */
export function normalizeSeekJob(raw: any): NormalizedJob {
  // Extract URL and generate hash
  const urlString = extractString(raw, 'url', '')
  const canonUrl = canonicalizeUrl(urlString)
  const urlHash = generateUrlHash(canonUrl)

  // Extract basic job info
  const sourceJobId = extractString(raw, 'id') || extractString(raw, 'jobId', '')
  const employer = extractString(raw, 'company', '')
  const title = extractString(raw, 'title', '')
  const location = extractString(raw, 'location', '')
  const remoteFlag = extractBoolean(raw, 'remote')

  // Generate dedupe key
  const dedupeKey = generateDedupeKey(employer, title, location)

  // Extract salary and description
  const salaryText = extractString(raw, 'salary', '')
  const descriptionHtml = extractString(raw, 'description', '')
  const descriptionText = stripHtml(descriptionHtml)

  // Extract posted date
  const postedAt = extractDate(raw, 'postedDate') || extractDate(raw, 'datePosted')

  return {
    source_job_id: sourceJobId,
    url: canonUrl,
    url_hash: urlHash,
    employer,
    title,
    location,
    remote_flag: remoteFlag,
    salary_text: salaryText || null,
    description_text: descriptionText,
    description_html: descriptionHtml || null,
    posted_at: postedAt,
    raw_payload: raw,
    dedupe_key: dedupeKey,
  }
}

/**
 * Normalize an array of Seek jobs
 */
export function normalizeSeekJobs(rawJobs: any[]): NormalizedJob[] {
  return (Array.isArray(rawJobs) ? rawJobs : [])
    .filter((job) => job && typeof job === 'object')
    .map((job) => {
      try {
        return normalizeSeekJob(job)
      } catch (error) {
        console.error('Error normalizing Seek job:', error, job)
        // Return a minimal job to track the error
        return normalizeSeekJob({ ...job, _normalize_error: String(error) })
      }
    })
}
