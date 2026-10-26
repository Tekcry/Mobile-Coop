# guard-ai runner-armed: check B
Owner: Guard AI Build (independent checker B, Opus). Status: current.

Head fa53d2515 (`feature/guard-ai-runner-armed`), diff `10bb6bd4a..fa53d2515`, base origin/master 29f03b6c0.
Read-only review; the view below was formed from the code before reading the brief.

## Verdict: PASS

No blocking findings. The runner is armed purely from data (`src/config/enemies.json`: grunt's weapon block, `gun:
"rifle"`, `melee: null`, engage 4-18 m, no cover, hp and speeds kept), and every `def.melee` / `def.gun` / `def.weapon`
reader picks that up generically. The dog's melee branch is untouched. No randomness added (the weave is
`sin(stateT * 4 + pos.x)`, the strafe uses the seeded `rng`); the new per-step code is a string compare and two
constants (no allocation; `runnerArmed.test.ts` measures it).

## Checks run
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/enemyArms.test.ts tests/runnerArmed.test.ts tests/coopTorches.test.ts tests/coopGuardCarry.test.ts
  tests/guardGunCarry.test.ts tests/enemyGunMerge.test.ts tests/squadWiring.test.ts tests/alarmCall.test.ts
  tests/camBodyWiring.test.ts tests/sectors.test.ts`: 10 files, 124 tests pass.
- Extra: `guardHeadParity`, `guardHead`, `carryState`, `guardPoseGolden`, `animSkeletonGuardIdentity`: 198 pass, 2 skipped
  (the runner's FREE parity cases, the run at 4.2 m/s with the dash included, now run armed and stay in tolerance).
- eslint on the changed src / tests: clean (the e2e scripts are lint-ignored).
- `git merge-tree HEAD origin/master`: merges clean.

## Findings (all verified, none blocking)
1. Co-op puppet gets the gun, carry and aim with no wire change. `src/net/enemyPuppet.ts:136-160` builds the rig from
   the client's own `ENEMIES[kind]` (rifle model), `:154` `mayHolster('runner', 'rifle', false, false)` is true so the
   `PuppetCarry` / `GuardGunCarry` exist, `:160` the head rest is armed with `dashFrom` 3.36, `:494` aim comes from the
   wire `st` / alert bits (`wireGuardAim`), `:497-498` kick, not the melee arc. The carry phase rides `al` for any guard
   with a carry (`src/net/coopHost.ts:95` `wireCarry(e.carry.phase)`), the tracer colour is the host def's
   (`coopHost.ts:327`), and the client's `tracer` handler gives the nearest puppet `fired()` (`coopClient.ts:772-787`).
   Nothing in `src/net` names the runner as a guard kind (its "runner" hits are the partner-throw role).
2. Squad roles: an armed no-cover runner gets no role he cannot perform. `src/ai/enemyManager.ts:3478` (`inGroup`)
   and `:3567` (flanker) both require `usesCover`; `src/ai/enemy.ts:3289` and `:3540` gate role steps and flanking on
   `usesCover` too. He runs today's tactics like the heavy.
3. Alarm runner, incident board, body checks, hearing, radio: the runner now passes every `!def.melee` filter
   (`enemyManager.ts:1574` alarm run at his 4.2 m/s, `:1343` / `:1413` board and calls, `:2427` `GV_MELEE` no longer
   set, `:2887` / `:2897` coordinated hearing; `enemy.ts:2606` body checks, `:1234` no loud-noise insta-alert).
   He can also throw grenades now (`enemy.ts:3528` `tactics`), as any armed guard.
4. `src/game/sectors.ts:609` validation: `def.weapon` present, so a placed runner passes; the M1 rule stays tested
   through the stand-in def in `tests/sectors.test.ts`.
5. Parked spawns (`src/world/maps/warehouse.ts:96`, `src/game/modes/missionMode.ts:46` / `:107`) need no change; the
   mission mode's reinforcement mix (35 % runners) gets harder, acceptable in a parked mode.
6. Master moved on (train 118, guard-rules S5: panel runs gate on `alarmOpen()` = `!alarmRaised || rearmed`). The e2e
   trick `em.alarmRaised = true` (`scripts/e2e-enemies.mjs`, `scripts/e2e-levels.mjs`) still shuts panel runs after the
   merge while `rearmed` stays false (Warehouse Clear has no repeat alarms). The probe in `runnerArmed.test.ts` sets
   `alarm: null`, so master's `ctx.alarmOpen()` is never called on its stub ctx.

## Polish list
- P-a Stale comments still calling the runner melee / unarmed: `src/game/sectors.ts:588`, `src/ai/enemyManager.ts:2866`
  ("Melee guards (dogs, runners)"), `src/ai/guardHead.ts:59` (`idleNF` "Unarmed (the runner)"),
  `tests/guardHeadParity.test.ts:18` ("not the melee runner"), `tests/helpers/guardHeadHarness.ts:20` (`ARMED` doc "a
  melee guard never aims").
- P-b Head-fit coverage: the runner now aims and strafes while pressing in, but `ARMED` (aimed strafe / backpedal
  parity) is still grunt and heavy only, so the lean armed aimed strafe has no parity case. Fold into the brief's P1
  refit: add the runner to `ARMED` / `ALL_ARMED`.
- P-c In sight beyond 18 m he walks (1.3 m/s, weaving) like any guard; his "run in" happens only out of sight. If the
  walk wants a visible charge, a jog in sight beyond `engageMax` (as `AGGRESSIVE_JOG`) is a one-line rule.
- P-d Version skew: no `PROTOCOL_VERSION` bump (enemies.json is not a wire path), so a join by code across this train
  pairs an old client (shows the host's runner shots as a melee arc on the puppet) with a new host, or the reverse
  (a gun on a striking runner). Cosmetic, parked modes only.
- P-e `scripts/perf.mjs:104` spawns a runner in the combat scene; he now shoots, so the perf trend may step slightly.
- P-f The melee fakes named `kind: 'runner'` in `alarmCall` / `camBodyWiring` / `squadWiring` tests (brief P3).
