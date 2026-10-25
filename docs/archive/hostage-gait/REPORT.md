# Hostage gait below 60 fps (spare job #10, CT Core Build)

Branch `feature/hostage-gait` from master 3950f3f8. No wire change, nothing in `src/ai`, the host's own takedowns
(`takedownController.ts`) untouched.

## What and why
Host view of a joiner's hostage: his gait flickered below 60 fps.

Cause (the lead's read, confirmed):
- `src/core/loop.ts` `frame()`: the fixed steps run first (`hooks.fixedUpdate`, 60 Hz, up to 4), then `frameUpdate`
  once. `gameState.ts` calls `net.fixedUpdate` (1847) and `net.frameUpdate` (2334) in those.
- `coopHost.frameUpdate` moves each client's drawn body (`r.avatar.update(dt, now)`, once per frame).
- `coopHost.fixedUpdate`'s seized loop placed the hostage with `e.holdAt(...)` from `by.avatar.pos` / `yaw` every step.
- `Enemy.holdAt` (src/ai/enemy.ts:407) eases his velocity toward `(x - pos.x) * 60` per call; `Enemy.frame` reads that
  speed for his gait (`rp.speed`, ~1775-1798).
- Below 60 fps a frame runs 2+ steps against one drawn pose: the first step sees the whole frame's move (2x speed at
  30 fps), the next sees none (0). With real frame jitter the speed the gait reads swings frame to frame.

Fix (`src/net` only):
- `src/net/holdFeed.ts` (pure, no Babylon): `HoldClock` (a smoothed render - sim time offset, re-anchored on a jump over
  0.1 s) and `stepHoldFeed` on per-hostage fields (`HoldFeed`, spread into the existing seized record at seize time;
  no per-step allocation). Per step: the velocity from distinct drawn poses over the render time between them (capped
  9 m/s), the point predicted to the render time the step's sim time stands for (at most 0.1 s past the newest pose),
  eased 0.5 per step. A new frame with the same pose zeroes the velocity at once (a stopped holder), 0.15 s without a
  new pose as a fallback; a move over 1 m between poses snaps (returns true).
- `src/net/coopHost.ts`: the seized loop feeds the hold point (pose + GRAB offsets, so turning in place is smoothed
  too) through `stepHoldFeed`; on a snap it sets `e.pos` first so `holdAt` sees no move (no speed spike);
  `frameUpdate` ticks `holdClock` with the render time the bodies are drawn at; a step without the hold restarts the
  feed (the first placement is unchanged from before).

## Numbers (tests/hostageGait.test.ts; walk 1.4 m/s; real loop order, accumulator, 4-step cap, 0.1 s INTERP_DELAY)
Fed = the per-step speed of the point fed to `holdAt`; gait = `|holdAt velocity|` sampled each render frame (what
`Enemy.frame` reads). "j" = frame time +-15% (seeded).

| fps | fed CV before | fed CV after | gait mean before | gait mean after | gait CV before | gait CV after | gait max frame-to-frame change before / after (m/s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 30 | 1.000 | 0.000 | 1.103 | 1.400 | 0.000 | 0.000 | 0.000 / 0.000 |
| 30 j | 1.006 | 0.006 | 1.118 | 1.401 | 0.146 | 0.004 | 0.838 / 0.011 |
| 45 | 0.580 | 0.005 | 1.315 | 1.399 | 0.143 | 0.002 | 0.459 / 0.005 |
| 45 j | 0.590 | 0.007 | 1.316 | 1.399 | 0.154 | 0.003 | 0.587 / 0.010 |
| 60 | 0.000 | 0.000 | 1.400 | 1.400 | 0.000 | 0.000 | 0.000 / 0.000 |
| 60 j | 0.309 | 0.012 | 1.384 | 1.399 | 0.090 | 0.010 | 0.570 / 0.011 |

At an exact 30 fps the old per-frame sample is steady but 21% slow (the 2x / 0 pair eases to 1.21 / 0.79 and the frame
reads the low one); any frame jitter turns that into the flicker. The fix also helps 60 fps with jitter.
Distance from the drawn hold point after: at most 2.3-4 cm (before 2.3-5.3 cm).

Stop (holder stops dead; seconds from the first still frame until his speed stays under 0.1 m/s; most backward m/s):
30 fps 0.100 -> 0.067 (-0.002), 45 fps 0.089 -> 0.089 (0), 60 fps 0.100 -> 0.100 (0).

Jump of 3 m (peak gait speed): 30 fps 41.9 -> 1.45, 45 fps 41.9 -> 1.41, 60 fps 64.2 -> 1.40 m/s (one snap each).

## Tests
- `tests/hostageGait.test.ts` (new, 10): pass.
- `tests/coopFix.test.ts` 13, `tests/coopTorches.test.ts` 12, `tests/committedMoves.test.ts` 7: pass (single files).
- `npx tsc --noEmit`: clean. ESLint on `src/net/holdFeed.ts`, `src/net/coopHost.ts`, `tests/hostageGait.test.ts`: clean.
- No e2e on the desktop (CPU limit). For the laptop: `e2e-coop`, `e2e-netmove`.

## Open items
- The test copies `holdAt`'s ease (src/ai is Guard AI Build's); if `holdAt` changes, update `Held` in the test.
- Not playtested; a host at 30-45 fps walking a joiner's hostage should now show a steady walk cycle.
- The hostage's yaw is still the drawn yaw per step (`holdAt` takes no turn rate from it, so no gait effect).

## Changelog line
- Co-op (host): a joiner's hostage no longer flickers his gait below 60 fps (hold point fed per fixed step, `holdFeed.ts`).
