Sector Ops: Saltmarsh Park v2 S3-a R1a frame (dark, campus-greybox)

PR base: master

Builds the S3 (lab block) v2 frame from the signed re-plan ("Re-plan as drawn, 20 guards"): `s3Kit.ts` (constants, the
`S3_BOX` plan boxes, the 24 `S3_DOORS` rows with swings, light circuit groups, the shared wall/door/slab/rail helpers),
`s3.ts` rewritten to compose shell, L1, stairs and lights, and empty stubs for the later parts (`s3Shell`, `s3L1`,
`s3Stairs`, `s3Lights`, `s3Devices`, `s3Lips`). `S3_V2_COPY = false`. New `tests/campusV2S3Frame.test.ts` (4 tests: the
campus builds with the flag on, the doors match brief 3.2 row by row, L1 door spacing).

No player-visible change: behind `?campusv2=3` (flag `campusV2`, owner Night Shift | Sector Ops Build, switch-on at SW-3).

- Counted lines vs `feature/campus-greybox-p0`: 1030 (`node scripts/pr-size.mjs`, cap 1500).
- tsc (`npx tsc --noEmit -p tsconfig.json`): clean.
- vitest (`--maxWorkers=2`): `campusV2S3Frame`, `campusV2`, `campusS3`, `changesFragments`: 4 files, 46 tests, all pass.
- Pending PC run: `affected-e2e` on this PR head (laptop queue).
- Deviations: none. Re-stack of finished lane commit `cb43b6cee` (R1a); changelog fragment cut to the frame only.

Stack order: S3-a (base master) -> S3-b -> S3-c -> S3-d -> S3-e -> S3-f, merge in order.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
