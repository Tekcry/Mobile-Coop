# Operator pipeline (offline)

Builds the operators (docs/operators/SPEC.md 6.3) with Blender run headless from Python. Blender never needs to be open.

- `npm run operators:build [wren|moth]` - runs every stage for both operators (or the named ones). Output goes to
  `build/operators/` (not committed).
- `npm run operators:check [wren|moth]` - the automatic checks on every built item (`check.mjs`, `py/check_garment.py`):
  seam gap before the weld under 10 mm, no simulation divergence, no render-mesh edge over 3 cm, no solidify spike,
  measured fabric albedo 0.02-0.06 linear, roughness 0.7-0.95 on fabric and 0.55-0.9 on hard parts, every built item
  named in the kit data with a passing `validateKit`. A JSON report per item in `build/operators/<id>/`
  (`<id>-<item>-check.json`); non-zero exit on any failure. Run it after every build.
  `npm run operators:check -- wren --only carrier,belt` checks just the named built items (same checks, thresholds
  and views): for the tuning loop only; the full check runs at the end of every step and fix round.
- `blender.mjs` - finds Blender (`BLENDER_PATH`, else the standard install folder) and refuses any version but the pinned
  5.2.2. Scripts run with `-b --factory-startup -noaudio --python-exit-code 1`.
- `export-joints.mjs` - writes `build/operators/joints.json`: each operator's corrected proportions, hit volumes and
  bind-pose joints from `src/operators/operatorBody.ts` (which reads `src/player/proportions.ts`; neither is edited
  by the pipeline). Frame: the game's (+X right, +Y up, +Z forward, metres).
- `paths.mjs` - paths and the fixed seed (`SEED`), passed to every script as `--seed`.
- `ts-resolve.mjs` - lets Node import the repo's extensionless TypeScript paths.
- `py/common.py` - argument parsing, the version check, seeding, the game-to-Blender frame conversion.
- `py/build_skeleton.py` - stage 0: the armature from the joints, with a round-trip check (fails above 0.1 mm).

- `fetch-base-body.mjs` - fetches the CC0 MakeHuman data (MPFB2 `src/mpfb/data`, pinned commit, file list in
  `data/mpfb2-files.txt`) into `build/operators/cache/mpfb2/` once. Source and licence: `docs/art-credits.md`.
- `py/mh.py` - the MakeHuman base mesh in numpy: macro targets, joint cubes, CC0 rig weights (no MPFB code).
- `py/build_body.py` - stage 1: the body shaped to the operator, rigged on the game joints (A-pose bind, D13), skinned
  (4 influences), hero finger and toe bones; `<id>-body.blend` and `<id>-body.json` (measurements against targets).
- `py/pattern.py` - 2D panels, seams, panel meshing, the pattern-space surface lookup.
- `py/garments/<name>.py` - a garment drafted from body measurements (`base_layer.py`, `combat_shirt.py`,
  `trousers.py`, `suit.py` - Wren's one-piece stealth suit on the base layer's blocks, bonded tapes, zip; `legwear.py` is the leg block shared by the leggings and the trousers): its panels, seams and
  details, the kit item it builds (`KIT`, and `kit` on each detail) and its cloth settings (`SIM`: vertex mass,
  stiffness per material and panel, stiffer sewn layers under pockets and pads). `build_garment.py --sim '<json>'`
  overrides `SIM` for tuning runs.
- `py/build_garment.py` - stage 2: arrange, sew by cloth simulation (the flat pattern is the rest shape), settle, weld.
  Multi-layer: garments build in `GARMENTS` order (`export-gltf.mjs`; Wren since step 08a: suit, gloves, boots, headwear, head_kit - A37); `--under a,b` opens
  the last earlier garment's blend, measures every girth over the body plus the earlier layers and makes each of them
  a collider. Prints the worst seam per sample and refuses a panel arranged inside out.
- `py/garment_details.py` - stage 3: seam ridges, hems, thread stitches, patches (pads, pockets, flaps, tabs,
  reinforcement panels, belt loops), zip, fly, snaps and grommets, materials (reused by name across garments).
- `py/build_fitted.py` - the fitted items (`FITTED`: gloves, boots; DECISIONS A18) in one stage instead of stages 2
  and 3: `garments/gloves.py` shrink-fits panels on the hand surface (palm, knit back, fourchettes, knuckle pad, tip
  and palm-heel patches, ribbed cuff, wrist tab); `garments/boots.py` lofts a last from the foot's section hulls and
  adds the sole, lugs, eyelets, speed hooks, laces, lace garage and pull loop. Shared geometry in `py/fitted.py`. It
  writes the same `-sim.json` / `-sim.npz` / blend as a sewn garment (method `fitted`, seam gap 0), so the layers over
  them push clear of their shells and `operators:check` checks them.
