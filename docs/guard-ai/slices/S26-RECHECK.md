# S26 fix re-check (fresh Opus, 2026-10-23)

Verdict: PASS

Checked: feature/guard-ai-s26 at d30601a2, the fix diff `git diff 4df6b4ba d30601a2` (validate.ts, remotePlayer.ts,
coopHost.ts, enemyManager.ts, net.test.ts, combatHearing.test.ts, S26-FIX.md). Read against the agent preamble, the
CLAUDE.md hard rules, S26-CHECK-B.md (polish 1 and 2, e2e retune 1) and S26-FIX.md.

Runs: `npx tsc --noEmit -p .` exit 0. Vitest on 16 files (net, combatHearing, hearing, coopPerception, coopWalkFixes,
coopGuardAi, moveState, poseParity, plus every other `PROTOCOL_VERSION` file: rejoin, sectorLampSync, sectorStep3,
coopGuardCarry, crateWire, hangDownNet, jammer, jammerFixes): 284 / 284 passed. CPU was 54 % before tsc. Another
process pushed it to 97 % just before vitest; the run took 8.5 s and passed. No e2e run (as instructed).

## Blockers

None.

## (1) Client step noise on the host

- Same rule as the host player. The host player's rule is `gameState.ts:1905`: `alive && grounded && steps !== 'silent'`
  gives `noiseRadius(c.speed, c.crouched || c.steps === 'crouched')`, times surface and suit. `clientStepNoise`
  (`validate.ts:185`) gives `noiseRadius(min(11, s.speed), crouch | driven | mv.m === 'wall')` when grounded and not
  silent. The mapping holds:
  - `s.speed` is the client controller's `c.speed` (`coopClient.ts:827`). It is the same field the host reads and is
    computed the same way: from velocity (`playerController.ts:638`), or as distance / dt under a kinematic override
    (`:444`).
  - `PF.crouch` = `c.crouched`, `PF.grounded` = `c.grounded`, `PF.silent` = steps 'silent' (`netShared.ts:9-18`).
  - `PF.driven` = `c.override`. With `steps = !ov ? 'free' : ov.run || ov.noise === 'crouched' ? 'crouched' : 'silent'`
    (`playerController.ts:430`), "driven and not silent" is exactly steps 'crouched'.
  - `mv.m` arrives as the mode string: `sanitizeMoveState` unpacks the index (`moveState.ts:194`).
  - `r.alive` stands in for `player.alive` (`coopHost.ts:1295`).
  - The only differences are known and pre-existing: no surface or suit factor, the 11 m/s cap, and the wall band kept
    from step 11. All of them only make the client quieter.
- A crouch-walking client is never heard. With crouch, driven or wall, `noiseRadius` is 0 up to `NOISE_QUIET.crouch`
  1.9, which is above `crouchWalkSpeed` 1.8. The snapshot-delta estimate no longer feeds noise at all.
- A host-side jump never makes a step. `stepOk` (`remotePlayer.ts:129`) is `state !== null && d <= max`, computed before
  the clamp, so it covers four cases:
  - First state after construction or rejoin: `state` is null.
  - Teleport, respawn or rejoin restore: `d > max`, whether or not the teleport grace lets it through.
  - Clamped claim: `d > max`. It stays false while the client keeps claiming the far spot, because `feet` is the clamped
    spot.
  - Send-back and revive: `moveTo` (`:179`) and `revive` (`:278`) clear it. The stale claims that follow under the grace
    are `d > max` again.
  No other code writes `feet`: the only writes are at `:64`, `:141`, `:178` and `:277`. The e2e `moveClient`
  (`e2e-coop.mjs:576-578`) uses `controller.teleport`, which zeroes the client's velocity, so its sent speed does not
  spike either. The `e2e-coop:1333` flake mechanism is gone (e2e not run here).
- No wire change. `protocol.ts` is untouched. The `net.test.ts` hunk only adds lines, and no other `PROTOCOL_VERSION`
  file changed. All of those files pass.
