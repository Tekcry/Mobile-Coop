status: done feature/sector-redesign-lr16t 45e0e86a

Lead note (Sector Ops Build ~20:40): BASE CHANGED - build from feature/sector-redesign-lr16int @ f8008542 (not c7a26ca7). The checker fix round there made every PBR torch path use the meter's feathered nsLampCone (lamp plugin), lightRig.place takes SPOT_EXP / LAMP_EXP, new tests/lampTorchCone.test.ts (keep it green; worst meter vs picture < 1e-6), door / prop spheres in the char-shadow cone fit; see docs/sector-redesign/checks/lr16-batch-fix.md. Line numbers in this brief are pre-fix: re-anchor. LR16e and LR16-1 are being built in parallel from c7a26ca7 (lampBake.ts / bakedLamps.ts / world.ts other regions; LAMP_VERSION: leave it, the lead sets it at the merge). Unit tests only, vitest --maxWorkers=2.

# LR16t - every guard torch stops at walls and shut doors, soft edges (Opus)

Planner: Opus 5.5, 2026-10-23. Plans only; the builder writes the code.

## Goal (Michael's words)
- ~18:20 on 4.78.0: "there was still guards torches showing through walls/doors, and their torches also need to be
  diffused and not so sharp."
- ~18:08: "the edge of lights should diffuse against walls/floors/etc unless something directly cuts off the light ray,
  depending on how far away it is. Must be realistic depiction of light."
- ROADMAP Decided "Lighting everywhere": "guard torch light must stop at walls and shut doors (shadowed / occluded,
  picture and perception agree), and torch beams get soft edges like the lamps".

Done means: all 4 guard torch slots (`torches.FLASHLIGHTS`) are cut by walls and shut doors in the picture, the meter
and guard perception; one torch formula everywhere (no Babylon spotlight torch left, so no hard cone edge); shadows
from torches are soft with distance and sharp at contact.

## Base and branch
- Base: `feature/sector-redesign-lr16int` @ c7a26ca7 (LR16a, LR16b, LR16f / LR16-7 / LR16-3, LR16v, LR16d campus;
  checker B PASS). New branch: `feature/sector-redesign-lr16t`. File:line below are at c7a26ca7 (`lightRig.ts`,
  `shadowAccuracy.ts`, `lightField.ts`, `bakedLamps.ts` are unchanged from fe23ef4c).
- Read first: `docs/sector-redesign/checks/lr16b-build.md` (the feather: `lampMath.ts:28-33`, `TORCH_DRAW_GLSL` already
  calls `nsLampCone`), `lr16-0-ct-audit.md` rows 12-14, `docs/systems/agent-preamble.md`.
- Cloud build: unit tests only (`npx tsc --noEmit`, `npx vitest run <files> --maxWorkers=2`). No e2e, no GPU, no
  `npm run check`. The lead runs the laptop GPU list below after `done`.

