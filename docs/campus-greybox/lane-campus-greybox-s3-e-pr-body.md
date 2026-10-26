Sector Ops: Saltmarsh Park v2 S3-e R5 20 guards and routes, join J1-J4 and J8 (dark, campus-greybox)

PR base: feature/campus-greybox-s3-d (merge in order: S3-a .. S3-d first)

Builds the S3 (lab block) v2 guard layer in `s3Data.ts`: the 20 guards (posts, patrols, the #2-#3 loop, squads, roles,
reasons, the posted dock officer at the goods door), `S3_ENTRY` / `S3_EXIT`, the four routes (shadow, loud, high,
secret), and `S3_SECTOR` with the keypads, code board, isolator board, cameras, desk and alarms wired in. Carries the
join fixes J1-J4 and J8 (no guard slot or route point inside a stair core, and related nav fixes in `s3L1.ts`). Adds
`tests/campusV2S3Guards.test.ts`: the merged-lane nav half now runs (no skipped cases).

No player-visible change: behind `?campusv2=3` (flag `campusV2`, owner Night Shift | Sector Ops Build, switch-on at SW-3).

- Counted lines vs `feature/campus-greybox-s3-d`: 834 (`node scripts/pr-size.mjs`, cap 1500).
- tsc (`npx tsc --noEmit -p tsconfig.json`): clean.
- vitest (`--maxWorkers=2`): the S3-d list plus `campusV2S3Guards`: 10 files, 129 tests, all pass, 0 skipped.
- Pending PC run: `affected-e2e` on this PR head (laptop queue).
- Deviations: none. Round report: `docs/campus-greybox/checks/s3-r5-build.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
