status: open
# map-ready S14 (cloud): compile log and parallel priority compile (code + unit tests)

Lead: Night Shift | Sector Ops Build. Job map-ready (FOLDED-PLAN J21, ROADMAP Now row 17; Michael's near-instant loads
and his 20 s loading cap, ROADMAP Decided 2026-10-25 ~18:50 / ~20:05). S8's plan to reach 20 s: `docs/map-ready/SHORTEN.md`
on `origin/feature/map-ready` @ eae83afc9a2b527a2e0c76dba3326db5acd8508f. S1 and S2 are checker PASS. Opus work (gate
code).

- Base (code): `origin/feature/map-ready-s2` @ a85f3db930e6a00aa3fa5f6f93c210e91cd46527 (W0 + S1 fix1 + S2 fix1).
  New branch: `feature/map-ready-s14` (create it from that commit and push it; never push to feature/map-ready,
  feature/map-ready-s2, another lane or master).
- The strict brief is `docs/map-ready/briefs/S14.md` on `origin/feature/map-ready` @ eae83afc9 (the code base above
  predates it): read it with `git show eae83afc9a2b527a2e0c76dba3326db5acd8508f:docs/map-ready/briefs/S14.md`, with
  `docs/map-ready/SHORTEN.md` and `PLAN.md` (S2, S8) from the same commit. Its owned-file and never-touch lists are
  exact.
- Files (only these): `src/core/compileLog.ts` (new), `src/game/compileOrder.ts` (new), `tests/compileLog.test.ts`
  (new), `tests/compileOrder.test.ts` (new), `src/game/gameState.ts` (S1 / S2's map-ready members only, as the brief
  says), `scripts/map-ready-measure.mjs`, `changes/feature-map-ready-s14.md` (new, `kind: patch`), and the report
  `docs/map-ready/checks/s14-build.md` (new).
- Cloud changes to the brief:
  - Ignore its desktop worktree path and toplevel guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/map-ready-s14`.
  - Steps 1-5 are yours. Step 5 (`scripts/map-ready-measure.mjs`): write it and `node --check` it; never launch a
    browser. Step 6 is the lead's hand-over: write its request lines into the report as "pending PC run".
  - Step 3's check "does `frameUpdate` run during S2's hold" is a code read on the base (`App` loop and
    `GameState.frameUpdate`); say what you found in the report.
- Unit tests to run (only these; no e2e, no GPU, no `npm run check`): `npx tsc --noEmit -p .` (or
  `npm run typecheck:fast`) and `npx vitest run tests/compileLog.test.ts tests/compileOrder.test.ts
  tests/mapGate.test.ts tests/mapReadyStats.test.ts tests/menuGate.test.ts tests/changesFragments.test.ts
  --maxWorkers=2`.
- Commit and push each step, path-limited, never `git add -A`. Where the brief says STOP or a question cannot be
  settled from it: `status: blocked <reason>`.
- Done: steps 1-5 pushed, tsc clean, the vitest files above green; the brief's "Done looks like" for the code; report
  `docs/map-ready/checks/s14-build.md` (per step: files, tests with counts, deviations each with its undo, the pending
  PC runs with step 6's lines); then `status: done feature/map-ready-s14 <sha>` here with a short report below.
- Model hint: Opus 5.5.
