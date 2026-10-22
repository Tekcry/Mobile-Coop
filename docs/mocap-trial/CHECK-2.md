# mocap-trial - check 2 (fresh checker: Night Shift | Course Ready Build, on 44d7c2a7)

2026-10-22 ~23:45, written by the job lead from Course Ready's verdict. Verdict: FIX (three residual pops, switch ON
only, all local to footPlanner). FIXED: CHECK 1, 1b, 3, 5; CHECK 2 fixed after stands of 0.8 s or more. Switch OFF
byte-identical to master (dump d01300d3 vs HEAD, 31,043,056 B each, same md5); slide and allocation pass.
Repros: C:/NightShift/scratch/mt-check/repro2/ (README.txt; zzsweep2, zzdet2 / zzdet3, zzstops, zzstarts, zzalloc;
run one file at a time with OUT=<file>; results/ has the outputs).

## Required
1. Fast walk turns: the pelvis sinks 12-13 cm in ~6 frames when the turn slot fades out mid-turn: the trailing
   clip-planted foot is held at reach (heel 0.27 -> 0.55) while the planner's other swing lands only at phase 0.50;
   pelvisDrop 0.8 -> 12.0 cm (characterRig.ts ~2363 reach drop). Pelvis beyond pace x dt ON vs OFF: walk 2.0 x 4 ramped
   end 2.51 vs 0.75; 2.0 x 4 offset 0.37 2.25 vs 1.01; 1.4 x 4 offset 0.71 2.07 vs 1.88; 2.0 x 3 offset 0.37 1.79 vs
   0.77; 2.0 x 3.5 1.72 vs 0.88 (pre-fix 4.5-5.0). Fix: with clip feet on hand, when a planted foot's reach need passes
   ~4 cm, shorten the other foot's planner swing so it lands now, or let the trailing foot lift by the reach rule once
   the other swing is past ~0.8. Extend the mocapSwitch sweep with turn-start offsets 0.37 / 0.71 and a 2.0 x 4 plan
   (assert currently 2 cm at offset 0 only, tests/mocapSwitch.test.ts ~439).
2. Stop pop: a clip swing in the air at a stop snaps its pitch to the planner's (footPlanner ~406-411 clears clipOwn
   when not moving; swingTo ~1227 uses the lift's fromPitch): left pitch 0.86 -> 0.56 -> 0.26 -> 0.00, ankle-toe 34.8 deg.
   Worst over 10 phases ON 39.7-40.9 vs OFF 29.2-37.2 deg (1.0-2.2 m/s; master pops 29-37 at a stop, ON adds 4-11). Fix:
   in that branch, for clipOwn && !contact set clipPitchT = 0 and clipPitchOff = pitch, and in swingTo blend from it over
   CLIP_PITCH_EASE (fromPitch alone fades only for s < 0.3).
3. Start after a short stand (0.3-0.5 s): the clip lifts the right foot while the left still finishes its idle stop step
   in the air. 1.0 m/s 0.3 s stand 27.6 vs OFF 15.0; 1.4: 31.2 (0.3 s), 27.8-28.8 (0.5 s); 2.0: 36.3, 8 / 30 starts over
   24 deg. Fix: in clipFoot's lift branch (~781) do not lift a planted foot while the other foot's planner swing is in
   the air (like the windowLeft gate ~890), or land the leftover idle step at once when moving starts.

## Decide (orchestrator ~23:47: open the PR on 44d7c2a7, not broken - switch OFF byte-identical, opt-in, pops down from
4.5-5 to 1.7-2.5 cm; required 1-3 + the turn-offset sweep in a follow-up PR feature/mocap-trial-2, allowed past the
1-round rule because Michael judges mocap vs hand-keyed in game)
4. Jog / run turns over 24 deg ON, OFF worse (jog 2.8 x 4: 31.8 vs 35.4; run 4.0 x 4: 47.9 vs 56.8): the planner's own
   steps. Accepted for the trial.
5. The walk turn slot's arms run on their own clock (same-side sync 11 / 27 frames): apply the same 0.5 arm cap
   (armMax, mocap.ts ~303). Orchestrator (~23:47): polish list, not in the follow-up.

## Notes
- A walk started 1.0 s after spawn: ankle-toe 17.2 ON vs 14.6 OFF (under 24).
- The stop slot still never fires (wStop 0).
- Master's hand-keyed set pops 29-37 deg at a one-frame stop (CT_MAX_ACCEL 600): pre-existing.
- For Michael (as captured, M1): walk bob 5.5 / 6.6 vs 4 cm; knee-out 3.5; wrist swing walk 13.8 vs 22.9, jog 15.4 vs
  36.3, run 24.1 vs 85.3 cm; jog bob 9.7 / 11.7 vs 4.6 / 4.5, run bob 8.7 vs 17.7; jog trunk yaw 11 / 22 vs 4.8 / 6.5,
  run 18.7 / 28.5 vs 51 / 52 deg. Mocap is smoother overall (run bone step 13.6 vs 56.8), strides exact, slide 0.00.

## Ran
tsc, eslint clean; 20 Vitest files pass; the CHECK repros match FIX-1; new sweeps (78 plans, 150 stops, 150 starts),
traces, allocation (ON <= OFF). No GPU e2e (heavy2 held).
