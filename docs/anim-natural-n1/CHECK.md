# anim-natural N1 - checker report (fresh checker, ccc1a14d)

2026-10-22 ~13:10, written by the job lead from the checker's hand-back. Verdict: FAIL (one blocker).
Verified: turnRule 0 reproduces master's planner (dc4326a6) through the same harness in all 27 rows. REPORT-A's "flat"
column differs in 4 rows (jog sweep 3 3.7 vs 3.6, jog sweep 7 8.2 vs 8.5, run sweep 7 7.4 vs 7.7, crouch(a) 90 3.8 vs
4.0) because the harness's flat points changed (toe 11.6 -> TOE_BALL 12 cm), not the planner: REPORT-B's "digit for
digit" needs rewording. Scratch scripts: the checker's scratchpad `chk\` (not in git).

## Findings (the fix round's list)
1. BLOCKER - heel scrub in the heel-first roll, invisible to every new metric. `footPlanner.ts:495` `live` needs
   `roll <= 0`, so a freshly landed toe-up foot cannot pivot; in a held spin at 60 Hz (the game's rate) the twistCap
   backstop (`:560`) takes it and, under HOLD_CONTACT, turns the toe-up foot about the virtual ball spot (`anchorFeet`
   `:529`, `ankleToBall(p<0)`), so the heel (the only point on the floor) sweeps. turnHarness SCENARIOS at 60 Hz: spin
   0.75 46.7 deg backstop, heel 4.6 cm; spin 2 31.1 deg, 4.6 cm; crouched spin 2.1 15.6 deg, 4.6 cm; remote spin 2 14.5
   deg. (0 at 120 Hz.) The switched metrics read a toe-up contact as `heel + lever * dir` = that virtual ball, so they
   read 0 (`src/anim/audit/metrics.ts:1087`, `scripts/e2e-anim.mjs:363` / `:430`, `tests/footTurnHarness.ts:329`).
   Same for a flat foot with the pivot slider at 0 ("0: locked"): spin 3 14.9 deg (heel 4.4 cm), spin 4.2 26.7 deg flat
   + 80.2 heel-up (heel 3.3 cm). `tests/turnFollow.test.ts:13` PLANTED_TWIST = TURN_CAP x max twist (0.54 rad) is the
   backstop's own value (60 Hz spins reach exactly 30.9 deg): it can never fail.
   Fix: (a) contactSlide, the e2e foot lock, the turn block and the harness measure each contact point over the frames
   it is down (heel travel while the heel is down, ball travel while the ball is down, both while flat), no heel + lever
   projection; (b) the planner: in the roll (`pitch < 0`) rotate the anchor about the heel point (or let pivotFeet run
   in the roll about the heel, or end the roll when |yawRate| > kRate), and the backstop raises the heel or turns about
   the heel; (c) turnFollow: a measured-plus-margin twist bound and `r.scrub` (backstop) ~0 at 60 Hz, also in remote
   parity; (d) held-spin rows (0.75 / 2 m/s, 7 rad/s, 60 Hz) in footTurnHarness. Guards (300-540 deg/s at walking pace
   with the heel roll) very likely hit it too.
2. Should-fix - `footPlanner.ts:409-410` `spot` never checks the body is turning: any stride 'velocity' move under 0.3
   m/s reads the idle row (aimed walk starts / stops) with the turn rules on; `stepSelect(i.moving && !this.spot, ...)`
   is not gated by turnRule, so turnRule 0 with tuned rows is not master. Fix: `spot = turnRule > 0 && stride ===
   'velocity' && wallD NaN && v0 < SPOT_SPEED && |yawRate| > 1` (the comment at :151 already says so).
3. Should-fix - `tests/tuneStep.test.ts:239` crouched `worstBehind <= thr` is vacuous with `over === 0`. Pin it to the
   measurement (e.g. > 0.49 and <= thr) or measure the ball's distance behind.
4. Should-fix - `tests/turnFollow.test.ts:124` crouched lateral +0.09: 17.8 cm is a single-support transient (the root
   orbits ~12 cm in the slow crouched spin); both-planted width is master's at 60 Hz (19.6 -> 19.7 cm), so not the crab;
   but at 120 Hz > 15 cm for 1.03 s of 3 s and a crouched 180 flick widens both-planted 19.6 -> 23.9 cm. Keep +0.09 for
   single support and add a both-planted width bound (<= master + 1 cm).
5. Should-fix - `scripts/e2e-anim.mjs:486` turn-block slide limit 1.5 cm while the harness reaches 0.0: 1 cm (FOOT_SLIDE)
   after the desktop run and finding 1; the gap limit 2 cm vs 6.8 reached could be 5 (nit); assert the report-only
   plantTurn / snap at the harness's no-worse-than-master values (<= 0.25 s, <= 5 m/s).
6. Should-fix - guard rows not measured (24 of 64 guard fixtures moved): the anim-audit guard rows and e2e-anim guard
   metrics before / after, against finding 1.
7. Should-fix - `TURN_STEP` clash (`footPlanner.ts:282` vs `motion.ts:148`): rename the planner's `FOOT_TURN_STEP`
   (tuneBakeTable paths `:283-284`, BAKE.md, the turnFollow import, the hook strings).
8. Nit - `src/anim/tuneStep.ts:35` hook names `turnStepOver`; the function is `turnOver`.
9. Nit - `studioFeet` (`src/anim/studioDrive.ts:153`) writes x / z / yaw / pitch under a live anchor; the planner snaps
   back to the stale ball each frame first: clear `anchored` there, or reset on drive off.

Fine: the 5 sliders (identity exact, each reaches its constant), the per-gait bake indexes and coverage sample, the idle
landTurn manual and the shared lock rule, no hot-path allocation, NaN pelvisYaw / faceGoal and dt 0 safe, `reset()`
clears anchors, `shift()` and the drag move the ball, pick / inside tie / minPlant / maxAir / never two up at a walk /
the takeover re-aim, fixtures (Wren 2 of 39, guards 24 of 64), dropping keyed:skeleton_test (the test iterates the
fixture's keys).

## Switched metrics as built (for the PR body; to be redone by finding 1a)
All switch from the ankle to one "ball spot" (the ball while the ball is down, heel + 17 cm along the foot while toe-up;
not decision 1's min(heel, ball)); limits unchanged.
1. e2e-anim foot locking (walk, jog, sneak, crouch run): anchored plants ankle travel -> ball-spot travel per plant;
   1 cm. Aim strafe / aim back unanchored: still the ankle.
2. e2e-anim crabRow slide: `M.plantedSlide(ankle)` -> `M.footSlide` (anchored: ball spot; else ankle; no heel / ball
   data: ankle); C.slide.
3. anim-audit.mjs footSlideL/R: footContact ankle slide -> `M.footSlide` (new `L/R.held`); FOOT_SLIDE.
4. New: the e2e-anim "turn feet" block (ball-spot slide < 1.5 cm; twist at lift <= 30 deg and gap >= 2 cm from the
   planner's feet).
5. Unit bounds loosened: turnFollow planted twist (body and pelvis, player and remote) twistFree 0.25 -> 0.54 rad;
   turnFollow crouched planted lateral CROUCH_BAND.max + 0.05 -> + 0.09 (0.15 -> 0.19 m; measured 0.178); tuneStep
   crouched `worstBehind > thr - 0.03` -> `<= thr`.

## Desktop check on ccc1a14d (2026-10-22 13:04, job lead)
`npm run check`: 1 failed, 2602 passed. `tests/tunerLayout.test.ts` "tuner-ui: plain labels > no label keeps brackets,
'x2' or 'pole'": `step:turnTwist: expected 63 to be less than 30` (tuner v3's plain labels: under 30 characters, no
brackets). Fix 10 for the fix round: short plain labels for the 5 new Stepping sliders (and `plainLabel`'s table if it
maps ids). The area e2e did not run (check failed first).
