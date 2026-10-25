status: done feature/map-ready-s14 763fc7bfba8d856aa576711cae9c4fd4b9cb4beb
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

## Report (Night Shift | Cloud Builder 4, 2026-10-25 ~23:40Z)
Branch `feature/map-ready-s14` from a85f3db93, head 763fc7bfba8d856aa576711cae9c4fd4b9cb4beb. Commits: 221635bf5 (step 1 compile log + test), 28e90f014
(step 2 compile order + test), a3db057aa (step 3 log in GameState), 2947b7dae (step 4 cut A), 624014911 (step 5 measure
script), 763fc7bfb (fragment + report). Full report: `docs/map-ready/checks/s14-build.md` on the branch.
- Checks: `npx tsc --noEmit -p .` clean; eslint clean; vitest compileLog 9, compileOrder 8, mapGate 15, mapReadyStats 7,
  menuGate 10, changesFragments 1 = 50 / 50; `node --check` on the measure script; doc-lint 0 errors.
- Step 3 code read: `frameUpdate` does run during S2's hold (`Loop.frame` calls it with dt 0 while paused,
  `src/core/loop.ts:214`), so the poll is in `frameUpdate` only. `Loop.advance` and a hidden tab skip frames; the log
  then catches up on the next frame (late ready times).
- Deviations (each with its undo in the report): `summary` adds ", none finished" / ", N pending at T s"; a finished
  log ignores late calls; serial no longer ends the chain on a thrown group (S2 skipped the rest); an exited match keeps
  its watched effects until the state is collected (`exit()` is not this slice's; one-line undo named).
- Parallel note: the guards group starts at quality + content, before `bodies`; unloaded guard bodies compile later in
  rest / `gateDrawReady`.
- Size: 691 + / 36 - code, plus the report.
- Step 6: pending PC run; the three request lines are in the report.
