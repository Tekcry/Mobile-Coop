# E2 glass - fresh check (Opus)

Head 6c0f0561 vs base `origin/feature/sector-redesign-p3` (merge-base diff). Builder report: `checks/e2-glass.md`.

## Verdict: FIX (2 small items)

The core of E2 is sound: bits, light, nav, sight / hearing masks, campus data. Two body-movement paths still cast
`G.STATIC` only, so a body can pass through a pane, which breaks "bodies stop" (intent, G45).

### FIX 1 - takedown through glass
- `src/game/takedownController.ts:318`: the takedown LOS ray (chest to chest) casts `G.STATIC`; panes are `G.GLASS`, so
  it passes. Reach is 1.8 m (`takedown.ts`), a pane is 0.1 m: a player crouched under the S2 frosted band can grab a
  guard on the other side of the meeting-room glass (or the S3 viewing-corridor glass), and the scripted takedown pulls
  the body through the pane.
- Fix: cast `G.STATIC | G.GLASS` (adding `G.FENCE` too fixes the same old hole at weldmesh fences).

### FIX 2 - partner throw arc through glass
- `src/game/teamController.ts:787`: the throw arc check (G151, "nothing solid along the arc", feet +0.3 and head +1.6)
  casts `G.STATIC`. The throw then moves the runner along the scripted `throwArc`, so a throw aimed at a pane is
  accepted and carries the runner through the glass into the meeting room / write-up office.
- Fix: cast `G.STATIC | G.GLASS` (and `G.FENCE`) for the arc legs only. Keep the landing floor and head-room rays
  (765-774) on `G.STATIC`.

## Checked and fine
- **Bits**: `G.GLASS` 1<<12 and `G.GLASS_FROSTED` 1<<13 are free (no other use in `src`, no clash on any remote branch's
  `groups.ts`). The pane body's collide mask `~(STATIC|GLASS|GLASS_FROSTED)` mirrors the fence body. Raycasts filter on
  `collideWith`, so `MASK.SIGHT` / `MASK.HEARING` behave as the report says. The player controller (`MASK.PLAYER_COLLIDE`),
  props, ragdolls and grenades collide. Bullets (`PLAYER_SHOT` / `ENEMY_SHOT`) pass (A-E2-1).
- **Light parity**: `canonicalLightShapes` skips every glass piece. The runtime meter rays (`gameState` 1560-1627) are
  `G.STATIC`, so they pass too. Torch `beamReach` on host (`enemyManager:621`) and client (`coopClient:100`) are both
  `G.STATIC`, so they agree. The pane mesh is not a shadow caster. Tests cover meter = `totalAt` through a pane.
- **Sight**: guard `losClear`, `seesPoint`, door notice, recon drone, camera `lensRay`, and the camera cue on host and
  client all cast `MASK.SIGHT`. `coopHost.ts:962` is the shot-validation LOS of a bullet, so `G.STATIC` is correct
  there (bullets pass glass). The same holds for `coopHost:1005` (lamp shot) and the `ctDevices` jammer lines (a
  disruptor round).
- **Hearing**: the guard-to-guard and noise wall rays cast `MASK.HEARING`.
- **Nav**: a pane is an ordinary nav blocker with the fence footprint; the down-cast skips it. `campusGlass` asserts
  the nav grid is identical cell for cell to the fence fallback, so every route leg and runtime-nav test is unchanged.
  The panes replace fence panels on the same lines, which were never cover or ledges either.
- **Hot paths**: no new per-frame allocation. `buildGlass` closures and `forEach` run at build time only. `obbsBlock`
  is test or data only. `hyp2` is used.
- **Graphics state**: gameplay reads the collision body and `BoxPiece.glass` only, never the mesh or material.
- **Co-op**: both host and client build the same body from `LevelBuilder`. There is no wire change.

## Runs
- `npx tsc --noEmit`: clean.
- `npx vitest run` glass, campusGlass, perception, securityCamera, securityCameraE8, campusRuntimeNav, campusS2,
  campusS3, campusS4, lampBake, sectors: 11 files, 226 / 226 pass.

## Polish list (no block)
- `src/game/gameState.ts:2965`: the HUD tactical exposure casts `G.STATIC`, so it reads "exposed" behind the frosted
  band while guards cannot see. It should use `MASK.SIGHT` to match guard sight.
- `src/weapons/explosions.ts:63`: the blast LOS is `G.STATIC`. A grenade bounces off a pane, but its blast hurts through
  it. Decide whether glass shields a blast.
- `src/game/gadgetSystem.ts:137 / 669`: gadget placement and flight casts pass glass, so a sticky or thrown gadget can
  land behind a pane. Add `G.GLASS` where a gadget physically travels.
- `src/game/teamController.ts` boost / relay / leg-up rays (151-158, 415-460, 753, 881): they pass glass. These are
  mostly vertical, so the risk is low. Review when the balustrades become glass (open item in the report).
- `stealthSystems.ts:311` (lift eye) and `vfx/doorGhosts.ts`: `G.STATIC`, visual / minor.
- Owed at the slice (as the report says): the `e2-sectorops` S2 / S3 route parts, and a GPU look at the pane materials.
