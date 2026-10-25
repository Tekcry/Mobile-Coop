# Player step and traversal make no per-step garbage
kind: patch
- No behaviour change: the player's movement step, the obstacle probe and the committed vault / mantle / drop now
  reuse their vectors, results and records instead of making new ones every step (less garbage-collector stutter).
- Proved bit-identical by a golden trace on real physics (walk, run, crouch under a ceiling, a ledge, a ramp, a
  committed move) recorded before the change.
