# VG1 - picture metrics (Opus builder)

Job visual-gate, group A (parallel with VG2, VG3, VG4). Lead: Night Shift | Sector Ops Build.

## Where
- Branch `feature/visual-gate-vg1`, cut from the pushed `feature/visual-gate` head; worktree
  `C:/NightShift/Mobile-Coop-visual-gate-vg1` (the lead creates it). Guard before every write:
  `cd /c/NightShift/Mobile-Coop-visual-gate-vg1 && test "$(git rev-parse --abbrev-ref HEAD)" = feature/visual-gate-vg1 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-visual-gate-vg1"`
- Read first: `docs/systems/agent-preamble.md` (all of it: never commit, push, stash, reset or checkout); CLAUDE.md
  "Hard rules"; `docs/visual-gate/BRIEF.md` (A13, A15), `PLAN.md` sections 2 and 4. The branch base is older than
  master: read reused code with `git show origin/master:<file>`.

## Files (only these)
- create `scripts/visual-gate/metrics.mjs`
- create `tests/visualGateMetrics.test.ts`
- create `docs/visual-gate/checks/vg1-build.md` (your report)
Do NOT touch: anything under `src/`, any other `scripts/` file, `viewpoints.mjs`, `harness.mjs`, `storeLib.mjs`,
`package.json`, other docs. No new dependency.

## Rules for the module
- Plain ESM, Node 22 and browser safe: no imports at all (no Babylon, no DOM, no `node:` modules). Pure functions, no
  globals, deterministic. Typed with JSDoc. Whole-image loops may allocate one scratch array per call (not a hot path),
  never per pixel.
- Luma is 0..255 bytes in images; every returned metric is on 0..1 (divide by 255).

## Contract (the single definition; VG2 / VG5 code to it - copy these typedefs verbatim to the top of metrics.mjs)
```js
/** Rec. 709 Y' of sRGB bytes, row-major, length w * h, 0..255. @typedef {{ w: number, h: number, luma: Uint8Array }} LumaImage */
/** 0 / 1 per pixel, row-major, length w * h. @typedef {Uint8Array} Mask */
/** Screen pixels: x right, y down, origin top-left (Playwright screenshot space). @typedef {[number, number]} Pt2 */
/** Luma 0..1; hist: 32 bins over 0..1, normalised to sum 1 (all zero when n = 0). @typedef {{ n: number, mean: number, p5: number, p50: number, p95: number, nearBlack: number, hist: number[] }} Stats */
/** @typedef {{ veil: number, contrast: number }} Haze */
/** Per region: Stats plus whichever extra metrics were asked. @typedef {Stats & { veil?: number, contrast?: number, blotch?: number, arc?: number }} RegionMetrics */
/** One shot's measures (a rig shot adds `leak`). @typedef {{ whole: RegionMetrics, regions: Record<string, RegionMetrics>, leak?: { mean: number, p95: number } }} ShotMetrics */
/** @typedef {'haze' | 'blotch' | 'arc'} MetricName */
/** A rule (VG3's Rule is the same shape). @typedef {{ min?: number | null, max?: number | null, presets?: ('low' | 'epic')[] }} Rule */
/** @typedef {{ key: string, region: string, metric: string, base: number | null, cur: number, delta: number | null, tol: number, kind: 'drift' | 'rule', known: string | null }} Flag */
/** @typedef {typeof FLOORS} Tolerances */
```

## Functions (exact names and signatures, all exported)
- `lumaFromRgba(rgba: Uint8Array | Uint8ClampedArray, w, h): LumaImage` - `Math.round(0.2126 R + 0.7152 G + 0.0722 B)`,
  alpha ignored (the same weights as e2e-darkness.mjs `readLuma` :130-145).
- `fullMask(w, h): Mask` - all 1.
- `maskFromPolygon(w, h, pts: Pt2[]): Mask` - even-odd scanline fill sampled at pixel centres (x + 0.5, y + 0.5); points
  may lie off-screen (clipped by the raster bounds); fewer than 3 points -> all 0.
- `erode(mask, w, h, r): Mask` - a pixel stays 1 only if every pixel within the (2r + 1) square is 1 and inside the
  image (separable min; O(w h) per pass, not O(w h r^2)).
