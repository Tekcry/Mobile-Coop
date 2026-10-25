status: done feature/sector-batch-b2 77a49f25f84bce09cfaaaedf5c30ccc461f59545
# sector-batch B2 (cloud): Sector Ops batch J18, slice B2 (solo-route data check, campusOps)

Lead: Night Shift | Sector Ops Build. Job sector-batch (FOLDED-PLAN J18, ROADMAP Now row 16). Plan checked (checks
1-3, check 3 PASS at 31e9f22e). B1 (its own cloud brief) edits disjoint files; the lead merges both into PR A.

- Base: origin/feature/sector-batch @ 31e9f22ed4491aff24cbcdc0dbc2614432631da8. New branch: `feature/sector-batch-b2`
  (create it from the base and push it; never push to any other branch).
- The strict brief is `docs/sector-batch/briefs/B2.md` on that base (read it with `git show`), with BRIEF.md, PLAN.md
  section "B2" and PLAN-CHECK.md "## Check 3" notes that name B2. PLAN:341 warns B2 may fail on S4 or S5 (the cage
  pair gate, the basket drop): if the check fails on real map data, do not loosen it: report which section and why,
  mark that case per the brief (or `status: blocked <reason>` if the brief gives no rule).
- Cloud changes to the brief:
  - Ignore its desktop worktree path and the toplevel part of its guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/sector-batch-b2`.
  - Its file list, never-touch list and steps are exact. If a line moved, follow the brief's anchor text.
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files with
    `--maxWorkers=2`. Every e2e or GPU leg is "pending PC run": list it, do not run it.
  - Commit and push after each numbered step, path-limited, never `git add -A`.
- Done: every step pushed on `feature/sector-batch-b2`; a report `docs/sector-batch/checks/b2-build.md` (changes per
  file, tests with counts, deviations, pending PC runs); then `status: done feature/sector-batch-b2 <sha>` here.

## Report
Cloud Builder 2, 2026-10-25. Head 77a49f25 on `feature/sector-batch-b2`; full report `docs/sector-batch/checks/b2-build.md`.
- Changed: `src/game/sectorSolo.ts` (new, brief text verbatim), `tests/sectorSolo.test.ts` (new, the 6 cases),
  `tests/campusSoloRoute.test.ts` (new, brief text verbatim), the report. Nothing else (diff stat checked).
- Tests: tsc pass. vitest (4 files, --maxWorkers=2) 32 / 33: sectorSolo 6/6, sectorBolt + sectorBoltPair 24/24,
  campusSoloRoute 2/3. S4 (cage gate) and S5 (pair gate) both pass the solo check: no declared route crosses either
  gate at its floor (S4's high route passes over the cage gate at y 4.4; the rest stay 1.9-2.7 m off).
- Open for the lead: campusSoloRoute "the rule bites" throws `no campus route crosses a team door` (nothing on live data
  to bite on). Kept as is per brief step 3 (red on the branch); the lead decides on a synthetic copy.
- Deviations: none in code; cloud guard and trailers. Pending PC runs: none (no e2e / GPU leg in the brief).
