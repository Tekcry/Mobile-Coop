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

Stages still to come (RUNBOOK steps 3 onward): the CC0 base body shaped and skinned to the joints, garments from sewn
panels by cloth simulation, kit, baked maps, LODs, glTF export.
