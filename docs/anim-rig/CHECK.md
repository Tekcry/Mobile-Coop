# anim-rig - check (fresh checker, 2026-10-20)

Reviewed `git diff 65c5ffcd bf6086fe` (head bf6086fe). Ran: `npx tsc --noEmit` (clean); vitest `tests/animRig.test.ts`,
`tests/operatorsRuntime.test.ts`, `tests/operatorLods.test.ts`, `tests/operatorsRuntimeFigure.test.ts` (49 passed, 1
skipped); read-only node scripts over the base and head GLBs. Not re-run here: `npm run check`, e2e-anim, e2e-clip
(the implementer reports them green under the lock).

## Verdict: PASS

No broken or unplayable work found. Nothing blocks the merge.

## Findings
1. GLBs (`src/operators/assets/wren/wren-lod0/1/2.glb`): against `65c5ffcd` the JSON chunk and file headers are
   byte-identical, file sizes unchanged, and every changed byte lies inside JOINTS_0 / WEIGHTS_0 views (lod0 9976, lod1
   1203, lod2 142 bytes; 0 outside). toeL / toeR were already skin joints in the base files (same skin order), parented
   under anL / anR. Weights: every vertex sums to 1 (max error 1.3e-7), 4 influences. Changed vertices: lod0 1888,
   lod1 321, lod2 77; every one was ankle-weighted before, every one now carries a toe weight, none is a rigid part,
   and the ankle + toe total equals the old ankle weight on each (no slot stealing happened). Toe-weighted vertices sit
   ahead of the ball in the toe joint's frame (at most 1.4 cm behind it: the blend band), toeL on +x, toeR on -x.
   Hero GLB unchanged (keeps its per-toe bones under toeL / toeR). `toe-skin.mjs` nearest-hero-vertex transfer is the
   bake's own nearest-body rule in the same mesh frame (it checks the frames match, `toe-skin.mjs` meshFrame); it is
   idempotent: `toeSkin(..., { check: true })` on the head files returns "already skinned" for all three.
2. Runtime map: `RIG_JOINTS` appends toeL / toeR (`src/operators/runtime/pose.ts:18-24`), `RIG_PARENT` 19 -> 15 (anL),
   20 -> 18 (anR); `rigNodes` (`figure.ts:61-66`) appends `r.toeL, r.toeR` in the same order; `RigLike` gains the two
   nodes; `REQUIRED_JOINTS` (`manifest.ts:26-29`) adds them. The poser drives the hero's per-toe bones through the
   ancestor walk to toeL / toeR (`pose.ts` poserSetup driver), as the updated `operatorsRuntime.test.ts:183` asserts.
   Every user of the operator figure (player, `src/net/remoteAvatar.ts`, `src/world/menuScene.ts`) builds a
   `CharacterRig`, which now has the nodes (tsc clean). The only shipped operator assets are Wren's four GLBs, all with
   toe joints; no Moth GLB ships; the test fixture (`tests/helpers/operatorFixture.ts:31`) gained toeR (toeL was already
   there). No other asset lacks them.
3. Toe pitch (`src/anim/toeRoll.ts`, `characterRig.ts:1879-1881`): 0 when `free` (`!grounded || traverse !== 'none'`,
   `characterRig.ts:1538`; the free branch also zeroes the planner pitch), 0 for a heel-first or flat foot, `-pitch`
   clamped to 1.05 rad on the ball, smoothstep fade over the first 0.3 of the swing. Sign proven by the rig test (foot
   tips down > 0.19 while the toe forward stays within 0.2 of level). Allocation-free (RotationYawPitchRollToRef into
   the node's own quaternion; the pure function allocates nothing). Placed right after the leg solves; no early return
   in `applyTargets` skips it.
4. Wrist frame: the fixture `tests/fixtures/keyed-walk-before.json` really is the old sampler's output: I bundled
   `git show 65c5ffcd:src/anim/keyed.ts` with the unchanged `walk.ts` and replayed all 100 samples (amps 1, 0.6, 0.25,
   0): 0 mismatches, exact equality. The refactored hemisphere loop is equivalent to the old one (old f = N was
   guarded off). Format agrees across `key_clip.py` (samples carry `wrist`, 8 per frame, L then R, hemisphere-kept),
   `build.mjs` (emits `wrist:` only when present) and `keyed.ts` (`KeyedClipDef.wrist?`, `KW`, length check). Left
   mirror: yaw and roll negated, so (x, y, z, w) -> (x, -y, -z, w), which is the mirror across the sagittal plane; the
   Blender-baked constants in the test match. `keyedArm`'s wrist block (`characterRig.ts:2131-2136`) uses the module
   temp `kT`, no allocation.
5. Sling sockets: `slingBack` under `torso` (chest), `slingHip` under `hips` (pelvis), exposed as named rig nodes
   (`r-slingBack`, `r-slingHip`); Wren's `WREN_SLING.hip` equals the GLB `slingSocket` anchor with x mirrored to the
   game frame (glTF 0.1349 -> -0.1349, left rear of the belt), back socket at the left shoulder blade. No weapon code
   changed.
6. Hands-off files: none of src/input, src/core/settings.ts, src/player/player.ts, playerController.ts,
   src/game/gameState.ts, takedownController.ts, grab / context menus, src/weapons/playerWeapons.ts, drawState.ts,
   src/ui, CHANGELOG, TESTING is in the diff. No em dashes added; no Math.hypot in the new code (the test's
   `Math.hypot` is test-only).

## Polish / notes (non-blocking)
- The brief allowed `characterRig.ts` "bone mapping only (no pose code)"; the toe lines (2) and the wrist block (5) are
  pose code. Logged as A2 / A3 with undo; small and isolated, so accepted.
- The wrist frame only applies inside `keyedArm`, which is gated off while the knee hand is on
  (`characterRig.ts:2053`, `this.kneeHandW === 0`). The knee-hand clip that CT Core plans needs its own path to use
  the wrist frame: note it for that job.
- The toe rotation is only written in `applyTargets`; any pose path that skips it (a scripted or ragdoll pose, if one
  exists) keeps the last toe pitch. Worth a glance when the takedown / body poses are reworked.
- `docs/anim-rig/STATE.md` still shows the pre-implementation "Now"; the job lead updates it.
- GPU look (toe bend, deep crouch toe box, socket placement) is pending a PC run, as REPORT.md says.
