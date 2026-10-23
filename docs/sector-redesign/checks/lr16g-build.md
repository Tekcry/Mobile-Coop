# LR16g build - brightness re-level on the one light model

Builder: Opus 5.5, 2026-10-23 (resumed after the ~22:10 swap; the dead builder's WIP probe `tests/zz_lr16gProbe.test.ts`
is dropped from the branch, its per-lamp decomposition reused from scratch). Brief: `briefs/LR16g.md` on
`feature/sector-redesign-polish` (lead decisions at its top). Branch `feature/sector-redesign-lr16g`, base lr16int
`961ca660` (`LAMP_VERSION` 5, unchanged here). Status: built; 6 of the 13 map-light reds green, 7 left red with C
entries (no test weakened, no limit widened). `npx tsc --noEmit` clean.

## What changed (data only: no field, shader, `BOUNCE`, `PHOTO`, `LIGHT_GAIN` or position change)

### Marlow Yard (`src/world/maps/ctcourse.ts`; walk 4.82 item 1 "Marlow yard seems dark")
| file:line | old -> new | why |
| --- | --- | --- |
| `ctcourse.ts:79` `LAMP_LOW` (low-cell strips S1 / S6 / S8, S3 hallway and lobbies) | i 0.9 -> 1.5 | panel readers and corners back to the course-ready tuning |
| `ctcourse.ts:80` `LAMP_S4` | i 0.85 -> 1.4 | same (S4 reader 0.49 -> 0.61) |
| `ctcourse.ts:81` `S5_ROOF_LAMP` | i 0.9 -> 1.4 | S5 hatch frame 0.44 -> 0.52 (min 0.45) |
| `ctcourse.ts:422`, `:428` high-hall pendants (S2 / S5 / S7) | i 0.9 -> 1.6 | S7 stair step 2 0.36 -> 0.41, step 3 0.43 -> 0.54; S2 / S7 readers |
| `ctcourse.ts:83` `S2_TOP_LAMP` | radius 7.6 -> 4.4 | reach 12.2 -> 7.0 m: it added 0.09 at "S2 corner x0+9.8 z0.6" (limit 0.02) |
| `ctcourse.ts:84` `S7_TOP_LAMP` | radius 5 -> 3.6 | reach 8 -> 5.8 m: it lit the ground at (139.5 / 142.5, 1.6, 7) (0.072, must be 0) |
| `tests/ctcourseLight.tuned.json` | re-taken from the print run (A) | 140 of 190 levels moved; `_note` says why |

### Campus S2 atrium (`src/world/maps/campusS2.ts:565`)
Pendants `i` 0.9 -> 1.35. Measured on the base at (-16, 0.05, -15), doors shut, full campus bake: level 0.358 = ambient
0.141 + lamps 0.153 + bounce 0.064 (the brief's 0.281 predates LR16-1's bounce). The bounce scales with the pendants, so
0.47 = 0.141 + k (0.153 + 0.064) gives k 1.52, i 1.37 -> 1.35 (0.05 steps). After: 0.468 (lamps 0.230, bounce 0.097).
The brief's formula (bounce held fixed) gives 1.55, which reads 0.51 (measured 0.493 at 1.45). See assumption 1.
New test `tests/campusS2.test.ts` "(LR16g) the atrium pool reads 0.45-0.5 between the pendants, the cafe stays dark":
bakes a box round S2 only (x -50..10, z -40..12; 21 s instead of 142 s; the same 0.468 as the full bake).

### warehouseOps S1-S3 (`warehouseS1.ts`, `warehouseS2.ts`, `warehouseS3.ts`, rows `[x, z, radius, intensity]`)
Method: the per-lamp decomposition (direct + bounce per lamp at both body samples, ambient, pass lamps) of every test
point, then a greedy search: a lamp's new value is taken only when it fixes at least one asserted point and breaks none
that passes, with "the lamps took the points up" kept; intensity 0.5-2.5x of the base value; radius only when the move
fixes a pocket point (0.6-0.72x). Two rounds, every change checked by the real tests; one round-2 move (lamp (18, 3.4)
radius 0.6 for the S3 east bay) broke S3 R1[19] in the real bake and is reverted.

