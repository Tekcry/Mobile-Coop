# lr-tex3d check: lamp atlas fit to MAX_3D_TEXTURE_SIZE

Checker: fresh Opus. Branch `feature/sector-redesign-lampx`, diff 0cadd6f3..eb45b0af. Build report: `lr-tex3d-fix.md`.

## Verdict: PASS (no blocking items)

## 1. Classic unchanged
- `fitLampAtlas` (`src/voxel/lampBake.ts:324`) packs `packLampAtlas(boxes, min(1024, maxSize))` first, in light order
  (no `order`, `maxDepth = Infinity`), and returns it as is when every axis fits. With no page break `packLampAtlas`
  (`:271`) gives the old offsets; dims match the old ones: y = `py + ph` with `py = 0`, `ph = max(1, by)` (old `h`);
  z = running `max(z + row)` = old `z + row || 1` (z only grows without pages; empty set still 1). `ys` all 0, so
  `fillLampAtlas` (`:366-371`) writes the old index `tx + ax * (y + ay * (tz + z))`. Byte-identical for any map that fit
  at maxSize >= 1024 (every desktop WebGL2 GPU).
- Shader: `LAMP_PAGES` set only when `atlasPages > 1` (`src/world/bakedLamps.ts:784`, `mixDefines` `:726-731`). Babylon
  `MaterialDefines.toString` emits only truthy booleans, so the added `LAMP_PAGES: false` key (`:738`) leaves the defines
  string and effect key unchanged; `mixDefines` returns the old `['#define LAMP_DOORS8']` / `null`. `#else` branches
  (`:508`, `:1014`) are the old lines verbatim. Test: `tests/lampAtlasFit.test.ts:46` and `:116` (campusOps Classic dims).

## 2. Packing and lookup
- Copy: `fillLampAtlas` copies each tile row-for-row at `(tx, ty + y, tz + z)`; test `:68` checks every cell of every
  tile and `tilesOk` checks no overlap. Page break (`lampBake.ts:294-301`) resets x / z / row and starts the new page at
  `py += ph` (the full height of the previous page), so pages never overlap; `d` is a running max so earlier pages' depth
  is kept.
- Texel 7: `.x` is LR14's shadow slot (`bakedLamps.ts:413`, written per frame, only `lo + 28`); `.y` (`:220`, `o + 29`)
  written once in the constructor, nothing else writes `o + 29..31`. LR15's doors 5-8 live in their own texel at
  `door2Base + i` (`:225`), not in t7. Data texture is RGBA FLOAT (`:245`), so y up to 2048 is exact.
- Both taps add `lampTexel(lb + 7).y` to q.y: per-lamp loop (`:1011-1015`, plugin, define `:784`) and volume mix
  (`:505-509`, in `MIX_GLSL`, define via `mixDefines`). Same `lb` as t3/t4, same lamp the bake indexed.
- Bleed: q is clamped to `[0.5, n - 0.5]` per axis (`:504`, `:1010`), so the filtered tap stays between texel centres of
  its own tile on every axis, y included; a page seam is no different from the existing x / z tile seams. No mips.

## 3. Limits
- `max3DTextureSize` (`src/core/babylon.ts:209-215`) is the only reader, used only at `bakedLamps.ts:181`. WebGL2:
  `getParameter(0x8073)`; WebGL1 / NullEngine / WebGPU (no `_gl`) or a 0 / NaN answer: 2048. SwiftShader / ANGLE report
  2048, a sane value. Tests `:132`.
- Every returned layout is checked per axis against `maxSize` (`ok`, `lampBake.ts:325`). `fits: false` only when even
  the paged atlas fails; the constructor then `console.warn`s (`bakedLamps.ts:182`) and uploads anyway, so the picture
  would go black with one warning. Unreachable on any desktop GPU at 2048 (campusOps Realistic needs 2031 x 522 x 193);
  polish 1.

## 4. Memory
campusOps Realistic atlas 204.6 MB R8 (one-off, default-off setting; the failed upload allocated nothing before).
`docs/systems/performance.md:24`: VRAM <= 6 GB High / 9 Ultra / 12 Epic. Within budget, not over: nothing for Michael
beyond the laptop re-check below. Classic unchanged (campusOps 91 MB).

## 5. Hot path, parity, scope
No per-frame allocation (layout, sort and fill at construction only; t7.y written once). Gameplay never reads the GPU
limit: the field reads `r.vis` on the CPU, the atlas is a lossless copy, so picture and field agree. Diff touches no
`src/net`, PROTOCOL or save code.

## 6. Tests (rerun here, slot lock 1)
tsc clean. vitest single files: lampAtlasFit 6, lampBake 12, shadowAccuracy 15, lightField 15, lights 10, lampFalloff 10,
lampGridLossless 4, lampLevel 1, lampPluginClone 1, lampPluginGap 1, all green. Tests are meaningful: exact cell copy,
overlap, real campusOps boxes under both falloffs, the 2428-deep failure reproduced. No e2e.

## Polish (non-blocking)
1. `!fits` path (`bakedLamps.ts:182`): degrade instead of uploading an oversize texture, e.g. `console.error` and skip
   the baked-lamp plugin (or fall back to the Classic falloff for the map), so it is never a black screen with a warn.
2. `tests/lampAtlasFit.test.ts:119`: also assert campusOps Classic `offsets` equal the old `packLampAtlas` offsets (the
   synthetic test `:53` covers it, the real-map test checks dims only).
3. Plugin with `LAMP_PAGES` and `LAMP_CSHADOW` fetches t7 twice (`:1012`, `:1051`); read it once. Minor, Realistic only.

## Laptop checks (Michael)
campusOps `?falloff=photo`: no "texImage3D ... out of range" warning; S2 atrium pool back (dimmer than Classic), foyer
desk lit, S3 guards lit where the meter says lit; first compile of the `LAMP_PAGES` shader without errors; Classic looks
as before; perf / VRAM on campusOps Realistic with the ~205 MB atlas now really allocated.
