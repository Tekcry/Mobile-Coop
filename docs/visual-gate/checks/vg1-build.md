# VG1 build - picture metrics (Opus builder, 2026-10-24)

Done. Branch `feature/visual-gate-vg1` at 0b7f46f4 (uncommitted; the lead commits).

## Built
`scripts/visual-gate/metrics.mjs`: plain ESM, no imports, pure and deterministic, JSDoc typed; the contract typedefs
from briefs/VG1.md copied verbatim at the top. Exports, all per the brief: `lumaFromRgba`, `fullMask`, `maskFromPolygon`,
`erode`, `stats`, `emd`, `haze`, `blotch`, `arc`, `leak`, `measure`, `DARK`, `BAND_EDGES`, `parityRange`, `FLOORS`,
`compare`, `checkRules`.

Interpretations where the brief left a choice (none changes the contract):
1. `arc`: G = Sobel magnitude / 8, so G is the per-pixel luma slope (0..1). Unnormalised Sobel is 8x that, and then the
   6/255 floor would also mark the 40 px smoothstep edge (slope ~3.75 levels/px) as a ridge; /8 keeps the floor
   meaning "6 levels per pixel". Runs are traced over image pixels (not clipped to the mask); the 1 px image border has
   G = 0. Tangent step = (round(-gy/|g|), round(gx/|g|)), counting stops at 12.
2. `haze.contrast` divides by the mean luma of the same eroded-by-2 mask the Laplacian is averaged over (as `blotch`
   does with its eroded mask). Eroded mask empty -> contrast 0.
3. `compare` `tol` is the |delta| threshold that was crossed: mean max(meanAbs, meanRel x base); nearBlack / veil the
   floor; contrast base x contrastDrop; blotch / arc max(base x (ratio - 1), abs); hist the emd floor (base and delta
   null, cur = the emd).
4. `parityRange`: the row match is `<= 0.03` (1e-9 float slack, so 0.43 matches 0.4); the edge skip is strict `< 0.03`;
   min / max rounded to 1e-9 (so 0.12 - 0.02 reads 0.1). `band` is the level's own band: 0.29 is band `mid`, `row` 1
   (0.27), `skip` true.
5. `checkRules` splits the rule key at the last `.`; `min` is checked before `max` (one flag per rule).
6. Scratch: whole-image passes allocate a handful of typed arrays per call (summed-area table, blur, gradient, the
   median sort buffer, eroded masks), never per pixel. The brief said "one scratch array per call"; a single shared
   buffer would need a stateful module, which the "no globals" rule rules out.
7. Guards beyond the brief: `lumaFromRgba` throws on a short buffer; `measure` throws on an unknown metric name;
   `stats` of an empty mask is all zero.

## Numbers used
nearBlack luma <= 10; hist 32 bins = floor(v x 32 / 255) clamped to 31 (equals v >> 3); percentiles nearest rank;
haze blur r 1, erode 2, +0.03; blotch blurs r 3 and r 24 (window clamped at the edges), erode 24, +0.03; arc blur r 1,
Sobel / 8, T = max(6/255, 4 x median), run 12; parity row 0.03, pad 0.02, edge skip 0.03; FLOORS as the brief.

Values on the test images (256 x 160): blotch flat 0, ramp 0.00042, ramp + 40 px lumps 0.0255 (60x), 2 px checker
+-6 0.0010; arc hard disc 0.0253, 40 px smoothstep disc 0, noise +-8 0; haze stripes veil 0.118 / contrast 0.181,
with 50% fog 0.561 / 0.043.

## Tests (`tests/visualGateMetrics.test.ts`, 38 tests)
lumaFromRgba 1, masks (fullMask, rect exact, rotated square, clip, < 3 points, erode) 6, stats 3, emd 2, haze 2,
blotch 3, arc 3, leak 3, measure 1, parity 3, compare 7, checkRules 4.

```
npx vitest run tests/visualGateMetrics.test.ts --maxWorkers=2
 Test Files  1 passed (1)
      Tests  38 passed (38)
   Duration  697ms
npm run typecheck:fast   -> exit 0, no output
npx eslint tests/visualGateMetrics.test.ts   -> exit 0, no output
node --check scripts/visual-gate/metrics.mjs   -> ok
grep -nE "^import|require\(" scripts/visual-gate/metrics.mjs   -> nothing
```

## Timing
`measure` on one 960 x 540 image, 3 regions (wall 760 x 280: blotch + arc; upper 960 x 200: haze; floor 960 x 160),
Node 22, mean of 20 after 3 warm-ups: **91 ms per shot** on the desktop at ~96% CPU load (so an upper bound; target
< 150 ms). Building the 3 polygon masks: 1.5 ms; `lumaFromRgba` 960 x 540: 4.6 ms. Cost is dominated by whole-frame
passes (blotch SAT, two r 1 blurs, Sobel, the median sort), so it grows little with more regions of the same metrics.

## Files touched
- created `scripts/visual-gate/metrics.mjs`
- created `tests/visualGateMetrics.test.ts`
- created `docs/visual-gate/checks/vg1-build.md`

## Open items
- No GPU / laptop run needed for this slice. VG7 / VG8 set the real thresholds; the arc normalisation (item 1) means any
  arc rule numbers are on the per-pixel-slope scale.
- If VG5 needs speed, `blotch` / `arc` / `haze` could work on the mask's bounding box instead of the whole frame.
