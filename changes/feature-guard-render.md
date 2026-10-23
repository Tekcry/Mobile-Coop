# Guard render: merged skinned guard body (S1)
- Guards, carried bodies and fresh bodies now draw as one rigidly skinned smooth mesh each (`src/player/smoothBody*.ts`)
  instead of about 20 instanced parts: one bone per joint, a fixed root-local bounding box, one scene observer for
  every body, hi / lo LOD swapped as one at the body's sphere centre. `?guardmerge=0` gives the old instanced parts
  for comparison. Colours, patterns, hit flash, thermal / night vision tint and ragdolls behave as before.
- Measured on the laptop GPU (Epic, 1920x1080, `scripts/guard-cap.mjs`, 24 guards in view, merge off -> on, medians):
  Sector Ops warehouse frame 9.7 -> 7.1 ms, render() CPU 7.6 -> 4.9 ms, GPU 6.7 -> 5.5 ms, active meshes 1429 -> 493;
  Marlow Yard (ctcourse) frame 9.2 -> 6.3 ms, render() CPU 7.3 -> 4.4 ms, GPU 6.1 -> 4.8 ms. Runs:
  `docs/guard-render/run-s1`, `run-s1-off`, `run-s0-base`.
- Accepted look change: heads, hands, forearms and feet now cast moon, lamp and flashlight shadows (they were under
  the 0.3 m caster-size cut as separate parts; the merged body is over it).
