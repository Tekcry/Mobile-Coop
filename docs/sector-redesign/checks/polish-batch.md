# Polish batch (lane E, Opus, 2026-10-23)

Branch `feature/sector-redesign-polish` (base: -p3 PR 3 head + posts + E2 glass + E10 armour). Current goal holds: only
items that fix wrong behaviour, a gameplay hole or a clear inconsistency, each small. No wire change (PROTOCOL stays 35).

## Triage

| # | Item | Source | Do / skip | Why |
| --- | --- | --- | --- | --- |
| 1 | Fuel tanks 1.6 high, 0.85 m from the 2.8 compound wall (tank-top jump out of the section) | slice45-check S4 polish 1 (L6) | do | Gameplay hole. Tanks 2.0 `noLedge` (no mantle onto them). |
| 2 | NOC window is a climbable fence at basket height | slice45-check S4 polish 2 | skip | Already fixed: E2 / E10 made it armoured clear glass, and glass is never a ledge (`anchors.ts:189`). |
| 3 | Basket leg 0.4 m over the pg-cage door: does anything offer the gate from the basket? | slice45-check S4 polish 3 | do | Door menu has a 1.2 m height gate; the door peek offer (`doorPeekEligible`) and nothing else had none, so a closed unlocked door under a walkway offered a peek from above. Same 1.2 m gate added. The pair keys are 3D-reach interactables. |
| 4 | Dock pair cross at (24, 19.5) at the same instant | slice45-check S4 polish 4 | skip | Matches the brief's table (SLICE4 #17 / #18 "same loop", opposite ends); cosmetic. |
| 5 | `S5_ARMOURED` type narrower than S4's | slice45-check S5 polish 1 | skip | Already done at E10 (both use `ArmourPiece`). |
| 6 | L11: guards' grid steps over the 0.45 sash sill into the well | slice45-check S5 polish 2 | do | Wrong behaviour (guards path through a window). Sill 0.45 -> 0.5 (over the nav step 0.45; still a vault for the player, step 0.42). Data only, no engine change. |
| 7 | L9 extra roof point | slice45-check S5 polish 4 | skip | Checker: harmless, keep. |
| 8 | A `crate` fill dropped past the host event cap never fills that client | e8-e9-check P2, crate-client-fix open | do | Gameplay hole. `crate` events bypass the cap (bounded by crates x players). Not a wire change. |
| 9 | Unit test of `WeaponCrates.use` with a stub GameState | e8-e9-check P3 | skip | Coverage only; e2e-sectorops:1 and e2e-coop crate legs pass. |
| 10 | `who === 'local'` guard in `crateUsed` | e8-e9-check P4 | skip | Session ids never take that form. |
| 11 | `shotRay` takes cameras in array order, not nearest along the ray | e8-e9-check P5 | do | Wrong behaviour when two housings share a ray (a far bulletproof camera shields a near one). Nearest entry wins. |
| 12 | Jam leg of the E8 test by hand | e8-e9-check P6 | skip | Test-only; no jam path reads the flag. |
| 13 | Ricochet whine, client-side spark, thermal lens tell | e8-e9-check P7 | skip | Features, not fixes; the client spark is a wire change. |
| 14 | HUD exposure ray `G.STATIC` reads "exposed" behind frosted glass | e2-check polish | do | Light parity: `MASK.SIGHT`, as guard sight. |
| 15 | Grenade blast LOS through glass (any, armoured included) | e2-check polish, e10-check polish 3 | do | Inconsistency: the grenade bounces off a pane but its blast passed it. Blast LOS `MASK.BLAST` = `G.STATIC \| G.GLASS` (assumed decision P-A1: a pane shields a blast; undo: set `MASK.BLAST` back to `G.STATIC`). |
| 16 | Gadget flight casts pass glass (sticky cam / noise maker, the throw arc) | e2-check polish | do | A thrown gadget lands behind a pane. Flight and arc casts add `G.GLASS` (`MASK.GADGET_FLIGHT`), as the grenade body. |
| 17 | Boost / relay / leg-up rays pass glass | e2-check polish | skip | Mostly vertical; no glass balustrade exists yet. Review when one does. |
| 18 | Host shot / lamp-shot LOS `G.STATIC` only (a modified client could hit through armour) | e10-check polish 1 | do | `MASK.HOST_LOS` = `G.STATIC \| G.GLASS_ARMOURED` in both host checks. |
| 19 | Partner tracer drawn through an armoured pane | e10-check polish 2 | do | `MASK.WORLD \| G.GLASS_ARMOURED` (the round stops there). |
| 20 | Co-op client sees no ricochet sparks for its own shot | e8-cameras gap | skip | Needs a client camera-shot path: a wire change. |
| 21 | `LevelBuilder.ramp` end-cap (collision slab lowered vertically only) | STATE backlog note | skip | Fixing it moves every map's ramps. |

