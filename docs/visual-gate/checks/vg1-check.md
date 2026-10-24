# VG1 check - picture metrics (fresh Opus checker, 2026-10-24)

Verdict: PASS

Reviewed `git diff 0b7f46f4 84ddc14c` (`scripts/visual-gate/metrics.mjs` 644 lines, `tests/visualGateMetrics.test.ts`
377 lines, `docs/visual-gate/checks/vg1-build.md`) against `briefs/VG1.md`, PLAN.md sections 2 and 4, BRIEF.md A13 / A15
and F1-F8. No wrong result, every target has a metric that goes red, and the tests catch mutations. The polish list
below has one item worth doing before P5 (arc orientation gap).

## 1. API vs brief / PLAN
- All 17 exports are present with the brief's signatures; the contract typedefs are copied verbatim (metrics.mjs:1-11).
- `lumaFromRgba` uses Rec. 709 with `Math.round` and ignores alpha (:30-38). `maskFromPolygon` uses even-odd fill, a
  half-open crossing rule, pixel centres covered by `[ceil(xa-0.5), ceil(xb-0.5))`, clipping by the raster, and returns
  empty for fewer than 3 points (:57-89). `erode` is a separable sliding count with the outside counted as 0, O(wh) per
  pass (:100-128).
- `stats` (:152-181): counting sort, nearest-rank percentiles (`levelAt` :136-144), nearBlack <= 10, and a 32-bin hist
  (`floor(v*32/255)` clamped, equal to `v >> 3` for v < 255, checked). `emd` (:190-211) normalises both, uses
  `/ (bins-1)` and throws on unequal lengths.
- `haze` (:288-307), `blotch` (:316-337), `arc` (:351-396), `leak` (:405-423) and `measure` (:433-453) follow the brief's
  formulas. `blotch` erodes by 24, so every r 24 window it reads is fully inside the image (no edge clamping in play).
- `DARK` (:456-461) matches `src/world/darkCurve.ts:86-90` value for value, and the test deep-equals it with the live
  import (test:265). `BAND_EDGES` matches lights.ts:89, :91. `parityRange` (:479-514) gives these ranges: row match
  0.12 -> 0-0.06; 0.27 -> 0-0.11; 0.4 -> 0.10-0.37; 0.7 -> 0.43-1. Band union: dark 0-0.11, mid 0.10-0.37, lit 0.43-1,
  as A15 says. A row match never lands in another band unless the level is also within the edge-skip zone (0.28-0.30
  matches row 0.27 but skips), so a card is never checked against the wrong band.
- `FLOORS` (:517-528) equals PLAN section 4. `compare` (:555-612) and `checkRules` (:624-644) follow the brief: missing
  regions are skipped, leak is never compared, a rule outside its preset is skipped, null bounds are skipped, and
  `known` is carried through.

## 2. Builder deviations: all sound
1. **arc Sobel / 8.** An unnormalised Sobel of a 1-level/px ramp reads 8 levels, so the 6/255 floor would mark the
   brief's own 40 px smoothstep disc (peak slope 3.75 levels/px) as a ridge. Mutation M1 below confirms the brief's
   test then fails. Dividing by 8 makes the floor mean "6 levels per pixel", and the `4 x median` term scales either way.
2. **haze contrast / eroded-mask mean.** The Laplacian is averaged over the eroded mask, so its mean is the matching
   denominator. Fog lifts the mean and lowers the Laplacian, so both push contrast down (the right direction for F1 / F8).
3. **compare tol.** The reported tol is the |delta| threshold that was actually crossed. For mean this is
   `max(meanAbs, meanRel*base)`, which is right because both conditions must hold. For blotch and arc it is
   `max(base*(ratio-1), abs)`, equivalent to `cur > base*ratio`. The flag decision is exactly the brief's.
4. **parityRange edges.** The row match is inclusive with 1e-9 slack. The edge skip is strict. Results are rounded to
   1e-9. All consistent with A15.
5. **Several scratch arrays per call, none per pixel.** This meets the brief's intent, which is no per-pixel allocation
   and no module state. Inner loops allocate nothing.
6. **Extra guards** (short RGBA buffer, unknown metric, empty-mask stats): harmless.

## 3. Targets F1-F8: which metric goes red on the bad build and stays green on the fixed one
Synthetic probes were run in node, nothing written:
- **F1 strip fog cones / F8 campus fog beams (haze, upper region).** Textured dark girders (15/45 levels) under a soft
  50% fog cone:

  | Cone coverage | contrast | mean | veil |
  | --- | --- | --- | --- |
  | 0% | 0.120 | 0.121 | 0.059 |
  | 15% | 0.085 (-29%) | 0.168 | 0.059 |
  | 30% | 0.062 | 0.218 | 0.059 |
  | 60% | 0.037 | 0.318 | 0.059 |

  Contrast (drift floor -25%) and region mean go red on the bad build. On the fixed build without cones they stay
  green. Veil is p5, so it moves only when fog covers more than 95% of the region: see polish item 2.
