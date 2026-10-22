# anim-run-half - state

Patch job (orchestrator, 2026-10-22 ~09:00, approved key_clip.py edit; Course Ready told): master's run.ts half was
-0.02039 (feet cross the midline) because key_clip.py:481 measured the ankles in world x and Michael's run keys yaw the
pelvis +-25.5 deg with the stride.

## 2026-10-22 ~14:40 (new account): ready for train 4
Master 4.54.0 merged (c0869e2f, the skeleton identity fixture re-captured; the run limits keep #103's kneeSep min 0.44
and kneeBow 0.107 with #110's trackHalf 0.18, marked). Desktop on c0869e2f: npm run check 2682 passed; e2e-anim ok
(169 s); e2e-studio FAIL at JOBS=2 ("a guard loop on the spot ... knee 0.010", the limit is > 0.01 over 25 frames, a
phase-sampling edge) then ok solo (235 s). Next: the orchestrator's train 4. Note for N2: the A1 run key fix
(feature/anim-n2-runkey) rebaked run.ts with master's key_clip.py; after #110 merges, N2 rebakes run once more.

## Earlier (built, runs pending)
Option (c) built (orchestrator OK 2026-10-22), with the yaw read off the pelvis lateral axis (job lead's call: the
forward axis goes vertical in face-down frames and flipped the knife collapse ~180 deg). key_clip.py un-yaws each frame's
ankles by (that frame's pelvis yaw minus the clip's circular-mean pelvis yaw): only the stride-locked swing is removed, a
constant stance yaw keeps its world value. All 29 clips rebaked (hold_choke restored: noise only).
- Run half -0.02039 -> 0.05042. walk 0.05188, jog 0.05386, sneak 0.06519, crouch walk 0.06566, crouch run 0.06666,
  glide fwd 0.05807, glide back 0.05802, wall crouch slide 0.06564; held hands 0.09389, held stumble 0.07634, choke sag
  0.10482, knife collapse 0.12164 (master 0.12162); crouch idle / wall crouch idle 0.12197, hold back 0.09365 (+1-2e-5,
  pitch / roll coupling). 1e-5 arm / wrist bake noise also in crouch_run, guard_choke_sag, guard_held_hands, sneak, walk
  (harmless, in the fixtures). ready_stance, hold_choke and the rest identical to master.
- Fixtures re-captured: Wren 18 of 40, guard 16 of 64 (walk / aimWalk) differ from master.
- Limits: run trackHalf 0.16 -> 0.18, kneeBow 0.09 -> 0.047 (WIP measured 4.3 cm: watch it), kneeSep 2.15 and elbowWing
  0.11 kept; keyedWalk walk pin 0.05 -> 0.053 (orchestrator OK). vitest 2583 pass, lint 0 errors.

## Checks (3a65858a, desktop)
npm run check 2583 pass; e2e-anim ok (run: knee sep 0.67 / 1.27 / 2.01, track 4.2 / 7.3 / 16.4 cm, knee bow 4.4 cm <= 4.7;
rifle low ready idle 8.5 cm <= 10.5); e2e-studio ok. Fresh checker PASS (one blocker at 228c2579, ready_stance, fixed
in 3a65858a; three nits fixed after).

## Next
The laptop full e2e, then the PR (patch).
