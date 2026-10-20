# Smooth world - polish list

Cosmetic items from the check (CHECK-REPORT, fix round 2026-10-20). Not blocking; for the visual pass after the
playtest (current goal: no refining).

1. Wet floors under roofs in rain (CHECK item 3). `src/world/surfacePlugin.ts` `surfWet` has no sky gate on the smooth
   level (the thin pieces on `?voxels=1` had the same). Done looks like: wetness x open sky (the moon grid or
   `World.roofAt` against the height) in the shader; floors indoors dry.
2. Probe irradiance not sky-gated on level surfaces (CHECK item 4). `src/world/bakedLamps.ts` (`finalIrradiance`). Damped
   by the darkness curve and 0.25 environment intensity on night maps. Done looks like: a desktop GPU shot of a roofed
   room matches the light meter; if brighter, scale `finalIrradiance` by the moon visibility on the level.
3. Fog shafts read the moon's visibility (along the moon direction) instead of straight-up sky visibility on the smooth
   path (CHECK item 6, `src/game/gameState.ts` `PostStack` `sky`). Shafts land slightly offset from the skylights. Done
   looks like: a sky-visibility grid from the canonical shapes, or accept the moonlit offset.
