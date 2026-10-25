# Unit test timeouts under load - state

**Now (2026-10-19):** done; PR to master open, waiting for the orchestrator's review, version and merge.

**Next:** nothing unless the review asks for changes: make them here, rerun `npm run check` and the loaded `npm test`
x2 on the laptop (BelowNormal, `C:/NightShift/heavy.lock`), push, tell the orchestrator.

**Open (not this job):** lightField "allocation-free under a loop" fails its heap assertion under load in every loaded
run (new-space growth 1.8-40 bytes per call against a limit near 0; it passes alone). Not a timeout; fixing it changes
what it measures. Options for its owner: skip it when the run is loaded, or measure after a longer warm-up.

## Done
- 2026-10-19: round 4 (A2-A5): `npm run check` PASS; `npm test` beside e2e-menus x2: 0 timeouts, 1 failure each
  (lightField's heap check, above); 107-110 s against about 14 s alone.
- 2026-10-19: round 3 (120 s, sub-120 s overrides removed): 0 timeouts; settings.test's touch-record test failed both
  runs (a late debounced save from the round-trip test), hence A5.
- 2026-10-19: round 2 (global 30 s): 2 and 9 timeouts; the run is about 10x slower under load, hence A3 (120 s); readyHands
  timed out at its own 60 s, hence A4.
- 2026-10-19: round 1 (per-file 30 s in the 9 files): `npm run check` FAIL, voxelFit timed out at 5.5 s (laptop loaded,
  no e2e alongside); switched to the global timeout (A2).
- 2026-10-19: branch off master 7c950acc; BRIEF, STATE.
