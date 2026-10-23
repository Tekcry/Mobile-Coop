# G7 check: integration (fresh Opus checker)

Branch `feature/gm-g7` at ba9ab46f, diff `480c6182..ba9ab46f` (20 files, +1722 / -41). Read-only review against
gm-common.md, PLAN 3 (G7) and 7, BRIEF A5 / A6 / A10 / A14, G5-REPORT (G7 notes), G3-REPORT (drop anchor).

## Verdict: PASS

Nothing blocking. The polish items below are dormant with the flag off or until G4's files land; items 1 and 2 must be
settled before G8 flips the default.

## What was checked
- **Flag default off, A10.** `flags.guardModels = params.get('guardmodels') === '1'`. With it off: `guardModelsFor`
  is false, so no `GuardBody` exists; `buildEnemyRig` returns `figure: null`; `showGear`, the knock-off (the
  `if (!H) return` restructure is equivalent), the enforcer's `buildShieldPart`, the anim tier call and `HelmetDrops`
  (`src` null, the same `parts.instance` / pickable / shadow order and the same scaling) are all today's S1 path.
  `buildBodyRig`'s new `gear` argument is unused and `guardBodyOf` returns null. `?guardmodels=0` therefore gives
  today's body. The one change that runs with the flag off is `warmPlayLods` (each url once, queued). Wren's first call
  behaves as before, and a failed run forgets its urls (as `warm = null` did).
- **Gear bits to pieces (A5, A14).** Host: `Enemy.setGear` / `inherit` -> `showGear` -> `gb.setGear(helmet, armour)`.
  Client: wire `puppetGear` bits `PG_HELMET` / `PG_ARMOUR` -> `gb.setGear`. Both go through G6's
  `applyGear(variant, helmet, armour, def.plated, kind)`, and G0's kit maps every kind's helmet bit to
  `helmet_std` / `helmet_heavy` and armour / plated to `vest_soft` / `plate_heavy`, so no visible gear exists without
  the gameplay bit. Every write of `helmet` / `armour` goes through `setGear` / `showGear` or the knock-off, which hides
  the piece (`gb.setGear(false, armour)`). Host and client use the same seed (`Enemy.look` / wire `lookSeed`), the same
  def and the same `applyGear`, so they show the same pieces (tested). Spawn is `setPieces(p.ids, p.count)` (G5 note
  done). The base is per kind, so building with seed 0 and setting the real seed on the first frame never swaps the
  base.
- **Helmet drop (A6, G3).** With the figures, every kind drops helmet_std's `anchors.drop` box scaled by
  `height / 1.77` (helmet_heavy has no drop anchor, so heavies and enforcers drop helmet_std too). The mesh is
  helmet_std's LOD1 triangles from the average base, else the lean one. While the stand-in is in use, it stays the box.
- **Gameplay never reads graphics.** `gearShown` / `shownPieces` are only read by tests and e2e. Shield blocking
  (`shieldBlocks`, `predictDeflect`) reads the yaw and the wire bits. Hitboxes, perception and the light meter read the
  rig. The merged body is `isPickable = false`, so disabling it changes no ray pick. `Enemy.shield` is left null when
  the figure shield is used and is only read for dispose.
