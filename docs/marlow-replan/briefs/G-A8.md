status: open

# J14 Marlow re-plan, slice G-A8: A8 the Strongroom on the re-plan (PR 10)
Lead: Night Shift | Marlow Build. Brief: Opus (J14 wave 2). Builder: Sonnet 5.5 (cloud or desktop). Est. 800 lines.
Queue copy: cloud-queue `briefs/j14-g-a8.md` (the lead copies this file there).

## Base and branch
- base: feature/marlow-replan-base at <sha the lead fills> (S0 + R1 merged, both checker-passed).
- new branch: `feature/marlow-replan-g-a8` (desktop worktree `C:/NightShift/Mobile-Coop-marlow-replan-g-a8`).
- Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/marlow-replan-g-a8`. Commit and push each
  finished step (`git add <files>`, never `-A`). No stash, reset, rebase, merge or force-push.

## Read first (on the base)
- `git show origin/master:CLAUDE.md`, `git show origin/master:docs/systems/agent-preamble.md` ("Cloud sessions" if cloud).
- `docs/marlow-replan/PLAN.md` section 2 (:52-137: A8 keeps its side routes; `caught` = combat held `CAUGHT_HOLD` 2 s,
  A14), "Set slices" (:413-432, the G-A8 row); `BRIEF.md` A2, A7, A12.
- `docs/marlow-replan/STATIONS.md`: sections 1-3 (A8 block, n 18-21), 4 (the four steps), 5 (`a8-board`,
  `a8-lobby-inner`), 6 (18a-18d), 7, 8 (`a8-office-in`, `a8-grille-in`), 9 (A8 cameras, beams, the three guards), 10 (SA4).
- `graph.json` spaces `a8-*` and links (public stair `at` (131.1, 67.3), 2.4 m); `replan-plan.svg` (1 m = 7 px;
  x = (px - 34) / 7, z = (642 - py) / 7): the stair x 130.5-132.9, z 67.3-75.
- Code: `src/game/course/stationDef.ts`, `replan/index.ts` and `replan/a8Strongroom.ts` (S0 stub), `ctcourse.ts`
  (`CtcourseOpts`), `types.ts`, `marlowCircuits.ts` (`MARLOW_CIRCUITS_REPLAN` groups 85 and 86), R1's station code
  (`caught`), `tests/ctcourse/replan/variant.test.ts`, the built `tests/ctcourse/a8Strongroom.test.ts` (the pattern).

## Only these files
- `src/world/maps/ctcourseSets/a8Strongroom.ts`: only a third parameter `opts: { replan?: boolean } = {}` on
  `buildA8Strongroom` and `if (!opts.replan)` guards round the pieces the re-plan removes or replaces.
- `src/world/maps/ctcourseSets/replan/a8Strongroom.ts`: everything new, by building into `b` / `kit` and amending `part`.
- `tests/ctcourse/replan/a8Strongroom.test.ts` (new), `tests/ctcourse/replan/a8Strongroom.light.json`,
  `scripts/e2e-ctcourse/replan/a8Strongroom.mjs` (replaces S0's stub), `changes/feature-marlow-replan-g-a8.md`.
- Nothing else (not PLAN / BRIEF / STATIONS / graph / svg, `replan/index.ts`, `ctcourse.ts`, `types.ts`, `facility.ts`,
  `src/game/**`, any built test, light file or e2e module). Need more: `status: blocked <what and why>`.

## Flag off = nothing changes
The built `ctcourse` stays byte-identical: `tests/ctcourse/a8Strongroom.test.ts` (`GREY`) and every built light file
unchanged and green.

## Build (A8, stations 18-21 = badge 18a-18d; guards 3; side routes kept)
1. **Public stair 2.4 m.** The public stair (`A8_PUBLIC_STAIR` x 130.5-131.7, foot z 67.3, rising north to the gallery)
   is widened to x 130.5-132.9 (graph `open_stair` 2.4 m, a real banking hall's width); its rails (`A8_STAIR_RAIL`) move
   to the new open edges; the north column at x 133 (`A8_COLUMNS_N`, :169) and the night desk (`A8_DESK`, :186) keep
   0.6 m body clear of the flight (move the column's foot if needed; report it). Guard the built 1.2 m flight and rails.
2. **Glazed office west wall.** The security office's west wall above the gallery floor (`a8Strongroom.ts:399-401`,
   x 134, z 71.4-78, door `A8-office` kept) becomes a glazed screen (`kit.glass`, which stops guard and camera sight; PLAN
   section 2); guard the built solid wall pieces.
3. **Side routes kept (Q24).** The public stair, the loop round the counters (both counter ends), the request-to-exit
   button in the lobby: none closed. Confirm on the nav that each is open.
4. **Lamps (Q2).** Group 85, the vestibule: 2 ceiling panels under the gallery return, switch `a8-sw-vestibule` at
   (106.5, 62.5) by the L7 door; group 86, the west bays behind the counters: 2 brass wall lights / counter lamps, switch
   `a8-sw-west` at (112.0, 74.6) (`MARLOW_CIRCUITS_REPLAN`; the counts are the budget). Light spots for both.
5. **Guards: three, as built.** `a8-night1`, `a8-night2`, `a8-officer`; no alarm team (BRIEF A12).
6. **Stations (SA4).** `part.bay.stations` = STATIONS section 3's A8 block, verbatim: n 18-21, all `retry: 'caught'`;
   20 has `drillS` 25 (the board's dark, `g-a8-night`), 21 has `drillS` 60 (the console loop `g-a8-console`, pressed in 19;
   if 21 goes live after the loop ended it fails at once, STATIONS section 5).
7. **Done flags (section 8).** Pass zones `a8-office-in` [134.25, 75.5, 136, 77.75] any, floorY 4.4, and `a8-grille-in`
   [134.3, 60.5, 136, 63.5] any, floorY 0. `a8-loop`, `a8-sync` exist.
8. **LANTERN's lines (section 6).** `bay.radio` rows `retry:a8-c2run`, `retry:a8-loopset`, `retry:a8-isolate`,
   `retry:a8-isolate:timer`, `retry:a8-locks`, `retry:a8-locks:timer`, verbatim.
9. **Objective lines.** Keep the built A8 objective chain (`a8Strongroom.ts:551-596`) where it matches the four steps;
   any line you change goes in the replan file (amend `part.objectives`), naming what and where, at most
   `COURSE_TEXT_MAX`, no "fail".
10. **Counters (lead note).** `a8-counters` in the graph is drawn on the north side of the oak counters (the jam spot
    (118, 67.2) for C2). Confirm from the built geometry which side of `A8_COUNTER_MAIN` (z 65.5-66.24) the staff side and
    the jam spot are, and that the floor partner at (118, 67.2) jams C2 (133.75, 4.4 + mount, 73.0; range 10) for the
    gallery's last 8 m; report the box for G1.
11. **Drill hook (lead decided ~23:10):** no timer starts from a gate opening. Write the windows of stations 20 and 21 as runtime code in your
   own stub `src/game/course/replan/a8Ticks.ts` (R1 created it and registered it in `REPLAN_TICKS` in
   `src/game/course/replan/ticks.ts`): a `StationTick(h, dt)` that reads `h.live()`, `h.flag(id)`, `h.playersIn(zone)`,
   `h.now()` and calls `h.retry(n, 'timer' | 'seen')`; allocation-free (no closures or arrays per frame). Edit no other
   tick file and not `ticks.ts`. Add `a8Ticks.ts` to this brief's file list and unit-test the tick with fake hooks.

## Lead decisions that touch A8 (j14-wave2-notes)
- n 18-21 for badge 18; play order as listed; marks by role (A = gallery / office, B = floor).
- `caught` retries through R1 (`CAUGHT_HOLD` 2 s); timed steps call R1's `stationRetry(n, 'timer')`; a retry resets the
  listed guards plus any guard alerted in the bay.

## Tests (unit only; no e2e, no GPU, no `npm run check`)
Desktop builders run node at BelowNormal
(`powershell -NoProfile -Command "(Get-Process -Id \$PID).PriorityClass='BelowNormal'; <cmd>"`); light bake timeout 15 min.
```
npm run typecheck:fast
npx vitest run tests/ctcourse/replan/a8Strongroom.test.ts tests/ctcourse/replan/variant.test.ts tests/ctcourse/a8Strongroom.test.ts tests/ctcourse/facility.test.ts tests/marlowLightingCircuits.test.ts tests/courseStation.test.ts
CTLIGHT_VARIANT=replan CTLIGHT_WRITE=a8Strongroom npx vitest run tests/ctcourseLight.test.ts
CTLIGHT_VARIANT=replan npx vitest run tests/ctcourseLight.test.ts
npx vitest run tests/ctcourseLight.test.ts
```
`tests/ctcourse/replan/a8Strongroom.test.ts` pins: the replan set's `GREY`; `checkSetPart` clean; squad = the three;
stations equal STATIONS' A8 block (n 18-21, `caught`); marks have standing room (A's at 4.4 on the office floor); the
stair 2.4 m clear with 0.6 m past the column and desk; the glazed wall stops guard sight and keeps the door; the side
routes open on the nav; the jam line from (118, 67.2) to C2; groups 85 and 86 live with their lamp counts; the retry
lines exist and fit.

## e2e (write, do not run: "pending PC run")
`scripts/e2e-ctcourse/replan/a8Strongroom.mjs`: both players on host and client through 18a-18d; a short sighting that
breaks off does not retry; combat held 2 s retries that step at its marks with earlier steps done; one board timer retry.

## Done looks like (PLAN set slices)
A8 on `ctcourseReplan`: the 2.4 m public stair, the glazed office wall, the vestibule and west bays lit, four `caught`
steps with the board's 25 s and the loop's 60 s, side routes kept, three guards; new `GREY` and light file; the built yard
unchanged; the tests above green.

## PR
No PR from the builder. The lead opens it to master only after S0 and R1 are on master; PR body: flag `marlowReplan`,
owner Night Shift | Marlow Build, switch-on 2026-10-29.

## Report (append below, then `status: done feature/marlow-replan-g-a8 <sha>`)
Built, numbers used (stair, column, rails, glass, lamps, the counters box), files, commits, tests with counts, e2e
"pending PC run", deviations, what Michael should try.
