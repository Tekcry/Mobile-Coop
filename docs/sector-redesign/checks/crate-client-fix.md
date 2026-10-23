# Crate client fix: e2e-sectorops:1 "the client's prompt is gone"

Branch `feature/sector-redesign-p3`, from f96924e5 (failed 2/2 GPU at `scripts/e2e-sectorops.mjs:822`). Fix commit
f7a3a042.

## Cause

Not a game bug: the test checked every prompt, not the crate's. After the client's use the crate item is `spent` on
the client (the `crate` event, `applyCrateEvent`, and `syncItems` re-applies it per snapshot), so `nearest` skips it.
But the e2e stand point (0.9 m in front of `racking-crate`, at (-14.9, -7.2)) is 1.27 m from the C2 far door's item
(`door-*` at the door centre (-14.5, -6), reach 1.4, untagged so always mirrored), which the connector cycle unlocks
and enables. So the client's `nearest` returned that door, never null. The host's stand point (0.8 m further on) is
0.57 m from the same door, so the next assert ("the host is still offered the crate") would have failed the same way.
The client's mirror, ledger and per-player state code were correct (the run below passes every later crate assert,
host ledger and restart included).

## Fix

- `scripts/e2e-sectorops.mjs` co-op crate leg: `nearId` asks for the crate's prompt only
  (`nearest(feet, undefined, 'crate')`); "the client's crate prompt is gone" waits for `racking-crate.spent` and no
  crate in reach. Spec A104 ("that player's prompt is gone") is about the crate's prompt.
- `src/net/coopClient.ts`: the client's crate `onUse` sets `progress = 0` after sending `use` (E8/E9 check P1: a held
  button re-sent `use` every frame until the `crate` event landed).
- No wire change; `PROTOCOL_VERSION` stays 35.

## Tests

- `tests/weaponsCrate.test.ts`: new case pinning the geometry: the racking crate's stand point is in reach of both the
  crate (1.8) and the previous connector's far door item (1.4), so the e2e must filter by kind. 10/10 pass.
- `npx tsc --noEmit`: clean.

## e2e (desktop, GPU, `E2E_JOBS=1`, port 4191, heavy.lock "crate-fix", on f7a3a042)

| Suite | Result | Time |
| --- | --- | --- |
| `e2e-sectorops:1` | pass (crate co-op leg green end to end) | 108 s (12:46-12:48) |
| `e2e-coop` | pass | 71 s (12:48-12:49) |

## Open

- E8/E9 check P2 (a dropped `crate` fill past the event cap) unchanged.

## Deflake: e2e-sectorops "a loud shot inside the combat reach alerts the nearest guard" (2026-10-23)

- Failed 2 of 5 GPU runs (`{"nearest":false,"level":"suspicious"}`): hearing is deterministic, but the think cadence
  draws on Math.random left anywhere by real-time frames, so the 0.5 s read could catch him still reacting.
- Fix (test only, guard AI's advice): Math.random seeded from the teleport to the read (as guard-ai S10 does), read
  after 1.0 s, original restored in the read. The count of other alerted guards is not asserted (S14 radio calls).
- GPU, port 4191, `e2e-sectorops:1`: pass 138 s, pass 120 s (12:58-13:02), both `{"nearest":true,"level":"alert"}`.
