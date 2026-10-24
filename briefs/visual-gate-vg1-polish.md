status: done feature/visual-gate-vg1p a925aafc

# visual-gate: VG1 metrics polish (arc orientation, cost, float slack)

Lead: Night Shift | Sector Ops Build (2026-10-25 ~04:25). Model: Opus (Sonnet acceptable). Unit tests only.

Base: `origin/feature/visual-gate` @ a3362896. New branch `feature/visual-gate-vg1p` cut from that sha. You own it:
commit and push each step, end with the report section and this file's status line.
Read first: `docs/systems/agent-preamble.md`; CLAUDE.md "Hard rules"; `docs/visual-gate/briefs/VG1.md` (the Contract
and section 4 API: the public API and outputs must not change except where stated below);
`docs/visual-gate/checks/vg1-check.md` "Polish list" items 1, 5, 6 (items 2-4 belong to VG5, do not do them).

Only files to edit: `scripts/visual-gate/metrics.mjs`, `tests/visualGateMetrics.test.ts`, and a new section "Polish
(vg1p)" appended to `docs/visual-gate/checks/vg1-build.md`. Do not touch gate.mjs, harness.mjs, viewpoints.mjs,
store / baseline files, scripts/laptop-queue, src/.

Build:
1. (Polish 1, arc orientation gap) In `arc` (metrics.mjs ~:380-391) step along the exact tangent and round the
   accumulated position (`px = Math.round(x + k*tx)`, `py = Math.round(y + k*ty)`, k = +-1..11) instead of the rounded
   unit step, closing the 20-32 and 58-70 degree blind sectors for straight hard edges. Test: a straight hard edge
   (S = 60) at 25 degrees (and at 64 degrees) gives arc > 0; the existing soft-edge / noise cases still read 0.
2. (Polish 6, float slack) The strict `<` at ~:506 (levels exactly 0.03 from an edge skip or not by float rounding):
   add a 1e-9 slack so it is deterministic. Test: levels 0.25 / 0.31 / 0.57 / 0.63 give the same result on repeat and
   with tiny perturbations (+-1e-12).
3. (Polish 5, cost) One shared r 1 blur per call where `haze` and `arc` each build their own, `measure` not computing a
   haze region's stats twice, and a quantised median (256 bins) instead of a full float sort in arc. Outputs must stay
   within 1e-6 of the old ones on every existing synthetic test (add a test that runs old-vs-new on 3 synthetic images if
   you keep the old path for comparison, else assert the existing expected values unchanged). Report the time of the
   builder's benchmark (vg1-build.md names it) before / after.
Hot loops allocate nothing per pixel (typed arrays reused across calls where the module already does so).
Run: `npx vitest run tests/visualGateMetrics.test.ts --maxWorkers=2` and `npx tsc --noEmit -p .`; no e2e, no GPU.
Done: branch pushed, 38+ tests green with counts in the report, status line `done feature/visual-gate-vg1p <sha>`.

## Report (Night Shift | Cloud Builder 1, 2026-10-24)
- `feature/visual-gate-vg1p` @ a925aafc (base a3362896; commits 991d6d34 steps 1-2, a925aafc step 3 + report). Full write-up: docs/visual-gate/checks/vg1-build.md "Polish (vg1p)". Files: metrics.mjs, visualGateMetrics.test.ts, vg1-build.md.
- 1. arc: exact unit tangent, rounded accumulated position (k = +-1..11). Straight hard edge S = 60 reads > 0 at every 5 deg from 0-90 (was 0 at 20-30 / 60-70); soft edges and noise still 0. Hard disc S = 100 0.0253 -> 0.0300 (run = 11 px of arc length at every angle); no arc baselines exist yet (VG7 sets them), nothing to retake.
- 2. parityRange edge skip `< 0.03 - 1e-9`: exactly-0.03 levels (0.25 / 0.31 / 0.57 / 0.63) never skip, stable under +-1e-12 (0.31 used to skip by float rounding).
- 3. measure shares one summed-area table and one r 1 blur per call (also with blotch); haze reuses the region's p5; arc median by a 256-bin histogram, exact (only the median's bin is sorted, floor shortcut below 1.5/255). Old vs new: |diff| 0 on 4770 numbers / 18 images (scratch comparison; tests pin pre-step-3 values within 1e-6 and measure == standalone metrics on 3 images). Benchmark 960 x 540, 3 regions: ~61-66 ms -> ~28-31 ms per shot.
- Tests 43/43 (was 38; rerun by the builder session: 43/43), tsc 0, eslint clean (metrics.mjs is eslint-ignored), no imports in metrics.mjs. Public API unchanged. Open: polish items 2-4 left for VG5.
