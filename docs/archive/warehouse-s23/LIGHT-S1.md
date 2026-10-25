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

## Lamps (`S1_LIGHT_PASS` in warehouseS1.ts, plus the shutter W spot and the original lamps retuned)
Lamp fix round (check-s2 polish 1): every lamp retuned so route points, takedown spots and decision points land in a band under `LIGHT.lit` (0.6, full guard visibility); levels solved from per-lamp contributions, a few positions / radii searched. The fire lobby exit sign lamp is gone (the 2 m column cap: it made 9). Circuits and the lamp count are as before (22 pass lamps, minus the sign: 21; shutter W spot unchanged).

Classes (the test): route points and takedown spots 0.40-0.55; decision points 0.45-0.55; objective and staffed work areas (DVR, desk front, reception counter, security office door) 0.55-0.80 (DVR) / 0.45-0.80; dark pockets <= 0.30. Tolerance 0.02 on every edge.

Format: (x, y, z), radius / intensity, circuit group.

| Position | r / I | Group |
| --- | --- | --- |
| (-11.65, 5.05, -11.2) | 7 / 0.785 | 30 |
| (-9.8, 3.2, -16) | 4 / 0.345 | 30 |
| (-13.3, 2.75, -7.4) | 4 / 0.868 | 31 |
| (-17.8, 5.3, -7.6) | 6.5 / 0.878 | 31 |
| (-6.3, 2.85, -15.4) | 4.5 / 0.568 | 33 |
| (-5.5, 2.65, -12.3) | 4.5 / 0.645 | 32 |
| (2.6, 4.5, -10) | 2.4 / 0.428 | 35 |
| (-5.6, 4.5, -12.3) | 2.4 / 0.428 | 32 |
| (7.4, 4.5, -9.15) | 1.8 / 0.738 | 36 |
| (6.2, 5.3, -15.2) | 3.2 / 0.895 | 34 |
| (11.5, 4, -12.5) | 5.5 / 0.492 | 36 |
| (17.5, 4, -12.5) | 6 / 0.565 | 36 |
| (22.8, 4, -11.6) | 5 / 0.601 | 36 |
| (10.4, 5.1, -9.7) | 4.2 / 0.845 | 36 |
| (14.6, 5.1, -9.7) | 4.2 / 0.453 | 36 |
| (18.8, 5.1, -9.7) | 4.2 / 0.472 | 36 |
| (22.4, 5.1, -9.7) | 4.2 / 0.36 | 36 |
| (-22.4, 3.2, -18.6) | 3 / 0.385 | 20 |
| (-22.2, 7.3, -16.8) | 4 / 0.202 | 20 |
| (5, 7.3, -14.2) | 1.9 / 0.593 | 20 |
| (-19.6, 7.3, -10.4) | 3 / 0.445 | 20 |

Original lamps retuned: bay lamp (-17.8, 5.05, -14.9) r 8 i 0.8 -> 0.62; corridor (2.4, 2.65, -13.35) r 6.2 i 1.0 -> 0.834 (z moved from -12.3 earlier); security blue i 0.85 -> 0.75; mess (5.55, 2.65, -10.25) i 0.8 -> 1.36 (moved from (4.5, -9.8)); reception lamp i 0.4 -> 0.17; yard door lamps (-5, 2.6, -18.5) i 0.8 -> 0.33 and (11, 2.6, -18.5) i 0.6 -> 0.28 (entrance and workshop doors were 0.89 and 0.72); shutter W spot i 0.8 -> 0.62.

