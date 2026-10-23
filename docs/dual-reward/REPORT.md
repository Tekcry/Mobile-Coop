# dual-reward (spare 12) - report
Branch `feature/dual-reward` (base origin/master 8e5dbd83, 4.70.0). Decision 12: "co-op synced takedowns reward more than shooting". The reward itself is section-rating's; this job gives it a counted, evented input.

## What
- `src/game/dualTakedown.ts` (new, pure): `DUAL_WINDOW` (1.5 s, moved from coopHost) and `DualClock.note(by, t)` (partner id on a pair, else null).
- `StealthRating.duals` and event `dualTakedown` in `playstyle.ts`.
- `GameEvents.dualTakedown {a, b, detected}` in `gameEvents.ts`.
- `CoopHost.takedownDone` uses `DualClock`; banner and wire unchanged; records `dualTakedown` (no extra knockout, A3) and emits the event. Host only (A4).
- Docs: `docs/systems/coop.md`, `docs/systems/takedowns.md`, `TESTING.md`, `changes/feature-dual-reward.md`, `docs/dual-reward/BRIEF.md`.
- No wire change (PROTOCOL_VERSION 31), no save change, no src/ai change.

## Files
src/game/dualTakedown.ts, src/game/playstyle.ts, src/game/gameEvents.ts, src/net/coopHost.ts, scripts/e2e-coop.mjs, tests/dualTakedown.test.ts, tests/playstyle.test.ts, docs above.

## Tests
- `npx vitest run tests/dualTakedown.test.ts tests/playstyle.test.ts tests/missions.test.ts`: 3 files, 19 tests pass.
- `npx tsc --noEmit -p .`: clean. eslint on the touched src and test files: clean.
- e2e-coop (desktop GPU lane 2, `E2E_GPU=1 E2E_PORT=4192 E2E_JOBS=1`): PASS, 183 s.

## e2e finding (test fixed, not loosened)
The first run failed the new assert: the event came out as a = client, b = host. The client's takedowns earlier in the suite had left the dual clock holding the client, so the test's first `takedownDone(host)` paired with that stale client note (the old `duals === 1` assert passed by accident that way, and the test's own client note was left pending). Fix: the test clears `net.dualClock` just before the pair, so the pair is host then client as written. The game behaves as designed (a client takedown followed by a host takedown inside 1.5 s is a dual). The debug message now also prints `h=` / `c=` ids (kept).

## Hand-off for section-rating
Read `g.style.duals` (host) and/or subscribe to `g.events.on('dualTakedown', ...)`; `detected` says whether the team was seen. Compare with `g.style.kills` (shots + lethal takedowns) for "synced takedowns reward more than shooting" (12). A section restart should reset what the rating counts (section-rating's job). No client-side count (A4).

## Open items
None. Changelog line: "Co-op dual takedowns are counted for section-rating (`StealthRating.duals`, `dualTakedown` event); a dual no longer adds a knockout."
