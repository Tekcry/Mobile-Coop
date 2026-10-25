# Saltmarsh Park lamp light ships pre-built (dark)
kind: minor
- Loading: the campus lamp light is now baked once when the game is built and shipped with it (5 files, 5.5 MB), so a
  player's PC no longer bakes it at the start of a match. Off by default (`?mapready=1`, flag `mapReady`) until the
  Sector Ops and Marlow Yard walks land; any mismatch falls back to the PC bake as before.
- Tests: the shipped light matches the PC bake byte for byte; a stale, missing or damaged file is never used.