## Levels (body level; "without" = the pass lamps off, `withNewOff`; band = the test's min-max before the 0.02 tolerance)
| Point | Without | After | Band |
| --- | --- | --- | --- |
| R1[1] (-19, -20) | 0.30 | 0.44 | 0.4-0.55 |
| R1[2] (-19, -18.9) | 0.30 | 0.47 | 0.4-0.55 |
| R1[3] (-19, -17) | 0.41 | 0.41 | 0.4-0.55 |
| R1[4] (-16, -16.2) | 0.43 | 0.43 | 0.4-0.55 |
| R1[5] (-9, -15.8) | 0.12 | 0.41 | 0.4-0.55 |
| R1[6] (-7.3, -15.8) | 0.12 | 0.48 | 0.4-0.55 |
| R1[7] (-7.2, -14.4) | 0.14 | 0.41 | 0.4-0.55 |
| R1[8] (-4.5, -14.4) | 0.23 | 0.53 | 0.4-0.55 |
| R1[9] (-4.5, -13) | 0.12 | 0.46 | 0.4-0.55 |
| R1[10] (4.4, -12.6) | 0.54 | 0.54 | 0.4-0.55 |
| R1[11] (4.4, -14.5) | 0.48 | 0.48 | 0.4-0.55 |
| R1[12] (4.8, -16) | 0.76 | 0.76 | 0.45-0.8 |
| R1[13] (4.4, -12.6) | 0.54 | 0.54 | 0.4-0.55 |
| R1[14] (-7, -12.3) | 0.12 | 0.42 | 0.4-0.55 |
| R1[15] (-9.2, -12.3) | 0.12 | 0.41 | 0.4-0.55 |
| R1[16] (-10, -10) | 0.12 | 0.47 | 0.4-0.55 |
| R1[17] (-14.5, -10) | 0.18 | 0.41 | 0.4-0.55 |
| R1[18] (-14.5, -9.4) | 0.15 | 0.49 | 0.4-0.55 |
| R1[19] (-14.5, -7.4) | 0.12 | 0.54 | 0.4-0.55 |
| R2[1] (-20.4, -19.6) | 0.30 | 0.43 | 0.4-0.55 |
| R2[2] (-22.4, -18.75) | 0.20 | 0.41 | 0.4-0.55 |
| R2[3] (-22, -17.2, 6) | 0.30 | 0.41 | 0.4-0.55 |
| R2[4] (5, -13.5, 6) | 0.30 | 0.46 | 0.4-0.55 |
| R2[5] (5, -14.9, 3.3) | 0.12 | 0.46 | 0.4-0.55 |
| R2[6] (7.4, -14.6, 3.3) | 0.12 | 0.43 | 0.4-0.55 |
| R2[7] (6.45, -16.3) | 0.41 | 0.41 | 0.4-0.55 |
| R2[8] (4.8, -16) | 0.76 | 0.76 | 0.45-0.8 |
| R2[9] (6.4, -16.5) | 0.41 | 0.41 | 0.4-0.55 |
| R2[10] (7.4, -14.6, 3.3) | 0.12 | 0.43 | 0.4-0.55 |
| R2[11] (5, -14.9, 3.3) | 0.12 | 0.46 | 0.4-0.55 |
| R2[12] (5, -13.5, 6) | 0.30 | 0.46 | 0.4-0.55 |
| R2[13] (-20, -9.6, 6) | 0.30 | 0.41 | 0.4-0.55 |
| R2[14] (-20, -7.4, 3.2) | 0.12 | 0.41 | 0.4-0.55 |
| R2[15] (-15.5, -8.4, 3.2) | 0.13 | 0.44 | 0.4-0.55 |
| R2[16] (-14.5, -9.6) | 0.16 | 0.45 | 0.4-0.55 |
| R2[17] (-14.5, -7.4) | 0.12 | 0.54 | 0.4-0.55 |
| R3[3] (9.5, -19.2) | 0.40 | 0.40 | 0.4-0.55 |
| R3[4] (11, -18.9) | 0.55 | 0.55 | 0.4-0.55 |
| R3[5] (11, -17.2) | 0.42 | 0.43 | 0.4-0.55 |
| R3[6] (22.6, -12) | 0.12 | 0.50 | 0.4-0.55 |
| R3[7] (23.3, -10.4) | 0.12 | 0.41 | 0.4-0.55 |
| R3[8] (22.6, -9.55, 3) | 0.12 | 0.46 | 0.4-0.55 |
| R3[9] (8.6, -9.55, 3) | 0.12 | 0.46 | 0.4-0.55 |
| R3[10] (7, -9.6, 3) | 0.05 | 0.41 | 0.4-0.55 |
| R3[11] (2.6, -9.95, 3) | 0.05 | 0.46 | 0.4-0.55 |
| R3[12] (2.6, -10.2) | 0.44 | 0.44 | 0.4-0.55 |
| R3[13] (2.5, -11.6) | 0.54 | 0.54 | 0.4-0.55 |
| R3[14] (4.4, -12.6) | 0.54 | 0.54 | 0.4-0.55 |
| R3[15] (4.4, -14.5) | 0.48 | 0.48 | 0.4-0.55 |
| R3[16] (4.8, -16) | 0.76 | 0.76 | 0.45-0.8 |
| R3[17] (4.4, -12.6) | 0.54 | 0.54 | 0.4-0.55 |
| R3[18] (-7, -12.3) | 0.12 | 0.42 | 0.4-0.55 |
| R3[19] (-9.2, -12.3) | 0.12 | 0.41 | 0.4-0.55 |
| R3[20] (-11, -10) | 0.12 | 0.53 | 0.4-0.55 |
| R3[21] (-14.5, -9.6) | 0.16 | 0.45 | 0.4-0.55 |
| R3[22] (-14.5, -7.4) | 0.12 | 0.54 | 0.4-0.55 |
| takedown 1 officer | 0.41 | 0.41 | 0.4-0.55 |
| takedown 2 runner | 0.40 | 0.40 | 0.4-0.55 |
| takedown 3 officer | 0.14 | 0.41 | 0.4-0.55 |
| takedown 4 officer | 0.41 | 0.41 | 0.4-0.55 |
| takedown 5 grunt | 0.12 | 0.41 | 0.4-0.55 |
| objective: the DVR | 0.61 | 0.61 | 0.55-0.8 |
| objective: the DVR desk front | 0.72 | 0.72 | 0.45-0.8 |
| connector: C2 near door | 0.12 | 0.46 | 0.45-0.55 |
| connector: C2 far door | 0.13 | 0.45 | 0.45-0.55 |
| connector: C2 checkpoint | 0.12 | 0.54 | 0.45-0.55 |
| entry: shutter W crawl gap | 0.30 | 0.46 | 0.45-0.55 |
| entry: the entrance door | 0.54 | 0.54 | 0.45-0.55 |
| entry: the workshop door | 0.50 | 0.50 | 0.45-0.55 |
| bay: the wrapper | 0.41 | 0.49 | 0.4-0.55 |
| bay: the east lane | 0.14 | 0.55 | 0.4-0.55 |
| reception: the counter | 0.24 | 0.46 | 0.45-0.8 |
| corridor: west end (door shut) | 0.12 | 0.41 | 0.4-0.55 |
| corridor: middle | 0.39 | 0.39 | 0.4-0.55 |
| security office door | 0.65 | 0.65 | 0.45-0.8 |
| drainpipe base | 0.20 | 0.41 | 0.4-0.55 |
| roof: the hatch | 0.30 | 0.46 | 0.45-0.55 |
| roof: the pipe top | 0.30 | 0.41 | 0.4-0.55 |
| plant deck: the middle | 0.12 | 0.46 | 0.45-0.55 |
| workshop: the bench | 0.12 | 0.41 | 0.4-0.55 |
| workshop: the lathe | 0.12 | 0.41 | 0.4-0.55 |
| crane walkway: east end | 0.12 | 0.46 | 0.45-0.55 |
| crane walkway: middle | 0.12 | 0.41 | 0.4-0.55 |
| crane walkway: west end | 0.12 | 0.46 | 0.45-0.55 |
| void: opening over the corridor (h1) | 0.05 | 0.46 | 0.45-0.55 |
| void: opening over the mess (h2) | 0.05 | 0.46 | 0.45-0.55 |
| void: the catwalk opening | 0.05 | 0.54 | 0.45-0.55 |
| mess: under the hatch | 0.45 | 0.45 | 0.45-0.55 |
| lobby roof: the storage | 0.12 | 0.41 | 0.4-0.55 |
| lobby roof: the vent | 0.13 | 0.44 | 0.4-0.55 |
| spawn corner | 0.20 | 0.20 | dark <= 0.3 |
| spawn corner W | 0.20 | 0.20 | dark <= 0.3 |
| spawn corner E | 0.20 | 0.20 | dark <= 0.3 |
| trailer lane W | 0.20 | 0.20 | dark <= 0.3 |
| trailer lane E | 0.20 | 0.20 | dark <= 0.3 |
| hide spot behind the skip | 0.30 | 0.30 | dark <= 0.3 |
| hide spot at the charger | 0.12 | 0.12 | dark <= 0.3 |
| takedown 6 smoker shelter | 0.20 | 0.20 | dark <= 0.3 |
| takedown 7 clerk corner | 0.26 | 0.26 | dark <= 0.3 |
| takedown 8 east corridor end | 0.19 | 0.19 | dark <= 0.3 |
R1/R2/R3 are the section's three routes (`[i]` the waypoint index, `(x, z[, y])`). The last point of each route repeats the same spot.

