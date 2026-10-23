# G1 report: guard base bodies

Branch `feature/gm-g1` (off feature/gm-gb 5da3600c). Kit data: origin/feature/guard-models 7488d74d `guards.json`
(P1 fix round), used as an untracked fixture at `scratch/guards.json` (the copy a WIP save had committed is untracked
again). Resumed after an account swap; the prep stage, the joints and the two Python files were already written.

## What
Three male base bodies (`average`, `lean`, `broad`) from the MakeHuman hm08 CC0 body with each base's kit macro, built
larger than Wren (pectoral / latissimus mass fixed, deltoids and neck girth solved), rigged on the game joints for the
base's (height, build), A-pose bind (D13), 33 bones (23 rig joints + 10 fingers, no face bones), 4 influences, head cut
at the SPEC 7 neck seam. Output per base: `bodies/guard-<base>-body.blend` + `.json` (measurements against targets,
seam, bones, LOD bone sets, checks).

## Files
| File | What |
| --- | --- |
| `scripts/operators/guardJoints.mjs` (new) | Pure: a base's 23 bind joints = `operatorJoints(proportions(build, refHeight))` + the clavicles at the SC point (`CLAV_SC`), `shL` / `shR` under them; hit volumes; the anim-skeleton clavicle weight band moved onto the guard's size. export-joints.mjs' file shape. |
| `scripts/operators/guard-prep.mjs` (new) | Stage `prep` (one node job): `joints/guard-<base>.json` for every kit base + the listed MPFB2 data copied into `<out>/mpfb2` (so the bodies jobs need no `export-joints.mjs` step: GB open item). |
| `scripts/operators/py/guard_body.py` (new) | numpy-only fit (no bpy, so G1h can reuse it): macro + G1 targets, LBS onto the game skeleton, torso height field, head scale, secant solve of the deltoid / neck targets, weights (default rig summed onto 31 deform bones, clavicle split, seam blend, top 4), neck loops, the seam, finger bones. |
| `scripts/operators/py/build_guard_body.py` (new) | Entry script of `bodies-<base>` (job contract args + `--kit` / `--out`): armature, skinned body mesh with hm08 index `_mh`, the cut-off head part `guard-<base>-headref` (hidden, for G1h), checks (fail the job), report JSON. |
| `scripts/operators/guardBodyCheck.mjs` (new) | Pure check of a body report against the contract (bones 33 / LOD1-2 23 with the finger fold, influences <= 4, round trip < 0.1 mm, rig rest joints and hit volumes = the game's, dims <= 10 mm, stature <= 12 mm, seam rings, each kind's scale within +-2 %) + CLI for the lead on the laptop outputs. |
| `tests/guardJoints.test.ts`, `tests/guardBodyCheck.test.ts` (new) | Vitest. |
| `scripts/operators/guardBakePlan.mjs`, `tests/guardBakePlan.test.ts` | **Shared (GB's)**, minimal diff: stage `prep` before `bodies` (bodies needs it), bodies script `build_guard_body.py` (Wren's `build_body.py` untouched), `LIBS.bodies` = common, mh, guard_body; lead request: `gear` deps `['bodies']` and each per-base gear job `needs: ['bodies-<b>']` (its hash takes the body job's stored hash, so a rebuilt body rebakes that base's gear; `gear-shield_riot` needs nothing), with a test line. Merge with origin/feature/guard-models (after G3): the .mjs merges clean; `tests/guardBakePlan.test.ts` has one conflict at the `it('scripts match the plan: ...')` title (G3 renamed rigid_skin -> build_gear, G1 added prep). Resolution: title `guard-prep, build_guard_body, build_head, garments/<g>, build_gear, bake_lods`, keep G1's prep / build_guard_body lines. |

Wren: no Wren file changed (`build_body.py`, `mh.py`, `common.py`, `build_skeleton.py`, `bake_lods.py` untouched), so
Wren's outputs stay byte-identical by construction.

## Job contract change (GB-REPORT "Job contract")
- New first stage `prep`: job `prep`, runner node, `scripts/operators/guard-prep.mjs --stage prep --job prep`, outputs
  `joints/guard-<b>.json`, `mpfb2/3dobjs/base.obj`, `prep/prep.json`. Its hash covers the game TS it reads
  (proportions, operatorBody, clavicle, skeleton.json, the MPFB2 list).
- `bodies-<b>`: script `build_guard_body.py` (was `build_body.py`), `needs: ['prep']`; outputs as in the contract.
- Laptop request: two steps, `--stage prep` then `--stage bodies` (a bodies job whose prep has no stored hash is
  blocked, not run).

