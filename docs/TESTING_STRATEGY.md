# Testing Strategy

_Last updated: 2026-05-24_

---

## Test Pyramid

```
         ┌──────────────┐
         │   E2E (few)  │  ← Playwright, real browser, full user flows
         ├──────────────┤
         │ Integration  │  ← API route handlers + Supabase mock
         │   (some)     │
         ├──────────────┤
         │  Unit (many) │  ← Pure functions in lib/, zero external deps
         └──────────────┘
```

### Split targets

| Level | Target count | Run time |
|-------|-------------|----------|
| Unit | 80% of all tests | < 5s total |
| Integration | 15% | < 30s total |
| E2E | 5% (critical paths only) | < 2 min total |

---

## What Gets Tested at Each Level

### Unit — `tests/unit/`
Pure TypeScript functions with no I/O, no network, no database.

**In scope:**
- `src/lib/import/normalisers/base.ts` — `canonicalizeUrl`, `generateUrlHash`, `generateDedupeKey`, `stripHtml`, `extractString`, `extractBoolean`, `extractDate`
- `src/lib/import/normalisers/seek.ts` — field mapping from raw Apify payload → NormalizedJob
- `src/lib/import/normalisers/indeed.ts` — field mapping for Indeed
- Any future pure utility in `src/lib/`

**Out of scope for unit:** API routes, React components, database queries.

### Integration — `tests/unit/` (tagged with `integration`)
API route handlers called directly (no HTTP) with Supabase client mocked.

**In scope (when you ask for these):**
- `app/api/jobs/route.ts` — GET, PATCH, DELETE
- `app/api/jobs/rank-batch/route.ts`
- `app/api/imports/route.ts`

**Mocking approach:** Mock `@supabase/ssr` at the module level with `vi.mock()`.

### E2E — `tests/e2e/`
Real browser against a running dev server (`http://localhost:3000`).

**In scope (when you ask for these):**
- Jobs page table renders and filters work
- Status dropdown changes persist
- Gen button triggers download for Open jobs only
- Import form submits and shows history

---

## Fixture Location & Naming

```
tests/fixtures/
  <feature>/
    <name>.json        ← input data
    <name>.expected.json  ← expected output (if applicable)
```

Examples:
```
tests/fixtures/normalisers/seek-raw-job.json
tests/fixtures/normalisers/seek-raw-job.expected.json
tests/fixtures/jobs/sample-job-row.json
```

**Rules:**
- Fixtures are plain JSON — no code, no imports
- Never use real personal data in fixtures (use fake employer names, fake URLs)
- One fixture per feature area; add fields as tests require them

---

## Commands

```bash
# Run unit tests once (used in CI)
npm test

# Run unit tests in watch mode (local dev)
npm run test:watch

# Run E2E tests (requires dev server or BASE_URL env)
npm run test:e2e

# Run everything (CI gate)
npm run test:all

# Run with coverage report
npx vitest run --coverage
```

---

## Definition of Done

A task is NOT done if any of these are true:

- `npm run test:all` exits non-zero
- Any test is marked `.skip` or `.todo` without a linked issue
- A test was deleted to make CI pass
- Coverage on the changed `src/lib/` file dropped below the previous run

When a test fails:
1. **Fix the code, not the test** — unless the test expectation is demonstrably wrong
2. If the test is wrong, note why in a code comment before changing it
3. Never suppress or `.skip` a failing test without a comment

---

## CI Behaviour

- Runs on every push and every pull request (see `.github/workflows/ci.yml`)
- Steps: checkout → install → lint → `npm run test:all`
- On unit test failure: CI fails immediately, no E2E runs
- On E2E failure: Playwright HTML report uploaded as artifact (`playwright-report/`)
- No test caching — always fresh install in CI
- `BASE_URL` is not set in CI, so E2E uses the `webServer` config in `playwright.config.ts` which starts `npm run dev` automatically

---

## Adding New Tests

1. Check `docs/TEST_SCENARIOS.md` — add a scenario block first
2. Tell Claude: "write tests for scenario N"
3. Claude will create the test file, fixtures if needed, and run `npm run test:all`
4. Review the output — if green, the scenario is done
