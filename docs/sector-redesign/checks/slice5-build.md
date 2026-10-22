# Slice 5 build report (S5 Old House) - builder Sonnet 5.5

Branch `feature/sector-redesign-s5`. Brief: `briefs/SLICE5.md`. Status: DONE (built, tested, pushed). Not run: the e2e block (written, `node --check` ok).
Note: python is not installed on this machine; edit with the Edit tool or node.

## Files
- NEW `src/world/maps/campusS5.ts` (geometry, lamps, switches, board, laser and panel, rooms, hide spots, nav seeds, test constants).
- NEW `src/world/maps/campusS5Data.ts` (guards, routes, `S5_SECTOR`, cameras, alarms, posts, `S5_CAMERA_FLAGS`, `S5_ARMOURED`, `S5_AMMO_CRATE`).
- EDIT `campusSectors.ts` (import, `...S5_POSTS`, `'s5-l1': 4.2`, `...S5_CAMERAS`, `...S5_ALARMS`, stub -> `S5_SECTOR`), `campusOps.ts` (per brief; the S5 shell and the `(-46, 0, 33)` seed gone).
- NEW `tests/campusS5.test.ts` (29 tests incl. runtime-nav legs and A64). EDIT counts: `campusS2.test.ts:156` (+9), `laserPanels.test.ts` (8 -> 9).
- EDIT `scripts/e2e-sectorops.mjs` (`campusS5Part`, `want(6)` run appended before the final log), `changes/feature-sector-redesign.md` (one line).

## Checks
- `npx tsc --noEmit -p .` clean; eslint on the changed src / test files clean; `node --check scripts/e2e-sectorops.mjs` ok.
- vitest: campusS5 (29), campusS1, campusS2, campusS3, laserPanels, campusRuntimeNav all pass (140 + 29).
- A64 worst: 6 at (-50.25, 3.00, 62.25) facing 158 (#5, #6, #7, #8, #20, #23; the boathouse roof, outdoors); 10688 samples, 1610 on L1, 2054 on the roof, 0 over 6;
  histogram {0:1523, 1:3111, 2:2786, 3:1278, 4:1907, 5:71, 6:12}. No fallback needed.

## L-numbers
- L1: the core has 4 flights (floors [0, 4.2, 8.4], two storeys), not six; test asserts four, rise 2.1, door at G / L1 / roof.
- L2: core doors at plan (-35, 38.1) (S2's wall centre line), brief says 38.0.
- L3: kitchen counter is z 34..38 (brief z 34..42 blocks the board at z 40, failing `nearNav`).
- L4: analytic nav rect widened to x -16 so the start (-18, 29) is inside.
- L5: takedown spots and route-guard yaws are my picks. Best spots were searched within 1.6 m of every guard (throwaway script, removed).
- L6: anteroom has no audit table (as brief). Lake not modelled.
- L7: e2e part-6 line 1612 (`S.slice(3).every guards 0`) is earlier code and now fails (S5 has 24 guards, S4 is the other builder's): the lead fixes it at merge.
- L8: **M8 exceptions beyond the brief's four pairs** (0 s isolation best within 1.6 m): #1-#4 (response team: one open room, the hall walk),
  #11 (best 2 s: anteroom with the keyholders), #13-#14 (gallery pair see across the void), #20 and #23 (open lawn, in range of the terrace patrol / van).
  Fix needs geometry (screens); recorded in the test. M8 table (run at chosen spot): #12 13.25 s, #15 21.5 s, #18 6 s, #19 180 s, #21 4 s, #22 18.5 s, #24 5.5 s ok.
- L9: the high route gets one extra roof point `[-41.0, 35.0, 8.4]` (so no leg passes within 1.2 m of the pg-arch door in plan); `obj` 24, `climbs [11]`.
- L10: the stage-1 response route's first point is `[-51.6, 24]` (the brief's (-53, 24) is inside the control-room table).
- L11: the guards' grid steps over the open window's 0.45 sill (its 1.6 clear height is not read there), so the CR7 "well reaches nothing" test closes the sash on the grid. Guards may path through the window into the well. Open item for the lead (engine nav, or a taller sill).
- L12: sealing test shuts the locked front door on the grid (doors are anchors, not blockers).
- L13: K4 test blocks the pg-arch leaf with a nav closure and the cones on G only.
- L14: the hoist door is a plain door anchor (L1, (-46, 36)); panel x -41.15 as brief.
- L15: partitions 0.2, outer walls 0.3 in bands (G 0..4.2, L1 4.2..8.4); door heads overhead.
- L16: extra runtime-nav test (hall stair and route legs on the e2e grid) lives in `campusS5.test.ts`.

## Skipped
e2e not run. CR6 with two players, the CR7 rope and the dual takedown (as brief). `campusLips.ts` untouched.

## Open
- L7 (e2e line 1612), L8 (M8 exceptions), L11 (window nav).
