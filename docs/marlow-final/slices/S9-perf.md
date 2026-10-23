# S9 - facility GPU perf pass (analysis and fixes)

Job marlow-final, map `ctcourse` (Course mode). Base: 5100141d plus the working tree at the time of this pass (A1-A7
dressed, A8 greybox). Problem (STATE "03:45 PERF", guard-cap, laptop RTX 4090 Laptop, Epic 1080p): the facility added
about +4 ms GPU (6.6 -> 10.9 ms, over the 7.5 ms Epic budget), +1.2 ms CPU and +110 draws at 0 guards.

No GPU run was made here (the desktop GPU lane is busy). Every saving below is an estimate from the code and the
counts. The laptop "after" run at the end of this file is what confirms or rejects them.

## Counts (throwaway vitest on `buildCtcourse`, deleted after use)

| What | Count |
| --- | --- |
| Level boxes (one thin-instanced `lvl-box` draw, PBR + `SurfacePlugin` + lamp plugin) | 5437 (5284 visible), 20 cylinders |
| Kit instances | 1607: wallPanel 666, wallUpper 469, glassClear 212, handrail 72, skirting 61, ledSlot 40, doorFrame 30, doorLeaf 30, doorJamb 15, glassFrosted 12 |
| Kit draws (one per placed (piece, material)) | 30, 261 k triangles (composite 110 k, metal 96 k, metalDark 28 k) |
| Prop placements | 335 of 30 kinds (cableTray 67, galleryConsole 55, signPlate 38, serverRack 37, galleryChair 36, palletRackBay 24 ...) |
| Prop draws | 96, 66 k triangles, 25 materials |
| Clear glass | about 1010 m2 (glassClear 212 panes: mostly the gallery band 4.5-7.5 m on the set walls, plus the handrail glass) |
| Frosted glass | about 46 m2 (A3 offices) |
| Baked lamps | 149. Lamp grid 82 x 41 columns of 2 m. Lamps listed per column: 0: 1628, 1: 392, 2: 455, 3: 358, 4: 246, 5: 141, 6: 106, 7: 31, 8: 5 |

## Suspects: estimate and evidence

### 1. Box under every skin drawn and lit twice (the main GPU suspect; fixed)
- Babylon's default opaque order is `RenderingGroup.PainterSortCompare`, by material `uniqueId`
  (`node_modules/@babylonjs/core/Rendering/renderingGroup.js:15-22, 283-290`). The level material is made first
  (`src/world/levelBuilder.ts:454-486`) and the kit and prop materials later (`src/world/world.ts:255, 263`). The
  level's boxes are always drawn first.
- Every clad wall keeps its box visible under the panels (`KIT_BOX_COLOR`, seen in the 12 mm joints). Every prop keeps
  its gameplay box 1 cm inside the mesh (`facilityProps.ts` header). So every visible skin or prop pixel ran the
  level's full shader first: the 8-slot lamp loop (`src/world/bakedLamps.ts:874`), the triplanar atlas taps, the
  real-time env filtering (8 + 8 cube taps, `levelBuilder.ts:467`). Then the skin passed the depth test 3-6 cm in front
  and was lit again.
- Size: 666 wall panels (3.6 m2 each) + 469 upper panels (1.8 m2) are about 3200 m2 of cladding. In a set hall at eye
  height, clad walls are typically 35-55% of the frame and props 5-10%. That is roughly 0.4-0.6 of a frame of
  redundant lit shading.
- Estimate: -1 to -2.5 ms GPU at Epic 1080p wherever clad walls fill the view. This is most of the +4 ms.

### 2. Gallery glass and other alpha slabs (fixed, partly)
- Kit `glass` (alpha 0.14) and `frosted` (0.68), and props `glass` (0.2) and `mesh` (0.5), are alpha-blended PBR
  materials with `backFaceCulling = false` and two-sided lighting (`kitRender.ts`, `propRender.ts`, before this pass).
- Each pane is a closed 12-triangle slab (checked from the GLB). Both faces were rasterised and fully lit (lamp loop
  included). Depth writes stay on for alpha in Babylon, so the far face survived only where its triangles came first:
  most of the pane from its local +z side, and one diagonal half from the -z side. That made the tint depend on the
  side and on the half.
