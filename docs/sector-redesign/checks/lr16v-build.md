# LR16-6 vision polish build (lr16v)

G100 instant goggle cut, G102 thermal silhouette through shut doors.

## Changes
- `src/game/vision.ts`: removed `VISION_FLIP`, `flipT`, `stepFlip`, `flipCentre`; `toggle()` / `reset()` no longer touch a flip (toggle :55, reset :75). Every change shows the chosen mode at once.
- `src/vfx/cinematicPost.ts`: removed the `flip` uniform, shader band, `setFlip`, and its sync/uniform wiring.
- `src/game/gameState.ts` renderVision (~:2437): removed `stepFlip` / `setFlip`; :2459 `gh.update(...)` now also passes `this.remotePlayers()` (co-op partners get a ghost too).
- `src/vfx/doorGhosts.ts`: pure exported `closedDoorCrossing(list, cx, cz, gx, gz, out)` (:13, writes to a reused `out`, no allocation); `update` loops guards and partners through one `consider` (:96) with the two static-ray occlusion checks unchanged (walls and glass still hide the body).
- `tests/vision.test.ts`: flip test replaced by instant-cut and CT-order tests.
- `tests/doorGhosts.test.ts` (new): shut door ghosts, open door none, miss / same side / parallel none, only closed doors count.

## Checks
`npx tsc --noEmit` clean. vitest: vision, doorGhosts, nightVision, visionIsolation: 32 passed.

## Open items
- No e2e (`scripts/e2e-darkness.mjs`) or GPU check run (per brief): thermal behind a shut door needs a visual look.
- Ghost uses an existing blob mesh (`THERMAL.doorGhost` dim emissive), not a CT-ramp-coloured figure.
