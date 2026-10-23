# Guard models: plan

Planned on master 41204e30 (4.80.0). File:line refs are on that commit. Budget numbers are guard-render's
(`docs/guard-render/STATE.md` "M1 result", `docs/guard-render/run-s1/REPORT.md`, laptop RTX 4090, Epic 1920x1080).
Brief, limits and assumed decisions A1-A11: `BRIEF.md`.

## 1. Where we start
- A guard today: `buildEnemyRig` (`src/ai/enemyRig.ts:14-30`) builds a `CharacterRig` with `merge: true`, so the ~50
  instanced parts become one rigidly skinned `SmoothBody` (guard-render S1, `src/player/smoothBody.ts`): one bone per
  joint node, hi LOD 6250 vertices / 36900 indices (~12.3 k tris), lo 2628 / 15168 (~5.1 k tris), GPU buffers shared
  per look (S7: 1.06 MB per look + 0.28 MB per guard), fixed root-local bounding box for culling. The gun is its own
  mesh. Carried / fresh bodies (`src/ai/body.ts:15`) and co-op puppets (`src/net/enemyPuppet.ts:115`) use the same rig.
- Gear gameplay exists (guard-ai S9 / S12 / S13): `Enemy.helmet` / `Enemy.armour` (`src/ai/enemy.ts:580-640`),
  `GEAR_BY_STAGE` and `RESPONSE` (`src/ai/gear.ts:28-37`), wire bits `AL_HELMET` / `AL_ARMOUR`
  (`src/net/protocol.ts:97-128`, protocol 41), placeholder parts in `src/ai/gearParts.ts` (helmet box on the head
  node, armour plates, the enforcer's shield on the root), the dropped helmet pool `src/ai/helmetDrops.ts:40`.
  This job replaces only what is drawn.
- Wren's pipeline (`scripts/operators/README.md`): MPFB2 CC0 base body (`py/mh.py`, `py/build_body.py`) rigged on the
  game joints (`export-joints.mjs` from `src/operators/operatorBody.ts` and `src/player/proportions.ts`), garments
  (`py/garments/*.py`: `combat_shirt`, `trousers`, `gloves`, `boots`, `headwear` exist), rigid kit (`py/rigid_skin.py`,
  `src/operators/rigidKit.ts`), `py/bake_lods.py` (decimate chain, atlases, GPU bake), `ktx2.mjs` (UASTC + Zstd),
  `operators:check`. Wren: LOD0 40 k / LOD1 13.5 k / LOD2 5.6 k tris, VRAM 32 / 8 / 4 MB, 19 skin joints + T3
  (clavicles, fingers). Full Wren chain: build ~25 min, LODs ~11-20 min, check ~55 min (desktop, Blender 5.2.2).
- Wren's runtime (`src/operators/runtime/figure.ts`): `OperatorLibrary` (per scene: geometry, bone order, materials
  shared), `OperatorFigure` (own skeleton per LOD, bones linked to TransformNodes posed by `OperatorPoser`, the
  non-allocating retarget over the rig's 23 `RIG_JOINTS`, `pose.ts:23-31`), LOD pick (`lodPick.ts`), `setHeat`.
  It uses `alwaysSelectAsActiveMesh` (`figure.ts:565`): no culling, fine for 2 players, not for 24 guards.

## 2. Shape of the solution
- Offline: three male bases (A2) x one uniform outfit (+ officer jacket on `average`) + a shared gear kit, baked per
  base into three LOD GLBs. Each LOD is ONE skinned mesh with ONE material (one atlas: body, clothes, gear), a static
  per-vertex piece id (`_PIECE`) and tint slot (`_TINT`). The riot shield is its own small GLB (rigid, 3 LODs).
- Runtime: `GuardFigure` over the existing rig (reusing `OperatorLibrary` / `OperatorPoser`), S1's fixed bounding box
  and S7's shared GPU buffers per (base, LOD) per scene; per guard only a skeleton and one vertex buffer per LOD
  (`gvis`: rgb tint, a = piece visible; flash writes it like `SmoothBody.setFlash`).
- Variation: a pure function of (wire id, kind, map id) picks base-compatible headwear, eyewear, small kit, skin tone,
  colour jitter (A4); gameplay gear overrides it (A5). Both co-op screens compute the same.

## 3. Slices
Times are wall clock for one slice with its checker. "Blender" = desktop, under `C:/NightShift/heavy.lock`, one run at a
time (Blender 5.2.2, MPFB2 zip and KTX-Software are installed there only, assumed).

### G0. Guard spec and kit data (no code)
- `docs/guard-models/SPEC.md`: the archetype matrix (section 4), piece list with original designs and generic ids,
  per-piece triangle and texel budgets (section 5), bone list, tint slots, IP check list.
- `scripts/operators/data/guards.json` (or `.ts` beside `src/operators/kit.ts`): bases (height, build, MakeHuman macro
  targets: male, muscle, weight), outfit per kind, pieces (bone, fit, LOD budgets), validated by a pure
  `validateGuardKit` in `src/operators/guards/guardKit.ts` + Vitest.
- Model: Opus writes SPEC; Sonnet writes the data file and validator from it. ~1 h.

### G1. Base bodies (Blender)
- `py/build_body.py` takes a guard base from the kit data: male macro targets, larger build than Wren (shoulder and
  chest girth up, neck thicker), rigged on the game joints from `export-joints.mjs` for the base's (height, build),
  4 influences, A-pose bind (D13), so `OperatorPoser` drives it exactly like Wren and every clip, the mocap set, IK and
  the guard tuner (`rig.guardRows`) apply unchanged.
- Faces (A1): MakeHuman male head, eyes kept as mesh, hair as a short buzz in the albedo, no hair cards; skin is a tint
  slot (four tones). Ten finger bones (one per finger, curl only) at LOD0, folded into the wrist at LOD1 / LOD2.
- Output `build/operators/guard-<base>/guard-<base>-body.{blend,json}` with measurements against targets.
- Checks: round-trip joints < 0.1 mm (`build_skeleton.py`), `operators:check` body checks, hit volumes untouched.
- Model: Opus (Blender script). ~2.5 h (impl 1.5 h, Blender 3 x ~15 min, checker).

### G2. Uniform garments (Blender)  [parallel with G3]
- Reuse `combat_shirt.py`, `trousers.py`, `boots.py`, `gloves.py` drafted from each base's measurements: shirt
  (sleeves down; a rolled-sleeve option on `lean`), cargo trousers, boots, gloves. Officer: a short field jacket over
  the shirt on `average`. Runner (A11): the work variant (no faction tint on the jacket slot).
- Detail standard light (prototype): seams and pockets that read at 8 m; no close-up detail pass.
- Model: Opus. ~3.5 h (cloth chain ~25 min per base, 3 bases + jacket, serial Blender).

### G3. Gear kit (Blender, rigid)  [parallel with G2; shares the Blender lock]
Original designs, generic ids, every piece on the rigid-kit path (`rigid_skin.py`, one weight vector, declared bones):
- Headwear (variation): `cap` (soft peaked cap), `beanie`, `balaclava` (heavies / enforcers, A1), `headset` (droneOp),
  `boonie` (sniper). Eyewear: `glasses_clear`, `glasses_dark`.
- `helmet_std`: a rounded shell with side rails and a rear pad, fitted over the bare head of each base (one mesh, a
  per-base fit scale); it is also the `HelmetDrops` mesh (A6). `helmet_heavy`: the same shell with a raised clear
  visor (heavy, enforcer).
- `vest_soft`: a slim carrier with front / back panels and side straps (alarm-stage armour, `Enemy.armour`).
  `plate_heavy`: a thick plate carrier with shoulder and collar guards and front pouches (`def.plated`, heavy kind).
  Each is fitted per base (`compress` the shirt under it, torso_common).
- `shield_riot`: a curved polymer shield with a small view port and two handles, no text or insignia, held on the left
  forearm (`wristL` + `elbowL` rigid), its own GLB.
- Small kit (variation): `radio` (chest or shoulder), `pouch_belt`, `holster_thigh` (already a carry slot: the pistol
  rides it, `weaponModel.holster`), `flashlight_mount` (matches the existing torch carry).
- Model: Opus. ~3 h.

### G4. Bake, LODs, export and the review sheet (Blender + laptop GPU sheet)
- `bake_lods.py` guard mode: per base, the body + outfit + every piece decimated and atlased into one skinned mesh per
  LOD, one material (albedo with tint mask, normal, ORM), `_PIECE` and `_TINT` vertex attributes, KTX2 (UASTC + Zstd).
  Budgets (section 5) enforced by `operators:check` (`guardBudget`: tris per LOD with all pieces on, bones, texture
  size, KTX2 only). `shield_riot` as its own 3-LOD GLB. Files to `src/operators/assets/guards/`.
- A variety contact sheet (`operators:sheet` guard mode, laptop `E2E_GPU=1`, port 4189): the three bases, every kind's
  outfit, gear on / off, helmet knocked off, LOD strip with counts, Hollowmere night and night vision. Published for
  Michael (A9, non-blocking).
- Model: Opus (bake), Sonnet (sheet wiring). ~3 h (Blender ~1 h for 3 bases).

### G5. GuardFigure runtime  [starts with G0; uses Wren's LOD files as a stand-in until G4]
- `src/operators/runtime/guardFigure.ts` (Babylon) on `OperatorLibrary` / `OperatorPoser`:
  - LOD0 / LOD1 / LOD2 by camera distance (`lodPick.ts`, A8), LOD2 loaded first; no hero, no goggle.
  - S1's fixed root-local `BoundingInfo` (rest box + margins) instead of `alwaysSelectAsActiveMesh`, so camera and
    cascade culling work; a ragdoll (re-parented joints) falls back to always-active as `SmoothBody` does.
  - Ragdoll / carried pose: the poser reads local TRS; a re-parented joint breaks that chain, so a world-matrix path
    (bone = node absolute x inverse bind) takes over while any joint is re-parented (no allocation).
  - S7-style sharing: static vertex and index buffers per (base, LOD) per scene; per guard a skeleton and the `gvis`
    buffer (rgba per vertex: tint rgb for the vertex's slot, a = piece visible), rewritten only on a gear, tint or
    flash change. A material plugin (like `smoothBodyPlugin.ts`) multiplies albedo by the tint where the mask is set
    and collapses hidden pieces (position x a, degenerate triangles).
  - `setFlash`, `setHeat` (thermal), night vision unchanged (same PBR family), shadow casters = the shown LOD mesh.
  - `GuardAnimTier` (`src/ai/enemy.ts:426`) watches the figure's mesh instead of `rig.voxel?.meshes[0]`.
- Pure: `src/operators/guards/gearMask.ts` (piece set -> per-vertex visibility, tint fill) + Vitest.
- Model: Opus. ~4 h.

### G6. Variation  [parallel with G1-G5]
- `src/operators/guards/guardVariant.ts` (pure): `guardVariant(id, kind, mapId, out)` -> base, skin tone, headwear,
  eyewear, small kit, colour jitter; archetype rules (section 4); `applyGear(variant, helmet, armour, plated, out)`
  -> the visible piece set (A5: helmet replaces headwear, balaclava stays; plated -> `plate_heavy`; armour ->
  `vest_soft`). Deterministic integer hash (no `Math.random`), no allocation on the gear path.
- Tests: same input -> same output; distribution over 1000 ids (no single combo above 15% within a kind); archetype
  rules hold; host id and client wire id give the same result.
- Model: Sonnet from an Opus brief. ~1.5 h.

### G7. Integration
- `src/ai/enemyRig.ts`: build the `GuardFigure` over the rig (`flags.guardModels`, `?guardmodels=0` keeps the S1 body,
  A10); the merged body stays until the figure's first LOD is ready, then disables (no invisible guard on a slow load).
- `src/ai/enemy.ts` gear sync (580-640) and `src/net/enemyPuppet.ts` gear (144-170) set pieces on the figure instead of
  building `gearParts` placeholders; `src/ai/gearParts.ts` keeps the placeholder builders for `?guardmodels=0`.
- `src/ai/helmetDrops.ts`: the dropped helmet uses `helmet_std` LOD1 geometry (A6).
- Enforcer: `shield_riot` GLB on the left forearm instead of `buildShieldPart` (`gearParts.ts:63`).
- `src/ai/body.ts`: carried and fresh bodies keep the guard's variant (same id) and figure.
- Assets: Vite `?url` imports, the service worker's `operators` cache (CacheFirst), `warmPlayLods` covers the guard
  LODs (LOD2 first); level load awaits LOD2 of every base the map's guards use.
- `src/core/flags.ts`: `guardModels`. Owners: Guard AI Build (`src/ai`), CT Core (`src/operators/runtime` shares, the
  rig untouched), net (`enemyPuppet.ts` gear lines only, no protocol change).
- Model: Opus. ~3 h.

### G8. Budget measurement and look check (laptop GPU, alone)
- `E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=sectorops,ctcourse,campusops --counts=0,12,24
  --cells=patrol,away,alert --out=docs/guard-models/run-g8-on`, then the same with `?guardmodels=0` to `run-g8-off`.
  Compare against section 6; fill the table in STATE.md.
- Look check (`docs/guard-render/look-shot.js` adapted): one guard at 3 m, 8 m, 25 m; thermal, night vision; helmet
  on / knocked off; vest; plate; shield; the 24-guard line-up for variety.
- Model: Sonnet runs (Test Runner session), Opus reads the numbers. ~2 h (laptop queue).

### G9. Tests, docs, PR
- Vitest: `guardKit.test.ts`, `guardVariant.test.ts`, `gearMask.test.ts`, `guardFigure.test.ts` (NullEngine: shared
  buffers per (base, LOD), gear toggle hides exactly the piece's vertices, culling box, ragdoll world path matches
  node positions < 1e-4 m, flash / heat, dispose), `guardAssets.test.ts` (reads the bundled GLBs: tris per LOD, bone
  count, KTX2 only, texture bytes within section 5).
- e2e (laptop, GPU): `e2e-enemies`, `e2e-combat` (helmet knock-off drop, vest stagger, ragdoll), `e2e-takedown` and
  `e2e-stealth` (bodies carried), `e2e-guard-carry`, `e2e-sectorops`, `e2e-ctcourse`, `e2e-coop` (new assert: a
  guard's variant and visible pieces are equal on host and client, helmet bit drop on both), `e2e-offline` (guard LODs
  served from the cache). Then the train's full run.
- GPU sheets on the laptop: G4's variety sheet, G8's look check.
- Docs: `docs/systems/world-and-characters.md` (guards section), `docs/systems/performance.md` (guard figure budget
  line), `docs/art-credits.md` (MPFB2 now also shapes the guards), `TESTING.md` (desktop checklist: guard variety,
  helmet knock-off), changelog fragment `changes/feature-guard-models.md`.
- Model: Sonnet (tests, docs); Opus checker. ~2 h.

## 4. Archetype matrix (visible pieces; A1, A5, A11)
| Kind | Base | Outfit | Headwear (variation) | Fixed gear | Gameplay gear |
| --- | --- | --- | --- | --- | --- |
| grunt | average | uniform | cap / beanie / bare | radio, torch mount | helmet_std, vest_soft by alarm stage |
| runner | lean | work variant (A11) | beanie / bare | - | helmet_std, vest_soft by stage |
| heavy | broad | uniform | balaclava | plate_heavy (`plated`), helmet_heavy | - (always armoured) |
| sniper | lean | uniform, rolled sleeves | boonie / cap | glasses_dark | vest_soft by stage |
| enforcer | broad | uniform | balaclava | helmet_heavy, vest_soft, shield_riot | - |
| droneOp | average | uniform | headset + cap / bare | pouch_belt | helmet_std, vest_soft by stage |
| officer | average | uniform + jacket | cap (peaked, original) | radio | vest_soft by stage |
| dog | own model | - | - | - | - |

## 5. Per-guard budgets (targets the checks enforce)
| | LOD0 (< 8 m) | LOD1 (8-25 m) | LOD2 (> 25 m) |
| --- | --- | --- | --- |
| Triangles, body + every piece shown | <= 16,000 | <= 6,000 | <= 2,500 |
| Draws per pass | 1 (+1 shield, + gun) | 1 | 1 |
| Bones | 33 (23 rig joints + 10 fingers) | 23 | 23 |
| Influences | 4 | 4 | 2 |
| Atlas (albedo + normal + ORM, BC7 with mips) | 2K: 16.8 MB | 1K: 4.2 MB | 512: 1.1 MB |
- Per base ~22 MB VRAM, three bases ~66 MB, the shield ~2 MB: ~70 MB in a scene with every base (Wren's play LODs:
  44 MB). Download (KTX2 UASTC + Zstd) <= 45 MB for all guard files (Wren's play LODs 26 MB at 40 k tris).
- Per-guard buffers: `gvis` 16 B a vertex (~9 k vertices LOD0 + ~3.5 k LOD1 + ~1.5 k LOD2) ~225 KB; skeleton 33 x 64 B
  bone texture upload per posed frame (2.1 KB). Static buffers shared per (base, LOD) per scene.
- Pieces: headwear <= 600 tris LOD0, helmet <= 1,200, vest <= 1,800, plate <= 2,600, shield <= 800 (in the 16 k total).

## 6. Budget fit against guard-render S1 at 24 guards
Baseline on master (M1, 4.75.0): sectorops 24 patrol / alert facing: frame CPU p95 13.9 / 15.9 ms, GPU p95 8.6 /
10.1 ms, draws 239 / 300; ctcourse 12.7 / 13.2, 7.1 / 7.7, 167 / 183; campusOps 17.8 / 19.7, 11.4 / 11.6, 541 / 589.
Targets: GPU p95 <= 15 ms, frame CPU p95 <= 12 ms (already missed at 24 facing; on the polish list), draws <= 600,
triangles <= 8 M per frame over all passes (`docs/systems/performance.md:13-22`).
- Draws: unchanged. One skinned mesh per guard per pass, as S1 (A3), plus the gun, plus 1 per shield (<= 3 enforcers
  in a response team). CampusOps stays at ~589-595 of 600. Separate gear meshes would add up to 2 x 24 x ~2.5 passes
  = ~120 draws there and break the cap: that is why A3 merges them.
- Triangles: today hi ~12.3 k / lo ~5.1 k. Worst case 24 guards all inside 8 m at LOD0 with gear: 24 x 16 k x ~4
  passes = 1.5 M; a typical spread (4 near, 12 mid, 8 far) ~0.6 M. Inside 8 M.
- GPU: 4-influence skinning over ~30% more near triangles than the rigid S1 body. Estimate +0.5 to +1.5 ms at 24
  facing (S1 measured +0.08-0.10 ms GPU per added guard): sectorops alert ~11.5, campusOps ~13. Inside 15 ms.
- CPU: the S1 body already pays one skeleton per guard (~29 bones); the figure's is 23-33 bones, so the bone work is
  about equal. New: `OperatorPoser.solve` per posed guard, target <= 0.01 ms (24 guards 0.24 ms, fewer with S4's
  off-screen / far anim tiers). Culling as S1 (fixed box). Gate: frame CPU p95 at 24 within +0.5 ms of `run-g8-off`.
  If the poser misses: bind the guard bases in the rig's rest pose and link bones straight to the rig nodes (no
  retarget; the SmoothBody path) as G5's fallback.
- VRAM +~70 MB of the 12 GB Epic line; download +<= 45 MB (cached by the service worker like Wren).
- Verdict: fits on GPU, draws and triangles with margin; frame CPU is neutral by design and is measured in G8.

## 7. Order, parallel groups and estimate
| Group | Slices (parallel inside a group) | Wall | Models |
| --- | --- | --- | --- |
| P1 | G0 spec + data; G5 runtime starts on Wren stand-in; G6 variation | 1 h (G5 / G6 run on) | Opus G0, G5; Sonnet G6 |
| P2 | G1 base bodies (Blender) | 2.5 h | Opus |
| P3 | G2 garments and G3 gear kit (share the Blender lock) | 4 h | Opus |
| P4 | G4 bake, LODs, export, sheet | 3 h | Opus bake, Sonnet sheet |
| P5 | G7 integration (G5, G6 done by now) | 3 h | Opus |
| P6 | G8 measure + look; G9 tests and docs alongside | 2.5 h | Sonnet runs and tests, Opus checker |
- Per slice: G0 1 h, G1 2.5 h, G2 3.5 h, G3 3 h, G4 3 h, G5 4 h, G6 1.5 h, G7 3 h, G8 2 h, G9 2 h (~25 agent-hours).
- Wall: ~16 h on the critical path (G0 -> G1 -> G2 / G3 -> G4 -> G7 -> G8 / G9), about 3-4 usage windows at full
  burn, plus the laptop queue for G8 and the train. Blender on the desktop is the bottleneck (serial, ~3.5 h of runs).
- Checkers: one fresh Opus checker per group for P2-P5 (Blender, rig, render code); Sonnet checks G6 and G9.
- One PR to master at the end; G4's sheet goes to Michael as soon as it exists (A9).

## 8. Risks
- Retarget on a larger body: clavicle and shoulder clipping with the rifle carry (`weaponMount` / sling offsets were
  set for Wren). G7 checks the S21 carry poses on each base in the look sheet; offsets per base in the kit data.
- Ragdolls and carried bodies with the local-TRS poser (handled by G5's world path; tested).
- First-draw shader compile of the new plugin variant can hide a guard for a few frames (guard-render S1 note;
  `bodyEffectRecovery.ts` covers stalls): warm the variant on the loading screen.
- Desktop Blender time competes with other heavy runs: book the lock per bake, not per slice.
- Faces at close range may read uncanny (A1); balaclava-for-all is a one-line undo.

## 9. Open questions for Michael (assumed meanwhile; native multiple choice when asked)
1. Faces: visible low-detail faces on most kinds, balaclavas on heavy / enforcer (A1), or masks / balaclavas on all?
2. Look review: a non-blocking contact sheet after the bake (A9), or stop for approval before integration?
3. Stable looks across section restarts (needs a protocol bump, A4), or may a restarted guard look different?
