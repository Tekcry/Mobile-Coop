Sector Ops: Saltmarsh Park v2 S3-c R3 fire stairs (dark, campus-greybox)

PR base: feature/campus-greybox-s3-b (merge in order: S3-a, S3-b first)

Builds the three S3 (lab block) fire stairs (west, north, east cores) from the `S3_BOX` core boxes: core walls and
doors with the kit swings, six flights (13 and 14 risers, 1.4 wide), L1 and half landings, spine walls, rails, the north
core lid, nav lips at the flight tops, ambient light per core, and the `s3-wstair` / `s3-nstair` / `s3-estair` HUD rooms.
Exports `S3_CORES` and `S3_CORE_GEOMETRY` for the guard routes (R5/R6). Adds `tests/campusV2S3Stairs.test.ts` (25 tests,
including a nav-grid reach check G <-> L1 through each core alone).

No player-visible change: behind `?campusv2=3` (flag `campusV2`, owner Night Shift | Sector Ops Build, switch-on at SW-3).

- Counted lines vs `feature/campus-greybox-s3-b`: 757 (`node scripts/pr-size.mjs`, cap 1500).
- tsc (`npx tsc --noEmit -p tsconfig.json`): clean.
- vitest (`--maxWorkers=2`): the S3-b list plus `campusV2S3Stairs`: 7 files, 96 tests, all pass.
- Pending PC run: `affected-e2e` on this PR head (laptop queue).
- Deviations: none from the stack plan. The round's own build report notes its deviations (nav lip 0.15 deep, assumptions
  A1-A6): `docs/campus-greybox/checks/s3-r3-build.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
