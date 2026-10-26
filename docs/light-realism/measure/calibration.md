# light-realism - lux calibration (L0)

Owner: Night Shift | Sector Ops Build. Status: L0 build + reference fold, 2026-10-25. Code: `src/world/lux.ts` (the curve, the band
check), `scripts/light-realism/calibrate.ts` (the reference test), pinned by `tests/lux.test.ts`. Print the test:
`node scripts/light-realism/lux-grid.mjs --calibrate`.

## Result in one line
Verdict: **chosen, not measured**. The reference is now a real fitting (RAB Lighting ALEDS3T, 6 m, numbers only:
Michael's pick 2026-10-25 ~21:00), but the engine's column cannot match its shape: RMS level error **0.318** against
the 0.03 pass line (worst point 0.454, at 9 m). So the anchors stay BRIEF A2's chosen mapping (A13): the anchors are
chosen, not measured. For the S1 sign-off page (`SIGNOFF.md`, "How bright counts as lit"): "the anchors are chosen,
not measured (tested against one real car-park light: the game's lamp throws its light too close to the pole to match
it, RMS level error 0.318)". The GPU "before" run (section 4) is still pending.

## 1. The curve
`level = 0.28 + 0.32 x log10(lux)`, clamped 0..1; back: `lux = 10 ^ ((level - 0.28) / 0.32)`.
- Anchors (A2): 1 lx = 0.28 (`LIGHT.shadow`, the meter's dark line), 10 lx = 0.60 (`LIGHT.lit`). One place to change
  them: `LUX_ANCHORS` in `src/world/lux.ts`.
- Ends: level 0 = 0.13 lx (`LUX_FLOOR`), level 1 = 178 lx (`LUX_CEIL`). Brighter reads fully lit.
- Why a log curve and not one lux-per-level constant: the bands span 0.3 lx to 500 lx (over 1000:1); a linear constant
  either whites out every interior or puts every car park under the dark line (`research/bands.md` section 2). Lamps
  still add linearly in the engine; the curve only labels a summed level, so the picture, the meter and the guards are
  unchanged by it (light parity by construction).
- Measurement only: no file under `src/game`, `src/ai`, `src/vfx`, `src/player`, `src/voxel` or
  `src/world/lightField.ts` imports it (grep test in `tests/lux.test.ts`).

## 2. Night-floor check
| Engine floor | Level | Reads as | Real reference |
| --- | --- | --- | --- |
| Moon (campus theme, `moonLight` = 0.3 x 0.16 / 0.46) | 0.104 | 0.28 lx | full moon on open ground 0.05-0.3 lx |
| Standby fill (`ambientZone` 0.14) | 0.14 | 0.37 lx | escape-route emergency minimum 0.2 lx (AS/NZS 2293, to verify) |
| Moon + standby fill (S1 open ground, no lamp) | 0.244 | 0.77 lx | moonlight plus sky glow |
| Transit fill | 0.30 | 1.15 lx | |

All four pinned in `tests/lux.test.ts` (to 0.01 lx); the moon's 0.104 is read from `campusOps.theme`.

## 3. The reference test (Q3: "one test that matches the game's brightness to real light units")
Method (PLAN L0, A13):
- Real side: one 6 m single-arm LED car-park column from its maker's published data, horizontal lux on the ground at
  0, 3, 6, 9, 12 m from the column's foot along the arm's axis (iso-lux diagram, or E = I(theta) x cos^3(theta) / h^2
  from the candela table), plus the night floor's 0.77 lx (the ground the engine compares has moon and sky too).
- Engine side: one fixed lamp at y 6.0 on a 0.8 m arm, the S1 columns' cone (1.15 rad, spot exponent 2) and reach
  (radius 12 x 1.6), `photoTerm` (`src/world/lampMath.ts:93`) x `LAMP_LEVEL_GAIN` 1.2 x intensity, on the campus night
  floor (0.244). Open ground, visibility 1, no bake. The field is direction-free (no N.L), so the real side is the
  standards' horizontal plane (A3).
- Fit: the one free number is the intensity that stands for the fitting's output (also given per 1,000 lm), solved by
  least squares on level with the A2 curve fixed. Pass ("measured"): RMS level error <= 0.03 (about 25% in lux on the
  A2 slope) and every point within 0.05.
- Beside it, the free fit: the 10 lx anchor and the intensity solved together, the 1 lx anchor held at 0.28.
  (Deviation from PLAN L0's "two anchors + intensity": one fitting cannot fix both anchors and the intensity. When the
  engine's shape matches the real one, every anchor pair with a matching intensity fits equally well, so one anchor has
  to be held; the dark line is the one the meter and the bible fix.)

### Engine side: the S1 column today (intensity 0.9), open ground
| Distance from the foot | Falloff x cone | Level | Lux on the curve |
| --- | --- | --- | --- |
| 0 m | 0.256 | 0.520 | 5.64 |
| 3 m | 0.206 | 0.466 | 3.81 |
| 6 m | 0.082 | 0.332 | 1.46 |
| 9 m | 0.013 | 0.258 | 0.85 |
| 12 m | 0.001 | 0.245 | 0.78 |

Read: with no pole hiding it (the L1 arm) one S1 column gives about 5.6 lx under itself and falls to the night floor
by 9-12 m. With the arm fix the S1 grid's mean reads about 4.8 lx (PLAN section 0's probe), between P11c (3.5 lx) and
P11b (7 lx), short of P11a (14 lx). L1 tunes intensity and spacing to the band; the curve is not changed for it.

### Real side: RAB Lighting ALEDS3T (numbers only)
- Fitting: RAB Lighting ALEDS3T, 80 W 5000 K Type III area light, 10,742 lm, IES test DLF2207109-4a (Deliver Co.,
  2022-07-29). Source: https://www.rablighting.com/downloads/ies/aleds3t-80w-5k-dlf2207109-4a.ies (product page
  https://www.rablighting.com/product/ALEDS3T). Numbers only, file not committed: the maker's terms of use bar
  commercial use and copying of the file, so only the five ground readings below are used (credit:
  `docs/art-credits.md`). No IES or datasheet file is in the repo, the bundle or any shots branch.
- Michael picked (2026-10-25 ~21:00): "Yes, numbers only (Recommended)".
- Method: E = I(theta) x cos(theta) / d^2 on the ground (= I cos^3 / h^2) from the candela table, linear on the
  vertical angle, C0 forward, 6 m mount, 0.8 m arm toward the points. `REFERENCE` in `calibrate.ts`.

| Distance | Real lx | Real level (+ 0.77 lx floor) | Engine level | Engine lx | Error (level) | Error (lux) |
| --- | --- | --- | --- | --- | --- | --- |
| 0 m | 32.1 | 0.765 | 0.934 | 110.3 | +0.168 | +236% |
| 3 m | 53.9 | 0.836 | 0.798 | 41.6 | -0.038 | -24% |
| 6 m | 47.7 | 0.819 | 0.465 | 3.8 | -0.355 | -92% |
| 9 m | 25.4 | 0.734 | 0.279 | 0.99 | -0.454 | -96% |
| 12 m | 11.2 | 0.625 | 0.246 | 0.78 | -0.379 | -94% |

Fitted intensity: **2.246** (0.209 per 1,000 lm). RMS level error: **0.318**; worst point 0.454 (9 m).
Verdict: **chosen, not measured** (pass needs RMS <= 0.03 and every point within 0.05).

Free fit (1 lx held at 0.28): the best slope runs to the search range's flat end (10 lx = 0.330, RMS 0.070): no curve
slope fits, because the miss is the lamp's shape, not the curve. (The L0 build's fixed-point free fit stopped at a
worse point than A2 on this data; it is now a slope search with the intensity solved per slope, `FREE_SLOPE`.)

