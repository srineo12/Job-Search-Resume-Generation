/**
 * FRAMEWORK SMOKE TEST — reference template only.
 *
 * Purpose: prove Vitest + TypeScript path aliases work.
 * Do NOT treat this as a real scenario test.
 * Do NOT copy-paste this to write new tests — wait for TEST_SCENARIOS.md.
 *
 * To run just this file:
 *   npx vitest run tests/unit/normalisers/base.reference.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  generateDedupeKey,
  canonicalizeUrl,
  stripHtml,
} from '@/lib/import/normalisers/base'

describe('[REFERENCE] lib/import/normalisers/base', () => {
  describe('generateDedupeKey', () => {
    it('returns a 64-character hex string', () => {
      const key = generateDedupeKey('Acme Corp', 'Software Engineer', 'Melbourne VIC')
      expect(key).toHaveLength(64)
      expect(key).toMatch(/^[0-9a-f]+$/)
    })

    it('is case-insensitive (same result regardless of case)', () => {
      const a = generateDedupeKey('Acme Corp', 'Software Engineer', 'Melbourne VIC')
      const b = generateDedupeKey('ACME CORP', 'SOFTWARE ENGINEER', 'MELBOURNE VIC')
      expect(a).toBe(b)
    })

    it('is stable — same inputs always produce the same key', () => {
      const first  = generateDedupeKey('Telstra', 'Customer Service', 'Sydney NSW')
      const second = generateDedupeKey('Telstra', 'Customer Service', 'Sydney NSW')
      expect(first).toBe(second)
    })

    it('differs when any field changes', () => {
      const base    = generateDedupeKey('Acme', 'Engineer', 'Melbourne')
      const diffCo  = generateDedupeKey('Other', 'Engineer', 'Melbourne')
      const diffJob = generateDedupeKey('Acme', 'Manager', 'Melbourne')
      const diffLoc = generateDedupeKey('Acme', 'Engineer', 'Sydney')
      expect(base).not.toBe(diffCo)
      expect(base).not.toBe(diffJob)
      expect(base).not.toBe(diffLoc)
    })
  })

  describe('canonicalizeUrl', () => {
    it('strips query string and fragment', () => {
      const result = canonicalizeUrl('https://www.seek.com.au/job/12345?utm_source=google#apply')
      expect(result).toBe('https://www.seek.com.au/job/12345')
    })

    it('lowercases the result', () => {
      const result = canonicalizeUrl('https://SEEK.COM.AU/Job/12345')
      expect(result).toBe(result.toLowerCase())
    })
  })

  describe('stripHtml', () => {
    it('removes HTML tags', () => {
      expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world')
    })

    it('returns empty string for null/undefined', () => {
      expect(stripHtml(null)).toBe('')
      expect(stripHtml(undefined)).toBe('')
    })

    it('decodes common HTML entities', () => {
      expect(stripHtml('&amp; &lt; &gt; &quot;')).toBe('& < > "')
    })
  })
})
