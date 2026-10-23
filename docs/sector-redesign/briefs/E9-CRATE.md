# E9-crate brief - the between-section weapons crate (builders: (a) Opus, (b) Sonnet; checker: Opus)

**Protocol number: N = 35 (assigned by the orchestrator; registry: 31 master, 32 guard-ai, 33 marlow-final, 34 hang-down).**
new version is written `N`. The lead fills in `N` before part (a) starts. Builders never pick a number.

Written by the E9-crate planner (Opus) 2026-10-23 from PLAN row E9-crate, BRIEF A98 and Michael ~10:20. Build exactly
this. Anything not covered: pick the simplest option and log it as L1, L2 ... in your report (the lead renumbers them as
A-numbers). Never ask. Greybox only.

## Requirements (Michael 2026-10-23 ~10:20)
No ammo inside sections (done, 88f5c33a, `checkMapLayout`). One weapons crate at each section start / connector
checkpoint. Each player can use each crate once. A use tops up gun ammo to the starting loadout and never above. Gun
ammo only: no gadgets, grenades or health. A section restart resets the crates. Used state is per player: the prompt
disappears only for the player who used it. The host tracks per-player use. Covers campusOps S1-S5 and warehouseOps
(3 sections).

## Net design (decided here)
**Can an existing message carry it with no wire change? No.** Three reasons:
1. `NetItem.k` is a closed list (`ITEM_KINDS`, `src/net/protocol.ts` ~l.107-120, checked by `netItem()` ~l.282). There
   is no crate kind. Reusing `cache` would paint and treat the crate as an objective cache (the gold box, the
   `visionLook` rules, the mission mirror). Reusing `medkitWall` brings its `done = !on` client rule
   (`coopClient.ts` ~l.409), which is global, not per player.
2. `NetItem.on` and the whole `snap.items` list are broadcast (`coopHost.snapshot()` ~l.1096-1115 sends one snap to
   everyone). The host cannot say "used" to one client and "usable" to another through items.
3. The `pickup` event (`{ e: 'pickup'; player; kind: 'ammo' }`, ~l.128, parsed ~l.327) has no item id. The client
   could only guess which crate to hide from its own last `use`. That breaks on a rejoin and with two crates in reach.
   Its client handler also adds 50% reserve plus a frag, which breaks "never above" and "gun ammo only". Changing what
   `pickup` means without a version bump lets mixed builds disagree.

**The wire change (protocol `N`, nothing else on the wire changes):**
- W1. `NetItem['k']` gains `'crate'`, appended at the end of `ITEM_KINDS`.
- W2. A new `NetEvent`: `{ e: 'crate'; player: string; id: string; fill: boolean }`, sent host -> all in the existing
  `ev` batch. It means "`player` has used crate `id`". When `fill` is true this is the use itself: that player tops up.
  When `fill` is false it is a re-send after a rejoin: hide the prompt only, never top up. Parse it as
  `id(v.player)`, `id(v.id)` and `v.fill === true`. Drop the event when either id fails.
- W3. `PROTOCOL_VERSION = N`. Prefix the doc comment with "N: the weapons crate (sector-redesign E9-crate): `NetItem`
  kind `crate` and the `crate` event (host -> all: a player used a crate; `fill` false = rejoin re-send)".
- `use` (client -> host), `snap`, `pickup` and the `sector` message are unchanged.

**Authority.** The host owns a `CrateLedger` (the pairs of crate id and player id). Solo uses the same ledger. The
host/solo player's key is `'local'`; a client's key is its player id. A client sends the existing `use`. The host
checks reach (the existing `onUse`), then the ledger. On a first use it pushes `crate` with `fill: true`. The client
tops up its own guns, because ammo is client-side as it was for pickups. The crate interactable stays `enabled` on the
host for everyone. Per-player hiding is a local `spent` flag that only `Interactables.nearest` reads. A client keeps
its own spent set, fed only by `crate` events.

## Acceptance (continues BRIEF.md's highest, A98)
- **A99** Wire: protocol `N` = W1 + W2 + W3 exactly. The pins at 31 move to `N`: `tests/jammer.test.ts:395`,
  `tests/jammerFixes.test.ts:205-206` (title too), `tests/moveState.test.ts:115-116` (title too),
  `tests/net.test.ts:399, 493, 678, 723, 798`, `tests/rejoin.test.ts:53`, `tests/sectorLampSync.test.ts:54`. (guard-ai
  touches the same pins at 32. The lead resolves the merge.)
