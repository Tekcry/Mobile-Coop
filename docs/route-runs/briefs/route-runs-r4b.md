status: open
# J13 route-runs, slice R4b (Opus-grade brief): the robot pair on ?net=local

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3, PASS on 6fab6ef0f). R1-R3 are on master; R4a is the
one-page harness this slice doubles. Sector Ops' campus v2 greybox exit waits on R4a / R4b / R5 / R6.
Builder: Opus (PLAN R4b). Recommended home: **local** (desktop worktree `C:/NightShift/Mobile-Coop-route-runs-r4b`),
not cloud: see "Cloud or local" at the end.

- Base: R4a's done branch head (lead fills on R4a PASS): `feature/route-runs-r4a` @ `ee27da535a734a5ca2b271cbc6b6243d15ded0b4` (PR #499; checker PASS after fix round 1). If R4a has merged by the
  time this starts, origin/master at or after that merge.
- New branch: `feature/route-runs-r4b`. Push every sub-step.
- Read first: `docs/systems/agent-preamble.md` (origin/master), then the spec on `origin/feature/route-runs-2`:
  `docs/route-runs/PLAN.md` slice **R4b** (`:178-190`), the R4a slice it extends (`:135-176`, seams `:154-161`,
  selftest fixtures `:162-166`), Dependencies / order (`:301-320`), Tests (`:322-327`), Checker gate (`:329-335`);
  `docs/route-runs/BRIEF.md` "Two players" `:87-91`, "Co-op links" `:92-100`, "Detections" `:68-76`, "Dead stops"
  `:77-82`, "Objectives" `:103-104`, A1 `:180`, A2 `:183`, A6 `:203`, A12 `:216`. Then R4a's own files on the base
  (below) in full: this slice builds on what R4a actually shipped, not on this brief's guess of its names.

