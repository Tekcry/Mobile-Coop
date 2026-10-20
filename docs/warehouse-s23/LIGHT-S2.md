# Warehouse S2 lamp pass (warehouse-s23, Michael M1)

Same method as `LIGHT-S1.md`: real registry lamps (baked, light parity, circuits 40 / 41 on the two wall switches, 42 the signs),
the test `tests/warehouseS2Light.test.ts` bakes the real `warehouseOps` field and pins levels. Levels are `bodyLevel` (standing 1.7 m
body). Readable >= 0.40; decision points, the cage gate and the objective area >= 0.45; the case >= 0.55; pockets <= 0.30 and at most
+0.05 over the level without the pass. A route point on a sprinkler main (y 5.0) is a grip: the body hangs 2.0 m under it, so the test
reads the feet at y 3.0. The route data is read from `WAREHOUSE_SECTORS[1]`.

## Lamps (`S2_LIGHT_PASS` in warehouseS2.ts): 22, the sheet's five adjusted
- Lane work lamp: the sheet's (-19.5, 5.05, -4.6) r 6 moved to (-16.5, 3.0, -4.6) r 7 i 1.2. A lamp at the rafters (5 m up, r 6) lit the lane
  to 0.30 only; hung at 3.0 it reads 1.0. Lane west (-22.0, 3.0, -3.8) and east (-12.6, 2.6, -3.6) pendants, r 4.5 / 4.2: small on purpose, because
  the 2 m column at x -18 to -16, z -10 to -6 already holds 7 of section 1's lamps (the shader limit is 8), and a lamp with a longer reach
  would push it over (plan reach counts through walls).
- Pendants at y 3.0 down the aisles: A1 (z 3, 9), the cross aisle (-17, 5.5), A2 (z 12), A3 (z 3, 11.5), the east gangway (-6, 8),
  the north gangway (-9, 15.8, circuit 41) and the cage (-21.9, 3.2, 13.8, circuit 41); r 5 to 5.5, i 1.1 to 1.3.
- Under the roof strips (y 5.8, r 5, i 1.4 to 1.6) over the rack tops of the high route: R2N (-14.6, 9), R1N (-18.5, 10.5) and (-19.5, 13.5), W0N (-23, 9.2);
  and beside (not over: a pipe shadows what hangs under it) the sprinkler mains, east corners (-7.2, 7.6) and (-7.0, 14.4).
