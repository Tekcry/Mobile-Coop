# AF3 - P2 crouch lean and crouch walk (Michael, walk 4.72: "crouched idle looks ok, leaning a bit too far forward seems hard to balance in real life, the crouch walk is still awkard")

Branch `feature/afp-af3` (off feature/anim-fix-pass 44ed5389: AF0, AF1, AF2, AF5 merged). Opus implementer, 2026-10-23.

## What changed and why
- Balance (cause 1): the moving crouched set now sits its hips behind the root (`back`, m at 1.75 m: 0.10 sneak / walk,
  0.08 run, on KEYED_CROUCH_POSE and MOCAP_CROUCH_POSE) so the body is over the planted feet, as the keyed crouched idle
  that balances already does (hips 10 cm back). The CMU sneak capture (gear 1) gets its own carriage instead of "as
  captured": `lean` -0.19 rad (trunk 43 -> 32 deg), `drop` 0.05 (hips 69 -> 64 cm).
- One carriage across the stick (cause 2): the keyed crouch walk leans 0.18 (was 0.12), so gears 1-3 read 31.5-32.2 deg
  and the hips stay within 2.2 cm; the gear 1 -> 3 ramp changes by -0.8 deg / -2.2 cm (was -15 deg / -6.9 cm).
- Sway (cause 3): the capture's lateral pelvis sway is scaled by `sway` 0.5 (8.4 -> 4.2 cm p2p) to sit over the keyed
  sneak's narrow feet.
- Steps (cause 3): CROUCH_STEP k 0.2 -> 0.115 (0.40 / 0.45 / 0.50 m at gears 1-3, were 0.47 / 0.56 / 0.64: higher
  cadence); past `runFrom` 1.9 m/s the step grows by `runK` 0.35 a m/s more, so the crouch run keeps a long stride (at
  0.6 m the crouch run's arms swung 2.04 m/s, over bodyMotion's 2 m/s bar).
- Found while testing: with the hips back, crouched landings in a turn hit the leg joints' rate limit (characterRig
  limitJoint) and the planted heel slid 2-8 cm (mocapCrouch turns). The hips-back offset fades out while turning
  (CROUCH_BACK_TURN: gone by 0.5 rad/s, tau 0.1 s). The CoM bar is a straight-line bar, so this costs nothing there.
- The drawn crouched legs (`kCrD`, under the procedural gun upper body, AF4b's carriage) keep their old lean (`leanD`)
  and no hips-back: with the new walk lean e2e-anim's crouched low ready walk put the elbows 6.5 cm out (bar 6).
  The crouched aimed strafe numbers are identical to before.
Undo: `back` 0, MOCAP_CROUCH_POSE `{ lean: 0, drop: 0, sway: 1 }`, walk `lean` 0.12, CROUCH_STEP `{ k: 0.2, runK: 0 }`.

## Files
- src/anim/animGraph.ts: crouchSet (sway scale, `back` by `cBackK`, `leanD` for kCrD), `cBackK` field + its easing in
  update next to `cPace`, KEYED_CROUCH_POSE (`back`, `leanD`, walk lean), MOCAP_CROUCH_POSE, CROUCH_BACK_TURN (new).
  No allocation (scalars only).
- src/anim/motion.ts: CROUCH_STEP (`k`, `runFrom`, `runK`) and its line in stepLength.
- tests/mocapCrouch.test.ts: the :109 "as captured" bars (hips > 8 cm over OFF, trunk > 35) moved to trunk 30-38 and
  hips no longer 8+ cm over the hand-keyed sneak; new block "(afp AF3) the balanced crouch" asserts every AF3 bar on the
  AF0 harness (crouch idle, gears 1-3, the ramp).
- Outside the row, needed: tests/fixtures/anim-skeleton-identity.json and -motion-off.json re-captured
  (`ANIM_SKELETON_CAPTURE=1`): only `state:crouchWalk` and `partner:moves` changed (the switch-off crouch walk is
  meant to change: KEYED_CROUCH_POSE, CROUCH_STEP).
- docs/archive/anim-fix-pass/after-af3/: numbers.md (the AF0 table at this commit; its title still reads "before"), on-crouchwalk,
  on-crouchidle, on-sneak, off-crouchwalk sheets (before/README.md commands, GPU, port 4189).
- changes/feature-afp-af3.md.

## Bars (AF0 harness, sim 60 Hz, mocap on; before -> after)
| bar | before | after |
| --- | --- | --- |
| crouch idle unchanged (harness trunk 28.4) | 28.4 deg, hips 50.6 | 28.4 deg, hips 50.6 |
| trunk 30-38 deg, gears 1-3 | 43.1 / 35.5 / 28.0 | 32.2 / 31.7 / 31.5 |
| <= 6 deg change over the gear 1 -> 3 ramp | -15.0 | -0.8 |
| hips height change <= 5 cm, gears 1-3 | 68.7 / 65.1 / 61.7 (7.0) | 63.9 / 62.7 / 61.7 (2.2); ramp -2.2 |
| CoM fore-aft within 5 cm, crouched double support | 15.0 / 13.2 / 11.2 | 2.8 / 2.9 / 2.8 |
| pelvis sway <= 5 cm p2p | 8.4 / 5.0 / 3.3 (ramp 8.4) | 4.2 / 3.1 / 3.3 (ramp 4.2) |
| step 0.40-0.50 m at 1.3-1.7 m/s | 56 / 64 cm | 45 / 49.6 cm (gear 1: 47 -> 40) |
| foot slide <= 1 cm | 0.01 | 0.01 |
Crouch run (not a bar): gear 4 / 5 CoM 14.6 / 21.8 -> 7.0 / 15.2 cm, trunk 31.8 / 37.5 -> 33.9 / 37.5 deg.

## Tests (single files, desktop)
mocapCrouch 7/7, keyedCrouch 8/8, mocapPlayer 10 (+1 skipped), mocapSwitch 13/13, mocapRunFeet 6 (+1), footPlanner 12/12,
animFixPass 1/1, mocapCrouchShift 2/2, crouchEntryRig 1/1, posture 9/9, bodyMotion 13 (+1), animSkeletonIdentity 1 (+1).
`npx tsc --noEmit -p .` clean; eslint on animGraph.ts, motion.ts, mocapCrouch.test.ts clean.
e2e-anim, `E2E_GPU=1`, port 4191, lane 1 lock (CPU 26 %), fresh build: PASS (first run FAIL on the crouched low ready
walk's elbows 6.5 cm, fixed by `leanD`; rerun 5.9 cm, bar 6.0). Crouch 90 contact slide 0.0 cm, crouch run slide 0.
e2e-clip not run (PLAN names it; the brief named e2e-anim only).

## Open items
- Crouched turning slides, sweep of mocapCrouch's turn plan (0.5 / 0.8 m/s x 1 / 2 / 3 rad/s, 8 turn-start offsets):
  switch on worst 1.14 cm (head 0.22; test bar 2 cm, passes); switch off (hand-keyed set, not a player path since AF5)
  up to 5.0 cm (head 4.9), new ones from the shorter steps: a one-frame foot yaw pop at the other foot's toe-off, the
  rate-limited knee carrying the foot (characterRig: the foot yaw is re-set after the limit only on the mocap paths).
  A rig fix (AF4a's file), not done here.
- Crouched low ready walk elbows 5.9 cm (bar 6.0): at the edge; AF4b owns the drawn crouch carriage.
- after-af3/numbers.md title reads "before numbers" (the AF0 test writes that header).

## Changelog
- Balanced crouch walk: hips back over the feet, one carriage from the sneak to the crouch walk, shorter crouched steps.
