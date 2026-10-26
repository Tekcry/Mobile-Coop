# Pad reading makes no per-frame garbage
kind: patch
- No behaviour change: the controller read each frame (the pad list, the button snapshot, the stick dead zones and
  curves, the mapped frame) now reuses its records instead of making new ones, so it leaves nothing for the garbage
  collector; proved bit-identical against a recording made before the change (`tests/padPollAlloc.test.ts`).
