# Laptop queue: suite parts per head, SLOW warnings
kind: patch
- Laptop queue: a suite split into parts is now sharded by the parts the tested commit's own runner lists, not by
  old timing records, so no part is skipped or invented; a passing suite near its time limit (a SLOW line) now shows
  on the run's status and in the flake budget summary.
