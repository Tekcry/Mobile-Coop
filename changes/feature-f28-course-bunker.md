# Training course and bunker test fixes
kind: patch
- The training course and bunker co-op tests no longer risk stalling at the start when the computer is busy: their
  second window now always joins the first as a partner instead of sometimes opening a second room of its own. If a
  start ever stalls again, the test prints what both windows saw.
