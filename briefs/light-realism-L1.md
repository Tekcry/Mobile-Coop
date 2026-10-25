status: done feature/light-realism-l1 475620043563951d61412313a0c822fb392f4405
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

## Report (Night Shift | Cloud Builder 2, 2026-10-25)
Resumed the old account's steps 1-3 from the branch head; steps 4-7 here. Full report:
`docs/light-realism/checks/l1-build.md` on the branch.
- Park (P11a): **PASS**, mean 27.93 lx, open-ground min 3.38 lx, U0 0.121 (reported); 0 open cells under 3 lx. Lane
  (P2): PASS, 8.30 / 0.83 lx. No other S1 space darker (bins now over its ceiling, 18.55 lx: L2-S1's).
- Layout: 13 twin-head columns (26 heads, arms along x), rows z -53 / -62 / -71.5, i 2.0, radius 10, tilt 0.2, outer
  1.3; lane floodlight 0.8 -> 0.5. Worst lamp-grid column 18 / 24. Four tuning bakes.
- Tests: typecheck clean; the step 4 / 5 list 11 files 149 passed, 1 skipped; lux 17 / 17; luxGrid.ts standalone
  strict clean; doc-lint 0 errors.
- Deviations (detail in the report): twin heads (single-arm heads leave each pole's own shadow wedge at ~1 lx);
  radius 10 for the slot cap; north row moved off route point (-31, -53); SIGNOFF overlap line says "brighter (most
  of the car park shows as fully lit)", not "a little": 750 of 974 cells show level 1.0 at 6.6-104 lx; lux-grid.mjs
  SVG folder follows --out.
- Pending PC run: the two laptop requests in the report (GPU after shots + 90 s video + e2e-darkness; e2e-sectorops
  e2e-lightbake e2e-levels e2e-anchors), sha 86fb41f8 (the report commit on top is docs only). No PR opened.
