# Guard models: plan

Planned on master 41204e30 (4.80.0). File:line refs are on that commit. Budget numbers are guard-render's
(`docs/guard-render/STATE.md` "M1 result", `docs/guard-render/run-s1/REPORT.md`, laptop RTX 4090, Epic 1920x1080).
Brief, limits, Michael's answers M1-M3 and assumed decisions A2-A15: `BRIEF.md`.
Re-budget 2026-10-23 ~20:00 for M1 (mid-detail faces), M2 (fix pass G10), M3 (look seed on the wire, G6n) and laptop
bakes (A12, slices GB and L0).

## 1. Where we start
- A guard today: `buildEnemyRig` (`src/ai/enemyRig.ts:14-30`) builds a `CharacterRig` with `merge: true`, so the ~50
  instanced parts become one rigidly skinned `SmoothBody` (guard-render S1, `src/player/smoothBody.ts`): one bone per
  joint node, hi LOD 6250 vertices / 36900 indices (~12.3 k tris), lo 2628 / 15168 (~5.1 k tris), GPU buffers shared
  per look (S7: 1.06 MB per look + 0.28 MB per guard), fixed root-local bounding box for culling. The gun is its own
  mesh. Carried / fresh bodies (`src/ai/body.ts:15`) and co-op puppets (`src/net/enemyPuppet.ts:115`) use the same rig.
- Gear gameplay exists (guard-ai S9 / S12 / S13): `Enemy.helmet` / `Enemy.armour` (`src/ai/enemy.ts:580-640`),
  `GEAR_BY_STAGE` and `RESPONSE` (`src/ai/gear.ts:28-37`), wire bits `AL_HELMET` / `AL_ARMOUR`
  (`src/net/protocol.ts:97-128`, `packAlert` :127, `AL_MAX` 511 :122, parsed at :337), placeholder parts in
  `src/ai/gearParts.ts` (helmet box on the head node, armour plates, the enforcer's shield on the root), the dropped
  helmet pool `src/ai/helmetDrops.ts:40`. This job replaces only what is drawn, plus the look seed (M3).
- Guard identity: `Enemy.num` is a global counter (`src/ai/enemy.ts:196`, id `e<num>` :202), so a section restart
  renumbers guards; that is why M3 needs a seed of its own.
- Wren's pipeline (`scripts/operators/README.md`): MPFB2 CC0 base body (`py/mh.py`, `py/build_body.py`) rigged on the
  game joints (`export-joints.mjs` from `src/operators/operatorBody.ts` and `src/player/proportions.ts`), garments
  (`py/garments/*.py`: `combat_shirt`, `trousers`, `gloves`, `boots`, `headwear`, `head_common`, `armour`, `carrier`
  exist), rigid kit (`py/rigid_skin.py`, `src/operators/rigidKit.ts`), procedural materials (`py/materials.py`),
  `py/bake_lods.py` (decimate chain, atlases, GPU bake), `ktx2.mjs` (UASTC + Zstd), `operators:check`. Wren: LOD0
  40 k / LOD1 13.5 k / LOD2 5.6 k tris, VRAM 32 / 8 / 4 MB. Full Wren chain on the desktop, serial: build ~25 min, LODs
  ~11-20 min, check ~55 min (Blender 5.2.2).
- Wren's runtime (`src/operators/runtime/figure.ts`): `OperatorLibrary` (per scene: geometry, bone order, materials
  shared), `OperatorFigure` (own skeleton per LOD, bones linked to TransformNodes posed by `OperatorPoser`, the
  non-allocating retarget over the rig's 23 `RIG_JOINTS`, `pose.ts:23-31`), LOD pick (`lodPick.ts`), `setHeat`.
  It uses `alwaysSelectAsActiveMesh` (`figure.ts:565`): no culling, fine for 2 players, not for 24 guards.
- Laptop queue (origin/feature/laptop-queue, live on the laptop since ~19:19, not merged yet;
  `docs/systems/testing-tools.md` "Laptop queue" on that branch): `request.mjs --alone --step "<cmd>" [--env K=V]`
  pushes `requests/<id>.json` to the `laptop-queue` branch; the service runs each step in a slot worktree detached at
  the sha (cleaned with `git clean -fdq` first, `npm run build` before), 1 h timeout per step, both slots held, trains
  first, an alone request over 45 min old goes ahead of pr work; verdict = commit status `laptop-e2e/alone-<set>`.

## 2. Shape of the solution
- Offline (laptop): three male bases (A2) x one uniform outfit (+ officer jacket on `average`) + head variants, eyes
  and hair caps (M1) + a shared gear kit, baked per base into three LOD GLBs. Each LOD is ONE skinned mesh with ONE
  material (one atlas: body, clothes, faces, gear), a static per-vertex piece id (`_PIECE`) and tint slot (`_TINT`).
  The riot shield is its own small GLB (rigid, 3 LODs).
- Runtime: `GuardFigure` over the existing rig (reusing `OperatorLibrary` / `OperatorPoser`), S1's fixed bounding box
  and S7's shared GPU buffers per (base, LOD) per scene; per guard only a skeleton and one RGBA8 vertex buffer per LOD
  (`gvis`: rgb tint, a = piece visible; flash writes it like `SmoothBody.setFlash`). The head variant and hair cap are
  pieces like the gear, so a face costs no draw.
- Variation (M3): the host gives each guard a 7-bit look seed derived from the section's spawn slot (stable across a
  restart) and sends it in the enemy `al` bits; a pure function of (seed, kind, map id) picks head variant, skin tone,
  hair cap and colour, headwear, eyewear, small kit, colour jitter; gameplay gear overrides it (A5). Both co-op screens
  compute the same.

