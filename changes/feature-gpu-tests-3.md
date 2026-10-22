# GPU test fixes 3
kind: patch
- Tests: e2e-menus' touch block holds the finger still before lifting it after the look drag. On a fast GPU the drag
  took ~80 ms, Chrome turned it into a fling, and the pause button's first tap only cancelled the fling ("a tap on the
  pause button pauses ((none))" on the laptop, not the desktop). The game's touch pause was never broken.
