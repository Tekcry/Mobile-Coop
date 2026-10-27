# Sector Ops: Saltmarsh Park v2 S4-b G4.3 + G4.4 + G4.5 (dark, campus-greybox)

PR base: `feature/campus-greybox-s4-a` (S4-b of the lane-stacks split of `feature/campus-greybox-s4`; merge S4-a first, then this).
Branch `feature/campus-greybox-s4-b`, cut on the S4-a head `a14f3592a`.

## What it builds
Source: `docs/campus-greybox/checks/s4-build.md` (G4.3, G4.4, G4.5).
- G4.3 west strip: the colonnade corridor widens to 3.3 m under a ceiling slab (two doors 3 m apart, hall door walled up);
  a staff door joins the UPS room to the security room; an essential-lighting board by the battery room (cuts NOC and
  security room lamps for 25 s) and a battery room lamp with its own switch; the colonnade sentry (#19) stands deeper.
- G4.4 NOC block: a dog-leg fire stair (two 1.3 m flights, mid landing) replaces the steep flight; a NOC roof hatch with a
  ladder to the plant deck, an escape door onto a platform with a caged ladder to the north corridor, a rooflight onto the
  NOC seats; a warm security room console lamp and three switched lamps in the north corridor.
- G4.5 compound and riser: the riser partition moves 0.1 m west with a keypad on the riser side; a new cable-pull keypad
  door joins the generator compound to the riser; the plant ladder starts on a locked anti-climb cage (co-op leg-up CR10
  onto the cage); four floodlight poles light the plant deck; a switched riser lamp.
- New `tests/campusV2S4Lights.test.ts`; the S4 and S4 co-op tests extended.

No player-visible change: behind `?campusv2=4` (flag `campusV2`, owner Night Shift | Sector Ops Build, switch-on at SW-4).

## A23
`src/world/maps/campusV2/s4Data.ts` merged without a conflict at this part. P0's `shieldTeams: true` and no-section-gear
lines are kept in `S4_SECTOR` (BRIEF A23 / A27). Only conflict: the S4-a changelog fragment (kept byte-equal to S4-a).

## Numbers
- Counted lines vs `origin/feature/campus-greybox-s4-a`: 800 (`node scripts/pr-size.mjs`, cap 1500), 9 files.
- `npm run typecheck:fast`: clean.
- vitest (`--maxWorkers=2`): `campusV2S4`, `campusV2S4Coop`, `campusV2`, `campusS4`, `changesFragments`, `campusV2S4Lights`:
  6 files, 102 tests, all pass.
- Changelog fragments: `changes/feature-campus-greybox-s4-b.md` (kind: patch, new); `-s4-a.md` kept.

## Pending PC run
- `affected-e2e` on this PR head (laptop queue).
- Build report E2E-1 / E2E-2 (v2): the roof hatch ladder, the escape ladder, the CR10 leg-up and the cage-top ladder
  attach, the riser keypad door.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
