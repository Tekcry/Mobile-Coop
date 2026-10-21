# anim-run-half - state

Patch job (orchestrator, 2026-10-22 ~09:00, approved key_clip.py edit; Course Ready told): master's run.ts half was
-0.02039 (feet cross the midline) because key_clip.py:481 measured the ankles in world x and Michael's run keys yaw the
pelvis +-22.5 deg with the stride.

## Now (WIP, not a PR yet)
The fix as built (un-yaw by the full pelvis yaw, `pf = W['pelvis'] @ Vector((0,0,1)); unyaw = ry(-atan2(pf.x, pf.z))`;
ankle lateral = (unyaw @ (X[an] - X['pelvis'])).x / K): run half -0.02039 -> 0.05128 (0.045 pre-bake). But walk, jog,
sneak, crouch_walk, crouch_run, glide_fwd / back, wall_crouch_slide, ready_stance and the guard clips also yaw the pelvis
1-6 deg, so their halves changed 2-18% (walk 0.0466 -> 0.0518; ready_stance 0.07927 -> 0.09353; table in the implementer
report below). 15 clips with no pelvis yaw are unchanged. e2e-anim: run passes; ONE miss: "rifle low ready idle: feet
within 10.5 cm of the line under the hips" (10.8) from ready_stance's constant 6 deg stance yaw (no oscillating leak).
Run limits as built: trackHalf 0.16 -> 0.18 (measured max 16.4 cm), kneeBow 0.09 -> 0.047 (tightened), kneeSep 2.15 and
elbowWing 0.11 kept. keyedWalk walk half pin 0.05 -> 0.053 (needs approval: a footage limit). Fixtures re-captured
(16 of 39 Wren, 16 of 64 guard: the keyed walk).

## Next (job lead's decision, pending the orchestrator's OK)
Option (c): un-yaw by (pelvis yaw minus the clip's MEAN pelvis yaw): the stride-locked swing (the part the game's
planner never applies) is removed, a constant stance yaw keeps its world value (the planner places feet in the facing
frame). Gaits (mean yaw ~0) measure as now; ready_stance and other constant-yaw clips go back to master's half, so the
low ready idle limit passes untouched. Then rebake every clip, re-check the halves table, keep the walk 0.053 pin only
if the orchestrator approves, check + e2e-anim + e2e-studio, laptop full e2e, PR.
