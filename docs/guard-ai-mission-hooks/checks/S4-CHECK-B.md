# guard-ai-mission-hooks S4: check B (rules, hot paths, tests, e2e)
Owner: Guard AI Build. Status: current.
Verdict: PASS

Checker: fresh Opus 5.5 (B), independent of check A (not read). Diff checked: 86fb4164b..6fb0e1b32 (+510 / -18) over
`src/ai/enemyManager.ts`, `tests/noiseZones.test.ts` (new), `tests/hearing.test.ts`, `tests/missionOrdersManager.test.ts`,
`tests/postsWiring.test.ts`, `scripts/e2e-stealth-ai.mjs`. Against `slices/S4-BRIEF.md` (steps 1-3, Rules, Must NOT
touch, Checks, assumptions S4-a..e, lead decisions 1-4). Every changed line read; the e2e scenario read, not run.

Runs (laptop CPU 23%): `npm run typecheck:fast` clean. `npx eslint` on the 5 changed TS files clean.
`node --check scripts/e2e-stealth-ai.mjs` clean. `npx vitest run tests/noiseZones.test.ts tests/hearing.test.ts
tests/missionOrdersManager.test.ts tests/postsWiring.test.ts tests/areaAlarmsManager.test.ts`: 5 files, 97 tests, all pass.

## Findings (none blocking)

### Rules and scope
- Only the six owned files change; `hearing.ts`, `guardAiData.ts`, `consoleFault.ts`, `breaker.ts`, `enemy.ts`,
  `flags.ts`, `src/game/**`, `src/world/maps/**`, `docs/systems/ai.md` untouched. No wire, save or `PROTOCOL_VERSION`
  change. Strict TS clean (`l[i]!`, `this.noisy[i]!`).
- Dark behind `flags.noiseZones`: the one gate is `setNoisy` (`enemyManager.ts:2730`), which the constructor now calls
  (`:636`); `mapNoisy` keeps the data (S4-a). Field initialisers (`breakers` `:574`, `consoles` `:610`, the mask
  `:358`) run before the constructor body, so the early `refreshNoise` is safe.
- `powerOff` (`:2752-2754`) matches the brief: console groups through `consoles.isOff(ofGroup(g))` (-1 reads on), else
  `breakers !== null && isOff(g)` (no host: on, S4-b; `on: 'off'` then silent, lead decision 4). `ctx.breakerOff` (`:752`)
  untouched.
- Every `ambientDb(` call in the manager passes the mask: `tierOf` (`:3497`), `hearsShout` (`:3221`), `ambientAt`
  (`:2746`); no other call exists.
- Gameplay reads only the switch state and console faults, never graphics.

### Hot paths
- `noiseStep` / `refreshNoise` (`:2758-2770`): index loop, no closure, array, object, string or iterator; returns at
  once when `noisePower` is false (no grouped source). `sourceLive` and `powerOff` are plain calls. The host's
  `isOff` (`stealthSystems.ts` ~387) walks `mainsGroups.has`, `holding`, `groupBaseOn`, the switches and `cutBoard`:
  all index loops / `includes` on stored arrays, no allocation (O(lights) per grouped source per tick, as the brief
  accepts).
- `ambientAt` (`:2743-2747`): two integer compares, one `ambientDb`; no allocation. The `tierOf` and shout reads add
  one `live[i] === 0` read per source (a `Uint8Array` sized to the list, monomorphic `ArrayLike`).
- The mask is made only in `setNoisy` when the length changes (section load). No `Math.hypot` in `src`.
- `update` (`:4313`) ticks the mask first thing, before any early exit.

### Tests
- `tests/noiseZones.test.ts` covers all 9 brief cases with real assertions (each would fail without the wiring):
  1 flag off (`:127`: list empty, footstep heard, `ambientAt` 0, `mapNoisy` kept); 2 no power link (`:141`, `isOff`
  never called); 3 no host (`:153`); 4 toggle on the next tick plus `on: 'off'` inverted (`:165`); 5 console group and
  unknown console (`:188`, the mask read directly); 6 `ambientAt` = `ambientDb` with the same mask, 12 / 6 / 0, and the
  self-refresh with no tick, including the "first read already refreshes when no tick ran" path (`:206`, traced:
  correct against `hudTick`); 7 the shout -1 then 4 (`:230`); 8 mask identity over 200 ticks / same-length list, new
  one for a longer list (`:244`); 9 `em.update` runs one tick per call on the stub harness (`:260`).
