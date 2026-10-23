# A64 lift (2026-10-23, Opus, branch feature/sector-redesign-cap off -polish 4a65d692)

STATE "Next" 4: "When guard-render lands: lift the A64 cap for S4 / S5 (20 / 24 guards)". Decision: BRIEF A99.

## Guard-render facts used
- Budget target (`docs/guard-render/BRIEF.md` M1): 60 Hz at Epic 1920x1080 on the laptop 4090, frame CPU p95 <= 12 ms,
  GPU p95 <= 15 ms at 24 facing guards.
- Measured with the merged body, S1 (`docs/guard-render/run-s1/guard-cap.csv`, REPORT.md table):
  - Sector Ops 24 alive / 12 in sight (the harness's sector alive cap), alert/facing: frame CPU med 8.1 / p95 11.1 ms,
    GPU 6.0 / 7.2 ms, 293 draws, 611 active meshes. Patrol/facing: 6.8 / 8.8 ms CPU, 5.5 / 6.5 ms GPU.
  - Marlow (ctcourse) 24 alive / 24 in sight, alert/facing: CPU 6.2 / 8.6 ms, GPU 4.7 / 5.6 ms.
  - Before S1 (`run-s1-off`, same build, `?guardmerge=0`): Sector Ops 24 alert 10.3 / 12.4 ms CPU; Marlow 24 alert
    9.2 / 15.3 ms. The A64 era number (guard-cap 4.64.0, BRIEF "Where we start") was 57 ms CPU at 24.
- S6 (`docs/guard-render/STATE.md` "S6", `run-s6-on`): Sector Ops 24 alert 7.4 / 9.0 ms CPU, GPU 5.6 / 6.5 ms (that run
  had S6d, which did not ship; master gain is S6b only).
- S7 (STATE "S7"): GPU buffers shared per look, memory only (24 guards 32.3 -> 7.9 MB); no frame-time claim.
- S5 (STATE "S5"): anim cost cuts, noise-level on NullEngine; S3a is the sim head hit volume (no render effect).
- `dormant` has no reader: `grep dormant src` finds only the field (`src/game/sectors.ts:97-98`) and the campus data.
  Guard-render shipped no sleep / dormant path. Its S4 anim tiers (`origin/feature/guard-render-s4`, in train 26, not on
  this branch) key on off-screen (every 4th frame) and > 22 m from the camera (every 2nd), not the tag
  (`git show 5809afe6:docs/guard-render/STATE.md` lines 329-340). `docs/level-design.md:136-138`: `MAX_ALIVE` 12 awake;
  Kestrel's dormant step not built.

## Decision (A99)
- Screen cap 6 awake -> 12 guards, every guard counted (dormant too, since nothing sleeps them). One constant:
  `CAMPUS_SCREEN_CAP = 12` (`src/world/maps/campusSectors.ts:11-19`). Why 12, not none: 12 in sight with 24 alive is the
  densest cell measured on a sector-scale map (11.1 ms CPU p95, inside 12 but with little margin; 9.0 with S6); 24 in
  sight was only measured on Marlow, a lighter scene. The campus scene, with the detail art now merging, is not measured.
- `dormant` tags: kept as data on the far guards (S2 #10 #12, S3 #12 #14, S4 #10 #11 #16, S5 #1-#3 #15) for a later
  far-guard sleep step; the dormant-rule tests (no choke / pair / handler / posted / dog dormant) stay. Dropped on S1 #7,
  tagged only for A64 margin (A68).
- Undo: cap back to 6, the tests' `!g.dormant` filter back, `dormant: true` back on S1 #7.

## Changes
- `src/world/maps/campusSectors.ts`: `CAMPUS_SCREEN_CAP` (doc gives the basis and undo); S1 #7 `dormant` removed; S2 / S3
  dormant comments say data only (A99).
- `src/world/maps/campusS4Data.ts`, `campusS5Data.ts`: dormant comments (A64 / A99, data only). No data value changed.
- `src/game/sectors.ts:97`: the `dormant` doc no longer claims guard-render reads it (comment only).
- Tests: `campusS1.test.ts` (A68 test -> A99: no S1 guard dormant, 8 <= cap); `campusS2.test.ts` (the awake-only <= 6 and
  all-12 <= 7 tests -> one all-guards <= cap test); `campusS3.test.ts`, `campusS4.test.ts`, `campusS5.test.ts` (screen
  count over every guard, <= `CAMPUS_SCREEN_CAP`; sampling unchanged: every 0.5 m nav cell, 32 facings, 86 deg, 40 m).
- `docs/sector-redesign/BRIEF.md`: A99.

## Worst views now (every guard counted; found by running the screen tests with the cap at 0)
| Section | Guards | Worst | Where | Guards seen |
| --- | --- | --- | --- | --- |
| S2 | 12 | 5 | (-8.25, 4.4, -4.25), L1 by the void, 2 m grid, no FOV | #1 #2 #3 #4 #7 |
| S3 | 16 | 6 | (50.25, 0, -12.75) facing 259, hall floor east end | #6-#11 |
| S4 | 20 | 7 | (26.75, 4.4, 30.75) facing 270, over the pods looking west | #7 #9 #10 #11 #14 #15 #20 |
| S5 | 24 | 6 | (-50.25, 3.0, 62.25) facing 158, boathouse roof | #5 #6 #7 #8 #20 #23 |
All are under 12, so the current layouts carry 5-6 guards of margin against the new cap.

## Test results
- `npx tsc --noEmit -p .`: clean (before and after the runs).
- vitest single files (sr-slot-2.lock held per run): campusS1 51/51, campusS2 39/39, campusS3 32/32, campusS4 41/41,
  campusS5 29/29 pass (full files, after the cap was restored to 12).
- Not run (as ordered): e2e, full `npm run check`, eslint.

## Polish list (A64 compromises; no geometry changed here)
1. `campusS3.ts:47-49` `S3_VIEW_SPANDREL_TOP` 6.2 (A70): with cap 12 the corridor guards can get their look-down to
   the hall's far half back (spandrel 5.8); re-run the S3 screen test and M8 isolation after.
2. `campusS1.ts:261` smoking-shelter east panel 1.5 m longer (A68): it also hides #6 from the verge on the stealth
   route, so it is a stealth choice too; keep unless a playtest says it reads odd.
3. `campusS3.ts:393-395` crane-bay board screen (L9): needed for #16's M8 isolation as well; keep.
4. S2 L8 / A75 facilities glass on the south wall (not the SPEC's west wall): with cap 12 the SPEC's west glass (8 seen
   from the L1 north ring) fits; restores "#7 through the facilities glass from the SW stair door".
5. S2 L9 east wing wall (x -7.5) as an A64 sight breaker: probably keep (it also shapes the floor), review at the walk.

## For the GPU perf pass (laptop 4090, Epic, `scripts/guard-cap.mjs` or a campus perf probe)
Measure frame CPU / GPU p95 at these views with every guard of the section spawned, alert and patrol:
- S4 (26.75, 4.4, 30.75) facing west (7 guards, the densest campus view) and the NOC / plant deck view over the hall.
- S5 (-50.25, 3.0, 62.25) facing 158 (boathouse roof, outdoors, 6 guards, the 24-guard section), plus the L1 gallery
  over the hall and the terrace / lawn (open, long sight lines).
- S3 (50.25, 0, -12.75) facing 259 (hall floor, 6) as a third point.
- Also the campus at 0 guards (base cost with the detail art), to place 12 in sight against the 12 ms CPU line. If
  12-in-sight there stays well under 12 / 15 ms p95, A99 can go to 24 (no cap); if over, back toward 6-8.
