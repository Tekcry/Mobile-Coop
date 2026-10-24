# lr-tex3d fix: the Realistic lamp atlas passed the GPU's 3D texture size

Branch `feature/sector-redesign-lampx`, base 0cadd6f3. Laptop GPU report: one console warning under `?falloff=photo` on
campusOps, "WebGL: INVALID_VALUE: texImage3D: width, height or depth out of range" (Classic: none); Realistic far darker
away from fittings (S2 atrium pool gone, foyer desk black, guards near-black in S3).

## Cause
The baked lamps' visibility atlas (`BakedLamps.vis`, an R8 `RawTexture3D`, `src/world/bakedLamps.ts:181`) was shelf-packed
by `packLampAtlas` at a fixed 1024-cell width, tiles at y = 0, rows growing along z with no cap. LR13 multiplies a fixed
lamp's reach by 1.6 (`lampMath.PHOTO.reach`), so every box grows ~1.6x per axis and the rows run deeper:

| Map / mode | Atlas (x * y * z texels) at the old 1024 width | MB | Fits 2048? |
| --- | --- | --- | --- |
| campusOps Classic | 1021 x 90 x 990 | 91.0 | yes |
| campusOps Realistic | 1023 x 90 x **2428** | 223.5 | **no** (z > 2048) |
| warehouseOps Classic / Realistic | 1024 x 55 x 438 / 1021 x 55 x 994 | 24.7 / 55.8 | yes |
| ctcourse Classic / Realistic | 989 x 48 x 323 / 996 x 48 x 450 | 15.3 / 21.5 | yes |

WebGL2 guarantees `MAX_3D_TEXTURE_SIZE` >= 256; ANGLE D3D11 (the laptop, most Windows GPUs) reports 2048. 2428 > 2048: the
`texImage3D` failed, the texture stayed empty, and every baked lamp's shader tap read visibility 0. (The "48 -> 134 MB"
in shadow-audit.md section 1 is the baked cells; the packed atlas is larger, 91 -> 224 MB.)

## Does it explain the darkness? Yes - a parity bug, on top of a smaller real photometric dimming
The light field (meter, guards) reads the bake on the CPU (`LightField.visInto` over `r.vis`), never the GPU atlas, so it
stayed lit while the picture dropped every baked lamp. Field numbers, campusOps baked in node (doors shut), level 0..1:

| Point | Classic field | Realistic field | Realistic picture before the fix |
| --- | --- | --- | --- |
| S2 atrium floor between the pendants (-16, 0.05, -15) | 0.478 (lamps 0.336 + ambient 0.141) | 0.281 (lamps 0.140 + ambient 0.141) | ambient only (~0.141): pool gone |
| Foyer reception desk top (-20, 0.8, -26.5), downlight 3.1 m above | 0.663 (lamp 0.522) | 1.000 (lamp 0.990) | ambient only: black desk |

So the field said lit and the picture was black: the bug. The foyer desk is the clearest case - photometric is
**brighter** than Classic there (3.1 m from the fitting, inside the 3 m reference: `ref^2 / d^2` ~ 0.94 x window), yet it
went black. Guards in S3 went near-black the same way (every baked lamp read 0 on their bodies too).

What is real photometric behaviour: under the 9 m atrium pendants each pendant gives 0.070 at the floor point against
0.168 in Classic (inverse square from 3 m: (3 / 9.1)^2 ~ 0.11, x the glTF window and the cone, x 0.9 intensity x 1.2).
After the fix the atrium floor reads 0.28 on screen and in the field (Classic 0.48): a visible pool, dimmer than
Classic, on the bible's 0.28 "dark" line. That dimming is the falloff working as designed (high fittings light the floor
less); retuning pendant intensity for Realistic is a Michael / level call, not part of this fix. (The point straight
under the centre pendant, (-18, 0.05, -17), reads lamps 0 in both modes: the feature stair blocks it.)

## Fix
- `src/voxel/lampBake.ts:324` `fitLampAtlas(boxes, maxSize)` (pure): the old 1024-wide layout first, returned unchanged
  when it fits (Classic and every map that fits today keep their layout texel for texel); else the smallest of wider rows
  (up to `maxSize`, one page) and pages stacked along y (rows past a depth start a new page; depths `maxSize` .. 64 tried),
  packing the tallest, then deepest boxes first. `fits: false` only when even that passes `maxSize` (logged once).
- `src/voxel/lampBake.ts:271` `packLampAtlas` gains `maxDepth` (pages) and `order`; `LampAtlas.ys` / `pages`;
  `fillLampAtlas` (`:366`) copies each tile at its page's y.
- `src/core/babylon.ts:209` `max3DTextureSize(engine)`: `gl.getParameter(MAX_3D_TEXTURE_SIZE)` at runtime (2048 with no
  WebGL2 context, e.g. NullEngine).
- `src/world/bakedLamps.ts:181` uses both; `:220` writes each lamp's page y into its t7.y (t7.x stays the LR14 shadow slot);
  `LAMP_PAGES` (plugin define `:784`, lamp-volume mix `mixDefines` `:726`) adds `lampTexel(lb + 7).y` to the atlas tap
  (`:505`, `:1011`). Without pages the shader is unchanged.
- campusOps Realistic now packs to **2031 x 522 x 193, 8 pages, 204.6 MB** at 2048 (241 MB as one wide page; 224 MB was
  the failed upload). Classic campusOps, warehouseOps and ctcourse (both modes) fit at 1024 and are untouched.
- Parity: nothing is down-sampled; every cell is the bake's own byte, so the picture reads what the field reads. Lowering
  the resolution per GPU was rejected: the field would have to read the GPU limit (gameplay never reads graphics state) or
  the two would disagree. On a GPU at the 256 floor campusOps cannot fit at full resolution in either mode (Classic 59 MB
  even paged); no WebGL2 desktop GPU reports below 2048, so that case only warns.
- No per-frame work: the layout is built once at load; t7.y is written once in the constructor.

## Tests
`tests/lampAtlasFit.test.ts` (new): old layout kept when it fits; widening; paging with an exact cell-for-cell copy and no
overlapping tiles; "nothing fits"; campusOps Classic layout unchanged and Realistic 2428 deep at 1024 but within 2048 now;
`max3DTextureSize`. tsc clean, eslint clean on the touched files. Single vitest files green: lampAtlasFit 6, lampBake 12,
shadowAccuracy 15, lightField 15, lights 10, lampFalloff 10, lampGridLossless 4, lampLevel 1, lampPluginClone 1,
lampPluginGap 1. No e2e here.

## For the laptop rerun
campusOps `?falloff=photo`: the texImage3D warning gone, the S2 atrium pool back (dimmer than Classic, ~0.28 vs 0.48),
the foyer desk lit (brighter than Classic), S3 guards lit where the meter says lit. The `LAMP_PAGES` shader path runs only
there (8 pages): first GPU compile of it is on that run. VRAM: the atlas now really allocates ~205 MB under Realistic
(it failed before, so the earlier "perf in budget" did not include it): re-check perf / memory on campusOps Realistic.
