# Player step and obstacle probe stop boxing numbers
kind: patch
- No behaviour change: the movement step and the obstacle probe no longer make small number objects each step where
  our own code made them (the probe now makes none at all; less garbage-collector stutter).
- Proved bit-identical by the S1 golden trace and a new parity sweep recorded before the change.
