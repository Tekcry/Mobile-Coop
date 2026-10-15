# Step 04 - Operator Lab and the contact sheet script

Model: Sonnet 5.5, Medium effort. One session. Unattended (DECISIONS D15).

## Objective

The dev-only Operator Lab page and the contact sheet script (BRIEF Stage 2 items 1-2), tested on Wren's body and
shirt.

## Read (only these, plus the common files)

- `docs/operators/BRIEF.md` Stage 2 items 1-2; `docs/kestrel/editor.md` (how a dev-only page is wired).
- `src/core/babylon.ts`, `src/player/characterRig.ts` and `src/anim/*` READ ONLY (pose data, bone names).

## Do

1. glTF export of the current body and shirt (`py/export_gltf.py`, joints named as the game rig) so the Lab can load
   them; KTX2 can wait for step 10.
2. The Operator Lab (`npm run operators`; never in the production bundle, check the build output): turntable, free
   close-up camera, LOD selector, presets (Low / High / Epic / phone look), lighting rigs (neutral studio, raking,
   menu scene, Hollowmere sodium vs moon, darkness with goggle glow only, night vision), the pose list (A-pose, idle,
   crouch, sneak, aim pistol, aim rifle, Moth's climbing reach) from existing pose data read only, wireframe /
   normals / UV / material ID toggles. Bones linked to a CharacterRig built read-only (`Bone.linkTransformNode`).
3. `scripts/operator-sheet.mjs` (headless, E2E_GPU=1, E2E_PORT=4191): every sheet in BRIEF Stage 2.2 including the
   colour-blind strip. Test it on Wren's body and shirt.
4. Babylon only through `src/core/babylon.ts`; pure logic in Babylon-free modules with Vitest tests.

## Out of scope

New garments or kit.

## Checks (all must pass before the commit)

- The step's own outputs exist and work as described; `npm run check` passes.
- `npm run check` passes.

## Finish

- LOG.md: what was built, numbers, open items. STATE.md: the next step (keep it short).
- Commit and push `feature/operators`.
- Start step 05 (wren-base-trousers) as RULES.md Chaining says.
