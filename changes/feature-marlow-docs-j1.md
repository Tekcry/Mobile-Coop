# Marlow docs fixes (folded plan J1)
kind: patch
- Marlow Yard spec follows Michael's 2026-10-25 answers: no strict rule (every failure a retry), failed drills retry
  in place, one forced route per set (side routes close in the re-plan), only the guards each move needs.
- Guard cap docs land on master (M0 and M1 measurements, run 4100); any cut below 32 guards goes to Michael first; the
  60 fps target at 32 guards is recorded for the perf job.
