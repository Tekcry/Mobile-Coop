# Merge train: feature/menu alone is not a train
kind: patch
- `merge-train build` stops (exit 3) without pushing or opening a PR when every member except the docs-only
  `feature/menu` ride-along was left out (train 44 opened #292 holding only the menu docs merge, no version commit).
