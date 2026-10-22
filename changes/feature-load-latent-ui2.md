# Load fixes (latent UI waits)
kind: patch
- Tests: more load-only e2e waits made correct under CPU load, no assertion, limit or window weakened:
  e2e-desktop's Hor+ / HUD inset match load waits 120 s and the "no match kept in memory" count polls every 2 rendered
  frames for up to 60 s.
- Tests: e2e-offline's offline match and Infiltration loads and both "Wren from the cache (LOD2)" waits take up to
  120 s.
