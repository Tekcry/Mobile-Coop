status: open
# J13 route-runs, slice SEAMS (Opus-grade, small): R4c's seam requests SR1-SR5 and R6's points loader, in the driver

Lead: Night Shift | Marlow Build. R4c (Course mode) and R6 (points) each need a few lines in files that R4b / R5 own
(`scripts/route-run.mjs`, `scripts/route-run/driver.mjs`). Those files now live on the combined branch of draft PR #520,
so the changes go there as one small slice; the lead merges it into #520 after its checker.

- Base: `feature/route-runs-r5-on-r4b` @ bf8a91ee4f8ebcaff23355c9ff1eb61aa63baade (R5 + R4b + seam fix round 1; Opus
  PASS). New branch: `feature/route-runs-seams`. Commit and push every sub-step (path-limited `git add`, never `-A`).
- Read first: `docs/systems/agent-preamble.md` (origin/master); `briefs/route-runs-r4c.md` on cloud-queue, section
  "Seam requests" (SR1-SR5, lines ~145-165) and the parts of its "What to build" that call them (items 4-6); the line
  numbers there are on R4b f8b0429c8, so find each spot on this base by its function name (the R5 fix round moved
  lines in driver.mjs / route-run.mjs: linkStep's stop branch, `stopPos` / `recoverPast` in pair.mjs, `ctx.stick`).
  `briefs/route-runs-r6.md` on cloud-queue: its one-line request (`route-run.mjs` ~:316, `loadPoints` instead of a
  plain `readJson`).
- Context: in a two-player run every page call goes through `PairDriver` and game time only through `ctx.advance`;
  `onPoll` runs inside the pair's tick lock (cannot wait or move robots) - that is why SR3 adds an interrupt event and
  `course.onRestart`.

## Only these files
- `scripts/route-run.mjs`, `scripts/route-run/driver.mjs`, `scripts/route-run/pair.mjs` (only if SR3 needs the pair
  to forward the interrupt), `scripts/route-run/course.mjs` (only the no-op `onRestart` default and the
  `checkCourseExpect` stub that returns `[]`, so SR5 has something to call before R4c lands)
- `tests/routeRunCli.test.ts`, `tests/routeRunPair.test.ts` and one new `tests/routeRunSeams.test.ts`
- `changes/feature-route-runs-seams.md` (`kind: patch`)

## Build
SR1-SR5 exactly as the R4c brief specifies them, plus R6's `loadPoints` line. Every new hook defaults to today's
behaviour (no course module = no change), so the existing selftests and unit tests are unchanged. No change to
steps.mjs, plan / progress / report / causes, or any e2e script.

## Unit tests (no browser)
`tests/routeRunSeams.test.ts`: SR1 (course mode -> no in-page forgive call), SR2 (`ctx.graphs`, `ctx.selftest`
present), SR3 (an interrupt latched on the leader's next tick, `course.onRestart` called once with the queued action,
the follower untouched), SR4 (the hook runs after the detection / notice lines), SR5 (`checkCourseExpect` problems
reach `checkSelftest`), loadPoints (points file read through the loader). Fake pages, as `routeRunPair.test.ts` does.

## Checks (cloud: tsc + named vitest files only)
`npx tsc --noEmit -p tsconfig.json`; `npx vitest run tests/routeRunSeams.test.ts tests/routeRunSteps.test.ts
tests/routeRunPair.test.ts tests/routeRunCli.test.ts tests/routeRunPlan.test.ts tests/routeRunProgress.test.ts
tests/routeRunReport.test.ts`. Pending PC run: none of its own (R4c's selftest exercises it).

## Done
SR1-SR5 and the loader in, defaults unchanged, tests green, size under ~250 counted lines. Append a short report
(commits, file:line per SR, test counts, anything in the R4c brief's SR text you had to read differently), set
`status: done feature/route-runs-seams <sha>`.

## Report (append below)
