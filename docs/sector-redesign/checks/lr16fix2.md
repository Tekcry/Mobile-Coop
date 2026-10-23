# LR16 fix 2: two red unit tests on the LR16 train entry

Base: `origin/feature/sector-redesign-lr16-entry` at 87bd1c5b. Branch `feature/sector-redesign-lr16fix2`.

## 1. `tests/editor/lamps.test.ts` "a 900 lm downlight is the Warehouse office ceiling lamp (the calibration point)"

- Cause: the test pins the calibration lamp by its source text, `x: 21.45, y: 2.45, z: -22.9, radius: 4, intensity: 0.7`
  in `src/world/maps/warehouse.ts`. LR16d (0cdee9f1, `lr16d-warehouse-build.md`, warehouse row 0) slid that lamp (the
  gatehouse door lamp, warehouse.ts:414) x 21.45 -> 20.6 off the gatehouse face. Its drop (y 2.45), radius 4 and intensity
  0.7 are unchanged.
- The catalogue's maths (`lightParams`, facts light.calRadius / calIntensity) is calibrated on the radius and intensity,
  not the x. The test still checks the lamp's real values and the same-floor-light equality.
- Fix: the regex now reads `x: 20\.6`, with the reason in a comment. No map lamp data changed.

## 2. `tests/laserPanels.test.ts` panel-workshop "hidden from the floor round its band"

- Cause: the floor spot (23.4, 0, -13.6) now has a clear jam line to the panel. Two things combine:
  - The leak is old. Master has the same slit. The catwalk deck's south edge (z -10.15) met the void east wall's north end
    (z -10.15) at x 8. That left a corner over the catwalk opening's sill (y 3.0) where a floor eye's line passes 3-7 cm
    above the sill and under 1 cm past the wall end. A 0.1 m scan of the test's region on master finds 30 free floor spots
    with a clear line, nearest d 18.66 m (inside `JAMMER.range` 20). The test's 0.5 m grid missed all of them.
  - LR16-W S1 moved R3[6] from (22.6, -12) to (23.4, -12.4). The dressing scatter's `ROUTE_CLEAR` (1.5 m) then moved the
    workshop carton (`warehouseDress.ts` scatter, 1.0 x 0.8 x 0.8) from (23.5, -14) to (18.5, -12). The carton stood on
    the grid spot (23.4, -13.6), so the test skipped it as blocked. With the carton gone, the spot is free floor (62 spots
    at 0.1 m, one on the grid).
- No occluder was lost. The carton blocked the floor spot, not the line. The real break, a panel jammable from the workshop
  floor at 18.7-20 m, was already on master, so a test-only fix would hide it.
- Fix (map, one line, `src/world/maps/warehouseS1.ts:275`): the void east wall box grows 0.15 m north, from
  `b.box(8, 3.8, -11.975, T, 2.0, 3.65, WALL)` to `b.box(8, 3.8, -11.9, T, 2.0, 3.8, WALL)`. The catwalk opening becomes
  z -10.0 to -8.95 (1.05 m), a south door jamb. The sill and cap boxes are unchanged. R3 walks the opening at z -9.55 /
  -9.6, 0.4 m off the new jamb. The catwalk jam vantage (10.5, 3.0, -9.55) crosses x 8 at z -9.39, so it still reaches
  the panel.
- Check: the same 0.1 m scan after the fix finds 0 spots. A 0.1 m jamb left 2 spots at d 20.5 (out of range), so 0.15 m
  was used.

## Tests (single files, `--maxWorkers=2`, slot lock)

| File | Result |
|---|---|
| tests/editor/lamps.test.ts | 14 passed |
| tests/laserPanels.test.ts | 17 passed |
| tests/warehouseS1Light.test.ts | 11 passed, 1 skipped (env print) |
| tests/warehouseS2Light.test.ts | 10 passed, 1 skipped (env print) |
| tests/warehouseS3Light.test.ts | 10 passed, 1 skipped (env print) |
| tests/warehouseLamps.test.ts | 12 passed |
| tests/sectors.test.ts | 27 passed |
| tests/lampBoxAlign.test.ts | 6 passed |
| tests/warehouseDress.test.ts | 7 passed |
| tests/warehouseCoopS1.test.ts | 12 passed |
| tests/navClosure.test.ts | 5 passed |

`npx tsc --noEmit` clean. `npm run lint`: 0 errors (42 warnings, all existing).

No wire, PROTOCOL or save change. No e2e, build or full vitest (per brief).
