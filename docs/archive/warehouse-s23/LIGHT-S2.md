# Warehouse S2 lamp pass (warehouse-s23, Michael M1)

Same method as `LIGHT-S1.md`: real registry lamps (baked, light parity, circuits 40 / 41 on the two wall switches, 42 the signs),
the test `tests/warehouseS2Light.test.ts` bakes the real `warehouseOps` field and pins levels. Levels are `bodyLevel` (standing 1.7 m
body). Readable >= 0.40; decision points, the cage gate and the objective area >= 0.45; the case >= 0.55; pockets <= 0.30 and at most
+0.05 over the level without the pass. A route point on a sprinkler main (y 5.0) is a grip: the body hangs 2.0 m under it, so the test
reads the feet at y 3.0. The route data is read from `WAREHOUSE_SECTORS[1]`.

## Lamps (`S2_LIGHT_PASS` in warehouseS2.ts): 23
Lamp fix round (check-s2 polish 1): the sheet's pendants and rack-top lamps lowered and moved so route points and takedown spots land 0.40-0.55 (under `LIGHT.lit`), decision points 0.45-0.55, the case, the cage floor, the issue desk and the cage officer's desk (staffed work areas) 0.45-0.80, the aisle and lane samples 0.40-0.55 (0.02 tolerance on every edge). Intensities solved from per-lamp contributions, positions of nine lamps searched (<= 0.9 m); lamp count and circuits (40 / 41, 42 signs) as before. The sheet's lane work lamp at y 3.0 stays (a lamp lights only what is below it, with a cosine cone; the visual roof strips are light shapes).

| Position | r / I | Group |
| --- | --- | --- |
| (-17.7, 3, -4.6) | 7 / 0.548 | 40 |
| (-18.2, 2.6, 17.4) | 5.2 / 0.768 | 41 |
| (-23.6, 2.4, 5.5) | 3 / 0.43 | 42 |
| (-4.6, 2.4, 14.55) | 3 / 0.25 | 42 |
| (-4.6, 1.8, -5.2) | 0.65 / 0.155 | 42 |
| (-21.4, 3, -3.8) | 4.5 / 0.561 | 40 |
| (-12.6, 2.6, -3.6) | 3.6 / 1.07 | 40 |
| (-20.8, 3, 3.3) | 5 / 0.562 | 40 |
| (-22.7, 3, 8.1) | 5 / 0.493 | 40 |
| (-15.8, 3, 5.5) | 6 / 0.46 | 40 |
| (-17.3, 3, 12) | 4.5 / 0.845 | 40 |
| (-12.6, 3, 3) | 5 / 1.103 | 40 |
| (-12, 3, 12.7) | 5 / 0.929 | 40 |
| (-6.3, 3, 8) | 5.5 / 0.928 | 40 |
| (-8.4, 3, 16.4) | 5.5 / 0.648 | 41 |
| (-22.5, 3.2, 13.8) | 5.5 / 0.648 | 41 |
| (-21.8, 2.7, 15) | 2.4 / 0.268 | 41 |
| (-14, 5.8, 9) | 5 / 0.936 | 40 |
| (-19.1, 5.8, 10.5) | 5.5 / 0.503 | 40 |
| (-19.5, 5.8, 14.1) | 4 / 0.676 | 41 |
| (-23.6, 5.8, 9.2) | 5.4 / 1.171 | 40 |
| (-7.2, 5.8, 7.6) | 5 / 0.496 | 40 |
| (-7, 5.8, 14.4) | 5.5 / 0.578 | 41 |

