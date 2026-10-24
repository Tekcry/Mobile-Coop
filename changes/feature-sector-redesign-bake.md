# Faster Saltmarsh Park load (per-section lamp bake)
kind: minor
- Saltmarsh Park (Sector Ops) no longer waits for every lamp of all five sections on a cold first load: the lamp bake
  runs beside the rest of the load, the match starts once the live section's lamps are in, and the other sections bake
  in the background (one lamp per worker job, biggest first) and are in long before the players reach them. The picture,
  the light meter and the guards read the same light as before at every point of the live section; lamps landing
  elsewhere fade in over 1.5 s. The finished bake is cached as before, so later loads are unchanged. Other maps are
  unchanged.