| file:line | lamp (x, y, z) | radius / i before | after | factor |
| --- | --- | --- | --- | --- |
| `warehouseS1.ts:66` | (-19, 5.0, -18.45) | 5.09 / 0.418 | 3.05 / 0.397 | x0.95, radius x0.60 |
| `warehouseS1.ts:68` | (-21.4, 3.0, -18.45) | 2.27 / 1.315 | 1.36 / 0.723 | x0.55, radius x0.60 |
| `warehouseS1.ts:69` | (-5, 3.0, -18.45) | 5.59 / 0.261 | 5.59 / 0.248 | x0.95 |
| `warehouseS1.ts:69` | (11, 3.0, -18.45) | 5.97 / 0.197 | 5.97 / 0.159 | x0.81 |
| `warehouseS1.ts:73` | (-14, 5.58, -11.6) | 5.55 / 1.345 | 5.55 / 1.278 | x0.95 |
| `warehouseS1.ts:78` | (10.7, 5.58, -15.8) | 5.51 / 0.967 | 5.51 / 0.483 | x0.50 |
| `warehouseS1.ts:78` | (21.3, 5.58, -11.8) | 6.3 / 1.182 | 6.3 / 1.123 | x0.95 |
| `warehouseS1.ts:82` | (-13.85, 2.95, -7.4) | 5.65 / 0.626 | 5.65 / 0.313 | x0.50 |
| `warehouseS1.ts:85` | (-6.5, 2.95, -15.9) | 6.93 / 0.496 | 6.93 / 0.347 | x0.70 |
| `warehouseS1.ts:88` | (3.4, 2.75, -12.3) | 3.4 / 0.664 | 2.45 / 0.664 | radius x0.72 |
| `warehouseS2.ts:137` | (-21.5, 5.8, -4.6) | 8.1 / 0.679 | 8.1 / 0.577 | x0.85 |
| `warehouseS2.ts:137` | (-17, 5.8, -4.6) | 5.89 / 0.87 | 5.89 / 0.609 | x0.70 |
| `warehouseS2.ts:137` | (-12.5, 5.8, -4.6) | 6.04 / 0.862 | 6.04 / 0.646 | x0.75 |
| `warehouseS2.ts:138` | (-21.4, 5.8, 1.9) | 6.61 / 0.603 | 6.61 / 0.693 | x1.15 |
| `warehouseS2.ts:138` | (-12, 5.8, 1.9) | 5.56 / 0.951 | 5.56 / 0.618 | x0.65 |
| `warehouseS2.ts:138` | (-7.2, 5.8, 1.9) | 6.41 / 0.121 | 3.85 / 0.073 | x0.60, radius x0.60 |
| `warehouseS2.ts:139` | (-21.4, 5.8, 6.9) | 6.4 / 0.966 | 6.4 / 1.166 | x1.21 |
| `warehouseS2.ts:139` | (-12, 5.8, 6.9) | 9 / 0.709 | 9 / 0.638 | x0.90 |
| `warehouseS2.ts:139` | (-12, 5.8, 13.5) | 5.78 / 0.582 | 5.78 / 0.524 | x0.90 |
| `warehouseS2.ts:140` | (-16.2, 5.8, 9.6) | 7.91 / 0.558 | 7.91 / 0.474 | x0.85 |
| `warehouseS2.ts:140` | (-7.2, 5.8, 9.6) | 9 / 0.685 | 9 / 0.651 | x0.95 |
| `warehouseS2.ts:140` | (-7.2, 5.8, 16.2) | 9 / 0.488 | 9 / 0.464 | x0.95 |
| `warehouseS2.ts:145` | (-4.45, 2.4, 14.55) exit sign | 0.6 / 0.15 | 0.6 / 0.083 | x0.55 |
| `warehouseS3.ts:129` | (-2.8, 5.8, -2.6) | 7.98 / 1.609 | 7.98 / 1.046 | x0.65 |
| `warehouseS3.ts:129` | (2.4, 5.8, -2.6) | 6.97 / 1.496 | 6.97 / 1.346 | x0.90 |
| `warehouseS3.ts:129` | (7.6, 5.8, -2.6) | 6.8 / 0.321 | 4.08 / 0.321 | radius x0.60 |
| `warehouseS3.ts:129` | (12.8, 5.8, -2.6) | 7.77 / 0.884 | 7.77 / 0.442 | x0.50 |
| `warehouseS3.ts:129` | (18.26, 5.8, -2.6) | 4.5 / 0.588 | 4.5 / 0.294 | x0.50 |
| `warehouseS3.ts:129` | (18, 5.8, 3.4) | 5.96 / 0.555 | 5.96 / 0.333 | x0.60 |
| `warehouseS3.ts:129` | (22.15, 5.8, 3.4) (lamp 87) | 4.5 / 0.7 | 2.7 / 0.7 | radius x0.60 |
| `warehouseS3.ts:129` | (-2.8, 5.8, 9.4) | 9 / 0.683 | 9 / 0.552 | x0.81 |
| `warehouseS3.ts:129` | (7.6, 5.8, 9.4) | 6.34 / 0.861 | 6.34 / 0.517 | x0.60 |
| `warehouseS3.ts:132` | (5, 5.0, -8.35) | 3.36 / 0.613 | 3.36 / 0.337 | x0.55 |
| `warehouseS3.ts:132` | (13, 5.0, -8.35) | 5.68 / 0.584 | 5.68 / 0.438 | x0.75 |
| `warehouseS3.ts:134` | (-2.5, 2.95, 13.5) | 4.25 / 0.438 | 4.25 / 0.307 | x0.70 |
| `warehouseS3.ts:135` | (10, 2.95, 12.8) | 2.98 / 0.213 | 2.98 / 0.202 | x0.95 |
| `warehouseS3.ts:136` | (5, 2.95, 15) | 7 / 0.906 | 7 / 0.498 | x0.55 |