## Numbers
Fit of all three bases (guard_body.py, the same code the job runs, under Blender's bundled Python without bpy; 2-3 s
each). Errors in mm; every solved dimension 0.0 unless listed.
| Base | Stature (target) | Shoulders bideltoid | Chest girth | Neck girth | Solved deltoid / neck | Seam y (loop) |
| --- | --- | --- | --- | --- | --- | --- |
| average | 1.766 (1.77, -4.5) | 0.515 | 1.064 | 0.401 | 0.98 / 0.84 | 1.563 (1.548) |
| lean | 1.756 (1.76, -4.3) | 0.487 | 0.974 | 0.351 | 0.54 / 0.25 | 1.554 (1.540) |
| broad | 1.820 (1.825, -5.3) | 0.582 (target 0.585, -2.4) | 1.240 | 0.476 | 1.00 / 1.00 + neck bone x1.26 | 1.611 (1.596) |
- Every base: 18,568 body tris (9,306 verts), head part 8,188 tris, 33 bones, max 4 influences, 0 unweighted, seam
  loop 42 verts. Kinds' uniform scale from the base: all within +-1.7 % (officer 1.80 on average 1.77 is the widest).
- Desktop smoke (one job under heavy.lock, taken on the 5th try after merge-train 35 released it):
  `guard-bake.mjs --stage bodies --only broad --par 1` (prep already built): ok, job 16 s (Blender run 7.2 s), 18,568
  tris, 9,306 verts, 33 bones, 4 influences, 0 unweighted, stature 1.820 m (-5.3 mm), bideltoid 0.582 (-2.4 mm), chest
  girth 1.240, neck girth 0.476, every other dimension 0.0 mm, joint round trip 5.6e-8 m, deform check max move 0.69 m;
  `guardBodyCheck.mjs`: ok. Earlier (before the swap, older kit): `bodies-average` ok, 5 s, round trip 5.0e-8 m. Lean
  ran only as the numpy fit.

## Decisions I assumed
- Targets: the rig's proportions for what the hit volumes follow (hips, waist, chest depth, head); ANSUR II male means
  x stature / 1.756 x the build's chest / girth mod for chest and neck girth; bideltoid = the rig shoulder width x 1.04
  (SPEC 1 "shoulder and chest girth up, neck thicker"). Stature is not solved (the A-pose legs move the soles a few mm,
  as Wren).
- Broad: the deltoid and neck targets saturate at 1.0; the neck bone's breadth / depth scale (x1.26) takes the rest of
  the neck girth, the bideltoid stays 2.4 mm short (inside the 10 mm limit).
- Budgets (PLAN 5): G1 enforces bones (33), influences (4) and the joint checks. The body's 18.6 k tris are the whole
  hm08 body below the seam; the 1,200 / 400 / 150 body budget is the skin left visible once the outfit is on, which
  G2's cover cut and G4's decimation produce. The 8.2 k-tri head part is G1h's input (its own 4,000 budget).
- Finger bones: one per finger (1 = thumb), head at the MCP (thumb CMC), tail at the tip, Z to the back of the hand
  (curl = turn about X). The report's `lodBones` gives G4 the sets: LOD0 33, LOD1 / LOD2 the 23 rig joints with
  `fold` (finger -> wrist) and influences 4 / 4 / 2. Wren's `bake_lods.py` keeps fingers on LOD1 (`FINGER_LODS`), so
  G4's guard mode must read `lodBones`, not Wren's set.
