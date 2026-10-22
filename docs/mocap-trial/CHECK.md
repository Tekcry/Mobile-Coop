# mocap-trial - check (fresh checker: Night Shift | Course Ready Build, on 06e773e1 / clips a05bdde7)

2026-10-22 ~22:45, written by the job lead from Course Ready's verdict. Verdict: FIX (two required pop problems with the
switch ON; everything else passes). Repro scripts (Course Ready's scratch):
C:/NightShift/scratch/mt-check/repro/zzsweep.test.ts (copied from Course Ready's scratchpad)
(+ zzana / zzdet / zzclip) and dump.test.ts (switch-off dump) in the same folder; copy into tests/ to run.

## Required (fix round)
1. Pelvis-drop pops and a foot stutter at the clip-feet / planner hand-offs: `FootState.clipOwn` is never cleared when
   the planner lifts or lands a foot (footPlanner.ts beginSwing ~905, land ~1166), so a planner-lifted foot in a turn is
   re-planted by clipFoot (~756) and lifted again (lift, land, lift in 3 frames). Walk 2.0 m/s turning 1.5 / 2.5 / 4
   rad/s: pelvis drop per frame ON 8.4 / 6.2 / 7.3 cm vs OFF 1.9 / 2.2 / 2.8; beyond speed x dt ON 5.8 / 3.4 / 4.7 vs OFF
   0.5 / 0.7 / 1.0 (bible 5.12.2: 2 cm); bone step ON 28 / 31 / 34 deg vs OFF 21 / 24 / 24. Fix: `f.clipOwn = false` in
   beginSwing and land (scratch: drops 4.0 / 2.3 / 2.9, bone 24 / 25 / 25).
   1b. Hand-back at the end of a fast turn: the planted trailing foot keeps the planner's raised heel (pitch 0.54) and the
   clip pitch snaps it down at the 18 rad/s cap; pelvis drop 2.3 -> 6.1 -> 10.0 cm (walk 1.4, 4 rad/s: ON 3.99 cm / frame
   vs OFF 0.95). Fix: in the clip-planted branch (~805) ease a planner-planted foot's pitch to the clip's over ~0.15 s, or
   rate-limit pelvisDrop to ~1 cm / frame when ON.
   Done looks like: walk 1.4 / 2.0 m/s x turn 1-4 rad/s keeps pelvis motion beyond speed x dt <= 2 cm and bone steps
   < 25 deg with the switch ON; a pelvis-step assert in mocapSwitch's "no pops" test.
2. Toe pop on the first clip swing after a start: a planner-planted pitch 0.10 goes to the clip's 0.93 at the 18 rad/s cap;
   the ankle-toe bone turns 26.0 deg in one frame (POP_DEG 25; OFF 14.6). Repro: stand 1.5 s, walk 1.4. Fix: fade from
   f.fromPitch into the clip pitch over the first ~0.3 of clipFoot's first swing (like the toe-off fade ~1163), or
   MOCAP_FEET.pitchRate ~12 rad/s.

## Decide
3. Start-slot arms out of phase with the legs (the start clip's upper body runs at weight up to 1 on its own 1.95 s
   clock, mocap.ts ~263; same-side arm and leg forward together in 50 / 242 moving frames ON vs 0 / 402 OFF): phase-align
   the slot, cap its arm weight ~0.5, or accept for the trial. Job lead's pick: cap the start slot's arm weight at 0.5
   now (quick), phase-align later.

## Notes
4. The walking stop slot rarely fires (braking > 1.5 m/s^2 while speed > 0.5, mocap.ts ~272; wStop 0 in every headless
   plan): check in game.
5. With the switch OFF one new line runs: the `pitch < 0` branch in updateIdle (footPlanner.ts ~667), unreachable on
   master paths; gate it on clip feet so it is structural.
6. At the merge: a DECISIONS entry and a bible 5.12 line for the CMU exception ("No motion matching, no captured data"
   and CLAUDE.md "No external art"); consider docs/mocap-credits.md like docs/audio-credits.md.

## Passes (verified)
Switch OFF bit-identical to master (world matrices of all 21 rig nodes, 420 frames x 14 scenarios, 0 differences); foot
slide 0.00 cm ON and OFF; stride and speed match the game (1.161 / 1.683 / 2.520 m); loop seams within the per-frame
range; contacts match the duty windows; no raw data in history, .mocap-cache gitignored, largest clip 28.7 KB, SOURCES
with the licence and NSF acknowledgement; no new per-frame allocation (ON 2372.4 B / frame = OFF).

## For Michael (A4: capture vs old limit, not fails)
Walk bob 5.5-6.6 vs 4 cm; knee-out 3.5 cm (at the limit); wrist swing run 24 vs 85, walk 13.8 vs 22.9, jog 15.4 vs
36.3 cm; jog bob 9.7-11.7 vs 4.5, run bob 8.7 vs 17.7 cm; jog trunk yaw (pelvis / shoulder) 11 / 22 vs 4.8 / 6.5 deg; the
turn on the spot is a walking pivot (69_13); 16_18 covers 86.5 deg but plays as 90.

## GPU suites (switch off, a05bdde7, desktop heavy.lock, /c/NightShift/mt-e2e.log)
e2e-coop, e2e-move, e2e-netmove, e2e-clip, e2e-anim PASS; e2e-studio FAIL "keyed walk: Step length greyed, Arm swing
not": the master test-timing assert fixed by #140 / #143 (4.58.1-4.58.2): merge origin/master 4.58.3 and rerun.