Lamp 71 (the brief's first named move): no change. R2[13] and the W0N rack top read 0.38 (READ 0.4 - TOL 0.02: pass)
and R2[8] 0.51; raising 71 pushed cage route points over CAP. All radius moves are pocket-rim moves (skip, takedown 8,
takedown 5, crane operator, east bay).

## Measured levels, before (961ca660) -> after (this branch)
### Marlow Yard (ctcourse, `CTLIGHT_PRINT`; the fill floor is 0.30, no moon)
| group | course-ready Classic tuning | base | after |
| --- | --- | --- | --- |
| yard corners (48, "dark between the pools") | mean 0.470 | mean 0.409 (min 0.30) | mean 0.479 (min 0.30, max 0.58 < 0.65) |
| panel / release readers, scanners (11) | mean 0.570 | mean 0.470 (min 0.46) | mean 0.588 (min 0.56) |
| panel / release faces (9) | mean 0.509 | mean 0.420 | mean 0.499 |
| route x0+8.4 (8, between the bay's two lamps) | mean 0.910 | mean 0.812 | mean 0.940 |
| all 156 yard points (airlocks excluded) | mean 0.681 | mean 0.657 | mean 0.735 |
On screen a level shows as `LIGHT_GAIN / LAMP_LEVEL_GAIN` x level, so the picture lifts by the same ratio (one field).
Must-see points: S5 hatch frame 0.44 -> 0.52, S6 scanner A 0.46 -> 0.56, S7 stair step 2 0.36 -> 0.41, step 3 0.43 ->
0.54, S8 exit corner SE 0.54 -> 0.69, S7 stair step 1 0.33 -> 0.31 (C2). Airlocks (shut) read 1.00 at the centre and pad
on the base and after (Classic 0.65 / 0.53: the 3.05 m bulkhead's near field; intent "readable" holds: A, re-baselined).

### Campus S2 atrium
Floor (-16, 0.05, -15) 0.358 -> 0.468. Cafe, standing body (doors shut): the north strip z -7..-5 (the counter at
(-19, -5.6), the table at (-13, -6.5)) 0.16-0.23 -> 0.18-0.276 (all < 0.28); the tables at z -9 / -9.5 on the pool's
rim 0.25-0.29 -> 0.30-0.36 (assumption 2). Boost point CR2 (-10.6, -8) stays < 0.28 (its test passes).

### warehouseOps (failing points per assert, from the print files)
| section | stealth CAP 0.55 / WORK 0.8 | READ / KEY minima | pockets DARK 0.3 | pockets +0.05 |
| --- | --- | --- | --- | --- |
| S1 | 79 -> 67 | 0 -> 0 | 1 -> 0 (behind the skip 0.40 -> 0.30) | 1 -> 0 (takedown 8 0.28 -> 0.15) |
| S2 | 62 -> 41 | 3 -> 1 (A1 south mouth 0.32 -> 0.31) | 0 -> 0 | 1 -> 0 (takedown 5 0.22 -> 0.17) |
| S3 | 90 -> 66 | 0 -> 0 | 3 -> 1 (stores officer 0.49 -> 0.41; crane operator 0.37 -> 0.24; east bay 0.60 -> 0.30) | 2 -> 2 (crane operator +0.12, east bay +0.14) |
Named points: S1 R1[15] 0.73 -> 0.73 (C1); S2 R2[8] 0.51, R2[13] 0.38, W0N 0.38 (all pass with TOL), R2N ladder foot
0.47 -> 0.45 (KEY 0.45, pass); S3 R3[6] 0.91 -> 0.74, packing end 0.95 -> 0.70 (WORK, pass).

### S1 floor sweep (acceptance 4; scratch probe, not committed)
1 m grid x -23.5..23.5, z -26.5..-6.5, feet y 0, `bodyLevel` at 1.7 m, with vs without the bounce (`r.bounce` dropped):
base 425 of 1008 points dark without the bounce, 27 of them over 0.30 with it (one within 1.5 m of a pocket: behind the
skip); after 446 dark, 23 over, max lift 0.106, none within 1.5 m of a pocket. LR16-1's check reported 70 / 825 on its
own grid (not given); the box here is the S1 footprint with the facade yard, so the numbers are not the same sample.

## The 13 reds
| # | test | before | outcome |
| --- | --- | --- | --- |
| 1 | ctcourseLight `:163` must-see lit | 6 points low | red, 1 point left: C2 |
| 2 | ctcourseLight `:172` dark between pools | S2 corner +0.09 | GREEN (B: S2 wall-top reach) |
| 3 | ctcourseLight `:184` airlock / wall-top | S7 top lamp 0.072 on the ground | GREEN (B: S7 wall-top reach) |
| 4 | ctcourseLight `:259` tuned within 0.08 | 85 levels off | GREEN (A: re-taken after the lift) |
| 5 | warehouseS1 stealth maxima | 79 | red, 67: C1 |
| 6 | warehouseS1 pockets dark | 1 | GREEN (B) |
| 7 | warehouseS1 pockets +0.05 | 1 | GREEN (B) |
| 8 | warehouseS2 lit enough | 3 | red, 1: C3 |
| 9 | warehouseS2 stealth maxima | 62 | red, 41: C1 |
| 10 | warehouseS2 pockets +0.05 | 1 | GREEN (B) |
| 11 | warehouseS3 stealth maxima | 90 | red, 66: C1 |
| 12 | warehouseS3 pockets dark | 3 | red, 1: C4 |
| 13 | warehouseS3 pockets +0.05 | 2 | red, 2: C4 |

## C entries (no lamp value fixes them without breaking another point)
- **C1 - stealth points inside a pool (174 points: S1 67, S2 41, S3 66).** Cause: the route, decision and takedown points
  stand in the pools of the fittings that light them (head 1.1-1.3 m under the 2.75-2.95 m room panels, 4 m under the
  5.6-5.8 m hall strips); with the photometric falloff a body in a pool reads 0.6-1.0 (direct, bounce < half: 7 of 174
  pass without it, 34 of 233 on the base). 124 base points read 1.00. Most need the lamp at 0.1-0.4x. A global scan
  (scratch, base decomposition; `PHOTO.near` 1-3 m x a global scale 1-0.3) never clears them: e.g. scale 0.5 leaves 141
  over CAP with 60 under their minimum, 0.3 leaves 89 over and 120 under. So no constant (lever 3) and no `BOUNCE`
  change (lever 2) fixes them. Proposed owner: a warehouseOps light / route layout slice (lead; LR16d-style placement
  or re-drawn routes through the dark, CT "clear pools, clear dark"), or a lead call on the CAP's scope (it is the
  test's limit: not changed here). Grouped list (section, dominant lamp at base, points with the level now) in
  "Appendix C1".
- **C2 - Marlow S7 stair step 1 (142, 3.3, 1.0): 0.31, min 0.33.** No lamp reaches it: the hall pendants hang level with
  it (their hemisphere ends there) and the S7 wall-top lamp would need a reach of 6.6 m, which also lights the ground at
  5.9 m (`:184` asserts 0). On the base it read 0.33 and failed too. Owner: Marlow Build or the lead (a stair lamp, or
  move the S7 wall-top lamp; positions are not LR16g's).
- **C3 - warehouseOps S2 "A1: the south mouth" (-21.4, -2.5): 0.31, AISLE min 0.4.** Its lamp (-21.5, 5.8, -4.6) also
  lights R1[2] (-22.1, -5.4) at the CAP edge (0.52); +0.09 at the mouth puts R1[2] over 0.55. Owner: layout slice (C1).
- **C4 - warehouseOps S3 pockets.** Stores officer's spot (0.6, 0, -7.6) 0.41 > 0.3: its two strips (-2.8 / 2.4, 5.8,
  -2.6) also light R2[4], R2[5], the walkway ladder foot (KEY) and the cage counter (0.55 WORK minimum); at 0.5x with a
  0.6 radius the pocket reads 0.12 and those four fall to 0.21-0.31. Crane operator's spot (8, 0, -6.8) 0.24 (dark
  passes) but +0.12 from the pass; the east bay (21, 1.5) 0.30 (dark at the limit) but +0.14, mostly the strip at
  (18, 5.8, 3.4), which also lights R1[19] (18.6, 4): a radius 0.6 on it took R1[19] to 0.37 < 0.4 (reverted). Owner:
  layout slice (C1); the east bay is LR16dx lamp 87's move (`lr16dx-check.md`).

## Tests run (slot lock each run, `--maxWorkers=2`)
- Base (961ca660): levels set (7 files) 13 failed / 85 passed (98).
- After, levels: `ctcourseLight`, `warehouseS1Light`, `warehouseS2Light`, `warehouseS3Light`, `campusS2`, `lampLevel`,
  `lights`: 7 failed / 92 passed (99; +1 the new atrium test); the 7 are the C entries above.
- After, parity and data: `lightField`, `lampFalloff`, `lampGridLossless`, `levelFillParity`, `bounceGrid`,
  `lampBounce`, `smoothWorldLight`, `warehouseLamps`, `lampAudit`, `warehouseCoopS1-S3`: 12 files, 142 passed.
- After, files that read the changed maps' lights: `ctcourse`, `lampAtlasFit`, `lampFlicker`, `rooms`, `detailPass`,
  `warehouseDress`, `sectorLampSync`, `campusS3`, `campusS5`: 9 files, 159 passed.
- `npx tsc --noEmit`: clean. `lampBake` not run (no `BOUNCE` change); `campusS1` / `campusS4` not run (no campus data
  beyond S2).

## Assumed decisions (numbered for the lead)
1. S2 atrium pendants 1.35, solved with the bounce scaling with the lamp (the brief's formula held the bounce fixed:
   1.55 would read ~0.51, over the 0.5 acceptance). Undo: one value at `campusS2.ts:565`.
2. "The cafe" in the new test is the void's north strip z -7..-5 (the counter and the north table). The two tables at
   z -9 / -9.5 are on the pool's rim and read 0.30-0.36 (they read 0.25-0.29 on the base, already near the line).
3. Marlow: the whole bay set lifted 1.55-1.78x to restore the course-ready readers and corners (Michael's "Marlow yard
   seems dark"), the tuned json re-taken (A). Corners stay under `LIGHT.lit` + 0.05 and none gained from the new lamps.
4. Wall-top lamp radii cut (S2 7.6 -> 4.4, S7 5 -> 3.6): reach asserts, the photometric reach (x1.6) had pushed them
   onto the ground and the corners.
5. warehouseOps: honest moves only (each fixes an asserted point and breaks none); many lamps sit at the 0.5x floor of
   the brief's range. Points that need more are C1, not partial dimming.
6. No lever 2 or 3 change: the too-bright cases are mostly direct (bounce-caused 34 / 233 on the base), and the global
   scan shows no constant clears them. `LAMP_VERSION` stays 5.

## Open items / for the lead
1. C1 (174 stealth points in pools): the big one. Decide between a layout slice (routes / lamps) and the CAP's scope.
2. C2 S7 stair top lamp, C3 S2 A1 mouth, C4 S3 pockets: owners above.
3. Files outside the brief's list: none. Not updated: `docs/marlow-bunker/LIGHT.md` and `docs/warehouse-s23/LIGHT-S*.md`
   level tables (docs, not in the list); no changelog fragment (the LR16 batch PR carries one).
4. GPU sheet: item 1 (atrium pool ~0.47 on the meter, cafe dark), item 2 (Marlow stations 1-8 brighter: readers ~0.59,
   corners ~0.48), item 3 (warehouse pools dimmer where lamps went to 0.5x: S1 workshop (10.7, -15.8), lobby panel
   (-13.85, -7.4), S3 hall strips (12.8 / 18.26, -2.6)).

## Appendix C1 (section, dominant lamp at base, height of the lamp over the head sample, points with the level now)
| sec | lamp (x, y, z) | m over head | n | points |
| --- | --- | --- | --- | --- |
| S1 | (-14, 5.58, -15.4) | 4.0 | 1 | R1[4] 0.83 |
| S1 | (-10, 5.58, -15.4) | 4.0 | 2 | R1[5] 0.85, takedown 3 officer 0.93 |
| S1 | (-6.5, 2.95, -15.9) | 1.3 | 3 | R1[6] 1.00, R1[7] 0.80, R1[8] 0.77 |
| S1 | (-3.4, 2.75, -12.3) | 1.1 | 1 | R1[9] 1.00 |
| S1 | (3.4, 2.75, -12.3) | 1.1 | 6 | R1[10] 1.00, R1[13] 1.00, R3[13] 1.00, R3[14] 1.00, R3[17] 1.00, security office door 1.00 (WORK) |
| S1 | (4.3, 2.95, -15.9) | 1.3 | 7 | R1[11] 1.00, R1[12] 1.00 (WORK), R2[8] 1.00 (WORK), R3[15] 1.00, R3[16] 1.00 (WORK), objective: the DVR 1.00 (WORK), objective: the DVR desk front 1.00 (WORK) |
| S1 | (-6.8, 2.75, -12.3) | 1.1 | 3 | R1[14] 1.00, R3[18] 1.00, corridor: west end 1.00 |
| S1 | (-10, 5.58, -11.6) | 4.0 | 3 | R1[15] 0.73, R3[19] 0.73, bay: the east lane 0.86 |
| S1 | (-14, 5.58, -11.6) | 4.0 | 4 | R1[17] 0.95, R2[16] 0.86, R3[21] 0.86, bay: the wrapper 0.78 |
| S1 | (-13.85, 2.95, -7.4) | 1.3 | 7 | R1[18] 0.89, R1[19] 1.00, R2[17] 1.00, R3[22] 1.00, connector: C2 near door 0.96, connector: C2 far door 0.94, connector: C2 checkpoint 1.00 |
| S1 | (4.2, 5.58, -15.15) | 0.7 | 3 | R2[5] 1.00, R2[11] 1.00, plant deck: the middle 1.00 |
| S1 | (7, 5.58, -15.15) | 0.7 | 2 | R2[6] 1.00, R2[10] 1.00 |
| S1 | (6.7, 2.95, -15.9) | 1.3 | 2 | R2[7] 1.00, R2[9] 1.00 |
| S1 | (-22, 5.58, -7.4) | 0.8 | 2 | R2[14] 0.77, lobby roof: the storage 0.77 |
| S1 | (-17, 5.58, -7.4) | 0.8 | 2 | R2[15] 1.00, lobby roof: the vent 1.00 |
| S1 | (11, 3, -18.45) | 1.4 | 2 | R3[4] 0.94, entry: the workshop door 0.80 |
| S1 | (10.7, 5.58, -15.8) | 4.0 | 1 | R3[5] 0.75 |
| S1 | (21.3, 5.58, -11.8) | 4.0 | 1 | R3[6] 0.90 |
| S1 | (22.6, 5, -9.25) | 0.4 | 2 | R3[8] 1.00, crane walkway: east end 1.00 |
| S1 | (8.6, 5, -9.25) | 0.4 | 2 | R3[9] 1.00, crane walkway: west end 1.00 |
| S1 | (6.65, 4.55, -10) | -0.1 | 2 | R3[10] 1.00, void: the catwalk opening 1.00 |
| S1 | (3.1, 4.55, -10) | -0.1 | 2 | R3[11] 1.00, void: opening over the mess 1.00 |
| S1 | (4.5, 2.75, -9.8) | 1.1 | 3 | R3[12] 1.00, takedown 4 officer 1.00, mess: under the hatch 1.00 |
| S1 | (-5, 3, -18.45) | 1.4 | 1 | entry: the entrance door 1.00 |
| S1 | (0, 2.75, -12.3) | 1.1 | 1 | corridor: middle 1.00 |
| S1 | (15.6, 5, -9.25) | 0.4 | 1 | crane walkway: middle 1.00 |
| S1 | (-5.3, 4.55, -12.3) | -0.1 | 1 | void: opening over the corridor 1.00 |
| S2 | (-13.85, 2.95, -7.4) | 1.3 | 3 | R1[0] 1.00, R2[0] 1.00, R3[0] 1.00 |
| S2 | (-21.4, 5.8, 13.5) | 4.2 | 11 | R1[4] 0.72, R1[5] 1.00, R1[7] 1.00, R1[8] 0.72, R2[9] 1.00, R2[11] 1.00, R2[12] 0.71, takedown 3 officer 0.89, ladder foot: the cage stock ladder 0.71, the cage: the floor 1.00 (WORK), the cage: the south gate 1.00 |
| S2 | (-22.2, 5.8, 14.4) | 4.2 | 5 | R1[6] 1.00 (WORK), R2[10] 1.00 (WORK), R3[9] 1.00 (WORK), objective: the case 1.00 (WORK), objective: the e2e stand point 1.00 (WORK) |
| S2 | (-12, 5.8, 6.9) | 4.2 | 3 | R1[10] 0.59, R2[3] 0.60, cross aisle: east 0.59 |
| S2 | (-12, 5.8, 13.5) | 4.2 | 2 | R1[11] 0.69, R3[13] 0.69 |
| S2 | (0.5, 2.95, 13.5) | 1.3 | 3 | R1[14] 1.00, R2[20] 1.00, R3[16] 1.00 |
| S2 | (-16.2, 5.8, 9.6) | 0.2 | 1 | R2[6] 1.00 |
| S2 | (-21.4, 5.8, 6.9) | 0.2 | 2 | R2[14] 1.00, A1: the north end 0.95 |
| S2 | (-7.2, 5.8, 16.2) | 1.2 | 1 | R2[17] 0.87 |
| S2 | (-16.2, 5.8, 16.2) | 4.2 | 4 | R3[6] 0.63, R3[7] 0.79, R3[11] 0.79, R3[12] 0.69 |
| S2 | (-22.2, 5.8, 16.2) | 4.2 | 3 | R3[8] 1.00, R3[10] 1.00, the cage: the issue gate 1.00 |
| S2 | (-2.5, 2.95, 13.5) | 1.3 | 2 | connector: C3 near door 0.88, connector: C3 checkpoint 1.00 |
| S2 | (-21.4, 5.8, 1.9) | 4.2 | 1 | A1: the middle 0.67 |
| S3 | (-2.5, 2.95, 13.5) | 1.3 | 4 | R1[0] 1.00, R2[0] 1.00, R3[0] 1.00, connector: C3 checkpoint 1.00 |
| S3 | (0.5, 2.95, 13.5) | 1.3 | 2 | R1[1] 1.00, R2[1] 1.00 |
| S3 | (7.6, 5.8, 9.4) | 4.2 | 2 | R1[4] 0.81, R3[6] 0.74 |
| S3 | (10, 2.95, 12.8) | 1.3 | 1 | R1[5] 1.00 |
| S3 | (12.8, 5.8, 9.4) | 2.0 | 1 | R1[7] 1.00 |
| S3 | (14.5, 5.8, 13.2) | 0.9 | 1 | R1[8] 1.00 |
| S3 | (17.25, 5.8, 13.2) | 0.9 | 7 | R1[9] 1.00, R1[10] 1.00, R1[16] 1.00, R2[13] 1.00, R2[14] 1.00, R2[22] 1.00, R2[23] 1.00 |
| S3 | (17.85, 5.75, 15.7) | 0.8 | 2 | R1[11] 1.00, R1[15] 1.00 |
| S3 | (22.95, 5.75, 15.7) | 0.8 | 7 | R1[12] 1.00, R1[14] 1.00, R2[17] 1.00, R2[19] 1.00, R3[13] 1.00, R3[15] 1.00, the grille 1.00 |
| S3 | (22.95, 5.75, 16.95) | 0.8 | 4 | R1[13] 1.00 (WORK), R2[18] 1.00 (WORK), R3[14] 1.00 (WORK), the terminal 1.00 (WORK) |
| S3 | (20, 5.8, 13.2) | 0.9 | 4 | R1[17] 1.00, R2[15] 1.00, R2[21] 1.00, the window, outside 1.00 |
| S3 | (18, 2.95, -7.2) | 1.3 | 3 | R1[22] 1.00, R3[20] 1.00, the lobby 1.00 |
| S3 | (23.7, 2.4, -7.2) | 0.8 | 5 | R1[23] 1.00, R2[29] 1.00, R3[21] 1.00, the extract centre 1.00, the tour guard's spot 1.00 |
| S3 | (-3, 5, -8.35) | 0.4 | 1 | R2[6] 1.00 |
| S3 | (17, 5, -8.35) | 0.2 | 2 | R2[9] 1.00, R2[27] 1.00 |
| S3 | (18.26, 5.8, -2.6) | 0.4 | 4 | R2[10] 0.83, R2[11] 0.83, R2[25] 0.67, R2[26] 0.83 |
| S3 | (20.4, 5.75, 15.7) | 0.8 | 2 | R2[16] 1.00, R2[20] 1.00 |
| S3 | (21, 5, -8.35) | 0.2 | 2 | R2[28] 1.00, the hatch edge 1.00 |
| S3 | (0.5, 2.95, 16.5) | 1.3 | 1 | R3[1] 1.00 |
| S3 | (5, 2.95, 15) | 1.3 | 2 | R3[2] 0.76, R3[4] 0.62 |
| S3 | (7.6, 5.8, 3.4) | 4.2 | 1 | R3[7] 1.00 |
| S3 | (18, 3.55, -3.3) | 1.9 | 3 | R3[11] 1.00, R3[17] 1.00, plant room west door, inside 1.00 |
| S3 | (22, 3.55, -3.3) | 1.9 | 3 | R3[12] 1.00, R3[16] 1.00, the grate 1.00 |
| S3 | (20, 3.55, -3.3) | 1.9 | 1 | the engineer's panel 1.00 (WORK) |
| S3 | (17.85, 5.75, 16.95) | 0.8 | 1 | the clerk 1.00 (WORK) |
