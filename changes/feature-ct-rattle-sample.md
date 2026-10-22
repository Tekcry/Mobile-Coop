# e2e-ct: the fence rattle check latches its noise samples
kind: patch
- Tests: e2e-ct's fence rattle checks no longer read the noise once after the climb. The noise model re-samples
  every 0.25 s of sim time and holds the value in between; with the sampler's phase set by the real-time steps before
  the suite takes the loop over, the one read could land on a sample taken in the step after the stick was released
  (0.00 m in train 11 at `E2E_JOBS=3`). A new `runNoise` steps the window one 60 Hz step at a time and latches every
  sample taken inside it: gear 4's loudest sample must reach 3.9 m and gear 3's loudest must stay under 0.5 m, each
  with at least one (gear 3: two) samples. The limits and the climb-rise check are unchanged.
