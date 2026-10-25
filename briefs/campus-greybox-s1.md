status: claimed Night Shift | Cloud Builder 1 2026-10-25T10:02Z
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
