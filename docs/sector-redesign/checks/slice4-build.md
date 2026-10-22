# Slice 4 build report - S4 data hall (builder Sonnet 5.5, in progress)

Branch `feature/sector-redesign-s4`. Resume file: a fresh agent reads this, then `docs/sector-redesign/briefs/SLICE4.md`.

## Done
- Geometry: `src/world/maps/campusS4.ts` (all boxes, lamps, switches, board, rooms, hide spots, nav seeds, laser + panel, `S4_COOP_LIPS`, test constants). Not yet checked by any test.
- Data: `src/world/maps/campusS4Data.ts` (guards, routes, sector, cameras, desks, alarms, posts, flags, armoured, ammo crate).
- Wiring: `campusSectors.ts`, `campusOps.ts` (shell + seed removed, build call, arrays, lasers, boards), `campusLips.ts`.
- `npx tsc --noEmit -p .` passes.

## Left
1. `tests/campusS4.test.ts` (13 groups in the brief), run it, fix geometry/data until green (A64 fix order in the brief).
2. Count edits: `tests/campusS2.test.ts:156` -> `5 + 7 + 9 + 8` (S4 has 8 switches); `tests/laserPanels.test.ts:123` 8 -> 9.
3. Run campusS1/S2/S3/laserPanels tests; eslint on changed files.
4. `scripts/e2e-sectorops.mjs` `campusS4Part` + `if (want(6))`; `node --check`.
5. One line in `changes/feature-sector-redesign.md`.
6. Fill in: A64 worst/histogram, M8 table, takedown spots chosen, skipped items, results.

## L-numbers (assumptions / deviations)
- L1 Yard lane: the brief's handler/dog route x 37.5 / 38.5 and slot z 27 lie inside the fuel tanks (x 36..39, z 26..30) and the generator (z 34..40). Moved to x 35.3 (handler) and x 34.8 (dog), same z; geometry unchanged.
- L2 Mantrap lid (3.0-3.1) is coplanar with the lobby ceiling slab (3.0-3.2): built as briefed, redundant.
- L3 #17 and #18 loops cross the same point (24, 19.5) at the same moment (same clock, opposite ends). Kept as briefed; checker may stagger t0.
- L4 Rooms: lobby and hall are split into rectangles around the mantrap and the cage so no rooms overlap (test 9); all ground rooms get maxY 7.2 under the deck.
- L5 Group 70 lamp (-2.5, 3.6, 34) lies inside the brief's build-out box (-4..13.8, 33..42); kept. Test 8 will check the build-out area as x 0..13.8.
- L6 Fuel tanks (1.6) sit 0.85 m from the compound's east wall (2.8): a tank-top mantle of the wall may leave the section; not covered by the nav-flood test. Open item for the checker.
- L7 Wall thickness: exterior and hall walls 0.3, partitions 0.2, cage 0.1; exterior walls extended 0.15 past the corners.
- L8 Takedown spots: first guess 0.4-0.6 behind each post (see data file); the M8 test decides, not yet run.
- L9 Files are CRLF in the repo (autocrlf); new files were written LF and normalise on commit.
