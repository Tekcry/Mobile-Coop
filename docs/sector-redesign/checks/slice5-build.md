# Slice 5 build report (S5 Old House) - builder Sonnet 5.5

Branch `feature/sector-redesign-s5`, worktree `C:/NightShift/Mobile-Coop-sector-redesign-s5`. Brief: `briefs/SLICE5.md`.
Resume note: python is not installed here; edit files with the Edit tool.

## Done (committed)
- `src/world/maps/campusS5.ts`: geometry, lamps, switches, board, laser and panel, rooms, hide spots, nav seeds, test
  constants (written, NOT yet type-checked or run).
- `src/world/maps/campusS5Data.ts`: guards, routes, sector, cameras, alarms, posts, camera flags, armoured, ammo crate
  (written, NOT yet type-checked or run).

## Left (in order)
1. Edit `campusSectors.ts` (import `S5_ALARMS, S5_CAMERAS, S5_POSTS, S5_SECTOR` from `./campusS5Data`; `...S5_POSTS` in
   `CAMPUS_POSTS`; `'s5-l1': 4.2` in `levels`; `...S5_CAMERAS` in devices; `...S5_ALARMS` in `CAMPUS_ALARMS`; replace the
   `id: 's5'` stub entry with `S5_SECTOR`).
2. Edit `campusOps.ts` per brief (delete S5 shell line and `(-46, 0, 33)` seed; `buildCampusS5(b)` after S3; arrays;
   lasers/panels; `boards`). Note the C4 far door (-26, 29) is now built by `buildCampusS5` (swing -1).
3. `npx tsc --noEmit -p .`, then write `tests/campusS5.test.ts` (brief list 1-13, plus a runtimeNav leg test), fix
   geometry / data until green. Edit counts: `tests/campusS2.test.ts:156` -> `5 + 7 + 9 + 9`; `tests/laserPanels.test.ts:123` 8 -> 9.
4. e2e block `campusS5Part` in `scripts/e2e-sectorops.mjs` (`node --check`), changelog line, eslint.

## L-numbers
- L1: the core has 4 flights (floors [0, 4.2, 8.4] = two storeys), not the six the brief's test item 6 names; test asserts 4, rise 2.1.
- L2: core doors are at plan (-35, 38.1) (S2's wall centre line), the brief says 38.0.
- L3: kitchen counter shortened to z 34..38 (the brief's z 34..42 blocks the board at z 40, which fails `nearNav`).
- L4: analyticNav rect widened to x -16 so the start (-18, 29) is inside.
- L5: takedown spots and route-guard yaws are my picks (0.5 m behind the post); M8 test decides.
- L6: anteroom has no audit table (as brief).
- L7: `tests/campusS1.test.ts` / e2e part-6 line 1612 assert S5 has no guards (`slice(3).every guards 0`); e2e line is earlier code, not touched: the lead fixes it at merge.
- L8: lake not modelled.
