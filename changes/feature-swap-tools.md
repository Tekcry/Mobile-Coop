# Swap tools
kind: patch
- Swap gate `scripts/swap.mjs`: `save` / `status` scan every worktree on the machine (uncommitted, unpushed, detached
  local-only commits; merged and stale-debris worktrees skipped), the heavy locks with pid liveness, the laptop queue and
  the auto-train status, and end with `SAFE` or `NOT SAFE: <n> items` (`C:/NightShift/scratch/swap-status.json`);
  `save --commit-wip` commits dirty job worktrees as WIP and pushes their branches (never protected branches, never force).
- `swap.mjs prune --dry-run|--yes` removes clean worktrees of branches merged into origin/master (branches kept).
- `scripts/cloud-queue-expire.mjs` reopens cloud briefs whose claim missed its 30-min heartbeat for 90 min with no push
  to the brief's branch; the cloud-queue README text for the heartbeat is in `docs/cloud-queue-README.patch.md`.
- The swap procedure as commands, with targets (cap to every session up under 10 min): `docs/systems/swaps.md`.
