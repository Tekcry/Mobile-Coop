# Sector Ops test part 6 split
kind: patch
- Test runner: the Saltmarsh Park Sector Ops checks now run as four shorter jobs (parts 6-9) so none nears the time limit; a launch whose match never starts now fails with a clear message (after 180 s) instead of a confusing error later; the runner prints a SLOW line for any passing suite past 75% of its time limit.
