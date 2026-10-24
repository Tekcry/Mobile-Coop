# Watchdog: deterministic pipeline alerts
kind: patch
- Pipeline: `scripts/watchdog.mjs tick` (every 2 min via `scripts/watchdog-task.ps1` from the self-updating checkout
  `C:/NightShift/Mobile-Coop-watchdog-live`) writes `C:/NightShift/scratch/watch-status.json`: dead or stale heavy
  locks, orphaned e2e runners, CONFLICTING / re-committed / red `train-ready` PRs, PRs ready for the label, release-tail
  gaps (dev behind, missing tag, merged members still open: alert only), a stale `/preview/`, auto-train health,
  laptop-queue claims and requests, stuck cloud-queue claims. Fixes are opt-in per check (`--fix locks,labels,...`).
- Label convention: `train-ready` only on CI `check` green + a `checker` commit status success + `affected-e2e`
  success (required unless opted out: `no-affected-e2e` label or `WATCHDOG_REQUIRE_AFFECTED=0`). See `docs/systems/watchdog.md`.
