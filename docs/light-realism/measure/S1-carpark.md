# light-realism L1: the S1 staff car park, measured before and after
Owner: Night Shift | Sector Ops Build. Status: current (L1 build, 2026-10-25).

Band: AS/NZS 1158.3.1 P11a (BRIEF A5): mean 14-35 lx, point minimum 3 lx on open ground (cells more than 0.6 m from a
car, pole or other solid; `luxGrid.ts` step 2b), U0 reported (`research/bands.md` 0.25, to verify). Plane y 0.1, lamps
added in lux (A14). Before: the L1 base 1cefe25e re-measured with the L1 tool (`luxGrid.ts`; the fold's levels, mean
0.98 lx). After: `campusOps-s1-after.json` (SVGs `campusOps-s1-after/`). Command: `node scripts/light-realism/lux-grid.mjs
--map campusOps --section 1 --out docs/light-realism/measure/campusOps-s1-after.json`.

## Before / after per S1 space
Columns per side: mean lx | min open ground | minAll | U0 (lux) | band | meter y 1.0: mean level, dark / lit share.

| Space | Band (avg / min lx) | Before | | | | | | After | | | | | | Mean |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Staff Car Park | 14 / 3 | 0.98 | 0.40 | 0.37 | 0.401 | fail mean+min | 0.282, 52% / 0% | **27.93** | **3.38** | 0.70 | 0.121 | **pass** | 0.960, 1% / 97% | +2750% |
| Barrier Lane | 3.5 / 0.7 | 0.88 | 0.37 | 0.37 | 0.420 | fail mean+min | 0.267, 75% / 1% | **8.30** | **0.83** | 0.68 | 0.100 | **pass** | 0.632, 2% / 49% | +843% |
| Gatehouse | 320 | 130.71 | 14.26 | 14.26 | 0.109 | fail mean | 0.935, 0% / 100% | 130.73 | 14.28 | 14.28 | 0.109 | fail mean | 0.938, 0% / 100% | 0% |
| Marsh Verge | - | 0.76 | 0.37 | 0.37 | - | no band | 0.242, 96% / 1% | 0.76 | 0.37 | 0.37 | - | no band | 0.242, 96% / 1% | 0% |
| Bin Store | 1.75 / 0.3 | 0.83 | 0.45 | 0.37 | 0.547 | fail mean | 0.260, 76% / 0% | 18.55 | 1.56 | 0.37 | 0.084 | fail max | 0.715, 9% / 61% | +2135% |
| Bike Shelter | 3.5 / 0.7 | 25.45 | 0.43 | 0.43 | 0.017 | fail max+min | 0.217, 92% / 0% | 28.49 | 0.58 | 0.58 | 0.020 | fail max+min | 0.389, 55% / 20% | +12% |
| Smoking Shelter | 3.5 / 0.7 | 0.52 | 0.37 | 0.37 | 0.712 | fail mean+min | 0.169, 100% / 0% | 0.83 | 0.37 | 0.37 | 0.445 | fail mean+min | 0.206, 75% / 0% | +60% |
| Delivery Yard | 20 | 29.46 | 0.37 | 0.37 | 0.013 | pass | 0.439, 46% / 27% | 29.53 | 0.37 | 0.37 | 0.012 | pass | 0.446, 43% / 27% | 0% |
| Forecourt | 7 / 2 | 18.92 | 0.37 | 0.37 | 0.020 | fail max+min | 0.373, 59% / 14% | 19.01 | 0.37 | 0.37 | 0.020 | fail max+min | 0.387, 51% / 14% | 0% |
| Plant Roof | - | 0.75 | 0.44 | 0.44 | - | no band | 0.250, 99% / 0% | 0.75 | 0.44 | 0.44 | - | no band | 0.250, 99% / 0% | 0% |
| Staff Entrance | 100 | 1.49 | 1.17 | 0.76 | 0.784 | fail mean | 0.328, 5% / 5% | 1.49 | 1.17 | 0.76 | 0.784 | fail mean | 0.328, 5% / 5% | 0% |

Car park at the meter's height: mean level 0.282 -> 0.960, dark 52% -> 1%, lit 0% -> 97% (CONFORMANCE L3 read 0.282 /
52% / 0%). U0 0.121 against the 0.25 to verify: reported only. No other S1 space got darker (L2-S1 owns them; for
information: the bin store now reads over its ceiling, 18.55 against 4.4 lx, from the north row's west columns; the
smoking shelter and bike shelter still fail as before).

