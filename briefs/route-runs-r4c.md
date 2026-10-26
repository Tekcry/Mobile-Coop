status: done feature/route-runs-r4c 7c54c35b958f423529f6ae2cc6ace80231e254f2
# J13 route-runs, slice R4c (Opus-grade brief): course mode, drill gates and restarts

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3). R1-R4a are on master; R4b (the robot pair, PR #510,
checker PASS) is this slice's base. R5 is being fixed in parallel on `feature/route-runs-r5-on-r4b` (steps.mjs only).
This slice fills R4a's `course.mjs` seam for Marlow Yard: drill gates (drill stubs at a locked course door) and the
restart / retry watcher (seen / timer / other, push past, `restart-loop`).
Builder: Opus. Home: **cloud** (pure parts and the page glue tested in vitest on fakes; page runs pending).

- Base: `feature/route-runs-r4b` @ `f8b0429c8080012f35e9a44e405408a674537645` (PR #510). If #510 has merged when you
  start, origin/master at or after that merge.
- New branch: `feature/route-runs-r4c`. Guard before every write:
  `test "$(git rev-parse --abbrev-ref HEAD)" = feature/route-runs-r4c`. `git add <files>` only, never `-A`. Push every
  finished sub-step.

## Read first
- `git show origin/master:docs/systems/agent-preamble.md` ("Cloud sessions"), `git show origin/master:CLAUDE.md`.
- On `origin/feature/route-runs-2`: `docs/route-runs/PLAN.md` slice **R4c** (`:192-219`), the R4a seams (`:154-161`),
  selftest fixtures (`:162-166`), R4b (`:178-190`), order and ownership (`:317-320`), Tests (`:322-327`), Checker gate
  (`:329-335`), Risks (`:353-365`); `docs/route-runs/BRIEF.md` "Marlow Yard drill gates" (`:105-116`), "Restarts and
  retries" (`:117-137`), A2 (`:183-187`, the course-mode forgive rule), A5 (`:199-202`), A13 (`:218-222`), A14
  (`:223-232`).
- The base, in full: `scripts/route-run/course.mjs` (the seam, 16 lines), `scripts/route-run/driver.mjs` (`runOne`
  `:1040-1105`, `runSteps` `:1109-1160`, `linkStep` `:1177-1209`: `course.onLockedDoor` at `:1186-1192`,
  `d.onChunk = () => course.onPoll(ctx, log)` at `:1075`; `PageDriver` `:974-1031` (`advance` `:983`, `place`
  `:1017`); in-page `tick` `:563-595`, `rise` `:263-289`, `poll` + forgive `:309-340`, `place` `:831-857`, `pos`
  `:872`), `scripts/route-run/pair.mjs` (`PairDriver` `:174-480`: `call` `:198`, `tickOnce` `:223` calls `onChunk`
  inside the tick lock, `hold` `:288`, `place` `:296`, `placeFollower` `:307`, `advance` `:326`, `robotDriver`
  `:336`), `scripts/route-run.mjs` (ctx `:404`, `:414`, `:421`; `checkSelftest` `:238-286`; `setupSection`
  `:490-514`), `scripts/route-run/causes.mjs` (raw rise shape), `scripts/route-run/report.mjs` `:136-170` (the drill
  and restart shapes R2 reads).
- Seam notes: `C:/NightShift/scratch/marlow/j13-r4b-check.md` "Seam notes" (cloud: the lead's summary is this
  paragraph): `ctx.clock()` reads host game seconds; `ctx.advance(s)` steps every page in lockstep (PageDriver at one
  player, PairDriver at two); `ctx.driver.hold(s)` holds both robots in the pair; `ctx.driver.place(pt)` places the
  leader and the follower beside it. **Never step one page** (`ctx.host` / `ctx.client` `tick`, a robot driver's
  `until`): that desyncs the pair.
- Game hooks, master (the built yard): `src/game/modes/courseMode.ts` (`window.__course = this` `:291`, `restarts`
  `:203`, `verb(p, verb)` `:482-494`, the spotted rule `:585-600` (`spotHold`, `st.currentBay.spotFail`), `bayRestart`
  `:695-720`, `debug()` `:1076-1094`), `src/game/course/courseState.ts` (`setFlag` `:356`, `lockedDoors` `:679`,
  `nextDrill` `:795`), `src/game/course/spotFail.ts`, `src/game/course/courseDef.ts` (`DrillDef` `:116-135`, gate
  kinds `:53-80`).
- Game hooks, J14 re-plan (not on master yet; feature-detect them): `origin/feature/marlow-replan-base`
  `src/game/course/courseState.ts:46-50` (`RetryCause = 'seen' | 'caught' | 'timer' | 'out' | 'down' | 'other'`,
  `LastRetry`), `src/game/modes/courseMode.ts:330-360` (`restarts` getter, `lastRetry`, `station()`, `retryOff(n)`);
  `origin/feature/marlow-replan:docs/marlow-replan/PLAN.md:310-335` (the R4c hooks and cause mapping) and `:553-557`
  (A26: the new cause `other`, A1's trap retry).
- Fixture source: `git show origin/feature/validator-port-s9:docs/marlow-final/graph/ctcourse.json` (b6464dd95, J12
  S9's as-built yard graph: `area` and `at` on every A1 / A2 space and link, `teach` on A1's leg-up). Fixture format:
  `tests/fixtures/route-run/selftest-pair.graph.json` on the base.

## The seam this fills
`scripts/route-run/course.mjs`: `onPoll(ctx, run)` after every driver chunk (single page: every evaluate, up to
`EVAL_S` 2 s of game time; pair: every 0.2 s, **inside the pair's tick lock**) and `onLockedDoor(ctx, run, step)` at a
locked door on the path (true: opened). `run` is the run log. Keep both names and shapes. In `onPoll` only page reads
and log writes: no wait, no placement, no `ctx.advance` (in the pair those deadlock the lock). `onLockedDoor` runs
between steps and may wait (`ctx.driver.hold`, `ctx.advance`).

## What to build (all in `course.mjs`)
Split every rule into a pure function (unit tested) and thin page glue. Page access goes through one small object,
`coursePage(ctx)` (default: `ctx.host.evaluate` / `ctx.client?.evaluate` reads of `window.__course`, `window.__app`,
`window.__rr`), replaceable by `ctx.coursePage` in tests. Feature-detect every J14 field; on master they are absent.
Named constants at the top, with the BRIEF note: `CAUSE_WINDOW_S = 2`, `PER_PLACE = 2`, `DRILL_HOLD_S = 10` (A13),
`UNLOCK_WAIT_S = 5`, `AIRLOCK_WAIT_S` (the game's airlock cycle time plus 5 s; read the constant from courseState and
cite it), `JUMP_M = 3`, `JUMP_SPEED_MPS = 6`, `VERB_CAP = 16`. Per-run state lives in a `WeakMap` keyed by the run log.

1. **Drill gate (`onLockedDoor`).** Read the door nearest the step's `at` and map it to its course door id with the
   same course-door-to-world-door lookup `courseMode` uses to apply locks (find it from master `courseMode.ts`'s lock
   step; cite the line). Then:
   - not in `window.__course.debug().locks`: return false at once (a door locked for good; the driver logs `locked`).
   - an airlock door whose airlock is cycling or waiting (`debug().air`): wait for it with `ctx.advance(0.2)` polls up
     to `AIRLOCK_WAIT_S`, no drill stubs; open -> true.
   - else the A13 hold (pure `drillHold(graphs, section, stubs)`): the `time_s` of the set's link carrying `teach`
     (a link whose `from` or `to` space is in the run's section), 0 when that link is already in `run.stubs` on this
     run, else `DRILL_HOLD_S` (also for a `teach` on a space, or no graphs). Both robots hold it
     (`ctx.driver.hold(s)`). Then for each player p in 0, 1: while `state.nextDrill(p)` is an open drill, up to
     `VERB_CAP` actions: `window.__course.verb(p, drill.verb)`, or `window.__course.state.setFlag(name)` for a
     `flag:<name>` verb. Log one drill stub per (drill id, player): `{ id, player: p + 1, verb, hold_s, why: 'gate' }`;
     the first stub at a door carries the hold, the rest `hold_s: 0` (R2 sums `hold_s` into M9: count the hold once).
     Pure part: `drillActions(openDrills)` -> the verb / flag actions.
   - then poll the lock with `ctx.advance(0.2)` up to `UNLOCK_WAIT_S`: open -> true; still locked -> false (the
     driver logs the `locked` stop and places past it, as today).
2. **Restart watcher (`onPoll`).** Each poll read (one host evaluate, one client evaluate at two robots): game time,
   `__course.restarts`, `__course.lastRetry` (J14), `debug().bay`, `__course.station?.()`, the timed gates' open state
   (isolator, timed pickup, timedHold: `debug().gates`), each robot's feet, and `window.__rr.posN?.()` (placement count;
   seam SR3, absent today). The first poll of a run sets the baseline (the run's own start restart has already fired:
   `runOne` restarts and settles before `begin`). Rises: `ctx.driver.rises(since)`, your own index per run.
   A **restart** is a rise of `restarts`, or (only when `posN` exists) a robot moved more than
   `JUMP_M + dt * JUMP_SPEED_MPS` since the last poll with no placement counted (pure `jumped(prev, now, dt)`; the
   speed term covers a 2 s single-page poll gap).
3. **Cause (pure `classify(...)`).** J14 `lastRetry` present and new: `seen` / `caught` -> seen, `timer` -> timer,
   `out` / `down` / `other` -> other (`other` is J14 A26's trap retry; `restart` value `retry` for station causes,
   `other` for out / down / other). Else (master): a detection rise or camera alarm rise (`cls === 'detection'`) with
   `t` in `[lastPollT - CAUSE_WINDOW_S, nowT]` -> seen, `restart: 'set'`; else a timed gate that went open -> closed in
   that window -> timer, `restart: 'timer'`; else other, `restart: 'other'`. The window starts one poll gap early on
   purpose (the restart happened somewhere in the gap).
4. **Place, counts and what follows (pure `follow(state, cause, place)`).** `space` = the graph space of the leader's
   feet at the last poll before the restart (the points table's boxes, `ctx.driver.points`; copy driver.mjs `spaceAt`'s
   rule as a local helper: driver.mjs imports course.mjs). The "step" for timer counts is the J14 station number when
   known, else the space. Each restart line: `{ t, space, set: run.section, restart, detection: null, then }`.
   - seen, first from that space: `then: 'rejoined'`. Second: `then: 'pushed-past'`, turn the rule off in the page for
     the rest of the set (master: `window.__course.spotHold = 1e9`, cleared back to 0 when `debug().bay` changes; do
     not edit the bay def: it is shared by later runs; J14: `__course.retryOff(lastRetry.st)`, a false return is a run
     note), and queue a push past.
   - timer, first from that step: `rejoined`. Second: complete the step's open drills as drill stubs (`why: 'timer'`,
     `hold_s: 0`; queued: verbs are page calls, allowed in `onPoll`, but do them after the restart has settled, i.e.
     on the next poll) and `then: 'drill-stub'`.
   - other, first: `rejoined`. Second: a `restart-loop` dead stop written by course.mjs in R4a's stop shape
     (`run.deadStops.push({ t, robot, at, space, link, class: 'restart-loop', shot, since })`, screenshot from the host
     page into `ctx.shots` as `runOne`'s `stop` does), `then: 'dead-stop'`, and queue a push past.
   - The queued action (rejoin / push past) is consumed by seam SR3 (`onRestart`, below). Without SR3 the lines are
     still logged; the robots then walk on from where the game put them.
5. **Exports for the seams** (built and unit tested here; the lead wires them into R4b's files):
   - `onRestart(ctx, run, steps, i)` -> `{ resume, place: { leader, follower } | null }` or null (no restart queued).
     Rejoin: `resume` = the step nearest the leader's feet among steps `<= i` on the same storey (y within 1.5 m),
     `place: null`. Push past: the link the step `i` walks to (`step.link`), else step `i` if it is a link, else the next
     link step; `place.leader` = its `past`, `place.follower` = null (the driver puts the follower beside);
     `resume` = that link's index + 1. Pure core: `rejoinIndex(steps, i, feet)`, `pushPastTarget(steps, i)`.
   - `onRunEnd(ctx, run)`: pure `linkRestarts(run)`: each seen restart gets `detection` = the index of the latest
     `run.detections` line with `t` in its window, and that line gets `restart: 'set' | 'retry'`; none found -> a run
     note "seen <set restart | retry> at <space> with no guard or camera rise logged".
   - `checkCourseExpect(block, log)` -> problems (the selftest's course lines, below).
6. **Selftest raise hook.** When `ctx.selftest` (seam SR2) has a run with `id === run.id` and a `course.raise` list
   (`[{ guard, space, times }]`), on a poll where the leader is in `space` and that guard has been raised fewer than
   `times` times this run (count a raise only once per entry into the space), raise him to alert in the host page
   (`aware.set('alert')` on the enemy whose id or squad slot is `guard`; check on the base what `spotFailed`'s
   `alerted` reads and set that). Log nothing for it: the rise and the restart log themselves.

## Fixture `tests/fixtures/route-run/selftest-course.graph.json` (new)
The A1 and A2 spaces and links of the S9 graph above, `meta.map` `ctcourse`, `meta.mode` `training`, `sections`
`["A1","A2"]`, no `taught_by` (a meta note says why: two sections, a fixture), a `selftest` line, its own `points`
table built by hand from each space's first `area` box (`centre` its middle at the storey's floor, `floorY`, `boxes`)
and each link's declared `at` (`atFrom: 'declared'`), the S9 commit in a meta note. `expect.players` 2. Runs (merged
link indices as `path`; check them against your merged copy):
- `a1-gate`: lounge -> apron (double door) -> wall top (the leg-up `coop_boost`, a stub) -> yard (the `drop`: a stub on
  this base, walked once R5 merges, so leave it out of `outcomes`) -> holding room one (L1 near: locked by A1's open
  drills) -> `a2-west` (L1 far: the airlock cycle). `outcomes`: L1 near `walked`, L1 far `walked`; lines
  `noDeadStops`, `guardsAll`; `course.drills`: every A1 drill stubbed per player with `why: 'gate'`, total hold 0 (the
  leg-up carries A1's `teach` and was stubbed this run, A13). Ending in `a2-west` puts the page in bay 2.
- `a2-seen-once`: `a2-west` -> `a2-neck` (opening, the shadow gap) -> `a2-east` -> holding room two. `course.raise`
  `[{ guard: 'a2-shunter', space: 'a2-neck', times: 1 }]`; `course.restarts`: one seen `set` restart from `a2-neck`,
  `then: 'rejoined'`, linked to a detection; L2 near `walked` (A2's drills stubbed, hold 10 s); `noDeadStops`.
- `a2-seen-twice`: the same path, `times: 2`: two seen restarts from `a2-neck`, the second `then: 'pushed-past'`, the
  rule off, no dead stop, the run reaches holding room two.
`checkSelftest` (R4b's file) ignores an unknown run key, so put these under each run's `course` block and check them
with `checkCourseExpect` (seam SR5). Only existing line types in `lines`.

## Seam requests (for the lead's R4b fix list; do not make them)
Write each in the report as a ready diff sketch with file:line on the base:
- **SR1** `scripts/route-run.mjs:382`: in course mode no in-page forgive (BRIEF A2: the game's restart or retry is the
  forgive step there): `forgive = o.detections === 'forgive' && mode !== 'course'` (move it below `mode`). Without it
  the in-page poll calms the guard and the restart may never fire.
- **SR2** `route-run.mjs:421`: also `graphs` and `selftest: fixture?.expect ?? null` on `ctx` (A13's `teach`, the
  raise hook). Without it: A13 falls back to 10 s; no raise.
- **SR3** `driver.mjs`: in-page `interrupt()` (latches event `course` for the leader's next `tick`; the follower
  latches it like its other events) and `posN()` (`[x, y, z, placements]`, `place()` counting); course.mjs calls
  `interrupt` from `onPoll` when it queues an action; `runSteps` / `linkStep` / `objectiveStep`, on a wait returning
  `course`: `const r = await course.onRestart(ctx, log, steps, i)`; place `r.place` (`d.place`, which places both
  robots), continue at `r.resume`; inside a split leg, end both legs and resume at the split step. Without it a
  restart mid-walk can end in a false stall stop.
- **SR4** `driver.mjs` `runOne`, after the detection / notice lines are pushed (`:1095-1104`):
  `await course.onRunEnd?.(ctx, log)`.
- **SR5** `route-run.mjs` `checkSelftest` (`:238-286`): `problems.push(...checkCourseExpect(er.course, log))` when
  `er.course` is set.
If any seam turns out to need more than these lines, say so; do not edit to make it fit.

## Only files to edit
`scripts/route-run/course.mjs`, `tests/routeRunCourse.test.ts` (new), `tests/fixtures/route-run/selftest-course.graph.json`
(new), `changes/feature-route-runs-r4c.md` (new, `kind: patch`: tooling and tests).

## Forbidden
- Everything under `src/` (no game code; PLAN `:43-45`); no flag.
- `scripts/route-run.mjs`, `scripts/route-run/driver.mjs`, `pair.mjs` (R4b's), `steps.mjs` (R5's, being fixed in
  parallel), `causes.mjs` (R7), `publish.mjs`, `points.mjs` (R6), `coop.mjs` (R9), `plan.mjs`, `progress.mjs`,
  `report.mjs`, other slices' fixtures and tests. A change you need there is a seam request in the report.
- `scripts/e2e-*.mjs` (read the patterns only), `scripts/run-e2e.mjs`, `scripts/e2e-affected.mjs`,
  `scripts/laptop-queue/**`, `docs/**`.
- Hard rules (master `CLAUDE.md`): headless, no pointer lock; no per-frame game code (the page reads are per poll,
  one small object each); `hyp2` / `hyp3`, never `Math.hypot`.

## Unit tests (`tests/routeRunCourse.test.ts`, no browser)
- `drillActions`: verb drills with `count` 2, a `flag:` drill -> `setFlag`, a drill for one player only.
- `drillHold`: the set's `teach` link time; 0 when stubbed this run; 10 s with a `teach` on a space, none, or no graphs.
- `onLockedDoor` on a fake ctx (fake `coursePage`, fake driver recording `hold`, fake `advance` moving a fake clock):
  drills stubbed then the door opens -> true, stubs logged with the hold once; still locked `UNLOCK_WAIT_S` later ->
  false (and not 0.2 s before); not a course lock -> false with no hold; an airlock cycling -> waits, no stubs.
- `classify`: each J14 cause -> its class and `restart` value (`other` -> other); master: a detection rise inside the
  window -> seen `set`, at the window's edge in and 0.01 s out; a camera alarm rise -> seen; a timed gate closed in the
  window -> timer; nothing -> other.
- `jumped`: 3.1 m in 0.05 s with no placement -> true; with a placement -> false; 6 m over a 2 s gap -> false.
- `follow` (PLAN's done lines): two timer restarts on one step -> two `restart: 'timer'` lines, no detection, drill
  stubs with `why: 'timer'`; two other restarts from one space -> one `restart-loop` stop and a push past; two seen from
  one space -> `rejoined` then `pushed-past` and the rule-off action; seen from two spaces -> both `rejoined`.
- `rejoinIndex`, `pushPastTarget`, `linkRestarts` (link found; none -> the note), `checkCourseExpect`.
- `onPoll` on a fake ctx: baseline on the first poll (no restart for the run's own start), a `restarts` rise logs one
  line, the bay change clears `spotHold`, nothing waits (assert the fake `advance` / `place` were never called).

## Checks
- Cloud-safe: `npx tsc --noEmit -p tsconfig.json`; `npx vitest run tests/routeRunCourse.test.ts tests/routeRunCli.test.ts
  tests/routeRunPair.test.ts tests/routeRunPlan.test.ts tests/routeRunProgress.test.ts tests/routeRunReport.test.ts`.
  Nothing else (no e2e, no GPU, no `npm run check`).
- Pending PC run (laptop queue, `E2E_GPU=1`, alone; the lead requests on a head with SR1-SR5 in):
  - `node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --alone --step "serve scripts/route-run.mjs
    http://127.0.0.1:4189/ --selftest tests/fixtures/route-run/selftest-course.graph.json --players 2" --set
    route-run-selftest-course --requester "Night Shift | Marlow Build"`; verdict `laptop-e2e/alone-route-run-selftest-course`.
  - R4b's pair selftest and R4a's selftest again on that head (regression: `onPoll` runs on every map).

## Done
PLAN R4c's line (`:214-219`): in the fixture A1's exit door is cleared by drill stubs, each listed by id and hold, none
counted as walked; in A2 one raise gives one `restart: set` detection and the run walks on to the exit; two raises
from one space give two `restart: set` detections, the spotted rule off, a push past, the run reaches the exit and its
verdict is `pass`; the unit tests above green. Code parts here; page parts are the pending PC run after SR1-SR5.

## Size
About 1,050 counted lines: `course.mjs` ~550 (pure rules ~250, page glue ~200, seam exports ~100), test ~500. Fixture
(~400 lines of JSON) and changelog excluded by `pr-size`. PLAN estimate 450 + the test. Under ~1.5k.

## Report
Append at the end of this file: what changed, tests with counts, every name on the base that differed from this brief
(and which you used), the seam requests SR1-SR5 as diff sketches with file:line, the A1 / A2 link indices of the
fixture, the pending PC runs above. Then `status: done feature/route-runs-r4c <sha>`, or `status: blocked <reason>`
for a question the brief cannot settle. Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Lead note (2026-10-26 ~12:45)
SR1-SR5 are built in their own slice (`briefs/route-runs-seams.md`, on the #520 branch). Do not edit `route-run.mjs` or
`driver.mjs` here; code against the hooks as the SR text names them (`course.onRestart`, `checkCourseExpect`, the
interrupt event). Your calls (drill hold once per door, the 3 m + 6 m/s check, `spotHold = 1e9`, the S9 fixture, one
laptop step for A1 + A2) are accepted.

## Report (Night Shift | Cloud Builder 1, 2026-10-26)
Branch `feature/route-runs-r4c` from f8b0429c (R4b, PR #510), pushed, head `7c54c35b958f423529f6ae2cc6ace80231e254f2`.
Note: SEAMS (SR1-SR5) was built in parallel on `feature/route-runs-seams` (36424fb4, base bf8a91ee); its report is in
`briefs/route-runs-seams.md`. The seam sketches below are R4c's own reading, kept for the lead's cross-check.

### Tests
- `npx vitest run` on the six named files: 6 files, 148 passed (`routeRunCourse` 30; the other five 118, unchanged).
- `npm run typecheck:fast`: clean.

### Commits
- `5922ef3ff` `course.mjs`, the tests, the fixture. `7c54c35b9` the changelog fragment (`kind: patch`).

### What changed
`scripts/route-run/course.mjs` (704 lines) fills R4a's seam, both hook names and shapes kept.
- Constants with their BRIEF notes: `CAUSE_WINDOW_S` 2, `PER_PLACE` 2, `DRILL_HOLD_S` 10 (A13), `UNLOCK_WAIT_S` 5,
  `AIRLOCK_WAIT_S` = `AIRLOCK_CYCLE_S` 4 + 5 (4 s from `src/config/course.ts:7` `AIRLOCK_CYCLE`, imported by
  `courseState.ts:13`, used at :1227), `JUMP_M` 3, `JUMP_SPEED_MPS` 6, `VERB_CAP` 16; added `LOCK_POLL_S` 0.2,
  `SPOT_OFF` 1e9.
- Pure, unit-tested: `drillActions`, `drillHold`, `causeWindow`, `classify`, `jumped`, `follow` / `followState`,
  `rejoinIndex`, `pushPastTarget`, `restartLine`, `linkRestarts`, `checkCourseExpect`, a local `spaceAt` (copy of the
  driver's rule).
- Page access through `coursePage(ctx)` (tests swap in `ctx.coursePage`); one host evaluate per poll, plus one client
  evaluate only when SR3's `posN` exists. J14 fields (`lastRetry`, `station()`, `retryOff`) are feature-detected.
- `onLockedDoor`: finds the course door id with courseMode's own lookup (`layout.doors` by anchor id,
  `courseMode.ts:252-256`, applied by `applyLocks` :1032-1047); a door not in `debug().locks` returns false at once; a
  cycling airlock is waited for with no stubs; otherwise the A13 hold (only when a drill is open), one drill stub per
  drill and player (the first carries the hold); an airlock's far door with the robots not both on the pad: both placed
  on the pad; then the lock is polled with `ctx.advance(0.2)`.
- `onPoll`: first poll of a run is the baseline; a restart is a rise of `restarts` or (with `posN`) a jump, run through
  `classify` and `follow`, logged `{ t, space, set, restart, detection: null, then }`; a rejoin / push past is queued,
  then `__rr.interrupt?.()`; spotted rule off sets `spotHold = 1e9`, re-applied after later restarts in the same set,
  0 when the bay changes (J14: `retryOff(st)`, a refusal becomes a run note); timer drill stubs run on the next poll;
  the `restart-loop` dead stop is written with its screenshot; the selftest raise hook uses `squadOf(slot)` or the
  enemy id, then `aware.set('alert')` (spotFail reads `alerted` = `aware.level === 'alert'`). It never waits, places or
  advances (tested). When the clock goes back (next run's restart) the old run's watcher ends.
- Seam exports: `onRestart(ctx, run, steps, i)`, `onRunEnd(ctx, run)`, `checkCourseExpect(block, log)`.
- `tests/routeRunCourse.test.ts` (602 lines, 30 tests): every unit-test line in the brief, plus fixture shape checks.
- `tests/fixtures/route-run/selftest-course.graph.json` (new): S9's A1 and A2 spaces (12) and links 0-20 (merged
  indices equal S9's); `meta.map` ctcourse, `mode` training, `sections` [A1, A2]; no `taught_by` (meta note says why);
  S9 commit b6464dd95 in a meta note; its own points table; `expect.players` 2.

### Where the base differed from the brief (read first)
1. Master's yard has no drills: every ctcourse bay's `drills` is empty (`ctcourse.ts:103` takes `p.bay.drills`, no set
   adds any). So no drill stub and no A13 hold on master; an airlock cycles as soon as both players are on its pad.
   a1-gate's `course.drills` line (`why: gate`, `hold_s: 0`) passes with no stubs; "A2's drills stubbed, hold 10 s" is
   dropped from the A2 runs. The drill-gate path is unit-tested only.
2. L1-near and L2-near are not course locks on master: an airlock's near door locks only once it cycles, its far door
   stays locked until the cycle seals (`courseState.ts:637-643`). The A1 gate is L1-far (link 9). `onLockedDoor` puts
   both robots on the pad (as e2e-ctcourse `throughHoldingRoom` does) unless the phase is `ready`, then waits up to
   `AIRLOCK_WAIT_S`. Change from the brief: `waiting` is not a pure wait (one robot on the pad never starts the cycle);
   only `cycling` is. A sealed near door is locked for good and returns false at once.
3. a1-walltop has no nav cells (S9: "no area / floor cells on a1-walltop"): a placement snaps to the nearest walkable
   cell and a walk to a point 4.4 m up never arrives (`STOREY_Y_TOL_M` 1.5). Links 3 and 6 do not use their declared
   `at`: the leg-up is held at its mark on the apron floor, A1_MARK (10.8, 0, 6), atFrom `mark`; the drop at the apron
   foot of the wall (11.4, 0, 11), atFrom `stub`, its past (12.6, 0, 11) in the yard. Once R5 walks drops, link 6 needs
   its declared point back plus a driver change that can place a robot on the wall top. The other 19 links use their
   declared `at`.
4. The driver's guard poll never sees the alert that triggers the spotted rule: the guard reaches alert in
   `enemyMgr.update` (`gameState.ts:2096`); in the same step `mode.fixedUpdate` (:2113) runs the spotted rule
   (`courseMode.ts:595-598`) and `handle` drops and respawns the squad (:704-705), all before the driver's 0.1 s poll.
   Unfixed, every master spotFail restart would class as `other` and the second would be a `restart-loop` stop. Fix in
   course.mjs: the first host read wraps `__course.restartCheckpoint` once; at each restart it records the alerted,
   non-passive guards in the raw rise shape; `classify` counts these as detection rises; at run end `linkRestarts`
   writes the detection line from this record (causes.mjs `lineOf`) when the driver logged none. The brief's run note
   is kept for a seen restart with neither a logged rise nor a record.
5. `jumped`: the brief's `JUMP_M + dt * JUMP_SPEED_MPS` contradicts its own test line (3.1 m in 0.05 s gives a 3.3 m
   threshold). Used `max(JUMP_M, dt * JUMP_SPEED_MPS)`: all three test lines hold and BRIEF's 3 m rule stands.
6. J14 `timer` gives `restart: 'timer'`, not `retry` (BRIEF A14 logs `restart: timer`, R2's `slowSteps` reads
   `'timer'`, `linkRestarts` recognises seen restarts by `set | retry`). Mapping: seen and caught -> `retry`; out, down,
   other -> `other`.
7. `debug().gates` lists every gate, not only timed ones: timed gates come from the course def (isolator, timedHold, a
   pickup whose console has `seconds`), cached once per CourseMode.
8. Rises are read inside the single host poll evaluate (`window.__rr.rises(since)`, this file's own index per run),
   not a separate `ctx.driver.rises` call: same data, one evaluate per poll.
9. Smaller: `restarts` is a plain field on master (`courseMode.ts:203`), a getter on J14, read as a number either way;
   the guard to raise is found with `squadOf(slot)` (`courseMode.ts:982`); the A13 hold is skipped when no drill is
   open.

### R4c's seam reading (diff sketches on f8b0429c; compare with SEAMS)
- SR1 `scripts/route-run.mjs:382-383`: compute `mode` first, then
  `const forgive = o.detections === 'forgive' && mode !== 'course';` (BRIEF A2).
- SR2 `scripts/route-run.mjs:421`: add `graphs, selftest: fixture?.expect ?? null` to the `Object.assign(ctx, ...)`.
- SR3 `driver.mjs` page side: `let cev = ''` and `let placements = 0` beside `noHurt` (:129); in tick (:570-571)
  `if (cev !== '') { ev = cev; cev = ''; stopStick(); holdA(false, g.time); mode = IDLE; } else ev = pre(g);`;
  `placements++` in place (:853); `interrupt() { cev = 'course'; return true; }` and `posN()` beside `pos()`
  (:872-875). The follower latches `course` into `fev`; course.mjs calls `interrupt` on the host page only; not in
  pair.mjs `STARTS`. Node side, `runSteps` (:1112-1115), at the top of each iteration: call `course.onRestart` (for a
  walk that hands back `course`, with the interrupted step's own `i`), place the leader, `i = rr.resume - 1`. linkStep's
  door wait (:1193) and objectiveStep's waits (:1227, :1232, :1236) return on `course` as on `stall`; split legs
  return `'course'`, `pair.split` ends both legs, the top level calls `onRestart` at the split's index.
- SR4 `driver.mjs:1103-1104`: `await course.onRunEnd?.(ctx, log);` after the detection and notice lines (and
  `pair.nameRobots`), before `return log`.
- SR5 `scripts/route-run.mjs`: import `checkCourseExpect` at :26; in `checkSelftest` after the outcomes loop (:250)
  `if (er.course) problems.push(...checkCourseExpect(er.course, log));`.

### Fixture link indices (merged indices equal S9's)
0 lounge>apron double_door; 1 apron>cabin door; 2 apron>yard door (wicket); 3 apron>walltop coop_boost `teach: leg-up`
6 s; 4 apron>walltop human_ladder; 5 yard>walltop coop_boost; 6 walltop>yard drop; 7 walltop>apron drop;
8 yard>a1-hold-l1 double_door (L1 near); 9 a1-hold-l1>a2-west double_door (L1 far); 10, 11 west>cabin door;
12, 13 west>neck opening (loud, shadow); 14, 15 neck>east opening (loud, shadow); 16, 17 west>staging coop_boost,
human_ladder; 18 staging>west drop; 19 staging>east open_stair; 20 east>a2-hold-l2 double_door (L2 near). S9's link 21
(L2 far into A3) left out.
Runs: a1-gate [0, 3, 6, 8, 9] (8, 9 walked); a2-seen-once [13, 15, 20] (all walked; one seen `set` restart from
a2-neck, rejoined, linked; 1 `set` detection); a2-seen-twice [13, 15, 20] (13, 20 walked; two seen restarts from
a2-neck, rejoined then pushed past, both linked; 2 `set` detections). All three: guardsAll, noDeadStops, robots leader
and follower.

### Risks for the page run
- The walk to L1-far may stall before `onLockedDoor` runs: it targets (28, 0, 11) within 0.4 m but the door sits in a
  0.5 m wall. A stall logs a `locked` stop from the walk (:1132-1141) and `onLockedDoor` is never called. Fix: a driver
  change (a stall at the door link's own locked door counts as arrived) or a near-side `at` for link 9 in the fixture.
- A natural sighting can add restarts: A2's neck is lit and watched by three guards, so `a2-seen-once` can come out
  with two restarts.
- The selftest only means something with SR1-SR5 in. Without SR3, after a restart the robots walk on from the
  checkpoint and the old walk will likely stall into a false dead stop.

### Pending PC runs
Laptop queue, `E2E_GPU=1`, alone, on a head with SR1-SR5 in:
`node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --alone --step "serve scripts/route-run.mjs
http://127.0.0.1:4189/ --selftest tests/fixtures/route-run/selftest-course.graph.json --players 2" --set
route-run-selftest-course --requester "Night Shift | Marlow Build"` (verdict `laptop-e2e/alone-route-run-selftest-course`);
R4b's pair selftest and R4a's selftest again on that head as regression (`onPoll` runs on every map; on a page with no
`window.__course` it reads once per run).
