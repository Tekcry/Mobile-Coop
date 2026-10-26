# guard-ai runner-armed: check A (Opus)
Owner: Guard AI Build. Status: current.

Head checked: fa53d2515 (`feature/guard-ai-runner-armed`), diff `10bb6bd4a..fa53d2515`, brief `RUNNER-ARMED-BRIEF.md`.

## Verdict: PASS

No blocking findings.

## Checks run
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/enemyArms.test.ts tests/runnerArmed.test.ts tests/carryState.test.ts tests/sectors.test.ts
  tests/guardHeadParity.test.ts tests/guardPoseGolden.test.ts tests/animSkeletonGuardIdentity.test.ts
  tests/guardAiAlloc.test.ts`: 8 files, 226 passed, 2 skipped (the two fixture-capture tests, skipped on master too).
  The guardHeadParity runner FREE cases now run armed and pass (Q4 does not arise).
- Extra: the rest of the brief's vitest list (archetypes, killScore, guardHeadCheck, coopTorches, coopGuardCarry,
  guardGunCarry, enemyGunMerge, guardPolishA, squadWiring, alarmCall, camBodyWiring, guardVariant, guardLook,
  changesFragments) plus ctcourse: 15 files, 213 passed. eslint on the brief's file list: 0 errors (the .mjs files are
  ignored by config); `node --check` on the three e2e scripts: ok.
- Not run: e2e (laptop queue, per rules).

## Findings
1. Intent (play): met. `enemies.json:56-92` gives the runner the grunt's block verbatim (asserted by
   `enemyArms.test.ts:30`), `gun: "rifle"`, `melee: null`, engage 4-18 m. In `Enemy.decide` (`src/ai/enemy.ts:3250`)
   the melee branch (strike, lunge) is now reached only by the dog. In sight within 18 m the chase goes to `attack`
   (`usesCover` false, no rng draw), which fires (`tryFire`), strafes, presses to 7 m (`enemy.ts:3375-3377`) and backs
   off inside 4 m. Out of sight the fall-through weaves (`enemy.ts:3353-3354`, `chasePoint` zig beyond 5 m). Every
   other `def.melee` / `def.gun` / `def.weapon` read now treats him as an armed guard, as intended: holster
   (`enemy.ts:690`, `enemyPuppet.ts:154`, `carryState`), head rest armed with his run speed (`enemy.ts:695`,
   `enemyPuppet.ts:160`; parity green), aim / kick / dash (`enemy.ts:3911`, `4146`, `4181-4186`;
   `enemyPuppet.ts:494-498`), normal hearing instead of the melee insta-alert (`enemy.ts:1234`), body checks
   (`enemy.ts:2606`), door check (`enemy.ts:2429`), grenades / flank in `tactics` (`enemy.ts:3528`), and every
   `enemyManager.ts` gate (alarm run, incident board, radio, `GV_MELEE`). The dog is unchanged: his def is untouched and
   both new rules are gated on `def.kind === 'runner'`.
2. A12 (e2e-enemies `alarmRaised = true`, 8 s): sound. `alarmRaised` is a plain field (`enemyManager.ts:249`); the
   sniper scenario sets it the same way (`e2e-enemies.mjs:156`) and it already persisted to later scenarios (the
   officer scenario resets it, `:337`), so no new leak. Without it an alerted armed runner in the stealth rules runs to a
   panel (the A6 behaviour), which is not what this scenario tests. 8 s instead of 6 s only widens the window; the
   assertion text and the 2 m bar are kept.
3. A13 (e2e-levels chase `alarmRaised = true`): sound, same reason; it keeps the test a ladder-link test, with the
   budget, seed, margin and asserts unchanged.
4. A14 (alloc per decide step, < 64 B): correct deviation. The brief's "ten steps under the same 64 B bound" would
   demand < 6.4 B per step and fail on the 16 B HeapNumber that guardAiAlloc already accepts. The measured attack step
   allocates no object. See polish 1 on the bound.
5. A15 (`runner ? known.y : NaN` as `chasePoint`'s `ty`): correct and safe. `known.y` is always a feet height
   (`t.feet`, the intruder slot, `lastKnown.y - 1.1`, or `pos.y`; `enemy.ts:1619-1626`), the same value the melee
   charge (`enemy.ts:3264`) and `pickAdvance` (`enemy.ts:3338`) already pass. In `chasePoint` it only reaches
   `goTo(tp, ..., ty)` (stealth, no intruder) and `lineClear(me, tp, pos.y, ty)`: across storeys the straight line now
   fails and he takes the flow field (the ladder) instead of running to the floor under the target, which is what the
   melee runner did and what the e2e-levels chase needs. Other kinds pass NaN as before (byte-identical behaviour).
   Single-storey maps: `walkLine` ignores `yb` when `layers === 1` (`navGrid.ts:588`), and in `goTo` the arrival test
   only adds a same-column height check, so nothing changes there.
6. Hard rules: met. The new code is two boolean compares and a ternary (no allocation). Strict TS clean. No file under
   `src/net`, `src/save`, `src/game`, `src/player`, `src/anim`; no fixture, fitted table, `CHANGELOG.md`,
   `package.json`, `flags.ts` or `PROTOCOL_VERSION` change (checked against 29f03b6c0). The goldens keep the runner's
   key on a frozen unarmed def (A7) and pass unchanged.
7. Tests prove the claims: on master's runner (melee block) `enemyArms` fails, and in `runnerArmed` the attack,
   point-blank and press cases fail (the melee branch strikes or charges, never fires). With the data armed but the
   enemy.ts change reverted, the press case (along = 0) and the weave case (off line ~0) fail. The grunt control cases
   prove the rules are runner-only. Unit asserts are deterministic (seeded rng, fixed steps). The e2e asserts are sound
   (strike hook is the live `ctx.onMelee -> em.onEnemyMelee`, restored in `finally`; player invulnerable); see polish 2
   on the press-in margin.

## Polish (not blocking)
1. `tests/runnerArmed.test.ts:197`: `< 64` per step still admits a 48 B object; `toBeLessThanOrEqual(HEAP_NUMBER)`
   (16, the reading) or `< 48` would make "allocates no object" exact.
2. `scripts/e2e-enemies.mjs` runner: the press-in rate is about 0.3-0.5 m/s along the line (the strafe plus press at
   0.3 / 0.55 x walk 1.3 m/s, split by sqrt 2), so 8 s gives roughly 2.5-3.5 m against a 2 m bar; a lateral strafe into
   racking could eat that. Print a short state / position trace on failure, as the sniper scenario does, so a laptop
   miss is triageable.
3. The armed chase fall-through still passes NaN for the other no-cover kinds (the heavy): out of sight across storeys
   he lines up on the floor under the target. Pre-existing; a later slice could pass `known.y` for every kind.
4. `tests/helpers/guardHeadHarness.ts:20` `ARMED` doc "a melee guard never aims" no longer names a human kind; fold it
   into the brief's P1 refit.
5. `scripts/e2e-modes.mjs` "enemy types": the `onEnemyMelee` wrap is not restored (end of run, harmless).
6. The brief's P2 (`sectors.ts` stale comment) and P3 (melee fakes named `runner`) stand.
