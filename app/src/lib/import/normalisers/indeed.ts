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
 * Normalize a single Indeed job from Apify into canonical format
 */
export function normalizeIndeedJob(raw: any): NormalizedJob {
  // Extract URL and generate hash
  const urlString = extractString(raw, 'jobUrl') || extractString(raw, 'url', '')
  const canonUrl = canonicalizeUrl(urlString)
  const urlHash = generateUrlHash(canonUrl)

  // Extract basic job info (Indeed uses different field names)
  const sourceJobId = extractString(raw, 'jobKey') || extractString(raw, 'id', '')
  const employer = extractString(raw, 'companyName') || extractString(raw, 'company', '')
  const title = extractString(raw, 'jobTitle') || extractString(raw, 'title', '')
  const location = extractString(raw, 'jobLocation') || extractString(raw, 'location', '')

  // Indeed doesn't always have explicit remote flag, but employment type might indicate it
  const employmentType = extractString(raw, 'employmentType', '').toLowerCase()
  const remoteFlag = employmentType.includes('remote') || extractBoolean(raw, 'remote')

  // Generate dedupe key
  const dedupeKey = generateDedupeKey(employer, title, location)

  // Extract salary and description
  const salaryText = extractString(raw, 'salary') || extractString(raw, 'salaryText', '')
  const descriptionHtml = extractString(raw, 'jobDescription') || extractString(raw, 'description', '')
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
 * Normalize an array of Indeed jobs
 */
export function normalizeIndeedJobs(rawJobs: any[]): NormalizedJob[] {
  return (Array.isArray(rawJobs) ? rawJobs : [])
    .filter((job) => job && typeof job === 'object')
    .map((job) => {
      try {
        return normalizeIndeedJob(job)
      } catch (error) {
        console.error('Error normalizing Indeed job:', error, job)
        // Return a minimal job to track the error
        return normalizeIndeedJob({ ...job, _normalize_error: String(error) })
      }
    })
}
