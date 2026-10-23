# E9-crate part (a) - engine + net (build report)

Branch `feature/sector-redesign-e9` (worktree `C:/NightShift/Mobile-Coop-sector-redesign-e9`), cut from
`origin/feature/sector-redesign-m` (57a1dbc6, master 4.70.0 / guard-ai merged in). Brief:
`docs/sector-redesign/briefs/E9-CRATE.md` (from ce574d71, N filled in as 35). Protocol number 35 was assigned by the
orchestrator (registry: 31 master, 32 guard-ai, 33 marlow-final, 34 hang-down). Master's constant was 31 as expected.

## What was built
- `src/game/crateLedger.ts` (new, pure, no imports): `CRATE_LABEL`, `CRATE_HOLD`, `CRATE_REACH`, `CRATE_DARK`,
  `crateItemId`, `crateReserve`, `CrateLedger` (`use`, `has`, `usedBy`, `usersOf`, `reset`), `applyCrateEvent`.
- `src/game/weaponCrates.ts` (new): `WeaponCrates` (`ledger`, `add`, `setLive`, `use`, `markSpent`, `resetAll`,
  `usedBy`, `debug`). No `src/net` import; `Vector3` is a type import from `core/babylon`.
- `src/weapons/playerWeapons.ts`: `crateTopUp()` and `atLoadout()` after `addAmmo` (unchanged).
- `src/game/interactables.ts`: `'crate'` kind, `crate: '#f2c230'` colour, `KIND_COLOR` now exported, `spent?` field,
  `nearest()` skips `spent`, empty `crate` branch in `add()` for part (b).
- `src/game/gameState.ts`: `readonly crates: WeaponCrates | null` (built right after the modes-with-enemies
  `Interactables`), `NetAttachment.crateUsed?(who, id)`.
- `src/game/sectors.ts`: `SectorCrate` and `SectorDef.crate?`.
- `src/game/modes/sectorMode.ts`: `findCrates()` (after `findDesks()`), `setLive` at the end of `beginSection()`,
  `resetAll()` right after `g.checkpointReset()` in `restartSection()`, `crates` in `debug()`.
- `src/net/protocol.ts`: W1 (`crate` appended to `NetItem['k']` and `ITEM_KINDS`), W2 (`crate` event + parse case),
  W3 (`PROTOCOL_VERSION = 35`, doc comment prefixed).
- `src/net/coopHost.ts`: crates in the first `items()` pass (A107), `crateUsed()`, the `fill: false` re-send in
  `resume()` (A106).
- `src/net/coopClient.ts`: `crateSpent` set, crate `onUse` with the local `atLoadout` check (A103), per-sync `spent`
  and strip colour, `case 'crate'`, `clearCrates()` on the restart banner (A105).
- Tests: new `tests/crateWire.test.ts`; pins 31 -> 35 in `jammer`, `jammerFixes` (title), `moveState` (title), `net`
  (5 pins; the refusal test now refuses 34 and admits 35), `rejoin`, `sectorLampSync` (title), and `sectorStep3` (L2).
- Docs: `docs/systems/coop.md` version line; `changes/feature-sector-redesign.md` line.

## A-items covered by part (a)
A99 (wire and pins), A100 (type + live rule; the data is part (b)), A101, A102, A103, A104 (engine side; the strip mesh
is part (b)), A105, A106, A107. A108 / A109 are part (b) (constants for A108 are in `crateLedger.ts`).

## L-numbered choices
- L1. `CrateLedger.usersOf(crate)` added (not in the brief's interface) so `WeaponCrates.debug().used` needs no access
  to the private set.
- L2. `tests/sectorStep3.test.ts:54` also pinned 31 (not listed in A99); moved to 35 with its title.
- L3. `KIND_COLOR` is exported from `interactables.ts` so `resetAll()` / the client can restore the lit strip colour.
- L4. `WeaponCrates.add` throws if `g.interactables` is null (only reached from Sector Ops, which always has them).
- L5. Client sync: the strip colour is set only when `spent` flips or the item was just enabled while spent (no
  per-snapshot `setColor`).
- L6. `GameState.crates` is built only on the modes-with-enemies path (as the brief says); the sandbox / client paths
  leave it null. The client never uses `g.crates`.

## Checks
- `npx tsc --noEmit -p .`: clean.
- `npm run lint`: 0 errors (41 pre-existing warnings, none in changed files; `npx eslint` on the changed files: clean).
- `npx vitest run` on crateWire plus every tests/ file whose name contains net, coop, protocol, wire, sector, interact,
  weapon, crate, noAmmo, mapCheck, plus the pinned jammer / jammerFixes / moveState / rejoin and medkit: 33 files, 500
  tests, all passed.
- No build, no e2e (per the brief).

## What part (b) needs
- Model: fill the `else if (kind === 'crate') { ... }` branch in `Interactables.add` (A108); assign the strip to
  `light` (the dark / lit colour calls already target `it.light`).
- Placement data: `SectorDef.crate = { at: [x, y, z], yaw }` (`SectorCrate` in `src/game/sectors.ts`). `at` is the
  floor point (the item's `pos`, the feet height used by `nearest`'s 1.5 m y check); `yaw` turns the node (strip on
  local +z). Item id: `crateItemId(def.id)` = `` `${id}-crate` ``.
- Pure helpers for `tests/weaponsCrate.test.ts`: `import { CrateLedger, crateReserve, applyCrateEvent, crateItemId }
  from '../src/game/crateLedger'`.
- e2e hooks:
  - `__sector.debug().crates`: `{ id: string; live: boolean; spent: boolean; used: string[] }[]` (host / solo only;
    `used` holds `'local'` and client player ids; `spent` is this machine's player).
  - Host / solo: `g.crates` (`WeaponCrates`): `add(id, pos: Vector3, yaw)`, `setLive(id | null)`, `resetAll()`,
    `usedBy(who)`, `ledger`. The item is `g.interactables.items.find(i => i.id === id)`; use it with
    `it.onUse(it)` (local) as the medkit legs do. A remote use goes through the client's `use` message.
  - Client: the mirrored item (`g.interactables.items`, kind `'crate'`) has `spent === true` after its own use or a
    rejoin re-send; `it.onUse()` refuses locally with "Ammo full" at the loadout.
  - Totals: each slot `mag + reserve == stats.magSize + def.reserve` after a fill (`g.weapons.slots`), and
    `g.weapons.atLoadout()`.
- `checkSectorCrates` belongs in `src/world/mapCheck.ts` (part (b)); nothing in part (a) calls it.