- **F2 bay floor near black (floor nearBlack).** The share of floor pixels at luma <= 10 falls when the gaps between
  pools are lifted. The drift floor is 0.08 absolute, plus VG8's `nearBlack <= X` rule. This is a direct count, so no
  risk.
- **F4 hard arcs (wall arc).** A hard disc edge reads, as ridge pixels per circumference pixel: S = 20 levels 0.75,
  30: 1.26, 60: 2.46, 100: 3.3. The 40 px smoothstep edge reads 0 and ±8 noise reads 0. The fixed (soft, LR16b) build
  stays at about 0. The bad build's spot-cone edges are conics (curved), so they always cover the detected
  orientations. The pool-vs-dark steps are far above the 18-level floor (G ≈ S/3 after the r 1 blur, so S must be
  > 18). F4 is caught.
  Weakness: a straight hard edge at 20-32° (and 58-70°) reads 0 even at S = 60 (S = 100 is blind at 25-28°), because
  the rounded tangent (1,0) or (1,1) walks out of the 2-4 px ridge band within 12 steps. See polish item 1.
- **F5 / F5b torch leak (rig leak).** `max(0, on-off)` mean and p95 over the door and wall quad. Bad build: a lit
  patch on the door gives a positive mean. Fixed build: on ≈ off. Absolute rules only (never drift). The test checks
  the patch share and the clipping of negative differences.
- **F6 Marlow dark (whole mean, nearBlack, parity).** Mean and nearBlack drift plus absolute rules. `parityRange` gives
  each card its row or band range, as A15 says. Covered.
- **F7 Low blotch (wall blotch).** The r 3 - r 24 band-pass picks up 7-48 px lumps: 0.0255 vs ramp 0.00042 (60x), and
  fine checker noise reads 0.001. The fixed build's smooth falloff cancels, so it stays green. Condition: the wall
  region must be at least 49 px in both axes on screen (erode 24); at 40 px the eroded mask is empty and blotch returns
  0 (probe). See polish item 3.

## 4. Tests really test (mutations, each restored with `git checkout -- scripts/visual-gate/metrics.mjs`)
| # | Mutation | Result |
| --- | --- | --- |
| M1 | arc without `/ 8` (:364) | red: arc smoothstep / noise test |
| M2 | compare mean AND -> OR (:558) | red: 2 compare tests |
| M3 | blotch erode 24 -> 3 (:318) | red: 3 blotch tests |
| M4 | checkRules ignores `presets` (:630) | red: preset test |
| M5 | parity skip ignores the 0.6 edge (:506) | red: band-union / skip test |

After the restore: `npx vitest run tests/visualGateMetrics.test.ts --maxWorkers=2` gives 38 / 38 pass in 627 ms.
`git status` is clean apart from this report.

## 5. Imports, network, cost
- `grep -nE "^import|require\(|fetch|node:|babylon"` finds no code match, only two comments (:455, :463). No globals.
  Every function is pure.
- `measure` on 960 x 540 with 3 regions (wall: blotch + arc, upper: haze, floor) runs in 87.6 ms (mean of 10) on the
  loaded desktop, well under the 150 ms target. The builder measured 91 ms.

## Polish list (none blocks)
1. **arc orientation gap (do before P5; cheap).** At :380-391, step along the exact tangent and round the accumulated
   position (`px = Math.round(x + k*tx)`, `py = Math.round(y + k*ty)`, k = ±1..11) instead of the rounded unit step.
   This closes the 20-32° and 58-70° blind sectors for straight hard edges. Add a test: a straight hard edge (S = 60)
   at 25° gives arc > 0.
2. **veil is blind to partial beams.** p5 does not move until fog covers more than 95% of the region. VG8 should base
   F1 / F8 on `contrast` (and mean / hist drift), not `veil` alone. Alternatively, VG3 can make the upper region tight
   around the beam.
3. **blotch returns 0 silently on a small region.** A region under 49 px in either axis erodes to nothing, and blotch
   then returns 0, so a `blotch <= X` rule passes on the bad build. Two fixes:
   - VG3 / VG5 keep wall regions at least about 60 px in both axes at 960 x 540.
   - VG5 reports "region too small" instead of trusting 0. VG1 could return the eroded pixel count for this.

   haze `contrast` 0 on an empty mask fails safe (it would flag `contrast >= Y`).
4. **emd against a region with n = 0.** An all-zero hist (region off-screen on one side) against a normal one gives a
   spurious `hist` flag. Skip hist when either side has n = 0.
5. **Cost (only if VG5 needs it).** `haze` and `arc` each build their own r 1 blur. `measure` computes a haze region's
   stats twice. The arc median uses a full float sort. A shared r 1 blur per shot and a quantised median would cut cost
   by about a third.
6. **Exact edge skips are float-dependent.** Levels exactly 0.03 from an edge (0.25, 0.31, 0.57, 0.63) skip or not
   depending on float rounding (the strict `<` at :506). Harmless; a 1e-9 slack would make it deterministic.
