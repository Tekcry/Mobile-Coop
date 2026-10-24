# coop4 SM build - Sector Ops rules for 3-4 players

Branch `feature/coop4-sm`, from `feature/coop4` 08267f27 (N0). Builder: Opus. Plan: PLAN.md section 4 "SM"; BRIEF A4, A7-A10, A13.

## Built
- `src/game/sectors.ts`: `SECTOR.syringeExtra` 1, `SECTOR.reinforcePerExtra` 1; `extraPlayers(n)` = max(0, n - 2);
  `syringesFor(preset, players = 2)` = preset + syringeExtra x extra (rookie 3/4/5, normal 2/3/4, realistic and
  perfectionist 1/2/3 at 2/3/4; 1 player = 2 players); `alarmStep(stage, perStage, players = 2)` adds
  reinforcePerExtra x extra; `SectorRun.teamSize` (default 1, set by the mode) feeds `raiseAlarm`; `guardForTeam(slot, n)`
  (`minPlayers` <= n); `capReinforce(send, base, headroom)` = min(send, max(base, headroom)).
- `src/world/rooms.ts`: `SquadSlot.minPlayers?: number` (field only).
- `src/game/modes/sectorMode.ts`:
  - `loadSection` (start, connector load, restart) sets `run.teamSize` and skips guards with `minPlayers` above it;
    the guard index `k` stays the list index (desks, overhear). TODO line for Guard AI's team-size hook there.
  - `raised`: the 3-4 player extras are clamped to the live cap (`em.maxAlive - em.alive - pending`); the section's own
    `perStage` goes as today (pending until room). Refusals log once per alarm (`console.info`). Cap unchanged:
    `SECTOR.maxAlive` 32 = `MAX_ENEMIES` 32. Tagged guards count against it (they are ordinary pending guards).
  - `opTeam` (team at `start()`) sizes the rating's syringe preset (`syringesFor(difficulty, opTeam)`).
  - `onEnemyKilled`: attacker slot via `slotOfId` ('local' / '' = this machine; unknown -> 1, master's fallback).
  - `onRemoteJam(id, ...)`: passes the sender's slot as a 3rd argument through the `SlotJam` view (compiles against
    master's 2-arg `CtDevices.onRemoteJam` and D1's `(tgt, eye?, slot = 1)`).
  - `checkpointSpawns`: comment only (slots 2-3 go beside, A14).
- `src/game/rating/sectionRating.ts`: `SyncedDetector` over `PLAYER_SLOTS`: a takedown pairs with the most recent unused
  one of any other slot within `SYNC_WINDOW`; both used; a third starts a new pair; out-of-range player reads as 1.

## Helpers N1 replaces (sectorMode.ts, exported)
```ts
export function teamSizeOf(g: GameState, refs: PlayerRef[]): number {
  return (g as { teamSize?(): number }).teamSize?.() ?? g.playerRefsInto(refs).length;
}
export function refSlot(r: PlayerRef, index: number): number {
  return (r as Partial<TeamFields>).slot ?? index;
}
export function slotOfId(g: GameState, refs: PlayerRef[], id: string, none: number): number // 'local' / '' = local
```
Pre-N1 `teamSizeOf` counts listed (connected) players only; N1's `teamSize()` adds held players (A10).

## For integration
- N1: `coopHost.ts:193` should pass the team at start: `syringesFor(g.opts.difficulty, teamSize)`, so the revive cap
  agrees with the mode's `opTeam`.
- D1: once `onRemoteJam(tgt, eye?, slot = 1)` lands the `SlotJam` view can go (call `this.ct?.onRemoteJam(...)` directly).
- AI5: the TODO in `loadSection`; Guard AI's `responseShape` (headroom) would replace `capReinforce` in `raised`.
- DATA: do not tag a desk operator `minPlayers` (an unspawned operator reads as an unmanned desk).

## Checks
- `npx tsc --noEmit`: clean. `npx eslint` on the 6 files: clean.
- vitest (`--maxWorkers=2`, slot lock): 27 files, 512 tests pass: sectorTeamScale (new), sectionRating, sectors,
  sectorRestart, sectorBolt, sectorBoltPair, sectorStep3, sectorRatingHost, sectorDesk, sectorIntelCode, sectorKeypad,
  sectorPairGate, sectorStageActions, sectorGuardTags, sectorItemScope, lockedDoorPath, responseWiring, weaponsCrate,
  courseMarks, ratingRejoin, ratingWire, ratingCardText, coopRejoin, campusArtKit, campusDressRules, campusS1-S5.
- Course: zero diff in `src/game/course`, `courseMode.ts`, `src/world/maps`; the 2-slot `SyncedDetector` is checked
  against master's logic on 20 seeded 60-takedown runs (identical results and counts).
- Not run (per brief): e2e, build, GPU. e2e owed: `e2e-sectorops` 1-6, `e2e-section-rating`, `e2e-ctcourse`.

## Tests added
- `tests/sectorTeamScale.test.ts`: syringes 1-4 by preset; extras; reinforcements per stage 1-4; `raiseAlarm` by
  teamSize; `capReinforce`; `guardForTeam`; helpers (with and without `teamSize()` / `slot`); minPlayers at load and
  restart (2 / 3 / 4 / solo), tagged guards under the cap; alarm extras at 2 and 4 players, refused at the cap, partial
  headroom; attacker slot pairs (2+3, local+2, pre-N1 index); `onRemoteJam` slot.
- `tests/sectionRating.test.ts`: 0+2, 1+3, triple counts once, window choice, reset / out-of-range, 2-slot identity.
