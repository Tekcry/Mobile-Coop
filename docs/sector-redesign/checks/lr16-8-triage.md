# LR16-8 showcase-sheet triage - which flags are bugs

Opus 5.5, 2026-10-24. Diagnosis only, no source edits. Code read at `origin/feature/marlow-lr16m` 5c20c538 (the shipping
head; the sheets ran on 606630ed, the same lighting code except the lampFlicker hash fix and a warehouse S1 wall).
Node probes ran in a temporary detached worktree at 5c20c538 (single-file vitest, slot lock), since removed.

**Sheets not on this desktop.** `C:/NightShift/scratch/lighting/lr16-8/` and the shot script
(`scratch/work/lr16-8/sheets.mjs`) are not here, so no PNG or script line was read. Verdicts below come from the code,
the flag summary (STATE.md:319) and node probes. Where a verdict depends on the script, it says what to check.

## Verdicts

| Flag | Verdict | One line |
| --- | --- | --- |
| A. 07 "light through the wall" (campus S1 94%, warehouseOps 70%, S5 0%) | **script** (one small real leak in the haze, see A3) | The px-changed metric cannot isolate a leak: TAA jitter alone changes nearly every pixel between two Epic frames. The lit surfaces have shadow and door tests. |
| B. campus S1 08 meter unchanged on the shot | **script / not a bug** | The registry, field, bounce and picture all drop a shot lamp at once. A meter that does not move means that lamp put 0 on the player's chest and head. |
| C. black ceilings over lamps (04) | **design** (LR16-1 model limits), no regression | The bounce reaches ceilings as LR16-1 measured. The black ones are cone fittings (no uplight) and rooms taller than the 4 m bounce reach. |
| No pool / no dark in spins | design / look for Michael | LR16g level pass and LR16-2 framing; not code. |
| S3 lit everywhere | design / look for Michael | Same as above (LR16g). |
| NV too dark in S3 / S4 darkest rooms | design / look for Michael | Night-vision gain curve (`darkCurve.ts` `VISION_GAIN`, `VISION_FLOOR`); already listed for Michael (STATE.md:320). |
| Beacon unreadable at 10-20 m | design / look for Michael | The beacon is a 1.4-2 cm unlit sphere (`characterRig.ts:1644`, `:1651`, `goggleGlow.ts:41`): under a pixel past ~8 m and averaged away by TAA. Needs a minimum screen size or a halo sprite, which is a feature. |

## A. Guard torch "through the wall" (07)

### A1. What lights a surface from a guard torch (atlas path, every WebGL2 tier)
- The registry torch is drawn only by the lamp plugin on PBR materials (`torchShadows.ts:16-19`). While the atlas is on,
  no torch is a Babylon light (`lightRig.ts:483`: shadow casters 0 under `tsOn`).
- Per pixel (`shadowAccuracy.ts:165-189`, `TORCH_DRAW_GLSL` under `LAMP_TSHADOW`), the torch adds light only when all of
  these hold:
  - the point is inside the cone;
  - N.L > 0;
  - none of the torch's 4 nearest shut doors blocks it (`nsTorchDoors`, `shadowAccuracy.ts:182`, the field's own door
    test);
  - its shadow map says lit (`nsTorchShadow`, `torchShadowSet.ts:323-366`).
- The shadow map holds every level mesh: `world.ts:141` adds `level.meshes` through `addStatic` to `lightRig.casters`,
  which `TorchShadows.gather` culls by cone (`torchShadows.ts:325-358`). It also holds door leaves (`world.ts:162`) and
  campus art skins that hide a box (`campusArtRender.ts:304`, `:331`). Kit skins are not casters, but the gameplay boxes
  under them are (`kitRender.ts` header).
