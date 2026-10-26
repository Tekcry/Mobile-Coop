status: open

# J14 Marlow re-plan, slice G-A6: A6 the Pump House on the re-plan (PR 9)
Lead: Night Shift | Marlow Build. Brief: Opus (J14 wave 2). Builder: Sonnet 5.5 (cloud or desktop). Est. 1,300 lines.
Queue copy: cloud-queue `briefs/j14-g-a6.md` (the lead copies this file there).

## Base and branch
- base: feature/marlow-replan-base at 1ab25b99b2de3fa524c94c2668a9412f64e634f5 (S0 + R1 merged, both checker-passed).
- Lead confirmed (~23:10): the layout in this brief (pit at the cage footprint, covered outfall culvert east to the L6 door, gauge board moved, attendant round north of the culvert, 1.0 x 1.0 m drop opening at x 52-53, z 65-66). Step 1 (noise test) first; report it before the rest.
- new branch: `feature/marlow-replan-g-a6` (desktop worktree `C:/NightShift/Mobile-Coop-marlow-replan-g-a6`).
- Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/marlow-replan-g-a6`. Commit and push each
  finished step (`git add <files>`, never `-A`). No stash, reset, rebase, merge or force-push.

## Read first (on the base)
- `git show origin/master:CLAUDE.md`, `git show origin/master:docs/systems/agent-preamble.md` ("Cloud sessions" if cloud).
- `docs/marlow-replan/PLAN.md` section 2 (:52-137, incl. "Guards per lesson" and the A6 fallback), "Set slices"
  (:413-432, the G-A6 row), the risk on the cage move (:568-569); `BRIEF.md` A6.
- `docs/marlow-replan/STATIONS.md`: sections 1-3 (A6 block), 6 (stations 14-16), 7, 8 (`a6-pit`), 9 (`a6-attendant`, the
  station 16 fallback), 10 (SA11, SA13, OQ6).
- `graph.json` spaces `a6-*` and links (the two `drop` links into the pit, the push-bar door, the outfall door);
  `replan-plan.svg` (1 m = 7 px; x = (px - 34) / 7, z = (642 - py) / 7): the pit is the cage footprint, the route runs east
  from it to L6.
- Code: `src/game/course/stationDef.ts`, `replan/index.ts` and `replan/a6PumpHouse.ts` (S0 stub), `ctcourse.ts`
  (`CtcourseOpts`), `types.ts`, `ctcourseGreybox.ts` (`FloorHole`, `hangPlate`), `src/player/movement.ts` (`LANDING`),
  `src/config/noise.ts` (`LANDING_NOISE_RADIUS`, heavy 11 m), the guard hearing code, `marlowCircuits.ts`
  (`MARLOW_CIRCUITS_REPLAN` group 69), R1's station code, `tests/ctcourse/replan/variant.test.ts`, the built
  `tests/ctcourse/a6PumpHouse.test.ts` (the pattern to copy).

## Only these files
- `src/world/maps/ctcourseSets/a6PumpHouse.ts`: only a third parameter `opts: { replan?: boolean } = {}` on
  `buildA6PumpHouse` and `if (!opts.replan)` guards round the pieces the re-plan removes or moves. Never touch its
  objective or radio lines (PR #441 edits them).
- `src/world/maps/ctcourseSets/replan/a6PumpHouse.ts`: everything new, by building into `b` / `kit` and amending `part`.
- `tests/ctcourse/replan/a6PumpHouse.test.ts` (new), `tests/ctcourse/replan/a6PumpHouse.light.json`,
  `scripts/e2e-ctcourse/replan/a6PumpHouse.mjs` (replaces S0's stub), `changes/feature-marlow-replan-g-a6.md`.
- `src/world/lighting/marlowCircuits.ts`: only the `a6-sw-sump` switch spot in `MARLOW_CIRCUITS_REPLAN` (group 69, the
  `sw('a6-sw-sump', ...)` entry; step 2). No other row.
- Nothing else (not PLAN / BRIEF / STATIONS / graph / svg, `replan/index.ts`, `ctcourse.ts`, `types.ts`, `facility.ts`,
  `src/game/**`, any built test, light file or e2e module). Need more: `status: blocked <what and why>`.

## Flag off = nothing changes
The built `ctcourse` stays byte-identical: `tests/ctcourse/a6PumpHouse.test.ts` (`GREY`) and every built light file
unchanged and green.

## Step 1 first: the noise test (decides a guard, push it before the rest)
Write the first case of `tests/ctcourse/replan/a6PumpHouse.test.ts`: a heavy landing (fall above `LANDING.heavy` 4.5 m,
noise radius `LANDING_NOISE_RADIUS.heavy`) at the pit floor (51.5, -1.6, 63.5) with the cage's walls between, against
every point of the attendant's round (`A6_ATTENDANT_ROUTE`, as re-routed in step 3), through the game's own hearing
check. Commit, push, and put the result in the report at once ("heard from route points ..." or "silent"); the lead
then answers G-A5's fallback line. If it is silent, build A6 with `a6-listener` (step 3) only when the lead's answer says
so.

## Build (A6, stations 14, 15, 16; guards 1)
1. **Closed routes (Q24).** Guard the staff stair (`a6PumpHouse.ts:228`, `:245-259`), its fillers and `A6_STAIR_RAIL`;
   close its head on the gallery with the gallery screen. The loading edge gets the self-closing edge gate `g-a6-edge`
   (SA11; x 40.8-45.3 on the gallery's south edge): open for the first player's leg-up, it shuts once one player is on
   the gallery, so the second climbs by the rope (station 14) and the relay ladder at the edge is gone; it resets on a
   station 14 retry.
2. **Re-lamp (Q2).** Group 69, sump high-bay and west gallery: 3 lamps (`MARLOW_CIRCUITS_REPLAN`; the count is the
   budget). Light spots for the sump, the west gallery and pump 3. **Move `a6-sw-sump` (S0 check polish, lead
   approves):** S0's plan point (58.6, 54.4) is 5 m east of the sump bay. Move it to a wall spot at the sump bay itself
   that a player can reach on the route; change only that `sw(...)` entry (position and its "where" text). Report the
   old and new spot: the lead approves it at the check.
3. **The drive pit and the outfall (station 16; PLAN risk :568: this layout is fixed here).**
   - Pit: the cage footprint x 49.4-53.6, z 62.0-66.2 sunk to y -1.6 (`FLOOR_HOLES` includes [49.4, 62.0, 53.6, 66.2]);
     the cage keeps its place and its mesh; steps from the pit floor up to the cage's push-bar door `A6-cage` (opens from
     inside only: the way back to the floor).
   - Outfall: a covered culvert from the pit's east face to holding room six's near door (64, 62): hole z 62.5-63.7 from
     x 53.6 to 61.5, then z 61.1-63.7 from x 61.5 to 64.0 (the L6 door spans z 61.1-62.9); its floor ramps from -1.6 at
     x 53.6 to 0 by x 61.5; a closed housing over it (walls 0.2 m outside the hole, clear of the pump plinths' z 62.2,
     roof at least 2.1 m over the culvert floor, `noLedge`), so the pump floor never reaches the pit or the L6 door: the
     only way into L6 is the pit's outfall. The outfall gate `g-a6-outfall` (interlocked until the drive is isolated) on
     the L6 door as built.
   - The gauge board (`A6_GAUGE` (58.0, 62.4)) moves to the housing's north face. The attendant's round no longer
     crosses the culvert: desk (61.5, 67.1) -> (54.5, 67.5) -> (48.5, 67.5) -> pump 3's east face (48.2, 61.0) and back,
     reading the gauge board on the way; keep his waits and faces' intent. Report the route.
   - If this does not fit (a plinth, the desk or the L6 door clash), shift the culvert north up to 1 m, never the cage,
     and report it; if it still does not fit, `status: blocked layout`.
4. **Drop opening (OQ6, lead decision).** A body-sized opening in the bridge deck over the pit for the drop catch:
   1.0 x 1.0 m at x 52.0-53.0, z 65.0-66.0 (the drop link's spot (52, 65.6), clear of the 0.55 m gland plate at
   (51.5, 64.9)), with a drop-out rail section, so a fall from the deck (4.4) lands on the pit floor (-1.6): 6.0 m.
   The hang-down (15) stays as built through the gland plate; the drive panel `sw-a6-panel` must be out of reach from
   the pit floor (only the hanger reaches it), so dropping in first skips nothing.
5. **Stand-in (station 16).** The cage's fixed ladder `a6-pit-ladder` from the bridge deck down through the drop opening
   to the pit floor, locked by an `anchorLock` gate `g-a6-pit-ladder` (SA11, station 16's `standIn`; `anchorLock`
   latches). The base already opens it as station 16 goes live while `dropCatch` is not playable
   (`CourseState.openStandIn`, R1 fix 7) and keeps it open through retries: build no opener of your own. Never a `hold`,
   `timedHold` or `mains` gate.
6. **Guards: one.** `a6-attendant` (re-routed above). Fallback only on the lead's answer: `a6-listener`, a static `grunt`
   at the pit side within hearing of the pit, added to `part.bay.squad` and station 16's `guards`.
7. **Stations.** `part.bay.stations` = STATIONS section 3's A6 block, verbatim (no `drillS` in A6).
8. **Done flags (section 8).** Pass zone `a6-pit` [49.55, 62.15, 53.45, 66.05] both, floorY -1.6. `a6-gal`, `a6-drive` exist.
9. **LANTERN's lines (section 6).** `bay.radio` rows `retry:a6-rope`, `retry:a6-hangdown`, `retry:a6-dropcatch`, verbatim.
10. **Objective lines.** Replace `part.objectives` for A6 in the replan file (never in the set file): one line per station
    plus the outfall / holding-room line, each naming what and where (#441's rule; at most `COURSE_TEXT_MAX`), no "fail".
11. **Fallback answer (lead fills after step 1):** <attendant only (default) / add `a6-listener`>.
12. **Drill hook:** no tick needed; leave the stub `a6Tick` in `src/game/course/replan/a6Ticks.ts` as R1 built it (no
    station in A6 has `drillS`; a guard's sighting is a `seen` retry through R1).
    Never edit `ticks.ts` or `courseMode.ts`.

## Lead decisions that touch A6 (j14-wave2-notes)
- Station 16's drop needs a body-sized opening into the pit (the 0.55 m gland hole is too small): step 4.
- Retry: R1's host `stationRetry(n, cause)`; a guard who hears the landing and sees the pair gives the `seen` retry.

## Tests (unit only; no e2e, no GPU, no `npm run check`)
Desktop builders run node at BelowNormal
(`powershell -NoProfile -Command "(Get-Process -Id \$PID).PriorityClass='BelowNormal'; <cmd>"`); light bake timeout 15 min.
```
npm run typecheck:fast
npx vitest run tests/ctcourse/replan/a6PumpHouse.test.ts tests/ctcourse/replan/variant.test.ts tests/ctcourse/a6PumpHouse.test.ts tests/ctcourse/facility.test.ts tests/marlowLightingCircuits.test.ts tests/courseStation.test.ts
CTLIGHT_VARIANT=replan CTLIGHT_WRITE=a6PumpHouse npx vitest run tests/ctcourseLight.test.ts
CTLIGHT_VARIANT=replan npx vitest run tests/ctcourseLight.test.ts
npx vitest run tests/ctcourseLight.test.ts
```
`tests/ctcourse/replan/a6PumpHouse.test.ts` pins: the noise case (step 1); the replan set's `GREY`; `checkSetPart` clean;
squad = attendant (and listener only on the fallback); stations equal STATIONS' A6 block; marks have standing room (B of
16 on the pit floor); on the nav, the pump floor reaches neither the pit nor the L6 door, the pit reaches L6 only through
the outfall, the stair is closed; with the edge gate shut no ledge or lip at the loading edge is reachable from the
floor; the drop opening 1.0 m and a 6.0 m fall through it lands in the pit; the drive panel out of reach from the pit
floor; the attendant's round walkable and clear of the housing; group 69 live with 3 lamps and `a6-sw-sump` at the sump
bay; the retry lines exist and fit.

## e2e (write, do not run: "pending PC run")
`scripts/e2e-ctcourse/replan/a6PumpHouse.mjs`: both players on host and client: leg-up and rope (the edge gate shut), the
hang-down, the drop (stand-in ladder open), the outfall to L6; one seen retry on station 15 lands both at its marks with
14 still done.

## Done looks like (PLAN set slices)
A6 on `ctcourseReplan`: the stair and edge relay closed, the sump lit, rope (14), hang-down (15), the drive pit at -1.6
with its drop opening, stand-in ladder and covered outfall to L6 (16), one guard (or the fallback), the noise result
reported; new `GREY` and light file; the built yard unchanged; the tests above green.

## PR
No PR from the builder. The lead opens it to master only after S0 and R1 are on master and #441 is on master (it edits
this set file); PR body: flag `marlowReplan`, owner Night Shift | Marlow Build, switch-on 2026-10-29.

## Report (append below, then `status: done feature/marlow-replan-g-a6 <sha>`)
The noise result first; then built, numbers used (culvert, housing, gauge board, route, drop opening, ladder), files,
commits, tests with counts, e2e "pending PC run", deviations, what Michael should try.
