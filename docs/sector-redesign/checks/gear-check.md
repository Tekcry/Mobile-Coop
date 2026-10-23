# Gear and sweep check (commit 8b135170)

Verdict: PASS (no FIX items).

## Does per-slot `gear` reach the game? Yes
- `src/game/modes/sectorMode.ts:568` queues `slot: s.guards[k]` (the SectorGuard object itself, not a copy).
- `sectorMode.ts:752` calls `em.placeSlot(e, p.slot, ..., this.run.defs[this.run.index]?.gear)`.
- `src/ai/enemyManager.ts:1139-1149`: `placeSlot` takes `slot: ... & GuardSlotTags` and reads `slot.gear` (`GuardSlotTags.gear`, `src/ai/guardAiData.ts:98`), merges with the section default via `mergeGear` (`src/ai/gear.ts:62`: OR of both).
- `SectorGuard` has no `gear` field, but `GearGuard = SectorGuard & { gear?: GearTag }` is structurally assignable to `GuardSlotTags`, so the value is read at runtime. The alias is only a typing bridge; the proper home is `SquadSlot` (`src/world/rooms.ts:22`) or `SectorGuard` (`src/game/sectors.ts:78`) when guard-ai adds it. Not blocking.
- `validateGuardAi` (`guardAiData.ts:336`) checks per-slot `gear` values.

## Dogs
`Enemy.setGear` (`src/ai/enemy.ts:560-563`) sets helmet/armour only when `!this.dog`, so `SectorDef.gear = 'helmet'` gives a dog nothing. No FIX.

## Sweep
- `SectorDef.sweep` (`sectors.ts:122`) is not read by any runtime code yet (only `sweepPoints` in `src/ai/gear.ts:143`, which nothing calls); S13 consumption is pending. Data-only is as briefed. Points are asserted on the runtime nav grid, storey 0, reachable from every reinforce point by `tests/campusGear.test.ts`.
- S1-S3 unchanged (diff touches only S4 / S5 data, a test, docs).

## Runs
- `npx tsc --noEmit`: exit 0.
- `npx vitest run tests/campusGear.test.ts tests/campusS4.test.ts tests/campusS5.test.ts`: 78 / 78.

## Notes (non-blocking)
- Alias is duplicated (exported in S4, local in S5); drop both when `gear?` lands on `SquadSlot`.
- Sweep points do nothing until S13 reads `SectorDef.sweep`.
