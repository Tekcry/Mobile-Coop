status: claimed Night Shift | Cloud Builder 2 2026-10-25T11:18:29Z
# sector-batch B1 (cloud): Sector Ops batch J18, slice B1

Lead: Night Shift | Sector Ops Build. Job sector-batch (FOLDED-PLAN J18, ROADMAP Now row 16). Plan checked (checks
1-3, check 3 PASS at 31e9f22e).

- Base: origin/feature/sector-batch @ 31e9f22ed4491aff24cbcdc0dbc2614432631da8. New branch: `feature/sector-batch-b1` (create it from the base and push it; never push to any other branch).
- The strict brief is `docs/sector-batch/briefs/B1.md` on `origin/feature/sector-batch` @ 31e9f22ed4491aff24cbcdc0dbc2614432631da8 (read it there with
  `git show`), with BRIEF.md, PLAN.md and PLAN-CHECK.md "## Check 3" polish notes that name B1.
- Cloud changes to the brief:
  - Ignore its desktop worktree path and the toplevel part of its guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/sector-batch-b1`.
  - Its file list, never-touch list and steps are exact. If a line moved, follow the brief's anchor text; if a test
    fails for a reason the brief does not list, stop and set `status: blocked <reason>`.
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files with
    `--maxWorkers=2`. Every e2e or GPU leg is "pending PC run": list it, do not run it.
  - Commit and push after each numbered step, path-limited, never `git add -A`.
- Done: every step pushed on `feature/sector-batch-b1`; a report `docs/sector-batch/checks/b1-build.md` on that branch (changes per file,
  tests with counts, deviations, pending PC runs); then `status: done feature/sector-batch-b1 <sha>` here.
