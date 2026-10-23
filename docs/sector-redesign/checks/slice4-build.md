# Slice 4 build report - S4 data hall (builder Sonnet 5.5)

Branch `feature/sector-redesign-s4`. Done. e2e and build not run (rules); `campusS4Part` is written and `node --check` clean.

## Files
- New `src/world/maps/campusS4.ts` (geometry, lamps, switches, board, rooms, hide spots, nav seeds, laser + panel, `S4_COOP_LIPS`, test constants), `src/world/maps/campusS4Data.ts` (guards, routes, sector, cameras, desk, alarms, posts, camera flags, armoured routes, ammo crate), `tests/campusS4.test.ts` (30+ tests, 13 groups).
- Edited `campusSectors.ts`, `campusOps.ts` (shell line + seed (24, 0, 30) removed), `campusLips.ts` as the merge notes say.
- Count edits: `tests/campusS2.test.ts:156` `5 + 7 + 9 + 8`; `tests/laserPanels.test.ts` 8 -> 9.
- `scripts/e2e-sectorops.mjs`: `campusS4Part` + two `run` blocks (route/desk/gate/lure/C4, CR4 probes) in `if (want(6))`, appended after the S3 block.
- `changes/feature-sector-redesign.md`: one line.

## Checks
`npx tsc --noEmit -p .` clean; eslint on all changed files clean; vitest campusS1-S4 + laserPanels + campusRuntimeNav + detailPass + rooms: all pass (179 + 19). No A64 fix was needed.

## A64
Worst 5 at (22.25, 3.00, 24.25) facing 293 deg: #7, #9, #14, #15, #20. 10922 samples, 307 on the baskets, 5078 on the deck, 0 over 6. Histogram of best view per point: 0:1544, 1:6159, 2:1841, 3:954, 4:328, 5:96. (Samples include unreachable surfaces: pod roofs, ceiling tops.)

## M8 (longest isolated run at the takedown spot, s)
#1 0 (exception), #2 1.25 (exception), #3 9.25, #4 180, #5 0 (exc), #6 0 (exc), #7 6.25, #8 4.5, #9 9.5, #10 9.25, #11 9.25, #12 6.25, #13 6.25, #14 0 (exc), #15 0 (exc), #16 3.5, #17 4.75, #18 4.75, #19 17.5, #20 3.25.
Takedown spots: #1 (35.3, 44), #2 (34.8, 44), #3 (37, 18), #4 (5.5, 20.2), #5 (-2.1, 44.6), #6 (-0.8, 44), #7 (3.6, 23), #8 (32.7, 24), #9 (18, 33.5), #10 (0.8, 24.7), #11 (24, 24.7), #12 (-7, 20), #13 (12, 36), #14 (1, 43.5), #15 (3, 43.5), #16 (20, 45.8), #17 (31.8, 18.6), #18 (16.2, 18.6), #19 (-9, 29), #20 (-2.5, 23).

## L-numbers (assumptions / deviations)
- L1 Yard lane: the brief's handler/dog route x 37.5 / 38.5 and slot z 27 lie inside the fuel tanks (x 36..39, z 26..30) and the generator. Moved to x 35.3 (handler) and 34.8 (dog), same z; geometry unchanged.
- L2 Mantrap lid (3.0-3.1) is coplanar with the lobby ceiling slab (3.0-3.2): built as briefed, redundant.
- L3 Dock pair: end points pulled 0.3 m apart (x 31.8 / 16.2, was 31.5 / 16.5). At 15.0 m the pair saw each other at every stop (CHECK_RANGE 15), so M8 failed for #17 / #18. Now 15.6 m, stops 3.6 s. They still cross at (24, 19.5) at the same moment mid-trip (same clock, opposite ends): kept; the checker may stagger t0.
- L4 Rooms: lobby and hall are cut into rectangles around the mantrap and cage so none overlap (test 9); ground rooms get maxY 7.2 under the deck.
- L5 Group 70 lamp (-2.5, 3.6, 34) lies inside the brief's build-out box; kept. Test 8 checks the build-out as x 0..13.8 (below the deck).
- L6 Open: fuel tanks (1.6) are 0.85 m from the compound's east wall (2.8): a tank-top mantle of the wall may leave the section. Not covered by the nav-flood test.
- L7 Wall thickness: exterior and hall walls 0.3, partitions 0.2, cage 0.1; exterior walls extend 0.15 past the corners.
- L8 Takedown spots as listed above (first guess behind the post, then #8 (32.7, 24) and #16 (20, 45.8) moved by the M8 scan; #17 / #18 at their stop ends).
- L9 Repo files are CRLF (autocrlf); new files normalise on commit.
- L10 `tests/campusS2.test.ts` lines 450 and 460 (CR2 edge filters) had no z upper bound and matched B1's 0.4 slabs: added `z < 16`. Beyond the brief's count-only edit.
- L11 High route basket points z 41.3 -> 41.25 ([21.0, 18.0]): rule (c) clearance to the hall's north wall was 0.55 m.
- L12 Pair-gate test: "no route leg within 1.2 m of the pg-cage door" is applied to ground legs only (the high route's basket leg passes 0.4 m over the door at 4.4).
- L13 Sealing test shuts C3's near door, C4's far door and the yard gate on the grid before the flood (they are locked at runtime).
- L14 Nav grid for the tests spans x -28..42, z -2..50 (the C3 and C4 boxes included, for the crate and the stage softlock legs).
- L15 e2e CR4 probes: spots and run-ups are my choice (east face (5.6, 34) from 5 m east, west face (1.6, 34), P2 west-face wall jump); not run.
- L16 Door swings chosen by eye (no test).

## Skipped (log)
Co-op leg-up, jam-and-pass, the pair gate opening for two (e2e); build and e2e not run.

## Open items for the checker
L3 (dock pair crossing), L6 (tank mantle), pod roofs / ceiling tops count in the A64 samples (stricter than play), `S4_CAMERA_FLAGS` / `S4_ARMOURED` / `S4_AMMO_CRATE` are data only.
