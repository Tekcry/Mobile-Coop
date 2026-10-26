# Sector Ops: Saltmarsh Park v2 S5-a P1 shell re-cut (dark, campus-greybox)

PR base: `master` (branch `feature/campus-greybox-s5-a`, cut from P0 `f466c4a5b`, already on master). Merge order: S5-a, S5-b, S5-c.

## What this builds (S5-P1, from `docs/campus-greybox/checks/s5-build.md`)
The section 5 shell of Saltmarsh Park v2 (`src/world/maps/campusV2/s5.ts`, `s5Dress.ts`, graph `campusOps-S5.json`):
- The stair hall takes the back corridor's south half as a dark screens passage behind a 2.2 m timber screen with two settles; the old west passage is the hall's open alcove; a back hall with the anteroom side door and a kitchen door.
- The anteroom grows to 8.8 x 6.3 with an audit table and a 3 m glazed screen onto the light well; the strongroom day gate stands open; the shaft moves north beside it; the kitchen is 1 m wider; the lobby doors are off each other's line.
- The hall stair is 2.4 m wide in two flights with a landing; new doors control room to garden and boardroom to CEO suite; the archive gets a free-standing row, wall shelving, a plan chest and a rooflight with hatch and ladder; the cage moves over the shaft.
- Light well cleaning ladder, plant room flue ladder and hatch, smoke hatch to the low roof, gutter kerb and roof coping for later co-op boosts, west rappel, 1.2 m hedges and balustrade; every lamp in one `S5_LIGHTS` block.
- New test file `tests/campusV2S5.test.ts` (shell, grounds, L1, roofs, nav flood, rooms, copy marker).

No player-visible change: behind `?campusv2=5` (flag `campusV2`, owner Night Shift | Sector Ops Build, switch-on at SW-5).

Changelog fragment: `changes/feature-campus-greybox-s5-a.md`.

## Checks
- Counted lines vs `f466c4a5b` (`scripts/pr-size.mjs`): **877** (< 1500; 6 files).
- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run --maxWorkers=2 tests/campusV2S5.test.ts tests/campusV2.test.ts tests/campusS5.test.ts tests/changesFragments.test.ts`: 4 files, **49 / 49** pass.

## Pending PC run
- `affected-e2e` on this PR head (laptop queue).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