- No map yet: dark (`torchShadowSet.ts:325`). Off the frustum: dark. Stale pose: re-rendered (`torchForceRender`).
- Back faces only (`torchShadows.ts:198`). A closed box wall casts from its far face, so a receiver behind it is shadowed.
- Gameplay agrees: the meter uses `GameState.lightOccluder` and the guards use `EnemyManager.bodyOccluder`
  (`enemyManager.ts:1428`). Both test static rays and shut door bodies. The sheets' parity probe read 0 diff.

Nothing in this path lets a torch light a surface on the far side of a closed static wall or a shut door. The one
exception is a wall built from one-sided planes facing the torch, which the back-face-only pass would skip. No such
wall is known on campus or warehouseOps (level walls are boxes).

### A2. Why the metric reads 94% / 70% / 0%
- Shot 07 is starred (Epic). Epic and Ultra use TAA (`quality.ts:58-59`), whose sub-pixel jitter changes almost every
  pixel between any two frames. So do the haze's time-driven shimmer and lamp flicker.
- A "pixels changed" count between two captures therefore measures frame noise, not light behind a wall. A real leak
  through a wall would light one patch of wall or floor inside the cone, never 70-94% of the frame.
- The guard, his visible beam (haze, A3) and his own shadow on the near side also count as changed pixels.
- S5 at 0% is impossible with TAA between two rendered frames. The two captures were the same frame, or the torch never
  came on there. `addTorchSlots` only adds torch slots on dark maps (`torches.ts:36-41`), and a guard lights his torch
  only through `torchWanted`.

**For the next run (Test Runner):**
- Compare torch-on against torch-off at the same pose, after the same number of settled frames, with TAA off (or
  averaged over N frames).
- Mask the comparison to the far side of the wall (or to the surface behind the shut door).
- Use a luminance threshold (for example > 0.02 linear) instead of any change.
- Log `enemyManager.torchesOn` so a run with no torch on fails as invalid.

### A3. A real but small leak: the volumetric beam (Epic / Ultra haze), not surfaces
- `volLights.ts:38` marches a torch's haze over a sphere of radius `reach`. `postStack.ts:97-120` adds in-scatter for
  every view-ray sample inside that sphere and inside the cone. It has no occlusion test inside the sphere.
- `beamReach` takes the LONGEST of 5 rays (centre and 4 edges at 0.75 of the half angle) + 0.4 m (`torches.ts:63-92`).
- Behind a wall facing the wall: all 5 rays stop at the wall, so the haze spills 0.4 m minus the wall's thickness past
  the wall's face (a few cm of glow on a 0.3 m wall).
- Round a corner: one edge ray runs down the guard's corridor, so `reach` is up to 13 m (capped at 14). The haze then
  fills the whole cone, including the part of the cone that crosses the corner's wall into the camera's corridor. That
  is a faint haze wedge on the camera's side of the wall. It is visible only with volumetrics on (Medium and up,
  `quality.ts:56-59`), and the field and the guards never read it.
- The same longest-ray `reach` is the surface cut on the fallback path (no WebGL2 float target: `TORCH_DRAW_GLSL`
  `#else`, `shadowAccuracy.ts:192-212`), where it would light the wall-blocked part of a corner cone. That path is not
  on the laptop.

**Fix outline (A3, small, polish list):**
- Option 1: give the haze its own reach, the SHORTEST of the 5 rays (or the centre ray) + 0.1 m. Write it as
  `l.hazeReach` beside `reach` in `EnemyManager.updateTorches` (`enemyManager.ts:1420`) and in `torchMirror.ts` (co-op
  client). Read it in `writeVolLight` (`volLights.ts:38`). Files: `src/world/torches.ts` (a `beamReachMin`),
  `src/ai/enemyManager.ts`, `src/net/torchMirror.ts`, `src/vfx/volLights.ts`, `tests/volLights.test.ts`.
- Option 2 (exact, dearer): sample the torch shadow atlas in the volumetric pass for `kind === 'flashlight'` slots
  (`nsTorchShadow` at each march sample). This needs the atlas sampler and matrices in `postStack.ts`.

