# anim-skeleton - brief (T3, track C)

Job lead: Night Shift | Menu Notes Build. Branch `feature/anim-skeleton` in `C:/NightShift/Mobile-Coop-anim-skeleton`,
from master 4.35.0 (bee9dc80). Merges after tracks A (`feature/marlow-tuner-t1`) and B (`feature/anim-joints`); rebases
on each of their merges.

## The ask
marlow-bays BRIEF item 21 (Michael, 2026-10-21 ~15:50), from the three "rig change" gaps of
`docs/marlow-bays/COVERAGE.md` (on `feature/marlow-bays`). Michael chose all three: "per-finger control, a real clavicle,
per-key legs."

- **R1 Fingers.** Hands & feet has a curl and a spread per finger, but the figure has one closure shape per hand (the
  mean of five curls); nothing reads spread. Per-finger control needs finger bones on the skinned figure.
- **R2 Clavicle.** The Joints "shoulder" turns the arm's own node in the chest frame (same pivot as the upper arm). A
  shrug or a shoulder pushed forward needs a clavicle node between `chest` and `shL` / `shR`.
- **R3 Legs per key.** Key files carry `legL` / `legR`, but they drive only the Blender preview: the game's legs are
  IK-solved from the foot planner. Per-key hip / knee / ankle / toe needs a leg channel in the clip and an FK leg blend
  in the rig.

Orchestrator's job prompt (2026-10-21): prototype first (the rig change in Blender, `-b` only, one test clip using all
three, the skin following, a screenshot to the orchestrator before the full build); then the clip channels and bake,
the runtime sampler, the tuner registry rows (Joints and Keys) so track A's panel shows them, every existing clip and
the co-op partner unchanged with no tuning (bit-identical test).

## Goal
Michael can curl and spread each finger, shrug and push each shoulder, and key the legs per key, in the tuner, and the
skinned Wren follows, in play and in the studio. Nothing changes for any existing clip, the partner or remotes until
something is tuned or keyed.

## Facts from the survey (2026-10-21)
- Wren renders as a GPU-skinned mesh (Babylon `Skeleton`, 4 influences) driven from the rig's TransformNodes each frame
  (`src/operators/runtime/figure.ts`, `pose.ts`). Voxels are off by default; guards use rigid parts.
- Rig nodes (`src/player/characterRig.ts:911-945`): chest -> shL / shR directly (no clavicle); 21 rig joints, 19 skinned.
- Shipped LODs (`src/operators/assets/wren/`): hero has 30 finger and 10 toe bones (63 skin joints); LOD0-2 have 23
  skin joints, 19 weighted: `bake_lods.py` folds finger weights into the wrist and `build_body.py:139` folds the
  MakeHuman clavicle into the chest. No clavicle weights exist in any built or shipped file.
- **Found:** LOD0-2 have had no grip morph targets since the anim-rig rebake (28c5b3d6, 2026-10-20); only the hero has
  them. So hand closure shows only on the hero (close-up cameras). Finger bones on the LODs replace the morphs.
- Clips: 28 generated `src/anim/clips/keyed/*.ts`; per frame pel 3, q 16, arm 12, optional wrist 8.
  `scripts/anim-keys/py/key_clip.py` already computes the leg FK from `legL` / `legR` but exports only the ankle track.
  Every key file has leg values, so a leg channel must be opt-in per key file or every clip changes.
- Co-op: no pose data on the wire; the partner runs the same `operatorRig` from `MoveState`. No protocol change needed.
- Last full built set: `C:/NightShift/Mobile-Coop-anim-rig/build/operators/wren` (2026-10-20, `wren-lods.blend`
  350 MB). Read and copied from only; never written.

