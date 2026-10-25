# tuner-v2 item 1 - CHECK (d09b32ec..c32e7c26)
**Verdict: FIX (one item).** vitest tuneJoints + animTune + animRig 39/39; `tsc --noEmit` clean. No build / e2e here (laptop).

**Fix**
1. `src/anim/tuneJoints.ts` (+ the `player.ts` call): the arm offsets pop on a state change. Hook 3 runs after
   `limitJoint(shoulder*/elbow*)` and the wrists have no limit, so walk (elbow +40) -> run (0) snaps in one frame; the
   trunk, legs and head hooks sit before their `limitJoint` and ease. Change: keep a current offset buffer (21 x 4) that
   `jointsBegin(group, dt)` eases towards the active row (nlerp at a joint-rate-like speed, no trig, no alloc); a joint is
   live while its current or target offset is non-identity; snap to exact (0,0,0,1) once within ~1e-6 so identity stays
   bit-exact. `jointApply` reads the buffer. Done: a test switching walk(elbowR 40) -> run(0) eases over >= 3 frames, and
   after settling the rig is `toEqual` the untuned baseline (the existing 9 tests still pass).

**Checked OK.** Identity: all zeros -> `JOINTS_CUR.on` false, hooks never run. Test is meaningful: chest set in `run` with the `walk`
  window stays bit-exact, and a walk wrist offset changes only the wrist branch over 90 real-rig frames.
- No drift / no IK fight: every hooked node is rewritten from scratch each frame (trunk eulers, leg solve, toes 1914,
  head `setWorldRot`, `solveArm` writes shoulder / elbow / wrist on all branches); `prevRot` stays consistent. Deterministic.
- Mirror (x, -y, -z): right for this rig (bones rest at identity in the body frame), matches `mirrorKeyed`.
- Hot path: flag check, table lookup, quaternion multiply; no allocation. Local player only (inside `tuneBegin`
  window, `finally` clears it); remotes / guards / co-op untouched, no wire change.
- Save / export additive (`joints` only when set), old record loads as zero, junk skipped. API covers a panel.

**Polish**
- With a gun held, shoulder / upper-arm / elbow / wrist offsets take the hand off the grip (assumed A; item 2 places
  hands). Say so in the panel hint; `keepElbowOut` may partly undo a shoulder offset into the trunk (fine).