## 3. Slices
Times are wall clock for one slice with its checker. "Laptop bake" = an `--alone` laptop-queue request running the GB
driver (parallel `blender -b` jobs); no Blender on the desktop (A12). Each slice books its own bake request as soon
as its scripts are pushed; a slice's bake is one request with one step per stage (each step under the 1 h timeout).

### L0. Laptop bake tools  [P1; Test Runner, no code]
- Probe: `request.mjs --alone --set guard-bake-probe --step "node scripts/operators/guard-bake.mjs --probe"` (prints
  Blender, KTX and MPFB2 zip paths and versions, renders nothing).
- If anything is missing: the orchestrator asks Michael once (native multiple choice) to copy Blender 5.2.2, the MPFB2
  zip (`C:/NightShift/downloads/mpfb2-2.0.18/`, the copy already on the desktop) and KTX-Software to the laptop;
  Test Runner installs on his yes. Until then GB's desktop fallback applies (A12).
- ~0.5 h of Test Runner time, off the critical path (needed before G1's first bake).

### GB. Bake driver  [P1, parallel with G0]
- `scripts/operators/guard-bake.mjs --stage <bodies|heads|garments|gear|lods|check|sheet> [--only a,b] [--par N]
  [--out C:/NightShift/scratch/guard-bake]`: one job per body base, head variant, garment or gear piece, run as
  parallel `blender -b` processes (default `--par` 6 on the laptop: 24 cores, 32 GB; the Cycles normal / AO bakes on
  the RTX 4090 run at most 2 at once), BelowNormal, `windowsHide`, no window.
- Intermediates (`.blend`, measurements) stay in the persistent laptop folder keyed by an input hash (script + kit data
  + upstream outputs), because the slot worktree is cleaned before every request; an unchanged piece is skipped, so the
  G10 fix pass rebakes only what changed.
- The last step pushes the shippable outputs (GLB, KTX2, `*.report.json`, sheet PNGs) to the branch
  `bake/guard-models` with git plumbing (temp index, no checkout, like `request.mjs`); the lead fetches it and copies
  the files into `src/operators/assets/guards/` in a normal commit after `operators:check` passes there.
- Desktop fallback (A12): the same command under `heavy.lock` with `--par 2`.
- (gm-bake-abort) A lost console (a job's exit `0xC0000142` after an account swap, or any job failing in under 2 s with
  an empty log) stops the stage: no new job starts, the running ones finish, the rest are marked not started, and the
  driver prints `ABORT: console lost, restart the bake detached` and exits 5 (no push). Restart the bake from a detached
  process.
- Pure parts (stage graph, hash keys, job split) in `scripts/operators/guardBakePlan.mjs` + Vitest.
- Model: Sonnet from an Opus brief; Opus checker (it spawns processes and pushes). ~1 h.

### G0. Guard spec and kit data (no code)
- `docs/guard-models/SPEC.md`: the archetype matrix (section 4), piece list with original designs and generic ids,
  per-piece triangle and texel budgets (section 5), bone list, tint slots, the face spec (head variants per base, their
  MakeHuman face-target recipes, the neck seam, the head envelope the helmets fit over, skin tones, hair styles and
  colours, the face tile layout), the look seed rule (section 2, G6n), IP check list.
- `scripts/operators/data/guards.json` (or `.ts` beside `src/operators/kit.ts`): bases (height, build, MakeHuman macro
  targets: male, muscle, weight), heads (face targets per variant), hair caps, outfit per kind, pieces (bone, fit, LOD
  budgets), validated by a pure `validateGuardKit` in `src/operators/guards/guardKit.ts` + Vitest.
- `scripts/operators/data/mpfb2-files.txt`: add the face shape targets the head recipes use (from the same pinned zip,
  nothing new downloaded).
- Model: Opus writes SPEC; Sonnet writes the data file and validator from it. ~1.5 h.

### G1. Base bodies (laptop bake)
- `py/build_body.py` takes a guard base from the kit data: male macro targets, larger build than Wren (shoulder and
  chest girth up, neck thicker), rigged on the game joints from `export-joints.mjs` for the base's (height, build),
  4 influences, A-pose bind (D13), so `OperatorPoser` drives it exactly like Wren and every clip, the mocap set, IK and
  the guard tuner (`rig.guardRows`) apply unchanged. The head is cut at the SPEC's neck seam (G1h supplies it).
- Ten finger bones (one per finger, curl only) at LOD0, folded into the wrist at LOD1 / LOD2.
- Output `guard-<base>-body.{blend,json}` in the bake folder with measurements against targets.
- Checks: round-trip joints < 0.1 mm (`build_skeleton.py`), `operators:check` body checks, hit volumes untouched.
- Laptop bake: 3 bases in parallel, ~10-15 min.
- Model: Opus (Blender script). ~2 h (impl 1.5 h, bake, checker).

### G1h. Heads, faces, eyes, hair caps (laptop bake)  [parallel with G1 -> G2 / G3; needs G0 only]
- `py/build_head.py`: per head variant (SPEC: `average` 4, `lean` 4, `broad` 1 eye region under the balaclava), the
  MakeHuman hm08 head region with the variant's CC0 face targets, cut at the shared neck seam (welds to every body of
  its base), ears kept, mouth closed, ~4,000 tris at LOD0.
