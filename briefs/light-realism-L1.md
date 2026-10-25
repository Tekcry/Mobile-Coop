status: claimed Night Shift | Cloud Builder 2 2026-10-25T23:19:49+11:00
# light-realism L1 (cloud): the S1 car park lit to the real-world band, measured, and its sign-off page

Lead: Night Shift | Sector Ops Build. Job light-realism (FOLDED-PLAN J10, ROADMAP Now row 13; Michael Q2 "Never", Q3
"Australian standards", G329). Opus builds (lighting data and the measure tool).

- Base: `origin/feature/light-realism-l0` @ 1cefe25eb4cb2debd96fce03c5fd618a826381fe. New branch: `feature/light-realism-l1` (create it from that
  commit and push it; never push to feature/light-realism-l0 or any other branch).
- The strict brief is `docs/light-realism/briefs/L1.md` on that base (steps 1-7), with docs/light-realism/BRIEF.md,
  PLAN.md L1, PLAN-CHECK.md, SIGNOFF.md and measure/calibration.md. Its owned-file and never-touch lists are exact.
  An Opus checker of the L0 fold may still land a fix on feature/light-realism-l0; if the lead names one in an
  "Answer:" section here, merge that one commit before step 2.
- Cloud changes to the brief:
  - Ignore its desktop worktree path and toplevel guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/light-realism-l1`.
  - Machines (brief :17-18, the lead's call): the bakes and the measure (`node scripts/light-realism/lux-grid.mjs ...`,
    Node / vitest, no GPU) run HERE on the cloud; drop `--cpu-max` if it reads a Windows-only counter. tsc and the
    brief's single vitest files with `--maxWorkers=2`. No e2e, no GPU, no `npm run check`.
  - Before files (step 1): the before picture SVG outside the repo (C:/NightShift/scratch/...) is not reachable here:
    re-measure the before on the base into a scratch folder outside the repo (never committed), and note it.
  - Step 7's two laptop requests: write them in the report with the full final sha; do not run them (the lead sends).
  - The PR stays a draft until Michael's click (BRIEF A11 / G355: no feature flag): nothing switches on here.
  - Commit and push each step, path-limited, never `git add -A`. Where the brief says STOP or ask the lead:
    `status: blocked <reason>`.
- Done: steps 1-7 pushed; report `docs/light-realism/checks/l1-build.md`; then
  `status: done feature/light-realism-l1 <sha>` here.