- The clavicle weight split is done in G1 (from skeleton.json's band, scaled to the guard); G4 must not split again.
- Kinds: the game's strings in `src/config/enemies.json` match the contract.

## Tests
- `npx vitest run tests/guardJoints.test.ts tests/guardBodyCheck.test.ts tests/guardBakePlan.test.ts`: 3 files, 44
  passed (guardJoints 7, guardBodyCheck 9, guardBakePlan 28, incl. the gear needs line).
- `npx tsc --noEmit -p .`: clean (fixed 4 strict-index errors in guardJoints.test.ts). `npx eslint` on the test files:
  clean (`scripts/**/*.mjs` is outside the lint set).

## Open items
- Full stage on the laptop (lead books it): `guard-bake.mjs --stage prep`, then `--stage bodies` (3 jobs, `--par 3`),
  then `node --import ./scripts/operators/ts-resolve.mjs scripts/operators/guardBodyCheck.mjs --kit <guards.json>
  <out>/bodies/guard-*-body.json`. Needs guards.json at `scripts/operators/data/` (feature/guard-models) or `--kit`.
- G1h: reuse `guard_body.GuardFit` + `neck_seam(at)` for the same seam vertices (hm08 index `_mh`, rings -2..2 and
  `headShare` in the report), or start from `guard-<base>-headref` in the blend.
- G4: fold the fingers per `lodBones` (LOD1 too), keep the clavicle split as baked.
- `scripts/operators/py/__pycache__/common.cpython-313.pyc` is tracked in the repo and Blender rewrites it on every run; left unstaged (not committed).
- Not checked here: `operators:check` body checks for guards (G4's `check_guard.py`).

## Fix round (checker PASS with findings; lead rulings)
Branch `feature/gm-g1fix` off feature/guard-models 955b8311.

| Item | Done | What |
| --- | --- | --- |
| B1 | y | `gear-shield_riot` `needs: ['bodies-broad']`: an own-GLB gear job needs the body of each base whose kinds list the piece (`pieceUse`); a kit without kinds falls back to `OWN_GLB_BASE` (`shield_riot: 'broad'`, mirrors gear/pieces.py `SHIELD_BASE`). Test: fixture and real kit, the needs line and the input. |
| X1 | y | Finger bones renamed to Wren's scheme `finger<S>_<f>_1` and rolled to Wren's axes (below). guards.json `bones.fingers`, SPEC 6, `lodBones`, guardBodyCheck and the tests follow. |
| X2 | y | `seamTransforms` in the body report (below); `guard-<b>-headref` still ships with `_mh`. |
| P1 | y | Neck-scale fallback only once the neck weight already sat at +-1 and still wants past it. |
| P2 | y | Prep hash takes `{id, refHeight, build}` per base only (test: mounts / faceTiles leave it, refHeight changes it). |
| P3 | y | Report `height` (= refHeight) and `bindJoints.handL` / `handR` (the fingertip ends, lifted like the rest). |
| P4 | y | Report `crownY`; note for G3 below. |

### X1: finger names and axes
- Names `fingerL_1_1..fingerL_5_1`, `fingerR_1_1..fingerR_5_1` (f 1 = thumb), so `FINGER_RE` (`src/anim/fingers.ts:97`)
  matches. Vertex groups carry the same names (garments/suit.py's `finger<S>_1_1` / `_2_1` thumb-loop lookups work).
- Roll (guard_body.fingers(), game frame): fingers 2-5: local Z = y x palm (right), palm x y (left), so a turn about
  +Z right / -Z left (fingers.ts:141) closes the tip toward the palm. Measured first on Wren's hero file: her roll-0
  bones give the same axis to dot 0.98-0.999, so this is "Wren's sense". Thumb: rolled so fingers.ts `THUMB_AXES[0]`
  (opposition) lands on Wren's opposition axis taken from wren-hero.glb in the hand frame (`WREN_THUMB_FLEX`): dot 0.995
  on every base.
- In Blender the game frame is mirrored: game-local axis l = Blender-local (lx, -ly, -lz), so a curl is -Z (right) /
  +Z (left) there. The job reads the roll back (Blender local Z through the frame map = the intended axis, error
  `fingerAxes.rollErrorDeg`, fails above 0.5 deg).
- Deformation check (was build_guard_body.py:192, +60 deg about X): now each finger turns 60 deg about its fingers.ts
  axis in the Blender frame; the job fails when a finger (2-5) tip does not move toward the palm (`towardPalm` = the
  tip move . the palm direction normal to the bone; a clean 60 deg curl gives 0.866, limit 0.5). Per finger in
  `deformCheck.fingerCurl`.
- guardBodyCheck `checkFingerAxes`: builds the bind frames from the report (`fingerBones[].zAxis`, `palm`), runs the
  game's own `fingerRig` + `fingerPose` (full curl) and checks every finger closes toward the palm (> 0.5; G1 bake 0.77
  = cos 40 deg, the 80 deg MCP), the names, both thumbs' `thumbFlexDot` >= 0.95.

### One-segment fallback (for G5 / G7: `src/anim/fingers.ts`, `src/operators/runtime/guardFigure.ts`; not edited)
`fingerRig` / `fingerPose` work unchanged on the guard (regex `_1` matches, knuckles are segment 0, splay sign from the
knuckles, `pose.ts` hang / chain by the `finger<S>_` prefix). What is lost with one segment:
- `fingerPose` turns segment 0 only: a finger closes by the MCP's 80 deg at curl 1 (`FINGER_MAX_DEG[0]`), not 80 + 95
  + 65 down the chain; the thumb only opposes by 35 deg (`THUMB_MAX_DEG[0]`), its MCP 40 / IP 45 flex never happen.
  The hands will read half open on the grip.
- Fallback to add there (G5 / G7): when a finger has no segment 1 / 2 joint, turn its segment 0 by the chord angle of
  the 3-joint curl (MCP to tip direction of a 0.5 / 0.3 / 0.2 phalanx chain at curl x FINGER_MAX_DEG): about 70 deg at
  curl 0.5, 115 deg at 0.85, 132 deg at 1. A rigid one-bone finger cannot shorten, so cap it near 100 deg or the tip
  passes into the palm (check on the 1.5 m crops). Thumb: segment 0 by THUMB_MAX_DEG[0] about THUMB_AXES[0], then
  the MCP + IP flex as one turn (about 40 deg at curl 1) about `THUMB_AXES[1]` read in the same bone frame.
  One flag per joint in `FingerRig` (`single: Uint8Array`) keeps `fingerPose` allocation-free.

### X2: the head in the body frame (`seamTransforms`)
`makeHuman` {scale 0.1 K, flipX, floorY, K}: the MakeHuman frame `V0` = GuardFit.co() through `to_game`. `neck` / `head`
{matrix, translation}: the bone maps the skin applies there, floor lift folded in (body = A V0 + t). `similarity`:
the best uniform scale + translation (body ~ s V0 + T) over the seam loop and over the head part, with residuals.
Numbers (numpy fit, all three bases):
| Base | head map diag | seam similarity s (rms / max mm) | head part s (rms / max mm) | floor lift |
| --- | --- | --- | --- | --- |
| average | 0.912, 1, 0.987 | 0.957 (2.2 / 3.8) | 0.961 (3.9 / 22.2) | -4.8 mm |
| lean | 0.912, 1, 0.995 | 0.934 (2.3 / 3.6) | 0.963 (3.9 / 22.3) | -4.7 mm |
| broad | 0.912, 1, 0.986 | 1.041 (3.3 / 6.4) | 0.962 (4.2 / 25.2) | -5.7 mm |
The head map is not uniform (x 0.912: the rig head width) and the seam ring mixes the neck and head maps, so no single
uniform transform welds the seam (residual up to 6 mm): use per-vertex positions.

### For G4 (and G1h's fix)
- G1h's fix builds every head at the body fit's head-part positions `V[hv]` (`GuardFit(mpfb, op, macro).solve()`),
  so the 42 seam vertices are the body's own (hm08 index `_mh` = the body's `_mh`): weld by `_mh`, no transform.
- For a head built in the MakeHuman frame (G1h's first bake): body-frame vertex = headref[_mh] + J (h0 - V0[_mh]),
  where h0 is the variant's vertex through `to_game`, V0 the base's (`guard-<b>-headref` holds the body-frame V; J =
  the `head` map's matrix, or the `similarity.headPart` scale as an approximation). Seam vertices: face targets leave
  them, so h0 = V0 there and they land on the body exactly.
- `lodBones.fold` now names `finger<S>_<f>_1`; G4's guard mode reads it (unchanged rule: LOD1 / LOD2 fold the fingers).

### For G3 (P4)
gear/fit.py:113-115 takes the crown as `height - bindJoints.head.y`. The body's head joint already carries the bind
floor lift (-4.8 mm average, -4.7 lean, -5.7 broad), so that crown is ~5 mm high against the real head. Read the body's
`crownY` (top of the head, feet on y = 0) and `bindJoints.head` instead.

### API note (G1h's fix depends on it)
`GuardFit(mpfb_dir, op, macro, extra_targets=None)`, `solve()` and its result keys (`V`, `V0`, `tgt`, `M`, `lift`, `m`,
...), `neck_seam(at)` and `skin_weights(...)`: unchanged. `fingers()` returns the new names with `zAxis` / `palm` added;
`seam_transforms(seam)` is new. Numbers that moved with P1: average's neck weight now 1.0 with neck scale 1.051 (was
0.84 with 1.086); lean and broad unchanged (lean 0.25 / scale 1.0, broad 1.0 / 1.257). Every solved dimension still 0.0
mm (broad bideltoid -2.4 mm as before).

### Smoke (desktop, one job under heavy.lock)
SMOKE_PLACEHOLDER

### Tests
TESTS_PLACEHOLDER

### For other slices
- G2: `height` and `bindJoints.handL` / `handR` are in the report; finger vertex groups are `finger<S>_<f>_1`.
- G4: fold per `lodBones` (new names); weld heads by `_mh`.
- G5 / G7: names and axes now match `fingerRig` (`guardFigure.ts:149`); the one-segment fallback above is theirs.
- G3: crown from `crownY` (above).
- The laptop bodies bake booked before this round must be rerun (names, rolls, report fields).
