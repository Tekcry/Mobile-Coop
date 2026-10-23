# LR16-POLISH part F - bounce face-glow strips, cache-key note, S3 dead lamp (build)

Builder: Opus 5.5, 2026-10-24. Brief `briefs/LR16-POLISH.md` "Part F" (on `feature/sector-redesign-polish`) plus the
`lampBounce.test.ts` bake-time item moved here from part A (`checks/lr16pol-ad-check.md`). Branch
`feature/sector-redesign-lr16pol-f` off lr16int `e7cec732` (LR16g, LR16-L A + B, LR16-W, polish A, B, E).

## Items
| Item | Status |
| --- | --- |
| lr16-1 recheck 1 (face-glow strips) | Built, with two rules beyond the brief's (below). `LAMP_VERSION` 6 -> 7 |
| lr16-1 recheck 4 (cache-key note) | Built: the `BOUNCE` comment names `BOUNCE_SUB` / `BOUNCE_T_STEP` / `BOUNCE_T_FAR` / `BOUNCE_T_SHIFT` and the `bounceBits` rules |
| lr16dx 4 (S3 dead lamp) | Built, not done by W: LR16-W left `[23.2, -2.6, 6.5, 0]` (#81) as it was (`lr16w-s3-build.md` has no entry for it). Now `[22.15, -2.6, 6.5, 0]`, in line with #87 / #93 / #103; intensity 0, lit #80 untouched. `warehouseLamps.test.ts`: `LR16D_MOVED` maps it back to its grid cell (23.2, -2.6), as #87 / #93 |
| lr16-1 check 7 (bake-time ratio), from part A | Built: `lampBounce.test.ts` keeps the `console.info`, asserts `ms.bounce <= 0.5 x ms.vis` (2x the 0.25 budget), and says so in the test name |

## `bounceBits` (`src/voxel/lampBounce.ts`), the read unchanged
Measured first (probes, not committed): the brief's rule alone does not fix the thin-wall case and makes the gap sweeps
worse, so three rules were built, each checked on fixture sweeps:
1. **Second solid run (the brief's rule), from a centre inside a hull only.** From a solid centre whose code is the old
   "first air sub-cell" one, the code is dropped when a solid sub-cell lies between that air sub-cell and the
   neighbour's centre: the crate-hull case (warehouseOps, campusOps). Not from an air centre: there the first run is
   as often the wall and the second an object behind it, whose pocket is the neighbour's side; with the rule on air
   centres too, the 0.2 m gap sweep got worse (worst 0.167 -> 0.320) instead of better.
2. **Thin wall in the centre's sub-cell.** From a solid centre whose run has both ends inside the cell and its middle
   on this side, the code is at the run's middle, not at its grown end (0.1 m wall at 10.54: code 0.3 -> 0.15, so the
   points 0.05-0.15 m behind no longer read the lit home). The brief's rule cannot reach this case (one run, clear
   beyond it).
3. **Merged runs.** From an air centre, the code is at the middle of the run's first two sub-cells (a 0.2 m wall
   grown), not of the whole run: a wall and the hull of a crate 0.2 m behind it rasterise as one run, whose middle lay
   inside the crate (0.45 m), so the gap read the home on the far side. The `BOUNCE_T_FAR` test still uses the whole
   run: a floor slab's run (middle past 0.6 m) keeps code 0. (A first version tested FAR on the capped middle: every
   floor read at y 0.05 crossed into the floor, Marlow S5 leg-up square 0.60 -> 0.48. Caught by ctcourseLight, fixed.)
Rotated walls stay out of scope (none on the maps).

## Fixture sweeps (twoRooms, acceptance lamp 1 m from the face; the wall over its whole 1 m cell, 50 positions)
| Case | Before: worst (positions > 0.03) | After |
| --- | --- | --- |
| 0.1 m wall, lit room in front, max 0.05-0.25 m behind | 0.161 (10.54: 0.153; 10.58: 0.161) | 0.000 everywhere |
| 0.2 m wall, same | 0.153 (10.54, at 0.05 m) | 0.000 |
| Crate 0.6 m, gap 0.15 m to the wall, lit room past it | 0.307 | 0.039 (2) |
| gap 0.2 m | 0.167 (5) | 0.039 (2: 10.22 0.031, 10.30 0.039) |
| gap 0.3 m | 0.640 (12; 10.82-10.88 the hull-holds-the-centre case) | 0.000 |
| gap 0.4 m / 0.5 m | 0.640 / 0.571 | 0.000 / 0.000 |
| Mirror (crate behind the wall in the dark room, lit room in front), gap 0.2-0.5 | 0.307 / 0.640 / 0.640 / 0.571 | 0.031 / 0 / 0 / 0 |

