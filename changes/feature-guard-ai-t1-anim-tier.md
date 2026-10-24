# Guard anim tier: off-screen every 8th frame (guard-cap T1)
kind: patch
- A guard drawn in no local view now solves his animation every 8th frame (was every 4th); the far tier (every 2nd),
  the 4 m near-player rule, takedowns, holds, emotes, climbs and the frozen tier are unchanged, and the skipped time is
  still carried into the next solve. Guard-cap M0 measured the anim solve at 55-59% of the sim growth with 24-32
  guards. Gameplay is unaffected (hit volumes come from the sim). `?animtier=0` still turns the tiers off.