- **A100** Data: `SectorDef.crate?: SectorCrate` (`{ at: [x, y, z]; yaw }`). Every section of campusOps (5) and
  warehouseOps (3) has one. A crate is live (enabled, mirrored `on`) only while its section is the current one
  (`beginSection` of section k until the next section's `beginSection`).
- **A101** Once per player per crate. The host ledger is keyed by player id (`'local'` for the host/solo player). When
  a client uses a crate already in the ledger for that client, the host does nothing: no event, the progress goes back
  to 0, the item stays enabled for the others.
- **A102** The top-up rule, per gun: start total = `stats.magSize + def.reserve`, where `stats` is the computed stats
  (attachments and upgrades) and `def.reserve` is what the constructor gives, `playerWeapons.ts` ~l.195. If
  `mag + reserve < start total`, the reserve rises so that `mag + reserve == start total`. Otherwise nothing changes.
  It never lowers, and the magazine is never touched (no reload). Gadgets, grenades and health are never touched. With
  `infiniteAmmo` it does nothing.
- **A103** At loadout, the use is not counted. The local player at full gets the feed "Ammo full", the crate stays
  usable, and the progress goes to 0. A client checks this itself before it sends `use`. A host-side remote use always
  counts, because the host does not hold clients' ammo.
- **A104** Per-player prompt: `Interactable.spent`. `nearest()` skips a spent item, and `enabled` is untouched. The
  indicator strip goes dark (`#2a2f36`) for the player who used the crate and stays lit for the others. The feed on a
  fill is "Weapons refilled", and the audio event is `pickup` `{ kind: 'ammo' }`.
- **A105** Restart: `restartSection` clears the whole ledger and every local `spent` flag. The client clears its spent
  set on the restart banner (`SECTOR_RESTART_TITLE`, where it already runs `checkpointReset`). The restart kit is still
  the kit at `beginSection` (`markCheckpoint`), taken before any crate use. So a restart gives back the kit the
  section began with, and a fresh crate.
- **A106** Rejoin: when a held client resumes, the host re-sends `crate` with `fill: false` for each crate that player
  used. A rejoined client's prompt stays gone, and its ammo does not change.
- **A107** Item cap: crates go in the host's first `items()` pass (beside the `c-` course ids), so `MAX_ITEMS` never
  drops one on a door-heavy map.
- **A108** Model: a non-solid greybox (no collider, never blocks a spawn, the nav or a guard). It has a 0.9 x 0.45 x
  0.55 m olive body (`#4b5a3a`, the old ammo pickup's colour), a 0.92 x 0.06 x 0.57 lid band (`#3a4433`) and an amber
  strip on the +z face (`#f2c230`, the indicator `light`). It does not bob or spin. The label is "Weapons crate", the
  hold is 1.0 s, it makes no noise, and the reach is 1.8 m.
- **A109** Placement rule (`checkSectorCrates`):
  - on the start's floor (|y - start.y| <= 0.3);
  - 1.0-3.0 m in plan from `start`;
  - >= 1.2 m from every connector's `nearAt` / `farAt` (all sections);
  - on a walkable nav cell (unit test);
  - `yaw` faces open floor (the strip side to the room).

## Part (a) - engine + net (Opus builds)
Read first: `docs/systems/agent-preamble.md` (job = sector-redesign; you never commit, push, stash or checkout);
CLAUDE.md "Hard rules"; this brief; `src/game/interactables.ts` (all); `src/game/modes/sectorMode.ts` l.160-230,
505-580, 765-810, 931-960; `src/net/coopHost.ts` l.320-400, 590-612, 1045-1070; `src/net/coopClient.ts` l.135-150,
380-425, 575-595; `src/net/protocol.ts` l.15-20, 105-145, 278-290, 300-335; `src/weapons/playerWeapons.ts` l.527-560;
`src/game/gameState.ts` l.168-232, 355-365, 655-665, 880-921.

Files and changes:
1. NEW `src/game/crateLedger.ts`. Pure and Babylon-free; no imports beyond types.
   - `export const CRATE_LABEL = 'Weapons crate'`, `CRATE_HOLD = 1.0`, `CRATE_REACH = 1.8`, `CRATE_DARK = '#2a2f36'`.
   - `export function crateItemId(sectionId: string): string` returns `` `${sectionId}-crate` ``.
   - `export function crateReserve(mag: number, reserve: number, magSize: number, startReserve: number): number`
     returns `Math.max(reserve, magSize + startReserve - mag)` (A102).
   - `export class CrateLedger { use(crate: string, who: string): boolean; has(crate: string, who: string): boolean; usedBy(who: string): string[]; reset(): void }`.
     `use` returns false if the pair is already there. Store the pairs in a `Set<string>` of `` `${crate}|${who}` ``.
   - `export function applyCrateEvent(spent: Set<string>, me: string, ev: { player: string; id: string; fill: boolean }): 'fill' | 'mark' | null`.
     It returns null when `ev.player !== me` or `spent` already has the id. Otherwise it adds the id and returns
     `ev.fill ? 'fill' : 'mark'`. A duplicate or late event never fills twice.
2. EDIT `src/weapons/playerWeapons.ts`, after `addAmmo` (~l.556; do not change `addAmmo`):
   - `crateTopUp(): boolean`. For every slot, `s.reserve = crateReserve(s.mag, s.reserve, s.stats.magSize, s.def.reserve)`.
     It returns true when any reserve changed, and false with `infiniteAmmo`.
   - `atLoadout(): boolean`. True when `infiniteAmmo`, or when every slot has `mag + reserve >= stats.magSize + def.reserve`.
3. EDIT `src/game/interactables.ts`:
   - Add `'crate'` to `InteractKind` (l.7) and `crate: '#f2c230'` to `KIND_COLOR`.
   - Add the field `spent?: boolean` to `Interactable`, with the doc comment "(E9-crate) used by this machine's player:
     `nearest` skips it; `enabled` stays (the others still use it)".
   - In `nearest()` (l.142), skip `it.spent`.
   - In `add()`, add an empty `else if (kind === 'crate') { /* E9-crate part (b): the crate model */ }` before the
     final `else`. Part (b) fills it in.
4. NEW `src/game/weaponCrates.ts` (`WeaponCrates`; it imports `Vector3` only through `core/babylon`). The host/solo crates:
   - `constructor(private g: GameState)`. Read `g.interactables` lazily, at call time.
   - `readonly ledger = new CrateLedger()`.
   - `add(id: string, pos: Vector3, yaw: number): Interactable` calls `ints.add(id, 'crate', pos, CRATE_LABEL, CRATE_HOLD, yaw)`,
     sets `reach = CRATE_REACH` and `onUse = (it, who) => this.use(it, who ?? 'local')`, and starts disabled.
   - `setLive(id: string | null): void` enables that crate and disables the others. After `setEnabled`, a spent crate
     gets its indicator set dark again.
   - `use(it: Interactable, who: string): void`.
     - Local: if the ledger already has it, set progress to 0. If `g.weapons.atLoadout()`, show "Ammo full" and set
       progress to 0 (A103). Otherwise call `ledger.use`, `g.weapons.crateTopUp()`, emit `pickup` `{ kind: 'ammo' }`,
       show "Weapons refilled", then `markSpent(it)`.
     - Remote: if `!ledger.use(it.id, who)`, set progress to 0 and return. Otherwise call `g.net?.crateUsed?.(who, it.id)`
       and set progress to 0. Never set `done`.
   - `markSpent(it)` / `resetAll(): void`. `resetAll` resets the ledger, then for every crate sets `spent = false`,
     progress to 0, and the indicator to `KIND_COLOR` when enabled.
   - `usedBy(who: string): string[]`.
   - `debug(): { id: string; live: boolean; spent: boolean; used: string[] }[]`, where `used` is the player keys.
5. EDIT `src/game/gameState.ts`:
   - `readonly crates: WeaponCrates | null = null;` beside `interactables` (l.363).
   - `w.crates = new WeaponCrates(this);` right after `w.interactables = new Interactables(...)` (l.661).
   - In the net attachment interface, beside `healAtStation` (~l.198), add
     `/** (E9-crate) Host: client `who` used crate `id` (the `crate` event, fill). */ crateUsed?(who: string, id: string): void;`.
   - Dispose nothing new; the interactables own the meshes.
6. EDIT `src/game/sectors.ts`:
   - Add `export interface SectorCrate { readonly at: readonly [number, number, number]; readonly yaw: number }`.
   - Add `crate?: SectorCrate` to `SectorDef` (after `stageActions`), with the doc comment "(E9-crate) the weapons crate
     at this section's start (A100, A109)".
7. EDIT `src/game/modes/sectorMode.ts`:
   - Add `private findCrates(): void`, called in `start()` after `findDesks()`. For each def with `crate`, call
     `g.crates?.add(crateItemId(s.id), new Vector3(...at), crate.yaw)`.
   - In `beginSection()`, after `this.setup(s)` (l.~576), call
     `this.g.crates?.setLive(s.crate ? crateItemId(s.id) : null)`.
   - In `restartSection()`, right after `g.checkpointReset()` (l.~791), call `g.crates?.resetAll()`.
   - In `debug()`, add `crates: this.g.crates?.debug() ?? []`.
8. EDIT `src/net/protocol.ts`: W1, W2 (union ~l.122-145; parse case beside `pickup` ~l.327), W3.
9. EDIT `src/net/coopHost.ts`:
   - In `items()` (l.1051), use the first pass for `it.id.startsWith('c-') || it.kind === 'crate'` (A107).
   - Add `crateUsed(who: string, id: string): void`. If `this.remotes.has(who)`, call
     `this.push({ e: 'crate', player: who, id, fill: true })`.
   - In `resume(r)` (~l.361), add
     `for (const id of this.g.crates?.usedBy(r.id) ?? []) this.push({ e: 'crate', player: r.id, id, fill: false })` (A106).
10. EDIT `src/net/coopClient.ts`:
    - Add the field `private readonly crateSpent = new Set<string>()`.
    - In `syncItems`, on create when `n.k === 'crate'`, set
      `it.onUse = () => { if (this.g.weapons.atLoadout()) { this.g.hud.feedItem('Ammo full'); it.progress = 0; return; } this.s.toHost({ t: 'use', id }); }`.
    - On every sync of a crate, set `it.spent = this.crateSpent.has(n.id)`, and set the indicator dark when spent and on.
    - Add `case 'crate'`: `const r = applyCrateEvent(this.crateSpent, me, e)`.
      - On `'fill'`: call `g.weapons.crateTopUp()`, emit `pickup` `{ kind: 'ammo' }`, and show "Weapons refilled".
      - On either result: mark the mirrored item spent, set its progress to 0 and its indicator dark (if mirrored yet;
        `syncItems` applies it later otherwise).
    - In the restart banner branch (l.581), after `g.checkpointReset()`, call `this.clearCrates()`. It clears the set and
      every crate item's `spent`, and puts the indicator back when enabled.
11. NEW `tests/crateWire.test.ts`:
    - `PROTOCOL_VERSION === N`.
    - A `crate` event round-trips through `parseMessage({ t: 'ev', events: [...] })`.
    - A missing or bad `id` / `player` drops the event. A non-boolean `fill` becomes false.
    - A snap item with `k: 'crate'` survives `netItem`.
12. EDIT the protocol pins listed in A99. Update the `coop.md` protocol list
    (`docs/systems/coop.md`, the version history line) with N.
13. APPEND to `changes/feature-sector-redesign.md`: "Sector Ops: weapons crate engine and protocol N (crate item kind,
    crate event; per-player use on the host)."

Never edit in (a): map data (`src/world/maps/*`), `mapCheck.ts`, `src/ai/*`, `src/security/*`, `ctDevices.ts`,
`pickups.ts`, `addAmmo`, `loadoutSnapshot.ts`, the e2e scripts, `docs/level-design.md`, `docs/templates/*`,
`CHANGELOG.md`, `package.json`, and BRIEF / SPEC / PLAN / STATE. Single player never imports `src/net` statically:
`weaponCrates.ts` and `crateLedger.ts` do not import from `src/net`, and the event type stays in `protocol.ts`.

Checks (a), with the worktree busy; nothing heavier:
- `npx tsc --noEmit -p .` (timeout 600000).
- `npx vitest run tests/crateWire.test.ts tests/net.test.ts tests/rejoin.test.ts tests/jammer.test.ts tests/jammerFixes.test.ts tests/moveState.test.ts tests/sectorLampSync.test.ts tests/sectorRestart.test.ts tests/sectors.test.ts tests/medkit.test.ts tests/noAmmoPickups.test.ts` (timeout 600000).
- `npx eslint` on the changed files.
- No e2e, no build.

Report: `docs/sector-redesign/checks/e9-crate-engine.md` (new), with the files, the L-numbered choices and the check
results. Final message under 8 lines.

## Part (b) - crate model + placement data + tests (Sonnet builds, after (a) is merged into the branch)
Read first: `docs/systems/agent-preamble.md`; this brief (A100-A109); `src/game/crateLedger.ts` and
`src/game/weaponCrates.ts` (part (a)); `src/game/interactables.ts` l.70-120; `src/world/mapCheck.ts` (all);
`tests/noAmmoPickups.test.ts`; `src/world/maps/campusSectors.ts` l.295-445 (the 5 `start` / `connector` blocks);
`src/world/maps/warehouseSectors.ts` l.20-35, 86-100, 148-155; `src/world/maps/campusS1.ts` l.40-50 (`C1_BOX`);
`src/world/maps/campusS2.ts` l.55-60 (`C2_BOX`); how `tests/campusS1.test.ts` builds the map and checks points on the
nav grid; `scripts/e2e-sectorops.mjs` l.1-60, 280-330 (the M9 restart block), 615-735 (the co-op mirror), 1588-1610;
`scripts/e2e-coop.mjs` l.120-130, 333-372, 968-992 (the medkit leg is the pattern).

Files and changes:
1. EDIT `src/game/interactables.ts`: fill in the `crate` branch (A108) with three `add('box', ...)` calls. The body is
   at y 0.225, the lid band at y 0.45 and the strip at (0, 0.3, 0.28), 0.5 x 0.08 x 0.02. Return the strip as `light`.
   Nothing else in the file.
2. EDIT `src/world/maps/campusSectors.ts`: give each of s1-s5 a `crate`. EDIT `src/world/maps/warehouseSectors.ts`:
   give each of service / racking / floor a `crate`.
   - Pick each point by A109, against the wall nearest the start, with the strip side facing the room.
   - Warehouse section 2 starts inside the 3.5 x 2.3 m fire lobby (`box` [-16.25, -8.55, -12.75, -6.25]). Use about
     (-15.8, 0, -7.2), yaw PI / 2, unless the rule or the nav says otherwise.
   - Log every point and why.
   - Edit only the `crate` lines in these files.
3. EDIT `src/world/mapCheck.ts`: add
   `export function checkSectorCrates(id: string, sectors: readonly SectorDef[]): string[]` for the A109 plan and height
   rules. A section without a crate is an error. Use the doc comment's style.
4. NEW `tests/weaponsCrate.test.ts`:
   - (i) Once per player:
     - `use('s1-crate', 'local')` is true, then false.
     - `'p2'` is true on the same crate.
     - `'p2'` on `'s2-crate'` is true.
     - `usedBy('p2')` lists both.
   - (ii) The cap (A102), with `crateReserve`:
     - (0, 0, 30, 90) gives 120.
     - (12, 40, 30, 90) gives 108.
     - Full (30, 90) is unchanged.
     - Above the start (30, 150) is unchanged; it never lowers.
     - A property loop over random mags / reserves: the result >= reserve, and mag + result >= magSize + startReserve
       only reaches equality from below.
   - (iii) Restart: after `reset()`, every pair is usable again.
   - (iv) Client per-player state, with `applyCrateEvent`:
     - Another player's event returns null and leaves the set unchanged.
     - My `fill` returns 'fill'.
     - A duplicate returns null.
     - A fresh set with a `fill: false` re-send returns 'mark'.
     - A later `fill` for a marked id returns null (no second fill).
   - (v) Data:
     - Build campusOps and warehouseOps as `noAmmoPickups.test.ts` does.
     - `checkSectorCrates` is `[]`.
     - The counts are 5 and 3.
     - The crate ids are distinct (`crateItemId`).
     - Each crate's (x, z) is a walkable nav cell at its floor (the campusS1 test's nav helper).
   - (vi) A literal bad def (no crate; one 4 m from the start; one on a `farAt`) gives the expected messages.
