# Sector Restart - fix round check (2026-10-19)

Fresh checker. Commit checked: 839a3a07 (the fix round), plus a sanity pass over `git diff ce1da1a3 HEAD -- src scripts
tests` (HEAD cb7e1061; the 4.7.3 master merge is docs only, ignored). Light checks only (the desktop `heavy.lock` is
held by CT Core); e2e is the laptop runner's and is not judged here, but item 1 below is read from the code.

## Commands and results
| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | clean (exit 0) |
| `npx eslint` on the 16 changed src / scripts / tests files | 0 errors; `scripts/e2e-sectorops.mjs` is ignored by the ESLint config (warning only), so `node --check scripts/e2e-sectorops.mjs` was run: OK |
| `npx vitest run` tests/sectorRestart, sectors, sectorStep3, enemyManagerDespawn, arsenal, score, net, gadgets, sectorRecord | 9 files, 148 passed. All nine files exist under `tests/` |

## Verdict: FAIL - 1 blocking item (a one-line fix in the e2e script; the game code is right)

## The fix, read
- **CHECK.md item 1 (a throw in hand at the down) is resolved.** `PlayerWeapons.restoreCheckpoint`
  (`src/weapons/playerWeapons.ts:410-424`) now sets `grenadeT = -1`, `grenadeThrown = false`, `grenadeCd = 0`,
  `player.grenadeT = -1`, `player.aimLockTimer = 0` before the restore. The only deferred release is the
  `grenadeT >= 0` block (line 590, `releaseGrenade`); `place` gadgets act at once, so nothing else can leave the hand
  after the respawn. The restore runs from `GameState.checkpointReset` on the host and solo (`restartSection`, before
  `loadSection` and the respawn) and on the client (the restart banner), so a host still up on an OPERATOR OUT restart
  and a client are covered too. The unit test ("PlayerWeapons.restoreCheckpoint (check fix 1)") pulls a frag, restores,
  and checks the throw is gone, the count back at the snapshot and a fresh throw allowed: passes.
- **The shot spot (CHECK.md polish 2, 3) now discriminates.** The band comes from the new `GameState.NOISE` table
  (`lo = 28 x 0.6 + 1.2 = 18 m`, `hi = 28 - 2 = 26 m`): every guard's whole path (route segments or post, plus where it
  stands) is >= 18 m from the spot, so a suppressed shot (heard to 16.8 m) reaches nobody; the nearest guard's whole
  path is <= 26 m, so a loud shot (28 m, `EnemyManager.noise`, plain distance, no wall muffle) reaches it wherever it
  walks; no path sample (every 1 m, eye 1.6 m) sees the spot, which also settles the sight-flake risk. The suppressed
  assert "no guard alerted, no lkp, stage unchanged, music not Alert" is meaningful. The loud control is the right idea
  but its last-known-position half cannot pass (item 1).
- **What holds (CHECK.md) still holds.** The fix round touches only `restoreCheckpoint` (more fields reset), a static
  read-only `GameState.NOISE` (tests only), the e2e script and the unit test. A2 (the Sector Ops kit suppressed), the
  guard reset (`resetMemory`), the music calm, the loadout snapshot and the A1 client cue are unchanged since 92ccfec6.
  No `src/net` change in the fix round, no per-tick allocation, protocol stays 24.

## Fix list (ranked by impact)

1. **BLOCKING - the control shot's `ctl.lkp` assert fails every run.** `scripts/e2e-sectorops.mjs:445-460`. The loud
   shot is fired from `G()` between ticks: `EnemyManager.noise` sets `lkpValid = true` and gives the nearest guard a
   gunfire stimulus, but the guard only turns `alert` inside `e.update`. On the first tick `EnemyManager.update`
   (`src/ai/enemyManager.ts:617`) runs `if (lkpValid && sightT > 2 && !hunting) lkpValid = false` before the guards
   update; `sightT` is 99+ (set by `despawnAll` at the restart, no sighting since) and nobody is alerted or searching
   yet, so the last known position is dropped on that tick. The spot is out of every guard's sight, so no
   `reportSighting` sets it again within the 0.5 s. Result: `ctl.nearest === true` but `ctl.lkp === false`, and the
   suite fails on the runner for a reason that is not the game. **Done looks like:** the control reads `lkpValid` in
   the same `G()` call right after `w.shoot()` (before any tick) or drops `&& ctl.lkp`, keeps
   `ctl.nearest === true`, and the laptop runner passes e2e-sectorops on the new head.

## Polish list
- (pre-existing on master, not this job) A loud shot's last known position lasts one tick when nobody sighted a player
  in the last 2 s (item 1's line 617 runs before the guards turn alert); the alerted guards then chase their own
  stimulus with no shared flow goal. Worth a backlog line for the AI owner.
- `restoreCheckpoint` returns early (`!checkpointKit.taken`) before the throw reset; unreachable in Sector Ops (the run
  start always marks), but moving the throw reset above the guard would make it unconditional.
- Carried from CHECK.md and REPORT.md "Open items (added)": 4 (client snapshot timing in a mid-cycle restart), 5 (a
  client's frag / noisemaker in the latency window), 6 (pre-existing: the co-op client never hears alert music);
  doors and shot-out lamps stay as they were at a restart.
- ESLint does not cover `scripts/*.mjs` (config ignore); `node --check` is the only lint on the e2e script.
