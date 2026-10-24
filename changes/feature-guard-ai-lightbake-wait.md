# e2e-lightbake shader-compile wait
kind: patch
- Tests: e2e-lightbake waits for every drawn shader to compile (120 s cap) before its 16-texture check and names stuck materials (train 55 timing flake).
