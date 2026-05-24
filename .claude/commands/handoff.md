---
description: End-of-session handoff — write SESSION_HANDOFF.md and commit
---

Create or overwrite `docs/SESSION_HANDOFF.md` with these sections:

1. **Session summary** — what we accomplished
2. **Files changed** — list with one-line purpose each
3. **Current state** — what works, what's half-done, what's untested
4. **Open decisions / blockers** — anything I need to decide or unblock
5. **Next steps** — exact, ordered actions for the next session
6. **Gotchas** — anything tricky discovered this session

Then:
- Stage all changes: `git add -A`
- If work is complete: commit to current branch with a descriptive message
- If work is WIP: commit to a branch named `wip/<short-feature-name>`
- Run `git log -1 --oneline` and show me the result

Do not skip the commit step. Do not ask for confirmation — just do it.
