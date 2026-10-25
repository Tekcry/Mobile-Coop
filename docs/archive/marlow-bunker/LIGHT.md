# marlow-bunker - light before / after

`tests/ctcourseLight.test.ts` (the real ctcourse bake in node, `CTLIGHT_PRINT=1` prints it). Before: master b125599e
(course-ready S2 tuning, `tests/ctcourseLight.tuned.json`). After: this branch. Body = a standing 1.7 m body, the
brighter of chest and head; bands (`LIGHT`, bible L6): dark < 0.28, mid 0.28-0.6, lit >= 0.6.

## What changed and why the levels hold
- No moon underground (`sunIntensity` 0). Michael (2026-10-20) kept the open floor at 0.30: `lightLevel` stays 0.3, so
  the fill grid is 0.30 everywhere (was 0.25 fill + 0.05 moon under open sky, 0.25 in the moon's shadow). Points that
  were in the moon's shadow (behind the 4.4 m walls, by the north wall) gain 0.04-0.06; nothing else moves from it.
  `theme.ambient` 0.25 -> 0.3 so the render hemisphere matches the gameplay fill.
- The lamps that moved to a ceiling were compensated by measurement, not by the audit's first numbers: a strip or panel
  fitting bakes as an area light (samples along the fixture, `voxel/lampBake.ts`), softer and a little brighter at the
  edges than the old bare bulbs. Low cells 5 -> 4.35 at 0.9 (audit 0.83: the pool edges dropped 0.05-0.10), S4
  5 -> 5.35 at 0.85, S5 roof 6.8 -> 7.35 at 0.9 (was 1.1), annex panels 3.4 -> 3.85 at 0.8 (audit 1.0: +0.13 at the back
  room), S2 wall top 6.6 -> 7.35 at 0.5 with radius 7 -> 7.6 (the far drop), S7 wall top 6.6 -> 7.35 at 0.7 (radius 5
  kept: its light still reaches no ground), airlocks 4.6 -> 3.05 at 0.35 (the audit's number). The high halls' bay lamps
  stay at 5 as pendants: no change.
- The test now proves it: every one of the 196 points is within 0.08 of the tuned value, and a point changes band only
  where both values sit within 0.05 of the band edge. Largest change: S2 far drop 0.83 -> 0.77 (lit both). Band edges
  touched: S3 / S6 panel readers 0.62 / 0.60 -> 0.58 / 0.56, the S2 / S5 / S7 leg-up squares 0.57 -> 0.62 (moon shadow
  lifted), S5 back room 0.56 -> 0.62, S1 corner by the north wall 0.59 -> 0.60, and the S7 "corner" at x0 + 9.8, z 0.6
  (inside the return stair's bottom block: a body never stands there) 0.25 -> 0.30.
- The dark between the pools: the yard corners stay mid (0.45-0.61, no lit pool; the test keeps them under 0.65), the airlock lamps stay in their
  airlocks with the doors shut, the station 3 camera sees the same.
- Parity risk for the PC run (render only, not measured here): voxel surfaces take the sky bake's fill, which is about 0
  under a slab, so walls and floors between the pools may render darker than before at the same meter value (the
  darkness curve already renders 0.30 near black). GPU look (orchestrator, 99349d64, voxel path): the floor between
  the pools is not too dark. After smooth-world (#58, voxels off by default) the smooth path takes the same sky-bake
  fill: `tests/levelFillParity.test.ts` reads the same fill on both paths at every Marlow point under the ceilings (walls
  0.020, floors 0.036), so the default path renders as the look did.

## Every point
| Point | Before | After | Change |
| --- | --- | --- | --- |
| S1 route x0+0.6 | 0.80 | 0.80 | +0.00 |
| S1 route x0+4 | 1.00 | 1.00 | +0.00 |
| S1 route x0+7 | 1.00 | 1.00 | +0.00 |
| S1 route x0+9.8 | 1.00 | 1.00 | +0.00 |
| S1 route x0+12.5 | 1.00 | 1.00 | +0.00 |
| S1 route x0+15.4 | 0.93 | 0.95 | +0.02 |
| S1 route x0+8.4 | 1.00 | 1.00 | +0.00 |
| S1 panel reader | 0.60 | 0.61 | +0.01 |
| S1 panel face | 0.53 | 0.53 | +0.00 |
| A1 centre (shut) | 0.65 | 0.64 | -0.01 |
| A1 pad (shut) | 0.53 | 0.56 | +0.03 |
| A1 corner (shut) | 0.44 | 0.40 | -0.04 |
| A1 far door (shut) | 0.45 | 0.44 | -0.01 |
| S2 route x0+0.6 | 0.91 | 0.88 | -0.03 |
| S2 route x0+4 | 1.00 | 1.00 | +0.00 |
| S2 route x0+7 | 0.83 | 0.87 | +0.04 |
| S2 route x0+9.8 | 1.00 | 1.00 | +0.00 |
| S2 route x0+12.5 | 1.00 | 1.00 | +0.00 |
| S2 route x0+15.4 | 0.91 | 0.93 | +0.02 |
| S2 route x0+8.4 | 0.64 | 0.70 | +0.06 |
| S2 panel reader | 0.56 | 0.58 | +0.02 |
| S2 panel face | 0.50 | 0.52 | +0.02 |
| A2 centre (shut) | 0.65 | 0.64 | -0.01 |
| A2 pad (shut) | 0.53 | 0.56 | +0.03 |
| A2 corner (shut) | 0.44 | 0.40 | -0.04 |
| A2 far door (shut) | 0.45 | 0.44 | -0.01 |
| S3 route x0+0.6 | 0.99 | 0.93 | -0.06 |
| S3 route x0+4 | 1.00 | 1.00 | +0.00 |
| S3 route x0+7 | 1.00 | 1.00 | +0.00 |
| S3 route x0+9.8 | 1.00 | 1.00 | +0.00 |
| S3 route x0+12.5 | 1.00 | 1.00 | +0.00 |
| S3 route x0+15.4 | 0.91 | 0.92 | +0.01 |
| S3 route x0+8.4 | 1.00 | 1.00 | +0.00 |
| S3 panel reader | 0.62 | 0.58 | -0.04 |
| S3 panel face | 0.53 | 0.50 | -0.03 |
| A3 centre (shut) | 0.65 | 0.64 | -0.01 |
| A3 pad (shut) | 0.53 | 0.56 | +0.03 |
| A3 corner (shut) | 0.43 | 0.40 | -0.03 |
| A3 far door (shut) | 0.45 | 0.44 | -0.01 |
| S4 route x0+0.6 | 0.92 | 0.86 | -0.06 |
| S4 route x0+4 | 1.00 | 1.00 | +0.00 |
| S4 route x0+7 | 1.00 | 1.00 | +0.00 |
| S4 route x0+9.8 | 1.00 | 1.00 | +0.00 |
| S4 route x0+12.5 | 1.00 | 1.00 | +0.00 |
| S4 route x0+15.4 | 0.93 | 0.92 | -0.01 |
| S4 route x0+8.4 | 1.00 | 1.00 | +0.00 |
| S4 panel reader | 0.60 | 0.61 | +0.01 |
| S4 panel face | 0.53 | 0.55 | +0.02 |
| A4 centre (shut) | 0.65 | 0.64 | -0.01 |
| A4 pad (shut) | 0.53 | 0.56 | +0.03 |
| A4 corner (shut) | 0.44 | 0.40 | -0.04 |
| A4 far door (shut) | 0.45 | 0.44 | -0.01 |
| S5 route x0+0.6 | 0.91 | 0.88 | -0.03 |
| S5 route x0+4 | 1.00 | 1.00 | +0.00 |
| S5 route x0+7 | 0.83 | 0.83 | +0.00 |
| S5 route x0+9.8 | 1.00 | 1.00 | +0.00 |
| S5 route x0+12.5 | 0.84 | 0.81 | -0.03 |
| S5 route x0+15.4 | 0.65 | 0.64 | -0.01 |
| S5 route x0+8.4 | 1.00 | 1.00 | +0.00 |
| S5 panel reader | 0.61 | 0.60 | -0.01 |
| S5 panel face | 0.53 | 0.54 | +0.01 |
| A5 centre (shut) | 0.65 | 0.64 | -0.01 |
| A5 pad (shut) | 0.53 | 0.56 | +0.03 |
| A5 corner (shut) | 0.44 | 0.40 | -0.04 |
| A5 far door (shut) | 0.45 | 0.44 | -0.01 |
| S6 route x0+0.6 | 0.92 | 0.87 | -0.05 |
| S6 route x0+4 | 1.00 | 1.00 | +0.00 |
| S6 route x0+7 | 0.83 | 0.83 | +0.00 |
| S6 route x0+9.8 | 1.00 | 1.00 | +0.00 |
| S6 route x0+12.5 | 1.00 | 1.00 | +0.00 |
| S6 route x0+15.4 | 0.91 | 0.92 | +0.01 |
| S6 route x0+8.4 | 1.00 | 1.00 | +0.00 |
| S6 panel reader | 0.60 | 0.56 | -0.04 |
| S6 panel face | 0.53 | 0.50 | -0.03 |
| A6 centre (shut) | 0.65 | 0.64 | -0.01 |
| A6 pad (shut) | 0.53 | 0.56 | +0.03 |
| A6 corner (shut) | 0.44 | 0.40 | -0.04 |
| A6 far door (shut) | 0.45 | 0.44 | -0.01 |
| S7 route x0+0.6 | 0.91 | 0.88 | -0.03 |
| S7 route x0+4 | 1.00 | 1.00 | +0.00 |
| S7 route x0+7 | 0.83 | 0.83 | +0.00 |
| S7 route x0+9.8 | 0.86 | 0.87 | +0.01 |
| S7 route x0+12.5 | 1.00 | 1.00 | +0.00 |
| S7 route x0+15.4 | 0.91 | 0.93 | +0.02 |
| S7 route x0+8.4 | 0.64 | 0.70 | +0.06 |
| S7 panel reader | 0.56 | 0.58 | +0.02 |
| S7 panel face | 0.50 | 0.52 | +0.02 |
| A7 centre (shut) | 0.65 | 0.64 | -0.01 |
| A7 pad (shut) | 0.53 | 0.56 | +0.03 |
| A7 corner (shut) | 0.44 | 0.40 | -0.04 |
| A7 far door (shut) | 0.45 | 0.44 | -0.01 |
| S8 route x0+0.6 | 0.92 | 0.87 | -0.05 |
| S8 route x0+4 | 1.00 | 1.00 | +0.00 |
| S8 route x0+7 | 0.83 | 0.83 | +0.00 |
| S8 route x0+9.8 | 1.00 | 1.00 | +0.00 |
| S8 route x0+12.5 | 1.00 | 1.00 | +0.00 |
| S8 route x0+15.4 | 0.81 | 0.84 | +0.03 |
| S8 route x0+8.4 | 1.00 | 1.00 | +0.00 |
| S8 panel reader | 0.58 | 0.56 | -0.02 |
| S8 panel face | 0.50 | 0.50 | +0.00 |
| S2 leg-up square | 0.57 | 0.62 | +0.05 |
| S2 leg-up square floor | 0.49 | 0.55 | +0.06 |
| S2 wall top z 3.5 | 0.54 | 0.59 | +0.05 |
| S2 wall top z 7 | 0.48 | 0.55 | +0.07 |
| S2 wall top surface z 4 | 0.65 | 0.72 | +0.07 |
| S2 far drop (32, 3.5) | 0.83 | 0.77 | -0.06 |
| S2 far door side (32, 6.4) | 1.00 | 0.97 | -0.03 |
| S2 far door side (33, 8) | 1.00 | 1.00 | +0.00 |
| S2 bolt | 0.98 | 0.93 | -0.05 |
| S4 release reader | 0.56 | 0.57 | +0.01 |
| S4 release face | 0.50 | 0.52 | +0.02 |
| S5 leg-up square | 0.58 | 0.62 | +0.04 |
| S5 leg-up square floor | 0.49 | 0.55 | +0.06 |
| S5 plate A body | 0.61 | 0.63 | +0.02 |
| S5 plate B body | 0.61 | 0.63 | +0.02 |
| S5 plate A surface | 0.74 | 0.71 | -0.03 |
| S5 hatch holder | 0.50 | 0.52 | +0.02 |
| S5 hatch frame | 0.56 | 0.55 | -0.01 |
| S5 roof lip | 0.70 | 0.72 | +0.02 |
| S5 hack panel | 0.65 | 0.67 | +0.02 |
| S5 hanging head | 0.69 | 0.76 | +0.07 |
| S5 medkit user | 0.79 | 0.76 | -0.03 |
| S5 medkit face | 0.67 | 0.64 | -0.03 |
| S5 back room centre | 0.56 | 0.62 | +0.06 |
| S6 scanner A user | 0.56 | 0.54 | -0.02 |
| S6 scanner B user | 0.53 | 0.54 | +0.01 |
| S7 leg-up square | 0.57 | 0.62 | +0.05 |
| S7 leg-up square floor | 0.49 | 0.55 | +0.06 |
| S7 rope holder | 0.94 | 0.93 | -0.01 |
| S7 strip | 0.85 | 0.80 | -0.05 |
| S7 stair step 1 (top) | 0.36 | 0.36 | +0.00 |
| S7 stair step 2 | 0.45 | 0.45 | +0.00 |
| S7 stair step 3 | 0.53 | 0.53 | +0.00 |
| S8 exit centre | 1.00 | 1.00 | +0.00 |
| S8 exit corner SE | 0.62 | 0.64 | +0.02 |
| S8 exit corner NW | 0.73 | 0.72 | -0.01 |
| S1 corner x0+0.6 z0.6 | 0.49 | 0.48 | -0.01 |
| S1 corner x0+0.6 z13.4 | 0.46 | 0.48 | +0.02 |
| S1 corner x0+8.3 z0.6 | 0.63 | 0.61 | -0.02 |
| S1 corner x0+8.3 z13.4 | 0.60 | 0.61 | +0.01 |
| S1 corner x0+9.8 z0.6 | 0.63 | 0.60 | -0.03 |
| S1 corner x0+9.8 z13.4 | 0.59 | 0.60 | +0.01 |
| S1 corner x0+15.4 z0.6 | 0.47 | 0.49 | +0.02 |
| S1 corner x0+15.4 z13.4 | 0.47 | 0.49 | +0.02 |
| S2 corner x0+0.6 z0.6 | 0.49 | 0.49 | +0.00 |
| S2 corner x0+0.6 z13.4 | 0.46 | 0.49 | +0.03 |
| S2 corner x0+8.3 z0.6 | 0.42 | 0.47 | +0.05 |
| S2 corner x0+8.3 z13.4 | 0.43 | 0.47 | +0.04 |
| S2 corner x0+9.8 z0.6 | 0.52 | 0.51 | -0.01 |
| S2 corner x0+9.8 z13.4 | 0.47 | 0.51 | +0.04 |
| S2 corner x0+15.4 z0.6 | 0.47 | 0.50 | +0.03 |
| S2 corner x0+15.4 z13.4 | 0.46 | 0.50 | +0.04 |
| S3 corner x0+0.6 z0.6 | 0.49 | 0.48 | -0.01 |
| S3 corner x0+0.6 z13.4 | 0.46 | 0.48 | +0.02 |
| S3 corner x0+8.3 z0.6 | 0.44 | 0.45 | +0.01 |
| S3 corner x0+8.3 z13.4 | 0.43 | 0.45 | +0.02 |
| S3 corner x0+9.8 z0.6 | 0.51 | 0.49 | -0.02 |
| S3 corner x0+9.8 z13.4 | 0.47 | 0.49 | +0.02 |
| S3 corner x0+15.4 z0.6 | 0.47 | 0.49 | +0.02 |
| S3 corner x0+15.4 z13.4 | 0.47 | 0.49 | +0.02 |
| S4 corner x0+0.6 z0.6 | 0.49 | 0.49 | +0.00 |
| S4 corner x0+0.6 z13.4 | 0.44 | 0.49 | +0.05 |
| S4 corner x0+8.3 z0.6 | 0.42 | 0.46 | +0.04 |
| S4 corner x0+8.3 z13.4 | 0.43 | 0.46 | +0.03 |
| S4 corner x0+9.8 z0.6 | 0.51 | 0.50 | -0.01 |
| S4 corner x0+9.8 z13.4 | 0.47 | 0.50 | +0.03 |
| S4 corner x0+15.4 z0.6 | 0.47 | 0.50 | +0.03 |
| S4 corner x0+15.4 z13.4 | 0.46 | 0.50 | +0.04 |
| S5 corner x0+0.6 z0.6 | 0.49 | 0.49 | +0.00 |
| S5 corner x0+0.6 z13.4 | 0.46 | 0.49 | +0.03 |
| S5 corner x0+8.3 z0.6 | 0.42 | 0.47 | +0.05 |
| S5 corner x0+8.3 z13.4 | 0.43 | 0.47 | +0.04 |
| S6 corner x0+0.6 z0.6 | 0.49 | 0.48 | -0.01 |
| S6 corner x0+0.6 z13.4 | 0.46 | 0.48 | +0.02 |
| S6 corner x0+8.3 z0.6 | 0.44 | 0.45 | +0.01 |
| S6 corner x0+8.3 z13.4 | 0.43 | 0.45 | +0.02 |
| S6 corner x0+9.8 z0.6 | 0.51 | 0.49 | -0.02 |
| S6 corner x0+9.8 z13.4 | 0.47 | 0.49 | +0.02 |
| S6 corner x0+15.4 z0.6 | 0.47 | 0.49 | +0.02 |
| S6 corner x0+15.4 z13.4 | 0.47 | 0.49 | +0.02 |
| S7 corner x0+0.6 z0.6 | 0.49 | 0.49 | +0.00 |
| S7 corner x0+0.6 z13.4 | 0.46 | 0.49 | +0.03 |
| S7 corner x0+8.3 z0.6 | 0.42 | 0.47 | +0.05 |
| S7 corner x0+8.3 z13.4 | 0.43 | 0.47 | +0.04 |
| S7 corner x0+9.8 z0.6 | 0.25 | 0.30 | +0.05 |
| S7 corner x0+9.8 z13.4 | 0.47 | 0.51 | +0.04 |
| S7 corner x0+15.4 z0.6 | 0.47 | 0.50 | +0.03 |
| S7 corner x0+15.4 z13.4 | 0.47 | 0.50 | +0.03 |
| S8 corner x0+0.6 z0.6 | 0.49 | 0.48 | -0.01 |
| S8 corner x0+0.6 z13.4 | 0.46 | 0.48 | +0.02 |
| S8 corner x0+8.3 z0.6 | 0.42 | 0.45 | +0.03 |
| S8 corner x0+8.3 z13.4 | 0.43 | 0.45 | +0.02 |
| S8 corner x0+9.8 z0.6 | 0.51 | 0.49 | -0.02 |
| S8 corner x0+9.8 z13.4 | 0.47 | 0.49 | +0.02 |
| S8 corner x0+15.4 z0.6 | 0.47 | 0.49 | +0.02 |
| S8 corner x0+15.4 z13.4 | 0.48 | 0.49 | +0.01 |
