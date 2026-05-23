import { createHash } from 'crypto'

export interface NormalizedJob {
  source_job_id: string
  url: string
  url_hash: string
  employer: string
  title: string
  location: string
  remote_flag: boolean
  salary_text?: string | null
  work_type?: string | null
  description_text: string
  description_html?: string | null
  posted_at?: Date | null
  raw_payload: Record<string, unknown>
  dedupe_key: string
}

/**
 * Canonicalize a job URL by:
 * - Removing query parameters (tracking, utm, etc.)
 * - Lowercasing the hostname
 * - Removing fragments (#)
 */
export function canonicalizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString)
    // Remove tracking query params but keep essential ones (if needed)
    // For now, strip all query params for simplicity
    url.search = ''
    url.hash = ''
    return url.toString().toLowerCase()
  } catch (e) {
    // If URL parsing fails, return original string lowercased
    return urlString.toLowerCase().split('?')[0].split('#')[0]
  }
}

/**
 * Generate a SHA256 hash of the canonical URL
 */
export function generateUrlHash(url: string): string {
  const canonical = canonicalizeUrl(url)
  return createHash('sha256').update(canonical).digest('hex')
}

/**
 * Generate a dedupe key (SHA256 hash of employer|title|location)
 * Used to detect jobs with same employer, title, and location
 */
export function generateDedupeKey(employer: string, title: string, location: string): string {
  const normalized = [
    (employer || '').trim().toLowerCase(),
    (title || '').trim().toLowerCase(),
    (location || '').trim().toLowerCase(),
  ].join('|')

  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * Strip HTML tags from a string, preserving text content
 * Also decodes HTML entities
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''

  // Remove HTML tags
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags
    .replace(/<[^>]+>/g, '') // Remove all other HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')

  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()

  return text
}

/**
 * Safely extract a string value from an object, with fallback and trimming
 */
export function extractString(obj: any, key: string, fallback = ''): string {
  const value = obj?.[key]
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return fallback
}

/**
 * Safely extract a boolean value from an object
 */
export function extractBoolean(obj: any, key: string, fallback = false): boolean {
  const value = obj?.[key]
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.toLowerCase())
  if (typeof value === 'number') return value !== 0
  return fallback
}

/**
 * Safely extract a date from an object (ISO string or Date object)
 */
export function extractDate(obj: any, key: string): Date | null {
  const value = obj?.[key]
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }
  return null
}
