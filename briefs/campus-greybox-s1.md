status: done feature/campus-greybox-s1 6731993b046af47e470eb90060186d8c17a498a2
# campus-greybox s1 (cloud): Saltmarsh Park v2 greybox lane, data + unit tests

Lead: Night Shift | Sector Ops Build. Job campus-greybox (FOLDED-PLAN J17, ROADMAP Now row 16). Plan checked (checks
1-2, accepted by the lead 2026-10-25 ~20:40); V2-SEED done at 024c7c172.

- Base: `origin/feature/campus-greybox` @ 024c7c172989f1c8bf938b02459940ec63e4febe. New branch: `feature/campus-greybox-s1` (create it from the base and push it; never push to
  feature/campus-greybox; the lead merges / PRs it).
- The strict brief is `docs/campus-greybox/briefs/S1.md` on that base, with the job's BRIEF.md and PLAN.md. Scope for this
  cloud brief: slices G1-G6 in the brief's order (not TAG-1: it waits for #317 coop4 on master).
- Cloud changes to the brief:
  - Ignore its desktop worktree path and branch guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-s1`.
  - Its owned-file list and never-touch list are exact. Where it says "stop and ask the lead", set `status: blocked <reason>`
    and stop that slice (finish any earlier slice first).
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files with
    `--maxWorkers=2`. Every e2e, GPU, level-measure or screenshot leg it names is "pending PC run": list it, do not run it.
  - Commit and push each slice (and each sub-step of a long slice) on `feature/campus-greybox-s1`, path-limited, never `git add -A`.
- Done: every in-scope slice pushed on `feature/campus-greybox-s1`; a report `docs/campus-greybox/checks/s1-build.md` (per slice: files
  changed, tests with counts, assumptions taken with their undo, deviations, pending PC runs); then
  `status: done feature/campus-greybox-s1 <sha>` here.

## Report (Night Shift | Cloud Builder 2, 2026-10-25)
Resumed from 24ec1bc7 (G1-G5 by Cloud Builder 1, not redone). G6 built: 08fae689 (G6a rooms, routes, hide spots, final
tests), 1a24178f (G6b graph pass, sync and graph tests), 6731993b (G6c report and fragment). Full report:
`docs/campus-greybox/checks/s1-build.md` (G6 section).
- Tests (`--maxWorkers=2`): campusV2S1 49, campusV2S1Screen 2, campusV2S1Sync 5 (new), campusV2S1Graph 4 (new), campusS1
  51, campusS1Dress 13, campusRuntimeNav 3, campusV2 9, changesFragments 1: 137 passed, 0 failed (one is the R1
  `it.fails` screen cap). typecheck:fast and eslint on owned files clean. Validator 0 errors; the branch's
  level-validate.mjs warns "unknown tag 'unavoidable'" on s1-forecourt (master's script knows it).
- Lead calls: M8 isolation, #5 #8 #9 #12 #13 #14 have no 3 s unseen moment (test pins that set); #7 takedown spot moved to
  (-38, -62.5) (5.75 s unseen, brief allows); R1 screen cap still `it.fails` (worst point sees all 15); the new south
  footway route makes K1 refuse the gate-end intercom post and site sign, both added to `S1_OMITTED` (F9); three stale
  graph-note phrases corrected beyond the three brief edits.
- Pending PC runs: e2e-sectorops:1..6 (`E2E_GPU=1`, default flags); validator `--require-measured` once V6 lands; walk
  items F1, F2 (palisade perch from a bin, condenser jump over the south palisade); light-realism calibration (R6); V6
  measured targets and #7's walked cycle (R3).
