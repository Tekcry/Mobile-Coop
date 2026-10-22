# RE - e2e coverage of slice R (`scripts/e2e-sectorops.mjs`)

The suite runs as five parts (`--part=N`; `run-e2e.mjs` expands `e2e-sectorops` to `:1`-`:5`, one job each).

| Part | Pages | Covers |
| --- | --- | --- |
| 1 | 1, then 2 | The suite before slice R: the three sections (objective, connector cycle, extraction, Ghost result), an alarm and its reinforcements, a kill breaking the Ghost, everyone down restarting at the checkpoint (M7), the M8 nav check, the co-op mirror |
| 2 | 1 (solo) | The leg-up search finds each planned lip from its spot, and nothing at R3N's east face or R3's A3 faces (the removed C1a / C2). Solo refusal at every co-op lip: the traverse button under it, and a top-gear (5, 4.0 m/s) run-up and jump at it. Solo running jumps off the nearest solo tops at the top gear: R2N -> R3N, R2S -> R3S, the S1 east lane's single pallet (1.0) over the 2.0 stacks at the monorail, and from the floor at the stacks; take-offs 0.6 / 0.3 / 0.05 m before the edge and a plain run off, no grip at 4.25+ held, no stack stood on. The engine links: monorail -> bay main -> deck; the sill climb-up, crouch-walk onto the deck and the way back; R3S's climb-up from the east lip and walk-off; the S3 platforms' climb-ups (crouched), let-go ways down, lip -> main and back, lip -> branch -> main. Every team door: bolted at the start, the near side refused, the far side's Unbolt, the partner through, re-bolted by a restart |
| 3 | 2 (`?net=local`) | Section 1 co-op: the sill (leg-up, relay, both onto the deck), the monorail (leg-up, hand over hand, let go), the mess door unbolted by the client |
| 4 | 2 | Section 2 co-op: R3S's C1b by the rope, then by the relay; the VNA gate |
| 5 | 2 | Section 3 co-op: the valve platform by the relay, the drive platform by the rope; the lobby door |

## Results (fix round head d85ce219)

Not run. The orchestrator's rule (2026-10-22 20:05) was the full R suites on the desktop
(`E2E_JOBS=2 E2E_PORT=4191 node scripts/run-e2e.mjs e2e-sectorops e2e-coop e2e-netmove`), only with the desktop's
`heavy.lock` free and CPU under ~60%. At the check the lock was held ("Night Shift | Orchestrator | gpu-desk | 20:15")
and CPU was at 71%, so the run was skipped (no wait, no retry).

- e2e-sectorops parts 1-5: pending (laptop test runner or the desktop once free), on d85ce219 or later.
- e2e-coop, e2e-netmove: pending, same.

Unit checks on d85ce219: `npx tsc --noEmit -p .` clean; eslint clean on the changed src / tests files;
`npx vitest run tests/warehouse tests/sector tests/attach tests/anchors.test.ts`: 16 files, 184 passed, 3 skipped.

## Checker notes (accepted)

- 6: `tests/sectorBolt.test.ts` does not cover the SectorMode / CoopHost wiring; e2e parts 2-5 do.
- 8: a client unbolting gets no feed line (only the local user does), per RT.md.
- 10: alarm / search nav vs bolted doors: the same exposure as the existing locked connectors; M8 is the backstop.

## Laptop run on 2f40ed74 (Character Build, E2E_GPU=1)

Log on the laptop: `C:/NightShift/scratch/runs/sectorfixesr-2f40ed74/`. Build ok; e2e-coop ok (111 s); e2e-netmove ok
(130 s); e2e-sectorops FAIL (no console errors, sim x1.00), run as one job (see the runner fix below).

