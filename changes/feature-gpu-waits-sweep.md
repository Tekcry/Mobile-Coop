# Tests: condition waits before UI-state asserts (GPU)
kind: patch
- e2e-menus: the touch pass waits (up to 3 s) for the Settings / main menu / pause screen and the hidden pause button
  before asserting, instead of reading a fixed few frames after the tap or key press; hardware-GPU frames come faster.
