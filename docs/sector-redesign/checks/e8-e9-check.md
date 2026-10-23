# E8 + E9-crate - fresh check

Checker: Opus, 2026-10-23. Review only, no source edited.
- E8: `feature/sector-redesign-e8` efd4cb27..9fbd18c2, plus the S4 / S5 flags at the join (`9fbd18c2..origin/feature/sector-redesign-s45` 3fc36d79).
- E9-crate: `feature/sector-redesign-e9` 57a1dbc6..1a571836, against `briefs/E9-CRATE.md` A99-A109.

## Verdicts
- **E8: PASS** (no must-fix).
- **E9-crate: FIX** (1 must-fix, trivial). Everything else in A99-A109 holds in the code; the e2e legs are written but not run yet (the lead's run).

## Must-fix

1. `src/world/mapCheck.ts:38` and `:41` use `Math.hypot` (CLAUDE.md hard rule: `hyp2` / `hyp3`, never `Math.hypot`).
   Change: add `import { hyp2 } from '../core/mathx';` at the top, then
   - l.38 `const d = Math.hypot(c.at[0] - s.start.x, c.at[2] - s.start.z);` -> `const d = hyp2(c.at[0] - s.start.x, c.at[2] - s.start.z);`
   - l.41 `const dd = Math.hypot(c.at[0] - q.p[0], c.at[2] - q.p[1]);` -> `const dd = hyp2(c.at[0] - q.p[0], c.at[2] - q.p[1]);`
   Re-run `tests/weaponsCrate.test.ts` (the literal-def messages use `toFixed(2)`, unchanged).

## E9-crate findings (checked, holding)
- **Host authority (A101).** The client sends only the existing `use`. `CoopHost.onUse` (coopHost.ts:595) keys the use by the session's `r.id`, never a message field, and checks alive, `enabled`, `!done` and reach. `WeaponCrates.use` (weaponCrates.ts:315) records `(crate, who)` in the ledger and pushes `crate` fill only on the first use. A repeat gives no event and progress 0, and the item stays enabled. A client cannot spend another player's crate. It cannot use a crate that is not live (`!it.enabled` returns early). It cannot fill twice: the ledger blocks it on the host, and `applyCrateEvent` drops duplicates and late fills on the client.
- **Rejoin (A106).** `resume()` runs on the rejoined client's first state, after it knows its id, and re-sends `fill: false` for each `usedBy(r.id)`. On the client this returns 'mark': the prompt is hidden and the ammo is not changed. `syncItems` applies `spent` later if the item is not mirrored yet.
- **Item cap (A107).** Crates are in the first `items()` pass with the `c-` ids (coopHost.ts:1084).
- **Top-up (A102).** `crateReserve` = `max(reserve, magSize + startReserve - mag)`. `def.reserve` is the constructor's value (playerWeapons.ts:197). The magazine is never touched, and gadgets, grenades and health are not touched. `infiniteAmmo` is a no-op. The 2000-sample property test asserts "never lowers" and "only reaches the start total from below".
- **A103.** "Ammo full" is checked locally on both host and client. A host-side remote use always counts.
- **Restart (A105).** Host: `restartSection` calls `checkpointReset()`, then `crates.resetAll()`, then `loadSection` -> `setLive`. The kit is `markCheckpoint` from `beginSection(kit = true)`, taken before any use. Client: the restart banner calls `checkpointReset()` and then `clearCrates()`.
- **Ammo-pickup ban.** `checkMapLayout` is unchanged. The crate is `SectorDef.crate` and not a `pickup`, and `noAmmoPickups.test.ts` passes.
- **Single player and src/net.** `crateLedger.ts` imports nothing. `weaponCrates.ts` imports `interactables`, a `GameState` type and a `Vector3` type. The only edges are net -> game (`coopClient` imports `crateLedger` / `KIND_COLOR`). The event type stays in `protocol.ts`.
- **Allocations.** `nearest()` gains one field test. `syncItems` adds a `Set.has` per crate, and its closure is built only on item create. `setLive` / `resetAll` run on section events. No per-frame allocation is added.
- **Wire (A99).** W1 appends `crate` to `NetItem.k` / `ITEM_KINDS`. W2 parses `id(player)`, `id(id)` and `fill === true`, and drops a bad id or player (tested, including `../x<script>` and a numeric player). W3 sets `PROTOCOL_VERSION = 35` with the doc prefix. All pins read 35: the A99 list, plus `sectorStep3.test.ts:54` (L2). The refusal test refuses 34 and admits 35. `coop.md` has the version line.
- **Placement (A109).** Six crates (campus s1-s3, warehouse x3) pass `checkSectorCrates`. The test asserts that the crate cell and the cell 0.9 m in front of the strip are walkable on the runtime nav. I checked against the geometry: the s3 bridge crate (x 6.55-7.45, against the z -16 wall) is 2.5 m from the far door at (10, -14.6) and out of the start -> door line. The racking lobby crate (x -16.08..-15.53) is about 1 m off the N-S route line at x -14.5. The floor crate is 1.83 m from `nearAt`. The crate is non-solid, so it cannot block a route or a guard. No crate sits on a connector door.
- **Tests.** They are not trivial. They assert the A101 ledger pairs, the A102 cases and property, the A105 reset, and the A106 'mark' / no-second-fill path. They also check the A109 rule and nav cells, the literal bad defs, and wire parse and drop.

## Join items for the lead (not E9 defects)
- campus S4 / S5 have no `crate` on this branch. The test filters sections named `(stub)` and expects 3. At the s45 join:
  - give s4 / s5 a `crate`;
  - set the campus count to 5 and drop the filter, or `checkSectorCrates` reports "no weapons crate" for both;
  - start from the map authors' slots in s45 (`S4_AMMO_CRATE` (25.4, 0, 9.0, -PI/2) and `S5_AMMO_CRATE` (-18, 0, 31.4, PI)), not the e9-build stub table;
  - re-run the rule and the nav test, then delete the `*_AMMO_CRATE` slot consts.
- The e2e legs (`e2e-sectorops` parts 1 / 6, `e2e-coop` crate + rejoin) have not run. They are the only cover for `WeaponCrates.use` / `crateTopUp` / `atLoadout` against a real `GameState`.

## E9-crate polish
- P1. `coopClient.ts:418`: after `this.s.toHost({ t: 'use', id })`, set `crate.progress = 0`. `gameState.ts` ~l.1224 does not reset the progress of an item that becomes the target again, so a held button re-sends `use` every frame until the `crate` event lands. The host ledger makes this harmless, but it is message spam (pre-existing for every mirrored item).
- P2. `coopHost.ts:295` drops events past `MAX_EVENTS * 2`. A dropped `crate` fill leaves that client's use recorded but never filled, until a restart. This is rare; a later slice could exempt `crate` from the cap.
- P3. Add a Babylon-free unit test of `WeaponCrates.use` with a stub `GameState` (`weapons.atLoadout`, `crateTopUp`, `net.crateUsed`, `hud`, `events`). It would assert A101 (no second `crateUsed`, progress 0, still enabled) and A103 without waiting for the e2e.
- P4. A client whose player id were literally `'local'` would share the host's ledger key. Session ids never take that form today. A `who === 'local'` guard in `crateUsed` is optional.

## E8 findings (checked, holding)
- **Ricochet does not kill.** `shotRay` returns null on a bulletproof housing, before `destroy()` / `cameraDown`. Its only other effect is `onRicochet`, which plays sparks plus `ballistics.onImpact` through two scratch vectors (no allocation). Cameras have no other destroy path (only `shotRay` and the client's `applyDestroyed`).
- **Jam / cut power / slip the sweep.** None of these paths read `bulletproof` (ctDevices jam, `deskCamMode`, `cameraOff` / `offFlag`, the sweep). The unit test shows `cameraSight` going to 0 in off / looped and back on online.
- **Thermal (A96).** It is a data tag plus an amber LED, render only. `cameraSight` is unchanged, and the test pins identical rates and meters. This matches A96 ("data; cameras already ignore lamps"), and there is no light-parity change.
- **Co-op parity.** Both pages build cameras from `layout.security`. Only the host's `shotRay` destroys, and a bulletproof camera never enters `destroyedIds`. No wire change.
- **Known gap.** A client sees no ricochet sparks for its own round. This is accepted as documented: client rounds never reached cameras before E8 either, and fixing it needs a wire change.
- **Join.** s45 flags all 3 S4 cameras bulletproof and all 3 S5 cameras bulletproof + thermal. The test pins 3 + 3 and 13 on the map, plus no thermal below S5. The remaining `S4_ARMOURED` / `S5_ARMOURED` tables list doors and glass only (E10 scope), not cameras.

## E8 polish
- P5. `securitySystem.ts:110` takes cameras in array order, not by distance along the ray. If two housings lie on one ray, a far bulletproof camera listed first stops the round before a nearer shootable one. This order dependence existed before E8; sort by the hit's parameter if it ever matters.
- P6. The jam leg of the E8 unit test sets `mode` by hand rather than driving `CtDevices.applyJam`. That is acceptable because no jam path reads the flag. An e2e jam of the bulletproof `cam-view` would close it.
- P7. These are already in the report: a ricochet whine, a client-side spark, and a thermal lens tell.

## Test results
- `-e9` (one run): `npx vitest run` on weaponsCrate, crateWire, net, rejoin, jammer, jammerFixes, moveState, sectorLampSync, sectorStep3, sectorRestart, sectors, medkit and noAmmoPickups: **13 files, 227 tests, all passed**. `tests/securityCameraE8.test.ts` is not on this branch (E8 is a separate branch), so it ran in -s45.
- `-s45` (3fc36d79): `npx vitest run tests/securityCameraE8.test.ts`: **9 / 9 passed**.
- No build and no e2e were run, as instructed.
