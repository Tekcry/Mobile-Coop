status: open

# J14 Marlow re-plan, slice G-A3: A3 the Office Range on the re-plan (PR 6)
Lead: Night Shift | Marlow Build. Brief: Opus (J14 wave 2). Builder: Sonnet 5.5 (cloud or desktop). Est. 950 lines.
Queue copy: cloud-queue `briefs/j14-g-a3.md` (the lead copies this file there).

## Base and branch
- base: feature/marlow-replan-base at 1ab25b99b2de3fa524c94c2668a9412f64e634f5 (S0 + R1 merged, both checker-passed).
- new branch: `feature/marlow-replan-g-a3` (desktop worktree `C:/NightShift/Mobile-Coop-marlow-replan-g-a3`).
- Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/marlow-replan-g-a3`. Commit and push each
  finished step (`git add <files>`, never `-A`). No stash, reset, rebase, merge or force-push.

## Read first (on the base)
- `git show origin/master:CLAUDE.md`, `git show origin/master:docs/systems/agent-preamble.md` ("Cloud sessions" if cloud).
- `docs/marlow-replan/PLAN.md` section 2 (:52-137) and "Set slices" (:413-432, the G-A3 row); `BRIEF.md`.
- `docs/marlow-replan/STATIONS.md`: sections 1-3 (A3 block), 5 (`a3-corridor`: no `drillS`, SA6), 6 (stations 6, 7), 7, 8
  (`a3-fire`), 9 (`cam-a3-hall`; A3 has no guard), 10 (SA6, SA11).
- `graph.json` spaces `a3-*` and links (the `duct` and the `bolted` door, both with `at`); `replan-plan.svg` (1 m = 7 px;
  x = (px - 34) / 7, z = (642 - py) / 7): the crawl path runs (77.6, 1.2) -> (82.6, 1.2) -> (82.6, 8.8).
- Code: `src/game/course/stationDef.ts`, `replan/index.ts` and `replan/a3OfficeRange.ts` (S0 stub), `ctcourse.ts`
  (`CtcourseOpts`), `types.ts` (`SetPart`, `checkSetPart`), `src/player/ventOpen.ts` and a map that builds a vent (grep
  `ventOpen` / the vent anchor kind) for the crawl and its grille, `src/game/jammer.ts` (`HallRule`), R1's station code,
  `tests/ctcourse/replan/variant.test.ts`, the built `tests/ctcourse/a3OfficeRange.test.ts` (the pattern to copy).

## Only these files
- `src/world/maps/ctcourseSets/a3OfficeRange.ts`: only a third parameter `opts: { replan?: boolean } = {}` on
  `buildA3OfficeRange` and `if (!opts.replan)` guards round the pieces the re-plan removes. Never touch its objective or
  radio lines (PR #441 edits them).
- `src/world/maps/ctcourseSets/replan/a3OfficeRange.ts`: everything new, by building into `b` / `kit` and amending `part`.
- `tests/ctcourse/replan/a3OfficeRange.test.ts` (new), `tests/ctcourse/replan/a3OfficeRange.light.json`,
  `scripts/e2e-ctcourse/replan/a3OfficeRange.mjs` (replaces S0's stub), `changes/feature-marlow-replan-g-a3.md`.
- Nothing else (not PLAN / BRIEF / STATIONS / graph / svg, `replan/index.ts`, `ctcourse.ts`, `types.ts`, `facility.ts`,
  `src/game/**`, any built test, light file or e2e module). Need more: `status: blocked <what and why>`.

## Flag off = nothing changes
The built `ctcourse` stays byte-identical: `tests/ctcourse/a3OfficeRange.test.ts` (`GREY`) and every built
`tests/ctcourse/<set>.light.json` unchanged and green; the built A3 keeps its cleaner, office route and send-back.

## Build (A3, stations 6, 7; guards 0, one camera)
1. **Guards: none.** Remove `a3-cleaner` from `part.squads` and `part.bay.squad` (replan file); his route and objective
   mention go with him.
2. **Offices closed (Q24).** The office doors `A3-office1`, `A3-comm1`, `A3-comm2`, `A3-recess`, `A3-office3`
   (`a3OfficeRange.ts:89-94`, `:249-267`) are locked for good (the facility's locked-door idiom; never open).
3. **Fire door (station 6, `vent_unlock`).** The corridor's west mouth (x 79.5, z 9-12.5) gets a wall with the landlord's
   fire door: door `A3-fire` 1.2 x 2.1 at z 10.15-11.35 (graph `at` z 10.75), gate `g-a3-fire` of the bolt kind, push bar
   on the corridor side (opens from the corridor only). The rest of the mouth is wall to the ceiling.
4. **Riser cupboard and services crawl.** A riser cupboard in the west lobby's south-west corner (x 76.25-78.75,
   z 0.25-1.4, its door / vent grille on the north face; station 6's mark A (77.5, 2.0) stands 0.6 m in front of it); a
   player-only crawl 1.2 wide x 1.5 high, sealed on every side, from the cupboard east along z 0.25-1.45 to x 81.4, then
   north along x 80.2-81.4 to the corridor's south wall (z 8.85), out by a grille in that wall at x 80.2-81.4 (about
   12 m, the graph's `duct`). The grille sits west of x 82.0: the camera at x 96.6 reaches 14 m (x 82.6), so the crawl
   and the fire door are past its range. The crawler opens the fire door's push bar for the partner (vent unlock: master's vent
   pieces and anchors, `ventOpen.ts`). Report the built coordinates.
5. **Jam relay (station 7, `jam_relay`).** As built: `cam-a3-hall` (IR, armoured, 14 m), jam 5 s + reboot 1.5 s, the posts.
   No `drillS` on station 7 (SA6): the camera judges each hop.
6. **No send-back.** The A3 pass zones `a3-p-far1` / `a3-p-far` lose their `hall` field on the re-plan (amend
   `part.passZones`): a camera's full detection is now a station retry (R1), never the `HallRule` send-back. Keep the
   bay's role claim (B in the corridor box).
7. **Stations.** `part.bay.stations` = STATIONS section 3's A3 block, verbatim.
8. **Done flags (section 8).** Pass zone `a3-fire` [79.6, 9.2, 82, 12.3] both, floorY 0. `a3-far` exists.
9. **LANTERN's lines (section 6).** `bay.radio` rows `retry:a3-vent`, `retry:a3-jam`, text verbatim. Replace the built
   radio lines that name the send-back or the cleaner by filtering `part.bay.radio` in the replan file.
10. **Objective lines.** Replace `part.objectives` for A3 in the replan file: one line per station plus the holding-room
    line, each naming what and where (#441's rule; at most `COURSE_TEXT_MAX`), no "fail".
11. **Lamps.** No circuit change in A3 (`MARLOW_CIRCUITS_REPLAN`); the riser cupboard and crawl stay unlit (a crawl, not a
    dead-light pocket: light it from the cupboard's existing spill or add no pocket).
12. **Drill hook:** no tick needed; leave the stub `a3Tick` in `src/game/course/replan/a3Ticks.ts` as R1 built it
    (station 6 cannot time out and station 7 has no `drillS`: the camera's full detection is a `seen` retry through R1,
    SA6). Never edit `ticks.ts` or `courseMode.ts`.

## Lead decisions that touch A3 (j14-wave2-notes)
- Retry: R1's host `stationRetry(n, cause)` handles the camera's full detection (`seen`); this set declares nothing extra.
- A retry resets the station's listed gates (here `g-a3-fire`, `cam-a3-hall` repaired) and any guard alerted in the bay.

## Tests (unit only; no e2e, no GPU, no `npm run check`)
Desktop builders run node at BelowNormal
(`powershell -NoProfile -Command "(Get-Process -Id \$PID).PriorityClass='BelowNormal'; <cmd>"`); light bake timeout 15 min.
```
npm run typecheck:fast
npx vitest run tests/ctcourse/replan/a3OfficeRange.test.ts tests/ctcourse/replan/variant.test.ts tests/ctcourse/a3OfficeRange.test.ts tests/ctcourse/facility.test.ts tests/marlowLightingCircuits.test.ts tests/courseStation.test.ts
CTLIGHT_VARIANT=replan CTLIGHT_WRITE=a3OfficeRange npx vitest run tests/ctcourseLight.test.ts
CTLIGHT_VARIANT=replan npx vitest run tests/ctcourseLight.test.ts
npx vitest run tests/ctcourseLight.test.ts
```
`tests/ctcourse/replan/a3OfficeRange.test.ts` pins: the replan set's `GREY`; `checkSetPart` clean; empty squad; stations
equal STATIONS' A3 block; marks have standing room; on the nav, from the west lobby with every gate shut the only way to
the corridor is the crawl (the offices and the fire door shut); the crawl exit is outside the camera's 14 m and its sight
cone; with `g-a3-fire` open both reach the corridor; no A3 pass zone carries `hall`; the retry lines exist and fit.

## e2e (write, do not run: "pending PC run")
`scripts/e2e-ctcourse/replan/a3OfficeRange.mjs`: both players on host and client: the crawl, the fire door opened from the
corridor side, the jam relay to the east lobby; one camera retry lands both at station 7's marks with station 6 still done.

## Done looks like (PLAN set slices)
A3 on `ctcourseReplan`: no guard, offices locked, the crawl and the fire door teach the vent unlock (6), the jam relay (7)
with station retries and no send-back; new `GREY` and light file; the built yard unchanged; the tests above green.

## PR
No PR from the builder. The lead opens it to master only after S0 and R1 are on master and #441 is on master (it edits
this set file); PR body: flag `marlowReplan`, owner Night Shift | Marlow Build, switch-on 2026-10-29.

## Report (append below, then `status: done feature/marlow-replan-g-a3 <sha>`)
Built, numbers used (cupboard, crawl and grille coordinates), files, commits, tests with counts, e2e "pending PC run",
deviations, what Michael should try.
