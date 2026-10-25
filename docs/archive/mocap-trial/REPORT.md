# mocap-trial - report (CT Core Build)

2026-10-22 ~23:35, on 44d7c2a7 (fix round 30c8ee3c + master 4.60.0). The ask, limits and Michael's answers: BRIEF.md.

## What is in
- A switch, default OFF: Settings > Gameplay > "Mocap locomotion", the tuner (More > Panel), `?mocap=0/1`. This machine
  only; nothing on the wire. OFF is the game exactly as before (identity fixtures; dump repro byte-identical to master).
- Real CMU captures converted onto Wren (`src/anim/clips/mocap/`, keyed clip format, CLIP-FORMAT.md; raw data in
  `.mocap-cache/`, gitignored; every take with its seconds in SOURCES.md, licence and NSF acknowledgement there):
  walk 16_15, jog 16_36, run 16_46 (one performer, speed blend), walking 90 deg turns 16_18 / 16_19, start 16_31, stop
  16_34, 90 deg turn on the spot 69_13.
- "Clip feet" (A3): the mocap set places Wren's steps from the capture; the foot planner only grounds and pins them, and
  takes the steps back for fast turns, starts and stops. The procedural layers stay on with per-layer scales
  (`MOCAP_LAYERS`); the ones that would double the capture are off on it: the Body tune's arm swing gain and elbow-out,
  trunk twist and lean sliders, hips following the feet, the Weight plant drop, the stop settle.
- Pipeline: `scripts/mocap/` (ASF/AMC reader, take analysis in TAKES.md, retarget, emit).

## Checks
- Fresh checker (Course Ready, CHECK.md): FIX on a05bdde7 - two pop problems with the switch ON. Everything else passed:
  OFF bit-identical (21 nodes x 420 frames x 14 scenarios), foot slide 0.00 cm ON and OFF, stride / speed match the game
  (1.161 / 1.683 / 2.520 m), loop seams, contacts in the duty windows, no raw data in history, no new per-frame allocation.
- Fix round (FIX-1.md, 30c8ee3c): CHECK 1 / 1b / 2, the start-slot arms at 0.5 weight (decide 3), note 5, and two planner
  fixes found while measuring (no turn-rule step while the other foot is about to lift; the swing side pass fades).
  Switch ON, walk 1.4 / 2.0 m/s x turn 1.5-4 rad/s: pelvis beyond speed x dt 3.4-5.8 -> 0.8-2.0 cm, bone steps 24-45 ->
  19-24 deg; start toe 26.0 -> 14.6 deg; start arms out of phase 50 / 242 -> 0 / 214 frames. OFF byte-identical.
- Second check on 44d7c2a7: Course Ready (see the PR).
- GPU suites on 44d7c2a7 (desktop, E2E_GPU=1, switch off): e2e-netmove, e2e-studio, e2e-anim, e2e-clip, e2e-move PASS
  (E2E_JOBS=2); e2e-coop failed under load ("client takedown offered on the host's guard (offer none)": host found no
  guard by the client) and PASSED solo (E2E_JOBS=1, 73 s). The fix round touches only clip-feet paths; logs
  /c/NightShift/mt-e2e.log, mt-coop.log.

## Side-by-side (Menu Notes, feature/mocap-sheets-real, docs/mocap-trial/sheets/)
walk / jog / run / stop on 82f43716 (04598e9a; clips unchanged since); turn90walk, turn90jog, turn180walk and start on
the fix 44d7c2a7 (ce76361a). Michael watched them and chose M1 "Mocap, as captured".

## For Michael (M1: capture vs old limits, notes not fails)
Walk bob 5.5-6.6 vs 4 cm (bible D2); knee-out 3.5 cm (at the old limit); wrist swing run 24 vs 85, walk 13.8 vs 22.9, jog
15.4 vs 36.3 cm; jog bob 9.7-11.7 vs 4.5, run bob 8.7 vs 17.7 cm; jog trunk yaw (pelvis / shoulder) 11 / 22 vs 4.8 / 6.5
deg; the turn on the spot is a walking pivot (69_13); 16_18 covers 86.5 deg and plays as 90.

## Not done / open
- 2.0 m/s x 4 rad/s: the pelvis goes 2.005 cm beyond speed x dt in one frame (OFF 1.0): the planted trailing foot at full
  reach for two frames; left out of the new assert.
- On sustained turns the mocapSwitch planted-ankle slide assert is skipped (the planner's stance band scrubs planted feet
  round by design, worse with the switch off: 7-49 cm OFF, 7-19 ON) and the jerk allowance is 1 cm on those new plans
  (ON 16.9 vs OFF 16.4). The planner's own slide still asserts 0.
- Outside the target: jog 2.8 x 4 rad/s bone step 32 ON (OFF 35), run 4.0 x 4 rad/s 48 ON (OFF 57).
- The walking stop slot rarely fires (CHECK 4: braking > 1.5 m/s^2 while speed > 0.5); check in game.
- The start slot runs on its own clock (arms capped at 0.5); phase-aligning it is the later fix.
- Gap takes downloaded, not in the game yet (SOURCES.md): jog / run starts and turns, jog stop, more turns on the spot.
- Weapons, crouch, walls and guards stay hand-keyed; usable CMU aim / carry takes listed for later.
- At the merge (CHECK 6): a DECISIONS entry and a bible 5.12 line for the CMU exception and M1 (D2 bob line); consider
  docs/mocap-credits.md like docs/audio-credits.md.

## What Michael should try
`?mocap=1` (or Settings > Gameplay > Mocap locomotion) in Marlow Yard: walk / jog / run on the stick, 90 and 180 turns
while walking, start from standing and stop; then `?mocap=0` for the current set.
