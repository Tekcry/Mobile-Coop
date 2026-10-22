# Mocap strafe
kind: minor
- Mocap locomotion (switch on): aiming sideways, Wren plays captured strafe steps (CMU 69_59 left, 69_56 right) instead
  of the hand-keyed glide strafe: wider side-steps at the captures' own rhythm, the hips over the steps. Starts, stops,
  left / right flips and snaps onto forward or back have no pops, foot slides or crossed feet; with the switch off
  nothing changes, and guards keep the glide strafe with it on.
- Clip format: a cycle can travel sideways (`travel` '+x' / '-x', CLIP-FORMAT.md).