## The R4a seam this fills
R4a ships one page and leaves the pair open. Names as R4a's brief and PLAN give them; where R4a's code names them
differently, use R4a's names and say so in the report.
- `scripts/route-run.mjs`: the CLI already parses `--players 1|2` and builds the boot URL with the shared URL helper
  (R4a brief: "the boot URL keeps any query params the caller passes in `<url>`, in particular `?campusv2=N`, on every
  page the harness opens; R4b adds the second page"). R4b opens the second page from that same helper and makes
  `--players 2` the default for every map (BRIEF A6); `--players 1` stays for selftests and R4c / R5 runs.
- `scripts/route-run/driver.mjs`: the in-page driver (steer with R3 `Steer` / `PathProgress`, `StuckWatch`, door A
  press, objective A hold, stub hold-and-place, dead-stop class from a nav `findPath` probe, guard-level poll every 0.1 s
  game time, `enemyMgr.hear` wrap, camera alarms from `window.__ctdev.debug()`, the A2 forgive step). R4b gives it a
  role: `leader` (R4a's walker, on the host) or `follower` (on the client).
- `scripts/route-run/steps.mjs` `step(ctx, link)`: `ctx` carries `host`, `client` (null at `--players 1` in R4a), the
  pads, the host clock and the limit. R4b fills `ctx.client` and the client pad, and gives `ctx` one clock-advance call
  that steps **both** pages (below), so R5's steps and R9's leg-up never step a page themselves. If R4a's `ctx` has no
  such call, add it here (this is the "R4b fix" channel PLAN `:160-161` names for driver changes other slices need).
- `scripts/route-run/causes.mjs` `readCauses(since)`: unchanged (R7 owns it next). R4b passes it both robots' positions
  and slots so a line can name the robot; it does not edit the file. If R4a's signature cannot carry them, attribute in
  the driver poll (R4b's file) after `readCauses` returns, and report it.
- `scripts/route-run/course.mjs` `onPoll`, `onLockedDoor`: untouched (R4c owns it).

## What to build
1. **Two pages, one match** (`scripts/route-run/pair.mjs`, called from `route-run.mjs`). Follow `scripts/e2e-ctcourse.mjs`
   (master): host page `launch` with the boot URL plus `net=local&autostart=<map>&mode=<mode>` (`:39-45`); for course
   mode set `window.__coop.session.courseBay` before the client opens (`:304`); `openPage(ctx, url, same params)` for
   the client (`:305-307`); `setSimPages([A, B])` (`:308`); wait both pages in the match with `until(..., LOAD_MS)`
   (`:309`), the host's remotes carrying state (`:311`), then damage off on the host for both (`target.damageMul = 0`
   and every remote's `damageMul = 0`, as `scripts/e2e-net-lib.mjs` `startMode` does, `:205-215`). `?net=local`
   autostart covers `mode=course` and `mode=sector` only (`src/main.ts:444-457`); any other mode (campaign) boots with
   `hostAndJoin(url, 2)` + `startMode(pages, mode, map)` from `scripts/e2e-net-lib.mjs` (`:182-215`) instead. Viewport
   `NET_VIEWPORT`. Headless only; no pointer lock, never `E2E_HEADED`.
2. **One clock, both pages stepped.** Time is the host's game seconds (BRIEF "Time"). Both pages run `loop.manual` and
   are stepped from Node in lockstep ticks: the host steps `PAIR_TICK_S` of game time in R4a's 0.05 s chunks, then the
   client steps the same, then Node awaits once so `BroadcastChannel` delivers both ways (a single long `evaluate`
   delivers no net messages). `PAIR_TICK_S` is a named tool constant in `pair.mjs` (0.2 s; the remote lags at most one
   tick). After each tick compare the two clocks; a client more than 1 s behind the host is logged once per run as a
   `clock` note in the run log (report only). Do not add a RAF pump (e2e-ctcourse's pump exists because its pages run
   free; here Node steps both).
3. **The follower.** The client page runs the driver as `follower`: each poll it pushes the host avatar's feet
   (`window.__app.current.net.avatars.values().next().value`) into an R3 `Trail` and steers to `Trail.point(TRAIL_M, ...)`
   with R3 `Steer` at the run's pace, crouched; the same door logic as the leader (A at a shut door on its path); its
   own `StuckWatch` on its progress along the leader's walked path (a follower stall is a dead stop with `robot:
   "follower"`); idle (no stuck clock) while it is within `TRAIL_M + 1` m of the leader and the leader is idle.
   `Trail.reset()` after every placement.
4. **Splits** (`{ type: 'split', id, fork, a, b, rejoin }`, R1 `plan.mjs:22`): at the fork the leader walks leg `a`
   and the follower walks leg `b` at the same time, each with its own path, progress and stuck watch; the first to reach
   `rejoin` waits there idle (no stuck clock) until the other arrives; then the follower goes back to trailing. Each
   leg's link steps go through `steps.mjs` with `ctx` naming the robot that steps.
5. **Co-op stubs** (`action: 'stub'`, BRIEF "Co-op links", A1): both robots walk to the link's near side (`at`, the
   follower 1 m beside the leader, never on the same point), crouch, hold for `hold_s` in the live guard field (both
   idle), then both are placed on the far side: leader as R4a places it; follower with the host's remote allowed to jump
   first, exactly as `moveClient` in `scripts/e2e-ctcourse.mjs:124-128` (`allowTeleport(3)` on the host's remotes,
   `team.end(true)` and `player.controller.teleport(...)` on the client, then wait until the host sees the client within
   0.4 m). A stub is logged once per link with its hold and is never counted as walked.
6. **Objectives**: the leader holds A at the objective for its real duration (R4a); the follower waits on its trail
   point, idle.
7. **Detections and notices for either robot** (BRIEF "Detections", A12): guard rises are read on the host only (guards
   are host-side). Each line's `robot` is `leader` or `follower`: the cause record's target slot when the reader gives one
   (slot 0 host, 1 client); else the robot inside that guard's view cone (R3 `sightRange` and the guard's yaw), the nearer
   one when both or neither are. A guard alerted on either robot counts once per rise (A12). The A2 forgive step is
   unchanged (one per detection, whichever robot).
8. **Dead stops and recovery for the follower**: as R4a's for the leader (class, screenshot from the client page,
   recovery past the link with the `moveClient` placement above); `robot` names which one stopped.
9. **Selftest fixture** `tests/fixtures/route-run/selftest-pair.graph.json`, in R4a's selftest format with its own
   `expect` block (PLAN `:162-164`: each later slice adds its own fixture, never edits another's): a copy of R1's
   `tests/fixtures/route-run/campusOps-S1.graph.json` with one fixture-only split added: `s1-lane` tagged
   `split:fx:a` and `s1-lawn` tagged `split:fx:b` (fork `s1-verge`, rejoin `s1-carpark`; links verge -> lane, lane ->
   carpark, verge -> lawn, lawn -> carpark already exist), its `meta` note saying the split is fixture-only. `expect`:
   the split walked by both legs at once (leader leg a, follower leg b, both reach `s1-carpark`), both `coop_boost` links
   (forecourt -> canopy) listed as stubs with their `time_s` (6 s, 7 s) and placed for both robots, every other link of
   the run walked by both robots, and both robots named in the run log. Check it with `--dry-run` first (R1's planner
   reads split tags from spaces, `plan.mjs:124-137`).

## Only files to edit
`scripts/route-run.mjs`, `scripts/route-run/driver.mjs`, `scripts/route-run/pair.mjs` (new),
`tests/fixtures/route-run/selftest-pair.graph.json` (new), `tests/routeRunPair.test.ts` (new; inside PLAN's
`tests/routeRun*.test.ts` claim), `changes/feature-route-runs-r4b.md` (new, `kind: patch`: tooling and tests).
R4b is the only slice after R4a that edits `route-run.mjs` and `driver.mjs` (PLAN `:182-183`, `:317-320`).

## Forbidden
- Everything under `src/` (no game code in this job, PLAN `:43-45`); no flag.
- R1-R3's modules (`plan.mjs`, `progress.mjs`, `report.mjs`), the other seams (`steps.mjs` is R5's, `course.mjs` R4c's,
  `causes.mjs` R7's), `publish.mjs` (R4a), `points.mjs` (R6), `coop.mjs` (R9), other slices' fixtures and tests. A
  change you need there goes in the report for the lead.
- `scripts/e2e-lib.mjs`, `scripts/e2e-net-lib.mjs`, `scripts/e2e-ctcourse.mjs` and every other e2e suite (import or
  copy patterns only), `scripts/run-e2e.mjs`, `scripts/e2e-affected.mjs`, `scripts/laptop-queue/**`.
- `docs/level-design.md`, `docs/systems/testing-tools.md` (R8 only), `docs/route-runs/**` (the lead's).
- Hard rules (master `CLAUDE.md`): the in-page driver allocates nothing per poll or chunk (typed arrays, fields; `hyp2`
  / `hyp3`, never `Math.hypot`); headless and invisible.

## Unit tests (`tests/routeRunPair.test.ts`, no browser)
Keep `pair.mjs`'s pure functions importable without Playwright (Playwright and `e2e-net-lib` imported where the pages
are opened, or dynamically), and test:
- both page URLs come from the one helper and are equal: caller params kept (`?campusv2=2` survives), `net=local`,
  `autostart`, `mode` added once, course `courseBay` not in the URL;
- the boot path chosen per mode: `course` and `sector` autostart, any other mode `hostAndJoin` + `startMode`;
- split roles: leader leg `a`, follower leg `b`, the rejoin wait (first arrival idles, both arrived ends it, an arrival
  order either way);
- stub spots: near-side points for both robots 1 m apart on the `at` approach, far-side points past `at` along from ->
  to, never the same point;
- robot attribution: a target slot wins; else in-cone beats out-of-cone; else nearer; one rise counts once (A12);
- the lockstep tick: host then client per tick, the clock-drift note fires once past 1 s.

## Checks
- Cloud-safe (tsc + vitest): `npx tsc --noEmit -p .` (`npm run typecheck:fast` on the desktop);
  `npx vitest run tests/routeRunPair.test.ts tests/routeRunPlan.test.ts tests/routeRunProgress.test.ts
  tests/routeRunReport.test.ts` plus R4a's `tests/routeRunCli.test.ts`; `node scripts/route-run.mjs --dry-run --graph
  tests/fixtures/route-run/selftest-pair.graph.json` prints the split as one route with both legs and opens no browser.
- Pending PC run (laptop queue, `E2E_GPU=1`, alone; the lead requests on the PR head):
  - `node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --alone --step "serve scripts/route-run.mjs
    http://127.0.0.1:4189/ --selftest tests/fixtures/route-run/selftest-pair.graph.json --players 2" --set
    route-run-selftest-pair --requester "Night Shift | Marlow Build"`; verdict `laptop-e2e/alone-route-run-selftest-pair`.
  - R4a's selftest again at `--players 1` (`--set route-run-selftest`): still green.
  - one `--routes code --section S1 --players 2` run on campusOps (`--set route-run-s1-pair`), and the same with
    `?campusv2=<n>` in the URL if Sector Ops' v2 build is on the head.

## Done
PLAN R4b's line (`:188-190`): both robots are seen in the log (a guard rises on the follower at least once on S1, or the
report says neither was seen); the fixture's split is walked by both legs at once; every co-op link is listed as a stub
with its time. Plus: the run time is the host's game seconds; a second S1 pair run on the same head gives the same
detections at the same times within one `PAIR_TICK_S`; R4a's one-page selftest still passes. Code parts here; page
parts are the pending PC runs.

## Size
About 850 lines: `pair.mjs` ~350, `driver.mjs` + `route-run.mjs` changes ~200, test ~200, fixture ~100 (copy + split
tags). PLAN estimate 600 + the test. Under ~1.5k.

## Report
Append at the end of this file: what changed, tests with counts, deviations from this brief (any R4a name that
differed), the pending PC runs above for the lead, and any change another slice's file needs. Then
`status: done feature/route-runs-r4b <sha>`, or `status: blocked <reason>` for a question the brief cannot settle.
Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Cloud or local
**Local.** Most of R4b is two-page orchestration: lockstep stepping with `BroadcastChannel` delivery between ticks, the
host seeing the client after a teleport, the follower trailing a networked avatar, the client's own door presses. None
of that shows in tsc or vitest; the pure part is about a quarter of the slice, and each fault is found only by a page
run. Build it on the desktop with the laptop selftest in the loop. A cloud build is possible (pure parts tested, every
page check pending PC run) but would likely need a full local fix round.

## Added by the lead (2026-10-26, R4a recheck)
- Fix before any S2 run: S2's objective is a 3 s hold (`src/world/maps/campusSectors.ts:363`) and a tap cannot finish it
  (`src/game/gameState.ts:1348-1365`), so R4a's objective step ends stuck at `scripts/route-run/driver.mjs:921`. Hold A
  for an objective whose def says hold (read the hold time from the objective, not a constant); taps stay for the rest.
  Checker report: C:/NightShift/scratch/marlow/j13-r4a-check-2.md.