- Skin: a procedural skin material (`py/materials.py`: neutral-light albedo that takes the four skin-tone tints well,
  redness at nose, cheeks and ears from vertex groups, pores and fine creases from a multires sculpt of procedural
  noise) baked to the variant's 1024 x 1024 face tile: albedo, tangent normal from the high sculpt, ORM (roughness
  lower on lips and the eye's wet line). Brows, lashes and the variant's facial hair (clean, stubble or short beard,
  fixed per variant) painted procedurally into the tile.
- Eyes: generated in-repo (a sphere with a cornea bulge, ~250 tris each at LOD0; iris, pupil and sclera in the face
  tile, low roughness through ORM; opaque, no refraction); fixed, no eye bones (A15). Baked AO darkens the eye socket.
- Hair caps (A13): six styles (buzz, short crop, side part, receding, fade; bald = no cap, scalp in the face tile),
  each an offset scalp shell with strand normals, <= 1,000 tris at LOD0, opaque, one hair-colour tint slot (black,
  dark brown, brown, grey). Fitted to every head variant of the base (one cap mesh, shrink-wrapped per variant at bake).
- LOD1: head ~1,200 tris, eyes merged into the head, cap ~300 tris, face tile 512. LOD2: head ~400 tris, hair in the
  albedo, face tile 128.
- Laptop bake: 9 head variants + caps in parallel (`--par 6`, Cycles bakes 2 at a time), ~20 min.
- Look gate: the sheet's 1.5 m and 3 m face crops (G4) must read as a plausible, varied, unremarkable man in every
  tone; not hero detail.
- Model: Opus. ~3 h.

### G2. Uniform garments (laptop bake)  [parallel with G3]
- Reuse `combat_shirt.py`, `trousers.py`, `boots.py`, `gloves.py` drafted from each base's measurements: shirt
  (sleeves down; a rolled-sleeve option on `lean`), cargo trousers, boots, gloves. Officer: a short field jacket over
  the shirt on `average`. Runner (A11): the work variant (no faction tint on the jacket slot).
- Detail standard light (prototype): seams and pockets that read at 8 m; no close-up detail pass.
- Laptop bake: one cloth job per (base, garment) in parallel, ~25 min wall (was ~25 min per base serial).
- Model: Opus. ~2.5 h.

### G3. Gear kit (laptop bake, rigid)  [parallel with G2]
Original designs, generic ids, every piece on the rigid-kit path (`rigid_skin.py`, one weight vector, declared bones):
- Headwear (variation): `cap` (soft peaked cap), `beanie`, `balaclava` (heavies / enforcers, A14), `headset`
  (droneOp), `boonie` (sniper). Eyewear: `glasses_clear`, `glasses_dark`. Headwear fits over the SPEC's head envelope
  (the largest head variant plus its cap), so G3 does not wait for G1h.
- `helmet_std`: a rounded shell with side rails and a rear pad, fitted over the head envelope of each base (one mesh, a
  per-base fit scale); it is also the `HelmetDrops` mesh (A6). `helmet_heavy`: the same shell with a raised clear
  visor (heavy, enforcer).