## What is wrong today (file:line at fe23ef4c)
1. Picture, 4 torches, three paths:
   - Shadow-mapped torches: Babylon `SpotLight` + `ShadowGenerator` from `LightRig.shadowPool`
     (`src/world/lightRig.ts:29` `BAKED_SHADOWS = 2`, `:37` `MICRO_SHADOWS = 1`, `:334-336`). Their cone is Babylon's
     (`:541` `sp.angle`, `sp.exponent = 2`): hard edge, not `lampTerm`'s feathered cone (LR16b open item 1). Their count
     is `shadowSpec(...).casters` (`src/core/quality.ts:124-136`): Off 0, Low 0, Medium 2, High 3 (capped 2). So on Low
     (the laptop's likely default) NO torch has a shadow map.
   - Drawn torches: `TORCH_DRAW_GLSL` (`src/world/shadowAccuracy.ts:151-170`), written by `LightRig.update`
     (`lightRig.ts:422-437`) and `followTorches` (`:449`). Only occlusion is `torchCut` at `l.reach`
     (`shadowAccuracy.ts:100`, `:118`, `:167`), where `beamReach` (`src/world/torches.ts:64`) casts 5 rays (centre +
     4 at 0.75 of the cone). Light leaks past corners and pillars, a 0.2-0.4 m sliver passes behind walls, and there is
     no door test at all.
   - The cut also makes the picture disagree with the meter: a point beside a pillar past the 5-ray reach is lit in the
     field (it tests its own ray) and dark on screen.
2. Meter and perception (`src/world/lightField.ts:363-381` `dynamicInto`): torch term `lampTerm` (feathered since
   LR16b) x the caller's `occluded` x `doorBlocks` (`:385`). Callers: `GameState.lightOccluder`
   (`src/game/gameState.ts:1620`, Havok ray vs `G.STATIC`, which includes shut door bodies:
   `src/physics/groups.ts:58-60`, `src/world/doors.ts:169-182`) and `EnemyManager.bodyOccluder`
   (`src/ai/enemyManager.ts:835`, `rayOccluder` over `G.STATIC`). Correct. One gap: `src/ai/enemy.ts:1615`
   `this.ctx.world.lightField.totalAt(x, y, z)` with NO occluder, used when a target carries no `light`.

## Approach (chosen) and why
**One torch shadow atlas, drawn by the lamp plugin; the Babylon torch pool goes.** A new `TorchShadows` class, the same
pattern as LR14's `CharShadows` (`src/world/charShadows.ts` at c7a26ca7: `:19` `NO_MESH_LAYER`, `:86` `COPY_GLSL`,
`:107` `CHAR_SHADOW_GLSL` (LR16f's PCSS), `:211` `supported`, `:218` `configure`, `:261` `makeSlot`, `:421` `copy`,
`:248` context restore): one spot
`ShadowGenerator` per torch slot (its light on `NO_MESH_LAYER`, so it lights nothing and adds no sampler), each map
copied into one tile of ONE float atlas (2 x 2 tiles). `TORCH_DRAW_GLSL` multiplies each torch by its tile's
contact-hardening test and by an exact shut-door test, and drops the reach cut. All 4 slots go through this path on
every tier; `LightRig`'s shadow pool takes no flashlight while the atlas is on.

Rejected:
- More Babylon shadow-mapped spots (4 instead of 2): one sampler each in every lit shader (the 16 cap: the micro voxel
  shader is already at 15 + 1, `lightRig.ts:30-37`), Babylon's own cone / falloff (never equal to the meter), and
  still nothing on Low.
- CPU ray grid per torch (e.g. 16 x 16 rays as a depth table): ~1000 Havok rays per refresh for 4 torches (~3 ms),
  laggy and blocky (0.4 m cells at 10 m). Main-thread cost on the laptop.
- Per-pixel ray march through an occupancy 3D texture: no level occupancy on the GPU; campus at 0.2 m is ~200 MB; 65
  steps per torch per pixel.

### Cost estimate (to be measured on the laptop)
| Item | Today | LR16t |
|---|---|---|
| Samplers per lit shader | +2 spot shadow maps on Medium / High (+1 on micro) | +1 (`lampTsAtlas`), spot shadows 0: net -1 (micro: 0) |
| VRAM | 2 x Babylon maps at `shadow.size` 512-1024 (+ depth) | atlas 2 x 2 tiles R32F: 1 MB (256 tile) / 4 MB (512); 4 slot targets 0.25-1 MB each + depth |
| GPU depth passes | 2 maps, Medium+ only | up to 4, every tier; casters cone-culled (cone half angle 0.34 rad, full 39 deg: few meshes) ~0.05-0.2 ms each; only torches whose lit volume meets the camera frustum render |
| Lit pixels inside a beam | 1 PCF tap set (Babylon) | 2-8 search + 4-16 filter `texelFetch` (tier), ~+0.05-0.2 ms at 1080p with a beam filling the screen |
| CPU | `fillCasters` at 4 Hz | same cull at 4 Hz + cone test; door pick per frame (indexed loop, no allocation) |
| Field (meter, guards) | unchanged | unchanged (+ one occluder at `enemy.ts:1615`) |
Expected total: Low +0.2-0.5 ms GPU with 1-2 torches on screen, Epic about today's cost (2 Babylon maps replaced).

## Files (only these)
- `src/world/torchShadows.ts` (new): the class (Babylon side).
- `src/world/torchShadowSet.ts` (new, pure, no Babylon): constants, preset table, GLSL string, kernel, door pick, cone
  cull math, frustum fit. Tests import this.
- `src/world/shadowAccuracy.ts`: `TORCH_DRAW_STRIDE` 12 -> 16 (4th vec4: door ids + 1 of the 4 doors the torch tests,
  written by `TorchShadows`), `torchDrawTerm(l, x, y, z, cut = true)` (the atlas path passes `false`),
  `TORCH_DRAW_GLSL` with `#ifdef LAMP_TSHADOW`: shadow x door test, no `torchCut`; `#else` today's code.
- `src/world/bakedLamps.ts`: define `LAMP_TSHADOW` (`prepareDefines` `:777` area), sampler `lampTsAtlas` (`:783`),
  uniforms `lampTsM[16]`, `lampTsP[4]`, `lampTsI` (`:808-814`), bind (`:867-873` area), `lampTorch` array size x 4 / 3,
  and a public `torchShadows: TorchShadowLink | null` (as `charShadows`).
- `src/world/lightRig.ts`: `setTorchShadows(on)`: when on, `configure` caps the shadow pool's casters at 0 (`:334`) and
  the pick never puts a flashlight in the clustered pool (`:440-446`); expose `casters` read-only (already `readonly`,
  `:73`) and the drawn torch ids (`torchIds`, `:119`) via a getter.
- `src/world/world.ts`: construct after `setTorchDraw` (`:268-272`), `configure` beside `charShadows.configure`
  (`:573`, every tier, `q.minimal` 0), `frame` after `lightRig.update` (`:705`), `refreshMaterials` when its on-state
  changes (as `csChanged`, `:575`), dispose.
- `src/ai/enemy.ts:1615` + `AiContext` (`:94`): add `lightOccluder?: Occluder` to `AiContext`, set by `EnemyManager`
  (`src/ai/enemyManager.ts:359` ctx literal) to its `bodyOccluder`; pass it at `:1615`.
- Tests: `tests/torchShadowSet.test.ts` (new), `tests/torchOcclusion.test.ts` (new), `tests/shadowAccuracy.test.ts`,
  `tests/coopTorches.test.ts` (keep green; edit only if the stride change forces it).

## Algorithm and constants (`torchShadowSet.ts`)
```
TORCH_SHADOW = {
  slots: 4,                 // = FLASHLIGHTS = TORCH_DRAW_SLOTS (assert in a test)
  near: 0.15, far: TORCH.radius (13),      // depth range (m)
  fovPad: 0.06,             // rad added to 2 x cone outer (0.34) for the PCSS reach at the edge
  lightRadius: 0.05,        // torch head (m): penumbra = 0.05 x (receiver - blocker) / blocker
  maxPenumbra: 0.25,        // m
  minTexels: 1.5, maxTexels: 16,
  normalOffset / normalPerM / bias: copy CharShadows' CHAR_SHADOW values first; tune only if acne in tests' math
  floor: 0,                 // a torch in shadow gives nothing (unlike characters' 0.x floor)
  casterMargin: 1.5,        // m, moving casters (as LightRig.fillCasters)
}
TORCH_SHADOW_PRESET (by ShadowQuality, every tier on): off 256, low 256, medium 256, high 512, ultra 512, epic 512 (tile px)
TORCH_SHADOW_TAPS: tile 256 -> filter 4 / search 2; 512 -> 8 / 4 (epic 12 / 6)
```
Why: a guard torch head is ~4-6 cm, so `lightRadius` 0.05 gives a sharp edge at contact and ~0.2 m at a doorway 1 m
from the torch with the wall 5 m away: soft with distance, as Michael asked. The beam rim's softness is LR16b's
`SPOT_FEATHER` (already in `nsLampCone`), not this. Every tier gets maps because torch occlusion is a correctness bug
(a guard's light through a wall reveals him), not polish.

Per frame (allocation-free):
1. Slots follow `LightRig`'s drawn torch slot k -> registry id (slot k of the atlas = draw slot k; empty -> idle,
   `refreshRate = 0`, params.w = 0).
2. Spot light at the torch position, direction = cone axis, angle `2 x acos(cosOuter) + fovPad`, `shadowMinZ` near,
   `shadowMaxZ` = `min(radius, reach + 1)` (reach only bounds the depth range now).
3. Casters: from `LightRig.casters` (static level / proxy, characters, props, the door leaf mesh `world.ts:210`):
   bounding sphere within `radius + casterMargin` AND inside the cone (sphere-cone test: angle from axis to centre
   minus asin(r / d) < outer + fovPad). Re-cull at the rig's pick (0.25 s) and when the slot's torch changes.
4. Refresh: the slot whose torch is nearest the camera every frame; others every 2nd frame; x the governor
   (`setAdaptive`). Skip a slot whose lit volume (sphere centre torch + axis x reach / 2, radius reach / 2 + 0.5)
   misses the camera frustum.
5. Copy each rendered map into its tile (CharShadows' `copy`), snapshot its view-projection into `lampTsM[s*4..]`,
   params `(minZ, minZ + maxZ, bias, valid)` into `lampTsP[s]`, `lampTsI = (tile, taps, atlas px, depth sign)`.
6. Doors: per slot, up to 4 doors with `open <= DOOR_SHUT` whose leaf middle is within `radius + width` of the torch,
   nearest first (as `lampDoorLists`, `lightField.ts:83`, but per frame and shut-only); ids + 1 into the slot's 4th
   vec4. The shader runs `nsDoorBlocks(torchPos, p, door texels)` (`bakedLamps.ts:445`, same test as
   `LightField.doorBlocksOne`); a shut leaf is ALSO in the depth map (soft rim), the analytic test makes the cut exact
   and immediate on the frame a door shuts.
7. GLSL `nsTorchShadow(int s, vec3 p, vec3 gn, vec3 lpos)`: copy LR14's `nsCharShadow` shape (normal offset, metric,
   tile origin) and LR16f's PCSS blocker search + filter. Reuse LR16f's fixed kernel by import (read-only:
   `CHAR_SHADOW_KERNEL` `charShadowSet.ts:88`, `CHAR_SHADOW_DISK` `:113`); write the torch's own GLSL function and
   penumbra constants in `torchShadowSet.ts` (do not edit `charShadows.ts` / `charShadowSet.ts`).
8. `nsTorches` under `LAMP_TSHADOW`: `term = (1 - d / r) x nsLampCone(ca, cut, 2.0) x ndl x nsTorchShadow(...)`, and 0
   when a listed door blocks. No `torchCut`. Without the atlas (`supported()` false: WebGL1, no float render target)
   everything stays as today (Babylon pool + reach cut): the fallback, logged once.

Light parity: picture = `lampTerm` x N.L x shadow; meter = `lampTerm` x ray test x door test. They agree everywhere but
inside the penumbra band (soft edge vs a binary ray) and on an open door leaf (picture-only shadow, as LR16-3's
character maps; the field ignores open leaves). Write both exceptions in the file header.

## Acceptance
- No flashlight ever sits in `LightRig.shadowPool` or the clustered pool while the atlas is on; `drawnTorches` = torches
  on (up to 4).
- Unit: behind a wall and behind a shut door every torch slot gives 0 in the field (all 4 slots, each occluder type);
  in the open beam the field's per-torch term equals `torchDrawTerm(..., false)` at 200 seeded points (|diff| < 1e-6).
- GLSL strings: `LAMP_TSHADOW` branch has no `TORCH_CUT_SOFT`, calls `nsLampCone` and `nsDoorBlocks`, embeds the
  kernel constants exactly, no `time` / random.
- `enemy.ts:1615` passes an occluder (test through a stub `AiContext`).
- Samplers: unit test that with the atlas on, `LightRig` shadow casters are 0 for baked maps, so per-shader samplers
  are today's - 2 + 1 (document the count in the build report).
- `npx tsc --noEmit` clean; all listed tests and `lightField`, `lampFalloff`, `shadowAccuracy`, `coopTorches`,
  `charShadowSet`, `lampPluginClone`, `lampPluginGap` pass.

## Unit tests by name
`tests/torchShadowSet.test.ts`:
- "slots equal FLASHLIGHTS and TORCH_DRAW_SLOTS"
- "every shadow tier has torch maps (off and low at 256)"
- "tile layout 2 x 2, slot origins"
- "frustum covers the cone plus the PCSS pad"
- "caster cull: inside reach and cone kept, behind the torch dropped, margin for moving casters"
- "door pick: shut only, nearest first, at most 4, open leaves skipped, allocation-free"
- "penumbra: 0 at contact, grows with receiver-blocker gap, capped at maxPenumbra"
- "kernel: fixed, in the unit disc, every prefix spread"
- "GLSL: no torchCut under LAMP_TSHADOW, nsLampCone and nsDoorBlocks present, constants embedded"
`tests/torchOcclusion.test.ts`:
- "a torch behind a wall lights nothing in the field (each of the 4 slots)"
- "a torch behind a shut door lights nothing; open door lets it through"
- "open beam: field term equals torchDrawTerm without cut at 200 points"
- "guard perception fallback (enemy.ts) uses the occluder"
`tests/shadowAccuracy.test.ts`: stride 16 write / clear; `torchDrawTerm(cut=false)`.

## Laptop GPU checklist (lead, after done; `npm run build`, GPU slot alone)
1. ANGLE D3D11: `LAMP_TSHADOW` compiles (const array, uniform-bounded loops); `scripts/e2e-lightbake.mjs` samplers
   <= 16 at Epic, and at Low with the atlas on.
2. A guard torch: behind a wall corner, behind a shut door, round a pillar, through a doorway: no light past the
   occluder; doorway edges soft at 5 m, sharp where the beam grazes a near wall; Low, Medium, Epic.
3. 4 torches on at once (search), all occluded; frame p95 within the governor budget at Low and Epic (vs 4.78 / fe23ef4c).
4. Beam rim soft at 2 m and 6 m on wall and floor (LR16b feather), no Babylon hard ring anywhere.
5. A guard in his own torch's beam path and another guard ahead: body shadow thrown forward.
6. Meter: stand behind a shut door with a torch on the other side: meter unchanged; open it: meter rises.
7. Volumetric haze beam (`vfx/volLights.ts`, untouched) still ends at the wall (it uses `reach`).
8. Co-op joiner: same occlusion on both pages (torches mirror through the registry, no wire change).

## Do NOT touch
`src/world/charShadows.ts`, `src/world/charShadowSet.ts` (LR16f / LR16-7 / LR16-3), `src/world/lampMath.ts` (LR16b /
LR16g), `src/voxel/*` (LR16e / LR16-1), `src/world/lightField.ts` (the field is already right), `src/world/torches.ts`,
`src/vfx/volLights.ts`, `src/net/*` (no wire change, no `PROTOCOL_VERSION` bump), map data.

## Model
Opus (new render path, shader, parity rules). Estimate ~1.5 windows; ~600-800 lines incl. tests.


Reopened 2026-10-23 ~20:05 (orchestrator): Cloud Builder 1 stopped at the account swap with this claimed. Resume from the head of its feature branch on origin if it is ahead of the brief base (WIP), else start from the base.

## Report (lead, 2026-10-24)
Built on the desktop by Sector Ops Build after the cloud claim went stale; released in #291 (4.88.0, on master).