- `stats(img: LumaImage, mask: Mask): Stats` - over mask pixels; percentiles by counting sort on the 256 levels
  (nearest-rank); `nearBlack` = share of pixels with luma <= 10 (0.04 x 255 = 10.2: bible L5 dark target).
- `emd(a: number[], b: number[]): number` - 1-D earth mover's distance of two equal-length histograms, each normalised
  to sum 1 first: `sum |cdfA - cdfB| / (bins - 1)`, 0..1. Throws on unequal lengths.
- `haze(img, mask): Haze` - `veil` = p5 of the mask; `contrast` = mean |Laplacian (4-neighbour)| of a box blur r 1 (3 px)
  over the mask eroded by 2, / (mean + 0.03), with luma on 0..1.
- `blotch(img, mask): number` - D = boxBlur(r 3) - boxBlur(r 24) (luma 0..1; box blurs by summed-area table, edges
  clamped); std of D over the mask eroded by 24 px, / (mean of the eroded mask + 0.03). Eroded mask empty -> 0.
- `arc(img, mask): number` - G = Sobel magnitude of a box blur r 1 (luma 0..1); T = max(6 / 255, 4 x median G over the
  mask); a pixel is a ridge pixel when G > T and it lies in a run of >= 12 consecutive G > T pixels along the direction
  perpendicular to its gradient (the edge's tangent; step one pixel at a time on the rounded tangent, both ways).
  Returns ridge pixels / mask pixels (0 when the mask is empty).
- `leak(on: LumaImage, off: LumaImage, mask): { mean: number, p95: number }` - per pixel max(0, on - off) / 255.
  Throws on a size mismatch.
- `measure(img, masks: Record<string, Mask>, want: Record<string, MetricName[]>): ShotMetrics` - `whole` = stats of
  `fullMask`; for each region: stats + the asked metrics (`haze` adds veil and contrast).
- `DARK` - a frozen copy of `src/world/darkCurve.ts:86-91` DARK_TARGETS (`{ level, band, min, max }[]`), and
  `BAND_EDGES = [0.28, 0.6]` (`LIGHT.shadow`, `LIGHT.lit`, lights.ts:89, :91).
- `parityRange(level): { min: number, max: number, band: 'dark' | 'mid' | 'lit', row: number | null, skip: boolean }`
  per BRIEF A15: within 0.03 of a DARK row's level -> that row's min / max +-0.02 (`row` = its index); otherwise the
  band's union range (min of the band's rows' mins, max of their maxes) +-0.02, `row` null; `skip` when |level - edge|
  < 0.03 for either edge. min clamped at 0, max at 1. No interpolation between rows.
- `FLOORS` (frozen): `{ meanAbs: 0.03, meanRel: 0.2, nearBlack: 0.08, emd: 0.03, veil: 0.02, contrastDrop: 0.25,
  blotchRatio: 1.4, blotchAbs: 0.02, arcRatio: 1.5, arcAbs: 0.01 }` (PLAN section 4).
- `compare(key: string, base: ShotMetrics, cur: ShotMetrics, tol: Tolerances = FLOORS): Flag[]` - for `whole` and each
  region present in both: mean flags when |d| >= meanAbs AND |d| >= meanRel x base (both); nearBlack |d| >= nearBlack;
  emd(hist) >= emd (Flag.metric 'hist', base null, cur = the emd); veil |d| >= veil; contrast when cur < base x
  (1 - contrastDrop); blotch when cur > base x blotchRatio AND cur - base > blotchAbs; arc likewise with arcRatio /
  arcAbs. `kind: 'drift'`, `known: null`, `tol` = the threshold that was crossed. `leak` is never compared (absolute
  rules only). A region missing on either side is skipped (no flag).
- `checkRules(key: string, item: { rules: Record<string, Rule>, known: string | null }, cur: ShotMetrics, preset): Flag[]`
  - rule key `<region>.<metric>`; region `whole`, `leak` (reads `cur.leak`) or a region name; a rule with `presets` not
  containing `preset` is skipped; null / absent min and max are skipped; a missing region or metric is skipped (VG5
  reports it). `kind: 'rule'`, `known: item.known`, `base: null`, `delta: null`, `tol` = the bound crossed.

## Unit tests (`tests/visualGateMetrics.test.ts`, vitest, node env)
Import style (as tests/autoTrain.test.ts:1-8):
```ts
import { describe, expect, it } from 'vitest';
import { DARK_TARGETS } from '../src/world/darkCurve';
import {
  lumaFromRgba, fullMask, maskFromPolygon, erode, stats, emd, haze, blotch, arc, leak, measure, DARK, BAND_EDGES, parityRange, FLOORS, compare, checkRules,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/visual-gate/metrics.mjs';
```
Build every image in the test (helper `img(w, h, f: (x, y) => 0..255)`, 256 x 160 or so; no fixture files). Cases:
- lumaFromRgba: pure red / green / blue / white bytes give 54 / 182 / 18 / 255.
- maskFromPolygon: an axis-aligned rect gives exactly its pixel count; a 30 deg rotated square's count within 2% of its
  area; a polygon half off-screen is clipped (count = on-screen part); 2 points -> empty.
- erode: a 20 x 20 square eroded by 3 -> 14 x 14; r 0 is identity.
- stats: flat grey 128 -> mean 128/255, p5 = p50 = p95, nearBlack 0; an image with 25% of pixels at 5 -> nearBlack
  0.25; hist sums to 1.
- emd: identical -> 0; all mass bin 0 vs bin 31 -> 1; symmetric.
- haze: flat grey -> veil = grey, contrast ~0; a textured image (stripes) with a 50% white fog overlay
  (`v' = v + (255 - v) x 0.5`) -> veil up and contrast down vs the original.
- blotch: flat -> ~0 (< 0.002); a linear ramp across the image -> ~0 (< 0.005: the big falloff cancels); the ramp plus
  40 px soft lumps (amplitude 20 levels) -> clearly up (> 5 x the ramp's); fine 2 px checker noise of +-6 levels -> small
  (< the lumps' / 3).
- arc: flat -> 0; a hard-edged bright disc on flat -> > 0; the same disc with a smoothstep edge 40 px wide -> ~0
  (< the hard disc's / 10); uniform random noise of +-8 levels -> ~0.
- leak: on = off -> 0 / 0; a lit 20 x 20 patch +60 levels in `on` inside the mask -> mean = patch share x 60/255,
  p95 per the patch share; negative differences count 0.
- measure: keys `whole` and each region; `haze` adds veil / contrast only where asked.
- parity: `DARK` deep-equals `DARK_TARGETS`; `BAND_EDGES` equal 0.28 / 0.6; parityRange at the 4 table levels gives
  that row +-0.02 (min clamped 0, max clamped 1) and `row` = its index; at 0.5 (mid, no row within 0.03) the band
  union 0.10-0.37, `row` null; at 0.2 (dark) 0-0.11; at 0.27, 0.29 and 0.61 `skip` true (band edges 0.28, 0.6).
- compare: identical -> []; mean +0.05 on base 0.1 -> flag; mean +0.025 -> none; contrast -30% -> flag; blotch x1.5 but
  +0.01 -> none; hist emd >= 0.03 -> flag metric 'hist'; a region missing on one side -> none; `leak` differences -> none.
- checkRules: `wall.blotch { max: 0.05, presets: ['low'] }` flags at low when 0.06, not at epic; null max -> none;
  `leak.mean { max: 0.004 }` flags 0.005 with `known` carried through; missing region -> none.

## Acceptance (run all; paste outputs in the report)
- `npx vitest run tests/visualGateMetrics.test.ts --maxWorkers=2` all pass, whole file < 20 s.
- `npm run typecheck:fast` clean; `npx eslint tests/visualGateMetrics.test.ts` clean; `node --check scripts/visual-gate/metrics.mjs`.
- `grep -nE "^import|require\(" scripts/visual-gate/metrics.mjs` prints nothing.
- Timing note in the report: `measure` on one 960 x 540 image with 3 regions (wall: blotch + arc, upper: haze, floor)
  in ms (a quick `node -e` loop is fine), so VG5 knows the metric cost per shot (target < 150 ms).
- No e2e, no GPU, no `npm run check`, no full `vitest run`. Single vitest files only, `--maxWorkers=2`. Any GPU / timing
  run on the laptop is requested by the LEAD, not you: if you think one is needed, write the request command into the
  report.

## Report `docs/visual-gate/checks/vg1-build.md`
Built (functions, any deviation from this brief and why), numbers used, test list with pass counts, the timing note,
files touched, open items. Final message: done / not done, test results, open items (short).
