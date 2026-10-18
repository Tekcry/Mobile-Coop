# Step 22 - batch 1b: gait, lean, stops, pivots, quick 180, exertion (D5.1-D5.5)

Model: implementer opus; checker opus. Depends on: 21. (all subagents opus from step 06, Michael 2026-10-13)
Commit: "locomotion 22: speed-scaled gait, lean spring, stop settle, plant-and-pivot, quick 180, exertion breathing"

## Read (anchors first: `grep -n`; Blocks A-C moved lines, the anchor wins over the number)
- CLAUDE.md, docs/locomotion/RULES.md, this file; DECISIONS.md D2, D5.1-D5.5, D8.
- docs/design-bible.md:763-784 (5.12.1 instant control), :171 and 5.3 "Add (3b)" (quick 180).
- src/anim/animGraph.ts:435-471 (gait blend), :514 (dashS), :543-560 (startShift, stopSettle, pivot),
  :619-632 (dash lower, accel / intent lean), :765-772 (arm swing 0.1), :810-826.
- src/anim/clips/actions.ts:188-216 (startShift, stopSettle, pivot offsets).
- src/anim/motion.ts:23, :73 (stepLength), :81-83 (rootModulation), :183-207 (pivot), :285-326, :346-356 (turn).
- src/anim/footPlanner.ts:109 (PIN_TOL), :150-300 (step placement).
- src/player/characterRig.ts:930-950 (remote vel / yawRate derive); src/net/remoteAvatar.ts:270-302 (rig input).
- src/player/moveState.ts MOVE_MODES (append only) and src/game/localMoveState.ts (precedence).
- src/config/movement.ts:159-160 (gear caps), :62 (pivotTime).

## Numbers
- Gear caps m/s (movement.ts:160): stand 0.8 / 1.3 / 2.0 / 2.8 / 3.8 / 5.0; crouch 0.5 / 0.9 / 1.3 / 1.8 / 2.3 / 2.8.
- D2 class per gear (A7, set in step 07): walk = stand G1-G3 (<= 2.0 m/s, 4 cm), run = G4-G5 (6 cm),
  sprint = G6 (8 cm), crouch = all crouch gears (2.5 cm).
- Clip pelvis p2p today (AUDIT 2): creep 0.64, walk 0.96, brisk 1.28, jog 1.85, dash 2.35, crouchRun 1.6 cm.
  Target after D5.1: <= 60 % of the class limit (walk 2.4, run 3.6, sprint 4.8, crouch 1.5 cm).
- Stop offsets: startShift -1.2 cm, stopSettle -1.6 cm, pivot -3 cm (actions.ts:192-216).
- Quick 180: >= 0.25 s (bible :826 table); travel turn 720 deg/s gives 0.25 s (motion.ts:346-356).
  Fast turn rule: > 360 deg/s shows as a plant-and-pivot step (bible 5.12.1).
- Braking stop gears 5-6: <= 0.3 s, <= 0.6 m, committed, same for remotes (bible 5.12.1).

## Task
1. D5.1: stride length, pelvis height, arm swing (0.1 fixed today) and forward lean scale with speed through one
   effort curve per stance; gears read as effort, the clip playback rate stays tied to the gait clock.
2. Pelvis p2p per class inside the targets above at every gear and both stances; one low / one high (step 21) holds.
3. D5.2: accel and turn lean on the upper body only, through the existing damped springs (zeta >= 1); the root
   never overshoots (harness root-overshoot metric 0).
4. Remotes: derive accelFwd / accelSide and yawRate in characterRig.animate from the smoothed velX / velZ and yaw
   deltas it already computes; pass `motion` (start / stop / pivot) derived from speed edges. No new wire field.
5. D5.3 (stops): one damped settle on stop and start; the pelSpring (freed in step 21) carries it, critically damped,
   no rebound. Gears 1-4 settle in 0.12-0.2 s with no foot slide; gears 5-6 keep the braking stop numbers.
6. D5.4: turns over 360 deg/s use a plant-and-pivot step; restore the pivot for the CT path (motion.ts:183-207).
7. Stride warping in the foot planner so planted feet match the capsule: slide < 1 cm (PIN_TOL 4 cm is only the
   re-plant trigger, not the slide limit).
8. Quick 180: stick flicked back (dot < -0.7) at gear >= 3 -> a dedicated pivot clip, 0.25-0.3 s, no foot slide,
   control stays instant. New MoveState mode `quick180` appended to MOVE_MODES; remotes play the clip from it.
9. D5.5: exertion breathing after >= 3 s at gear 6 or after a climb / mantle exit: chest and shoulders only,
   amplitude decays to the idle level over 4-6 s, cosmetic, no stamina, never on the head.
   Remotes drive it from their own MoveState history (time at g=6, attach exits).
