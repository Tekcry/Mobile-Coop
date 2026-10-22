# Mocap locomotion on by default
kind: minor
- Settings > Gameplay > Mocap locomotion is now ON by default (Michael: "On by default"); a save from before keeps the
  new default once, after that the player's choice stays. Off uses the hand-keyed animations.
- Mocap locomotion (switch on): the clip's planted feet hold their contact through turns and straights (contact slide
  0.01 cm, twist at lift 14.3 deg).
- Mocap locomotion: the switch now drives Wren only (the player and the co-op partner); guards keep their hand-keyed
  walk and the planner's feet with it on (they took the mocap walk and its clip feet before). The menu and Anim Studio
  Wren keep the hand-keyed set too.
- Tests: e2e-anim reads the mocap switch (`window.__mocapOn`, `E2E_MOCAP=0/1`); with mocap on, the old shape / style
  bars (knee-out, knee separation, track width, elbows, pelvis / shoulder rotation, sway, head yaw / pitch) print as
  "M1 as captured" notes; slides, crossings, pops and timings still fail. OFF asserts unchanged.