## The columns (`campusS1.ts` `PARK_COLUMNS_W` / `PARK_COLUMNS_E`, `PARK_COLUMN_HEAD`)
13 twin-head columns, 26 heads: a 6.2 m pole, two 0.6 m arms along x (west and east) at y 6.10-6.20, each light point
0.8 m out at y 6.0. Every head: intensity 2.0, radius 10 (reach 16 m), cone tipped 0.2 along its arm (0.197 rad) with
outer 1.3 rad (tilt + outer 1.497, no light above the horizon). Worst 2 m lamp-grid column on campusOps: 18 of 24.

| Row | z | Poles (x) | Circuit |
| --- | --- | --- | --- |
| North (in R3) | -53 | -33.2, -24.8, -13.6 / 0.4 | west / east |
| Aisle | -62 | -33, -21 / -9, 3 | west / east |
| South (back-to-back line R0 / R1) | -71.5 | -36, -24.8, -13.6 / -2.4, 6 | west / east |

West circuit 16 heads, east 10 (every west pole west of every east pole; the feeder pillar's two breakers unchanged).
Lane floodlight: on its arm (+x, light point (9.8, 6.0, -66)), intensity 0.8 -> 0.5 (the east twin at x 6.8 spills into
the lane; with 0.8 the lane read 9.02 lx, over its 8.75 ceiling).

Why twins: a head 0.8 m off a 6.2 m pole shades a wedge behind its own pole, and in this engine a column 8-9 m away adds
only ~0.2-1.5 lx there (the falloff is brightest under the head and near the night floor by 9-12 m, calibration.md
section 3). Single-arm layouts measured 1.04 lx at best (probe 4a below); the second head on the same pole lights the
first one's wedge. Twin heads are the usual fitting on a back-to-back car-park line.

## Spacing against a real P11a layout
Ends with columns about 11 m apart along each row (8.4-12 m) and rows 9-9.5 m apart (13 poles over
the 42 x 24 m car park). A real P11a layout with 6 m columns and a forward-throw head (RAB fit, calibration.md section 3: brightest 3-6 m
out, still 11 lx at 12 m) puts columns 3-4 x the mounting height apart, 18-24 m. The engine needs them about twice as
close, because its downward cone is brightest under the head and at the night floor 9-12 m out: it cannot throw
forward like the real fitting.

## Open ground under 3 lx
None (0 cells). Near cover (left out of the minimum, kept in the mean): 131 cells, car 108, pole 15, other 8; the every-
cell minimum is 0.70 lx (in a car's lee). Nothing is dark by a cut circuit or a shot lamp in this measure (all lamps
on); a cut breaker darkens its half to the standby fill (0.37 lx), unchanged.

## The A14 overlap read (picture against lux)
The engine adds lamp levels; the lux sum adds lamps in lux. With twin heads the overlap is large: 750 of 974 car-park
cells show level 1.0 (fully lit, "178 lx" on the curve) while their lux sums run 6.6-104 lx. The brightest overlap,
(-33, -54) by the north-west twin: level 1.0, 103.96 lx. Typical: (-7, -57) level 1.0, 8.61 lx; (-19, -66) level 1.0,
13.98 lx; (-30, -62) level 1.0, 47.59 lx. The picture, the meter and the guards read the whole car park as fully lit;
the lux numbers on the sign-off page are the real reading. The engine change that would make them agree is PLAN L1's
(not taken, A14).

## Probes (baked, `lux-grid.mjs ... --section 1`, ~90 s each; layout chosen first on a scratch no-bake model)
| Probe | Layout | Park mean / open min (lx) | U0 | Notes |
| --- | --- | --- | --- | --- |
| Step 3 | 14 single heads on arms, i 0.9, r 12, outer 1.15 (no tuning) | 3.53 / 0.47 | 0.132 | meter mean 0.524 (PLAN ~0.50) |
| 4a | 18 single heads, rows -53 / -62 / -71.5, i 1.6 / 2.4 / 2.0, r 12, outer 1.3 | 25.76 / 1.04 | 0.040 | own-pole wedges (51 cells) |
| 4b | 13 twins, north row -30.4 / -19.2 / -8 / 3.2, i 2.0, r 10, tilt 0.2, outer 1.3 | 29.65 / 3.38 | 0.114 | lane 9.02 lx: over its ceiling |
| 4c | 4b, lane floodlight i 0.5 | 29.63 / 3.38 | 0.114 | lane 8.32 / 0.83 pass; a route point (-31, -53) 0.6 m off a pole |
| 4d | 4c, north row -33.2 / -24.8 / -13.6 / 0.4 (clear of the route) | **27.93 / 3.38** | 0.121 | final; after measure equal |
