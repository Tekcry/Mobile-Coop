# Guard cap measure
kind: patch
- Tools: `scripts/guard-cap.mjs` measures what each awake guard costs per frame (sim split: AI brain, perception, rays, nav, physics; render: frame, GPU, draws, shadow passes) at 12 / 16 / 24 guards on Sector Ops and Marlow Yard, for the guard cap decision (`docs/guard-cap/REPORT.md`).
