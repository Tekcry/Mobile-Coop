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
Ships with S3 in one PR (orchestrator, 2026-10-22). Starts from master after B's #90 (J2) merges; #91 (A's add /
delete keys) is in master as 4.43.0. Design (2026-10-22, docs only):
- **Joints: clavicles only.** Add `clavicleL` / `clavicleR` to `tuneJoints.ts` JOINTS (B's file; two entries, the L / R
  suffix gives the mirror pair; `tuneV2Sections` makes the pitch / yaw / roll sliders from the list with no edit). The
  rig reads the composed value (base table + tuner delta, like B's other rows) in our `clavFrame` and adds it to
  `rig.clavIn`; B's `jointOffsets` code is not touched. Named in the PR body. Axis words for the panel ("Shrug", "Push
  forward", "Tilt") go to Course Ready's `tunerLayout.ts` only if it wants them (its file).
- **Fingers: no new Joints rows.** Hands & feet already has curl and spread per finger and per weapon / state, and
  since S2 they move each finger on its own. Per-segment finger rows (45 per hand) would clutter the panel for no
  gain at the prototype stage; `tuneHands.ts` needs no edit.
- **Keys fields** (A's `tuneKeysFile.ts` KEY_FIELDS, appended; superseded below: shown on every keyed clip; was: only opt-in `clav` /
  `fingers` / `legs`, so the 28 clips' panels are unchanged): `armX.clav.{pitch, yaw, roll}`;
  `handX.{thumb..little}.{curl, spread}`; `legX.{flex, add, knee, ankle, toe, w}`. Added keys (#91) copy every field.
- **Live key edits**: `KeyedOffsets` (our `keyed.ts`) gains `clav`, `fing`, `leg` arrays and flags like `wrist`;
  `tuneKeys.ts` (A) builds them from the new fields the same way it builds the arm / wrist offsets, append-only next to
  that code. Legs: the edit offsets the clip's FK channel, so it shows only where the key's `w` > 0 (the panel hint
  says so).
- **Bake**: key edits write the new fields into the key JSON (the existing keys bake path, generic over KEY_FIELDS: check
  it writes nested `handX.<finger>` objects; extend append-only if not), then the Blender rebake of that clip.
- **Every keyed clip (Michael via the orchestrator, 2026-10-22: per-key legs, collarbones and fingers on the real
  clips: jog, run, walk, idle ...).** The new Keys fields show on every keyed clip, not only opt-in ones. A clip opts in
  automatically the first time one of those fields is edited; the bake then sets its key file's flag and writes the
  channel. Untouched clips stay byte-identical.
- **Legs over the planner.** On the real clips the feet must stay on the foot planner, so a leg key edit is a
  per-joint DELTA on the solved IK leg (hip pitch / yaw / roll, knee, ankle pitch / roll, toe), keyed and interpolated,
  shown live at once with no weight to raise. New optional runtime channel `legd` (per side 7 floats, 14 a frame) in
  our `keyed.ts`, applied in the rig right after the S3a FK blend (the same place, so the preview shows the edit over the
  planner), zero = untouched. Key JSON: `legX.d.{hipPitch, hipYaw, hipRoll, knee, anklePitch, ankleRoll, toe}` (deg);
  key_clip.py writes `legd` when any key has a non-zero delta. The S3a FK takeover (`legs` flag, `w`) stays for clips
  authored with FK legs like skeleton_test; the panel shows `w` only there.
- **Planted feet never slide (orchestrator, 2026-10-22).** While a foot is planted (the planner's contact state for
  that side), the delta is not applied raw: the leg is re-solved to the plant with the delta folded in (hip and knee
  deltas become a knee-pole / bend change that keeps the foot on the plant; ankle and toe deltas turn the foot about
  the plant point), so the foot stays put. On the swing leg the raw delta applies. A blend between the two over the
  planner's contact weight so nothing pops at lift-off / touch-down. Test: a knee or hip delta on jog's contact key
  leaves the planted foot within 0.5 cm of the no-delta plant.
- **Foot slide readout in the studio.** The rig exposes `rig.footSlide` (per side, cm the planted foot moved this
  contact; no allocation); the studio shows it. The readout's UI is in Course Ready's studio files (A): we ask it to
  add one line reading `rig.footSlide`, or add it with its OK.
- Track A lines and the B entry are sent to Course Ready and CT Core before editing.
Done: check; e2e-studio (the Keys tab lists the new fields for skeleton_test; the Joints tab shows the clavicles);
the S2 identity tests unchanged; an old tuner export still loads (identity); a GPU shot of a clavicle row moved.

## S4b - exact preview (marlow-bays BRIEF item 30(e), Michael approved; with or after S4)
"Exact preview: the live preview samples the same Bezier curve as the Blender bake, so the in-betweens don't shift
after a rebake." The key edit offsets (`KeyedOffsets`, built per key by `tuneKeys`) are spread over the clip's frames
in `keyed.ts`; today that spread is not the bake's curve. Change (ours, `keyed.ts`): spread each key's offset over the
frames with the same interpolation key_clip.py gives Blender (its keyframe interpolation and handle type: Bezier,
the auto / auto-clamped handles Blender computes, cyclic extrapolation; read key_clip.py `curves()` / `set_pose` for
the exact settings) as a pure, allocation-free evaluator. Test: for a few clips and an edit on one key, the preview's
sampled frames equal a rebake's frames within float noise (a fixture from one Blender run). Applies to the new S4
fields as well.

## S5 - finish
Rebase on A's and B's merges, the bit-identity test re-run, docs (`CHANGELOG` Unreleased - anim-skeleton, `TESTING.md`,
`docs/systems/world-and-characters.md` rig section, `docs/operators` LOD note), full e2e, PR to master.
