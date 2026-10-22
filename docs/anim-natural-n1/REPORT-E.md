# anim-natural N1 - REPORT-E: run 180 first swing after the 4.55.1 merge; master 4.56.0

2026-10-22 ~19:55, written by the job lead from the implementer's hand-back. Commits 1b6c6d8e (rule A2), 33ccec4f
(merge master 4.56.0, 79216e49), d13e62d5 (fixture proof note).

## Task 1: run 180 (rule A2, 1b6c6d8e)
Cause: not `uncross` (0 movement in every fast frame) and not master's trackMul (the harness never applies the body
base). In the run 180 the foot left behind gets an ordinary clock swing (swBase 0) of 1.05 m in 0.19 s (turn cycle
0.4 s, TURN_DUTY 0.52); the smooth ease-in reaches 6.11 m/s by its third frame (~9.8 mid-swing). It was there before the
merge: the pre-merge pass was a counting artifact (the band step-in lifted the foot one still frame early, using up one
of the three "first swing frames"); master's keyed jog track change (half 0.04592 -> 0.05386, jog.ts) removed that frame
(the old jog half back temporarily: 3.44).
Fix (footPlanner.ts): rule A2: while the turn rules are on and the body turns (`rateT < BAND_TURN_TIME`), a planted foot
lifts as a turn step (`turnStep`, landing on its clock strike) once waiting longer would start its clock swing faster
than `SWING_ACC = 100` m/s^2 (6 x distance / air^2, `swingFast`). Constant ~297, `swingFast` ~975, call in `holdOrStep`
~1167; the landing from `clockRoot`, split out of `aimClock` with the same arithmetic. turnRule 0 bit-identical; no
identity row moves. SWING_ACC by sweep: 80 crossed a 120 Hz run sweep 3 (-34 cm), 90 a 120 Hz spin 4.2 (-10.6 cm
pelvis), 110 narrowed one run 180 phase to 2.2 cm body frame; 100 none.

First swing frames, the 9 test phases (0.967-1.100 s of travel), m/s max before -> after: jog 90 3.83 -> 2.60, jog 180
3.58 -> 2.59, run 90 3.51 -> 2.59, run 180 6.11 -> 2.59 (per phase 2.54 2.42 2.55 2.41 2.58 2.41 2.59 2.59 2.58). Twist
at lift 14 deg; plant while turning <= old (max 0.20 s).

All 73 phases (0.8-2.0 s, 60 Hz): run 180 max 6.11 (6 over 5) -> 3.35 (0), least body gap 6.2 -> 4.9 (one phase,
1.30 s); run 90 4.83 -> 3.33, gap 5.8 same; jog 90 4.42 -> 2.98, gap 6.0 same; jog 180 6.82 (7 over) -> 6.82 (4), gap
3.8 same. Pelvis-frame crossings stay 2 over all phases.

Tests: footTurn adds run 90 / 180 at every phase 0.8-2.0 s: first swing frames <= 5 m/s and the feet never cross in the
body frame (gap > 0); fails without A2. No limit, metric or existing test changed.

## Task 2: master 4.56.0 (33ccec4f, d13e62d5)
No conflicts (master did not touch the identity test or fixtures since 4.55.1; footPlanner.ts got idle-shins'
resetBand, e2e-anim.mjs, tuneBakeTable.ts, characterRig.ts, tunerLayout.ts merged clean). Proof (turnRule 0 by a
temporary env hook, removed): off: Wren 0 / 40, guards 0 / 64 differ from 79216e49; on: Wren 1 / 40 (partner:moves),
guards 24 / 64 (walk, dash, aimWalk for all 8 kinds, decision 4); A2 moves none. ANIM_SKELETON_CAPTURE=1 rewrote both
fixtures byte for byte: nothing to re-capture.

Single files green: animSkeletonIdentity, animSkeletonGuardIdentity, footTurn (14), footPlanner (11), turnFollow (48),
tuneStep (7), animCrabMetrics (11), keyedWalk (10), animAudit (27), n3DrawMotion (36), idleShins (2), animTuneBake (25);
tsc clean; eslint clean on the changed files.

## Open
1. e2e-anim in-browser still needed (the in-game phase is not reproduced exactly).
2. Jog 180: 4 / 73 phases over 5 m/s outside the test window (max 6.82 at 0.833 s; REPORT-D open 2); not A2's case.
3. Pre-existing gaps outside the window: jog 180 60 Hz body 3.8 cm at 1.117 s; jog 180 120 Hz body -5.2 at 1.80 s;
   run 180 60 Hz pelvis -16.4 at 1.05 s (body 8.3).
4. New from A2, outside the window, not asserted: run 180 60 Hz body gap 4.9 cm at 1.30 s (e2e's bar is 5 cm if the
   in-game phase lands there); run 90 120 Hz pelvis -11.5 at 1.95 s.
5. SWING_ACC has no Stepping slider (every slider bakes: add one with step 5 of a later job, or note it in the PR).
