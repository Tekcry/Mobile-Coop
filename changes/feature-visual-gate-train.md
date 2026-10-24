# Laptop queue: visual-gate after green trains
kind: patch
- Laptop queue: after a green train whose head has `scripts/e2e-visual.mjs`, the service frees the second slot and
  runs the picture gate on the first, posting a `visual-gate` status (clean / flags / error) that never holds a release.
- A flagged run comments on the train PR with the gate's table, thumbnail links and the accept command; the desktop
  lane posts "skipped", and `LQ_VISUAL=0` turns the step off (`docs/laptop-queue/visual-gate.md`).
