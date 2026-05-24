/**
 * SCENARIO 1 — Document Generation (E2E)
 *
 * Tests the Generate bulk action on a selected Open job:
 *   - Selects an Open row via checkbox
 *   - Clicks the header-level "📄 Generate" bulk action button
 *   - Verifies the API returns a ZIP (via response interception)
 *   - ZIP contains 2 DOCX files (PDF removed — pdfkit font issue on Vercel)
 *   - Toast shows success message
 *   - Row status changes to Generated
 *   - No row-level Gen buttons exist (header-only)
 *
 * LOCAL ONLY — skipped in CI (requires real DB + real API keys).
 * Run manually:
 *   cd app && npx playwright test --grep "generate" --headed
 */

import { test, expect } from '@playwright/test'
import JSZip from 'jszip'

// Skip entirely in CI
test.skip(!!process.env.CI, 'Scenario 1 is local-only — requires real API keys and live DB')

test.describe('Scenario 1 — Document Generation', () => {

  test('Generate bulk action on selected Open job downloads a valid ZIP and updates status', async ({ page }) => {
    // AI generation can take up to 60s — override the default 30s test timeout
    test.setTimeout(120_000)

    // ── 1. Navigate to Jobs page ────────────────────────────────────────────
    await page.goto('/jobs')
    await expect(page.locator('text=Loading jobs…')).toBeHidden({ timeout: 15_000 })

    // ── 2. Find the first Open row ──────────────────────────────────────────
    const openRow = page.locator('[data-wf="open"]').first()
    await expect(openRow).toBeVisible({ timeout: 10_000 })

    // Extract job ID and select via checkbox
    const rowTestId = await openRow.getAttribute('data-testid')
    const jobId = rowTestId?.replace('job-row-', '') ?? ''
    expect(jobId).toBeTruthy()

    await openRow.locator('input[type="checkbox"]').check()

    // ── 3. Click the header-level Generate bulk action ──────────────────────
    const generateBulkBtn = page.locator('button', { hasText: 'Generate' }).first()
    await expect(generateBulkBtn).toBeVisible()

    // Intercept the generate API response instead of waiting for a download event
    // (Playwright cannot intercept blob URL downloads)
    const [response] = await Promise.all([
      page.waitForResponse(
        res => res.url().includes(`/api/jobs/${jobId}/generate`) && res.status() === 200,
        { timeout: 65_000 }
      ),
      generateBulkBtn.click(),
    ])

    // ── 4. Assert: API returned a ZIP ───────────────────────────────────────
    const contentType = response.headers()['content-type'] ?? ''
    expect(contentType).toContain('application/zip')

    // ── 5. Assert: ZIP contains exactly 2 DOCX files ────────────────────────
    const zipBuffer = await response.body()
    const zip = await JSZip.loadAsync(zipBuffer)

    const entries = Object.keys(zip.files).filter(name => !zip.files[name].dir)
    expect(entries).toHaveLength(2)

    // Entry names are inside a folder: {employer}_{title}_{jobId}/CandidateName_..._Resume.docx
    const fileNames = entries.map(e => e.split('/').pop() ?? '')
    expect(fileNames.some(f => f.endsWith('_Resume.docx'))).toBe(true)
    expect(fileNames.some(f => f.endsWith('_Cover_Letter.docx'))).toBe(true)

    // ── 6. Assert: success toast appears ────────────────────────────────────
    const successToast = page.locator('[data-testid="toast-success"]')
    await expect(successToast).toBeVisible({ timeout: 10_000 })
    await expect(successToast).toContainText('Documents ready')

    // ── 7. Assert: status dropdown changed to Generated ──────────────────────
    const statusSelect = page.locator(`[data-testid="status-select-${jobId}"]`)
    await expect(statusSelect).toHaveValue('generated', { timeout: 5_000 })
  })

  test('No Gen button exists at row level (header-only generate)', async ({ page }) => {
    await page.goto('/jobs')
    await expect(page.locator('text=Loading jobs…')).toBeHidden({ timeout: 15_000 })

    // There should be zero row-level gen buttons anywhere in the table
    const rowGenButtons = page.locator('[data-testid^="gen-btn-"]')
    await expect(rowGenButtons).toHaveCount(0)
  })
})
