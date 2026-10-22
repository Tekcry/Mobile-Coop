# GPU test fixes
kind: patch
- Tests: e2e-studio and e2e-lightbake pass on a hardware GPU (the laptop's default for logic e2e, `E2E_GPU=1`). Both
  waited a fixed number of rendered frames, which a GPU finishes in ~0.1 s: the studio's keyed-walk check now waits
  for the tuner panel's keyed mode (re-read every 250 ms of wall time), the lamp-plugin check waits (5 s cap) until
  every PBR material has the plugin. Software GL is unchanged.
