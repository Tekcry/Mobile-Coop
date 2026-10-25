# anim-rig - implementer report (2026-10-20)

Built: toe joints (toeL / toeR) in the game LODs and the runtime rig, toe pitch from the planted foot's roll, an
optional keyed wrist frame in the key format and sampler, two sling sockets (back, hip) on Wren's rig. The keyed walk
samples exactly as before (100 samples against the old sampler's output). Cost: `docs/anim-rework/RIG.md`.

## Files
- Bake / export: `scripts/operators/py/bake_lods.py` (GAME_JOINTS + toes), `scripts/operators/toe-skin.mjs` (new; toe
  weights on baked LODs), `scripts/operators/README.md`.
- Assets: `src/operators/assets/wren/wren-lod0/1/2.glb` (JOINTS_0 / WEIGHTS_0 only; sizes unchanged; hero unchanged).
- Key bake: `scripts/anim-keys/py/key_clip.py`, `scripts/anim-keys/build.mjs` (optional `wrist` key).
- Sampler: `src/anim/keyed.ts` (optional wrist channel). Toe pitch: `src/anim/toeRoll.ts` (new, pure).
- Runtime map: `src/operators/runtime/pose.ts`, `figure.ts`, `manifest.ts`; sling data `src/operators/handFrame.ts`
  (`WREN_SLING`), applied in `src/operators/runtime/playerFigure.ts`.
- `src/player/characterRig.ts`: nodes toeL, toeR, slingBack, slingHip; 2 lines feed the toe pitch; 5 lines apply a keyed
  wrist frame.
- Tests: `tests/animRig.test.ts` (10), `tests/fixtures/keyed-walk-before.json`, `tests/operatorsRuntime.test.ts`,
  `tests/helpers/operatorFixture.ts`.

## Assumed decisions
- A1. Toe weights by a Node post-process (`toe-skin.mjs`), not a Blender rebake: a rebake needs the garment blends,
  which need a full operator build that first downloads the MPFB2 base body (a download is Michael's call).
  `bake_lods.py` is changed, so a future rebake skins the toes the same way. Undo: restore the three GLBs, delete the
  script, revert the `bake_lods.py` edits.
- A2. Toe pitch in a new pure module `src/anim/toeRoll.ts`, fed by 2 lines after the legs' first solve; zero in the air,
  traversal and tumbles; up to 1.05 rad on the ball; fades over the first 0.3 of the swing. Undo: delete the 2 lines.
- A3. `keyedArm`: a clip that keys a wrist slerps the free hand's wrist to it by the keyed arm weight; clips without
  one take the old path. Undo: delete the `if (kq.hasWrist)` block.
- A4. Wrist keys: yaw / pitch / roll in degrees in the forearm frame, right hand, the left mirrored. Undo: change
  `wrist_local` in `key_clip.py`.
- A5. Sling sockets are runtime rig nodes from bone-relative offsets (`WREN_SLING`, the `WREN_BACK_MOUNT` /
  `WREN_HOLSTER` pattern): hip = the GLB's `slingSocket` anchor on the pelvis; back = the back plate at the left
  shoulder blade, measured on LOD0 and the hero. Undo: remove the nodes, `WREN_SLING` and 2 lines in `playerFigure.ts`.
- A6. `REQUIRED_JOINTS` includes toeL / toeR. Undo: drop them.
- A7. (rebake, 2026-10-20) The MPFB2 data comes from the official extension zip (`MPFB2_ZIP`,
  `docs/operators/MPFB2.md`), not the pinned repository fetch. Undo: unset `MPFB2_ZIP` (the fetch route is unchanged).
- A8. (rebake) Only LOD0-2 are replaced; the hero file stays (it would gain only the `slingBack` anchor: 55 MB more in
  git history for a node nothing reads). The runtime keeps the `WREN_SLING` offsets, so the LODs' new `slingBack`
  anchor (equal to `WREN_SLING.back`) is unused for now. Undo: copy `build/operators/wren/export/hero/` over the hero.

## Rebake (2026-10-20)
`operators:build wren` (resumed `--from waist_belt`: the earlier blends were the same run's) and `operators:lods wren`
(705 s bake, KTX2), Blender 5.2.2 `-b`. Against the shipped files: same joints, vertex / triangle / primitive counts,
bounds, positions, UVs, normals, rigid ids and anchors (plus `slingBack`); toe weights differ on 71 / 49 / 2 vertices
(ankle / toe split only); textures re-baked. LOD0-2 shipped. `operators:check` not run (its garment checks run Blender
per item and the desktop lock had passed to the next job); the comparison covers its LOD checks' inputs.

## Checks
tsc clean; eslint clean on changed TS; vitest (new + 13 related suites) 152 passed, 1 skipped; under the lock
`npm run check` passed (1968 tests, build); e2e-anim and e2e-clip pass (port 4191); Blender -b: re-baking the walk
reproduced `walk.ts` identically; a scratch clip with wrist keys baked the expected quaternions.

## Open
- GPU look on the PC: the toe bend, the toe box at a deep crouch, the sling socket positions.
- `docs/systems/world-and-characters.md`, CHANGELOG, TESTING: hands off for this job (CT Core / the orchestrator).
- First wrist-frame user: CT Core's knee-hand clip. The Operator Lab now drives the toes too (not checked by eye).