- **Hot paths.** One render observer per scene, created once (no per-frame closure). `frameAll`, `GuardBody.frame`,
  `setLook` / `setGear` (early-out on no change), `GuardAnimTier.watch` and `viewMesh` do not allocate. Drop boxes use
  reused arrays. No new `sqrt` / `hypot` (the existing `hyp2` is kept). Allocations happen only at load, construction
  or LOD switch (the shield's bone indices: see polish).
- **Disposal and pooling.** `Enemy.dispose` (alive) frees the figure before the rig. Death hands it to `Body` via
  `guardBodyOf(rig)` (Enemy's dispose skips it once dead). `Body.disposeRig` frees it first. `pickUp` / hoist read the
  gear before the old rig goes. The puppet frees it on dispose and drops its reference on `die` (the rig-root
  `onDisposeObservable` fallback frees it with the client ragdoll). `rig.root.dispose()` keeps materials
  (`disposeMaterialAndTextures` false), so the recursive child dispose spares the shared guard material. Shadow casters
  leave `charCasters` on mesh dispose (world.ts). The anim tier's track drops disposed meshes, and LOD meshes are only
  disabled on a switch, never disposed. `HelmetDrops` swaps a pooled drop's instance when the mesh source arrives.
  `guardLibrary` / `BY_SCENE` are per scene, and `World` builds a new `Scene` per level.
- **Wire.** `src/net` changes only `enemyPuppet.ts` (gear and seed lines, figure dispose). `protocol.ts` and
  `PROTOCOL_VERSION` are untouched, and nothing is added to the wire.
- **Owners and files.** `guardFigure*.ts`, `gearMask.ts`, `gearParts.ts` (placeholders kept) and `scripts/**` are
  untouched. `glb.ts` adds the two `_PIECE` / `_TINT` lines G5 asked for. `studioStage.ts` also calls
  `buildEnemyRig`. With the flag on, its puppet gets a seed-0 figure that the rig-root fallback frees. This is
  harmless.

## Runs (desktop, single files)
- `npx tsc --noEmit -p .`: clean. `npx eslint` on the 17 changed `.ts` files: clean.
- Vitest: guardBody, guardResolve, gearWiring, operatorsRuntime, operatorLab, coopTorches, guardFigure: 7 files, 105
  passed, 1 skipped. coopGuardAi, coopGuardCarry, carry, bodySearch, enemyManagerDespawn, guardLook, guardPoseGolden,
  mocapGuards: 8 files, 62 passed, 1 skipped. Skips are the existing capture / file skips.

## Polish (non-blocking)
1. **Before G8's flip:** G5's two varyings (`vGvis` vec3 + `vGfx` vec2) are still unpacked in
   `guardFigurePlugin.ts`. Pack them into one vec4, or confirm the first real GPU compile in the flag-on e2e (PBR
   varying limit on mobile GPUs).
2. **Before G8's flip:** level load does not await the guard LOD2s, and the plugin variant is not warmed on the loading
   screen (PLAN G7 last bullet, PLAN 8 risk; needs gameState / loading-screen files). The merged body covers the gap,
   so no guard is invisible.
3. `guardHelmet.ts`: the shared drop mesh bakes the first drop's hex into its vertex colours. Every later drop in the
   scene takes that colour (`#14161a` for heavy / enforcer against the faction helmet for the rest), and the `hex`
   passed to `drop` is ignored. Use a per-instance colour (instanced buffer). Dormant until G4's files.
4. `offline.ts`: when no url is fresh, `warmPlayLods` returns the last queued run. Once G4's files land, the menu's
   load screen (`loadMenuLods` awaits warm) could wait behind guard LOD warming. Return the run that holds the asked
   urls, or `Promise.resolve(0)`.
5. `guardShield.ts`: each enforcer gets its own `operatorMaterial` (share one per scene), and `shieldBoneIndices`
   allocates on every LOD switch (cache per LOD).
6. At a LOD switch, the tier watches the old LOD mesh for that one render (the switch happens inside the render, after
   `watch`), so one solve may be skipped. This is cosmetic.
7. Bodies at rest (ragdolls, KO'd) pose through the world path on every render. G8 should measure this, along with the
   disabled merged body's remaining per-frame rig / SmoothBody work.
8. The LOD pick uses `activeCameras[0]` only (split views).
9. After `die()`, `EnemyPuppet.gearShown` falls back to the placeholder branch (all false) because `gbody` is null.
   Only tests and e2e read it.

## Laptop e2e G7 needs
- Flag off (regression; `src/ai`, `src/net/enemyPuppet.ts`, `offline.ts`, `vite.config.ts` changed): `e2e-enemies`,
  `e2e-combat`, `e2e-takedown`, `e2e-guard-carry`, `e2e-stealth`, `e2e-coop`, `e2e-netmove`, `e2e-offline`,
  `e2e-ctcourse`, `e2e-sectorops`.
- Flag on (the first GPU compile of `GuardFigurePlugin`), on a scratch commit with the default flipped (or an
  `E2E_GUARDMODELS` runner switch), `E2E_GPU=1`: `e2e-enemies`, `e2e-combat`, `e2e-guard-carry`, `e2e-coop`. Add a
  console check on `?autostart=ctcourse&mode=course&guardmodels=1`: no shader or varying errors, and guards visible.
