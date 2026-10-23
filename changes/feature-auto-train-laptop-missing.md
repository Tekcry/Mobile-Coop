# Auto-train laptop missing alert
kind: patch
- Auto-train: an open train whose CI `check` is green but has no `laptop-e2e` status 10 min later
  (`AUTO_TRAIN_LAPTOP_MISSING_MIN`) now reports state `laptop-missing` with the train, head and `waitingMin`, so the
  orchestrator chases the laptop queue instead of waiting for the 3 h `stale` alert.
