# Laptop queue: audit fixes
kind: patch
- Tooling: the laptop queue service stops a request its requester withdrew (the run is killed, the slot freed), and a
  pending train preempts a running PR request (re-queued). `request.mjs --pin` keeps A/B and baseline runs from being
  superseded.
- Tooling: duplicate requests are marked done unrun; runs not yet in their suites yield to a pending train; train
  reruns (`--train-rerun`) run at train priority and turn `laptop-e2e` green on a pass; alone runs wait while an open
  train lacks a laptop verdict; the desktop takes no new claims while auto-train builds a train; a task guard disables
  stale scheduled tasks (`one-shot-task.ps1` is the only way to schedule an ad-hoc run).
