# sector-fixes-r RT - team doors in Sector Ops

## Design
The course's B2 bolt rule in Sector Ops, host-authoritative.
- Data: `SectorDef.bolts?: readonly SectorBolt[]` (`{ at, side }`: door plan centre, unit plan direction toward the
  side that can unbolt). `warehouseSectors.ts` wires `S1_BOLTS`, `S2_BOLTS`, `S3_BOLTS` from the section files.
- Pure (`src/game/sectors.ts`): `onBoltSide` (feet past the door plane along `side`, the course F7 dot test),
  `SectorBolts` (shut per section; `use(sec, k, x, z)` unbolts only from the bolt side and only once; `rebolt(sec)`),
  `boltItemId` / `boltById` (`c-sbolt-<sec>-<k>`), `BOLT_REACH` 1.6 m, `checkSectors` refuses a zero side.
- Mode (`sectorMode.ts`, `findBolts` at the start): every bolted door is found by position (`Doors.nearest`, 1.2 m) and
  locked (its own door item off); an "Unbolt" item (kind `door`) sits at the door centre with `side` set, live while the
  bolt is shut. `unbolt` (the item's `onUse`) takes the user's feet (`'local'` / none: this machine's player; else the
  client's peer id from `playerRefsInto`), runs `SectorBolts.use`, unlocks the door and turns the item off. The local
  user gets a feed line "Unbolted - open the door for your partner". `restartSection` calls `rebolt(run.index)` (doors
  locked and shut, items back on), so a checkpoint restart (M9) re-bolts the section's doors.
- Near side: `Interactable.side` (new, optional) makes `Interactables.nearest` skip the item unless the feet are past
  the plane, so the near side gets no item; the door's own item is off while locked, so the door just reads locked.
- Guards: a bolted door is an ordinary locked door (`Doors.open` refuses it for everyone). The test checks no guard
  post or patrol leg of the Warehouse sections comes within 0.6 m of a team door centre.

## Wire change
No. `PROTOCOL_VERSION` unchanged. The client's use is the existing `use` request (the course's path: `coopClient`
mirrored item `onUse` -> `toHost({ t: 'use', id })` -> `CoopHost.onUse` reach check -> the item's `onUse(it, peerId)`).
The unlock reaches the client through the `sector` message's `lk` and the item list's `on`. The client mirror sets the
item's `side` from its own map data (`boltById` in `coopClient.syncItems`), the only `src/net` change.

## Files
- `src/game/sectors.ts` (types, pure helpers, `SectorBolts`, `checkSectors`)
- `src/game/interactables.ts` (`Interactable.side`, `nearest` side filter)
- `src/game/modes/sectorMode.ts` (`findBolts`, `unbolt`, `rebolt`, `useBolt`, `boltInfo`, `debug().bolts`)
- `src/net/coopClient.ts` (mirror sets `side`)
- `src/world/maps/warehouseSectors.ts` (imports `S1_BOLTS`..`S3_BOLTS`, `bolts:` per section)
- `tests/sectorBolt.test.ts` (new); `docs/systems/coop.md`, `docs/systems/modes-and-progression.md`

## Tests
`tests/sectorBolt.test.ts`: the side test (past the plane yes, on the plane / near side no); `SectorBolts` (starts
shut, near side refused, bolt side unbolts once, bad indices refused, `rebolt` shuts only that section); the client
request path (item id round trip, `c-` prefix, host `use` with the client's feet refused on the near side and accepted on
the bolt side); `Interactables.nearest` offers the item on the bolt side only, within reach, enabled only; data
(`checkSectors` refuses a zero side, Warehouse sides are unit, no guard post or route leg through a team door).
`npx vitest run tests/sectorBolt.test.ts tests/sector*`: 5 files, 54 tests pass. `npx tsc --noEmit -p .`: clean except
the three missing `S<n>_BOLTS` exports (the section agents add them).

## For the e2e agent (`scripts/e2e-sectorops.mjs`)
Hooks (host page): `window.__sector.boltInfo()` -> `[{ id, sec, k, door, at, side, shut, locked }]`;
`window.__sector.useBolt(sec, k)` (this player's feet, side test applies, no reach check); `window.__sector.debug().bolts`
(`shut[sec][k]`); `window.__sector.restartCheckpoint()`.
1. Solo / host, section 1: for each bolt of section 0, `locked === true` and `shut === true` at the start.
2. Near side: teleport the player to `at - side * 0.8` (floor y), then `g.interactables.nearest(g.player.position)` is not
   the bolt item (`?.id !== id`); `useBolt(sec, k)` returns false; the door stays locked.
3. Bolt side: teleport to `at + side * 0.8`; `nearest(...)` is the bolt item (label "Unbolt"); `it.onUse(it, 'local')`
   (or `useBolt`) -> `boltInfo()` shows `shut: false, locked: false`; the item is disabled; `doors.open(door, 'quiet')`
   now succeeds.
4. Restart: `restartCheckpoint()` -> after it, the section's bolts are `shut: true, locked: true` again, item enabled.
5. Co-op (the existing two-page `?net=local` block): put the client's player on the bolt side (`at + side * 0.8`), on the
   client `window.__app.current.interactables.nearest(pos)` is the mirrored `c-sbolt-...` item (and null / another item
   on the near side); call its `onUse()` (sends `use`); then on the host `boltInfo()` shows unlocked, and the client's
   `world.doors.list[door].anchor.locked` turns false within the `sector` send period (0.5 s, allow a few seconds).
   Also: a client `use` from the near side (teleport the client to the near side, call the mirrored item's `onUse` by
   hand) leaves the door locked (host side test).
6. Guards: a bolted door is never on a guard route (the unit test checks the data; the M8 nav check should still pass
   with the doors locked).
Later sections' bolts are reachable only after the connectors (the doors into a later section are locked); use
`useBolt` with a teleport there, or run them after the section advances.
