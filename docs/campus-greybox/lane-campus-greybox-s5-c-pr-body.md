# Sector Ops: Saltmarsh Park v2 S5-c P4 co-op and checks (dark, campus-greybox)

PR base: `feature/campus-greybox-s5-b` (branch `feature/campus-greybox-s5-c`; merge S5-a and S5-b first, then retarget to master). Merge order: S5-a, S5-b, S5-c.

## What this builds (from `docs/campus-greybox/checks/s5-build.md` and `s5-fix1.md`)
**S5-P4 co-op and checks:**
- Three co-op boost lips, `S5_COOP_LIPS` (CR8-s5 the low roof's gutter kerb from the lawn, CR9-s5 the roof's coping from the low roof, CR10-s5 the smoke hatch's kerb from the kitchen), carried by `S5_PARTS.coopLips`; each out of reach of a solo jump.
- Graph `campusOps-S5.json`: guard keys "1".."4" on every guarded space (26 at every key), `unavoidable` on `s5-ante`, the lip link notes marked built.
- New tests: `tests/campusV2S5Coop.test.ts` (lips rules 1-5, LD 11.8, CR7 two players only, K4 choke), `tests/campusV2S5Graph.test.ts` (graph vs build, guard sums, light at the vantages), `tests/campusV2S5Screen.test.ts` (screen cap: worst 7, cap 12).
- Build report `docs/campus-greybox/checks/s5-build.md`.

**Fix 1** (`docs/campus-greybox/checks/s5-fix1.md`): the three lip pieces are 0.40 m deep (lip faces kept) so each lip can be climbed, not only hung from; tests require `canClimbUp` and room to stand on top.

**A23 assert:** `tests/campusV2S5Guards.test.ts` now asserts `shieldTeams` is `true` (P0's guard-rules state kept in `s5Data.ts`); checked it fails with `shieldTeams` removed. No `minPlayers` row in `s5Data.ts`: the v2 list is the signed base list of 26 (asserted).

No player-visible change: behind `?campusv2=5` (flag `campusV2`, owner Night Shift | Sector Ops Build, switch-on at SW-5).

TAG-5 follows (BRIEF A14: two tagged v2 extras; A15: two base reinforcements wait for room at 4 players).

Changelog fragment: `changes/feature-campus-greybox-s5-c.md`; S5-a and S5-b fragments kept.

## Checks
- Counted lines vs `origin/feature/campus-greybox-s5-b` (`scripts/pr-size.mjs`): **1067** (< 1500; 11 files).
- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run --maxWorkers=2` on the S5-b list plus `tests/campusV2S5Coop.test.ts tests/campusV2S5Graph.test.ts tests/campusV2S5Screen.test.ts tests/campusS5Dress.test.ts tests/campusDressRules.test.ts tests/armour.test.ts tests/campusGear.test.ts tests/campusPosts.test.ts`: 15 files, **171 / 171** pass.

## Pending PC run
- `affected-e2e` on this PR head (laptop queue).
- E2E-1: the climbs on CR8-s5, CR9-s5 and CR10-s5 (climb prompt engages after the leg-up).
- Level validator on the five v2 graphs (`node scripts/level-validate.mjs docs/sector-redesign/graph/v2/campusOps-S{1..5}.json`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