Read: the real fitting throws forward (Type III, peak 5,659 cd at 58 degrees from straight down) and is brightest 3-6 m
out, still 11 lx at 12 m; the engine's column (downward cone, photometric falloff) is brightest under the pole and is at
the night floor by 9-12 m. One intensity cannot fit both ends. For L1: a real P11a layout counts on that forward throw,
so the engine columns need closer spacing, more reach or a cone tipped toward the bays to spread like a real one (map
data, not the curve); the A2 anchors are not changed by this test.

## 4. GPU check (the "before" run at the L0 head)
`scripts/light-realism/shots.mjs` on the laptop queue alone slot (laptop request
`20261025T092215-night-shift-sector-o-8e20a7a7-af43`, set `light-realism-l0`, at 8e20a7a77): S1 at Low and Epic on an
RTX 4090 Laptop GPU (ANGLE D3D11), 1280 x 720, 2,278 grid points over 11 spaces, 12 named meter points, 5 views and a
30 s Epic fly-through. Files: branch `shots/light-realism-s1`, folder `before-campusOps-s1-2026-10-25-10-18/` (10 PNGs,
`flythrough-epic.webm`, `shots.json`). Neither run logged a page error.

Meter against field (the light meter's reading against the field at the same point; a split over 0.02 goes to J11
through the lead, not fixed here):
- Low: **1** split over 0.02, at "far east" (5, -60): meter 0.283, field 0.262 at body height, split **+0.021**.
- Epic: none; the worst is the same point, +0.019. Every other named point splits by 0.008 or less ("under column"
  -0.008, "south edge" +0.001, the rest 0).

