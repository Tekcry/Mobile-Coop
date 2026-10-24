# Watchdog: deterministic pipeline alerts
kind: patch
- Pipeline: `scripts/watchdog.mjs tick` (scheduled every 2 min by `scripts/watchdog-task.ps1` from the dedicated
  checkout `C:/NightShift/Mobile-Coop-watchdog-live`, self-updating to origin/master) writes
  `C:/NightShift/scratch/watch-status.json` with alerts for dead or stale heavy locks, orphaned tail / grep / e2e
  processes, CONFLICTING or re-committed `train-ready` PRs, PRs ready for the label, release-tail gaps (dev behind,
  missing tag, merged members still open), a stale `/preview/`, auto-train health, laptop-queue claims and requests,
  and stuck cloud-queue claims. Fixes are opt-in per check (`--fix locks,labels,release,...`).
- Label convention: `train-ready` is added only on CI `check` green plus a `checker` commit status of success (posted by
  the lead's checker) and `affected-e2e` success: when present, and required once the laptop service posts it on
  every PR head (#356) unless the PR is labelled `no-affected-e2e` (`docs/systems/watchdog.md`).
