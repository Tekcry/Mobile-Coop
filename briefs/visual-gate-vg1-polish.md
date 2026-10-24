status: open

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
