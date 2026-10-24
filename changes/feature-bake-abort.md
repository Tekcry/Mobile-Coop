# Guard bake: stop on a lost console
kind: patch
- Tools: the offline guard bake (`scripts/operators/guard-bake.mjs`) stops a stage at the first job whose launch dies
  with a lost console (exit 0xC0000142, or a failure under 2 s with no output), waits for running jobs, prints
  "ABORT: console lost, restart the bake detached" and exits 5 without pushing, instead of failing every remaining job.
