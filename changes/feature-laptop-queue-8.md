# Laptop queue: fixes first, a new head keeps its place
kind: patch
- Fixes are tested before new features: a PR with the `fix` label, or a request filed with `--fix`, goes ahead of other
  PR requests (behind trains, train reruns and an alone request that waited over 30 min).
- A new head of the same PR keeps its old request's place in the queue and stops the old run.
- The desktop worker takes the smallest request, skips ones estimated over 15 min, and has a CPU mode knob
  (`LQ_DESKTOP_CPU_MODE`).
- A train that cuts a PR run keeps the suites that already passed, so the rerun only runs the rest.
- A docs-only commit on a PR carries the earlier affected-e2e verdict.
