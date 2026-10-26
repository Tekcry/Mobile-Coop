status: done feature/route-runs-seams 36424fb4ae0fe30087b22118f8bc5d096d000f0d
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

## Report (Night Shift | Cloud Builder 1, 2026-10-26)
Branch `feature/route-runs-seams` from bf8a91ee, pushed, head `36424fb4ae0fe30087b22118f8bc5d096d000f0d`.

### Commits
- 3f4f73f3b SR3 course interrupt (in-page `interrupt` / `posN`; runSteps / linkStep / objectiveStep / split resume
  through `course.onRestart`), SR4 `onRunEnd`
- 50eb11084 SR1, SR2, SR5, R6 `--points` through `loadPoints`
- 3736c7dca unit tests, a selftest's points never through the loader, changelog fragment
- 36424fb4a test trims

### What changed (file:line on the head)
- SR1 `scripts/route-run.mjs:303` `forgiveFor(detections, mode)`: `'forgive'` and not `course`; used at `:440`.
- SR2 `scripts/route-run.mjs:310` `stepsContext(ctx, { shots, notes, stick, graphs, fixture })`: the old
  `Object.assign` plus `graphs` and `selftest: fixture?.expect ?? null`; called at `:477`.
- SR3 in-page (`scripts/route-run/driver.mjs`): latch `:131`; `tick` `:573-583` stops the robot (stick at rest, a held
  A let go, mode idle), the leader's tick returns `{ ev: 'course', dt: 0 }` at once, the follower latches it in `fev`;
  `place` counts placements (`:869`); `posN()` `:895` returns `[x, y, z, placements]`; `interrupt()` `:901`; the latch is
  cleared in `begin` (`:617`) and `restart` (`:650`).
- SR3 Node side (`driver.mjs`): `runSteps` `onCourse` `:1148` calls `course.onRestart(ctx, log, steps, i)`, places
  `r.place.leader` through `d.place` (both robots) and `r.place.follower` through `placeFollower` when given, continues
  at `r.resume`; a null result takes the same step again; the skip set is cleared. Walk wait `:1171`, link step
  `:1195` (door wait `:1263`), objective `:1205` (waits `:1307`, `:1313`), split `:1211-1224`. `pair.mjs` unchanged
  (`pair.call('interrupt')` already reaches the leader without bumping the epoch); in a split driver.mjs forwards the
  interrupt to the follower (`ctx.pair.fcall('interrupt')`) when the leader's leg ends on it.
- SR4 `driver.mjs:1136`: `await course.onRunEnd?.(ctx, log)`, after the detection / notice lines.
- SR5 `scripts/route-run.mjs:296`: `if (er.course) problems.push(...checkCourseExpect(er.course, log))`; import `:29`.
- R6 loader `scripts/route-run.mjs:331` `readPoints(o, graphs, fixture, load)`, used at `:409`: a selftest keeps its
  fixture's table, else reads `--points` as is, unchecked (R6's sketch); otherwise `--points <file|auto>` goes through
  `loadPoints({ graphs, files: o.graphs, src })`, which throws on a stale table (exit 2); a fixture given as `--graph`
  keeps its own table; `auto` added to the usage text and header.
- `scripts/route-run/course.mjs`: no-op `onRestart` returning null (`:20`), `checkCourseExpect` returning `[]` (`:25`).
- `tests/routeRunSeams.test.ts` (new, 13 tests): `vi.mock` replaces course.mjs with recording hooks; fake pages in a vm
  as in routeRunPair.
- `changes/feature-route-runs-seams.md` (`kind: patch`).

### Tests
- `npx tsc --noEmit -p tsconfig.json` and `npm run typecheck:fast`: clean.
- `npx vitest run` on the 7 named files: 171/171 (routeRunSeams 13, routeRunSteps 38, routeRunPair 15, routeRunCli 39,
  routeRunPlan 19, routeRunProgress 29, routeRunReport 18). No existing test changed.
- Seams tests cover: SR1 (course mode: guard stays alert, alarm not reset; Sector Ops: calmed); SR2 (`ctx.graphs`,
  `ctx.selftest`, null outside a selftest); SR3 (leader's next tick returns `course` dt 0 with the robot stopped, the
  follower latches it, `posN` counts placements; one-page and pair runs call `onRestart` once with
  `(ctx, log, steps, 0)` and take its placement and resume, the follower page never gets `interrupt`; a split ends both
  legs and runs `onRestart` once at the split index; a null result retakes the step); SR4 (called once, after the
  lines are in the log); SR5 (problems reach `checkSelftest`; not called with no course block; defaults hold); loader
  (a path, `auto`, a stale table refused, notes printed, a selftest's table never checked, usage text).
- Also run by hand in a scratch copy against R6's real `points.mjs` (origin/feature/route-runs-r6 51e0f197, not
  committed): campus `--dry-run` stdout unchanged with its one note on stderr; a stale-geom table refused with exit 2.

### Size
`pr-size --base bf8a91ee` counts 447 lines, over the brief's ~250: code 155, test 292 (mostly the fake game and pair
setup the SR3 / SR4 runs need).

### Deviations and readings
1. Split resume: read as both legs end, then `onRestart(ctx, log, steps, i)` with `i` = the split step's index, then on
   from its `resume`. An interrupted split still logs its `splits` record with both legs `reached: false`; a rejoin
   that walks the split again logs a second record with the same id, and `checkSelftest`'s `split` line reads the first.
2. One line beyond the SR text: `runOne` resets `d.onChunk` to a no-op before the run's own restart (`driver.mjs:1082`).
   Without it the previous run's `onPoll(ctx, prevLog)` runs during the next run's restart and settle, and R4c's
   watcher would log the harness's own restart into the previous run.
3. Gap left for the lead: a `course` event that arrives when no driver wait is open is consumed and lost (during a
   steps.mjs machine `ctx.advance`, a `hold` (ends early), a stub, or while the leader holds at a split rejoin);
   course.mjs's queued action then waits for the next interrupt. The SR text only names the waits in `runSteps` /
   `linkStep` / `objectiveStep`.
4. R6 is not on this base: `points.mjs` is loaded with a dynamic `import()`. Until R6 merges, `--points <file>` keeps
   today's plain read with a note and `--points auto` is refused with a plain message (defaults unchanged). Notes go to
   stderr (`route-run points: ...`), not stdout as R6's sketch has it, so `--dry-run` stdout stays the plan only
   (routeRunCli's dry-run test checks it exactly; with R6 the campus pair prints one note).
5. SR2 is in the context shared by one and two players, not only the pair's ctx at R4b `:421`. SR1 and SR2 are small
   exported helpers so they can be unit tested.
6. The run log still records `detections: 'forgive'` (the flag) in course mode though nothing is forgiven in the page;
   left for R2's wording.

### Pending PC runs
None of its own. R4c's course selftest exercises these seams; R4b's and R4a's selftests are the regression runs listed
in the R4c brief.
