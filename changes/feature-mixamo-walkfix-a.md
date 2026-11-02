# Mixamo walk-test fix A1: the body no longer vanishes
- Michael's walk test (2026-11-03): the Mixamo body vanished hanging from a ledge, at a ladder's top, on a pipe or bar,
  and back to a wall after sliding. Cause: as an action (hang, wall slide) faded fully in, the walk and the strafe left
  in the same frame with the action at exactly full weight, and Babylon's quaternion blend divided 0 by 0. The bones
  went NaN, the follow copied the NaN into the hidden rig, and the rig's springs kept it (the body stayed gone, the rig
  root's position too). Every animation weight is now scaled by 0.9999 (the blend starts from the bind value, never
  0 / 0), and the follow never writes a non-finite value into the rig.
- Check: `scripts/e2e-mixamo-actions.mjs` (now on the chamber stage) runs the chamber's wall, ledge and bar loops and
  asserts the body's bones stay finite (before the fix the wall loop went NaN 31 steps in, every run).
