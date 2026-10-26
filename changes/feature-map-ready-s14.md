# Map load: shader compile log and parallel compile
kind: patch
- Load timing: each map load now logs every shader it compiles (what kind, how long, how many at once), shown in the
  feedback note and read by the measure script, which can now run cold loads only and compare compile orders.
- Behind the map-ready loading screen (off by default): the shader compile groups (your body and weapons, the level,
  the guards, the rest) now start together in priority order instead of one after another, so the browser can compile
  them at the same time. `?compileorder=serial` keeps the old order for comparison.
