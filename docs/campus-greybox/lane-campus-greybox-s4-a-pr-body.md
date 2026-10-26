# Sector Ops: Saltmarsh Park v2 S4-a G4.1 + G4.2 (dark, campus-greybox)

PR base: `master` (S4-a of the lane-stacks split of `feature/campus-greybox-s4`: S4-a, then S4-b, then S4-c, merge in order).
Branch `feature/campus-greybox-s4-a`, cut on P0 (`feature/campus-greybox-p0` @ `f466c4a5b`, already on master).

## What it builds
Source: `docs/campus-greybox/checks/s4-build.md` (G4.1, G4.2).
- G4.1 south band: the service corridor and the hall lobby become one 6 m goods-in lobby; the mantrap moves 1 m west with
  an open trolley alcove beside it and the desk moves west; three 1.2 m parcel cages give low cover along the goods lane;
  the dock and battery room doors sit 1.5 m off the corners; two new lobby lamps, a mantrap lamp and a dock board lamp (all
  as-built lamps kept, in one `S4_LIGHTS` block); the hall panel and lobby switches move; a body hide spot in the alcove.
- G4.2 return-air plenum over the lobby ceiling as a crawl route: grilles from cable baskets B1 and B2 (run on to the hall
  wall), the dock and the battery room (co-op leg-ups CR8 and CR8-west), a ceiling hatch down into the lobby; battery racks
  2.0 m high with no climbable top. Battery rack skins are omitted from the dress (kit piece fits scale 1.3 only).

No player-visible change: behind `?campusv2=4` (flag `campusV2`, owner Night Shift | Sector Ops Build, switch-on at SW-4).

## A23
The only merge conflict was `src/world/maps/campusV2/s4Data.ts` (the #4 mantrap officer row and the gear comment): lane row
taken, P0's gear comment kept. P0's `shieldTeams: true` and no-section-gear lines are kept in `S4_SECTOR` (BRIEF A23 / A27).

## Numbers
- Counted lines vs `f466c4a5b`: 908 (`node scripts/pr-size.mjs`, cap 1500), 8 files.
- `npm run typecheck:fast`: clean.
- vitest (`--maxWorkers=2`): `campusV2S4`, `campusV2S4Coop`, `campusV2`, `campusS4`, `changesFragments`: 5 files, 83 tests, all pass.
- Changelog fragment: `changes/feature-campus-greybox-s4-a.md` (kind: patch).

## Pending PC run
- `affected-e2e` on this PR head (laptop queue); E2E-1 (v2): the CR8 / CR8-west climbs engage (build report finding R1:
  the sills may allow a hang only).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
