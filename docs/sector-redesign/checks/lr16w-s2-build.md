# LR16-W part S2 - storage hall at night (build report)

Builder: Opus 5.5, 2026-10-24. Branch `feature/sector-redesign-lr16w-s2` off `67f3661a`. Brief:
`docs/sector-redesign/briefs/LR16-W.md` "Part S2". Files: `src/world/maps/warehouseS2.ts` (`S2_LAMPS` only) and the section 2
route lines of `src/world/maps/warehouseSectors.ts` (`:136-145`, 6+ lines clear of section 3's block). Map data only: no
band, constant, assert or light-model change; no lamp added or removed (one dead fitting, #67, turned on).

## Result
- `warehouseS2Light` "lit enough": green (the 4 lows cleared). "Stealth maxima": all 37 S2-owned hall / cage reds cleared; the
  only rows left are the 12 boundary points S1 (C2 lobby, 7) and S3 (C3 office, 5) own, unchanged by this part (below).
- Sections 1 and 3: every print point unchanged (S1 100 points, S3 102 points, max |diff| 0.000 vs the `67f3661a` prints).
- W0N / R3[4] rack tops (the brief's possible C-entries): cleared, W0N 0.38 -> 0.45, R3[4] 0.39 -> 0.52 (no C-entry needed).

## How it was found
Step 0 base prints (b1-b3) and an untracked optimiser probe (`tests/zzW2probe.test.ts`, deleted, never committed): it bakes a
candidate layout (lamp table and route points patched before the build), splits every S2 point into ambient, other lamps and
each S2 lamp's direct + bounce, solves the S2 intensities (L1) against the bands with 0.015 margins, the pockets (dark, +0.05)
and the boundary budget (|after - base| <= 0.012 at the S1 / S3 points), then re-reads the real field at the solved levels.
Each layout candidate (rows, columns, beams, route moves) was a real re-bake; about 40 layouts were measured. Ruled out by
measurement: the A3 column (#62 / #64) 1 m west (the R2N ladder foot falls into the ladder's shadow: #62 vis 0.38 at x -13,
0.01 with the row at z 6.2), northA rows north (the same shadow, the R2N rack), the southAisles row north (A3 middle drops),
northB row 3 at z 16.7 (the C3 near door lost 0.05 through the doorway: over budget), northB rows 9.1 / 13.4 / 16.2 (the
`warehouseLamps` regular-grid rule), the brief's #71 over (-22.8, 15.0) with a 0.45 beam (leaves W0N at 0.30).

## Lamp changes (`S2_LAMPS`, registry ids #54-#75)
| id | fitting | old -> new | lever | why it stays realistic |
| --- | --- | --- | --- | --- |
| #54 | lane, A1 (-21.5, -4.6) | i 0.577 -> 0.553; room beam 30 deg -> own 0.85 rad | L1 + L2 | the A1 end fitting gets a wider high-bay optic so A1's mouth (27 deg off axis, in the old feather) is in its beam; takedown 1 and R1[2] sit under it and do not move |
| #55 | lane, A2 (-17, -4.6) | i 0.609 -> 0.585 | L1 | night level |
| #56 | lane, A3 (-12.5, -4.6) | i 0.646 -> 0.640 | L1 | night level (C2 far door unchanged) |
| #57 | south, A1 (-21.4, 1.9) | i 0.693 -> 0.515 | L1 | night level (A1 middle 0.74 -> 0.54) |
| #58 | south, A2 (-16.7, 1.9) | i 0.494 -> 0.568; 0.87 -> own 1.0 rad | L1 + L2 | a wider optic over A2 feeds the cross aisle and A2's mouth; 1.15x the base fitting |
| #59 | south, A3 (-12, 1.9) | i 0.618 -> 0.493; 0.87 -> own 0.45 rad | L1 + L2 | a narrow optic keeps A3's south floor lit and its light off the A3 / cross aisle corner, which then reads its own strip |
| #60 | south, east gangway (-7.2, 1.9) | i 0.073 -> 0.064 | L1 | near-dead over takedown 5's pocket (pocket +0.05 rule) |
| #61 | northA, A1 (-21.4, 6.9) | i 1.166 -> 0.407 | L1 | the brief's plan (part A freed it): W0 top, the main's west end, A1 north, cross aisle west all in band |
| #62 | northA, A3 (-12, 6.9) | i 0.638 -> 0.702 | L1 (up) | the R2N ladder foot needs it; bounded by the cross aisle east cap (see edges) |
| #63 | northA, A1 north (-21.4, 13.5) | i 0.572 -> 0.308 | L1 | the cage south and its gates move to the rim |
| #64 | northA, A3 north (-12, 13.5) | i 0.524 -> 0.446; none -> own 0.75 rad | L1 + L2 | a high-bay optic: A3 north keeps its pool, R1[11] / R3[13] on the north gangway fall to the rim |
| #65 | northB (-16.2, 9.6) -> (-17.0, 9.1) | i 0.474 -> 0.289 | L3 + L1 | northB's A2 column 0.8 m west over aisle A2's centre line (the south rows sit at -16.7), its first row 0.5 m south; the R2N / R1N jump tops are near equidistant |
| #66 | northB (-7.2, 9.6) -> (-7.2, 9.1) | i 0.651 -> 0.599 | L3 (row) + L1 | moves with the row; east gangway middle 0.38 -> 0.40 |
| #67 | northB dead (-16.2, 12.9) -> (-17.0, 12.9) | dead -> i 0.16 (radius 6.5) | L3 + dead fitting on | the grid's dead fitting over the A2 ladder, lit low: the ladder foot and R1N's top (R3[4], R2[8], the R1N cage-side top) |
| #69 | northB (-16.2, 16.2) -> (-17.0, 16.2) | i 0.627 -> 0.472 | L3 + L1 | moves with the column; the issue desk keeps a pool (0.57), R3[6] / R3[12] on its rim |
| #70 | northB (-7.2, 16.2) | i 0.464 -> 0.443 | L1 | 0.95x; C3 near door 0.87 -> 0.86 (S3's point, within budget) |
| #71 | cage (-22.2, 14.4) -> (-23.3, 13.4) | i 0.653 -> 0.300 | L3 + L1 | the cage's column 1.1 m west along the shelving wall, its south fitting 1.0 m south over the stock ladder: it lights the W0N rack top beside it (near field) and the ladder foot, not the open cage floor |
| #72 | cage (-22.2, 16.2) -> (-23.3, 16.2) | i 0.452 -> 0.260; none -> own 0.65 rad | L3 + L1 + L2 | the shelf light: a spot over the case shelving, the high-value store's pool (case 0.67) |
| #68, #73-#75 | dead fitting, exit signs | unchanged | - | - |

Both northB columns keep one row set (z 9.1 / 12.9 / 16.2, gaps 3.8 / 3.3: the `warehouseLamps` regular grid); the cage is a
1 x 2 grid at x -23.3. All fittings stay at y 5.8 under the solid roof strips, >= 0.03 when lit.

## Route points (L4, `warehouseSectors.ts` section 2; `obj` / `climbs` indices kept, same surfaces)
| route point | old -> new | move | same way? |
| --- | --- | --- | --- |
| R2[3] | (-12, 5.8) -> (-12.6, 5.4) | 0.72 m | the A3 / cross aisle corner, on the A3 strip's rim |
| R2[6] | (-14.9, 10, 4) -> (-15.2, 10, 4) | 0.3 m | the A2 jump's take-off on R2N's top, 0.6 m from its edge |
| R2[7] | (-18.3, 10, 4) -> (-18.6, 10, 4) | 0.3 m | the landing on R1N's top, 1.0 m in from its edge |
| R2[17], R2[18] | (-6, 15.2, 5), (-6, 15.2) -> (-6, 14.2, 5), (-6, 14.2) | 1.0 m | the brief's plan: the drop 1 m south along the x -6 main (still on it, z 6.4-15.4) |
| R3[3] | (-16.9, 13.4) -> (-17.1, 13.4) | 0.2 m | the A2 ladder's foot, at the ladder (the named ladder foot spot) |
| R3[4] | (-18.2, 13.4, 4) -> (-18.75, 13.4, 4) | 0.55 m | R1N's top on its centre line, out of #67's near field |
| R3[6] | (-18.75, 15.5) -> (-18.0, 15.5) | 0.75 m | the hang-drop off R1N's north end (x -19.9 to -17.6), landing nearer A2 |
| R3[12] | (-17, 15.6) -> (-17, 14.9) | 0.7 m | back past the issue desk through A2's north mouth, on the desk pool's rim |

Nav legs (detour <= 2.5x + 6 m, `e2e-sectorops`) are not run here (no e2e): the laptop run in the brief's "Laptop" step.

## Every S2 point, base (`67f3661a`) -> after
| | point (feet) | band | base | after |
| --- | --- | --- | --- | --- |
| boundary (S1 / S3 own) | R1[0] (-14.5, -7.2) | 0.4-0.55 | 1.00 | 1.00 |
| boundary (S1 / S3 own) | R1[1] (-14.5, -5.4) | 0.4-0.55 | 0.57 | 0.57 |
|  | R1[2] (-22.1, -5.4) | 0.4-0.55 | 0.51 | 0.52 |
|  | R1[3] (-22.2, -3.6) | 0.4-0.55 | 0.48 | 0.50 |
| **RED** -> cleared | R1[4] (-22.4, 11.2) | 0.4-0.55 | 0.65 | 0.40 |
| **RED** -> cleared | R1[5] (-22.4, 12.7) | 0.4-0.55 | 1.00 | 0.55 |
| **RED** -> cleared | R1[6] (-22.1, 15) | 0.45-0.8 | 1.00 | 0.67 |
| **RED** -> cleared | R1[7] (-22.4, 12.7) | 0.4-0.55 | 1.00 | 0.55 |
| **RED** -> cleared | R1[8] (-22.4, 11.2) | 0.4-0.55 | 0.65 | 0.40 |
| **RED** -> cleared | R1[9] (-21.6, 5.5) | 0.4-0.55 | 0.92 | 0.44 |
| **RED** -> cleared; edge (in TOL) | R1[10] (-12, 5.5) | 0.4-0.55 | 0.58 | 0.56 |
| **RED** -> cleared | R1[11] (-12, 15.5) | 0.4-0.55 | 0.68 | 0.53 |
|  | R1[12] (-5.2, 15.5) | 0.4-0.55 | 0.50 | 0.47 |
|  | R1[13] (-4.8, 14.55) | 0.4-0.55 | 0.54 | 0.51 |
| boundary (S1 / S3 own) | R1[14] (-1, 15) | 0.4-0.55 | 1.00 | 1.00 |
| boundary (S1 / S3 own) | R2[0] (-14.5, -7.2) | 0.4-0.55 | 1.00 | 1.00 |
| boundary (S1 / S3 own) | R2[1] (-14.5, -5.4) | 0.4-0.55 | 0.57 | 0.57 |
|  | R2[2] (-12, -5.4) | 0.4-0.55 | 0.54 | 0.53 |
| **RED** -> cleared | R2[3] (-12, 5.8) -> R2[3] (-12.6, 5.4) | 0.4-0.55 | 0.59 | 0.53 |
|  | R2[4] (-14.65, 6.3) | 0.4-0.55 | 0.44 | 0.44 |
|  | R2[5] (-14.65, 7.6, 4) | 0.4-0.55 | 0.56 | 0.45 |
| **RED** -> cleared | R2[6] (-14.9, 10, 4) -> R2[6] (-15.2, 10, 4) | 0.4-0.55 | 1.00 | 0.43 |
|  | R2[7] (-18.3, 10, 4) -> R2[7] (-18.6, 10, 4) | 0.4-0.55 | 0.56 | 0.54 |
|  | R2[8] (-18.75, 13.5, 4) | 0.4-0.55 | 0.51 | 0.52 |
| **RED** -> cleared | R2[9] (-20.4, 13.5) | 0.4-0.55 | 1.00 | 0.51 |
| **RED** -> cleared | R2[10] (-22.1, 15) | 0.45-0.8 | 1.00 | 0.67 |
| **RED** -> cleared | R2[11] (-22.6, 12.8) | 0.4-0.55 | 1.00 | 0.54 |
| **RED** -> cleared | R2[12] (-23.45, 12.7) | 0.4-0.55 | 0.72 | 0.46 |
| **RED low** -> cleared | R2[13] (-23.45, 11.4, 4) | 0.4-0.55 | 0.38 | 0.45 |
| **RED** -> cleared | R2[14] (-23.45, 7.4, 4) | 0.4-0.55 | 1.00 | 0.47 |
| **RED** -> cleared | R2[15] (-23.45, 6.4, 5) | 0.4-0.55 | 1.00 | 0.54 |
|  | R2[16] (-6.2, 6.4, 5) | 0.4-0.55 | 0.47 | 0.54 |
| **RED** -> cleared | R2[17] (-6, 15.2, 5) -> R2[17] (-6, 14.2, 5) | 0.4-0.55 | 0.88 | 0.55 |
|  | R2[18] (-6, 15.2) -> R2[18] (-6, 14.2) | 0.4-0.55 | 0.55 | 0.54 |
|  | R2[19] (-4.8, 14.55) | 0.4-0.55 | 0.54 | 0.51 |
| boundary (S1 / S3 own) | R2[20] (-1, 15) | 0.4-0.55 | 1.00 | 1.00 |
| boundary (S1 / S3 own) | R3[0] (-14.5, -7.2) | 0.4-0.55 | 1.00 | 1.00 |
| boundary (S1 / S3 own) | R3[1] (-14.5, -5.4) | 0.4-0.55 | 0.57 | 0.57 |
|  | R3[2] (-16.7, -4) | 0.4-0.55 | 0.53 | 0.52 |
|  | R3[3] (-16.9, 13.4) -> R3[3] (-17.1, 13.4) | 0.4-0.55 | 0.52 | 0.46 |
|  | R3[4] (-18.2, 13.4, 4) -> R3[4] (-18.75, 13.4, 4) | 0.4-0.55 | 0.39 | 0.52 |
|  | R3[5] (-18.75, 14.6, 4) | 0.4-0.55 | 0.53 | 0.54 |
|  | R3[6] (-18.75, 15.5) -> R3[6] (-18, 15.5) | 0.4-0.55 | 0.56 | 0.47 |
| **RED** -> cleared | R3[7] (-19.2, 16.5) | 0.4-0.55 | 0.80 | 0.48 |
| **RED** -> cleared | R3[8] (-20.6, 16.5) | 0.4-0.55 | 1.00 | 0.48 |
| **RED** -> cleared | R3[9] (-22.1, 15) | 0.45-0.8 | 1.00 | 0.67 |
| **RED** -> cleared | R3[10] (-20.6, 16.5) | 0.4-0.55 | 1.00 | 0.48 |
| **RED** -> cleared | R3[11] (-19.2, 16.5) | 0.4-0.55 | 0.80 | 0.48 |
| **RED** -> cleared | R3[12] (-17, 15.6) -> R3[12] (-17, 14.9) | 0.4-0.55 | 0.68 | 0.54 |
| **RED** -> cleared | R3[13] (-12, 15.5) | 0.4-0.55 | 0.68 | 0.53 |
|  | R3[14] (-5.2, 15.5) | 0.4-0.55 | 0.50 | 0.47 |
|  | R3[15] (-4.8, 14.55) | 0.4-0.55 | 0.54 | 0.51 |
| boundary (S1 / S3 own) | R3[16] (-1, 15) | 0.4-0.55 | 1.00 | 1.00 |
|  | takedown 1 grunt | 0.4-0.55 | 0.55 | 0.55 |
|  | takedown 2 grunt | 0.4-0.55 | 0.54 | 0.44 |
| **RED** -> cleared | takedown 3 officer | 0.4-0.55 | 0.87 | 0.46 |
|  | takedown 4 officer | 0.4-0.8 | 0.72 | 0.56 |
|  | takedown 6 grunt | 0.4-0.55 | 0.42 | 0.42 |
|  | takedown 8 grunt | 0.4-0.55 | 0.55 | 0.51 |
| **RED** -> cleared | objective: the case | 0.55-0.8 | 1.00 | 0.67 |
| **RED** -> cleared | objective: the e2e stand point | 0.45-0.8 | 1.00 | 0.67 |
| boundary (S1 / S3 own) | connector: C3 near door | 0.45-0.55 | 0.87 | 0.86 |
| boundary (S1 / S3 own) | connector: C3 far door | 0.45-0.55 | 0.54 | 0.54 |
| boundary (S1 / S3 own) | connector: C3 checkpoint | 0.45-0.55 | 1.00 | 1.00 |
| boundary (S1 / S3 own) | entry: the C2 far door (from the lobby) | 0.45-0.55 | 0.57 | 0.57 |
|  | lane: the west end | 0.4-0.55 | 0.53 | 0.53 |
|  | lane: the middle | 0.4-0.55 | 0.54 | 0.53 |
| **RED low** -> cleared | A1: the south mouth | 0.4-0.55 | 0.31 | 0.40 |
| **RED** -> cleared | A1: the middle | 0.4-0.55 | 0.74 | 0.54 |
| **RED** -> cleared | A1: the north end | 0.4-0.55 | 0.93 | 0.45 |
| **RED** -> cleared | cross aisle: west | 0.4-0.55 | 0.90 | 0.44 |
| **RED** -> cleared | cross aisle: middle | 0.4-0.55 | 0.62 | 0.52 |
| **RED** -> cleared; edge (in TOL) | cross aisle: east | 0.4-0.55 | 0.58 | 0.56 |
|  | A2: the south mouth | 0.4-0.55 | 0.39 | 0.42 |
| **RED** -> cleared | A2: the middle | 0.4-0.55 | 0.61 | 0.53 |
|  | A2: the north half | 0.4-0.55 | 0.55 | 0.44 |
|  | A2: the ladder foot | 0.45-0.55 | 0.52 | 0.46 |
|  | A3: the middle | 0.4-0.55 | 0.55 | 0.42 |
|  | A3: the north half | 0.4-0.55 | 0.55 | 0.47 |
| edge (in TOL) | ladder foot: R2N (cross aisle) | 0.45-0.55 | 0.44 | 0.44 |
| **RED** -> cleared | ladder foot: the cage stock ladder | 0.45-0.55 | 0.72 | 0.45 |
|  | east gangway: the ammo | 0.4-0.55 | 0.50 | 0.47 |
| **RED low** -> cleared | east gangway: the middle | 0.4-0.55 | 0.38 | 0.40 |
| edge (in TOL) | north gangway: the middle | 0.4-0.55 | 0.42 | 0.39 |
| **RED** -> cleared | the cage: the floor | 0.45-0.8 | 1.00 | 0.58 |
| **RED** -> cleared | the cage: the issue gate | 0.45-0.55 | 1.00 | 0.48 |
| **RED** -> cleared | the cage: the south gate | 0.4-0.55 | 1.00 | 0.53 |
|  | the issue desk front | 0.45-0.8 | 0.73 | 0.57 |
|  | rack top: R2N south end (the ladder top) | 0.4-0.55 | 0.52 | 0.44 |
|  | rack top: R1N (the cage side) | 0.4-0.55 | 0.45 | 0.51 |
| **RED low** -> cleared | rack top: W0N (the cage stock ladder) | 0.4-0.55 | 0.38 | 0.45 |
|  | takedown 5 grunt | dark<=0.3 | 0.17 | 0.17 |
|  | takedown 7 grunt | dark<=0.3 | 0.13 | 0.13 |
|  | lane east half | dark<=0.3 | 0.13 | 0.13 |
|  | rack top R3S (dark side) | dark<=0.3 | 0.18 | 0.18 |
|  | rack top W0S (dark side) | dark<=0.3 | 0.13 | 0.13 |

## Edge rows after (outside the nominal band, inside the test's TOL 0.02)
- cross aisle: east / R1[10] (-12, 5.5): 0.56 (cap 0.55) and ladder foot: R2N (-14.65, 6.4): 0.44 (KEY 0.45; base 0.44). One
  trade: the ladder foot is lit only by #62, 2.7 m off its axis, at 0.61 of what the A3 corner under it gets; every fitting
  west or north of the foot is cut by the R2N ladder and rack (measured vis 0.38 / 0.01 / 0), #59 / #58 add 0.01. Both
  inside their nominal bands at once would need a fitting over the cross aisle near x -14 (no grid slot there) or a
  light-model call: a C-entry candidate for the lead / Michael if TOL edges are not accepted.
- north gangway: the middle (-9, 15.5): 0.39 (min 0.40; base 0.42). #70 is capped by R2[17] (the hanging body 1.2 m under its
  plane, 0.55) and by the C3 near door budget.
- In band but at the low edge: R1[4] / R1[8] 0.40, A1 south mouth 0.40, east gangway middle 0.40, takedown 6 0.42, A2 south
  mouth 0.42. At the top edge: R1[5] / R1[7] 0.55, R2[17] 0.55.

## Boundary points (owned by S1 / S3): this part's change
| point | owner | base | after |
| --- | --- | --- | --- |
| R1[0] R2[0] R3[0] (-14.5, -7.2) | S1 | 1.00 | 1.00 |
| R1[1] R2[1] R3[1], entry: the C2 far door (-14.5, -5.4) | S1 | 0.57 | 0.57 |
| R1[14] R2[20] R3[16] (-1, 15), C3 checkpoint | S3 | 1.00 | 1.00 (the S2 lamps give ~0.00 there) |
| connector: C3 near door (-3.6, 14.55) | S3 | 0.87 | 0.86 (#70 0.95x) |
| connector: C3 far door | S3 | 0.54 | 0.54 |

## Contrast: each room's brightest floor point after (body level, 0.25 m scan)
- Storage hall (outside the cage): 0.73 at (-12.0, 7.75), A3 just north of the cross aisle under #62 (the reach driver's
  put-away aisle); hall floor mean 0.33. Route points 0.40-0.55, pockets 0.13-0.18.
- High-value cage: 0.69 at (-23.0, 14.5), the case shelving under the shelf light; the case 0.67, the stand 0.67, the cage
  floor 0.58, the gates 0.48 / 0.53. The issue desk front 0.57, the cage officer 0.56.

## Light parity
Map data only: intensities, per-fitting beams (the 5th tuple element: the same `cone` for the lamp shader and the field), one
column and one row of northB, the cage's column and south row, one dead fitting lit, route points. The picture, the meter and
the guards read the same bake and registry. A route move changes where the test samples, not the light; each keeps the same
surfaces, climbs and cover (table above).

## Tests (desktop, single files, `--maxWorkers=2`, slot lock, CPU checked)
- `warehouseS1Light` 12 tests: 11 pass, 1 fail (S1's own stealth maxima, as on the base; print unchanged).
- `warehouseS2Light` 11 tests: 10 pass, 1 fail (stealth maxima: only the 12 S1 / S3 boundary rows above).
- `warehouseS3Light` 11 tests: 7 pass, 4 fail (S3's own, as on the base; print unchanged).
- `sectors`, `warehouseCoopS1`, `warehouseCoopS2`, `warehouseCoopS3`, `warehouseLamps`, `lampAudit`: 6 files, 107 tests pass.
- `lampBoxAlign`, `warehouseDress`, `sectorLampSync`, `rooms`, `detailPass`, `lampFlicker`, `lampAtlasFit`: 7 files, 66 tests pass.
- `npx tsc --noEmit` clean; `npx eslint` on the two touched files clean.

## For the lead / Michael
1. The TOL edges above (cross aisle east 0.56 against the R2N ladder foot 0.44; north gangway 0.39): accept, or a C-entry.
2. `tests/warehouseLamps.test.ts:120` `LR16D_MOVED['S2 cage ceiling -22.2,14.4']` no longer matches a fitting (the cage strips
   moved); harmless, a one-line cleanup for whoever next touches that test (not this part's file).
3. Laptop: `e2e-sectorops` over the moved R2 / R3 points (the A2 jump, the R2 drop at z 14.2, the R3 drop at x -18.0) and the
   GPU sheet row "the S2 cage from the issue gate".
