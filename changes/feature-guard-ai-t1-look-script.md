# Guard anim tier: shadow look capture script (guard-cap T1, test script)
kind: patch
- `scripts/t1-shadow-look.mjs` (test script only, GPU, headless): frame-by-frame capture of a guard just out of view
  whose lamp shadow lands in view, in three passes on one build (anim tiers with the shadow rule, `&animtier=0`,
  `&animshadow=0`), with contact sheets and the shadow foot-step numbers. Split out of PR #360 for its size; it needs
  #360's `?animshadow` flag and lands with or after it.