- `vest_soft`: a slim carrier with front / back panels and side straps (alarm-stage armour, `Enemy.armour`).
  `plate_heavy`: a thick plate carrier with shoulder and collar guards and front pouches (`def.plated`, heavy kind).
  Each is fitted per base (`compress` the shirt under it, torso_common).
- `shield_riot`: a curved polymer shield with a small view port and two handles, no text or insignia, held on the left
  forearm (`wristL` + `elbowL` rigid), its own GLB.
- Small kit (variation): `radio` (chest or shoulder), `pouch_belt`, `holster_thigh` (already a carry slot: the pistol
  rides it, `weaponModel.holster`), `flashlight_mount` (matches the existing torch carry).
- Laptop bake: ~14 pieces x 3 bases in parallel, ~15 min.
- Model: Opus. ~2.5 h.

### G4. Bake, LODs, export and the review sheet (laptop bake + laptop GPU sheet)
- `bake_lods.py` guard mode: per base, the body + outfit + head variants + hair caps + every piece decimated and
  atlased into one skinned mesh per LOD, one material (albedo with tint mask, normal, ORM at half size), `_PIECE` and
  `_TINT` vertex attributes, KTX2 (UASTC + Zstd). LOD0 atlas 4096 x 2048: left 2048 square body, clothes, hair caps,
  eyes and gear (the old 2K plan's density); right 2048 square the four 1024 face tiles (`broad`: balaclava, eye
  region and plate detail there). Budgets (section 5) enforced by `operators:check` (`guardBudget`: visible and buffer
  tris per LOD, head tris, bones, texture sizes, KTX2 only). `shield_riot` as its own 3-LOD GLB.
