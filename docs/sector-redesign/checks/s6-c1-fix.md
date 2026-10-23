# e2e-sectorops:6 "C1 cycles" failure (laptop GPU, f03bb0ea)

Failure: `ASSERT: C1 cycles: the near door locks, section 1 unloads (["locked",true,12,1])`. The dump is
`[conn, nearLocked, enemies.length, live]` (`sectorMode.ts` `debug()`: `conn` = `run.conn.state`, `nearLocked` = the
current section's near door, `live` = `ct.liveSection`). Expected `["cycling",true,0,-1]`. Read: C1's whole cycle had
already run out (the run advanced to section 2, its connector reset to `locked`, C2's near door locked), section 2 live
with its 12 guards. The sim was at least 4.0 s past the teleport (hold 1.0 + cycle 3.0) when the test had stepped 1.3 s.

## Cause: test timing (pre-existing), not this branch
- Part 6 (`scripts/e2e-sectorops.mjs`, campusOps) never sets `loop.manual`, so the live rAF loop keeps stepping the
  sim at real time (`src/core/loop.ts` `frame`) in every gap between the `sim()` evaluates (`tp`, three
  `stepHeadless(0.5)` chunks, `frames(page, 1)`, the read). Other parts' helpers set `manual = true` (lines 973, 1975, 2921) for exactly this.
- The check after `tp` into C1 + `sim(1.3)` assumes only `sim` advances time: hold 1.0 s (`SECTOR.connectorHold`) +
  cycle 0.3 s; section 2 loads at cycle 1.5 s and the cycle ends at 3.0 s (`src/game/sectors.ts:491-494`). On a loaded
  laptop (336 s run, this suite 104 s) the real-time steps in those gaps ran the cycle out first.
- Not the branch: the connector path (`sectors.ts`, `sectorMode.ts`, the suite) is untouched vs origin/master. Part 6
  boots at `gfx=min` (e2e-lib default): no baked lamps, so `CharShadows` (LR14) is never built; `shadowAccuracy` (the
  guards' `bodyOccluder`) and the LR13 falloff are default off. #226 at 5504e2e3 failed part 6 at a different assert:
  the part is timing-sensitive across branches.
- No desktop run: `C:/NightShift/heavy.lock` was held (Marlow Build, marlow-final), so this is reasoned from code.

## Fix
`scripts/e2e-sectorops.mjs:1790-1793` (part 6): `loop.manual = true` from just before the teleport into C1 until section 2's
load is read (restored at line ~1799), so only `sim` steps the sim through the hold and the cycle and both checks are
deterministic. Game code unchanged; LR13 toggle default off; no PROTOCOL change.

## Laptop rerun
`E2E_GPU=1 e2e-sectorops:6` on the new head.
