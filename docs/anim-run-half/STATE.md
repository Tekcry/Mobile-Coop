# anim-run-half - state

Patch job (orchestrator, 2026-10-22 ~09:00, approved key_clip.py edit; Course Ready told): master's run.ts half was
-0.02039 (feet cross the midline) because key_clip.py:481 measured the ankles in world x and Michael's run keys yaw the
pelvis +-22.5 deg with the stride.

## Now (built, runs pending)
Option (c) built (orchestrator OK 2026-10-22), with the yaw read off the pelvis lateral axis (job lead's call: the
forward axis goes vertical in face-down frames and flipped the knife collapse ~180 deg). key_clip.py un-yaws each frame's
ankles by (that frame's pelvis yaw minus the clip's circular-mean pelvis yaw): only the stride-locked swing is removed, a
constant stance yaw keeps its world value. All 29 clips rebaked (hold_choke restored: noise only).
- Run half -0.02039 -> 0.05042. walk 0.05188, jog 0.05386, sneak 0.06519, crouch walk 0.06566, crouch run 0.06666,
  glide fwd 0.05807, glide back 0.05802, wall crouch slide 0.06564; held hands 0.09389, held stumble 0.07634, choke sag
  0.10482, knife collapse 0.12164 (master 0.12162); crouch idle / wall crouch idle 0.12197, hold back 0.09365 (+1-2e-5,
  pitch / roll coupling). ready_stance and the rest identical to master.
- Fixtures re-captured: Wren 18 of 40, guard 16 of 64 (walk / aimWalk) differ from master.
- Limits: run trackHalf 0.16 -> 0.18, kneeBow 0.09 -> 0.047 (WIP measured 4.3 cm: watch it), kneeSep 2.15 and elbowWing
  0.11 kept; keyedWalk walk pin 0.05 -> 0.053 (orchestrator OK). vitest 2583 pass, lint 0 errors.

## Next
check + e2e-anim (re-read the run measurements; update the e2e-anim.mjs ~line 460 comment) + e2e-studio on the desktop,
a fresh checker, the laptop full e2e, PR.
