Sector Ops: Saltmarsh Park v2 S3-d R4 lamps, devices and sync (dark, campus-greybox)

PR base: feature/campus-greybox-s3-c (merge in order: S3-a, S3-b, S3-c first)

Builds the S3 (lab block) v2 lighting and security devices: `S3_LIGHTS` (one provisional block, 32 fittings on the
switchable circuits, including the J17 emergency and fire-stair circuits; `TODO(light-realism)`), the 17 light switches,
the laser emitters, beams and panels, the sign-out board, the cameras and alarm panels (`s3Devices.ts`). Adds
`tests/campusV2S3Lights.test.ts` and `tests/campusV2S3Sync.test.ts` (plan-graph sync checks).

No player-visible change: behind `?campusv2=3` (flag `campusV2`, owner Night Shift | Sector Ops Build, switch-on at SW-3).

- Counted lines vs `feature/campus-greybox-s3-c`: 659 (`node scripts/pr-size.mjs`, cap 1500).
- tsc (`npx tsc --noEmit -p tsconfig.json`): clean.
- vitest (`--maxWorkers=2`): the S3-c list plus `campusV2S3Lights`, `campusV2S3Sync`: 9 files, 112 tests, all pass.
- Pending PC run: `affected-e2e` on this PR head (laptop queue).
- Deviations: none. Round report: `docs/campus-greybox/checks/s3-r4-build.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
