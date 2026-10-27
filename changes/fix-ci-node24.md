# CI on Node 24
kind: patch
- CI (`deploy.yml`, `preview.yml`) runs Node 24, the version the desktop and laptop run (F60): Node 22 boxed more numbers,
  so the allocation unit tests (guardAiAlloc D1, knifeWire) failed on CI only and stopped trains 165 and earlier.