- Head items (step 07, DECISIONS A24), also `FITTED`, after the trousers: `garments/headwear.py` (balaclava and
  hood: a ray grid round the head stretched as a membrane over the skin and the layers, the hood a looser membrane over
  it; eye port, flatlock and topstitched seams, rolled hems, the rear shock-cord channel with eyelets and a cord lock)
  and `garments/head_kit.py` (D20 harness: hard brow plate, split crown straps, side straps with cam buckles, hard
  rear battery pod, chin strap, all in fixed planes; the square goggle with its glowing lenses on a wide band through
  side lugs, the band's cable to the pod, the earpiece cable, boom mic). Shared head geometry and the solid builders
  (`rbox`, `pad`, `taper`, `knurl`) in `garments/head_common.py`. No flip mount (D19): the goggle parts carry `stowM`
  (a 4x4 rigid transform to the stowed pose on the brow); the band and its cable are built for both positions
  (`goggle_pos` 'inuse' / 'stowed'), the stowed set hidden from render, export and checks. The renders swap them.
- Torso and belt kit (step 08, DECISIONS A32-A35), also `FITTED`, after the head kit: `garments/carrier.py` (front and
  back plate bags as rigid curved slabs fitted to the shirt, laser-cut laminate faces, padded shoulder straps on the
  shoulder's convex hull with a ladder lock and a rolled, banded tail, the elastic cummerbund (`Ring`: a tensioned band
  on the pressed hull of each row), three magazine pouches, the admin pouch, the radio and medical pouches, the back
  panel's drag handle, bungee and butt cup, the quick-release loop) and `garments/belt.py` (inner and outer belt over
  the belt loops, the two-part buckle, grenade, pistol magazine and dump pouches, the knife sheath). Shared:
  `garments/torso_common.py` (`Plate`, `slab`, `perforated`, `Ring`, `band_slab`, `padded_strap`, `compress`: the
  shirt and trousers pressed in under the parts, A33).
- `npm run operators:build -- wren --from <garment>` resumes at that garment (the earlier blends must be current).
- `py/materials.py`, `py/render.py`, `py/render_garment_test.py` - procedural materials, the GPU render setup, the test
  views (`--render`; per garment: front and back in stealth light, raking close-ups, a neutral front; head items: the
  head front, side and back, the goggle close (in use), stowed front and side (h, j) and a darkness view lit by the lens glow alone; `--quick`
  renders the close-ups only).

