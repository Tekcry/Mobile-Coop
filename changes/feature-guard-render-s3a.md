# Guard render S3a: guard head hit volume from the sim
kind: minor
- Guards: the head hit volume now comes from the guard's simulation (stance, gait, cover lean / peek, emotes, held
  hostage), not from the rendered skeleton, so headshots and takedowns no longer depend on the animation's frame rate
  or the Detail setting. Within 8-11 cm of the rendered head (exceptions in docs/guard-render/STATE.md).
