status: open

# J14 Marlow re-plan, slice G-A2: A2 the Carriage Shed on the re-plan (PR 5)
Lead: Night Shift | Marlow Build. Brief: Opus (J14 wave 2). Builder: Sonnet 5.5 (cloud or desktop). Est. 1,250 lines.
Queue copy: cloud-queue `briefs/j14-g-a2.md` (the lead copies this file there).

## Base and branch
- base: feature/marlow-replan-base at 1ab25b99b2de3fa524c94c2668a9412f64e634f5 (S0 + R1 merged, both checker-passed).
- Lead confirmed (~23:10): pit x 66.0-69.0, wall to wall in z, depth 1.6 m, step irons on the near side only, far edge not climbable; neck closers extended behind the removed deck.
- new branch: `feature/marlow-replan-g-a2` (desktop worktree `C:/NightShift/Mobile-Coop-marlow-replan-g-a2`).
- Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/marlow-replan-g-a2`. Commit and push each
  finished step (`git add <files>`, never `-A`). No stash, reset, rebase, merge or force-push.

## Read first (on the base)
- `git show origin/master:CLAUDE.md`, `git show origin/master:docs/systems/agent-preamble.md` ("Cloud sessions" if cloud).
- `docs/marlow-replan/PLAN.md` section 2 (:52-137) and "Set slices" (:413-432, the G-A2 row); `BRIEF.md`.
- `docs/marlow-replan/STATIONS.md`: sections 1-3 (A2 block), 5 (`a2-neck`), 6 (stations 3-5), 7, 8 (`a2-lane`,
  `a2-across`), 9 (`a2-shunter`), 10 (SA9, SA11).
- `docs/marlow-replan/graph.json` spaces `a2-*` and their links; `replan-plan.svg` (1 m = 7 px; x = (px - 34) / 7,
  z = (642 - py) / 7).
- Code: `src/game/course/stationDef.ts`, `src/world/maps/ctcourseSets/replan/index.ts` and `replan/a2CarriageShed.ts`
  (S0 stub), `ctcourse.ts` (`CtcourseOpts`, the `REPLAN_BUILDERS` call), `types.ts` (`SetPart`, `checkSetPart`),
  `ctcourseGreybox.ts` (`FloorHole`, `slabWithHoles`), `marlowCircuits.ts` (`MARLOW_CIRCUITS_REPLAN` group 22), R1's station
  code in `courseState.ts` / `courseMode.ts`, `tests/ctcourse/replan/variant.test.ts`, the built
  `tests/ctcourse/a2CarriageShed.test.ts` (its `GREY`, nav and sight helpers are the pattern to copy).

## Only these files
- `src/world/maps/ctcourseSets/a2CarriageShed.ts`: only (a) a third parameter `opts: { replan?: boolean } = {}` on
  `buildA2CarriageShed`, (b) `if (!opts.replan)` guards round the pieces the re-plan removes (listed below). Never touch
  its objective or radio lines (PR #441 edits them).
- `src/world/maps/ctcourseSets/replan/a2CarriageShed.ts`: everything new (geometry, closers, guard changes, stations,
  stand-in, lamp, pass zones, objective and radio lines, `FLOOR_HOLES`), by building into `b` / `kit` and amending `part`.
- `tests/ctcourse/replan/a2CarriageShed.test.ts` (new), `tests/ctcourse/replan/a2CarriageShed.light.json` (written by
  the light test), `scripts/e2e-ctcourse/replan/a2CarriageShed.mjs` (replaces S0's re-export stub),
  `changes/feature-marlow-replan-g-a2.md` (fragment, `changes/README.md` format).
- `src/game/course/replan/a2Ticks.ts` (R1's stub: fill `a2Tick` only) and its test
  `tests/ctcourse/replan/a2Ticks.test.ts` (new).
- Nothing else: not PLAN / BRIEF / STATIONS / graph / svg, not `replan/index.ts`, `ctcourse.ts`, `types.ts`,
  `facility.ts`, `courseDef.ts` / `courseState.ts`, `e2e-times.json`, any built test, built light file or built e2e module.
  A change you need outside this list: `status: blocked <what and why>`.

## Flag off = nothing changes
The built `ctcourse` stays byte-identical: `tests/ctcourse/a2CarriageShed.test.ts` (its `GREY` checksum) and every
`tests/ctcourse/<set>.light.json` unchanged and green. Every guard you add must leave the built build untouched.

## Build (A2, stations 3, 4, 5; guards 1)
1. **Guards: one.** Remove `a2-watch-w` and `a2-watch-e` from `part.squads` and `part.bay.squad` (replan file). Keep
   `a2-shunter`: post (51, 10) now faces east (`yaw` PI/2; the built post faces west), round
   `[[51, 10], [56, 7.5], [65.5, 7.5], [56, 7.5]]` (the built (66, 7.5) stands on the pit's edge), same waits.
2. **Deck and stair out (Q24).** Guard the cleaning staging, its screens and the east stair (A2-6 / A2-7 / A2-8,
   `a2CarriageShed.ts:256-268`), their dressing (:430-465, :633-686), the stair fillers and rail, the permit gate
   `A2_GATE_AT`, and the deck's co-op lip (`p.lips`). With the deck gone the strip z 17.5-19.75 behind it must not become a
   route: extend the A2-21 north closures (x 45.5-46.0 and 56.0-56.5) to the north wall face z 19.75, full height.
3. **Stores bay and the shutter (station 3, `shutter_hold`).** A new wall at x 33 (0.3 m, to the shed's roof, `noLedge`)
   closes the stores bay from the cabin's north-east corner (32, 5) to the north wall (z 19.75): no gap round either end.
   In it the running shed's roller door: door `A2-shutter`, 3.0 m wide centred on the lane (z 11.0-14.0), lifts 0.9 m;
   gate `g-a2-shutter`, the course `hold` kind (one lifts and holds, the other rolls under; graph link `a2-stores` ->
   `a2-lane`). The cabin's back door `A2-back` is locked for good (the facility's locked-door idiom; never opens). The gap
   1/2 mouth at the neck's west edge (x 45.5-46.0, z 6.3-8.7) is closed with the A2-21 closer idiom, so the lane
   (z 11.3-13.7) is the one way into the neck; the east gap 1/2 stays open (the shunter's round uses it).
4. **Neck drill (station 4, `timed_light_cut`, 15 s).** As built: isolators `a2-iso-1` (cabin) and `a2-iso-2`, gate
   `g-a2-neck`, the caged neck lamps. Cabinet 2 (`A2_CAB2`, built at (69.4, 13.4)) moves to the pit's near (west) side, off
   station 5's marks (65.5, 12.0 / 13.0) and their 0.6 m body clear, reachable from the lane gap; report its spot. Two
   crossings, one 15 s window each (STATIONS section 5).
5. **Pit and plank (station 5, `plank_bridge`, stand-in).** An open wheel-drop pit, x 66.0-69.0 (SA9; far landing 0.75 m),
   wall to wall z 0.25-19.75 (no walk-round at either end), floor at y -1.6. `FLOOR_HOLES = [[66.0, 0.25, 69.0, 19.75]]`
   (S0's facility cuts the slab). Pit walls and floor pieces in the replan file; step irons on the near (west) face only;
   the far face and far edge `noLedge` with no co-op lip, so the pit cannot be crossed by climbing out on the far side.
   Guard every built piece the hole cuts (track panels `A2_TRACK_X` 64.5, wheel stops, the east rake's ends:
   `:134-141`, `:210-213`). Stand-in: a hoarded maintenance walkway over the pit at the L2 door (1.2 m wide, z 9.4-10.6,
   y 0), door `A2-walkway`, gate `g-a2-walkway` (SA11, station 5's `standIn`). The base already opens it as station 5
   goes live while `plankBridge` is not playable (`CourseState.openStandIn`, R1 fix 7) and keeps it open through retries:
   build no opener of your own. Its kind must latch: `flag` (door `A2-walkway`; put its flag in `p.externalFlags`, or
   `validateCourse` fails "never set") or `lever`; never `hold`, `timedHold` or `mains` (their own rule would shut it
   again).
   A stack of scaffold boards at the east end near side (dressing, KS5's later).
6. **Stations.** `part.bay.stations` = STATIONS section 3's A2 block, verbatim (`import type { StationDef }`).
7. **Done flags (section 8).** Pass zones `a2-lane` [36, 11.3, 46, 13.7] both and `a2-across` [69, 8.5, 69.75, 11.5]
   both, floorY 0. `a2-east` exists.
8. **LANTERN's lines (section 6).** `part.bay.radio` rows `{ at: 'retry:a2-shutter', ... }`, `retry:a2-lights`,
   `retry:a2-lights:timer`, `retry:a2-plank`, text verbatim. Replace the built "Two spotters on the staging" enter line
   (it no longer applies) by filtering `part.bay.radio` in the replan file.
9. **Objective lines.** Replace `part.objectives` for A2 in the replan file (never in the set file): one line per station
   plus the holding-room line, each naming what and where (#441's rule; at most `COURSE_TEXT_MAX`), no "fail".
10. **Lamp.** The coat corner: one wall lamp over the coat hooks on circuit 22 (`MARLOW_CIRCUITS_REPLAN` group 22 has
    2 lamps: the built panel plus this one). Its light spot joins `part.lightSpots`.
11. **Drill hook (lead decisions ~23:05 (a), ~23:55; base 1ab25b99b):** no timer starts from a gate opening.
    Write station 4 (one window per neck crossing) as runtime code in your own stub
    `src/game/course/replan/a2Ticks.ts` (R1 created it and registered it in `REPLAN_TICKS`): fill `export const a2Tick: StationTick = (h, dt) => { ... }`.
    `StationHooks` as built on the base (`src/game/course/replan/ticks.ts`), host only, every read allocation-free:
    - `flag(id)`: is course flag `id` set globally (`CourseState.hasShared`: a pass zone, a gate's shared flag).
    - `live()`: the live station's number (0: none).
    - `retry(n, cause)`: retry station `n`, cause `'timer'` or `'seen'`; only while `n` is live, its retry on and no
      retry under way (false otherwise).
    - `playersIn(zone)`: how many players stand in `zone` (a `TickZone` `[minX, minZ, maxX, maxZ]`, optionally
      `[..., minY, maxY]` feet band; a downed player counts).
    - `now()`: the course clock (s since the course started).
    - `gate(id)`: is gate `id` open now (`CourseState.isGateOpen`): an isolator's open is its dark, a console pickup's
      its loop.
    - `down(slotId)`: is squad slot `slotId`'s guard down (knocked out, dead or gone; up again once a squadmate wakes
      him); false for a slot the bay's squad does not have.
    - `jammed(targetId)`: is a jammer held on target `targetId` now (a camera id, a laser panel id; held only).
    - `lit(group)`: is any lamp of light group `group` lit now (on and not shot out: follows a jam's flicker and off
      time, shots and switches).
    - `tripped(laserId)`: was laser `laserId` broken while the current station was live, since the last `epoch()`
      change (never an automatic retry: the tick decides).
    - `epoch()`: a number that rises on every station retry, bay restart and course start, and never repeats across
      matches.
    This set uses: `live`, `gate`, `playersIn`, `epoch`, `retry`.
    Rules:
    - Keep window state in module-level numbers and reset it whenever `epoch()` differs from the last epoch the tick
      saw (keep that number too); module state never survives a match because the epoch never repeats.
    - Act only while `live()` is one of this set's drill stations.
    - Never edit `ticks.ts`, `courseMode.ts` or another set's tick file; keep the stub's export name `a2Tick`.
    - `flag` reads both-player (shared) flags only: never `<flag>@1` / `<flag>@2`.
    - No allocation in a tick: no closures, arrays, objects or template strings per call; zones and ids are module
      constants.
    - Lamp jam ids (`lt-<n>`) depend on build order: read lamps with `lit(group)`, never `jammed('lt-..')`.
    Station 4: the gate is `g-a2-neck` (`A2_GATE`, an `isolator`: `gate('g-a2-neck')` is true while the neck is dark).
    The window runs while `gate('g-a2-neck')` is true; it closes on the step `!gate('g-a2-neck')` follows a true step.
    Fail: on that closing step, `playersIn(NECK) > 0` with `NECK = [46, 0.3, 56, 19.7]` (STATIONS section 5) ->
    `h.retry(4, 'timer')`. Two crossings, one window each (the 3 s re-arm between): a window that closes with nobody
    in the neck is no fail.
    Unit-test the tick in `tests/ctcourse/replan/a2Ticks.test.ts` with fake hooks (a plain object implementing
    `StationHooks`): dark then lit with a player in the neck retries 4 once; with nobody in the neck no retry; a second
    window after the re-arm is judged on its own; an `epoch()` change mid-window forgets it; nothing happens while
    `live()` is not 4.

## Lead decisions that touch A2 (j14-wave2-notes)
- Pit x 66.0-69.0 (SA9), not G0's 66.25-69.25 or the SVG's 66.5-69.5; G1 moves the graph boxes after the build.
- Retry: set code calls R1's host `stationRetry(n, cause)` (timer = `'timer'`); retry resets the station's listed guards
  plus any guard alerted in the bay (R1's job, not yours).
- Depth 1.6 m and the wall-to-wall pit are this brief's call (D1 check, lead item 3); the lead may change them.

## Tests (unit only; no e2e, no GPU, no `npm run check`)
Desktop builders run each node command at BelowNormal
(`powershell -NoProfile -Command "(Get-Process -Id \$PID).PriorityClass='BelowNormal'; <cmd>"`); the light bake is slow,
give it a 15 min timeout.
```
npm run typecheck:fast
npx vitest run tests/ctcourse/replan/a2CarriageShed.test.ts tests/ctcourse/replan/a2Ticks.test.ts tests/ctcourse/replan/variant.test.ts tests/ctcourse/a2CarriageShed.test.ts tests/ctcourse/facility.test.ts tests/marlowLightingCircuits.test.ts tests/courseStation.test.ts
CTLIGHT_VARIANT=replan CTLIGHT_WRITE=a2CarriageShed npx vitest run tests/ctcourseLight.test.ts
CTLIGHT_VARIANT=replan npx vitest run tests/ctcourseLight.test.ts
npx vitest run tests/ctcourseLight.test.ts
```
`tests/ctcourse/replan/a2CarriageShed.test.ts` pins: the replan set's `GREY` (boxes, solids, lights, doors, anchors,
checksum, the built test's method); `checkSetPart` clean; squad = `['a2-shunter']` and the shunter's post / yaw / route;
the stations equal STATIONS' A2 block; every mark has standing room for a 0.3 m body on its floor; the closures on the
nav: from `a2-stores` with every gate shut no path reaches the lane; with the shutter open none reaches the east end
except through the neck; no path crosses the pit except the walkway (open) and nothing on the far side is a ledge or lip
reachable from the pit floor; the two pass zones; the retry lines exist for 3, 4, 5 and fit `COURSE_TEXT_MAX`; the coat
corner lamp is live on 22; the light file is present and green.

## e2e (write, do not run: "pending PC run")
`scripts/e2e-ctcourse/replan/a2CarriageShed.mjs`: both players on host and client walk stations 3-5; one spotted retry
on station 3 lands both at its marks with no earlier station undone; one neck timer retry; the walkway stand-in open.
The lead runs e2e-ctcourse parts 1-8 on the laptop queue.

## Done looks like (PLAN set slices)
A2 on `ctcourseReplan` has one guard, no deck, a one-way route stores -> shutter -> lane -> neck -> pit, stations 3-5
with their marks, retries and lines, the walkway stand-in, the coat-corner lamp, a new `GREY` and light file; the built
yard's checksum and light files unchanged; all the tests above green.

## PR
No PR from the builder. The lead opens it to master only after S0 and R1 are on master and #441 is on master (it edits
this set file); PR body: flag `marlowReplan`, owner Night Shift | Marlow Build, switch-on 2026-10-29.

## Report (append below, then `status: done feature/marlow-replan-g-a2 <sha>`)
Built, numbers used (cabinet 2's spot, walkway z, pit depth), files, commits, tests run with counts, e2e "pending PC
run", deviations, what Michael should try.