5. EDIT `scripts/e2e-sectorops.mjs`:
   - Part 1, after the M9 restart block (~l.330), add a solo crate block on warehouseOps:
     - `__sector.debug().crates` has 3, with only `service-crate` live.
     - Drain every gun to mag 3 / reserve 0 by page eval (as the restart block does).
     - Teleport to the crate, check that `nearest` returns it, and use it (call `onUse` as the medkit legs do).
     - Every slot's mag + reserve == magSize + def.reserve, and the gadget counts are unchanged.
     - At the crate, `nearest` is null (the prompt is gone).
     - Drain again: no way to use it.
     - `restartCheckpoint()`: the crate is offered again, and the guns equal the checkpoint kit.
     - After connector 1 cycles, `racking-crate` is live and `service-crate` is not.
   - Part 1 co-op mirror (~l.615-734), add:
     - The client mirrors the live crate.
     - The client drains, then uses it. Its totals equal its loadout, and its `nearest` at the crate is null.
     - The host's `nearest` at the crate still returns it.
     - The host's `debug().crates[0].used` holds the client's id.
     - A second client use after a drain (call `onUse`) leaves the client drained.
     - The host restarts: the client's prompt is back.
   - Part 6 (campus): S1's crate is live at the start. After C1 the S2 crate is live; one use tops up.
   - `node --check` the script.
