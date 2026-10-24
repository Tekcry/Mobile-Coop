# Player batch 24
kind: patch
- e2e-tuner-phone flake fix (train 54, "pad focus down the Body tab"): the D-pad walk down the Body tab holds each
  press for exactly one input poll (e2e-lib `press`) and steps until the drawer has scrolled (40 at most), then checks
  the focused row shows below the tabs and the playback bar; ten presses held for rendered frames could lose presses
  (a skipped poll) or double them (the wall-clock repeat under load) and end with the drawer unscrolled.
