# Sector Ops: Saltmarsh Park v2 S4-c G4.6 + fix 1 (dark, campus-greybox)

PR base: `feature/campus-greybox-s4-b` (S4-c of the lane-stacks split of `feature/campus-greybox-s4`; merge S4-a, S4-b, then this).
Branch `feature/campus-greybox-s4-c`, cut on the S4-b head `6af62e8e8`.

## What it builds
Sources: `docs/campus-greybox/checks/s4-build.md` (G4.6) and `docs/campus-greybox/checks/s4-fix1.md`.
- G4.6: 25 guards (five new: the goods-in officer, the second keyholder, the tank watch, the chiller watch, the night
  runner; the battery checker's round runs through the new colonnade), three renamed routes, the mantrap interlock as a
  two-player pair gate (CR9), the Code Relay lead items (duty roster, deck radio, console and seat placard on the NOC window
  ledge), the sweep points, and tests for the guards, sync nodes, screen count, graph and lights. No section helmet tag.
- Fix 1: the CR8 / CR8-west sills (4.4 m) stay noLedge and get manual ledges on both faces, so the co-op leg-ups hang and
  climb up (the generated 0.2 / 0.3 m strips only allowed a hang). Tests require both.
- New tests: `campusV2S4Guards`, `campusV2S4Graph`, `campusV2S4Screen`, `campusV2S4Sync`.

No player-visible change: behind `?campusv2=4` (flag `campusV2`, owner Night Shift | Sector Ops Build, switch-on at SW-4).

## A23
`src/world/maps/campusV2/s4Data.ts` conflicted in two hunks: the #4 mantrap officer row (lane row with `pair: 20` and the
lane gear comment taken) and the sweep block (lane sweep taken, P0's `(guard-rules S1, A15)` comment line kept above it).
P0's `shieldTeams: true` (guard-rules A4) and no section `gear` are kept in `S4_SECTOR`; its doc comment now says so, and
`tests/campusV2S4Guards.test.ts` asserts `shieldTeams` is `true` (checked: the case fails with `shieldTeams` removed).
Only the S4-b fragment also conflicted (kept byte-equal to S4-b).
No coop4 rows: the v2 list is the signed base list of 25 (no `minPlayers` row; asserted by the existing guard tests).
TAG-4 follows (BRIEF A14: two tagged v2 extras; A15: one base reinforcement waits for room at 4 players).

## Numbers
- Counted lines vs `origin/feature/campus-greybox-s4-b`: 1367 (`node scripts/pr-size.mjs`, cap 1500), 14 files.
- `npm run typecheck:fast`: clean.
- vitest (`--maxWorkers=2`): the S4 v2 files, `changesFragments` and the guard / dress / gear / posts / bake / solo-route
  files (18 files): 218 passed, 1 skipped, 0 failed.
- Changelog fragments: `changes/feature-campus-greybox-s4-c.md` (kind: patch, new); `-s4-a.md` and `-s4-b.md` kept.

## Pending PC run
- `affected-e2e` on this PR head (laptop queue).
- Level validator on the five v2 graphs.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