- `py/export_gltf.py`, `export-gltf.mjs` (`npm run operators:export`) - `<id>-lab.glb`: body and garments skinned to the game
  joint names, flat material factors: the unbaked build (the Lab's `source` LOD). Runs at the end of `operators:build`.
- `py/bake_lods.py`, `export-gltf.mjs` (`npm run operators:lods -- wren [--render] [--scale 0.125]`, step 10, A69-A73) -
  the game assets from the last garment's blend: hero (230 k), LOD0 (40 k), LOD1 (13.5 k), LOD2 (5.6 k; desktop only, D29: no phone LOD)
  decimated in a chain, regrouped into atlases (hero: cloth 4K, kit 2K, hardware 2K, glow; LOD0: cloth 2K, kit 2K,
  glow; LOD1: cloth 1K, kit 1K, glow; LOD2: one 1K atlas, glow), unwrapped from the garments'
  pattern panels, baked from the 2.45 M source on the GPU (albedo, tangent normal, ORM), skinned (game LODs: 19 game
  joints), with the anchors `weaponMount.backL/.backC/.backR` (chest), `pistolHolster` (hipR), `slingSocket` (pelvis).
  Writes `build/operators/<id>/export/{<lod>/<id>-<lod>.glb, textures/<lod>/*.png, report.json, README.md}`, the Lab copies `<id>-lab-<lod>.glb`, `<id>-lods.blend`,
  and with `--render` the side-by-side sheets `docs/operators/mockups/tests/<id>-lods-*.webp` (columns: source, hero,
  LOD0, LOD1, LOD2). Rigid kit (D28, step 11b, `py/rigid_skin.py`): every rigid part rides its declared bone(s) with
  one weight vector, stays a separate piece below LOD0 and carries its id as the `_RIGID` glTF attribute. About 15-20 min for Wren. `operators:check` then checks every LOD file (anchors on their
  joints, game joints only, `rigidSkin`: one weight vector per rigid part on its declared bones) and flags SPEC 6.4
  overruns. Per built item it judges `rigidKit` (src/operators/rigidKit.ts: shape within 1 mm of the design after a
  best-fit rigid alignment, depth into the suit, seats over 3 mm mounted, small hardware on its host, true sizes, the
  D28 bone rule) from check_garment.py's `rigid` data.
  anim-rig (docs/archive/anim-rework/RIG.md): the game LODs skin 19 joints, the toe box on `toeL` / `toeR` (the ball of the foot).
- `toe-skin.mjs` (anim-rig, `node scripts/operators/toe-skin.mjs [--check] [hero.glb lod.glb ...]`; default: the bundled
  `src/operators/assets/wren/` files, in place) - gives LOD files baked before anim-rig (toes folded into the ankle) the
  toe weights of a fresh bake without a rebuild: each ankle-weighted vertex takes the toe share of its nearest hero
  vertex on that foot. Only the JOINTS_0 / WEIGHTS_0 bytes change; a file that already skins its toes is left alone.
  Run it after copying freshly baked LODs only if they predate the bake_lods.py change (it is then a no-op anyway).
- `py/pose_check.py` (step 11b, D28): the built Wren in four movement poses (prone knee-up crawl, rope climb, deep
  crouch, rappel seat), every rigid item measured against the body, the other items, the ground, a modelled sit harness
  and its draw path; `blender -b build/operators/wren/wren-leg_kit.blend --python scripts/operators/py/pose_check.py --
  build/operators/wren docs/operators/mockups/wren` (via scripts/operators/blender.mjs) writes `wren-pose-*.webp` and
  `build/operators/wren/wren-poses.json`; with `<id>-game-poses.json` present (operators:sheet `--only gamePoses`) it
  also measures the game's own crouch and sneak.
- `npm run operators:ktx2 [wren]` (step 11, D26, A79; the last stage of `operators:lods`): KTX-Software `toktx`
  (C:/Program Files/KTX-Software/bin, or `KTX_BIN`) encodes every LOD's PNG set to KTX2 (UASTC q2 + Zstd 18, mips;
  albedo sRGB, normal / ORM linear), validates and decodes each back (`ktx extract`, PSNR into report.json, the decoded
  level 0 in `textures/<lod>/ktx2-decoded/` for the Lab), repacks every GLB with `KHR_texture_basisu` (no WebP / PNG
  left) and refreshes the Lab copies; costs into report.json `ktx2` and README.md. `operators:check` FAILs a LOD file
  with any other texture format (`ktx2`).
- `npm run operators` - the dev-only Operator Lab (`operators.html`, `src/operators/lab/`, `vite.operators.config.ts`): builds
  into `build/operators-lab/` and serves at `http://127.0.0.1:4189/operators.html` (E2E_PORT). Never in `dist/`.
- `npm run operators:sheet [wren|moth] [--only turnaround,closeups,menu,context,compare,lods,wire,colourblind] [--no-build]`
  (`scripts/operator-sheet.mjs`, run with `E2E_GPU=1 E2E_PORT=4189`) - the contact sheets, into `docs/operators/mockups/<id>/`.
  `--only gamePoses` (no sheet) writes `build/operators/<id>/<id>-game-poses.json`: the game rig's crouch and sneak
  (labData POSES through the Lab's retarget) as the operator's posed skeleton; pose_check.py then adds the poses
  `gameCrouch` / `gameSneak` (step 11b fix round 1).

Stages still to come (PLAN.md): Moth; Babylon's KTX2 transcoder files in vendor/ktx2/ (A79, OPEN); the game integration (step 18).

## Guard bake check steps (guard-models; BAKEFIX-REPORT.md)
Plain `node` from the repo root, no loader flag, safe through cmd.exe (the laptop runs each step with Node's
`child_process` `shell: true`, which on Windows is cmd.exe and does not expand `*`):
- `node scripts/operators/guardBodyCheck.mjs --kit scripts/operators/data/guards.json <out>/bodies/guard-*-body.json`
  (or the `<out>/bodies` folder, or named files). It registers `ts-resolve.mjs` itself before it loads the game's
  TypeScript (`src/operators/operatorBody.ts` imports `../player/proportions` without an extension).
- `node scripts/operators/guardHeadCheck.mjs --out <out> --kit scripts/operators/data/guards.json [--partial]`. Albedo
  band 0.55-0.9 (SPEC 7 neutral); heads whose kit `facialHair` is `beard` use 0.45-0.9 (`SKIN_ALBEDO_BY_FACIAL_HAIR`).
- `node scripts/operators/guardGarmentCheck.mjs <out>/garments/guard-*.json` (or the `<out>/garments` folder).
The body and garment CLIs expand a `*` / `?` in the file name themselves (`cliFiles.mjs`); a pattern or folder that
matches nothing exits 2. Exit 1 = a report failed.
