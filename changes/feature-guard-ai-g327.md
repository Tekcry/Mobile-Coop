# Guard anim tier: off-screen every 8th frame (guard-cap T1)
kind: patch
- A guard drawn in no local view now solves his animation every 8th frame (was every 4th); the far tier (every 2nd),
  the 4 m near-player rule, takedowns, holds, emotes, climbs and the frozen tier are unchanged, and the skipped time is
  still carried into the next solve. Guard-cap M0 measured the anim solve at 55-59% of the sim growth with 24-32
  guards. Gameplay is unaffected (hit volumes come from the sim). `?animtier=0` still turns the tiers off.
- A guard out of view whose shadow (a lamp's, the moon's, a torch's) can fall in the view counts as seen and animates at
  full rate, so his shadow never steps (A195, Michael 2026-10-25 "shadow in view = seen"). The test is the Sector render
  freeze's own frustum test (frustum only: a shadow behind a wall still counts). `?animshadow=0` turns the shadow rule
  off and `?animoff=N` sets the off-screen period, for A/B runs on one build.