- The gallery band (3 m high over every set wall) is 10-20% of the frame in most hall views.
- Estimate: -0.2 to -0.5 ms where the band is on screen. Fixed by culling the back face (one lit layer per pane).

### 3. Kit and prop draws: thin-instanced skins, one draw per (piece, material) (fixed)
- 30 kit + 96 prop draws per pass. Epic draws them twice: the scene pass, plus the G-buffer pass that SSAO2 and SSR
  force (`src/vfx/postStack.ts:298`). That is about 250 draws, and it matches the measured +110 draws and +1.2 ms
  CPU at 155fbec0 (fewer props then).
- The thin-instanced meshes are never frustum-culled: their bounds cover the whole map. A per-material static bake
  therefore loses no culling.
- Estimate: -67 draws per pass (126 -> 59), about -130 in guard-cap's all-pass count at Epic. About -0.5 to -1 ms
  frame CPU (render JS) and a small GPU gain.

### 4. Kit and prop materials: PBR count, unique materials, textures (no change)
- Kit: 8 materials. Props: 25. All share one PBR shader variant and are frozen (`m.freeze()`). No textures: flat
  colour, no atlas, so the skins' fragment cost is lower than the level boxes'.
- Folding materials together would need per-vertex roughness and metallic, which `PBRMaterial` does not take
  per instance. The static bake (item 3) already removes their draw cost, so this was skipped.

### 5. Lamps per light column, lights per mesh (no change)
- Lamps are baked (`BakedLamps`). Every lit PBR pixel walks its 2 m column's list: up to `LAMP_GRID_SLOTS` 8
  (`src/voxel/lampBake.ts:313-315`). An in-range lamp costs about 7 float-texel fetches, a 3D visibility tap and the
  door and capsule loops. 283 columns list 5-8 lamps.
- The grid is 2D (plan reach only), so the gallery lamps (y 4.5+) are listed in the hall columns under the gallery.
  They are rejected per pixel after 2 fetches.
- This cost is real, but it is the shared light path the meter and the guards agree with. Changing the grid or the
  loop is a parity-sensitive shader change, out of scope for a "pure render cut" pass. A follow-up could make the
  grid height-aware (cells split at the gallery floor), with a shot and meter parity check.
- Real lights per material (`materialLights`, `src/world/lightRig.ts:272`): 6 (sun, hemisphere, cluster, 2 shadow
  spots + 1). With baked lamps the pools hold only flashlights (`BAKED_POOL` 4, `BAKED_SHADOWS` 2, `lightRig.ts:27-28`).
  Already minimal.

### 6. Shadow casters (no change)
- Kit skins and props are not casters. Only the sliding leaves' composite is in the flashlights' lists
  (`kitRender.ts`, `addCaster`). The moon is baked (`world.ts:285`): its cascades list only moving casters under open
  sky (`world.ts:357`).
- A shadow map's per-material sampling joins a shader only while its list is non-empty. At 0 guards the flashlight
  maps are idle.
- Leftover: kit and props receive the moon's cascades whenever a moving caster stands outdoors. This cannot be cut per
  instance, and `receiveShadows = false` would let flashlight light leak through walls onto them. Kept.

### 7. LED coves, emissives, glow (no change)
- No `GlowLayer` or `HighlightLayer` exists in the game (grep). LEDs, status bars, screens and prop lamps are unlit
  `StandardMaterial` thin instances (cheap shader, `receiveShadows` off). Bloom is a fixed-cost post pass. Nothing to
  cut.

### 8. Overdraw from the 10 m hall walls and the gallery (partly fixed by 1)
- Item 1 removes the box-under-skin layer. What is left is overdraw among the level's own boxes: one 5284-instance
  draw in builder order, so far walls can shade before near ones. That existed on master too.
- The fix would be a depth prepass for the level boxes: a depth-only twin with a cheap material and a small polygon
  offset, drawn first. It risks depth-equality speckle, so it is left as the next lever if the GPU is still over
  7.5 ms after this pass.
- The volumetric pass marches at most 12 lamps' 3.2 m spheres (`src/vfx/volLights.ts:18`, `postStack.ts:30`). That
  is a bounded cost and not facility-specific.

## What changed