6. EDIT `scripts/e2e-coop.mjs`, in the Infiltration match, before the "rejoin: the joiner drops" leg (~l.345):
   - The host calls `g.crates.add('crate-e2e', <0.5 m from the client>, 0)` and `g.crates.setLive('crate-e2e')`.
   - The client mirrors it, drains, and uses it: topped up exactly, and its prompt is gone.
   - A second client use after a drain is refused: still drained.
   - The host's own use tops the host up.
   - In the rejoin leg, after the rejoin: the client's `crate-e2e` mirror has `spent === true`, and its ammo is
     unchanged by the re-send.
   - Use the leg's `until` waits.
7. APPEND to `changes/feature-sector-redesign.md`: "Sector Ops campusOps / warehouseOps: a weapons crate at every
   section start (once per player, tops up to the loadout)."

Never edit in (b): the engine and net files of part (a) (except the crate branch in `interactables.ts`), any other map
line, `src/ai/*`, `src/net/*`, `src/security/*`, `pickups.ts`, `docs/level-design.md`, `docs/templates/*`,
`CHANGELOG.md`, `package.json`, and BRIEF / SPEC / PLAN / STATE.

Checks (b):
- `npx tsc --noEmit -p .` (timeout 600000).
- `npx vitest run tests/weaponsCrate.test.ts tests/crateWire.test.ts tests/noAmmoPickups.test.ts tests/campusS1.test.ts tests/campusS2.test.ts tests/sectors.test.ts` (timeout 600000).
- `npx eslint` on the changed files.
- `node --check scripts/e2e-sectorops.mjs scripts/e2e-coop.mjs`.
- No e2e, no build. The lead runs `e2e-sectorops --part=1`, `--part=6` and `e2e-coop` when the worktree is free.

Report: `docs/sector-redesign/checks/e9-crate-data.md` (new). List each crate's point and yaw with its reason, the
L-numbered choices and the check results. Final message under 8 lines.

## For the lead
- Fill in `N` (from the orchestrator) in this file and in the part (a) prompt before starting.
- (a) then (b), in sequence; (b) needs (a)'s types.
- After both parts: the checker reviews against A99-A109. Then run `e2e-sectorops` parts 1 and 6 and `e2e-coop`, and
  `npm run e2e:quick`.
- Record A99-A109 in BRIEF.md and mark E9-crate done in STATE.
- The protocol pins conflict with guard-ai's 32 at merge. Take the higher number and keep both comment lines.
