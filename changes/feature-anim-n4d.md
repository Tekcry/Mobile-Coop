# anim-natural N4d: takedown blow and grab kill on the kill moment
kind: minor
- Lethal takedown blow and grab kill (Michael M1 "Faster arm", applied to the kills): the elbow arc's contact now lands
  on the kill instead of well before it (takedown: contact 0.39 s into the 0.7 s blow -> 0.68 s, kill at 0.7 s; grab
  kill: 0.28 s -> 0.48 s, kill at `GRAB.killTime` 0.5 s). The kill timing is unchanged. The follow-through and return
  play on after the kill (0.31 s / 0.22 s, pose only: the operator is free as before). Same on a co-op partner (the
  wire keeps the blow's own phase; both sides warp, the partner plays the follow-through itself). `killWarp`,
  `TAKEDOWN_BLOW`, `GRAB_KILL_BLOW` in `src/anim/strikeBody.ts`. Guards unchanged.
- Co-op client elbow strike: the host's accept no longer steps the strike's pose back (a one-frame hitch at RTT
  80-100 ms, the arc stepped back 0.13-0.21); the pose keeps its place and the clock catches up at half pace. Gameplay
  timing unchanged.