| Failure | Cause | Fix |
| --- | --- | --- |
| S1 E-lane single pallet (1.0): "stood 2.06" off the 0.05 m take-off | Geometry. The jump's apex (1.87) was 0.13 m under the 2.0 stacks' top: the capsule rides up over an edge within the controller's step (0.42). A mantle from the pallet's edge also reached the top (1.0 up, 1.2 across, probe 1.3) | `warehouseS1.ts`: the pallet is an empty one, `S1_COOP.hoist.lanePallet` 0.15 (apex 1.02; the stacks 1.85 up, over the 1.8 mantle). Unit check in `warehouseCoopS1.test.ts` |
| S1 E-lane floor: take-off never left | Test. The body stops at the stacks' face with its centre at z -12.96, so take-offs measured from the face (-13.3) at 0.3 / 0.05 m never trigger (and from x -10.5 it scraped the pallet) | Take-offs measured from the stop (-12.95), start (-10.45, -10.6); no "run off" for the floor and the 0.15 pallet (never airborne) |
| S1 C2 way down: stops at z -16.05 | Test. The hands stop 0.45 m short of a pipe's end (`attachRange`); -16.05 is 0.7 m from the checker's stop, inside the drop takedown's 1.0 | Part 2 and part 3 use -16.05; unit check of the reachable end vs the checker |
| S3 C1 / C2 climb-up: `canClimb` false (and parts 5's pull-ups) | Geometry. The climb-up needs a standing body's room (`AttachController.climbRoom`, 1.75); the hall roof left 1.63 | `warehouseS3.ts`: a raised hood over each platform (underside 6.3), the roof cut open under it (`S3_ROOF_HOODS`; `warehouse.ts` `roofHoles`, `warehouseDress.ts` `ROOF_OPENINGS`) |
| S3 C1 lip to the main: took the branch | Test. Hanging, the camera stays within 2.2 rad of the body's facing, so "stick forward with the camera turned away" pointed north-west; and the main, 0.18 m out from the body, is only taken as a jump up (stick into the wall) | `hangJump` sets the stick against the camera's real yaw; the lip -> main jump uses the stick into the platform |
| S3 C2 branch to the main: stops at x 16.55 | Test. The 0.45 m end stop | Threshold 16.5 (and the main's north end 12.15, not 12.3) |
| Runner: e2e-sectorops ran as one job | `run-e2e.mjs` expanded PARTS only for the default list, never for named suites | `expand(named)`: `e2e-sectorops` runs as `:1`-`:5`, `e2e-sectorops:2` as itself |
| (added scope) Michael M1 "Add another": S2 had only C1b + the team door | - | S2 C2, the dispatch landing (`S2_LANDING`, R2.md): unit tests, part 2 solo refusal / stack jump / climb-up / let go, part 4 leg-up + relay |

## Desktop runs (e2e fix round, all E2E_GPU=1, port 4192, E2E_JOBS=1, the GPU lane `heavy2.lock`)

| Commit | Suites | Result |
| --- | --- | --- |
| working tree (S1 / S3 fixes, before the test fixes) | e2e-sectorops:2 | FAIL 34 s: the pallet run off, the floor take-offs, S3 C1 lip -> main (branch taken); the S3 climb-ups, the S1 C2 end stop and the S3 C2 branch passed |
| working tree (+ test fixes) | e2e-sectorops:2, :3, :5 | ok 27 s, 23 s, 37 s |
| working tree (+ S2 C2) | e2e-sectorops:2, :4 | ok 35 s, 41 s |
| ed2601d2 (final code) | e2e-sectorops:1-5, e2e-coop, e2e-netmove, e2e-lightbake, e2e-levels, e2e-anchors | all ok, each to completion: sectorops :1 48 s, :2 33 s, :3 24 s, :4 37 s, :5 34 s; coop 66 s; netmove 130 s; lightbake 63 s; levels 5 s; anchors 4 s (wall 446 s) |

Unit checks on ed2601d2: `npx tsc --noEmit -p .` clean; eslint clean on the changed src / tests files (the two scripts are
eslint-ignored); `npx vitest run tests/warehouse tests/sector tests/attach tests/anchors.test.ts`: 16 files, 190 passed,
3 skipped. Not run: the CORE suites (e2e-move / combat / anim) that a `run-e2e.mjs` edit picks in a quick run.

Polish (not blocking): R3S's and the S2 landing's tops are under the hall roof's visual panel (6.03, no collision), so a
player standing up there (not crouched) clips about 0.1 m into the drawn roof; the S3 platforms have hoods instead.
