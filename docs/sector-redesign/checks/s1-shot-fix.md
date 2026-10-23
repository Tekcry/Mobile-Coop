# e2e-sectorops:1 "loud shot control" failure (laptop GPU, eb6d63c4)

Failure: `ASSERT: control: a loud shot inside the combat reach alerts the nearest guard ({"nearest":false,"level":"suspicious","alerted":2})`
(`scripts/e2e-sectorops.mjs:548` at eb6d63c4). Passed at 5504e2e3 and on other branches.

## Cause: test timing (pre-existing), not this branch
- Setup (part 1, `warehouseOps`, `sectorGuards=4`): the control computes a spot 0.35 q behind the nearest guard
  (q = `NOISE.shot` x 10^(-combatDb/20) = 28 x 0.251 = ~7.0 m, so ~2.5 m), from his position and yaw at that moment
  (`:500-514`), then `tp` + `sim(0.3)` (`:530-531`), then fires the report from the player's position (`:532-540`).
- Through a wall the combat reach is 0.45 q (`WALL_FACTOR`, `src/ai/hearing.ts:65`, `enemyManager.ts:1754-1757`),
  ~3.2 m: a margin of ~0.7 m, and the setup assert itself already allows the snapped spot up to 0.45 q (`:515`).
- Part 1 never sets `loop.manual`, so the live rAF loop steps the sim at real time in every gap between the
  evaluates (the same bug `s6-c1-fix.md` fixed in part 6). The guard keeps walking his route between the spot read and
  the shot; on a loaded laptop that is enough to put him past 0.45 q. Then `noise()` gives him tier 1 / 2 only
  (`enemyManager.ts:1789-1797`: `hearTurn`, level `suspicious`) instead of tier 3 (`hearGunfire`), while guards nearer
  the shot without a wall go to combat: exactly `nearest:false, level:suspicious, alerted:2`.
- Not the branch: the only `src/` changes since 5504e2e3 are `lightOnRay`'s mount reach (`src/world/lights.ts`) and
  `lampShotOk` (`src/net/lampSync.ts`). The control fires the report only (`onShot`, no round), so `lightOnRay` is not
  on its path; the part's test code (`:294-552`) is unchanged. The earlier rounds (`w.shoot()`) could only matter by
  breaking a lamp, which sends a guard and makes `SHOT_LIGHT_NOISE` (`stealthSystems.ts:525-540`); the suppressed
  round's "no guard turns" check (`:466-470`) passed, and the loud round flies the same line.
- No desktop run: `C:/NightShift/heavy.lock` was held (Marlow Build, marlow-final). Reasoned from code.

## Fix (test only)
`scripts/e2e-sectorops.mjs`, the control block:
- `loop.manual = true` before the spot read, restored in the final read: only `sim` steps the sim.
- The shot evaluate re-pins the report: it teleports the player 0.35 q behind the guard where he stands at the shot
  (nav-snapped, facing his way), fires `onShot`, returns `{before, d, q, level}`; a new assert checks `d < 0.45 q` at the
  shot, and the control's message prints it.
Game code unchanged.

## Laptop rerun
`E2E_GPU=1 e2e-sectorops:1` on the new head.
