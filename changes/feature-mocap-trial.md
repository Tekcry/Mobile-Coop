# Mocap locomotion trial (CMU, behind a switch)
kind: minor
- Mocap locomotion switch (Settings > Gameplay > "Mocap locomotion", also in the animation tuner under More > Panel;
  `?mocap=1` / `?mocap=0` overrides it for a page; default off, saved with the settings): Wren's holstered walk / jog /
  run, and the turn / start / stop clips once filled, play from the mocap clip set (`src/anim/clips/mocap/`, the keyed
  clip format) instead of the hand-keyed one; a mocap clip with foot data places her steps itself ("clip feet": the foot
  planner only grounds and pins them). Off is the game exactly as before (the anim-skeleton identity fixtures pass). This
  machine only: the co-op partner drawn here follows it, nothing goes on the wire. The procedural layers stay on, with a
  per-layer scale for the mocap set (`MOCAP_LAYERS`). docs/mocap-trial/CLIP-FORMAT.md.
- Mocap locomotion now shows the real CMU captures (mocap.cs.cmu.edu, converted onto Wren; docs/mocap-trial/SOURCES.md):
  the holstered walk / jog / run from one performer (subject 16: takes 16_15, 16_36, 16_46) placing her own steps, the
  90 degree turns while walking (16_18 / 16_19), the start from standing (16_31) and the stop (16_34), all at a walking
  pace, and a 90 degree turn on the spot (subject 69, 69_13). Planted feet stay locked, the stride is the game's at every
  speed, the head looks ahead (the performers' look at the floor is taken out), and the procedural layers that would
  double the capture (the Body tune's arm swing gain and elbow-out, the trunk twist and lean sliders, the hips following
  the feet, the Weight plant drop, the stop settle) are off on it. Fast turns, starts and stops hand the steps to the foot
  planner as before. Weapons, crouch, walls and guards stay hand-keyed; jog / run turns, the jog stop and the run start
  are converted but not in the game yet.
- Mocap locomotion: no more pelvis dips or foot pops where a turn hands Wren's steps between the capture and the foot
  planner (walking turns at 1-4 rad/s), no toe snap on the first step after starting from standing, and the start's
  arms swing at half strength (they ran out of step with the legs). Switch off unchanged.
- Mocap locomotion on master 4.61.0: the new body motion layer (trunk twist, sway, head follow / nod, walk arm gain) is
  off on the captured gait, which already moves that way; its arm speed cap and pelvis rate limit stay as pop guards.
  Switch off identical to master.