Not blocking: the meter and the guards are right, and only the haze shows it.

## B. Shot lamp, meter unchanged (campus S1 08)

What shooting a lamp changes, in order:
1. `StealthSystems.shootLight`: `reg.destroy(id)` (`stealthSystems.ts:661`) sets `destroyed = true`, `on = false` and
   `version++` (`lights.ts:378-385`).
2. The field (meter and guards): `lampInto` returns 0 for a destroyed lamp on the next read (`lightField.ts:290`). The
   bounce follows the version on that same read, because `bounceInto` syncs first (`lightField.ts:351`, then
   `bounceGrid.ts:137`). There is no cache.
3. The picture: the lamp data row goes to 0 (`bakedLamps.ts:400`, `:563`) on the next frame. The bounce texture follows
   within 0.25 s (`bakedLamps.ts:489-500`, `BOUNCE_UPLOAD_MS`, the one stated parity lag).
4. The meter is the field's `bodyLevel` (chest and head) at the player, sampled at `LIGHT.playerHz` = 10 Hz
   (`gameState.ts:1571-1594`, `lights.ts:93`).

So the readings mean:
- 0.193 -> 0.193 on the shot means the shot lamp's direct term at the chest and head was 0 (outside its photometric
  reach, outside its cone, or baked-occluded). Its bounce share there was also under 0.0005.
- 0.193 -> 0.141 on the circuit means other lamps of the same group light the player's spot.
- The frame mean falling 0.477 -> 0.247 means that lamp lit most of the view (its pool), not the player.

That is parity working: picture, meter and registry all took the lamp out. The only other explanation is a meter read
within 0.1 s of the shot (before the next 10 Hz sample).

**For the next run:**
- Stand the player in the shot lamp's own pool.
- Before shooting, log `world.lightField.lampAt(<baked index>, x, chestY, z)` and `bounceAt` at the player. The shot must
  drop the meter by about that amount.
- Read the meter at least 0.2 s after the shot.

No code fix.

## C. Black ceilings over lamps (04)

### C1. Small rooms at 5c20c538 against the LR16-1 reports (field `bounceAt`, read 0.25 m under the ceiling, as the shader reads it: `bakedLamps.ts:1265`)

| Case | LR16-1 report | 5c20c538 |
| --- | --- | --- |
| `roomA` ceiling over the lamp (lamp 0.2 m under a 3 m ceiling) | 0.105 (build) | **0.167** |
| `slabProbe` lit mean, slab offset 0 / lamp 1 m | 0.121 | 0.121 |
| slab 0, 2 m | 0.117 | 0.117 |
| slab 0.25, 1 m / 2 m | 0.106 / 0.132 | 0.084 / 0.114 |
| slab 0.5, 1 m / 2 m | 0.088 / 0.136 | 0.073 / 0.119 |
| slab 0.75, 1 m / 2 m | 0.027 / 0.025 | 0.026 / 0.022 |
| behind every slab (0.15 / 0.3 / 0.5 m) | 0 | 0 |
| downward lamp 0.4 m under a 4 / 5 / 6 / 8 m roof (uplight) | 0.050 (8 m hall) | 0.082 / 0.067 / 0.067 / 0.067 |
| cone downlight 0.3 m under a 3 m ceiling | - | 0.075 |

- No regression: the ceiling over a lamp is brighter than at LR16-1. The offset cases are 10-20% under the fix round,
  most likely from polish F's tighter crossing codes (98187543), and still lit.
- The known LR16-1 limit stands (build report open item 3; fix-round table): a ceiling in the far quarter of its 1 m
  bounce cell reads ~0.02-0.03.
- Worst case in the probe: a downward lamp 0.2 m under a ceiling at cell offset 0.75 reads 0.004 directly over it. That
  is rare in the maps (C2).

### C2. The two maps, lamp by lamp
Lit lamps; the ceiling found by rasterising the bake's own occupancy above each lamp; read 0.25 m under it.

