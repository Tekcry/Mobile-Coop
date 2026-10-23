# LR16-POLISH part B - build report

Branch `feature/sector-redesign-lr16pol-b`, base lr16int `82f9e1bb`. The first builder died at the 23:30 swap; the lead
committed its work as WIP `536581f1`. This round verified and finished it: code commit `ef96c0bf`.

## WIP check (536581f1)
- `torchShadows.ts` called `torchPoseMoved`, `torchPoseTurned`, `torchForceRender` without importing them: did not
  compile. Fixed.
- `torchShadowSet.ts` pose split and `torchForceRender`: correct; at governor 1 it gives exactly the LR16t rule (tested).
- Holder pick: the WIP ranked character casters by `(distance to torch / sphere radius)^2`. A guard one step in front
  of the holder, in his beam, has his body centre nearer the torch than the holder's own (0.62 m vs 0.67 m), so he was
  named holder and dropped, and the holder cast into his own beam. Replaced (below).

## Done
| Item | Where |
| --- | --- |
| lr16t check A 5 holder-only drop | `torchShadowSet.ts` `torchHolderScore` / `pickTorchHolder`: a character caster whose sphere holds the torch scores the plan distance from its centre to the holder's feet, recovered by undoing `placeTorch` (torch = feet + `TORCH.ahead` along the beam's plan heading + `TORCH.side` to its right; host and co-op client both place torches with it). Lowest score names the holder. `torchShadows.ts` `gather`: only casters under the holder's root node (his rig: body, gun, helmet, armour) leave the list. No `src/ai` read. |
| lr16t recheck 1 forced renders vs governor | `torchShadowSet.ts` `torchPoseMoved` / `torchPoseTurned` (split of `torchPoseStale`, which stays as their OR) and `torchForceRender(valid, moved, turned, governorEvery)`; `torchShadows.ts` `frame` uses it. Off-frustum-reads-0 shader rule unchanged. |
| lr15-check 1 + lr16t check A 7 fences, ropes, rope line, decals | New `src/world/levelLitMaterial.ts`: `levelIsPbr(scene)` (the level's own material is a marked `PBRMaterial`, so the same `opts.atlas` switch) and `levelPbrMaterial` (the level's settings: metallic 0, roughness 1, `usePhysicalLightFalloff` false, `directIntensity` PI, `environmentIntensity` 0.6, `realTimeFiltering`, colour linearised). Used in `levelBuilder.ts` fence block (alpha test from the albedo texture, no back-face culling, frozen), `ropes.ts`, `ropeLine.ts`, `vfx.ts` `decalMat` (zOffset -2, frozen). Standard materials kept on the standard / `?gfx=min` path. No `markLampLevel`. |
| `torchShadows.ts` header | New "Receivers" paragraph: what takes torch light, what still does not (every standard material, the `?gfx=min` path, unlit helpers, Kestrel light view, menu scenes). |

## Moved
- lr16t check A 6 (no atlas on a map with no torch): moved to part E as the brief says. Inside `torchShadows.ts` alone
  it makes the bright-map shaders one sampler heavier, not lighter: with `on` false, `world.ts:593` sets
  `setTorchShadows(false)` and the rig's baked pools build 2 spot shadow maps (`BAKED_SHADOWS`). Part E does it with
  `lightRig.ts` (its file): `lr16pol-e-build.md`.

## Files outside the brief's list
- `src/world/levelLitMaterial.ts` (new, 38 lines): one shared helper instead of four copies. No other job owns it.
- `levelBuilder.ts`: one import line beside the fence block (the block itself needs no new parameter: the level
  material is made before `buildFences`).
- `vfx.ts`: the `decalMat` field type and the `prep` parameter type widened to `StandardMaterial | PBRMaterial`.

## Tests
- `npx tsc --noEmit`: clean. eslint on every changed file: clean. `npm run lint`: 1 error, in
  `tests/torchOcclusion.test.ts:166` (base 82f9e1bb; already fixed on lr16int by `bef5ca5f`), not touched here.
- vitest `--maxWorkers=2` under a slot lock:
  - `torchShadowSet` 12 (holder case rewritten: shoulder to shoulder both sides, a guard in front of the holder, five
    headings / crouch / scale 1.1 recover the feet to 1e-9, a neighbour's gear sphere, none near, allocation; new case:
    pose split, force rule at governor 1-4, governor 1 equals the old rule, allocation) and `levelLitMaterial` (new, 3:
    `levelIsPbr`, the settings and linear colours, ropes / rope line / decals are PBR on a PBR level and compile
    `LAMP_TORCH` + `LAMP_TSHADOW`, standard and no torch defines on the standard path): 15 passed.
  - torchOcclusion, shadowAccuracy, lampTorchCone, coopTorches, lightField, lampPluginClone, lampPluginGap: 7 files, 54
    passed.
- Not run (rules): e2e, build, full vitest.

## Light parity
Rendering only. The light field, the meter and guard perception are untouched (no change under `src/ai`, `lightField`,
`lights.ts`). Fences, ropes, the rope line and decals now take the torch term the floor beside them takes, which is
closer to what the field says about the spot than before (they were dark under a torch).

## Risks
- Holder rule relies on every torch being placed by `placeTorch` (true today: `enemy.ts:1300`, `torchMirror.ts:72`).
  A future torch placed another way would fall back to "nearest the torch's own plan point" and can mis-name the holder.
  The rig root is the render-interpolated position, the torch the fixed-step one: up to a step of walking apart (a few
  cm), far below the 0.4 m+ to any neighbour.
- Under the governor a turning guard's beam waits for its refresh interval: up to (2 x governor) frames, the part of
  the new cone outside the old frustum reads dark (one 60 fps frame of a turn is ~0.13 rad, past the 0.02 pad). A dark
  rim or a dark beam edge while turning at a low frame rate, never light through a wall. Look for it on the laptop.
- The four materials are PBR now: `realTimeFiltering` and the IBL add shader work on small meshes; decals are 160
  instances of one material. Expect no measurable cost; perf not run.
- Fence alpha test on PBR (`useAlphaFromAlbedoTexture`, mode 1) should cut the same wires as the standard one (same
  0.4 cut-off); check in the look shot.

## Laptop suites (merged sha)
`e2e-desktop:3` (warehouse dark: atlas on, `copies > 0`), `e2e-lightbake` (every shader <= 16 textures), and look
shots: a guard torch on a fence, a rope and a bullet decal (lit like the floor beside it, no PI jump); the same fence
under a baked lamp looks as before; a guard with a second guard a step in front of him in his beam (the front guard
casts). The bright-map "one texture lower" shot belongs to part E.
