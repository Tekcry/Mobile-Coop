# PR #190 partner-seed - fresh check (Opus) @ f935e7e1

## Verdict: PASS

## Required
None.

## Notes (non-blocking)
- N1 Test coverage: the Probe in tests/remoteAvatarSeed.test.ts re-implements the update wiring; it does not build a
  RemoteAvatar. Reverting only src/net/remoteAvatar.ts (keeping remoteSeed.ts) would still pass 8/8. Wiring checked by
  reading instead (see 1).
- N2 On a reseed frame with a commit replay running (`rp`), the seed uses `st.speed` where the ease would have used
  `inst`. First placement cannot hit this (lastCommit is set on placement, so no replay frame 1); only a teleport
  mid-replay can. Rare and benign.
- N3 Probe has no `!!mv` gate (test states have no `mv`); the real code gates on it. Fine for what the test checks.
- N4 REPORT.md accurate (8 tests, files, open item on no-`mv` states).

## Checks
1. Correctness - PASS
   - First placement: `justPlaced` set only in the `!placed` branch (placed never reset), consumed and cleared the same
     frame (`this.justPlaced = false` runs unconditionally after `reseed`). Fires once.
   - Teleport: `moved > 2 && moved > 25*dt` on the shown horizontal move. Ordinary frames: sprint 5 m/s (tune max 7)
     x 1/60 = 0.08-0.12 m. Hitch: 12 m/s x 0.2 s = 2.4 m < 25 x 0.2 = 5 m, no reseed. Extrapolation correction:
     buffer cap 0.25 s x 7 m/s = 1.75 m < 2 m, no reseed. Interp snaps (isJump) show as one-frame jumps >2 m, so fire.
     A false positive would only snap speed to the owner's own `st.speed` (the ease target anyway): harmless.
   - Heading: from == to (held first state, n === 1) or pure vertical -> d < 1e-4 -> (0,0); d > SNAP_MIN (pair straddles
     the teleport) -> (0,0); dt <= 0 -> (0,0). Then `moved = hyp2(lx,lz)` = 0 -> `inv = 0` -> localX/Z 0, same as
     master's first frame. Non-zero case: magnitude speed*dt, only used normalised via `inv`.
   - Clamp: max(want,0), min 12; wire speed already validated 0..20 (protocol.ts:262). No-`mv` path: reseed false,
     want = inst >= 0, so easeRemoteSpeed == old `speed + (min(want,12)-speed)*min(1,dt*10)` exactly; lx/lz/moved
     unchanged.
2. Hot path - PASS. No new allocation: `seedH` is a field, no closures/iterators/temp vectors; hyp2 used; seedHeading
   uses Math.sqrt on 2 components (no Math.hypot).
3. Rules - PASS. remoteSeed imported only by src/net/remoteAvatar.ts; no static `../net/` / `./net/` value import
   outside src/net (main.ts reaches net via `import('./net/coopUi')`). protocol.ts / interp.ts untouched,
   PROTOCOL_VERSION 31 unchanged. tsc strict clean.
4. Tests - PASS. Unit test fails on master: (a) master src -> module not found; (b) master-equivalent helpers
   (no reseed, ease from 0, zero heading) -> 5 failed / 3 passed.

## Ran (scratch C:/NightShift/scratch/psc, node_modules junction)
- vitest tests/remoteAvatarSeed.test.ts: 8 passed
- vitest tests/net.test.ts: 72 passed
- vitest tests/netSim.test.ts: 7 passed
- vitest tests/coopFix.test.ts: 13 passed
- npx tsc --noEmit -p .: exit 0
- npx eslint src/net/remoteSeed.ts src/net/remoteAvatar.ts tests/remoteAvatarSeed.test.ts: exit 0
- Master revert (a)/(b) as in 4; scratch restored to f935e7e1 (diff clean modulo CRLF), rerun 8 passed.
- Not run: e2e (per brief), warehouseCoop S1-S3 (scenario, not net/snapshot unit tests).