The two left: the hull of crate and wall is one run, the centre sits on the wall's far face inside it (its value the
lit room's, 0.031-0.039), and the run runs on past the half cell, so no middle is known; crossing there broke other
positions (tried: 0.2 m gap 10.02 0.429).

The existing wall and slab sweeps (`wallProbe` / `slabProbe` at 50 offsets x d 1, 2): every lit mean, lit min and
behind value identical to the base (200 rows, 0 changed), so the lit side is not lower anywhere.

## Real maps (full bakes)
| Point | Before | After |
| --- | --- | --- |
| warehouseOps (0.2, 1.5, 11.70-11.85) | 0.062 (11.65: 0.004) | 0.004 |
| campusOps (-30.2, 1.0, -46.6 / -46.65 / -46.7) | 0.076 / 0.074 / 0.072 | 0.000 |

(The recheck's 0.36 / 0.05 were before LR16g's re-level; the mechanism is the same: the home's +z / +x code crossed past
the crate's or the counter's hull into the next room. Now that code is 0.)

Cross-wall share (my scan, the recheck's scratch being deleted: 0.25 m grid, y 0.6 / 1.1 / 1.5, body-clear = no solid
on a 0.1 m raster within 0.25-0.29 m; share = the part of the read taken from corners whose centre is across a solid
from the point; the scan's read matches `bounceAt` at every point):
| Map | Points | > 0.01 / 0.03 / 0.1 / 0.2 before | after | Worst before / after |
| --- | --- | --- | --- | --- |
| ctcourse | 76,096 | 12 / 2 / 0 / 0 | 12 / 2 / 0 / 0 | 0.036 / 0.036 |
| warehouseOps | 59,883 | 4 / 0 / 0 / 0 | 4 / 0 / 0 / 0 | 0.012 / 0.012 |
| campusOps | 210,412 | 241 / 56 / 0 / 0 | 241 / 56 / 0 / 0 | 0.059 / 0.059 |

No change at body-clear points, as expected: the strips sit within ~0.25 m of a face (the picture's tap), not where a
body stands. The specific points above are where it shows.

## Parity, cost, cache
- The read (`BounceGrid.sampleInto`, `nsGrid2`, `tests/helpers/bounceRead.ts`) is unchanged; bounceGrid's field vs
  GLSL-port parity test passes.
- Bake time of the bounce (bits included): ctcourse 606 -> 604 ms, warehouseOps 1254 -> 1251 ms, campusOps 3767 ->
  3712 ms (noise; limit +5%). ctcourse bake-time line in the test: bounce +8.0% of visibility.
- `LAMP_VERSION` 7 (`src/voxel/lampJobs.ts`, with the history line). No wire / protocol / save change.

## Tests
- `npx tsc --noEmit` clean; `npm run lint` 0 errors (eslint on the changed files clean).
- vitest `--maxWorkers=2` (slot lock): lampBounce (new: thin wall, crate-and-wall gap sweep; bake-time bound),
  bounceGrid, lampBake, lampBoxAlign, lightField, lampFalloff, warehouseLamps, warehouseS1Light, warehouseS2Light,
  warehouseS3Light: all pass (110 + lampBounce's own). ctcourseLight: 21 pass, 1 skipped, 1 fail = the expected S7
  stair red (`S7 stair step 1 (top): 0.31 < 0.33`, also on the base); the tuned-levels check holds (within 0.08).
- `node scripts/lamp-audit.mjs --map=warehouseOps --no-views --json`, base vs this branch: the same 10 flagged lamps
  (14, 15, 16, 20, 21, 32, 33, 44, 52, 71); the only row change is #81 (0.20 m -> 1.05 m off its wall, unflagged
  both). (The committed `lr16-lamp-audit.md` table is older than LR16-W; not regenerated here.)

## Laptop
`e2e-lightbake` on the merged sha (cache key v7, every shader <= 16 textures; the bits ride the same texture).

## Risks
- Rule 1 off for air centres keeps the old crossing where an air centre has a thin object, then a wall in the same
  half cell (no fixture leaked; the brief's literal rule made the gap sweeps worse).
- Two 0.2 m-gap wall positions keep 0.031-0.039 in the gap (from 0.031 / 0.141).
- Every map re-bakes once (key v7).
