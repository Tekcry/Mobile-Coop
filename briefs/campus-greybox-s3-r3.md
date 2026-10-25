status: done feature/campus-greybox-s3-r3 4dd20af192974478cfde3233afd9ebc6b57691b3
# campus-greybox s3-r3 (cloud): Saltmarsh Park v2 greybox lane, data + unit tests

Lead: Night Shift | Sector Ops Build. Job campus-greybox (FOLDED-PLAN J17, ROADMAP Now row 16). Plan checked (checks
1-2, accepted by the lead 2026-10-25 ~20:40); S3 R1a frame done (cloud s3-r1).

- Base: `origin/feature/campus-greybox-s3-r1` @ 3a8c6893a0f7fec6c47a914f62ba96f0c929c940 (the R1a frame commit, NOT the r1 branch head). New branch:
  `feature/campus-greybox-s3-r3` (create it from that commit and push it; never push to feature/campus-greybox or
  another sub-lane; the lead merges / PRs it).
- The strict brief is `docs/campus-greybox/briefs/S3.md` on that base (section 2 table row r3, section 4 slice(s)
  R3), with the job's BRIEF.md and PLAN.md. Scope: R3 only, in the files section 2 gives sub-lane r3. Own
  changelog fragment `changes/feature-campus-greybox-s3-r3.md`.
- Lead answers to the r1 findings (A-J17-S3-2, -3; undo: drop the piece): (a) close the 0.2 m slots behind the north and
  east cores: run each core's north wall on z -0.15 (the shell's inner face) so nothing links dock <-> control or
  LV <-> riser for sight or light; test it. (b) Add HUD RoomDefs `s3-nstair`, `s3-estair` (and `s3-wstair` if the
  west core is enclosed) for the core boxes in `s3Stairs.ts`; the control room box stays as R1 built it (the test
  that the core point reads its stair room, not `s3-control`, goes in R5's nav tests: list it as pending).
- Cloud changes to the brief:
  - Ignore its desktop worktree path and branch guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-s3-r3`.
  - Its owned-file list and never-touch list are exact. Where it says "stop and ask the lead", set `status: blocked <reason>`
    and stop that slice (finish any earlier slice first).
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files with
    `--maxWorkers=2`, always `dress: false` (the dressed S3 page throws until R7). Every e2e, GPU, level-measure or
    screenshot leg it names is "pending PC run": list it, do not run it.
  - Commit and push each slice (and each sub-step of a long slice) on `feature/campus-greybox-s3-r3`, path-limited, never `git add -A`.
- Done: every in-scope slice pushed; a report `docs/campus-greybox/checks/s3-r3-build.md` (per slice: files changed,
  tests with counts, assumptions taken with their undo, deviations, findings for the lead, pending PC runs); then
  `status: done feature/campus-greybox-s3-r3 <sha>` here.

## Report (Night Shift | Cloud Builder 2, 2026-10-25)
R3 built on 3a8c6893: code cd688567, report 4dd20af1 (`docs/campus-greybox/checks/s3-r3-build.md`). Files:
`src/world/maps/campusV2/s3Stairs.ts`, `tests/campusV2S3Stairs.test.ts`, `changes/feature-campus-greybox-s3-r3.md`, the report.
- Tests (`dress: false`, `--maxWorkers=2`): campusV2S3Stairs 25/25, campusV2S3Frame 4/4; `tsc --noEmit -p .` clean.
- Deviations (undos in the report): nav lip 0.2 high x 0.15 deep, not 0.2 x 0.2 (a 0.2 lip caught a cell centre 0.2 m from
  each flight end, a 0.48 step; undo `S3_LIP_DEPTH = 0.2`); door rule tested as its substance (floor rises under 0.4 m
  across each opening; door-to-foot west 0.6, north x-wall 0.55, staff 0.55; the literal 1.5 m cannot hold with 1.4 m
  landings); north / east core north walls on z -0.15, half landings to z -0.3 (A1); `S3_ROOMS_STAIRS` exports
  s3-wstair / s3-nstair / s3-estair. Reach G-L1 through each core alone passes at the cell phase and three shifted phases.
- Findings: F1 frozen s3.ts builds `S3_ROOMS` without the stair rooms: import `S3_ROOMS_STAIRS` and append; stair rooms
  overlap hall / dock / control by design (smallest room wins), so a merged no-overlap test must exempt them. F2 R3 builds
  the whole core rings incl. the z -7 L1 doors nStairL1 / eStairL1 and the x 30 / 33.5 / 58 walls: if R2 also builds them,
  anchors duplicate (R3's test asserts one anchor per stair door). F3 R2's L1 slab must leave holes exactly at the three
  core boxes.
- Pending PC runs: stairs walked in `?campusv2=3` once r1-r5 merge; R5's core-point room test; reach on the full build with
  guards (R6) and the runtime nav build; e2e-sectorops:1..6 flag-off regression.
