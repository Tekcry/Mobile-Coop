# light-realism - lux calibration (L0)

Owner: Night Shift | Sector Ops Build. Status: L0 build, 2026-10-25. Code: `src/world/lux.ts` (the curve, the band
check), `scripts/light-realism/calibrate.ts` (the reference test), pinned by `tests/lux.test.ts`. Print the test:
`node scripts/light-realism/lux-grid.mjs --calibrate`.

## Result in one line
Verdict: **chosen, not measured**. No maker's web page found gives a 6 m car-park column's candela table or iso-lux
diagram in the page itself, so the anchors stay BRIEF A2's chosen mapping (A13): the anchors are chosen, not measured.
For the S1 sign-off page (`SIGNOFF.md`, "How bright counts as lit"): "the anchors are chosen, not measured".

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

### Real side: none found
Verdict: **chosen, not measured**. `REFERENCE` in `calibrate.ts` is `null`; the fit, its 5-point table and its RMS
error are written here when a fitting is entered (the test then pins them: fitted intensity and RMS within 0.005).

Search (2026-10-25, web pages only, nothing downloaded):
- Maker product and datasheet pages for 6 m car-park and area columns (Thorlux Juno and Brisa, LEDVANCE ECO AREA,
  ACA Lighting REXON on an IES viewer page): lumens, watts and distribution type in the page text, no candela values
  or iso-lux numbers (the viewer page loads its data from the IES file).
- Search results with candela tables (Cooper Lighting, RAB, Signify roadway reports): PDF reports or IES / LDT files,
  which A4 / A13 rule out without Michael's OK.
- Council car-park lighting plans with point lux grids (NSW): PDF files, same rule.

Undo (A13): Michael supplies a datasheet or allows one download (one 6 m car-park column's PDF or IES file); the lead
enters its 5 lux values in `REFERENCE`, re-runs `npx vitest run tests/lux.test.ts` and
`node scripts/light-realism/lux-grid.mjs --calibrate`, and writes the table and verdict here.

## 4. GPU check (the "before" run at the L0 head)
`scripts/light-realism/shots.mjs` on the laptop queue alone slot: S1 at Low and Epic, meter vs field at the named
points (a split over 0.02 goes to J11), pixel luma per grid point against bible L5's display targets, pushed to
`shots/light-realism-s1`. Queued 2026-10-25 at 8e20a7a77 as laptop request
`20261025T092215-night-shift-sector-o-8e20a7a7-af43` (set `light-realism-l0`); result: pending (the
`laptop-e2e/light-realism-l0` status and the `before-campusOps-s1-*` folder on `shots/light-realism-s1`).
