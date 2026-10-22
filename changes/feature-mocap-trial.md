# Mocap locomotion trial (CMU, behind a switch)
kind: minor
- Mocap locomotion switch (Settings > Gameplay > "Mocap locomotion", also in the animation tuner under More > Panel;
  `?mocap=1` / `?mocap=0` overrides it for a page; default off, saved with the settings): Wren's holstered walk / jog /
  run, and the turn / start / stop clips once filled, play from the mocap clip set (`src/anim/clips/mocap/`, the keyed
  clip format) instead of the hand-keyed one; a mocap clip with foot data places her steps itself ("clip feet": the foot
  planner only grounds and pins them). Off is the game exactly as before (the anim-skeleton identity fixtures pass). This
  machine only: the co-op partner drawn here follows it, nothing goes on the wire. The procedural layers stay on, with a
  per-layer scale for the mocap set (`MOCAP_LAYERS`, all 1 for now). docs/mocap-trial/CLIP-FORMAT.md.
