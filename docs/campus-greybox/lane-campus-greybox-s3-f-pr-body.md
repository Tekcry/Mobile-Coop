Sector Ops: Saltmarsh Park v2 S3-f R6 lips, co-op and graph, R7 dressing (dark, campus-greybox)

PR base: feature/campus-greybox-s3-e (merge in order: S3-a .. S3-e first)

Builds the last parts of the S3 (lab block) v2 layout: the two co-op climbs (`S3_COOP_LIPS`: the test chamber's roof and
the goods landing over the loading pad, each a 4.4 m boost), the reach checks (a player alone cannot get up either
climb, every room is reachable from the start, each fire stair links the floors on its own), the v2 graph as built
(guards per room for 1-4 players), and the lab block's dressing re-run for the new rooms (`s3Dress.ts`). Adds
`tests/campusV2S3Coop.test.ts`, `tests/campusV2S3Graph.test.ts`, `tests/campusV2S3Dress.test.ts`. The guard list keeps the
signed base list: no `minPlayers` row (`git grep minPlayers -- src/world/maps/campusV2/s3Data.ts` prints nothing;
`campusV2S3Guards.test.ts` asserts 20 guards and no `minPlayers`). TAG-3 follows (BRIEF A14: two tagged v2 extras).

No player-visible change: behind `?campusv2=3` (flag `campusV2`, owner Night Shift | Sector Ops Build, switch-on at SW-3).

- Counted lines vs `feature/campus-greybox-s3-e`: 929 (`node scripts/pr-size.mjs`, cap 1500).
- tsc (`npx tsc --noEmit -p tsconfig.json`): clean.
- vitest (`--maxWorkers=2`): the S3-e list plus `campusV2S3Coop`, `campusV2S3Graph`, `campusV2S3Dress`, `campusS3Dress`,
  `campusDressRules`, `campusPosts`, `sectionBakeCampus`: 17 files, 218 passed, 1 skipped, 0 failed.
- Pending PC run: `affected-e2e` on this PR head (laptop queue); the level validator on the five v2 graphs.
- Deviations: none. The join fix `5f00ff6cc` arrives already in S3-b, so this merge is clean. Round report:
  `docs/campus-greybox/checks/s3-r6-build.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
