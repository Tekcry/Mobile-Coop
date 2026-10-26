# Laptop queue: fixes first, a new head keeps its place
kind: patch
- Fixes (PR label `fix` or `request.mjs --fix`) are tested before new features, on the laptop and the desktop.
- A new head of a PR keeps its request's place in the queue and stops the run on the old head.
- The desktop takes the smallest request, skips any estimated over 15 minutes, and has a CPU mode knob
  (`LQ_DESKTOP_CPU_MODE`).
- A train preempt keeps the suites that already passed, so only the rest rerun.
- A docs-only commit on a PR head carries the earlier affected-e2e verdict.
- A train verdict or done claim lost in a GitHub outage is retried on later passes, so a green train no longer holds
  every alone request; both workers heartbeat their claims, a silent claim frees after 20 minutes, and a run whose
  claim was taken stops.
