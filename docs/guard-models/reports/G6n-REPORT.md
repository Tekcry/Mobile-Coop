# G6n report: the look seed on the co-op wire (M3)

Branch `feature/gm-g6n` (off feature/guard-models 6b5c4319). Opus. `PROTOCOL_VERSION` untouched (the train build bumps it).

## What
- `Enemy.look` (0-127): set once by `EnemyManager` at spawn from the spawn slot, never from `Enemy.num` or the spawn
  order, so a section restart (`despawnAll` + respawn) and a reload give every slot the same seed. Single player uses
  the same field (no `src/net` import). A woken guard keeps it (`Enemy.inherit`).
- Seed rule (`src/ai/guardLook.ts`, pure, no Babylon, no `Math.random`): `lookSeed(key, index) = (hash(key) + index * 79)
  & 127`, hash = FNV-1a 32 + murmur3 finaliser. The odd stride makes `index -> seed` a permutation for one key.
  - Sector Ops authored guards: `slotLook(mapId, sectionDef.id, slot index)` via `EnemyManager.lookOfSlot`, passed by
    `SectorMode.loadSection` in its `Pending` and on to `spawn(..., look)`. Distinct within a section (up to 128 slots).
  - Response teams (both paths: Sector Ops `raised` and the live-mode `StealthSystems.onAlarm`): `EnemyManager.joinTeam`
    sets `teamLook(mapId, section, team index, member index)`. Every caller joins straight after `spawn`, in the same
    step, before the guard is drawn or sent. Distinct within a team.
  - Every other spawn (Course mode / Marlow Yard squads, Infiltration, the parked Hunter / Mission, the uncoordinated
    `reinforce`): `posLook(mapId, authored point quantised to 0.1 m)`, the `spawn` default (`look` omitted). Course squad
    points come from the map data, so they are stable across a bay restart.
- Wire: `AL_LOOK_SHIFT = 9`, `AL_LOOK = 127 << 9`, `AL_MAX` 511 -> 65535, `packAlert(..., carry, look = 0)` (last
  parameter, every caller still compiles; old callers send seed 0), `alertLook(al)` beside `alertCarry`. The host packs
  `e.look` (`coopHost.alertCode`); the parser clamp reads `AL_MAX` (unchanged code); `EnemyPuppet.look` (getter) is read
  from every sampled snapshot state, so it is set before the rig first shows. No figure is built (G7).
- Bodies: `snap.bodies` carries enemy ids only. A client's lying body is the ragdoll of its own puppet (which had the
  seed); a rejoining client builds no rig for bodies that fell before it joined (unchanged behaviour), and a carried
  body is never mirrored (it leaves `snap.bodies`). So no body record needs the seed on the wire. Host side, every
  `Body` has `guard` (the `Enemy`) set at creation (`enemyManager.ts` ~564), so G7 reads `body.guard.look` for carried
  and fresh bodies; `body.ts` is unchanged.

## Files
- New: `src/ai/guardLook.ts`, `tests/guardLook.test.ts`, this report.
- `src/net/protocol.ts` (bits, `packAlert`, `alertLook`, docs), `src/net/coopHost.ts` (packs `e.look`),
  `src/net/enemyPuppet.ts` (`look`), `src/ai/enemy.ts` (`look`, `inherit`), `src/ai/enemyManager.ts` (`spawn` `look`
  param + default, `lookOfSlot`, `joinTeam`, `lookMap`), `src/game/modes/sectorMode.ts` (`Pending.look`, 3 lines),
  `docs/systems/coop.md` (the look bits; the old "clamps to 0-511" now reads `AL_MAX`).
- Existing tests changed only where they asserted the old `AL_MAX` (511): `tests/coopGuardAi.test.ts` (the constant row
  and the clamp case, now `AL_MAX + 488` -> `AL_MAX`), `tests/coopGuardCarry.test.ts` (the constant row),
  `tests/coopTorches.test.ts` (the clamp case).

## Decisions assumed
- Team key uses the team's order in the section (`SweepTeam.index`) in place of the live alarm stage: one team per
  alarm, so it stands for the stage, while the live stage can rise before a pending member spawns (that would split one
  team over two keys and risk a duplicate). Member index = join order (`members.indexOf`).
- Course mode passes no key: the authored point is the slot key (allowed by the brief); no `courseMode.ts` change.
- `EnemyManager.lookMap` reads `world.map?.id` defensively ('' on unit-test stub worlds with no map).
- `tests/protocolConst.test.ts` does not exist on this branch; the version check (peer at `PROTOCOL_VERSION - 1`
  refused, current joins) is in `tests/guardLook.test.ts`. `tests/net.test.ts`, `coopGuardAi`, `coopGuardCarry`,
  `rejoin` still assert the number 41; they pass now and the train build that bumps the version owns them.

## Tests
- `npx tsc --noEmit -p .`: clean. `npx eslint` on every changed file: clean.
- `tests/guardLook.test.ts` 13/13: bit layout; round trip of all 128 seeds x level x seized x torch x cautious x helmet
  x armour x carry 0-3 (65536 cases); parser keeps the seed through JSON (all 128 + every bit) and clamps out-of-range /
  negative / fractional / non-number `al`; seed function deterministic, 0.1 m quantisation, distinct per section (128
  slots) and per team, key sensitivity, distribution (every value hit, max < 3x share, each bit 45-55%, grid points
  < 3% per seed); the real `EnemyManager` (stand-in `Enemy`): same slot -> same seed after `despawnAll` and on a new
  manager whatever the ids, spawn order irrelevant, team seeds distinct and a second team keyed apart, explicit look
  masked to 7 bits, a map-less stub world spawns; `PROTOCOL_VERSION - 1` refused.
- With `net`, `coopGuardAi`, `rejoin`, `coopGuardCarry`, `coopTorches`, `responseWiring`, `sectorRestart`,
  `enemyManagerDespawn`, `sectorDesk`, `sectorKeypad`, `s6CloseOn`, `gearWiring`, `sectorGuardTags`: 14 files, 246
  tests pass. Every other test file that builds an `EnemyManager` (alarmCall, awarenessWiring, breaker, camBodyWiring,
  consoleFault, deviceTrip, enemyLightsOut, guardDoors, hearing, incidents, pairsWiring, postsWiring, radioWiring,
  sectionAlert, squadWiring): 15 files, 253 tests pass.
- Not run here (desktop rules): e2e. Before the train: `e2e-coop`, `e2e-netmove` (a `src/net` change).

## Open items
- G7 reads `Enemy.look` / `EnemyPuppet.look` / `body.guard.look` to build the variant.
- A response team member despawned (not killed) before a later member of the same team spawns would shift the later
  member's index (`members.indexOf`); rare, cosmetic (a possible repeat seed), noted for the checkers.
- The train build bumps `PROTOCOL_VERSION` and the tests that assert its number.