- Issue desk lamp (the sheet's): r 4 -> 5.2, i 0.8 -> 1.2 (the cage's east gate and the R1N hang-drop landing).
- The charger indicator (the sheet's green lamp): r 3 -> 0.65, so it glows on the charger and does not light the charge hand's pocket (D10 put the
  charge hand 0.7 m from it).
- Why the pendants and not rafter lamps: a lamp lights only what is below it, with a cosine cone, and the visual roof strips (y 6.15) are light
  shapes, so a lamp over them (as section 1's roof masts) shadows nothing below. The racks (4.0) and the strips leave the 5.0 to 6.0 band for the
  rack-top lamps.

## Levels (before = the section 2 lamps off, the section 1 and 3 lamps and the building ambient as they were)
| Point | Before | After | Pinned |
| --- | --- | --- | --- |
| R1[0] (-14.5, -7.2) | 0.92 | 0.92 | >=0.4 |
| R1[1] (-14.5, -5.4) | 0.28 | 1.00 | >=0.4 |
| R1[2] (-22.1, -5.4) | 0.12 | 0.72 | >=0.4 |
| R1[3] (-22.2, -3.6) | 0.12 | 1.00 | >=0.4 |
| R1[4] (-22.4, 11.2) | 0.12 | 0.80 | >=0.4 |
| R1[5] (-22.4, 12.7) | 0.12 | 0.97 | >=0.4 |
| R1[6] (-22.1, 15) | 0.12 | 0.86 | >=0.45 |
| R1[7] (-22.4, 12.7) | 0.12 | 0.97 | >=0.4 |
| R1[8] (-22.4, 11.2) | 0.12 | 0.80 | >=0.4 |
| R1[9] (-21.6, 5.5) | 0.12 | 0.73 | >=0.4 |
| R1[10] (-12, 5.5) | 0.12 | 0.49 | >=0.4 |
| R1[11] (-12, 15.5) | 0.12 | 0.49 | >=0.4 |
| R1[12] (-5.2, 15.5) | 0.12 | 0.48 | >=0.4 |
| R1[13] (-4.8, 14.55) | 0.29 | 0.63 | >=0.4 |
| R1[14] (-1, 15) | 0.79 | 0.79 | >=0.4 |
| R2[0] (-14.5, -7.2) | 0.92 | 0.92 | >=0.4 |
| R2[1] (-14.5, -5.4) | 0.28 | 1.00 | >=0.4 |
| R2[2] (-12, -5.4) | 0.12 | 0.68 | >=0.4 |
| R2[3] (-12, 5.8) | 0.12 | 0.42 | >=0.4 |
| R2[4] (-14.65, 6.3) | 0.12 | 0.58 | >=0.4 |
| R2[5] (-14.65, 7.6, 4) | 0.12 | 0.68 | >=0.4 |
| R2[6] (-14.9, 10, 4) | 0.12 | 0.92 | >=0.4 |
| R2[7] (-18.3, 10, 4) | 0.12 | 1.00 | >=0.4 |
| R2[8] (-18.75, 13.5, 4) | 0.12 | 1.00 | >=0.4 |
| R2[9] (-20.4, 13.5) | 0.16 | 0.80 | >=0.4 |
| R2[10] (-22.1, 15) | 0.12 | 0.86 | >=0.45 |
| R2[11] (-22.6, 12.8) | 0.12 | 0.94 | >=0.4 |
| R2[12] (-23.45, 12.7) | 0.12 | 0.57 | >=0.4 |
| R2[13] (-23.45, 11.4, 4) | 0.12 | 0.47 | >=0.4 |
| R2[14] (-23.45, 7.4, 4) | 0.12 | 0.56 | >=0.4 |
| R2[15] (-23.45, 6.4, 5) | 0.12 | 0.44 | >=0.4 |
| R2[16] (-6.2, 6.4, 5) | 0.19 | 0.65 | >=0.4 |
| R2[17] (-6, 15.2, 5) | 0.12 | 0.67 | >=0.4 |
| R2[18] (-6, 15.2) | 0.12 | 0.61 | >=0.4 |
| R2[19] (-4.8, 14.55) | 0.29 | 0.63 | >=0.4 |
| R2[20] (-1, 15) | 0.79 | 0.79 | >=0.4 |
| R3[0] (-14.5, -7.2) | 0.92 | 0.92 | >=0.4 |
| R3[1] (-14.5, -5.4) | 0.28 | 1.00 | >=0.4 |
| R3[2] (-16.7, -4) | 0.12 | 1.00 | >=0.4 |
| R3[3] (-16.9, 13.4) | 0.12 | 0.87 | >=0.4 |
| R3[4] (-18.2, 13.4, 4) | 0.12 | 0.86 | >=0.4 |
| R3[5] (-18.75, 14.6, 4) | 0.12 | 0.73 | >=0.4 |
| R3[6] (-18.75, 15.5) | 0.12 | 0.44 | >=0.4 |
| R3[7] (-19.2, 16.5) | 0.12 | 0.48 | >=0.4 |
| R3[8] (-20.6, 16.5) | 0.12 | 0.49 | >=0.4 |
| R3[9] (-22.1, 15) | 0.12 | 0.86 | >=0.45 |
| R3[10] (-20.6, 16.5) | 0.12 | 0.49 | >=0.4 |
| R3[11] (-19.2, 16.5) | 0.12 | 0.48 | >=0.4 |
| R3[12] (-17, 15.6) | 0.12 | 0.77 | >=0.4 |
| R3[13] (-12, 15.5) | 0.12 | 0.49 | >=0.4 |
| R3[14] (-5.2, 15.5) | 0.12 | 0.48 | >=0.4 |
| R3[15] (-4.8, 14.55) | 0.29 | 0.63 | >=0.4 |
| R3[16] (-1, 15) | 0.79 | 0.79 | >=0.4 |
| objective: the case | 0.12 | 0.72 | >=0.55 |
| objective: the e2e stand point | 0.12 | 0.86 | >=0.45 |
| connector: C3 near door | 0.44 | 0.58 | >=0.45 |
| connector: C3 far door | 0.89 | 0.89 | >=0.45 |
| connector: C3 checkpoint | 0.80 | 0.80 | >=0.45 |
| entry: the C2 far door (from the lobby) | 0.28 | 1.00 | >=0.45 |
| lane: the west end | 0.12 | 1.00 | >=0.4 |
| lane: the middle | 0.12 | 1.00 | >=0.4 |
| A1: the south mouth | 0.12 | 0.73 | >=0.4 |
| A1: the middle | 0.12 | 1.00 | >=0.4 |
| A1: the north end | 0.12 | 1.00 | >=0.4 |
| cross aisle: west | 0.12 | 0.75 | >=0.4 |
| cross aisle: middle | 0.12 | 1.00 | >=0.4 |
| cross aisle: east | 0.12 | 0.49 | >=0.4 |
| A2: the south mouth | 0.12 | 0.83 | >=0.4 |
| A2: the middle | 0.12 | 1.00 | >=0.4 |
| A2: the north half | 0.12 | 0.66 | >=0.4 |
| A2: the ladder foot | 0.12 | 0.54 | >=0.4 |
| A3: the middle | 0.12 | 0.47 | >=0.4 |
| A3: the north half | 0.12 | 1.00 | >=0.4 |
| ladder foot: R2N (cross aisle) | 0.12 | 0.56 | >=0.4 |
| ladder foot: the cage stock ladder | 0.12 | 0.58 | >=0.4 |
| east gangway: the ammo | 0.12 | 0.76 | >=0.4 |
| east gangway: the middle | 0.12 | 0.53 | >=0.4 |
| north gangway: the middle | 0.12 | 1.00 | >=0.4 |
| the cage: the floor | 0.16 | 1.00 | >=0.45 |
| the cage: the issue gate | 0.12 | 0.49 | >=0.45 |
| the cage: the south gate | 0.12 | 1.00 | >=0.4 |
| the issue desk front | 0.12 | 0.90 | >=0.45 |
| rack top: R2N south end (the ladder top) | 0.12 | 0.60 | >=0.4 |
| rack top: R1N (the cage side) | 0.15 | 1.00 | >=0.4 |
| rack top: W0N (the cage stock ladder) | 0.12 | 0.47 | >=0.4 |
| takedown 5 grunt | 0.12 | 0.12 | dark<= 0.3 |
| takedown 7 grunt | 0.12 | 0.12 | dark<= 0.3 |
| lane east half | 0.12 | 0.15 | dark<= 0.3 |
| rack top R3S (dark side) | 0.17 | 0.17 | dark<= 0.3 |
| rack top W0S (dark side) | 0.12 | 0.12 | dark<= 0.3 |

## Pockets (dark)
Takedown 5 (the picker, the east gangway's south end) and 7 (the charge hand) are the two takedown spots no route passes within 2 m of;
the lane's east half, and two rack tops (R3S, W0S, the dark side). The other six spots sit on a route (the checker's lane end, the stocktaker's A1
north end, the cage officer's desk, the tour guard's cross aisle spot, the loader's gangway corner, the reach driver's A3 north end): they read lit
and their isolation comes from sight lines and timing (M8), as in section 1.

## Notes
- Sections 1 and 3 read the same with the section 2 lamps off and on (levels within 0.02), but beside the C3 door (the exit sign over the open doorway lights its threshold). Section 1's own light test dropped (-14.5, -5.2), the C2 far doorway, from its
  "sections 2 and 3 are unchanged" list for the same reason: the exit sign over the open far door lights the section 2 threshold by 0.06.
- No 2 m column holds more than 8 lamps; every lamp is under the bake top.
- Not verified (needs the GPU): the look. Pools of 1.0 under the pendants are hot; the polish list can lower i 1.1 / 1.3 to about 0.9.
