status: open
# campus-greybox s3-r5 (cloud): Saltmarsh Park v2 greybox lane, data + unit tests

Lead: Night Shift | Sector Ops Build. Job campus-greybox (FOLDED-PLAN J17, ROADMAP Now row 16). Plan checked (checks
1-2, accepted by the lead 2026-10-25 ~20:40); S3 R1a frame done (cloud s3-r1).

- Base: `origin/feature/campus-greybox-s3-r1` @ 3a8c6893a0f7fec6c47a914f62ba96f0c929c940 (the R1a frame commit, NOT the r1 branch head). New branch:
  `feature/campus-greybox-s3-r5` (create it from that commit and push it; never push to feature/campus-greybox or
  another sub-lane; the lead merges / PRs it).
- The strict brief is `docs/campus-greybox/briefs/S3.md` on that base (section 2 table row r5, section 4 slice(s)
  R5, data and pure tests only), with the job's BRIEF.md and PLAN.md. Scope: R5, data and pure tests only only, in the files section 2 gives sub-lane r5. Own
  changelog fragment `changes/feature-campus-greybox-s3-r5.md`.
- Scope cut for the cloud: the 20 guards, routes and sector data with the tests that need no merged geometry
  (counts, kinds, cycles 25-45 s, squads, keys, `checkSectorGuards` / `checkSectorCodes` where R4's devices are not
  needed: mark the rest). R5's nav tests need r1-r4 merged into r5 by the lead: write them, mark them `it.todo` or
  skip with a reason, and list them as "pending lead merge". Do not merge r1-r4 yourself.
- Cloud changes to the brief:
  - Ignore its desktop worktree path and branch guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-s3-r5`.
  - Its owned-file list and never-touch list are exact. Where it says "stop and ask the lead", set `status: blocked <reason>`
    and stop that slice (finish any earlier slice first).
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files with
    `--maxWorkers=2`, always `dress: false` (the dressed S3 page throws until R7). Every e2e, GPU, level-measure or
    screenshot leg it names is "pending PC run": list it, do not run it.
  - Commit and push each slice (and each sub-step of a long slice) on `feature/campus-greybox-s3-r5`, path-limited, never `git add -A`.
- Done: every in-scope slice pushed; a report `docs/campus-greybox/checks/s3-r5-build.md` (per slice: files changed,
  tests with counts, assumptions taken with their undo, deviations, findings for the lead, pending PC runs); then
  `status: done feature/campus-greybox-s3-r5 <sha>` here.
