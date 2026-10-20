# tuner-v2 item 1 - per-joint offsets per state
**Data** (`src/anim/tuneJoints.ts`, pure): 21 joints (`JOINTS`, index `J.<name>`): pelvis, spine, chest, neck, head,
then L/R pairs shoulder, upperArm, elbow, wrist, hip, knee, ankle, toe. Per tuner body group (`BODY_GROUPS`, 20 states) x
joint x 3 axes, degrees (x = pitch, y = yaw, z = roll, the rig's `RotationYawPitchRoll` order), range +-180, step 0.5,
default 0. Flat `Float64Array`s: degrees, the precomputed offset quaternions (rebuilt on edit) and a live flag per joint.
**Hook.** `player.ts`: `jointsBegin(TUNE_STATE.body)` / `jointsEnd()` around the local player's `rig.animate`, inside the
`tuneBegin` window (local player only; remotes, guards and other rigs never see it, like the current tuner).
`characterRig.ts` `jointOffsets(part)`, each call guarded by `JOINTS_CUR.on`: (0) pelvis, spine, chest, neck after the
procedural + keyed trunk, before leg and arm IK; (1) hips, knees, ankles, toes after the last leg re-solve, before the
legs' rate limit; (2) head after the look; (3) shoulders (chest frame, `off * q`), upper arms, elbows, wrists (own frame,
`q * off`) after arm IK + keyed arm, before the elbow self-collision. Hot path: one flag check, then a table lookup and a
quaternion multiply per live joint; no trig, no allocation.
**Assumed (A, undo: move the calls).** The legs and arms are pure IK in this rig, so their offsets go on the solved pose
(an offset there moves the foot / hand off its target; placement is item 2). The rig has no clavicle: "shoulders" turn
the arm node in the chest frame, "upper arms" in the arm's own frame. Joint offsets have no change-log entries (the
registry's log comes with the panel wiring).
**Mirror.** `jointsMirror(on)`: editing a L/R joint writes the partner with pitch kept, yaw and roll negated (bones rest
at identity in the body frame; same as `mirrorKeyed`). Off by default, saved; turning it on rewrites nothing.
**API (panel).** `jointsGet(group, joint, axis)`, `jointsSet(group, joint, axis, deg)` (clamps, mirror, returns changed),
`jointsReset(group, joint)`, `jointsResetGroup(group)`, `jointsResetAll()`, `jointsMirror(on?)`, `jointChanged`,
`jointsGroupChanged`, `JOINTS_HOOKS.changed` (fired after edits, for save / redraw), `JOINT_RANGE`, `JOINT_AXES`.
Save / export: `jointsAttach(tuneSnapshot())` before `saveAnimTune`, `jointsAttach(tuneExport())` for Export (adds the
`joints` key only when something is set, else returns the record unchanged); `jointsLoadFrom(record)` after `tuneLoad`.
`tuneLoad` ignores the extra key; a record without it (every 4.20 save) loads as all zero. Snapshot shape:
`{ version: 1, mirror, values: { <group>: { <joint>: [x, y, z] } } }`, non-zero joints only.
**Identity proof** (`tests/tuneJoints.test.ts`, 9 tests): all defaults 0 and the window off; `jointApply` leaves q
bit-identical (incl. -0) for every zero joint even with other joints live; a real `CharacterRig` walked 90 frames is
`toEqual` bit-identical with the window on and every walk value 0, and outside the window; a walk wrist offset changes
only the wrist (trunk, legs, head, shoulders, elbows bit-identical). Also: `eulerQuat` = Babylon, frame order, mirror
(quaternion is the (x,-y,-z,w) mirror), clamp / NaN / hook / resets, save round trip, literal old record, junk skipped.
**Files.** New `src/anim/tuneJoints.ts`, `tests/tuneJoints.test.ts`, this file. Hooks in `src/player/characterRig.ts`,
`src/player/player.ts`. Not touched: `tune.ts`, the panel, `animTuneStore.ts`, `footPlanner.ts`.
**Results.** tsc clean; eslint clean on the 4 touched files; vitest tuneJoints + animTune + animRig 39/39. **Skipped:** `npm run check` and e2e (smoke, e2e-anim, e2e-menus): `heavy.lock` held by marlow-bunker (00:13).
**Fix round 1 (CHECK1 fix 1).** The applied offsets now ease: `jointsBegin(group, dt)` keeps a current buffer (21 x 4,
preallocated) and nlerps it toward the active row with `JOINT_EASE_TAU` = 0.06 s (exponential, the rig's `approachTo`
0.06 s; ~95% in 0.18 s), so arm offsets (hooked after their `limitJoint`) no longer snap on a state change; within 1e-6 of
the target it snaps exactly, so all-zero stays bit-exact and a settled row is exact. `player.ts` passes `dt`; the default
(`Infinity`) jumps to the row. `jointsLoad` resets the buffer. `JOINTS_CUR.base` removed (the buffer is per joint).
Tests +3 (12): unit ease walk elbowR 40 -> run 0 (partial first frame, strictly down, >= 3 frames, then off and
bit-identical); all zero with dt never opens the window; real rig walk -> run eases >= 3 frames, then every node `toEqual`
the untuned rig.
**Polish (panel hint).** With a gun held, shoulder / upper-arm / elbow / wrist offsets pull the hand off the grip until item 2
places the hands; `keepElbowOut` may partly undo a shoulder offset into the trunk.
**Panel (wired, `docs/tuner-v2/WIRE.md`).** Section **Joints** (`src/anim/tuneV2Sections.ts`, registry id `joint`): groups
`joint.<state>` (20) with sliders `<joint>_<x|y|z>` (63, deg, +-180, step 0.5), plus `joint.options` with the mirror lock
(`mirror`, 0 / 1). The registry is the source (save, export, log, pad); `tuneV2Frame` copies the active state's row into
this table each frame where it differs. Mirror: the sync mirrors a single-side panel edit (table and registry); item 1's
own `jointsMirror` flag is held off. The `joints` save key (`jointsAttach`) is not used by the panel.
