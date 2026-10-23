# LR16t build - every guard torch stops at walls and shut doors, soft edges

Branch `feature/sector-redesign-lr16t`, base f8008542 (lr16int after the LR16 fix round). Opus implementer,
2026-10-23. Brief: `cloud-queue:briefs/sector-redesign-LR16t.md`. Status: DONE (unit tests only; GPU list below pending).

## What changed (file:line at the head of this branch)
- `src/world/torchShadowSet.ts` (new, pure): `TORCH_SHADOW` constants `:25` (slots 4, near 0.15, far radius + 0.5,
  fovPad 0.06, lightRadius 0.05, maxPenumbra 0.25, texels 1.5..16, CharShadows' normal offset / bias, floor 0,
  casterMargin 1.5, 4 doors); presets `:56` / taps `:58` / `torchShadowSpec` `:61` (off / low / medium 256 x 4 taps,
  high / ultra 512 x 8, epic 512 x 12; `?gfx=min` none); LR16f's kernel by import `:67`; tiles `:71-79`; `torchShadowFov`
  `:82`; `torchPenumbra` `:88`, `torchFilterTexels` `:94`; cone cull `casterInTorchCone` `:104`; `holdsTorch` `:118`;
  door pick `pickTorchDoors` `:137`; `torchLitSphere` `:172` + `sphereInFrustum` `:186` (camera skip);
  `torchRefreshEvery` `:196`; `TORCH_SHADOW_GLSL` `:217` (`nsTorchShadow`: LR14's metric + LR16f's PCSS, not ready -> 0,
  nothing to cast -> 1; `nsTorchDoors`: `nsDoorBlocks` over the torch's 4 door ids). Header: the parity exceptions.
- `src/world/torchShadows.ts` (new, Babylon): `TorchShadows` `:68`, CharShadows' pattern (one spot `ShadowGenerator`
  per slot on a no-mesh layer, float R target, back faces only, copied into a 2 x 2 atlas). `configure` `:114`
  (fallback logged once when `supported` `:107` is false); `frame` `:187`: slot k follows `LightRig.torchSlotIds[k]`,
  places the spot (cone axis, fov, far = radius + 0.5), writes the slot's shut doors into `torchDraw[k * 16 + 12..15]`,
  skips a slot whose lit sphere misses the camera frustum, culls casters `:267`, refresh every frame for the torch nearest
  the camera and every 2nd for the rest (x governor); `copy` `:291` snapshots matrix / params. Allocation-free per frame.
- `src/world/shadowAccuracy.ts`: `TORCH_DRAW_STRIDE` 16 `:87` (4th vec4: door ids + 1; `writeTorchDraw` leaves it on a
  write, zeros it on a clear); `torchDrawTerm(l, x, y, z, cut = true)` `:117`; `TORCH_DRAW_GLSL` `:165`: `nsTorches(p, n,
  gn)` under `#ifdef LAMP_TSHADOW` = falloff x `nsLampCone` x N.L x `nsTorchShadow`, 0 behind a listed shut door, no
  reach cut; `#else` today's reach-cut code.
- `src/world/bakedLamps.ts`: `DOOR_TEXELS` exported `:24`; `torchShadows` link `:134`; `LAMP_TSHADOW` define `:786`,
  `:825`; sampler `lampTsAtlas` `:831`; uniforms `lampTsM[16]`, `lampTsP[4]`, `lampTsI` + `lampTorch` x 4 vec4 (`:858-866`
  and the fragment declarations line); bind `:926-934`; the torch call `:1153` passes the geometric normal (`nsTorches(vPositionW,
  normalW, normalize(vNormalW))`).
- `src/world/lightRig.ts`: `torchSlotIds` `:132`, `setTorchShadows` `:140` (re-applies the last config), `shadowSlots`
  `:150`; `configure` caps the shadow pool's casters at 0 while on `:360`; the torch slots are stable (a torch still
  drawn keeps its slot / atlas tile, `torchKeep`, `:450-483`); the clustered pool skips flashlights while on `:491`.
