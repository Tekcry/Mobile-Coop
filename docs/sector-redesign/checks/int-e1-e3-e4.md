# Integration E1 + E3 + E4 (integrator: Opus 5.5, 2026-10-23)

Branch `feature/sector-redesign-int`, base `origin/feature/sector-redesign-e3` ae6131ca (E3 pair bolt / pair gate).
Merged `origin/feature/sector-redesign-e1` 0986b109 (keypads) as 0b08a11e, then `origin/feature/sector-redesign-e4`
4aa0a462 (isolator boards) as d84f9c16. Not pushed.

## Merge 1: E1 keypads (0b08a11e)
- `src/game/modes/sectorMode.ts` (9 hunks). E3 had moved the bolt code into `src/game/sectorTeamDoors.ts`; E1 had
  edited the old in-mode bolt code (factored its nav closure into `navClose`) and added keypads next to it.
  - Kept E3's `team: SectorTeamDoors`, its constructor host, the `bolts` / `pairGates` getters, `team.build()`, and
    the `useBolt` / `turnKey` hooks. Dropped E1's copies of `BoltIt`, `findBolts`, `unbolt`, `rebolt`, `navClose`,
    `BOLT_NAV_*` and the `BOLT_DEPTH` / `BOLT_REACH` imports (all live in `SectorTeamDoors`).
  - Kept all of E1's keypad side: `KeyIt`, labels, `codes: SectorCodes` (built in the constructor), `keyIts`,
    `boardIts`, `granted`, `slotEnemy` (+ `Pending.k`, auto-merged), `findKeypads` (called after `team.build()`),
    `enterCode`, `learned`, `keypadLabels`, `rekey`, `overhearStep` (talkers), `useKeypad`, imports.
  - One nav closure helper: `SectorTeamDoors.navClosure(door, at)` is now public (E3's private `closeDoor` calls it
    after locking); `findKeypads` calls `this.team.navClosure(door, p.at)`. Same sizes (0.5 along, 0.35 across), so
    keypad closures are unchanged from E1.
  - Restart: `this.team.reset(index)` (E3) then `this.rekey(index)` (E1), before `unloadSection` as both branches had.
  - `debug()`: E3's `pairGates` plus E1's `codes`, `keypads`, `keypadLocked`.
- `src/game/sectors.ts`: `SectorDef` keeps both `pairGates` (E3) and `keypads` / `intel` (E1); E1's `SectorKeypad`,
  `SectorIntel`, constants, ids and `checkSectorCodes` kept whole. `checkSectors` (auto-merged) runs E3's pair-gate
  checks and E1's `checkSectorCodes`.
- `changes/feature-sector-redesign.md`: both lines kept.
- `npx tsc --noEmit -p .`: clean.

## Merge 2: E4 isolator boards (d84f9c16)
- `changes/feature-sector-redesign.md`: conflict, every line kept (E3, E1, E4).
- `sectorMode.ts`, `stealthSystems.ts`, `isolators.ts`, `sectorReset.ts`, `mapDef.ts`: merged cleanly. E4's
  `markGroupOn` loop in `beginSection` sits after `startState.take` as on E4. Slice 0 restart reset (A50) untouched:
  `checkpointReset` -> `boards.cancel()`, `startState.apply`, `syncSwitches`.
- `npx tsc --noEmit -p .`: clean.

## Tests
- `npx vitest run tests/sectorKeypad.test.ts tests/sectorBoltPair.test.ts tests/sectorPairGate.test.ts
  tests/sectorBolt.test.ts tests/navClosure.test.ts tests/sectorIsolator.test.ts tests/sectorLampSync.test.ts
  tests/sectorRestart.test.ts tests/sectors.test.ts tests/sectorSlice0.test.ts tests/net.test.ts tests/course.test.ts`:
  12 files, 233 tests pass.
- eslint on `src/game/modes/sectorMode.ts`, `src/game/sectors.ts`, `src/game/sectorTeamDoors.ts`: clean.
- No e2e, no build (as instructed).

## Code changes beyond conflict markers
- `src/game/sectorTeamDoors.ts`: `navClosure` split out of `closeDoor` and made public (the shared helper).
