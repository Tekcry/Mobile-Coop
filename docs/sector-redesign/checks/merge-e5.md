# Merge E5 (alarm-stage actions, 5c553f0b) into feature/sector-redesign (resolver: Opus, 2026-10-23)

Applied the merge instructions in `e5-check.md`. Nothing committed (the lead commits).

## Resolved
- `src/game/modes/sectorMode.ts`
  - Imports: int's team doors / keypads and E5's `sectorStage` imports together.
  - `start()`: `this.team.build(); this.findKeypads(); this.findStageDoors();` (:192-194). E5's `findBolts()` dropped (int moved it into `SectorTeamDoors`).
  - Int's `overhearStep` kept, then E5's `findStageDoors` (canShut hook with `doorwayClear` + `playerRefsInto`, :357) and `stageActions`. E5's old `useBolt` (`this.unbolt`) dropped for int's `team.unbolt` version.
  - `raised()`: E5's `reinforceSlot` loop with the `n` count, pushing `{ k: -1, slot, alerted: true }` (:629).
  - `unloadSection()`: `stageRun.release()` after `despawnAll`, int's `slotEnemy` reset kept (:437).
  - `beginSection()`: `stageActions(0, run.alarm)` before `if (kit)` (:453). `fixedUpdate`: `stageRun.step()` (:749).
  - `debug()`: `lockdown` beside `keypadLocked` (:845).
- `src/game/sectors.ts`: int's `checkSectors` body kept, plus E5's `nav?: StageNavCheck` (:523), the final `checkStageActions` push (:542) and the `stageActions?` field after `intel` (:133).
- `src/game/sectorStage.ts`: pair gate doors and keypad doors join the doors a lockdown may not use (:133-134). `addDoorClosure` now takes `Pick<StageNav, 'addClosure'>` (:78, still pure) so the team doors' host nav fits.
- `src/game/sectorTeamDoors.ts`: `navClosure` builds through `addDoorClosure` (:145) then `setClosed(id, true)`. `TEAM_NAV_*` removed for `STAGE_NAV_*` (same 0.5 / 0.35). No test asserted `TEAM_NAV_*`.
- `tests/sectorStageActions.test.ts`: new test at :110, where a lockdown on a pair gate door or a keypad door is rejected and a free door is not.
- `changes/feature-sector-redesign.md`: header, `kind: minor`, int's 4 bullets (S2, team doors, keypads, boards) and E5's alarm-stages bullet. E5's other 6 bullets (armed guards, dogs, restart, camera limit, co-op lights, campusOps S1) were left out. They are already released in `CHANGELOG.md` (4.68.0), and int dropped them at the master merge.

## Checks
- No conflict markers. `git diff --check` is clean.
- `npx tsc --noEmit -p .` is clean.
- vitest passed: 11 files, 210 tests. sectorStageActions accounts for 19 of them (was 18).
  - Files: sectorStageActions, sectors, sectorRestart, sectorSlice0, navClosure, campusS1, campusS2, sectorBoltPair, sectorIsolator, sectorKeypad and sectorPairGate.
- eslint on the 4 changed src files and the test file is clean.
- No build, no e2e (as briefed).