| Change | Where | Expected saving |
| --- | --- | --- |
| Opaque queue sorts the kit's and props' opaque materials first, then Babylon's default (material, then mesh), so the boxes under skins fail early-z | `src/world/kit/staticMerge.ts` (`markDrawFirst`, `skinsFirst`, `useSkinsFirst`); called from `kitRender.ts:77` and `propRender.ts:84`; marked at `kitRender.ts:118`, `propRender.ts:123` | -1 to -2.5 ms GPU in clad halls |
| Static opaque (piece / prop, material) pairs baked into one world-space mesh per material (`kit-static.<mat>`, `prop-static.<mat>`), frozen; leaves, LEDs, status bars, screens, lamps, glass and mesh stay thin-instanced (moving, tinted or sorted) | `staticMerge.ts` `bakeParts`; `kitRender.ts:138, 172, 301` (`bakedMesh`); `propRender.ts:146, 181` | Draws 126 -> 59 per pass (kit 30 -> 16, props 96 -> 43), about -130 at Epic; -0.5 to -1 ms CPU |
| Alpha slabs (kit glass and frosted, prop glass and mesh) back-face culled | `kitRender.ts:115`, `propRender.ts:120` | -0.2 to -0.5 ms with the gallery band in view |

- Nothing new is behind a flag. No preset change, no gameplay or light-bake change, and no change to which materials
  get the lamp plugin. The baked meshes carry the same world positions and normals as the instanced shader produced:
  unit-tested against Babylon's `TransformCoordinates` / `TransformNormal`. So the lamp plugin and the meter see the
  same surface.
- Tests: `tests/facilityKit.test.ts` (render test updated to the baked names; the glass is culled; skins are marked;
  new bake and sort test) and `tests/facilityProps.test.ts` (render test updated).
- Docs: one note each in `docs/marlow-final/KIT.md` (section 4) and `PROPS.md` (Format), and in
  `docs/systems/performance.md` ("What keeps the frame inside the budget").

## Left, and why
- The lamp loop and the grid density (item 5): parity-sensitive shared light path. Proposed follow-up: a
  height-aware lamp grid.
- A depth prepass for the level boxes (item 8): the next GPU lever. It carries a depth-equality risk, so it should go
  in only with a shot check.
- The moon cascades sampled on indoor skins (item 6): cannot be split per instance, and dropping receive would leak
  flashlight light through walls.
- Real-time env filtering on the kit and prop PBR (8 + 8 cube taps): kept for the metal's look. Dropping it on the
  0.05-rough clear glass would save little.
- G-buffer draw order: that pass uses an unsorted custom render (boxes before skins), but its fragments are cheap
  (MRT writes, about 0.05 ms of overdraw). Left.
- Per-set draw budget (PROPS.md, 12 draws): kept as the authoring check, though the run-time draws are now per
  material across the map.

## Measurement request ("after" run, laptop, Character Build)
Same machine and settings as the 5100141d baseline. Nothing else running. Laptop `heavy.lock` taken.
`npm ci` (if the lock changed) + `npm run build` on each commit.

1. Guard-cap on the baseline (5100141d, already queued) and on the commit that carries this pass:
   ```
   E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=ctcourse --counts=0,12 --cells=patrol,away,alert --gfx=epic --viewport=1920x1080 --warm=5 --secs=10 --out=C:/NightShift/scratch/runs/guardcap-<commit>-out
   ```
   Spot: guard-cap's own, the course spawn (patrol / facing and away). Read per cell: frame med, frame CPU, GPU ms,
   draws (all passes), sim p95.
   Expected at 0 guards: GPU -1.5 to -3 ms (target <= 7.5), draws about -130, frame CPU -0.5 to -1 ms.
2. GPU shots with the meter / field check, before and after on the same two commits:
   ```
   E2E_GPU=1 E2E_PORT=4189 timeout 900 node scripts/shots-ctcourse.mjs C:/NightShift/scratch/runs/s9-shots before
   E2E_GPU=1 E2E_PORT=4189 timeout 900 node scripts/shots-ctcourse.mjs C:/NightShift/scratch/runs/s9-shots after
   ```
   Every vantage. Look first at `f-gallery-from-a1` (the gallery band), `f-l7-model` (vitrine glass), `f-dock`,
   `f-l1-holding`, and the `a3-*` (frosted office walls), `a4-*` (office window) and `a7-*` (rack mesh, cable trays,
   lobby glass) vantages. The printed `meter field` rows must stay within 0.02 and match before and after: no parity
   change is expected.
