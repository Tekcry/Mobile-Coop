status: claimed Night Shift | Cloud Builder 1 2026-10-24T17:33Z

# visual-gate VG5: the gate runner (cloud copy of docs/visual-gate/briefs/VG5.md on feature/visual-gate @ a3362896)

Lead: Night Shift | Sector Ops Build (2026-10-25 ~04:25). Model: Opus. The brief is the file named above: read it in
full from `origin/feature/visual-gate` @ a3362896 (`git show a3362896:docs/visual-gate/briefs/VG5.md`); VG1-VG4 and
VG3 are all merged at that sha. CLOUD RULES override the brief's desktop lines:
- Cut `feature/visual-gate-vg5` from `a3362896` in your own checkout (ignore the C:/NightShift worktree path and guard;
  ignore "the lead commits"): you own the branch, commit and push each step, end with the report
  `docs/visual-gate/checks/vg5-build.md` and this file's status line.
- Unit tests only: single vitest files, `npm run typecheck:fast` (or `npx tsc --noEmit -p .`); no e2e, no GPU, no
  npm run check. The brief's laptop request (rules-only run on master): write the exact command into your report, the
  lead sends it.
- Edit only the brief's "Files (only these)" list. In parallel: a VG1 polish brief edits `scripts/visual-gate/metrics.mjs`
  and `tests/visualGateMetrics.test.ts` (not yours); VG6 (#367) edits `scripts/laptop-queue/*` (not yours).
- Zero src/ diff. No new dependency.
