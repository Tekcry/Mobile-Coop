status: done feature/campus-greybox-s3-r4 e37b26565
# campus-greybox s3-r4 (cloud): Saltmarsh Park v2 greybox lane, data + unit tests

Lead: Night Shift | Sector Ops Build. Job campus-greybox (FOLDED-PLAN J17, ROADMAP Now row 16). Plan checked (checks
1-2, accepted by the lead 2026-10-25 ~20:40); S3 R1a frame done (cloud s3-r1).

- Base: `origin/feature/campus-greybox-s3-r1` @ 3a8c6893a0f7fec6c47a914f62ba96f0c929c940 (the R1a frame commit, NOT the r1 branch head). New branch:
  `feature/campus-greybox-s3-r4` (create it from that commit and push it; never push to feature/campus-greybox or
  another sub-lane; the lead merges / PRs it).
- The strict brief is `docs/campus-greybox/briefs/S3.md` on that base (section 2 table row r4, section 4 slice(s)
  R4), with the job's BRIEF.md and PLAN.md. Scope: R4 only, in the files section 2 gives sub-lane r4. Own
  changelog fragment `changes/feature-campus-greybox-s3-r4.md`.
- Lights follow G329 (every enclosed room lit; no fitting over the chamber, EMC room, gas cage, clean room, low aisle
  or walkway as the brief's test says). Engine values as today x1 in one block with the header "provisional,
  light-realism retunes" and a `TODO(light-realism)` marker, as S2's `S2_LIGHTS`.
- Cloud changes to the brief:
  - Ignore its desktop worktree path and branch guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-s3-r4`.
  - Its owned-file list and never-touch list are exact. Where it says "stop and ask the lead", set `status: blocked <reason>`
    and stop that slice (finish any earlier slice first).
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files with
    `--maxWorkers=2`, always `dress: false` (the dressed S3 page throws until R7). Every e2e, GPU, level-measure or
    screenshot leg it names is "pending PC run": list it, do not run it.
  - Commit and push each slice (and each sub-step of a long slice) on `feature/campus-greybox-s3-r4`, path-limited, never `git add -A`.
- Done: every in-scope slice pushed; a report `docs/campus-greybox/checks/s3-r4-build.md` (per slice: files changed,
  tests with counts, assumptions taken with their undo, deviations, findings for the lead, pending PC runs); then
  `status: done feature/campus-greybox-s3-r4 <sha>` here.

## Report (Night Shift | Cloud Builder 4, 2026-10-25)
- R4 9eca28309 (lights, devices, lights test), a99bec3bc (sync test), report + fragment 62c56d701 / e37b26565. Full
  report: `docs/campus-greybox/checks/s3-r4-build.md` (with the src file:line of the board, intel, kp-store and desk for
  SYNC.md); fragment `changes/feature-campus-greybox-s3-r4.md`.
- Built: `S3_LIGHTS`, one provisional block (`TODO(light-realism)`), 32 fittings incl. the J17 rooms on 160-165; 17
  switches; the timed isolator (view, 45 s); las-gown / las-store with panels and near points; cam-view (P16) /
  cam-dock, desk-sec3, kp-store / kp-sec (s3-codes), the sign-out board, alarm-dock / alarm-sec (P17).
- Tests: campusV2S3Lights 11/11, campusV2S3Sync 5/5; campusV2S3* + campusS3* + campusV2 74/74; typecheck and eslint
  clean.
- Deviations: the "no fitting over ... gas cage, clean room" test line yields to J17 (B8, B9: they are lit); SYNC.md is
  not on the branch, its S3 rows are embedded (the file is compared when present); nav-based checks (switch stand
  points, las-store no way round) are pending the merged lane.
- Findings: the EMC room is a solid box with no door (its lamp is inside collision, its switch outside by #17's post);
  `s3Data.ts` (R5) still wires the v1 cameras / alarms / desks and `boards: []`.
- Pending PC runs: e2e-sectorops:1..6 (flag off) at the S3-d head, V6 light measures, GPU look, merged-lane nav checks.
