# LR16t check B - gameplay and parity (Opus)

Branch `feature/sector-redesign-lr16t` @ 7e4c8b8e, base f8008542. Checker B, 2026-10-23. Scope: guard perception, the
meter, the light field, parity with the new torch atlas picture. Checker A reviews the render path.

## Verdict: FIX (one item, a known e2e assertion left failing; the gameplay and parity work itself is right)

## Checks run
- `npx tsc --noEmit`: clean.
- vitest `--maxWorkers=2`, 22 files, 299 / 299: torchOcclusion, torchShadowSet, shadowAccuracy, lampTorchCone,
  awarenessWiring, alarmCall, coopTorches, lightField, plus every test that builds an `EnemyManager` / `Enemy`
  (camBodyWiring, enemyLightsOut, enemyManagerDespawn, gearWiring, hearing, incidents, pairsWiring, postsWiring,
  radioWiring, s6CloseOn, sectorGuardTags, sectorRestart, securityBodies, squadWiring).

## Blocking

1. `scripts/e2e-desktop.mjs:570-582` (part 3, in the GPU list) still asserts "alerted guards' flashlights take the
   shadow pool" (`lit > 0` over `lightRig.shadowPool`). With the atlas on, `LightRig.configure` caps the pool at 0
   (`src/world/lightRig.ts:360`), so `shadowPool` is empty. Scenario: the lead runs the GPU list (`e2e-desktop:3`,
   warehouse, `gfx=epic&voxels=1`, baked lamps so `TorchShadows` is built and on) and it fails on that line every time.
   The preamble asks for scripts that assert the changed behaviour to be updated in the same change. Fix: assert the
   new contract there: `world.torchShadows.on`, `shadowPool.length === 0`, `lightRig.drawnTorches === enemyMgr.torchesOn`
   (capped at 4), and `world.torchShadows.copies > 0` after the 240 frames; keep the 16-texture check after it. The
   comment at `scripts/e2e-lightbake.mjs:72` says the same old thing (comment only, no assertion).

## Parity and gameplay answers

- **Same answer for a torch behind a wall / shut door / pillar.** Player and partner: `GameState.updateLight` samples
  each ref with `lightOccluder` (Havok ray vs `G.STATIC`, shut door bodies included) plus the field's door test over
  all doors (`lightField.ts:373-374`). Bodies: `bodyOccluder` (`enemyManager.ts:953`, `:2153`). The only unoccluded read,
  the `best.light ??` fallback, now goes through `fieldLight` with `ctx.lightOccluder` (`enemy.ts:1624`). Every gameplay
  read of the field is occluded now (grep: no other `totalAt` / `dynamicAt` / `bodyLevel` call outside the editor).
  The picture now matches: depth map of the casters out to the radius, plus an exact test for the 4 nearest shut doors in
  the cone. Shut leaves beyond those 4 still cast through the depth map (the doors' thin-instance mesh refreshes its
  bounds over every leaf, so it always passes the cone cull). The remaining differences are the ones the header of
  `torchShadowSet.ts` lists: the penumbra band (at most 0.25 m) and picture-only shade from open leaves, characters
  and props. "Other guards as targets": guards only target `PlayerRef`s, and guards see other guards only as bodies,
  which use `bodyOccluder`.
- **The fallback in play.** `updateLight` runs before `enemyMgr.update` in the same `fixedUpdate`, and `lightT` starts
  at 0, so `localRef.light` and every remote's `light` are set before the first perceive. The fallback is effectively
  test-only in play, so this change does not move live perception and the cost is nil. When it does run, it is
  allocation-free (`rayOccluder` -> `beamHit` uses the two kept vectors; `hitDistance` has no allocation): one static
  ray per in-range torch.
- **Stale or missing context.** `lightOccluder` is optional: stub contexts in tests leave it out and get the old
  unoccluded read. `bodyOccluder` is a field initialiser, set before the constructor body builds `ctx`, and it calls
  `this.beamHit` lazily, so the order is safe. Revived and spawned guards share the manager's `ctx`. A sector restart
  keeps or rebuilds the manager together with its ballistics, the same as `beamReach` and the bodies, which already use
  them. Co-op clients do not run `Enemy` perception (host-authoritative); their meter is `GameState.updateLight`, which
  this change does not touch. No `src/net` change.
- **GPU atlas support and gameplay.** No. `lightField.ts` and `gameState.ts` are untouched. Nothing in `src/ai`,
  `src/game`, `src/net` or `src/player` reads `torchShadows`, `torchSlotIds`, the pools or `drawnTorches`. `l.reach`
  is still written only by `EnemyManager` and `torchMirror` (static rays). The WebGL1 / no-float-target fallback only
  changes the picture (reach cut + Babylon pool), and `?gfx=min` (`q.minimal`) gives no maps, so logic e2e runs are on
  the old picture path.
- **Existing e2e behaviour (stealth-ai, sectorops, guard-carry).** These read the field (`torchLevel`, `ref.light`) and
  not the rig, so perception is unchanged (see above) and so is their outcome. The only e2e assertion that breaks is
  blocking item 1.

## Builder deviations
1. Far plane at radius + 0.5: right. With the reach as the far plane, receivers past a pillar would read as the cleared
   far texel and disagree with the field. This brings the picture closer to the meter.
2. Per-frame caster cull: fine for gameplay. It is render-side and allocation-free: 4 slots x casters x (hyp3, acos,
   asin).
3. The holder casts nothing: brings the picture closer to the field, which never counts bodies.
4. A door must be in the cone: safe. A leaf that blocks the segment from the apex to an in-cone point meets the cone,
   so its sphere passes the padded test.
5. Stable slots: render-only and safe.
6. A map that is not ready reads dark: picture-only and transient (first frame of a slot, a context restore). The field
   is CPU-only and never samples the atlas, so the dark read never reaches the meter or the AI.
7. The `fieldLight` export: fine. It is testable and adds no hot-path cost.

## Polish (non-blocking)
- `world.ts:586` + `:587`: `setTorchShadows` re-runs `configure(cfgIn)` and then `applyQuality` runs `configure` again,
  so the pool is rebuilt twice on a quality change that flips the atlas. Quality change only, harmless.
- `torchShadows.ts` `frame`: the camera skip uses last frame's frustum planes. On a fast turn a tile can show its stale
  map for one frame: a wrong position, possibly a frame of light through a wall, or dark if it never rendered. Add to
  GPU item 9 (fast mouse turn past a guard's beam).
- `gather` drops `!isVisible` casters, while the field's ray hits every `G.STATIC` body. An invisible static blocker,
  or a window body the depth map does not hold, leaves the picture lit where the meter is dark, as with the old
  Babylon-shadowed torches. Add "torch through an intact window: picture vs meter" to the GPU list.
- `rayOccluder` stops 0.25 m short of the sample point. With the picture now exact, a sample within ~0.25 m of a thin
  wall's far face (a body lying against a 0.1 m partition) could read lit in the field and dark on screen. Most walls are
  thick enough for the ray to hit the near face first. Note only.
- `tests/torchOcclusion.test.ts` uses `Math.hypot` (test code; the hot-path rule is for `src`).