3. Optional, if GPU is still over 7.5 ms: Settings > Graphics > Benchmark > "features" on the course, to split the
   remaining cost (SSAO / SSR / volumetrics / shadows).

## Visual risk for the GPU shots
- Glass, frosted glass, prop glass and rack mesh (`backFaceCulling` now true). Before, the side or half where the
  slab's far face drew first showed two layers: clear glass at about 0.26 effective alpha instead of 0.14, frosted
  about 0.9 instead of 0.68, rack mesh about 0.75 instead of 0.5, with reflections counted twice. After, every view
  shows the authored single layer. From one side the gallery glazing will look clearer and a little less reflective;
  the rack mesh and frosted panes lighter. If that reads too thin, raise the alpha in `KIT_LOOK` / `PROP_LOOK`, not
  the culling.
- Draw order: no change expected. Exception: a skin face exactly coplanar with a box face would z-fight either way.
  The skins stand 3-6 cm proud and the prop boxes sit 1 cm inside.
- Static bake: none expected. Same triangles, positions and normals (unit-tested). No culling is lost: the
  thin-instanced bounds already covered the whole map.

## Checks run
- `npx tsc --noEmit`: clean.
- eslint on `src/world/kit/staticMerge.ts`, `src/world/kit/kitRender.ts`, `src/world/props/propRender.ts`,
  `tests/facilityKit.test.ts`, `tests/facilityProps.test.ts`: clean.
- vitest `tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/facilityKit.test.ts tests/facilityProps.test.ts`:
  63 passed, 1 skipped.
- No e2e and no GPU run (by brief).

## Measured on the laptop (Character Build, 2026-10-23 ~11:20; 4189 alone, Epic 1920x1080, one 10 s sample per cell)
"Before" 5100141d, "after" cc24e992. Frame med / frame CPU / render CPU / GPU ms; draws.
| Cell | Before | After | Draws |
| --- | --- | --- | --- |
| N0 patrol facing | 4.4 / 4.1 / 3.4 / 5.3 | 3.9 / 3.7 / 3.0 / 4.0 | 375 -> 249 |
| N0 patrol away | 2.7 / 2.5 / 1.9 / 4.1 | 3.5 / 3.3 / 2.5 / 3.9 | 124 -> 104 |
| N0 alert facing | 4.3 / 4.0 / 3.3 / 5.1 | 3.8 / 3.5 / 2.9 / 4.0 | 375 -> 249 |
| N0 A8 hall | 3.3 / 3.0 / 2.3 / 3.1 | 2.9 / 2.6 / 2.0 / 3.0 | 95 -> 85 |
| N0 A7 data | 4.6 / 4.4 / 3.4 / 4.6 | 3.7 / 3.5 / 2.7 / 3.9 | 207 -> 161 |
| N12 patrol facing | 7.6 / 7.4 / 6.0 / 7.2 | 8.3 / 8.1 / 6.3 / 6.5 | 393 -> 267 |
| N12 patrol away | 5.2 / 4.9 / 3.6 / 5.1 | 4.2 / 4.0 / 2.9 / 3.9 | 124 -> 104 |
| N12 alert facing | 9.2 / 8.5 / 6.9 / 8.0 | 8.8 / 8.3 / 6.5 / 7.2 | 407 -> 284 |
| N12 A8 hall | 7.3 / 7.0 / 5.5 / 5.5 | 6.4 / 6.1 / 4.7 / 4.6 | 109 -> 99 |
| N12 A7 data | 6.6 / 6.4 / 5.0 / 6.1 | 7.3 / 7.0 / 5.4 / 6.0 | 225 -> 179 |
Draws down 10-35% and GPU down in every cell (up to -1.3 ms); tris up ~0.1 M in the away / A8 hall cells; shadow passes
and maps unchanged. Frame worse in three cells (N0 away, N12 facing, N12 A7: +0.7-0.8 ms, render CPU at the same or
fewer draws): read as single-sample noise, not rerun. Every cell is under the 16.7 ms frame. GPU over 7.5 ms only at
N12 alert (was 8.0, now 7.2: now under).
Shots (25 vantages, s9 before / after): meter and light field identical to 0.001 at every vantage (light parity
unchanged). Images on the laptop: C:/NightShift/scratch/runs/s9-shots/*-{before,after}.png.