## Dark pockets (stay dark: <= 0.30, and at most +0.05 over without the pass)
Spawn corner (3 spawns), the lane behind the trailer, the hide spot behind the skip (0.30, the open-sky level), the hide spot at the charger corner (0.12), takedown 6 (the smoker's shelter, 0.20), takedown 7 (the clerk's corner, 0.26) and takedown 8 (the east corridor end, 0.12 -> 0.23).
Takedown spots 1 to 5 are not dark pockets: 1 and 2 sit in the lit yard by the gate and the entrance (0.40-0.41 after the lamp fix round), 3, 4 and 5 are on or beside the routes' own waypoints (the east lane, the mess hatch, the forklift lane), which Michael wants readable; their isolation comes from sight lines and timing (M8, `sectors.test.ts`), not from darkness.

## Files
- `src/world/maps/warehouseS1.ts`: `S1_LIGHT_PASS` (new), the shutter W spot, the two adjusted lamps.
- `tests/warehouseS1Light.test.ts` (new; lamp fix round: a maximum per class, tolerance 0.02, `hyp2`; the unchanged-sections test also skips (-15, -5), inside the open C2 far door's span): must-see points, dark pockets, sections 2 and 3 unchanged, column cap, lamp top. Bakes in about 5 s. `WH1LIGHT_PRINT=<file>` writes the table.

## Results
`npx tsc --noEmit` clean; ESLint on both files clean; Vitest `warehouseS1Light`, `sectors`, `sectorStep3`, `rooms`, `voxelFit`, `lampBake`: 6 files, 65 tests passed. No build, e2e or GPU shot run.

## What Michael should look at (pending PC run)
- Walk R1 with NV off: the crawl, bay, reception, corridor and DVR should now read. Check the look is lamps in pools with dark between (yard corners and lane, east corridor end, charger corner) and not flat.
- The meter vs the screen at a few spots (the calibration gap from course-ready: 0.30 reads mid on the meter but renders near black; the route points now sit at 0.40-0.55, under the 0.6 where a guard sees a player fully).
- Switch circuits 30, 32, 34 off at the wall switches: the new lamps on those circuits go dark with them (parity holds, the pocket gets darker).
- The roof masts, void lamps and catwalk lamps are new visible fixtures; polish list: the monitor glow, the exit sign (dropped in the lamp fix round: the 2 m column cap).
