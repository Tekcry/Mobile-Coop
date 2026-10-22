# E4 - EW8 breaker / timed isolator boards (engine builder)

Branch `feature/sector-redesign-e4`, base 95097957. Engine + data shape + tests only: no map data, no campus files.

## Data shape
`MapLayout.boards?: BoardDef[]` (what a map's `build` returns, next to `switches`; A11's "MapDef.switches" are these
layout switches). Chosen over `SectorDef`: a board is a fixed wall fixture like a switch, it is not per-section state,
and lamp restore on restart already runs per section through `SectionStartState`.

```ts
// in a map's build(), beside layout.switches
boards: [
  // breaker: cuts circuit 4 until a player switches it back
  { pos: new Vector3(12.4, 0, -8.1), yaw: Math.PI, groups: [4] },
  // timed isolator: cuts circuits 6 and 7 for 20 s (ISOLATOR_WINDOW), then they come back
  { pos: new Vector3(30.2, 0, 5.6), yaw: -Math.PI / 2, groups: [6, 7], window: 20 },
],
```
`pos` is the floor point at the wall (the item box sits at 1.3 m like a switch), `yaw` faces the room, `groups` are
`LightDef.group` circuits, `window` > 0 makes it timed (unset / 0: breaker).

## Behaviour
- Item `board-<i>`, kind `switch` (no new item kind on the wire), reach 1.3 m (the switch's).
- Breaker: "Breaker off" cuts (`setGroup(g, false)` per group), "Breaker on" puts back.
- Isolator: "Isolate circuit" cuts and starts the window; during it the item is off-use, label "Circuit isolated",
  indicator dark. At the end the circuits come back exactly once with the cue: `lightSwitch` event (click), indicator
  lit, lamps on, feed line "Circuit restored" (host).
- Every cut calls `EnemyManager.lightsOut` at the board (nearest calm armed guard within 25 m comes to look).
- Wall switches on the same circuits follow (`syncGroup`); a wall switch moving a shared circuit updates idle boards.
- Restart (A50): `resetForRestart` drops running windows, `SectionStartState.apply` puts the lamps back,
  `syncSwitches` has the boards read their circuits. No `sectorMode.ts` change.
- GA4 hook: `IsolatorBoards.switchBack(i)` (commented); nothing calls it, no guard behaviour added.
- Co-op: the client's `use` reaches `coopHost.onUse` (reach check) -> the item's `onUse` -> `boards.use`. The lamps go
  through the registry, so slice L's `lamps` bitset carries them; protocol and `lampSync.ts` unchanged.

## Files
- `src/game/isolators.ts` (new, pure): `BoardDef`, `IsolatorBoards`, `ISOLATOR_WINDOW` 20, `BOARD_REACH` 1.3.
- `src/world/mapDef.ts`: `MapLayout.boards`.
- `src/game/stealthSystems.ts`: board items, sink (lightsOut, cue), `fixedUpdate` tick, restart cancel, follow.
- `tests/sectorIsolator.test.ts` (new, 7 tests).

## Assumptions
- I1 Shape on `MapLayout` (the MapDef's build output), not `SectorDef` (reason above).
- I2 Board visual is the wall switch box until art; the map places its own cabinet geometry.
- I3 An isolator cannot be switched back early by a player (the window is the player's); a breaker can.
- I4 A board and a wall switch on the same circuit share the registry's group state; last action wins. A window's end
  relights the circuit even if a wall switch turned it off meanwhile.
- I5 Restart drops every running window. Edge: a window started in the previous section and still running when the
  next begins was recorded off in the start state, so a restart leaves those lamps dark (player-favourable).
- I6 The co-op client's board label / enabled state follow through the snapshot items; the "Circuit restored" feed
  line shows on the host only.
- I7 Shot lamps stay shot: `setGroup` skips destroyed lamps.

## Tests
- `npx tsc --noEmit -p .`: clean.
- `vitest run tests/sectorIsolator.test.ts tests/sectorLampSync.test.ts tests/sectorRestart.test.ts tests/sectors.test.ts`:
  4 files, 53 tests pass. `IsolatorBoards.update` 0.0 B per call (`allocPerCall` helper).
- eslint on the 4 changed files: clean. No e2e, no build (brief).
