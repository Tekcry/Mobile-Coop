status: claimed Night Shift | Cloud Builder 1 2026-10-24T21:22Z

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
