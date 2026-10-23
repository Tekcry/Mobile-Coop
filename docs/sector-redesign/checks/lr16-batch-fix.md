# LR16 batch 1 - fix round (checker A blocking items 1-3, checker B polish 4)

Branch `feature/sector-redesign-lr16int`, base da773613. Status: IN PROGRESS (WIP save for an account swap).

## Plan / status
1. Torch parity - DONE in code (bakedLamps SPOT_FALLOFF_*, lightRig.place SPOT_EXP), test tests/lampTorchCone.test.ts passes; doc write-up pending.
   - Plan: the lamp plugin (`bakedLamps.ts` `LampPlugin.getCustomCode`) regex-replaces Babylon's PBR spot cone call
     (`computeDirectionalLightFalloff(light*.vLightDirection.xyz,preInfo.L,...)`, in `lightFragment` and in
     `pbrClusteredLightingFunctions`) with an `nsSpotFalloff` overload that runs `nsLampCone` (LAMP_MATH_GLSL:
     same cos^exp x smoothstep feather as `lampCone`). Covers shadow-mapped torches, plain and clustered pool lights.
     Standard materials (editor only, no torches): scale `diffuse{X}` by the feather in the CUSTOM_LIGHT hook.
     `lightRig.place` exponents from `SPOT_EXP` / `LAMP_EXP`, not literals.
2. LR16-3 - DONE in code (charShadows gather/addDynamic, charShadowSet doorSphere), tests in charShadowSet.test.ts pass.
3. contribution() photometric - DONE in code (lights.lightTerm shared with LightField.dynamicInto), lightPreview test updated; full related vitest pending.
4. Docs polish - DONE.

## Left
Everything above, then tsc + related vitest (expect exactly 15 reds).