- `src/world/world.ts`: construct after `setTorchDraw` `:274-278` (character test through the world's char set);
  `applyQuality` configures it before the rig and sets `setTorchShadows` `:578-586`, `refreshMaterials` on `tsChanged`
  `:607`; governor `:640`; `frame` after `lightRig.update` `:727`; dispose `:739`.
- `src/ai/enemy.ts`: `AiContext.lightOccluder?` `:138`; `fieldLight(ctx, x, y, z)` `:176`; the target-light fallback
  uses it `:1624`. `src/ai/enemyManager.ts:374`: ctx `lightOccluder: this.bodyOccluder`. **src/ai changed (two
  checkers)**; no `src/net` change, no wire change.

## Tests (vitest `--maxWorkers=2`, one run: 135 / 135)
- `tests/torchShadowSet.test.ts` (new) 9 / 9: the brief's 9 names.
- `tests/torchOcclusion.test.ts` (new) 6 / 6: the brief's 4 names + the rig (no flashlight in either pool, 0 shadow
  slots with the atlas, all torches drawn, fallback 2 shadowed + 2 drawn, switching on rebuilds) + slot stability.
  Open beam: worst field vs `torchDrawTerm(.., false)` < 1e-6 over 200 seeded points (feather band included, > 20 past
  the reach).
- `tests/shadowAccuracy.test.ts` 15 / 15 (stride 16 write / clear; `torchDrawTerm(cut = false)`).
- Unchanged and green: `lampTorchCone` 2 / 2 (worst meter vs picture < 1e-6), `coopTorches` 12 / 12, `lampFalloff`
  12 / 12, `lightField` 15 / 15, `charShadowSet` 25 / 25, `lampPluginClone` 1 / 1, `lampPluginGap` 1 / 1,
  `awarenessWiring` 19 / 19, `alarmCall` 18 / 18.
- `npx tsc --noEmit`: clean.
- Note: one earlier parallel run had `lightField.test.ts:319` (the levelAt heap-bytes budget) fail once under load;
  it passed alone and in the final run. `lightField.ts` is not touched here.

## Samplers per lit shader (with the atlas on)
Today's count - the light rig's spot shadow maps (2 on Medium+ with baked lamps, 1 on the micro voxel shader, 0 on Low)
+ 1 (`lampTsAtlas`). Epic / Ultra / High / Medium: net -1. Micro voxel shader: 15 + 1 = 16 (was 15 + 1 spot shadow).
Low: +1 (Low had no torch shadow map; now every torch is occluded there).

## Deviations from the brief
1. Far plane = the torch radius + 0.5 m, not `min(radius, reach + 1)`: a far plane at the reach would put every receiver
   past it behind the cleared texel (the far plane) and darken the open floor beside a pillar past the 5-ray reach - the
   bug the brief names. The lit-volume camera skip uses the cone to its radius for the same reason.
2. Casters are culled every frame the slot renders (not at 4 Hz): a guard turning 0.75 rad in 0.25 s would leave a wall
   out of the map. Cheap (indexed loop, two trig calls per caster). The cone test pads each sphere by
   `sphereMargin` 0.3 (skinned bind-pose bounds).
3. Added: a character caster whose sphere holds the torch (the guard holding it, his weapon) is not drawn into its own
   map, so the gun does not throw a blob into the guard's own beam.
4. Added: the door pick also needs the leaf's sphere in the cone (doors behind the torch take no slot).
5. Added: stable torch slots in `LightRig` (a torch keeps its slot / atlas tile while drawn), so a re-pick never
   blanks a tile.
6. A slot whose map is not ready reads 0 (dark for its first frame), not 1: a torch never shows through a wall.
   A slot with no caster in its cone reads lit (params.w 2) without a draw.
7. `fieldLight` helper exported from `enemy.ts` (the call at the old `:1615`) so the occluder is testable without a
   full Enemy.

## GPU check list (laptop, `npm run build`, GPU slot alone)
1. ANGLE D3D11: `LAMP_TSHADOW` compiles (const `TS_DISK[16]`, uniform-bounded loops); `scripts/e2e-lightbake.mjs`
   samplers <= 16 at Epic, at Low with the atlas on, and on `?voxels=1` (micro: must read 16, not 17).
2. A guard torch: behind a wall corner, behind a shut door, round a pillar, through a doorway: no light past the
   occluder; doorway edges soft at 5 m, sharp where the beam grazes a near wall; Low, Medium, Epic.
