# Load fixes (UI suites)
kind: patch
- Tests: latent load-only e2e waits fixed without weaker limits: e2e-mouse's RMB draw and X holster polls run on the
  match clock (4 s / 3 s, 60 s real-time cap); e2e-feedback holds the photo-mode fly keys for 0.7 s of frame time
  (summed clamped frame dt, 30 s real-time cap); e2e-lightbake waits up to 120 s for the lamp plugin on every PBR
  material and up to 60 s for the stack rebuilt at Ray traced (screen space fallback) instead of a fixed 1.5 s;
  e2e-pad's remap captures press both buttons in one evaluate (new `pressPair` in e2e-lib, one input poll each) and
  assert on the state recorded the frame after the first, so the wall-clock 5 s capture timeout and countdown no
  longer race the test's round trips.