- The three existing files get flag lines only; every assertion and number is unchanged
  (`hearing.test.ts:281-298`, `missionOrdersManager.test.ts:346-353`, `postsWiring.test.ts:272-275, 286-289`).
  `postsWiring.test.ts` edit is covered by lead decision 3. No other test reads masking with no flag
  (grep `setNoisy|mapNoisy|noisy:` over `tests/` and `scripts/`).

### e2e ('noise zone (guard-ai-mission-hooks S4)', `e2e-stealth-ai.mjs:3987-4128`)
- `&noisezones=1` (`:19`) cannot change another scenario: no map under `src/world/maps` carries `noisy` data (only
  `mapDef.ts` / `sectors.ts` types mention it), the suite runs `mode=clear` (no Sector Ops `setNoisy`), and only this
  scenario calls `setNoisy`, putting `mapNoisy` (empty) back in `finally`.
- Follows the suite's patterns: `scen` runs `t.reset()` first (`em.clear()`, lights on, `syncSwitches`, alarm reset),
  so earlier scenarios (area alarm, mission order / group) leave no guards, alarms or cut circuits; seeded
  `Math.random`, `t.light(0)`, the S1a-2 hide (-22, -24) crouched, `switch-4` / `switches[4].group` as the 'breaker'
  scenario, the 'dog release' `floor` check. `finally` restores `setNoisy(mapNoisy)`, the switch on, `t.light(null)`,
  `Math.random`. H and G2 are left spawned, as every other scenario in the file does (the next `reset` clears them;
  this is the last scenario).
- The grid search is deterministic (fixed 2 m grid, 8 / 16 fixed bearings, nav and lamp data only).
- Distances are sound against the hearing model (`turnDb` 0, `investigateDb` 6): G 3 m from S has 12 x (1 - 3/8) =
  7.5 dB, reach 4 x 10^(-7.5/20) = 1.69 m < 3 m: no turn (the same geometry as the `hearing.test.ts` unit case). H by C
  has 0 dB (C 15 m from S, radius 8; H 12+ m from S): 3 m < 4 m reach and 3 m >= 2 m: a tier-1 turn (`turning` via
  `turnT`); `nav.lineClear` keeps a wall out. G is 12+ m from C and H 12+ m from S and G (each misses the other's
  footstep, and 12 m is outside `RADIO.voice` 12, `d >= voice` is -1). The cut is event-based (`lightsOut` perceivers at
  the press): G is despawned before it, G2 spawns after it, 12+ m from the lamps and facing away, and `g2Calm` is
  asserted before the footstep, so a reaction to the dark lamps fails loudly rather than passing silently in that
  window.
- `b1` / `b2` / `b3` / `c1` trace correctly against `hudTick` / `aiTicks` (b1 is the stale read after the steps, b2 the
  self-refresh, b3 and c1 the tick's).

## Polish (non-blocking)
1. `e2e-stealth-ai.mjs:4102`: (c) restores with a blind `sw.onUse` toggle. If H (who may have seen the lamps go) had
   already reset the circuit in the 0.5 s since the cut, the toggle would cut it again and `r.on` would fail.
   Practically nil (a walk of 12+ m with a notice hold in 0.5 s), but `if (!g.stealth.switchOn(grp)) sw.onUse(...)`
   as in `finally` makes it exact.
2. `e2e-stealth-ai.mjs:4095-4099`: `g2Turn` reads `turning || level !== 'unaware'`; a late dark-lamp discovery by G2
   inside the 0.3 s window would pass it without the footstep. `b3 === 0` already proves the mask; an
   `em.hear`-specific signal (e.g. G2's `turnT` source or an incident at S) would make (b) strictly about hearing.
3. `tests/postsWiring.test.ts:272-275, 286-289`: the flag is restored without `try / finally`; a throw in `manager()`
   would leave `noiseZones` on for the file's later cases. The other two files use `try / finally`.
4. The e2e uses `Math.hypot` in page-evaluated test code (not a hot path; other scenarios do the same). Fine as is.
