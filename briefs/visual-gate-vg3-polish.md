status: claimed Night Shift | Cloud Builder 1 2026-10-24T18:21Z

# visual-gate: VG3 viewpoints polish (region sizes, gallery wall, source refs)

Lead: Night Shift | Sector Ops Build (2026-10-25 ~05:25). Model: Sonnet (Opus fine). Unit tests only.

Base: `origin/feature/visual-gate` @ d9d347e8. New branch `feature/visual-gate-vg3p` cut from that sha; you own it:
commit and push each step, end with the report and this file's status line. Read first: `docs/systems/agent-preamble.md`;
CLAUDE.md "Hard rules"; `docs/visual-gate/briefs/VG3.md` (Contract: do not change types or keys);
`docs/visual-gate/checks/vg3-check.md` (polish list: the 16 floor / upper regions under 60 px in one axis, m-f-gallery
has no wall region, partly off-screen floor regions, campusS3 :397 -> :396); `docs/visual-gate/checks/vg1-check.md`
polish 3 (VG1's blotch erodes regions under ~49 px to nothing; keep metric regions >= ~60 px in both axes at 960 x 540).

Only files to edit: `scripts/visual-gate/viewpoints.mjs`, `tests/visualGateViewpoints.test.ts`, and a section "Polish
(vg3p)" appended to `docs/visual-gate/checks/vg3-build.md`. Do not touch gate.mjs, harness.mjs, metrics.mjs, store
files, scripts/laptop-queue, src/.

Build:
1. Grow or reshape each listed small region (world quads) so its projection is >= 60 px in both axes at 960 x 540 with
   the harness projection (`projectQuads` in harness.mjs, the same FOV the VG3 checker assumed: 86 deg horizontal), keeping
   it on the same surface and fully on screen; where that is impossible, drop the region and say so.
2. Add a `wall` region to m-f-gallery on the wall it faces (7.75 m away; coordinates from origin/master with file:line).
3. Clip partly off-screen floor regions to the frame.
4. Fix the campusS3 source ref (:397 -> :396) and any other ref you find off.
5. Tests: a shape test that every region of every view projects to >= 60 x 60 px and lies inside the frame (use the
   harness's pure projection helpers; no browser).
Run: `npx vitest run tests/visualGateViewpoints.test.ts tests/visualGateHarness.test.ts --maxWorkers=2`, `npx tsc --noEmit -p .`.
Done: branch pushed, tests green with counts, status line `done feature/visual-gate-vg3p <sha>`.