- Laptop bake: 3 bases in parallel (LODs, atlas, Cycles bakes 2 at a time, KTX2), then `operators:check` per base in
  parallel: ~40 min wall (Wren's serial desktop chain was ~70-75 min for one figure).
- A variety contact sheet (`operators:sheet` guard mode, laptop `E2E_GPU=1`, port 4189, the same alone request's last
  step): the three bases, all eight faces in four tones at 1.5 m and 3 m, every hair cap, every kind's outfit, gear on
  / off, helmet knocked off, LOD strip with counts, Hollowmere night and night vision. Published for Michael (M2: no
  stop; integration carries on).
- Model: Opus (bake), Sonnet (sheet wiring). ~2.5 h.

### G5. GuardFigure runtime  [starts with G0; uses Wren's LOD files as a stand-in until G4]
- `src/operators/runtime/guardFigure.ts` (Babylon) on `OperatorLibrary` / `OperatorPoser`:
  - LOD0 / LOD1 / LOD2 by camera distance (`lodPick.ts`, A8), LOD2 loaded first; no hero, no goggle.
  - S1's fixed root-local `BoundingInfo` (rest box + margins) instead of `alwaysSelectAsActiveMesh`, so camera and
    cascade culling work; a ragdoll (re-parented joints) falls back to always-active as `SmoothBody` does.
  - Ragdoll / carried pose: the poser reads local TRS; a re-parented joint breaks that chain, so a world-matrix path
    (bone = node absolute x inverse bind) takes over while any joint is re-parented (no allocation).
  - S7-style sharing: static vertex and index buffers per (base, LOD) per scene; per guard a skeleton and the `gvis`
    buffer (RGBA8 normalised per vertex: tint rgb for the vertex's slot, a = piece visible), rewritten only on a
    spawn, gear, tint or flash change. A material plugin (like `smoothBodyPlugin.ts`) multiplies albedo by the tint
    where the mask is set and collapses hidden pieces (position x a, degenerate triangles). No new samplers (the
    atlas is one texture set; the face tiles are atlas regions).
  - `setFlash`, `setHeat` (thermal), night vision unchanged (same PBR family), shadow casters = the shown LOD mesh.
  - `GuardAnimTier` (`src/ai/enemy.ts:426`) watches the figure's mesh instead of `rig.voxel?.meshes[0]`.
- Pure: `src/operators/guards/gearMask.ts` (piece set -> per-vertex visibility, tint fill) + Vitest.
- Model: Opus. ~4 h.

### G6. Variation  [parallel with G1-G5]
- `src/operators/guards/guardVariant.ts` (pure): `guardVariant(seed, kind, mapId, out)` -> base, head variant, skin
  tone, hair cap and colour, headwear, eyewear, small kit, colour jitter; archetype rules (section 4);
  `applyGear(variant, helmet, armour, plated, out)` -> the visible piece set (A5: helmet replaces headwear and hides the
  hair cap, balaclava stays; plated -> `plate_heavy`; armour -> `vest_soft`; A14). Deterministic integer hash (no
  `Math.random`), no allocation on the gear path. `seed` is the 7-bit look seed (G6n).
- Tests: same input -> same output; distribution over all 128 seeds x maps (no single head + tone + hair combo above
  15% within a kind); archetype rules hold.
- Model: Sonnet from an Opus brief. ~1.5 h.

### G6n. Look seed on the wire (M3)  [P1, parallel with G5 / G6; `src/net`]
- Host: `Enemy.look` (0-127), set once at spawn by `src/ai/enemyManager.ts` from the section's spawn slot: authored
  guards `hash(mapId, sectionId, spawn index)`, response teams and reinforcements `hash(mapId, sectionId, 'rt', stage,
  member index)`; never from `Enemy.num`, so a section restart gives every slot the same seed. Single player uses the
  same field (no `src/net` import).
- Wire: `AL_LOOK_SHIFT = 9`, `AL_LOOK = 127 << 9` in the enemy `al` (`src/net/protocol.ts`), `packAlert` takes `look`,
  `AL_MAX` widens to 65535, a `alertLook(al)` reader beside `alertCarry`; the host writer (`src/net/coopHost.ts`) packs
  it; `src/net/enemyPuppet.ts` hands it to `guardVariant`. Dead and carried bodies (`snap.bodies`, `src/ai/body.ts`)
  keep the seed on a rejoin: the checker confirms the body's record carries it or adds it.
- Protocol: the PR does not touch the `PROTOCOL_VERSION` line; the train build bumps it (release-speed). Comment in
  the `al` doc lists the new bits without a version number.
- Tests: `tests/guardLook.test.ts`: `packAlert` / `alertLook` round trip for all 128 seeds with every other `al` bit
  set (carry, helmet, armour unchanged), the parser keeps the seed and clamps out-of-range `al`, a restart (`clear` +
  respawn) yields the same seed per slot, response team seeds distinct within a team. Version checks use
  `PROTOCOL_VERSION` only (a peer at `PROTOCOL_VERSION - 1` refused), never a number (`tests/protocolConst.test.ts`).
- e2e: `e2e-coop` and `e2e-netmove` before the train (CLAUDE.md: `src/net` PR).
- Checkers: two independent fresh Opus checkers (neither sees the other's verdict); both must pass.
- Model: Opus. ~2 h.

### G7. Integration
- `src/ai/enemyRig.ts`: build the `GuardFigure` over the rig (`flags.guardModels`, `?guardmodels=0` keeps the S1 body,
  A10); the merged body stays until the figure's first LOD is ready, then disables (no invisible guard on a slow load).
- `src/ai/enemy.ts` gear sync (580-640) and `src/net/enemyPuppet.ts` gear (144-170) set pieces on the figure instead of
  building `gearParts` placeholders; the variant comes from `Enemy.look` / the wire seed (G6n);
  `src/ai/gearParts.ts` keeps the placeholder builders for `?guardmodels=0`.
- `src/ai/helmetDrops.ts`: the dropped helmet uses `helmet_std` LOD1 geometry (A6).
- Enforcer: `shield_riot` GLB on the left forearm instead of `buildShieldPart` (`gearParts.ts:63`).
- `src/ai/body.ts`: carried and fresh bodies keep the guard's variant (same seed) and figure.
- Assets: Vite `?url` imports, the service worker's `operators` cache (CacheFirst), `warmPlayLods` covers the guard
  LODs (LOD2 first); level load awaits LOD2 of every base the map's guards use.
- `src/core/flags.ts`: `guardModels`. Owners: Guard AI Build (`src/ai`), CT Core (`src/operators/runtime` shares, the
  rig untouched), net (`enemyPuppet.ts` gear and seed lines only).
- Model: Opus. ~3 h.

### G8. Budget measurement and look check (laptop GPU, alone)
- `E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=sectorops,ctcourse,campusops --counts=0,12,24
  --cells=patrol,away,alert --out=docs/guard-models/run-g8-on`, then the same with `?guardmodels=0` to `run-g8-off`,
  plus one `--cells=near` row (all 24 inside 8 m: the LOD0 worst case of section 6). Compare against section 6; fill
  the table in STATE.md.
- Look check (`docs/guard-render/look-shot.js` adapted): one guard at 1.5 m, 3 m, 8 m, 25 m; every face in every
  tone; thermal, night vision; helmet on / knocked off; vest; plate; shield; the 24-guard line-up for variety; the
  same guards before and after a section restart (M3).
- Model: Sonnet runs (laptop queue alone request), Opus reads the numbers. ~2 h.

### G9. Tests, docs, PR
- Vitest: `guardKit.test.ts`, `guardVariant.test.ts`, `gearMask.test.ts`, `guardLook.test.ts` (G6n),
  `guardFigure.test.ts` (NullEngine: shared buffers per (base, LOD), gear and head toggles hide exactly the piece's
  vertices, culling box, ragdoll world path matches node positions < 1e-4 m, flash / heat, dispose),
  `guardAssets.test.ts` (reads the bundled GLBs: visible and buffer tris per LOD, head tris, bone count, KTX2 only,
  texture sizes within section 5).
- e2e (laptop queue, GPU): `e2e-enemies`, `e2e-combat` (helmet knock-off drop, vest stagger, ragdoll),
  `e2e-takedown` and `e2e-stealth` (bodies carried), `e2e-guard-carry`, `e2e-sectorops`, `e2e-ctcourse`, `e2e-coop`
  (new asserts: a guard's look seed and visible pieces are equal on host and client; after a section restart the same
  slot has the same seed on both; helmet bit drop on both), `e2e-netmove`, `e2e-offline` (guard LODs served from the
  cache). Then the train's full run.
- GPU sheets on the laptop: G4's variety sheet, G8's look check.
- Docs: `docs/systems/world-and-characters.md` (guards section), `docs/systems/performance.md` (guard figure budget
  line: LOD0 visible / buffer tris, textures, download), `docs/systems/coop.md` (the look bits in `al`),
  `docs/art-credits.md` (MPFB2 now also shapes the guards and their faces), `TESTING.md` (desktop checklist: guard
  variety, faces, helmet knock-off, same looks after a restart), changelog fragment `changes/feature-guard-models.md`.
- Model: Sonnet (tests, docs); Opus checker. ~2 h.

### G10. Look fix pass (M2)  [when Michael's notes on G4's sheet arrive; off the critical path]
- Michael's notes become a numbered list in STATE.md; one Opus pass over the scripts and kit data, one laptop rebake
  of only the changed pieces (GB's input hash skips the rest; ~15-30 min), a fresh sheet of the changed items.
- Notes that arrive before the PR opens ride the same PR; later notes go in one follow-up batch PR. One pass; further
  notes go on the polish list unless something is broken.
- Model: Opus; Sonnet checker (data and look). ~2.5 h.

## 4. Archetype matrix (visible pieces; M1, A5, A11, A14)
| Kind | Base | Face | Outfit | Headwear (variation) | Fixed gear | Gameplay gear |
| --- | --- | --- | --- | --- | --- | --- |
| grunt | average | 4 heads, hair cap | uniform | cap / beanie / hair only | radio, torch mount | helmet_std, vest_soft by alarm stage |
| runner | lean | 4 heads, hair cap | work variant (A11) | beanie / hair only | - | helmet_std, vest_soft by stage |
| heavy | broad | balaclava (eye region) | uniform | - | plate_heavy (`plated`), helmet_heavy | - (always armoured) |
| sniper | lean | 4 heads, hair cap | uniform, rolled sleeves | boonie / cap | glasses_dark | vest_soft by stage |
| enforcer | broad | balaclava (eye region) | uniform | - | helmet_heavy, vest_soft, shield_riot | - |
| droneOp | average | 4 heads, hair cap | uniform | headset + cap / hair | pouch_belt | helmet_std, vest_soft by stage |
| officer | average | 4 heads, hair cap | uniform + jacket | cap (peaked, original) | radio | vest_soft by stage |
| dog | own model | - | - | - | - | - |
- Distinct faces: 8 (4 per open-face base) x 4 skin tones x 6 hair caps x 4 hair colours, plus headwear and kit.

## 5. Per-guard budgets (targets the checks enforce; M1 re-budget)
| | LOD0 (< 8 m) | LOD1 (8-25 m) | LOD2 (> 25 m) |
| --- | --- | --- | --- |
| Triangles shown (body + head + shown pieces) | <= 20,000 (was 16,000) | <= 7,000 (was 6,000) | <= 2,800 (was 2,500) |
| Triangles in the buffer (every head, cap and piece) | <= 45,000 | <= 14,000 | <= 5,000 |
| Head + neck / eyes / hair cap | 4,000 / 2 x 250 / <= 1,000 | 1,200 / in head / 300 | 400 / in head / in albedo |
| Head variants per base | average 4, lean 4, broad 1 | same | same |
| Draws per pass | 1 (+1 shield, + gun) | 1 | 1 |
| Bones | 33 (23 rig joints + 10 fingers; no face bones, A15) | 23 | 23 |
| Influences | 4 | 4 | 2 |
| Atlas: albedo + normal / ORM (BC7, mips) | 4096 x 2048 / 2048 x 1024: 25.2 MB | 2048 x 1024 / 1024 x 512: 6.3 MB | 512 / 256: 0.8 MB |
| Face tile per head variant | 1024 x 1024 | 512 x 512 | 128 x 128 |
- Textures per base ~32 MB (was ~22), three bases ~97 MB, the shield ~2 MB: ~99 MB with every base in a scene (was
  ~70; Wren's play LODs 44 MB). Static meshes ~3 MB per base. Download (KTX2 UASTC + Zstd) <= 75 MB for all guard
  files (was 45), cached by the service worker.
- Per-guard buffers: `gvis` RGBA8, 4 B a vertex (~26 k vertices LOD0 + ~8 k LOD1 + ~3 k LOD2) ~150 KB (was ~225 KB
  at 16 B); skeleton 33 x 64 B bone texture upload per posed frame (2.1 KB). Static buffers shared per (base, LOD).
- Pieces: headwear <= 600 tris LOD0, helmet <= 1,200, vest <= 1,800, plate <= 2,600, shield <= 800 (in the shown
  total).

## 6. Budget fit against guard-render S1 and performance.md at 24 guards (M1 re-budget)
Baseline on master (M1, 4.75.0): sectorops 24 patrol / alert facing: frame CPU p95 13.9 / 15.9 ms, GPU p95 8.6 /
10.1 ms, draws 239 / 300; ctcourse 12.7 / 13.2, 7.1 / 7.7, 167 / 183; campusOps 17.8 / 19.7, 11.4 / 11.6, 541 / 589.
Targets (`docs/systems/performance.md:13-26`): GPU p95 <= 15 ms (the 60 Hz line), frame CPU p95 <= 12 ms (already
missed at 24 facing; on the polish list), draws <= 600, triangles <= 8 M per frame over all passes, VRAM <= 12 GB.
"Typical" = 4 guards inside 8 m, 12 at 8-25 m, 8 beyond; "worst" = all 24 inside 8 m (G8's `near` row).
- Draws: unchanged, one mesh per guard. Heads, eyes and hair caps are pieces of the guard's one skinned mesh with the
  one material (A3, A13), so each guard is still 1 draw per pass, plus the gun, plus 1 per shield (<= 3 enforcers).
  CampusOps stays ~589-595 of 600. Alpha hair cards would have cost ~+60 there (A13).
- Triangles: counted (Babylon counts every index, hidden degenerate ones too): typical (4 x 45 k + 12 x 14 k + 8 x 5 k)
  x ~4 passes = 1.55 M, worst 24 x 45 k x 4 = 4.3 M; rasterised: typical 0.75 M, worst 1.9 M. Inside 8 M.
- GPU: the LOD0 cost is the skinned vertex work over the whole buffer (hidden head variants and caps still run the
  vertex shader) plus ~60% more shown triangles than the S1 hi body. Estimate ~0.15-0.2 ms per LOD0 guard against
  S1's measured ~0.08-0.10 ms per added guard. Typical: +0.3 to +0.8 ms (sectorops alert ~10.6, campusOps ~12.2).
  Worst: +1.5 to +2.5 ms (sectorops alert ~12.6, campusOps ~14.1). Inside 15 ms, with little margin at the worst
  case. Data-only levers if G8 misses: LOD0 radius 8 -> 6 m; cascades 2+ draw the LOD1 mesh; head variants per base
  4 -> 2 (buffer 45 k -> 36 k).
- CPU: unchanged from the first plan. Bones stay 23-33 (no face bones, A15); the head and hair choice is a
  spawn-time `gvis` write; the look seed is two integer ops on pack and parse. New: `OperatorPoser.solve` per posed
  guard, target <= 0.01 ms (24 guards 0.24 ms, fewer with S4's off-screen / far anim tiers). Culling as S1 (fixed
  box). Gate: frame CPU p95 at 24 within +0.5 ms of `run-g8-off`. If the poser misses: bind the guard bases in the
  rig's rest pose and link bones straight to the rig nodes (no retarget; the SmoothBody path) as G5's fallback.
- VRAM: ~99 MB textures + ~9 MB static meshes + 24 x 150 KB `gvis` (3.6 MB) = ~112 MB of the 12 GB Epic line (was
  ~70 MB).
- Download: <= 75 MB (was 45), cached like Wren; level load awaits LOD2 only (~1 MB a base).
- Verdict: draws neutral, triangles and VRAM with wide margin, GPU inside 15 ms typical and worst (thin at campusOps
  worst); frame CPU neutral by design. G8 measures all of it, `near` row included.

## 7. Order, parallel groups and estimate
| Group | Slices (parallel inside a group) | Wall | Models |
| --- | --- | --- | --- |
| P1 | G0 spec + data; GB bake driver; L0 laptop tools; G5 runtime on Wren stand-in; G6 variation; G6n look seed | 1.5 h (G5, G6, G6n run on) | Opus G0, G5, G6n (+2 Opus checkers); Sonnet GB, G6; Test Runner L0 |
| P2 | G1 base bodies; G1h heads, faces, hair caps (runs on through P3) | 2 h | Opus |
| P3 | G2 garments and G3 gear kit (separate parallel laptop bakes); G1h finishes | 3 h | Opus |
| P4 | G4 bake, LODs, export, sheet (sheet to Michael, no stop) | 2.5 h | Opus bake, Sonnet sheet |
| P5 | G7 integration (G5, G6, G6n done by now) | 3 h | Opus |
| P6 | G8 measure + look; G9 tests and docs alongside | 2.5 h | Sonnet runs and tests, Opus checker |
| any | G10 fix pass when Michael's notes arrive | 2.5 h | Opus, Sonnet checker |
- Per slice: L0 0.5 h, GB 1 h, G0 1.5 h, G1 2 h, G1h 3 h, G2 2.5 h, G3 2.5 h, G4 2.5 h, G5 4 h, G6 1.5 h, G6n 2 h,
  G7 3 h, G8 2 h, G9 2 h, G10 2.5 h (~33 agent-hours, was ~25: faces +3, fix pass +2.5, look seed +2, driver +1,
  parallel bakes -1.5).
- Critical path: G0 -> G1 -> G2 / G3 -> G4 -> G7 -> G8 / G9 = 1.5 + 2 + 3 + 2.5 + 3 + 2.5 = ~14.5 h wall (was ~16),
  about 3 usage windows at full burn. G1h (3 h) runs beside G1 -> G2 / G3 (5 h) and is not on the path; G10 waits on
  Michael and is not on the path.
- Blender: 0 h on the desktop (was ~3.5 h serial under heavy.lock). Laptop alone-slot time ~1.5-2 h in five requests
  (bodies ~15 min, heads ~20, garments ~25, gear ~15, LODs + check + sheet ~40), each in parallel jobs; add up to
  ~20 min queue wait per request (trains go first), so ~1.5 h of bake wall on the critical path. Book each request the
  moment its scripts are pushed; at a ~95% save, queue the next one so the laptop bakes through the swap.
- If L0 is not answered when G1 is ready: G1's bake runs on the desktop fallback (`--par 2` under heavy.lock) and the
  rest moves to the laptop once the tools are there.
- Checkers: one fresh Opus checker per group for P2-P5 (Blender, rig, render code); two independent Opus checkers on
  G6n (`src/net`); Sonnet checks G6, G9 and G10.
- One PR to master at the end (it touches `src/net`, so `e2e-coop` and `e2e-netmove` pass on the laptop queue before
  the train; the train build bumps `PROTOCOL_VERSION`); G4's sheet goes to Michael as soon as it exists (M2).

## 8. Risks
- Retarget on a larger body: clavicle and shoulder clipping with the rifle carry (`weaponMount` / sling offsets were
  set for Wren). G7 checks the S21 carry poses on each base in the look sheet; offsets per base in the kit data.
- Ragdolls and carried bodies with the local-TRS poser (handled by G5's world path; tested).
- First-draw shader compile of the new plugin variant can hide a guard for a few frames (guard-render S1 note;
  `bodyEffectRecovery.ts` covers stalls): warm the variant on the loading screen.
- Faces: static faces (A15) at takedown range may read dead or uncanny; skin tones by tint over one neutral albedo can
  look flat on the darkest tone. G4's 1.5 m crops are the check; G10 fixes what Michael flags; blink and eye look go on
  the polish list. Balaclava-for-all stays a one-line undo.
- GPU at the worst case (24 inside 8 m at campusOps) has ~1 ms of margin: the data levers in section 6.
- Laptop queue: alone requests hold both slots and wait behind trains; a bake booked late can sit ~20 min. The laptop
  tools need Michael's yes (L0); the desktop fallback keeps the job moving.
- The look seed shares `al` with gear and carry bits: G6n's round-trip test covers every bit combination; two checkers.

## 9. Open items
- Michael's three questions are answered (BRIEF M1-M3).
- L0: if the probe finds Blender 5.2.2, the MPFB2 zip or KTX-Software missing on the laptop, the orchestrator asks
  Michael (native multiple choice) before Test Runner copies them there (CLAUDE.md: ask before installing).
