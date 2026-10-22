# Load fixes (latent UI waits)
kind: patch
- Tests: more load-only e2e waits made correct under CPU load, no assertion, limit or window weakened:
  e2e-desktop's Hor+ / HUD inset match load waits 120 s and the "no match kept in memory" count polls every 2 rendered
  frames for up to 60 s.
- Tests: e2e-offline's offline match and Infiltration loads and both "Wren from the cache (LOD2)" waits take up to
  120 s.
- Tests: e2e-traverse's keyboard ledge presses (Space grabs, C lets go) wait up to 0.7 s of game time per press (30 s
  real-time cap), not 0.7 s of host time.
- Tests: e2e-weapons-carry's loadout and backpack match loads take up to 120 s, and the detailed-avatar-with-backpack
  step polls the stored settings and profile records (up to 30 s, asserted) before its reload instead of a fixed 600 ms.
- e2e-desktop:4's frame governor check on a hardware GPU: up to 20 s of real frames, then missed frames fed through the quality manager's frame path (a fast GPU rarely misses; the check is now "missed frames step the detail down"); software GL keeps the real 300 s wait.
