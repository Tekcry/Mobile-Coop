Sector Ops: Saltmarsh Park v2 S3-b shell, ground floor and upper floor (dark, campus-greybox)

PR base: feature/campus-greybox-s3-a (merge in order: S3-a first)

Builds the S3 (lab block) v2 shell and ground-floor re-lay (R1: outer walls, hall north wall with roller gap and
observation glass, dock, plant and control walls, hall contents, yard walls, the G rooms, nav seeds and hide spots) and
the upper floor (R2: the L1 slab and its holes, the bridge landing, viewing corridor and east lobby, north rooms,
security room, escape gallery, crane walkway, hoist hatch, ceilings and ceiling void, rooms and seeds). Adds
`tests/campusV2S3Shell.test.ts` and `tests/campusV2S3L1.test.ts`. Also carries the join fix `5f00ff6cc` (chamber-roof
nav seed x 33 -> 32 in `s3L1.ts` and the pinned row in `campusV2S3L1.test.ts`): R2's seed sat 0.25 m from R1's plant, so
"the G nav seeds and hide spots are on nav" went red with R1 + R2 together.

No player-visible change: behind `?campusv2=3` (flag `campusV2`, owner Night Shift | Sector Ops Build, switch-on at SW-3).

- Counted lines vs `feature/campus-greybox-s3-a`: 1354 (`node scripts/pr-size.mjs`, cap 1500).
- tsc (`npx tsc --noEmit -p tsconfig.json`): clean.
- vitest (`--maxWorkers=2`): `campusV2S3Frame`, `campusV2`, `campusS3`, `changesFragments`, `campusV2S3Shell`,
  `campusV2S3L1`: 6 files, 71 tests, all pass.
- Pending PC run: `affected-e2e` on this PR head (laptop queue).
- Deviations: cherry-pick of `5f00ff6cc` (the join fix above; r6 carries the same change, so S3-f merges clean).
  Changelog: new `changes/feature-campus-greybox-s3-b.md` (shell, ground floor and upper-floor bullets).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
