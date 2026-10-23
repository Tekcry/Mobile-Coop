# Guard anim tiers (guard-render S4)
- Guards solve their animation less often when it cannot be seen: a guard whose merged body was drawn in no local
  view last frame every 4th frame, a guard beyond 22 m of the camera (not scaled by the Detail setting) every 2nd,
  otherwise every frame; the skipped time is carried into the next solve and the weapon glide runs every frame.
  Guards are staggered so the cost spreads across frames. Full rate in a takedown or hold, a scripted emote, a climb,
  or within 4 m of any player. `?animtier=0` turns it off. Gameplay is unaffected: the guard head hit volume comes
  from the sim since S3a.
