# Sector Ops polish 3
kind: patch
- Light bake: when the moon bake fails while a section bake still waits on its cache read, no section baker starts
  afterwards (it used to start one that nobody stopped).
- Vol lights: `writeVolLights` writes slot `i` and returns `n` (one counter, not two); the wiring guard test reads its
  sources relative to the test file and names what to do when its regex stops matching.
