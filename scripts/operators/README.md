# Operator pipeline (offline)

Builds the operators (docs/operators/SPEC.md 6.3) with Blender run headless from Python. Blender never needs to be open.

- `npm run operators:build [wren|moth]` - runs every stage for both operators (or the named ones). Output goes to
  `build/operators/` (not committed).
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
- `py/garments/<name>.py` - a garment drafted from body measurements (`combat_shirt.py`).
- `py/build_garment.py` - stage 2: arrange, sew by cloth simulation (the flat pattern is the rest shape), settle, weld.
- `py/garment_details.py` - stage 3: seam ridges, hems, thread stitches, patches, zip, materials.
- `py/materials.py`, `py/render.py`, `py/render_garment_test.py` - procedural materials, the GPU render setup, the four
  test views (`--render`).

Stages still to come (PLAN.md): more garments and kit, baked maps, LODs, glTF export.