## Levels (before = the section 2 lamps off, the section 1 and 3 lamps and the building ambient as they were)
| Point | Before | After | Band |
| --- | --- | --- | --- |
| R1[0] (-14.5, -7.2) | 0.54 | 0.54 | 0.4-0.55 |
| R1[1] (-14.5, -5.4) | 0.29 | 0.54 | 0.4-0.55 |
| R1[2] (-22.1, -5.4) | 0.12 | 0.41 | 0.4-0.55 |
| R1[3] (-22.2, -3.6) | 0.12 | 0.53 | 0.4-0.55 |
| R1[4] (-22.4, 11.2) | 0.12 | 0.40 | 0.4-0.55 |
| R1[5] (-22.4, 12.7) | 0.12 | 0.54 | 0.4-0.55 |
| R1[6] (-22.1, 15) | 0.12 | 0.69 | 0.45-0.8 |
| R1[7] (-22.4, 12.7) | 0.12 | 0.54 | 0.4-0.55 |
| R1[8] (-22.4, 11.2) | 0.12 | 0.40 | 0.4-0.55 |
| R1[9] (-21.6, 5.5) | 0.12 | 0.45 | 0.4-0.55 |
| R1[10] (-12, 5.5) | 0.12 | 0.48 | 0.4-0.55 |
| R1[11] (-12, 15.5) | 0.12 | 0.41 | 0.4-0.55 |
| R1[12] (-5.2, 15.5) | 0.12 | 0.41 | 0.4-0.55 |
| R1[13] (-4.8, 14.55) | 0.29 | 0.54 | 0.4-0.55 |
| R1[14] (-1, 15) | 0.79 | 0.79 | 0.4-0.85 |
| R2[0] (-14.5, -7.2) | 0.54 | 0.54 | 0.4-0.55 |
| R2[1] (-14.5, -5.4) | 0.29 | 0.54 | 0.4-0.55 |
| R2[2] (-12, -5.4) | 0.12 | 0.41 | 0.4-0.55 |
| R2[3] (-12, 5.8) | 0.12 | 0.42 | 0.4-0.55 |
| R2[4] (-14.65, 6.3) | 0.12 | 0.47 | 0.4-0.55 |
| R2[5] (-14.65, 7.6, 4) | 0.12 | 0.45 | 0.4-0.55 |
| R2[6] (-14.9, 10, 4) | 0.12 | 0.53 | 0.4-0.55 |
| R2[7] (-18.3, 10, 4) | 0.12 | 0.42 | 0.4-0.55 |
| R2[8] (-18.75, 13.5, 4) | 0.12 | 0.54 | 0.4-0.55 |
| R2[9] (-20.4, 13.5) | 0.16 | 0.41 | 0.4-0.55 |
| R2[10] (-22.1, 15) | 0.12 | 0.69 | 0.45-0.8 |
| R2[11] (-22.6, 12.8) | 0.12 | 0.56 | 0.4-0.55 |
| R2[12] (-23.45, 12.7) | 0.12 | 0.47 | 0.4-0.55 |
| R2[13] (-23.45, 11.4, 4) | 0.12 | 0.41 | 0.4-0.55 |
| R2[14] (-23.45, 7.4, 4) | 0.12 | 0.48 | 0.4-0.55 |
| R2[15] (-23.45, 6.4, 5) | 0.12 | 0.41 | 0.4-0.55 |
| R2[16] (-6.2, 6.4, 5) | 0.19 | 0.41 | 0.4-0.55 |
| R2[17] (-6, 15.2, 5) | 0.12 | 0.46 | 0.4-0.55 |
| R2[18] (-6, 15.2) | 0.12 | 0.48 | 0.4-0.55 |
| R2[19] (-4.8, 14.55) | 0.29 | 0.54 | 0.4-0.55 |
| R2[20] (-1, 15) | 0.79 | 0.79 | 0.4-0.85 |
| R3[0] (-14.5, -7.2) | 0.54 | 0.54 | 0.4-0.55 |
| R3[1] (-14.5, -5.4) | 0.29 | 0.54 | 0.4-0.55 |
| R3[2] (-16.7, -4) | 0.12 | 0.50 | 0.4-0.55 |
| R3[3] (-16.9, 13.4) | 0.12 | 0.51 | 0.4-0.55 |
| R3[4] (-18.2, 13.4, 4) | 0.12 | 0.41 | 0.4-0.55 |
| R3[5] (-18.75, 14.6, 4) | 0.12 | 0.52 | 0.4-0.55 |
| R3[6] (-18.75, 15.5) | 0.12 | 0.42 | 0.4-0.55 |
| R3[7] (-19.2, 16.5) | 0.12 | 0.54 | 0.4-0.55 |
| R3[8] (-20.6, 16.5) | 0.12 | 0.45 | 0.4-0.55 |
| R3[9] (-22.1, 15) | 0.12 | 0.69 | 0.45-0.8 |
| R3[10] (-20.6, 16.5) | 0.12 | 0.45 | 0.4-0.55 |
| R3[11] (-19.2, 16.5) | 0.12 | 0.54 | 0.4-0.55 |
| R3[12] (-17, 15.6) | 0.12 | 0.41 | 0.4-0.55 |
| R3[13] (-12, 15.5) | 0.12 | 0.41 | 0.4-0.55 |
| R3[14] (-5.2, 15.5) | 0.12 | 0.41 | 0.4-0.55 |
| R3[15] (-4.8, 14.55) | 0.29 | 0.54 | 0.4-0.55 |
| R3[16] (-1, 15) | 0.79 | 0.79 | 0.4-0.85 |
| takedown 1 enforcer | 0.12 | 0.51 | 0.4-0.55 |
| takedown 2 grunt | 0.12 | 0.42 | 0.4-0.55 |
| takedown 3 officer | 0.12 | 0.40 | 0.4-0.55 |
| takedown 4 officer | 0.12 | 0.54 | 0.4-0.8 |
| takedown 6 runner | 0.12 | 0.55 | 0.4-0.55 |
| takedown 8 grunt | 0.12 | 0.43 | 0.4-0.55 |
| objective: the case | 0.12 | 0.57 | 0.55-0.8 |
| objective: the e2e stand point | 0.12 | 0.69 | 0.45-0.8 |
| connector: C3 near door | 0.44 | 0.51 | 0.45-0.55 |
| connector: C3 far door | 0.89 | 0.89 | 0.45-0.9 |
| connector: C3 checkpoint | 0.80 | 0.80 | 0.45-0.85 |
| entry: the C2 far door (from the lobby) | 0.29 | 0.54 | 0.45-0.55 |
| lane: the west end | 0.12 | 0.54 | 0.4-0.55 |
| lane: the middle | 0.12 | 0.50 | 0.4-0.55 |
| A1: the south mouth | 0.12 | 0.48 | 0.4-0.55 |
| A1: the middle | 0.12 | 0.54 | 0.4-0.55 |
| A1: the north end | 0.12 | 0.55 | 0.4-0.55 |
| cross aisle: west | 0.12 | 0.41 | 0.4-0.55 |
| cross aisle: middle | 0.12 | 0.41 | 0.4-0.55 |
| cross aisle: east | 0.12 | 0.48 | 0.4-0.55 |
| A2: the south mouth | 0.12 | 0.41 | 0.4-0.55 |
| A2: the middle | 0.12 | 0.46 | 0.4-0.55 |
| A2: the north half | 0.12 | 0.41 | 0.4-0.55 |
| A2: the ladder foot | 0.12 | 0.52 | 0.45-0.55 |
| A3: the middle | 0.12 | 0.41 | 0.4-0.55 |
| A3: the north half | 0.12 | 0.53 | 0.4-0.55 |
| ladder foot: R2N (cross aisle) | 0.12 | 0.45 | 0.45-0.55 |
| ladder foot: the cage stock ladder | 0.12 | 0.46 | 0.45-0.55 |
| east gangway: the ammo | 0.12 | 0.53 | 0.4-0.55 |
| east gangway: the middle | 0.12 | 0.41 | 0.4-0.55 |
| north gangway: the middle | 0.12 | 0.54 | 0.4-0.55 |
| the cage: the floor | 0.16 | 0.67 | 0.45-0.8 |
| the cage: the issue gate | 0.12 | 0.45 | 0.45-0.55 |
| the cage: the south gate | 0.12 | 0.46 | 0.4-0.55 |
| the issue desk front | 0.12 | 0.48 | 0.45-0.8 |
| rack top: R2N south end (the ladder top) | 0.12 | 0.41 | 0.4-0.55 |
| rack top: R1N (the cage side) | 0.15 | 0.45 | 0.4-0.55 |
| rack top: W0N (the cage stock ladder) | 0.12 | 0.41 | 0.4-0.55 |
| takedown 5 grunt | 0.12 | 0.12 | dark <= 0.3 |
| takedown 7 grunt | 0.12 | 0.12 | dark <= 0.3 |
| lane east half | 0.12 | 0.12 | dark <= 0.3 |
| rack top R3S (dark side) | 0.17 | 0.17 | dark <= 0.3 |
| rack top W0S (dark side) | 0.12 | 0.12 | dark <= 0.3 |
Section 3's own lamps keep the C3 far door (0.89), the C3 checkpoint (0.80) and the route ends at (-1, 15) (0.79) above the band (not section 2's lamps; the test pins them <= 0.90 / 0.85).

## Pockets (dark)
Takedown 5 (the picker, the east gangway's south end) and 7 (the charge hand) are the two takedown spots no route passes within 2 m of;
the lane's east half, and two rack tops (R3S, W0S, the dark side). The other six spots sit on a route (the checker's lane end, the stocktaker's A1
north end, the cage officer's desk, the tour guard's cross aisle spot, the loader's gangway corner, the reach driver's A3 north end): they read lit
and their isolation comes from sight lines and timing (M8), as in section 1.

## Notes
- Sections 1 and 3 read the same with the section 2 lamps off and on (levels within 0.02), but beside the C3 door (the exit sign over the open doorway lights its threshold). Section 1's own light test dropped (-14.5, -5.2), the C2 far doorway, from its
  "sections 2 and 3 are unchanged" list for the same reason: the exit sign over the open far door lights the section 2 threshold by 0.06.
- No 2 m column holds more than 8 lamps; every lamp is under the bake top.
- Not verified (needs the GPU): the look. Pendants now sit at i 0.46-1.1 (the lamp fix round); route points read 0.40-0.55.