Bible L5 display targets per view (luma of the open-ground spots within 0.03 of each target level; **advisory**: the
ground is not the grey card the targets are set on, `shots.mjs` reports and never fails them). Cell = mean luma (spots);
"in" = inside the target's band, "out" = outside.

| View | Preset | 0.12: 0-0.04 | 0.27: 0-0.09 | 0.40: 0.12-0.35 | 0.70: 0.45-1 |
| --- | --- | --- | --- | --- | --- |
| wide-sw | Low | 0.028 (112) in | 0.039 (907) in | 0.068 (29) out | 0.065 (8) out |
| wide-sw | Epic | 0.020 (112) in | 0.033 (907) in | 0.070 (29) out | 0.061 (8) out |
| overhead-s | Low | 0.030 (113) in | 0.026 (897) in | 0.071 (34) out | 0.084 (10) out |
| overhead-s | Epic | 0.031 (113) in | 0.027 (897) in | 0.076 (34) out | 0.084 (10) out |
| row-z53 | Low | 0.038 (87) in | 0.036 (774) in | 0.026 (26) out | 0.022 (5) out |
| row-z53 | Epic | 0.033 (87) in | 0.029 (774) in | 0.024 (26) out | 0.022 (5) out |
| aisle-e | Low | 0.019 (79) in | 0.029 (554) in | 0.030 (17) out | 0.023 (4) out |
| aisle-e | Epic | 0.015 (79) in | 0.027 (554) in | 0.029 (17) out | 0.023 (4) out |
| forecourt-w | Low | 0.051 (30) out | 0.035 (327) in | 0.099 (32) out | 0.104 (10) out |
| forecourt-w | Epic | 0.057 (30) out | 0.037 (327) in | 0.100 (32) out | 0.102 (10) out |

Read: the dark levels (0.12, 0.27) land in their bands in every car-park view; the lit levels (0.40, 0.70) read far
under their bands everywhere (luma 0.02-0.10 against 0.12 and 0.45 minimums): the before picture is darker than the
bible's display targets wherever a lamp lights the ground, on both presets alike. Few spots sit at those levels (4-34
per view), which is the "before" car park's shortage of lit ground. The after run (L1 step 7) repeats this table.

## 5. Lamps add in lux (L0 check, lead note 1; BRIEF A14)
The engine adds lamps in level and the curve is a log, so a summed level read on the curve over-reads overlaps. The
measure now adds them in lux: each baked lamp is read alone (`LightField.lampAt`), its lux is what the curve gives it
alone over the reference floor (0.244, `LAMP_LUX_BASE`) less that floor's 0.77 lx (`lampLux`), and a cell's lux is its
non-lamp part (ambient, moon, bounce) on the curve plus every lamp's lux (`sumLux`). One lamp alone reads exactly as
before; the band check reads the sum (`bandCheck(levels, band, lux)`; `luxGrid.ts`).

| Case (S1 column, intensity 0.9, open ground) | Summed level | Lux on the curve (old) | Lux added (now) |
| --- | --- | --- | --- |
| One column, under it | 0.520 | 5.64 | 5.64 |
| Two columns lighting one point fully | 0.796 | ~41 | 10.5 |
| Mid-point of two columns 6 m apart (3 m from each) | 0.688 | ~18.8 | 6.85 |

Pinned in `tests/lux.test.ts` ("lamps add in lux"). The picture, the meter and the guards still add levels, so an
overlap looks brighter than its lux reading; the engine change that would make them agree is written in PLAN L1 (not
taken: engine files, every map's look). The S1 "before" measure (`measure/campusOps-s1.json`) predates this; L1's
"after" measure uses it.
