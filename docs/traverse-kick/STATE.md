# Traverse kick flake - state

**Now (2026-10-19):** done; PR to master open, waiting for the orchestrator's review, version and merge.

**Next:** nothing unless the review asks for changes (rerun e2e-traverse alone on the laptop, push, tell the orchestrator).

**Open (not this job, for CT Core):** a possible keyboard bug. At a closed vent, Space starts the vent and E held
should unscrew, but on real frames the Space release is taken as a kick: the grate opened in 5 of 5 laptop runs. This
matches the T1 known issue (keyboard Space then hold E does not start an unscrew; `src/player/attachController.ts`
`updateVent`: `!inp.useHeld && v.t > 0.02` kicks). The keyboard vent section's checks stay skipped ("prototype:
revisit", T1-TESTS.md).

## Done
- 2026-10-19: verified on the laptop: e2e-traverse 5/5 PASS (23-29 s), the kick at 0.07 s with noise 10 every run; the
  keyboard section opened the grate in all 5 (the fresh-match line printed each time), which confirms the cause.
- 2026-10-19: branch off master da93405c; cause found (BRIEF); a fresh match before the kick when the keyboard section
  opened the grate, and a closed-grate precondition.
