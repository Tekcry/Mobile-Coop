# Laptop queue: desktop-red reruns go first; withdrawn affected runs keep the waiver
kind: patch
- Laptop queue: a laptop rerun of a desktop failure now sits in the fix tier (F52), so the final verdict on a PR that
  reads red runs ahead of front and green work (piano reruns waited ~2 h); trains still go first.
- Watchdog and auto-train: the `no-affected-e2e` label also waives an affected-e2e that never ran (an `error` status:
  withdrawn, conflict), so a withdrawn run no longer drops `train-ready` (F55, #623 / #624); a red run still does.
