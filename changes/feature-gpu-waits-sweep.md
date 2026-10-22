# Tests: condition waits before UI-state asserts (GPU)
kind: patch
- e2e-studio: waits (up to 3 s) for the studio bar's throttled readouts (the Keyed box, the playback readout) and the
  Keys readouts (the fixed first key, Add key) before asserting on them; hardware-GPU frames pass inside one refresh.
- e2e-menus: the touch pass waits (up to 3 s) for the Settings / main menu / pause screen and the hidden pause button
  before asserting, instead of a fixed few frames after the tap or key press.