- The host player's path is byte-identical: `gameState.ts` is not in the diff.
- `r.ref.speed` is unchanged (`remotePlayer.ts:142`). It still feeds perception only (`enemy.ts:2114,2145,3183`,
  `perception.ts:161,172`). The only call site that changed is the step line at `coopHost.ts:1299`.

## (2) The blind gate (`enemyManager.ts:2624`)

`hear()` routes a guard into `hearFight` only when all of these hold: `COMBAT_HEAR.enabled`, coordinated, stealth, not
melee, alive, not passive, not taken, and alerted or searching. So the gate covers exactly those guards while
`blindT > 0`. For them it blocks every `hearFight` effect:
- the searcher's walk (`hearSearch` and the plan-claim release)
- `heardInFight`
- `reportHeard` and the hunt switch
- the bark
- the ray

It applies to body noises, lures and noises nobody made alike. It returns before the `heardAt` throttle, so the first
step after the flash is heard at once (tested).

It does not touch these paths:
- calm guards (the tier path below the `continue`)
- dogs and other melee kinds
- the parked modes (`!coordinated`)
- `!stealth`
- shots (`hearShot` is a separate path, `:2540-2567`)

Losing a blind searcher's walk is intended: `Enemy.update` runs no brain while blind (`enemy.ts:2011-2023`), and when
the flash ends he goes to `alert()` or `callContact()`, so the walk would never have been used.

## (3) Hard rules

- No allocation per frame. `clientStepNoise` makes no object (bit tests, `?.`, `Math.min`, `noiseRadius`), and
  `stepOk` is a boolean field. No `Math.hypot` in the diff. The one in `src/operators/lab/retarget.ts:21` is
  pre-existing and in offline lab code.
- No static `src/net` import from single player: grep finds none outside `src/net`. `validate.ts` now imports
  `noiseRadius` from `player/movement` and `PF` as a value from `./protocol`, both from inside `src/net`.
  `movement.ts` imports nothing from net.
- Strict TS: tsc is clean.

## (4) Tests

- `net.test.ts:492` (4 tests). Every stance mapping is silent through its whole quiet band. Each mapping equals
  `noiseRadius(v, crouched)` from 0 to 11 m/s. Silent, airborne or not settled gives 0. The parsed wire speed is used
  and capped. These prove the pure rule.
- `combatHearing.test.ts:319`. A blind fighter and a blind searcher get no ray, no locate, no `locT` change, no
  `heardAt` change, no walk and no bark. Once `blindT` is 0, the next step is heard.
- Gap (accepted, see polish 1): `stepOk` itself has no unit test (Babylon class). The logic is one line and was read
  above. `e2e-coop` covers it.

## Polish

1. Move the `stepOk` predicate into a pure helper in `validate.ts`, for example `continuedStep(hadState, d, max)`, and
   unit-test it, so teleport, clamp and send-back are covered without e2e.
2. A calm guard can be blinded (`gadgetSystem.ts:365,390` blind anyone in range), and the calm path in `hear()` still
   runs `hearTurn` and the board report for him while his brain is off. That is harmless (he goes to `alert()` when the
   flash ends), but for consistency the gate could sit at the top of the loop in `hear()` (`!(e.blindT > 0)`), as
   `enemyManager.ts:789` and `:2397` do.
3. When the clamp trips on a sprinting client (rare given the 0.75 m slack), that state is silent for up to one 0.25 s
   noise tick. It fails quiet. This is noted only so nobody reads it as a bug later.
4. Carried over from S26-FIX "Not done": client steps have no surface or suit factor, and there is no staleness cut on
   the client's last sent speed.

## e2e for the lead

`e2e-coop` (rerun the S24 two-intruders hide at `:1333` about 3 times as a flake check), `e2e-netmove`, and
`e2e-stealth-ai` (for the `hearFight` blind line).