| Map | Lamps with a ceiling | Ceiling < 0.02 | Why black | Downward lamps in rooms <= 4.2 m: median (n) |
| --- | --- | --- | --- | --- |
| warehouseOps | 95 | 29 | 25 cone fittings (strips at 5.58 / 5.8 under 5.8 / 6.03 m roofs, bulkheads), 3 rooms > 4.2 m, 1 cell offset | 0.078 (45), 1 black |
| ctcourse | 149 | 65 | 12 cone fittings, 49 rooms > 4.2 m (the 9-10 m halls), 4 cell offset or thin | 0.094 (55), 4 black |

The black ceilings are the LR16-1 model as built (`lampBounce.ts:33-46`, `:417-430`):
- A cone fitting gets no uplight (`if (!spot)`, `lampBounce.ts:418`). Its ceiling takes only the floor's bounce, and
  `BOUNCE.reach` = 4 m cuts that off in rooms taller than ~4 m. The warehouseOps strips are cone lights in 5.8-6 m
  bays, so their ceilings are 0.000-0.018. This matches warehouseOps 04 = 0.011.
- In the 9-10 m halls, the floor is past the reach and the lamps hang 3-7 m under the roof (past the uplight lobe).
- Even a lit ceiling (bounce 0.06-0.1) sits in the curve's dark band: `darkCurve.ts:87` maps level 0.12 to screen <= 0.04.
  It is then multiplied by the ceiling's albedo. Near-black on screen is what LR16-1 open item 1 predicted.

Campus S1 / S5 "no ceiling" is the script's framing: it found no ceiling over the lamp it picked (an outdoor or wall
lamp, or a ray that missed). This needs the shot script to confirm. Rerun 04 on an indoor ceiling lamp.

### C3. Options for Michael (look decision, LR16g; each bumps `LAMP_VERSION` and re-bakes)
1. Give cone fittings (LED strips, panels, bulkheads) the housing uplight too: 0.03-0.06 of their level. This is
   physical, because real LED strips and troffers spill up. Files: `src/voxel/lampBounce.ts:418` (allow cones,
   `BOUNCE.uplightCone`), `tests/lampBounce.test.ts` (the "uplight only for downward lamps" test changes).
2. Raise `BOUNCE.reach` to 6-7 m for floor-to-ceiling bounce in the 6 m bays. The cost is bake time and bounce bytes,
   about (6/4)^3, roughly 3x. The LR16-1 wall sweep showed reach 5-6 adds little to walls; ceilings over tall bays are
   where it counts.
3. Raise albedo or add a multi-bounce factor 1 / (1 - albedo) (LR16-1 open item 1). This lifts every dark gap too.
4. Lift the ceiling's on-screen level without changing gameplay: a darkness-curve floor for upward-facing ceilings.
   This breaks light parity, so it is not recommended.

## What Michael should look at
- A3: a faint haze wedge from a guard's beam round a corner at Medium and up (polish list, outline above).
- C3: whether ceilings over the warehouse strips and the tall halls should glow (options 1-2).
- The look flags in the table (pools / dark in spins, NV in S3 / S4, beacon size).

## Probe notes
- Fixtures: `tests/helpers/bounceRoom.ts` (`roomA`, `slabRoom`, `slabProbe`, `bakeRoom`).
- Maps: warehouseOps (134 baked lamps, bake 19.4 s) and ctcourse (149 lamps, 42.8 s), baked in node as
  `tests/warehouseS1Light.test.ts` does (ambient 0, no moon), field `bounceAt`.
- The first per-lamp pass took the ceiling from `LevelBuilder.boxes` AABBs and skipped pitched pieces. That was wrong
  over pitched and narrow pieces (for example ctcourse lamps 33-34 read 0 under a roof the bake has at the lamp). The
  table uses the occupancy rasterised from the bake's own shapes.
