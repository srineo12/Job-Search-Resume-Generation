# Skill: Testing

_Auto-triggers on any testing-related request (writing tests, fixing failing tests, adding scenarios)._

---

## Trigger phrases

- "write tests for scenario N"
- "fix failing test"
- "add test for X"
- "test:all is failing"

---

## Rules (non-negotiable)

### Before writing any test
1. Read `docs/TEST_SCENARIOS.md` — find the scenario being asked for
2. Read the source file being tested — understand the function signature and edge cases
3. Check `tests/fixtures/<feature>/` — reuse existing fixtures; create if missing

### File locations
| Test type | Location |
|-----------|----------|
| Unit / integration | `tests/unit/<feature>/<scenario-name>.test.ts` |
| E2E | `tests/e2e/<scenario-name>.spec.ts` |
| Fixtures | `tests/fixtures/<feature>/<name>.json` |

### Selectors (E2E only)
- Always use `data-testid` attributes, never CSS classes or text
- If `data-testid` is missing on the element, add it to the component first, then write the test

### After writing tests — hard 2-run cap
1. Run `npm test` (unit) or `npx playwright test --grep <name>` (E2E) once
2. **If green on run 1** → done, report success
3. **If red on run 1** → attempt ONE fix, re-run (run 2)
4. **If green on run 2** → done, report what was fixed
5. **If red on run 2** → STOP IMMEDIATELY. Report:
   - Which assertions failed and why
   - What the one fix attempt was
   - What the user should decide next
   Do NOT attempt a third run. Do NOT keep fixing. Wait for instruction.

### Never do these
- Mark a task done with a failing test
- Add `.skip` without a code comment explaining the reason
- Delete a test to make CI pass
- Write tests for scenarios the user did not ask for

### Fixture naming
```
tests/fixtures/<feature>/
  <input-name>.json           ← raw input data
  <input-name>.expected.json  ← expected output (optional, for complex assertions)
```
Use fake data only — no real names, real emails, real job URLs.

### Coverage
After writing tests, run `npx vitest run --coverage` and note if coverage on the changed file dropped. Report it to the user if it did.