## Results

Done: 10 (items 1, 3, 6, 8, 11, 14, 15, 16, 18, 19). Skipped: 11 (2, 4, 5, 7, 9, 10, 12, 13, 17, 20, 21). No wire change,
PROTOCOL stays 35.

| # | Change | Files |
| --- | --- | --- |
| 1 | Tanks `bx(..., 0, 2.0, ..., { noLedge: true })` | `campusS4.ts` |
| 3 | `DOOR_PEEK.floorGap` 1.2; `doorPeekEligible(..., py)` (optional, NaN skips); `gameState` passes the feet y | `doorPeek.ts`, `gameState.ts` |
| 6 | Sash hole `[34.7, 36.3, 0.5, 2.05]`, `windowAt(-46, 1.275, 35.5, 1.6, 1.55, ..., { sill: 0.5 })` | `campusS5.ts` |
| 8 | `eventQueueKeeps(len, e)` (cap `MAX_EVENTS * 2`, `crate` always kept), used by `CoopHost.push` | `protocol.ts`, `coopHost.ts` |
| 11 | `segmentHousingT` (entry parameter, -1 miss; `segmentHitsHousing` wraps it); `shotRay` takes the smallest | `camera.ts`, `securitySystem.ts` |
| 14 | Exposure ray `MASK.SIGHT` | `gameState.ts` |
| 15 | `MASK.BLAST` = `G.STATIC \| G.GLASS` in the blast LOS | `groups.ts`, `explosions.ts` |
| 16 | `MASK.GADGET_FLIGHT` = `G.STATIC \| G.GLASS`: the sticky / noise flier cast and the throw-arc preview (`\| G.PROP`) | `groups.ts`, `gadgetSystem.ts` |
| 18 | `MASK.HOST_LOS` = `G.STATIC \| G.GLASS_ARMOURED` in `judge` and `onLampShot` | `groups.ts`, `coopHost.ts` |
| 19 | Partner tracer `MASK.WORLD \| G.GLASS_ARMOURED` | `remoteAvatar.ts` |

Assumed decision P-A1 (item 15): any pane, clear or armoured, shields a grenade blast (the grenade already bounces off it).
Undo: `MASK.BLAST` back to `G.STATIC`.

Item 6 note: the light well now has no guard path at all (its only other way in is the CR7 rope from the hoist door);
on the runtime nav it drops out of the flood. The player still vaults the sash (sill 0.5 vs player step 0.42).

### Tests
- New `tests/polishBatch.test.ts` (9 cases): the masks (blast / gadget / host LOS / exposure), `eventQueueKeeps`, the
  peek floor gap, `segmentHousingT` and nearest-housing `shotRay` both orders, and the S5 well on the runtime nav
  (verified to fail on the old 0.45 sill and pass on 0.5).
- `campusS4.test.ts`: tank 2.0 noLedge case. `campusS5.test.ts` CR7: the sash closure on the grid removed (the well
  reaches nothing on the open grid), the anteroom side walkable, the window anchor's sill > 0.45.
- `npx tsc --noEmit`: clean.
- `npx vitest run` polishBatch, campusS4, campusS5, doorPeek, securityCamera, securityCameraE8, crateWire, armour, glass,
  campusRuntimeNav, campusGlass, net, weaponsCrate: 13 files, all pass.
- No e2e run (lead's): `src/net` changed -> e2e-coop + e2e-netmove; campus data (S4 / S5) -> e2e-sectorops:6 (and the
  S5 CR7 / window leg in sectorops if it has one); gadgets / grenades / door peek -> whichever quick suites own them.