3. 4 torches on at once (search), all occluded; frame p95 within the governor budget at Low and Epic (vs 4.78).
4. Beam rim soft at 2 m and 6 m on wall and floor, no Babylon hard ring anywhere (no flashlight is a Babylon light).
5. A guard in another guard's beam: body shadow thrown forward; the holder's own gun throws nothing into his beam.
6. Meter: behind a shut door with a torch on the other side: unchanged; open it: rises.
7. Volumetric haze beam still ends at the wall (`reach`, untouched).
8. Co-op joiner: same occlusion on both pages (registry mirror, no wire change).
9. A torch turning on / switching slots: no frame where it shows through a wall (first frame dark), no flicker.
10. Acne / peter-panning on lit walls at grazing angles (bias and normal offset are CharShadows' values, back faces
    only); a single-sided mesh (if any) casts nothing.

## Open items
- `bakedLamps.ts` `getUniforms` fragment declaration line is one long line: LR16-1 adding a uniform there will conflict
  textually with this branch (trivial merge: keep both).
- Perf not measured (no GPU here): up to 4 depth passes every tier, the whole level proxy / voxel mesh drawn per map when
  its sphere holds the torch.
- The fallback (no WebGL2 float target) keeps the reach cut and the Babylon shadow pool, as before.

## Fix round (Opus, 2026-10-23; checks A and B both FIX)
1. **Check A blocking 1 - a stale torch map read lit outside its frustum (beam through walls while guards turn).**
   - (a) `src/world/torchShadowSet.ts:264`: a valid map (`P.w` 1) now returns 0.0 outside its frustum (was 1.0). In steady
     state the cone + pad fits inside it, so only a map older than its torch's pose lands there: a dark sliver, never
     light through a wall. Header comment `:248-250` updated.
   - (b) Pose rule: `TORCH_SHADOW.poseTurn` 0.02 rad / `poseMove` 0.05 m `:57-58`; `writeTorchPose` `:205`,
     `torchPoseStale` `:220` (pure, allocation-free). `src/world/torchShadows.ts`: each slot keeps the pose its tile
     was made from (`TsSlot.pose` `:57`), written when a map copies (`copy` `:335`) and on "nothing to cast" (`:264`).
     In `frame`, an in-view slot with casters calls `slot.map.resetRefreshCounter()` when its tile is not a valid map or
     the torch has left that pose (`:276`), so a turning or walking guard's map renders that frame instead of waiting
     for its interval. poseTurn is 0.02, not the full 0.03 per-side pad: the normal offset at the radius needs ~0.006
     rad (a test holds outer + poseTurn + offset under the half fov).
   - Polish A1 (out-of-view skip, `:247-255`): a skipped slot whose torch left the tile's pose goes to not ready (`w` 0,
     dark) instead of keeping a stale "valid" map; it renders on its first in-view frame (the 0 -> n refresh change).
   - Polish A2: a torch change in a slot sets `w` 0 (as before), and the rule at `:276` renders it the same frame.
   - Cost note: forced renders bypass the slot interval and the governor while a torch turns or moves > 5 cm between
     renders (a searching or walking guard renders its map most frames). Perf still unmeasured (GPU list item 3).
   - Tests: `tests/torchShadowSet.test.ts:234-235` (GLSL: off-frustum returns 0.0, the old 1.0 gone); new
     `:238` "pose rule": turn 0.01 / 0.02 hold, 0.13 (one frame of `turnRate`) and past poseTurn stale; 2-4 cm hold,
     past poseMove stale; the threshold leaves room for the normal offset in the pad; one frame's turn puts the rim
     outside the old frustum; allocation-free.
2. **Check B blocking 1 - `scripts/e2e-desktop.mjs` part 3 asserted flashlights take the shadow pool.**
   `scripts/e2e-desktop.mjs:577-589`: after alerting the guards and 240 frames it now asserts `world.torchShadows.on`,
   `lightRig.shadowSlots === 0`, `lightRig.drawnTorches === min(4, enemyMgr.torchesOn)` with `torchesOn > 0`, and
   `world.torchShadows.copies > 0`; the 16-texture check follows unchanged. `scripts/e2e-lightbake.mjs:72` comment
   updated (comment only). `node --check` clean on both. Not run (GPU list).
   - Polish B: `Math.hypot` -> `hyp2` / `hyp3` in `tests/torchShadowSet.test.ts` and `tests/torchOcclusion.test.ts:137`.
3. Checks: `npx tsc --noEmit` clean. vitest `--maxWorkers=2`, 7 files, 85 / 85: torchShadowSet 10, torchOcclusion 6,
   shadowAccuracy 15, lampTorchCone 2, lightField 15, charShadowSet 25, coopTorches 12. No e2e, no GPU.
