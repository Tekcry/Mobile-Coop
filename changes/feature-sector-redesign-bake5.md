# Saltmarsh Park section bake: clean shutdown of light-bake workers
kind: patch
- Leaving a match mid-bake now ends every light-bake job, the running ones included, instead of leaving some waiting.
- If a replacement light-bake worker cannot start, the bake carries on one worker short instead of failing.
- A lamp that takes over a minute in a worker is noted once in the log.