10. Guards share the rig: verify guard gait passes the same metrics (pivot 0.6 s guard value kept).
11. Unit tests for the pure parts (effort curve, quick-180 detector, stride warp, accel derive) in tests/.

## D8
- New mode `quick180`: e2e-netmove case, remote pose error < 10 cm. No other wire change (size test).
- Anim per character <= 0.063 ms trend gate (0.107 ms scaled budget), remotes included.

## Checks
- Steps 21-31: on PASS, refresh docs/locomotion/audit/anim-baseline.json with the new worst values (commit it);
  a regression is > 10 % worse or a new fail (step 08 rule).
- `npm run check`; `npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-anim e2e-move e2e-ct e2e-netmove e2e-coop`
  (netmove / coop KNOWN_FLAKY: any FAIL line fails the step).
- `node scripts/anim-audit.mjs --compare=docs/locomotion/audit/anim-baseline.json` (local + remote), 60 and 120 Hz: batch 1 rows pass, nothing regresses vs step 21.
- Aimed backpedal audit row (step 21 fix round 2): A82 gives the aimed backpedal the pre-step-21 pelvis reach; add an anim-audit row for it (local + remote) and check D2 there: one pelvis low / high per step, no double bob.
- `node scripts/perf-trend.mjs`.
- PC-PASS: anim-sheet `start`, `stop`, `walkstop`, `turn`, `sprint`, and a new `quick180` scenario, side / front / ots,
  local and remote: "one settle, no slide, lean returns without overshoot" (PROVISIONAL in the cloud).
- From step 08 (D8 finding): after a stop the owner holds its stopped stride (ankle 0.2 m forward, head 0.1 m lower) while the remote copy settles to idle (settled ankles / head miss by 25-50 cm); during acceleration the copy's head dips ~14 cm below the owner's. Make the remote stop and start poses follow MoveState + velocity like the owner (no extra bandwidth); the remote gating poseError must improve against docs/locomotion/audit/anim-baseline.json.
- After the stop-stride fix, regenerate docs/locomotion/audit/anim-baseline.json from three full runs and put poseError back in REMOTE_GATED in scripts/anim-audit.mjs (A40).
- From step 09: the swap start is no longer an inertializer trigger (velocity carry caused a wpYaw overshoot at the draw), leaving raise@120 pelvisJump 0.69 cm (limit 2). Give the Inertializer a trigger mode that subtracts the new source's velocity, restore the swap trigger, and confirm e2e-anim pose continuity <= 0.1 and raise@120 pelvisJump ~0.
- From step 09: remote stopidle@60 hips drop 81 -> 63 cm over ~0.13 s mid-walk while the owner stays at 83 cm (crouchBlend 0, dw 0): remote pelvis-reach pose error, fix with the remote stop / start pose work.
- M14 (Michael, 2026-10-16, N6 "too arcadey and fast, no weight"): this step also lowers the top speeds of every gear by ~15-20% (src/config/movement.ts GEARS; keep the noise model's quiet thresholds consistent: a part-pushed stick stays a silent walk) and adds MODERATE momentum: ~0.3 s from rest to full speed, ~0.25 s to stop, slight turn inertia (the capsule turns toward the stick direction over ~0.15 s at speed). This overrides D5's "control stays instant" / bible 5.12.1 for locomotion speed only: aim, draw, strike, crouch, jump and verbs stay instant. Update e2e-move / e2e-ct / e2e-pad speed and stop assertions, the audit gait rows (re-baseline on PASS), netmove (remotes still pose from MoveState + velocity) and the AI hearing ranges if they derive from speed. Michael play-tests after this step (pause).
- From step 21 (carry, D5.3 settle): the stop holds a wide lunge through 1.1 s of idle (PC sheet `stop` side, pc/s21b/stop-side.png): the planner's idle tolerates a 0.16 m front-back stagger per foot (footPlanner.ts PLANNER.idleStagger) and `hold` keeps the stopped stride, so no squaring step follows. Not fixed in step 21: the final stance comes from the stop distance and deceleration, which this step changes (M14 ~0.25 s to stop) together with the stop settle (item 5) and the owner / remote stopped stride (step 08 finding above); tune the stagger and add one closing step here and re-cut the `stop` sheet.
- From step 21 (fix round 1): remote stairs-stand3 foot slide on the remote copy (pre-existing, baseline footSlideL 18.2 cm, footSink 23 cm): the remote's stair stride and contact timing; fix with the gait / weight work here and re-baseline the remote stairs rows.
