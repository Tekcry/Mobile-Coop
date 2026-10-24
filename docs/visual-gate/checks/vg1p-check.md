# VG1 polish check (vg1p) - fresh Opus checker, 2026-10-25

Verdict: PASS

Reviewed `git diff a3362896 a925aafc` on `feature/visual-gate-vg1p` against `briefs/visual-gate-vg1-polish.md`
(cloud-queue), `docs/visual-gate/briefs/VG1.md` (Contract, section 4) and `vg1-check.md` polish 1, 5, 6.

## Scope and API
- Changed files: only `scripts/visual-gate/metrics.mjs` (+127/-26), `tests/visualGateMetrics.test.ts` (+76),
  `docs/visual-gate/checks/vg1-build.md` (+38). Nothing else.
- Contract typedefs untouched (diff starts at :253); the `export` lines are identical to a3362896. New helpers
  (`hazeWith`, `blotchWith`, `arcWith`, `arcMedian`) are module-private. No module state, no imports.
- No per-pixel allocation: the scratch arrays (`counts`, the median bin's `vals`, `g`, the blur) are per call; the old
  code already allocated `vals` (size n) per call, the new one allocates at most that.

## Scratch comparison (C:/NightShift/scratch/vg1p/compare.mjs, clamp.mjs, med.mjs)
70 synthetic images (14 kinds x 256x160, 97x61, 960x540, 3x3, 5x2: ramp, lumps, hard / soft discs, +-8 and +-127
noise, checker, stripes, fog, busy, slanted lines, flat) x 5 masks (full, rect, polygon, 1 px, empty), standalone metrics
and `measure`:
- stats / haze / blotch / measure non-arc fields vs a3362896: max |diff| 0 over 16310 numbers; region keys identical.
- arc vs 991d6d34 (step 2: new tangent, old full sort / own blur): max |diff| 0, so the step 3 cost changes are exact.
  The in-bin select path is exercised (median bins 150 and 228 on busy / +-127 noise); 60 more stripe images with the
  median in the clamped last bin (> 1/16 slope): 0 diffs.
- Quantised median error: 0. The histogram only locates the rank's bin, then that bin is sorted, so the value is the
  exact lower median. The floor shortcut (bin < 24, G < 1.5/255) is exact too: g x 4080 is exact in doubles, and
  4 x median < 6/255 there, so T is the floor either way. Even with the in-bin sort removed (M6) the error would be
  under one bin (1/16 level of slope).
- arc orientation, S = 60 hard line, every degree 0-180: a3362896 reads 0 at 20-32, 58-70, 110-122, 148-160; HEAD reads
  > 0 at every degree (min 0.0117; 25 deg 0.0197, 64 deg 0.0117). S = 20 and S = 100 also > 0 at every degree 0-90.
  The 40 px soft line reads 0 at every degree 0-180; +-8 noise reads 0 on 5 seeds.
- parityRange on 100001 levels 0..1: differs from a3362896 only at 0.31 (old skip true by float rounding, now false).
  0.25 / 0.31 / 0.57 / 0.63 and the computed forms 0.28 +- 0.03, 0.6 +- 0.03 never skip; 1 distinct output under
  0, +-1e-15, +-1e-12, +-5e-11. 0.2501 still skips, 0.2499 does not.
- Timing (this desktop, busy 960x540, wall blotch + arc, upper haze, under load): old 117-131 ms, new 59-64 ms per call,
  the same halving the builder reported.

## Commands
```
npx vitest run tests/visualGateMetrics.test.ts --maxWorkers=2   -> 43 passed (43)
npx tsc --noEmit -p .                                           -> exit 0
```

## Mutations (each restored with git checkout -- scripts/visual-gate/metrics.mjs)
| # | Mutation | Result |
|---|----------|--------|
| M1 | parity slack removed (`< PARITY_EDGE`) | caught (the 0.03-levels test) |
| M2 | arc back to the rounded unit step | caught (25 / 64 deg test, pinned disc value) |
| M4 | measure passes `r.p50` as the haze veil | caught (measure == standalone) |
| M5 | median always returns the floor | caught (pinned busy value) |
| M3 | median select off by one (`vals[rank - before]`) | survives |
| M6 | in-bin sort removed | survives |

M3 / M6 change T by at most one sample / one 1/16-level bin, too little to move any pinned arc value; the exactness is
shown by the scratch comparison above, not by a test. Not a must-fix.

## Must-fix
None.

## Polish
1. `tests/visualGateMetrics.test.ts:349-350`: add a case that pins the median selection (M3 / M6 survive), e.g. an image
   whose mask G takes a few known values with T = 4 x median just above / below a ridge's G, so a one-rank or unsorted
   select flips the arc result.
2. `docs/visual-gate/briefs/VG1.md:57-60` still says "step one pixel at a time on the rounded tangent" and "12 consecutive
   pixels"; now it is 12 samples at round(p + k x unit tangent) (a pixel can be sampled twice near 45 deg; 11 px of arc
   length). The orchestrator should update that line (out of this job's file list). metrics.mjs:369-372 is already right.
3. `tests/visualGateMetrics.test.ts:344` "pre-polish" values: the arc ones (disc 0.02998, busy) are post-step-1 values,
   not pre-polish; rename to "pre-step-3".
4. `metrics.mjs:516-518`: `measure` builds the blur before `arcWith`'s empty-mask early out, so an empty arc region still
   pays for the blur (once per call; harmless).
