status: done feature/visual-gate-vg7 05e959217ea89f23740735798500fb19e4bc8041

# visual-gate VG7 phase 1 (tools): noise / proof library, CLI, results pusher (cloud copy of docs/visual-gate/briefs/VG7.md)

Lead: Night Shift | Sector Ops Build (2026-10-25 ~05:55). Model: Sonnet per the slice table (Opus fine). The brief is
`docs/visual-gate/briefs/VG7.md` on `origin/feature/visual-gate` @ d1e45ddc: read it in full (`git show
d1e45ddc:docs/visual-gate/briefs/VG7.md`) plus BRIEF.md A24-A30. Build PHASE 1 ONLY (tools). Preconditions are met:
VG5 and VG1 polish are merged at that head. CLOUD RULES override the brief's desktop lines:
- Cut `feature/visual-gate-vg7` from d1e45ddc in your own checkout; you own it: commit and push each step, end with the
  report the brief names and this file's status line. Ignore the C:/NightShift worktree path / guard and "the lead commits".
- Unit tests only (single vitest files, `npx tsc --noEmit -p .`); no e2e, no GPU, no laptop request (phase 2 is the
  lead's). Never push to `visual-baselines`, `shots/*` or `laptop-queue`: push-results tests use temp repos only.
- Edit only the brief's phase 1 files. Zero src/ diff, no new dependency.

## Report (Night Shift | Cloud Builder 1, 2026-10-24)
Branch feature/visual-gate-vg7 from d1e45ddc: 4bafe5da (tools + tests), 05e95921 (report docs/visual-gate/checks/vg7-build.md). Exactly the five phase 1 files (1450 lines, all new): scripts/visual-gate/noiseLib.mjs (pure: imports only metrics.mjs, gate.mjs), noise.mjs (spread / proof CLI), push-results.mjs (CLI + pushFolder, refuses any branch but shots/visual-gate-*), tests/visualGateNoise.test.ts, the report. Zero src/ diff; package.json and lockfile unchanged; nothing pushed to visual-baselines / shots/* / laptop-queue (push tests use temp bare repos; `--dry-run` acceptance left no remote branch).
Tests: visualGateNoise 12/12, visualGateGate 29/29, visualGateMetrics 43/43 (rerun by me: 84/84); `npm run typecheck:fast` exit 0; eslint on the test exit 0.
Deviations (full list in vg7-build.md): ceil rounding with 1e-6 slack (4 x 0.02 -> 0.08, not 0.0801); sd subtracts the first value (equal values give exactly 0); extra exports (expandTargets, idOfKey; F6 targets `m-*@epic` / `m-*@low` expanded from viewpoints.mjs); notes on control rows (F5b so-door "control: expected green", F7 epic "reference"); spreadOf also covers rig `off` keys and marks a region missing from any run `thin`; renderProof parity arg is `{ bad, fixed }`; pushFolder also refuses `..`, empty / drive-letter / `.`-part prefixes, adds files 100 at a time (cmd.exe length); a missing proof input exits 2.
Lead next: merge feature/visual-gate-vg7 into feature/visual-gate and push before the phase 2 laptop request (its steps copy scripts/visual-gate from feature/visual-gate).
