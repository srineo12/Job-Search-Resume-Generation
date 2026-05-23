import {
  NormalizedJob,
  canonicalizeUrl,
  generateUrlHash,
  generateDedupeKey,
  stripHtml,
} from './base'

/**
 * Normalize a single Seek job from websift/seek-job-scraper Apify actor.
 *
 * Actual field names from the actor (confirmed from live data):
 *   id             → source_job_id
 *   title          → title
 *   advertiser.name → employer
 *   joblocationInfo.location / suburb → location
 *   jobLink        → url  (NOT 'url')
 *   salary         → salary_text
 *   workTypes      → work_type
 *   workArrangements → remote indicator
 *   content.unEditedContent → description_html
 *   content.sections → description_text fallback
 *   listedAt       → posted_at  (NOT 'postedDate')
 */
export function normalizeSeekJob(raw: any): NormalizedJob {
  // URL — field is 'jobLink', not 'url'
  const urlString = raw.jobLink || raw.url || raw.applyLink || ''
  const canonUrl = canonicalizeUrl(urlString)
  const urlHash = generateUrlHash(canonUrl)

  // Source ID
  const sourceJobId = String(raw.id || raw.jobId || '')

  // Employer — nested under advertiser.name
  const employer = raw.advertiser?.name || raw.company || raw.employer || ''

  // Title
  const title = raw.title || ''

  // Location — nested under joblocationInfo
  // Prefer displayLocation (e.g. "Melbourne VIC 3000") to avoid duplicating suburb+location.
  const locInfo = raw.joblocationInfo || {}
  const location = locInfo.displayLocation
    ? locInfo.displayLocation
    : locInfo.suburb && locInfo.location && locInfo.suburb !== locInfo.location
      ? `${locInfo.suburb}, ${locInfo.location}`
      : (locInfo.location || locInfo.suburb || raw.location || '')

  // Remote flag
  const remoteFlag = typeof raw.workArrangements === 'string'
    ? raw.workArrangements.toLowerCase().includes('remote')
    : false

  // Salary
  const salaryText = raw.salary || ''

  // Work type
  const workType = raw.workTypes || raw.workType || ''

  // Description — field is content.unEditedContent, not 'description'
  const descriptionHtml = raw.content?.unEditedContent || raw.description || ''
  const descriptionText = descriptionHtml
    ? stripHtml(descriptionHtml)
    : Array.isArray(raw.content?.sections) ? raw.content.sections.join('\n') : ''

  // Posted date — field is 'listedAt', not 'postedDate'
  const postedAtRaw = raw.listedAt || raw.postedDate || raw.datePosted || null
  const postedAt = postedAtRaw ? new Date(postedAtRaw) : null

  const dedupeKey = generateDedupeKey(employer, title, location)

  return {
    source_job_id: sourceJobId,
    url: canonUrl,
    url_hash: urlHash,
    employer,
    title,
    location,
    remote_flag: remoteFlag,
    salary_text: salaryText || null,
    work_type: workType || null,
    description_text: descriptionText,
    description_html: descriptionHtml || null,
    posted_at: postedAt,
    raw_payload: raw,
    dedupe_key: dedupeKey,
  }
}

export function normalizeSeekJobs(rawJobs: any[]): NormalizedJob[] {
  return (Array.isArray(rawJobs) ? rawJobs : [])
    .filter((job) => job && typeof job === 'object')
    .map((job) => {
      try {
        return normalizeSeekJob(job)
      } catch (error) {
        console.error('Error normalizing Seek job:', error)
        return null
      }
    })
    .filter(Boolean) as NormalizedJob[]
}
