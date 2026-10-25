# Route-runs: progress, stuck and steering math
kind: patch
- Route-runs (J13 R3): the test robots' pure math in `scripts/route-run/progress.mjs`: progress along the planned
  path (one storey at a time), the stuck watch (under 0.5 m in 8 s while walking; per-step time limits), the pad stick
  and pace that give the crouched sneak speed from `docs/design/metrics.json`, the partner's trail point, which guard
  level changes count as a detection or a notice, and the inferred cause of each. Tooling only.
