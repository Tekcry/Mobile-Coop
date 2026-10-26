# Step 11d - Wren: game runtime

Model: Opus 5.5, High effort. Run by the orchestrator's step loop (RULES.md "Step loop"). Starts only after step 11c
(feature/operators merged with origin/master 4.0.0, D31).

## Objective

The game-side runtime for the operator assets, as new, unit-tested modules: everything step 11e needs to put Wren in
the game, built against the post-merge code (CharacterRig, player body path, build).

## Read (only these, plus the common files)

- DECISIONS.md D13, D19-D21, D27-D30 (grep). SPEC 6.3 / 6.4 (LODs, runtime). LOG.md steps 10 and 11b (asset names,
  KTX2, `_RIGID`, skinning). scripts/operators/README.md (output folders).
- `docs/operators/CLOUD-RUNTIME-PROMPT.md` sections 0a, 1 and 2 (the rules and facts; its phases are the shape of this
  step, run locally with the GPU). Ignore its branch and "do not edit existing files" setup: this step works on
  feature/operators and may make the small existing-file edits listed below.
- The current player body path, CharacterRig and the build (a read-only Explore survey first; write
  `docs/archive/operators-runtime/SURVEY.md`).

## Do

1. Survey (parallel read-only Explore agents allowed): player body creation and disposal, menus / photo mode / close
   cameras (hero candidates, D21), co-op remote bodies, silhouettes / glow, light meter and guard perception
   (gameplay isolation), how assets are bundled after the merge.
2. `docs/archive/operators-runtime/DESIGN.md`: module layout and APIs; asset manifest (from step 10 output names); LOD picker
   (distance bands with hysteresis, per camera; hero for menus and registered close-up cameras, D21; desktop only,
   D29); loading and shared GPU resources for co-op bodies of the same operator; skeleton link to CharacterRig
   (Bone.linkTransformNode, rig stays the pose authority, non-allocating per-frame path); materials (KTX2 via the
   bundled decoder, D27; goggle glow; the two goggle states, stowed / in use); disposal.
3. Pure, Babylon-free modules in `src/operators/runtime/` with Vitest tests (`tests/operatorsRuntime*.test.ts`):
   manifest + validation, LOD / hero picker (no allocation per call), close-up camera registry, goggle state model (no
   dev switch: Wren replaces the player body, D31 / G123).
4. Babylon side (through `src/core/babylon.ts` only; add side-effect imports there if needed): loader building meshes
   and a Skeleton from the GLB, rig link, materials and glow, LOD swap, goggle states, dispose. Unit-test what runs in
   node; GPU checks wait for 11e.
5. No wiring into the game yet (11e). Hard rules: no network / CDN, hot paths do not allocate (`hyp2` / `hyp3`,
   never `Math.hypot`), gameplay never reads graphics state, light parity, co-op code only under `src/net` behind
   the dynamic import.

## Checks

- `npm run check` passes; new tests cover the pure modules.
- `npm run operators:check -- wren` still passes as at the end of the Wren block (no asset changes here).

## Finish

As RULES.md "Step loop"; commit "operators: step 11d - Wren: game runtime".
