# S4 check A (noise wiring and the meter read)
Owner: Guard AI Build. Status: current.
Verdict: PASS

Checker: fresh Opus 5.5, checker A (intent and correctness). Head `6fb0e1b32` on `feature/guard-ai-mission-hooks-s4`,
diff `86fb4164b..6fb0e1b32` (S3b passed head + S2 merged). Spec: S4-BRIEF (steps 1-3, S4-a..e, lead decisions 1-4),
PLAN Design section 3, D8, D9, A11, A12, A14.

No fixes.

## Checks run (laptop CPU 29%)
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/noiseZones.test.ts tests/hearing.test.ts tests/missionOrdersManager.test.ts
  tests/postsWiring.test.ts`: 4 files, 85 tests pass.
- `npx vitest run tests/combatHearing.test.ts tests/marlowHoldNoise.test.ts tests/consoleFault.test.ts
  tests/consoleNoticeA4.test.ts tests/breaker.test.ts tests/alarmCall.test.ts tests/radioWiring.test.ts
  tests/missionGroups.test.ts tests/guardAiData.test.ts`: 9 files, 152 tests pass.
- No e2e (lead's, laptop queue).

## Done looks like (flag on)
- Power-linked source masks only while live: `refreshNoise` (`src/ai/enemyManager.ts:2758-2764`) writes
  `sourceLive(s, powerOff(group))` per source; skipped when no source has a group (`noisePower`), the mask then stays
  all 1 from `setNoisy`'s `fill(1)` (2733), so ungrouped lists mask exactly as before.
- One mask per source, refreshed once per AI tick: `noiseStep` at the top of `update` (4311-4313), before any hearing
  in that tick; `hear()` calls between ticks read the last tick's mask (by design, A11).
- Switch state as `ctx.breakerOff` reads it: `powerOff` (2752-2754) is the same expression as line 752 except no host
  = on (A11, S4-b). `on: 'off'` with no host = silent via `sourceLive` (lead decision 4). Unknown console reads on
  (`ConsoleFaults.isOff(-1)` false), covered by noiseZones case 5.
- Both listeners pass the mask: `hearsShout` (3221) and `tierOf` (3497); no other `ambientDb(` call in the file.
- `ambientAt` (2743-2747): same `ambientDb(noisy, x, z, y, noiseLive)` as the listeners; refreshes when
  `hudTick === aiTicks` (no tick since its last read; first read too, both start 0). No allocation.

## Flag off
- `setNoisy` gates to `NO_NOISE` (2730); constructor now routes through it (636), field initialisers (`consoles` 610,
  `breakers` 574, the mask) run first, so the call is safe. `mapNoisy` keeps the data (634); Sector Ops'
  `em.setNoisy(s?.noisy ?? em.mapNoisy)` (`sectorMode.ts:723`) is unchanged and gated the same way. Dev validation
  still runs on `gai` (unchanged).

## Stale-mask cases (none found)
- Size: the mask is resized in the only writer of `noisy` (`setNoisy`, 2731-2732; grep: no other `this.noisy =`),
  then filled and refreshed in the same call, so a list and its mask never disagree in length.
- Section load: `setNoisy` per section, same path. `clear()` does not touch `noisy` (the list stays until the next
  `setNoisy`), consistent with before S4.
- Breaker host set after construction: grouped sources read on until the first tick, then the host's state.
- Co-op host: ticks `update` as solo. Client: no `EnemyManager` (lead decision 1, HUD owner's path).
- Paused game: `ambientAt` refreshes on every read after the first with no tick between; it writes the shared mask,
  so guards and the meter agree (intended, S4-c).

## Edited tests
- `tests/hearing.test.ts:280-298`, `tests/missionOrdersManager.test.ts:346-353`, `tests/postsWiring.test.ts:272-275,
  286-289`: flag on/restore lines only; every assert and number unchanged. `tests/missionOrders.test.ts` also has
  `noisy:` but tests the pure `checkMissionOrders` (unchanged, not gated): no edit needed.

## e2e 'noise zone (guard-ai-mission-hooks S4)' (`scripts/e2e-stealth-ai.mjs:3987-4128`)
- Proves the masking without a false pass: G and G2 stand at the same point `Gp` (3 m from S, `lineClear` to S), so
  (a) G not turning plus (b) G2 turning at the same spot isolates the mask; H turning proves the footstep reaches a
  listener at all. Geometry matches the unit case: 7.5 dB at 3 m from a 12 dB / 8 m source -> 4 m reach x 0.42 =
  1.69 m < 3 m. A footstep at 3 m with 4 m reach is the turn tier only (no incident), so no ack-look spill onto G.
- `b2 === 0` holds whether or not the first read refreshes; `b3`, `c1` after one `t.step(0.1)` (several updates).
- `off` asserts `breakers.isOff(grp)` true (switch-4 is the 'breaker' scenario's untimed circuit, lamps go dark), so a
  timed-window `isOff` false would fail loudly, not pass.
- Site search is deterministic on the warehouse; no pick -> assert fails (no silent skip). `finally` restores
  `setNoisy(mapNoisy)`, the switch, `t.light`, `Math.random`.
- Residual flake risk (low): G2's turn is read as `turning || level !== 'unaware'`; a lights-out task or radio ack
  reaching G2 in the 0.3 s window would also set it. Mitigated by G2 being spawned after the cut, 12+ m from every
  circuit lamp, facing away, and `g2Calm` (incident -1) checked just before the footstep.

## Polish
1. `tests/postsWiring.test.ts:272-275, 286-289`: the flag restore is not in `try / finally` (a throwing `manager()`
   would leak `noiseZones = true` into later cases). The other two files use `try / finally`.
2. e2e (b): tighten G2's turn to the footstep itself, for example `G2.turning` only (turnT is set by `hearTurn` or an
   ack look) plus G2's stimulus within 1 m of S, to rule out a lights-out task as the cause.
3. `setNoisy` reads `flags.noiseZones` at call time: a dev toggle mid-run takes effect at the next section load only.
   Fine for a URL flag; worth one doc word if a runtime toggle ever lands.
4. e2e page code uses `Math.hypot` (test code, not a hot path; matches the file's other scenarios).
