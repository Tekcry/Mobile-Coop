# anim-skeleton - plan

Each slice: an implementer, a fresh Opus checker, one fix round; the job lead commits, pushes and messages the
orchestrator. Tests per the CLAUDE.md tiers.

## P0 - prototype (Blender only, no game code)
`scripts/anim-skeleton/proto_rig.py` (+ `proto.mjs` runner through `scripts/operators/blender.mjs`), run `-b` on a
copy of `wren-lods.blend` in `build/anim-skeleton/` (gitignored):
- LOD0's game armature gains `clavL` / `clavR` (chest -> clav -> shoulder) and 30 finger bones copied from the hero
  armature (under wrL / wrR).
- Weights: finger weights from the hero by nearest vertex (A4); clavicle weights split from the chest near each
  shoulder (A3).
- Rest check: LOD0 deformed at rest equals the original within 1e-5 m (A5).
- Test clip `skeleton_test` (about 2 s): a shrug and a shoulder push, fingers curling one at a time and spreading, and
  an FK leg kick (hip flex, knee, ankle, toe) with the other leg planted.
- Renders: 4-6 frames as a sheet (front and three-quarter), `docs/anim-skeleton/proto/`. Sent to the orchestrator.
Done: the sheet shows the skin following all three without tearing; the rest check passes.

## S1 - asset
- `scripts/anim-skeleton/skin.mjs` (or Blender export): the shipped LOD0 / LOD1 GLBs gain the clavicle and finger
  joints, inverse binds and weights; LOD2 gains the clavicles only; hero gains the clavicles. Re-run is a no-op.
- `bake_lods.py` keeps fingers (LOD0 / LOD1) and adds the clavicles, so the next full bake makes the same thing.
- `lodChecks.ts` allows fingers in LOD0 / LOD1; `operatorLods` tests updated.
Done: `npm run check`; the files load in the game (e2e-anim); bone count and size within `performance.md`.

## S2 - runtime rig
- `characterRig.ts`: `clL` / `clR` nodes between chest and shoulders (identity rest), 30 finger nodes per rig under the
  wrists; `pose.ts` / `manifest.ts` map them to the skin joints.
- Fingers driven by per-finger curl / spread (Hands & feet values via `tuneHands.ts`, and the clip's channel in S3); the
  morph path left for the hero.
- Bit-identity test (A5): every existing joint's TRS per clip frame, solo and partner rig, untuned, equals a fixture
  captured from master.
Done: check; e2e-anim, e2e-studio, e2e-netmove; a GPU screenshot of curled fingers and a shrug in the studio.

## S3 - clip channels and bake
- `keyed.ts`: optional channels `clav` (8: L / R quaternions), `fing` (20 scalars), `leg` (L / R: hip quat, knee,
  ankle quat, toe, weight = 22). Sample, mean, mix, mirror like `wrist`; absent channels sample to identity / 0.
- `key_clip.py` (A's file, via the orchestrator) writes them when the key file sets `clav` / `fingers` / `legs`;
  `build.mjs` emits them only when present, so the 28 existing clip modules are byte-identical.
- The rig applies `clav`, `fing`, and the FK leg blend after the leg solves (next to `ikStrengthLimbs`).
- `skeleton_test` key file and clip; a studio entry for it (A's `studio.ts`, via the orchestrator).
Done: check; the clip modules diff empty except the new one; e2e-studio plays `skeleton_test`; GPU screenshot.

## S4 - tuner rows
- Joints rows: `clavicleL` / `clavicleR` (3 axes) and per-finger joints in `tuneJoints.ts` (B's file).
- Keys fields: `armX.clav*`, per-finger curl / spread, `legL` / `legR` per key in `tuneKeysFile.ts` (A's file); the
  bake writes them back to the key JSON.
- Done through the orchestrator: either the owners add them from our spec, or we add them after their merges with
  their OK. The panel shows them with no UI change (registry).
Done: check; the rows appear in the panel (e2e-studio); an old export still loads (identity).

## S5 - finish
Rebase on A's and B's merges, the bit-identity test re-run, docs (`CHANGELOG` Unreleased - anim-skeleton, `TESTING.md`,
`docs/systems/world-and-characters.md` rig section, `docs/operators` LOD note), full e2e, PR to master.
