# anim-natural N1 - check 3 (fresh checker, 1135bc41)

2026-10-22 ~20:35, written by the job lead from the checker's hand-back. Verdict: PASS (no blocker). Scratch in
C:/NightShift/scratch/n1-check3/ (git-archive trees of head, "nofix" = head with f8e98b26 / 1b6c6d8e reversed, master
79216e49). Repo untouched.

## 1. The two fixes
- Correct and minimal: D (footPlanner.ts:775-789) progress = max(live duty, duty at lift), only for swings opened while
  turning, `s` clamped at 0; A2 (SWING_ACC :299, swingFast :998, call in holdOrStep :1185) same gating as rule A,
  turnStep's guards; clockRoot (:943) = aimClock's old arithmetic.
- turnRule 0 bit-identical: per-frame planner state hashed (L / R x, y, z, yaw, contact, swing, pitch, toX, toZ, toYaw,
  stepDur, slide, scrub) over 244 rows (every FOOT_TURN and GUARD scenario + 4 turn rows x 19 phases, 60 and 120 Hz):
  head vs nofix 0 / 244, head vs master 4.56.0 0 / 244. Turn rules on: head vs nofix 212 / 244 (expected).
- Allocation: none explicit (scalars, fields cRx / cRz / cYaw, swDutyL / swDutyR). Measured (--expose-gc, new_space, warm,
  min of 3): master ~61-68 B / update, nofix ~95-106, head ~98-109: the fixes add 2-6 B (likely boxing across
  non-inlined calls such as clockRoot(i, air)); the whole job ~35-40 B over master. Polish.

## 2. Reproduced (60 Hz, 9 test phases, 0.967-1.100 s of travel)
| Row | First swing max m/s | Plant while turning max s | Body gap min cm |
| --- | --- | --- | --- |
| jog 90 | 2.60 | 0.17 | 5.97 |
| jog 180 | 2.59 | 0.20 | 5.91 |
| run 90 | 2.53 (claimed 2.59) | 0.20 | 6.43 |
| run 180 | 2.59 | 0.20 | 6.79 |
Twist at lift 14.32 deg every row; contact slide <= 0.01 cm. All 73 phases: run 180 max 3.35 (nofix 8.04, 27 over 5),
run 90 3.33. tsc clean; footTurn 14, footPlanner 11, turnFollow 48, tuneStep 7, animCrabMetrics 11, both identity files,
animTuneBake 25, keyedWalk 10, animAudit 27 green.

## 3. REPORT-E's open items: polish, not flake
e2e-anim steps in fixed 1/60 (scripts/e2e-anim.mjs:44-77): the turn block is deterministic per build, so these cannot
flake, only fail every run. The in-game phase is ~1.0 s of travel (7955f883's jog 180 read 5.29 in-game, the harness
5.30 at 1.000 s). jog 180 over 5 m/s at 0.833 and 1.45-1.5 s: >= 10 frames away; jog 180 body gap 3.81 at 1.117 s: 7
frames away (closest risk, pre-existing); run 180 body gap 4.93 at 1.30 s: 18 frames away; run 90 pelvis -11.5 at 120 Hz:
e2e runs 60 Hz and asserts the body frame only.

## 4. Whole job vs master
Guards: e2e-anim has no guard metric (comment at :990); footTurn's guard test passes. Identity: guards 24 / 64 (walk,
dash, aimWalk x 8), Wren partner:moves; turnRule 0 = master on 244 rows. Stepping sliders bake (tuneBakeTable.ts:257-272:
turnTwist, turnRate, pivot, pivotHeel, landTurn; lock covers step.idle). SWING_ACC is a constant: a PR-body note.

## Should-fix (a gate, not code)
1. e2e-anim has never run past jog 180 on N1 (ctb8.log:161 threw there): run 90 / 180, jog sweep, crouch 90, turn round,
   the aimed spot turn and every later block are unverified in-browser. Two headless risks inside the e2e window:
   (a) crouch 90 at 0.983 s: first swing frames 10.76 m/s (master 5.02; nofix 10.74, pre-existing in N1): the right foot
   lifts as a rule step with the feet 7.9 cm crossed and the no-crossing push moves it 18 cm on its 3rd frame;
   (b) jog sweep 3: plant while turning exactly 0.250 s at all 9 phases vs `<= 0.25 + 1e-6` (CHECK-2 item 1).
   Done looks like: a green e2e-anim on the head; if (a) trips, fix the no-crossing push on the crouched rule step (not
   the limit); if (b) reads 0.267, a one-frame margin.

## Polish
- jog sweep 3 at e2e-like timing crosses -26 to -30 cm (body frame) at 3 / 73 phases (1.283, 1.367, 1.667 s; master 0),
  with one-frame 38 cm jumps at the no-crossing window edge (master has 41-42 cm jumps elsewhere).
- crouch 90 body gap 2.3 cm at 1.55 s; 4.5 at 1.667 / 1.683 s (new with A2).
- Job-wide +35-40 B per update vs master.

## CHECK-2 items
1 open (e2e-move / e2e-clip ok; e2e-anim stopped at jog 180; e2e-studio, e2e-netmove, GPU sheets not run; 0.25 s margin
unchanged). 2 open (polish). 3 open (remote crouched flick not re-measured). 4 stale. 5 open (guard 0.9 90 15.0 m/s).
6 open (GPU sheet). 7 open (aim spot 0.35 s, 21.2 deg). 8 open (related to should-fix 1a). 9 open (guard spin 1.3 body
gap -2.5 cm; for...of at footPlanner.ts:892; "(0: locked)" label at tuneStep.ts:38).
