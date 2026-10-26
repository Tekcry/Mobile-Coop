# Sector Ops: Saltmarsh Park v2 S5-b P2 devices and light + P3 guards and routes (dark, campus-greybox)

PR base: `feature/campus-greybox-s5-a` (branch `feature/campus-greybox-s5-b`; merge S5-a first, then retarget to master). Merge order: S5-a, S5-b, S5-c.

## What this builds (from `docs/campus-greybox/checks/s5-build.md`)
**S5-P2 devices and light** (`s5.ts`, `s5Data.ts`, graph):
- CR7 hoist door as a two-player pair gate (keys at (-45.85, 38.4) and (-44.0, 32.15)); the way down the light well is a hang-drop, no rappel anchor at the sill.
- The cage pair gate, shaft beams and panel move with the shaft; the archive keypad kp-arch moves to (-38, 35.5) on the back landing.
- House lighting board on the back landing (circuits 83 + 88, 45 s) and the garden board on the moved kitchen wall (84, 30 s); new circuits 150-157 and 17 switches; lamps added (audit desk, archive reading, jetty lantern, lane, van work light, roof walk, bulkhead, room fittings); every as-built lamp kept.
- New tests: `tests/campusV2S5Lights.test.ts`, `tests/campusV2S5Sync.test.ts`.

**S5-P3 guards and routes** (`s5Data.ts`):
- 26 guards (the 24 kept, ten moved; new: an audit officer at the table and a jetty sentry), inside the 32 live cap with the six reinforcements.
- Three ways in rewritten (screens passage and side door; hall front and anteroom hall door; service stair, archive, roof and light well); exit west through the open alcove; armoured bypasses.
- New test: `tests/campusV2S5Guards.test.ts`.

No player-visible change: behind `?campusv2=5` (flag `campusV2`, owner Night Shift | Sector Ops Build, switch-on at SW-5).

A23: P0's `shieldTeams: true` and no section `gear` are kept in `s5Data.ts` (guard-rules A15 / A4 comments kept; the lane's rows, positions and sweep taken in the three conflicting hunks). Armour only on the response team and keyholders (A27).

Changelog fragment: `changes/feature-campus-greybox-s5-b.md`; S5-a's fragment kept.

## Checks
- Counted lines vs `origin/feature/campus-greybox-s5-a` (`scripts/pr-size.mjs`): **1121** (< 1500; 8 files).
- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run --maxWorkers=2` on `tests/campusV2S5.test.ts tests/campusV2.test.ts tests/campusS5.test.ts tests/changesFragments.test.ts tests/campusV2S5Lights.test.ts tests/campusV2S5Sync.test.ts tests/campusV2S5Guards.test.ts`: 7 files, **76 / 76** pass.

## Pending PC run
- `affected-e2e` on this PR head (laptop queue).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