## File areas (marlow-bays BRIEF "Tracks"; cross-track changes go through the orchestrator)
- **Ours (C):** the rig and the skin, `src/anim/clips/*`, `scripts/anim-keys/build*`; and (A1) the unassigned rig
  files `src/anim/keyed.ts`, `src/operators/runtime/*` (`pose.ts`, `figure.ts`, `manifest.ts`, `playerFigure.ts`:
  keep B's `rig.tuneRows = true`), `src/operators/operatorBody.ts`, `src/operators/lodChecks.ts`, `scripts/operators/*`,
  `src/operators/assets/wren/*`, `scripts/anim-skeleton/*` (new).
- **A:** `src/ui/tuner*`, `src/ui/studio*`, `src/anim/studio.ts`, `src/anim/tuneKeys*`, `scripts/anim-keys/*` (except
  `build*`). R3 needs `key_clip.py` to export the leg channel, and the Keys rows need `tuneKeysFile.ts` fields.
- **B:** `src/anim/tuneJoints*`, `src/anim/tuneV2Sections.ts`, `src/anim/tuneBake*`, `scripts/anim-tune-bake.mjs`, row
  plumbing in `src/anim/animGraph.ts` and `src/player/*`. The clavicle and finger Joints rows go in `tuneJoints.ts`.
- **Shared, asked of the orchestrator:** `src/player/characterRig.ts` (the rig is ours, the row plumbing B's): we add
  nodes and apply the new channels; B's row code is left as it is. `src/anim/tuneHands.ts` (unassigned): per-finger
  curl / spread derive.

## Assumed decisions (undo by telling the orchestrator)
- A1: The unassigned rig files above are track C's (rig and skin). Undo: hand them back and route our edits.
- A2: The clavicle is a runtime rig node and a skinned joint, but stays out of `operatorJoints` / `joints.json`, so
  `key_clip.py`'s FK and every clip bake are untouched. Its rest transform is the identity in the chest frame at the
  shoulder's head, so `shL` / `shR` keep their world rest pose exactly.
- A3: Clavicle weights are generated from the chest weights near each shoulder (a smooth falloff split, documented in
  the script) because no source has them. Undo: a body-stage rebuild with MakeHuman's `clavicle` weights (about 2 h).
- A4: Finger joints reach LOD0 and LOD1 (3 per finger, 30 a figure); LOD2 keeps one wrist (distant, cheap). Weights
  from the hero's finger weights by nearest vertex, like `toe-skin.mjs`. The grip morphs are not rebuilt.
- A5: "Bit-identical" is tested on the rig's output: every existing joint's TRS for every clip frame and for the
  partner's rig, untuned, equal to master's bit for bit, and every clip module's data unchanged. The GPU skin is equal
  to float rounding where weights move from wrist / chest onto new joints at rest (tested within 1e-5 m in Blender).
- A6: Per-finger curl and spread live in the clip as scalars (5 fingers x curl + spread x 2 hands = 20 floats a frame),
  not 30 quaternions; the rig turns them into the three segment rotations.
- A7: The leg channel is opt-in per key file (`"legs": true`); the rig blends FK legs over the IK by a per-key weight,
  default 0 for a planted foot, so the planner keeps the feet on the ground unless a key asks otherwise.
- A9: The game's own hand closure (`handGrip`, gun holds) drives the finger bones on every rig, so LOD0 / LOD1 hands
  close again (lost with the grip morphs on 2026-10-20); the hero's grip morphs are switched off where its finger bones
  are driven, so the closure is not applied twice. A visible change that restores the intended look, not tuning: the
  bit-identity test covers every joint that existed before T3. Undo: drive the fingers from the tuner only.
- A8: The test clip is a new key file `skeleton_test` (studio only, never played in the game) that uses all three.

## Limits
CLAUDE.md hard rules and current goal: prototype first, no polish; one implementer and a fresh checker per slice, one
fix round. Blender only with `-b`. Heavy runs (Blender, e2e, GPU shots) take `C:/NightShift/heavy.lock` on the desktop
(the main test machine, full e2e at `E2E_JOBS=2`), or go to Night Shift | Character Build (laptop) when the lock is
held. Message the orchestrator at each slice and PR.
