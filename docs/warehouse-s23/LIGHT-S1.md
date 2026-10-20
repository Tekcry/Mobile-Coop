# Warehouse S1 lamp pass (warehouse-s23, Michael M1)

Michael: "Its hard to tell, the night vision is so poor. I cant see properly at night". Night vision is untouched. Section 1
(`src/world/maps/warehouseS1.ts`) gets lamps so its routes, objective and decision points read without NV. Sections 2, 3 and the
plain Warehouse are unchanged (a test pins sections 2 and 3: levels identical with the new lamps on and off).

## Method
- Light parity: every lamp is a registry light (`b.light`, baked) through the same `lamp` helper as the rest of section 1, with a
  fixture box and a circuit group. The test bakes the real `warehouseOps` field the way `World.create` does (as `ctcourseLight.test.ts`).
- Levels are `bodyLevel` (standing 1.7 m body, feet at the point's y). Readable on screen is >= 0.40 (the dark curve, course-ready
  LIGHT.md); decision points and objective >= 0.45 (Marlow Yard's panel and pad minimum), the DVR >= 0.55; dark pockets <= 0.30 (the open-sky level).
- Data-driven: every waypoint of the three routes in `WAREHOUSE_SECTORS[0]` (`pts`), the objective, the connector (`nearAt`, `farAt`,
  `checkpoint`) and the guards' `takedownSpot`s are read from the data; the extras are named in the test.

## Lamps added (`S1_LIGHT_PASS` in warehouseS1.ts, plus the shutter W spot): 24 new (23 in the table plus the shutter W spot), 2 existing adjusted
Format: (x, y, z) radius / intensity, circuit group.

| Fixture | Position | r / I | Group |
| --- | --- | --- | --- |
| Yard floodlight over shutter W (spot, cone like E) | (-19, 5.6, -18.6) | 5.2 / 0.8 | 20 |
| Drainpipe wall lamp | (-22.4, 3.2, -18.6) | 3 / 0.6 | 20 |
| Bay high-bay, east lane and wrapper | (-12.5, 5.05, -12.0) | 8 / 0.9 | 30 |
| Reception bay-door lamp | (-9.0, 3.2, -16.0) | 3.5 / 0.7 | 30 |
| Fire lobby C2 ceiling panel | (-14.5, 2.75, -7.4) | 3.5 / 0.8 | 31 |
| Fire lobby exit sign (green, far door) | (-14.5, 2.6, -6.3) | 2.5 / 0.4 | 33 |
| Lobby-block roof space (storage, vent) | (-17.8, 5.3, -7.6) | 6.5 / 1.0 | 31 |
| Reception ceiling panel | (-6.3, 2.85, -15.4) | 4.5 / 0.7 | 33 |
| Corridor west end | (-5.5, 2.65, -12.3) | 4.5 / 0.7 | 32 |
| Mess hatch lamp | (2.6, 2.65, -9.9) | 3 / 0.8 | 35 |
| Void lamps in the crawl: over h2, over h1, catwalk opening | (2.6, 4.5, -10.0) / (-5.6, 4.5, -12.3) / (7.4, 4.5, -9.6) | 2.4 / 0.7, 2.4 / 0.7, 1.8 / 1.0 | 35 / 32 / 36 |
| Plant deck lamp | (6.2, 5.3, -15.2) | 3.2 / 1.0 | 34 |
| Workshop pendants under the crane runway | (11.5, 4.0, -12.5) / (17.5, 4.0, -12.5) / (22.8, 4.0, -11.6) | 5.5, 6, 5 / 1.0 | 36 |
| Catwalk lamps (y 5.1, over the walkway) | x 10.4, 14.6, 18.8, 22.4 at (x, 5.1, -9.7) | 4.2 / 1.2 | 36 |
| Roof masts: pipe top, hatch, smoke vent | (-22.2, 7.3, -16.8) / (5.0, 7.3, -14.2) / (-19.6, 7.3, -10.4) | 4, 1.9, 3 / 0.8 | 20 |

Existing lamps adjusted: corridor (0, 2.65, -12.3) r 6 i 0.8 -> (2.5, 2.65, -12.3) r 6.2 i 1.0 (lights the junction at the security door, east end stays dark); security blue (4.8, 2.85, -15.8) r 4 i 0.7 -> r 4.5 i 0.85 (the cabinet under the ceiling hatch). The security monitor-glow lamp was dropped: the column cap (below) had no room, and the existing blue lamp already holds the DVR at 0.85.

Constraints met: no 2 m column lists more than 8 lamps (`LAMP_GRID_SLOTS`; the office block was at 13 before trimming radii and merging); every lamp y + 0.2 under the bake box top (y 9). Lamps that light upward do not exist: a lamp lights below itself only, so the void, deck and roof points have their own lamps above them.

## Levels (body level; master = before the pass, from the master field; * = lamp pass off but the two adjusted lamps on)
| Point | Before | After | Pinned |
| --- | --- | --- | --- |
| R1[1] (-19, -20) | 0.30 | 0.48 | >= 0.4 |
| R1[2] (-19, -18.9) | 0.30 | 0.52 | >= 0.4 |
| R1[3] (-19, -17) | 0.42 | 0.42 | >= 0.4 |
| R1[4] (-16, -16.2) | 0.32 | 0.43 | >= 0.4 |
| R1[5] (-9, -15.8) | 0.12 | 0.71 | >= 0.4 |
| R1[6] (-7.3, -15.8) | 0.12 | 0.53 | >= 0.4 |
| R1[7] (-7.2, -14.4) | 0.16 | 0.50 | >= 0.4 |
| R1[8] (-4.5, -14.4) | 0.37 | 0.69 | >= 0.4 |
| R1[9] (-4.5, -13) | 0.18 | 0.49 | >= 0.4 |
| R1[10] (4.4, -12.6) | 0.22 | 0.67 | >= 0.4 |
| R1[11] (4.4, -14.5) | 0.43 | 0.53 | >= 0.4 |
| R1[12] (4.8, -16) | 0.69 | 0.85 | >= 0.45 |
| R1[13] (4.4, -12.6) | 0.22 | 0.67 | >= 0.4 |
| R1[14] (-7, -12.3) | 0.12 | 0.47 | >= 0.4 |
| R1[15] (-9.2, -12.3) | 0.12 | 0.45 | >= 0.4 |
| R1[16] (-10, -10) | 0.12 | 0.45 | >= 0.4 |
| R1[17] (-14.5, -10) | 0.12 | 0.50 | >= 0.4 |
| R1[18] (-14.5, -9.4) | 0.12 | 0.57 | >= 0.4 |
| R1[19] (-14.5, -7.4) | 0.12 | 0.90 | >= 0.4 |
| R2[1] (-20.4, -19.6) | 0.30 | 0.48 | >= 0.4 |
| R2[2] (-22.4, -18.75) | 0.20 | 0.53 | >= 0.4 |
| R2[3] (-22, -17.2, 6) | 0.30 | 0.74 | >= 0.4 |
| R2[4] (5, -13.5, 6) | 0.30 | 0.52 | >= 0.4 |
| R2[5] (5, -14.9, 3.3) | 0.12 | 0.50 | >= 0.4 |
| R2[6] (7.4, -14.6, 3.3) | 0.12 | 0.46 | >= 0.4 |
| R2[7] (6.45, -16.3) | 0.35 | 0.45 | >= 0.4 |
| R2[8] (4.8, -16) | 0.69 | 0.85 | >= 0.45 |
| R2[9] (6.4, -16.5) | 0.35 | 0.44 | >= 0.4 |
| R2[10] (7.4, -14.6, 3.3) | 0.12 | 0.46 | >= 0.4 |
| R2[11] (5, -14.9, 3.3) | 0.12 | 0.50 | >= 0.4 |
| R2[12] (5, -13.5, 6) | 0.30 | 0.52 | >= 0.4 |
| R2[13] (-20, -9.6, 6) | 0.30 | 0.50 | >= 0.4 |
| R2[14] (-20, -7.4, 3.2) | 0.12 | 0.45 | >= 0.4 |
| R2[15] (-15.5, -8.4, 3.2) | 0.12 | 0.49 | >= 0.4 |
| R2[16] (-14.5, -9.6) | 0.12 | 0.55 | >= 0.4 |
| R2[17] (-14.5, -7.4) | 0.12 | 0.90 | >= 0.4 |
| R3[3] (9.5, -19.2) | 0.52 | 0.52 | >= 0.4 |
| R3[4] (11, -18.9) | 0.81 | 0.81 | >= 0.4 |
| R3[5] (11, -17.2) | 0.42 | 0.44 | >= 0.4 |
| R3[6] (22.6, -12) | 0.12 | 0.76 | >= 0.4 |
| R3[7] (23.3, -10.4) | 0.12 | 0.60 | >= 0.4 |
| R3[8] (22.6, -9.55, 3) | 0.12 | 1.00 | >= 0.4 |
| R3[9] (8.6, -9.55, 3) | 0.12 | 0.62 | >= 0.4 |
| R3[10] (7, -9.6, 3) | 0.05 | 0.72 | >= 0.4 |
| R3[11] (2.6, -9.95, 3) | 0.05 | 0.72 | >= 0.4 |
| R3[12] (2.6, -10.2) | 0.35 | 1.00 | >= 0.4 |
| R3[13] (2.5, -11.6) | 0.37 | 1.00 | >= 0.4 |
| R3[14] (4.4, -12.6) | 0.22 | 0.67 | >= 0.4 |
| R3[15] (4.4, -14.5) | 0.43 | 0.53 | >= 0.4 |
| R3[16] (4.8, -16) | 0.69 | 0.85 | >= 0.45 |
| R3[17] (4.4, -12.6) | 0.22 | 0.67 | >= 0.4 |
| R3[18] (-7, -12.3) | 0.12 | 0.47 | >= 0.4 |
| R3[19] (-9.2, -12.3) | 0.12 | 0.45 | >= 0.4 |
| R3[20] (-11, -10) | 0.12 | 0.53 | >= 0.4 |
| R3[21] (-14.5, -9.6) | 0.12 | 0.55 | >= 0.4 |
| R3[22] (-14.5, -7.4) | 0.12 | 0.90 | >= 0.4 |
| objective: the DVR | 0.67* | 0.67 | >= 0.55 |
| objective: the DVR desk front | 0.80* | 0.80 | >= 0.45 |
| connector: C2 near door | 0.12 | 0.69 | >= 0.45 |
| connector: C2 far door | 0.16 | 0.83 | >= 0.45 |
| connector: C2 checkpoint | 0.12 | 0.92 | >= 0.45 |
| entry: shutter W crawl gap | 0.34 | 0.50 | >= 0.45 |
| entry: the entrance door | 0.89* | 0.89 | >= 0.45 |
| entry: the workshop door | 0.72* | 0.72 | >= 0.45 |
| bay: the wrapper | 0.35 | 0.62 | >= 0.4 |
| bay: the east lane | 0.12 | 0.67 | >= 0.4 |
| reception: the counter | 0.40* | 0.68 | >= 0.45 |
| corridor: west end (door shut) | 0.12 | 0.44 | >= 0.4 |
| corridor: middle | 0.46* | 0.46 | >= 0.4 |
| security office door | 0.70* | 0.70 | >= 0.45 |
| drainpipe base | 0.20 | 0.53 | >= 0.4 |
| roof: the hatch | 0.30 | 0.52 | >= 0.45 |
| roof: the pipe top | 0.30 | 0.74 | >= 0.4 |
| plant deck: the middle | 0.12 | 0.50 | >= 0.45 |
| workshop: the bench | 0.12 | 0.70 | >= 0.4 |
| workshop: the lathe | 0.12 | 0.64 | >= 0.4 |
| crane walkway: east end | 0.12 | 1.00 | >= 0.45 |
| crane walkway: middle | 0.12 | 0.89 | >= 0.4 |
| crane walkway: west end | 0.12 | 0.62 | >= 0.45 |
| void: opening over the corridor (h1) | 0.05 | 0.72 | >= 0.45 |
| void: opening over the mess (h2) | 0.05 | 0.72 | >= 0.45 |
| void: the catwalk opening | 0.05 | 0.99 | >= 0.45 |
| mess: under the hatch | 0.79 | 1.00 | >= 0.45 |
| lobby roof: the storage | 0.12 | 0.45 | >= 0.4 |
| lobby roof: the vent | 0.12 | 0.49 | >= 0.4 |
| spawn corner | 0.20 | 0.20 | dark <= 0.3 |
| spawn corner W | 0.20 | 0.20 | dark <= 0.3 |
| spawn corner E | 0.20 | 0.20 | dark <= 0.3 |
| trailer lane W | 0.20 | 0.20 | dark <= 0.3 |
| trailer lane E | 0.20 | 0.20 | dark <= 0.3 |
| hide spot behind the skip | 0.30 | 0.30 | dark <= 0.3 |
| hide spot at the charger | 0.12 | 0.12 | dark <= 0.3 |
| takedown 6 smoker shelter | 0.20 | 0.20 | dark <= 0.3 |
| takedown 7 clerk corner | 0.26 | 0.26 | dark <= 0.3 |
| takedown 8 east corridor end | 0.21 | 0.23 | dark <= 0.3 |
R1/R2/R3 are the section's three routes (`[i]` the waypoint index, `(x, z[, y])`); R*[0] and R3[1], R3[2] are the pockets, not listed. The first and last lines of each route repeat the same spot.

## Dark pockets (stay dark: <= 0.30, and at most +0.05 over without the pass)
Spawn corner (3 spawns), the lane behind the trailer, the hide spot behind the skip (0.30, the open-sky level), the hide spot at the charger corner (0.12), takedown 6 (the smoker's shelter, 0.20), takedown 7 (the clerk's corner, 0.26) and takedown 8 (the east corridor end, 0.12 -> 0.23).
Takedown spots 1 to 5 are not dark pockets: 1 and 2 sit in the lit yard by the gate and the entrance (0.41, 0.57 on master), 3, 4 and 5 are on or beside the routes' own waypoints (the east lane, the mess hatch, the forklift lane), which Michael wants readable; their isolation comes from sight lines and timing (M8, `sectors.test.ts`), not from darkness.

## Files
- `src/world/maps/warehouseS1.ts`: `S1_LIGHT_PASS` (new), the shutter W spot, the two adjusted lamps.
- `tests/warehouseS1Light.test.ts` (new): must-see points, dark pockets, sections 2 and 3 unchanged, column cap, lamp top. Bakes in about 5 s. `WH1LIGHT_PRINT=<file>` writes the table.

## Results
`npx tsc --noEmit` clean; ESLint on both files clean; Vitest `warehouseS1Light`, `sectors`, `sectorStep3`, `rooms`, `voxelFit`, `lampBake`: 6 files, 65 tests passed. No build, e2e or GPU shot run.

## What Michael should look at (pending PC run)
- Walk R1 with NV off: the crawl, bay, reception, corridor and DVR should now read. Check the look is lamps in pools with dark between (yard corners and lane, east corridor end, charger corner) and not flat.
- The meter vs the screen at a few spots (the calibration gap from course-ready: 0.30 reads mid on the meter but renders near black; the new points sit at 0.45-1.0).
- Switch circuits 30, 32, 34 off at the wall switches: the new lamps on those circuits go dark with them (parity holds, the pocket gets darker).
- The roof masts, void lamps and catwalk lamps are new visible fixtures; polish list: the monitor glow, the exit sign look.
