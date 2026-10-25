# tuner-v2 item 2 - check (fresh checker, 2026-10-21, b8bc1846)
**PASS.** tsc clean; vitest tuneHands + tuneJoints + animRig 33/33. No build, no e2e (per brief).
- Identity: real `CharacterRig`, 90 frames, values only in other states / weapons (incl. IK 0 in `run`) `toEqual` no window; meaningful. Every rig hook sits behind `HANDS_CUR.on` plus a per-part flag; `ikStrength` returns at s === 1.
- Gun scale visual only (code path read): `tuneVisual` moves only `mesh` / the seated `magMesh` (children of `node`, base pose identity, not pickable); `node`, `muzzleLocal`, grip points untouched; `muzzleWorld` reads `node`; aim ray from the camera. Test asserts muzzle, node and trigger wrist equal.
- IK strength: one line before item 1's `jointOffsets` (arms and legs); 1 = early return (today's IK exactly); 0 = nlerp to rest (identity) so only item 1's offsets remain. Eases per state (tau 0.06 s), as item 1.
- Easing: state and weapon change ease, snap 1e-6, trigger mode at once; tested. Hot path: scratch arrays / vectors, index loops; the only `new` is a once-per-mesh `??=` quaternion.
- `weaponModel.ts`: `heldModel` set in `hold` / draw, `tuneVisual(null)` on inHand / holster, cleared on dispose. Remotes, guards, menus animate outside the `handsBegin` / `handsEnd` window, so `tuneVisual(null)` is a no-op there (`tuned` false). No wire or save-version change.
- Save / export: `hands` key added only when non-default; old records load as default; tested.
- Gaps honest and fine for a prototype: no finger joints (curl = mean of 5 on the one grip morph; per-finger and spread stored, not shown), trigger off = full wrap, launcher by node name (no launcher exists), primitive / voxel guns not scaled. Finger joints need rig and figure art: not a cheap fix, leave for later.
- Michael's ask: hands on guns yes (per weapon and state: IK target offset, hand rotation, support slide / offset / rotation); gun size yes (visual, baked meshes); fingers partly (overall curl per hand, trigger on / off).

## Recommended (cheap, not blocking)
1. `tests/tuneHands.test.ts`: add a rig case with `ikSet(<active state>, handR, 0)` plus an item 1 offset on `elbowR`: the right arm moves, then equals rest + the offset; the left arm and legs unchanged. Done: the active-state IK path has a test (today only "other state never applied").

## Polish
- Muzzle flash / tracers still start at the gameplay muzzle, so at gun scale not 1 they sit off the visual tip.
- Reload with a tuned gun: the mag seats to the untuned well, then jumps to the tuned pose (`magSeated` reset, then re-tuned).
- A weapon switch carries the eased gun scale onto the new gun for about 0.2 s.
- IK strength 0 on an arm also removes the item 2 hand rotation (wrist blended after `handsRotApply`).
- JSDoc placement: the `tuneSupport` doc sits above `ikStrengthLimbs` (characterRig ~2563); the "Builds a weapon" doc now sits above the scratch consts (weaponModel ~116).
