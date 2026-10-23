# Automatic merge train
kind: patch
- `scripts/auto-train.mjs tick`, run every 5 min by a scheduled task (`scripts/auto-train-task.ps1`), builds the next
  merge train from the `train-ready` PRs with a green `check` and releases it to master once CI and the laptop's
  `laptop-e2e` status are green; failures, stale trains and conflicts are reported in
  `C:/NightShift/scratch/auto-train-status.json` for the orchestrator (`docs/systems/auto-train.md`).
- Trains are paced: the next one is built once the last release is 60 min old, or earlier when the laptop queue is idle.
