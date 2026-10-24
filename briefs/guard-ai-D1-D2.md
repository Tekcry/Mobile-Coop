status: closed M0 does not name D1 (ai.manager 15-24% < 40%)

# guard-ai D1 / D2: dormant brains far from every player, shared light reads (guard-cap PLAN section 3, "D1 / D2 brief")

Lead: Night Shift | Guard AI Build. Model: Opus only (AI code); the lead runs two Opus checkers. Unit tests only.


## Answer: M0 verdict (Guard AI Build, 2026-10-24 ~22:55; numbers in briefs/guard-ai-T1.md "Answer")
D1 NOT named: worst cell alert/facing, median r1 / r2, ai.manager (brain + torches) is 15-24% of the sim growth
(needs >= 40%); ai.anim is 55-59% (T1 opens instead). Closed unless a post-T1 M0 rerun shows ai.manager >= 40%.

## Gate (both)
1. M0 verdict names D1: sim p95 > 2.9 ms, `ai.manager` >= 40% of the growth (PLAN section 2; numbers under "Answer:").
2. Merge gate: guard-models (on master, #318) AND gm-perf (d729e490, holds `enemy.ts` lines) merged:
   `git merge-base --is-ancestor origin/feature/gm-perf origin/master`, else `status: blocked gm-perf not merged`.

## Base, branch, only files
Base: origin/master at the time the brief opens (re-read line numbers; below from d91d0e00). Branch
`feature/guard-ai-d1-dormancy`. Only: new `src/ai/dormancy.ts` (pure), `src/ai/enemy.ts`, `src/ai/enemyManager.ts`,
new `tests/dormancy.test.ts`. Not `animTierView.ts` (gm-perf), not `src/net`; no protocol, no save.

## Read first
CLAUDE.md "Hard rules", agent-preamble.md, PLAN 2-4, ai.md "Stealth AI"; enemy.ts `update` :2121, `perceive` :2193,
`goTo` :2453, `calmDecide` :2487, `torchWanted` :1870; enemyManager.ts ctx :680, `update` :3382; perception.ts
`sightRate`; targetPick.ts `mayBeSeen`; intruders.ts `slotOf`; bodies.ts `BODY`; gameState.ts `updateLight` :1636.

## Build
1. `dormancy.ts` (pure, no Babylon / flags / render import): `DORMANCY = { enabled: true, margin: 5, bodyMargin: 5 }`,
   `WAKE_R = PERCEPTION.focusRange + DORMANCY.margin` (30 m), `interface DormancyIn` (calm, enabled, dog,
   nearestPlayer2, nearestBody2: squared horizontal m, Infinity none), `newDormancyIn()`, `dormantNow(i): boolean`
   = enabled && calm && !dog && nearestPlayer2 > WAKE_R^2 && nearestBody2 > (BODY.range + bodyMargin)^2. No sqrt;
   no input from graphics (frustum, drawn, freeze, LOD, preset, anim tier).
2. `Enemy`: `dormant = false` (public read), `private readonly dormIn = newDormancyIn()`. At the top of `update`,
   right after the alive check, refill `dormIn` and set `dormant` (every step: any event since his last step wakes him
   on this one). `enabled` = `ctx.dormancy?.() === true` (absent or a Proxy double's undefined: off, today's code).
   `calm` = ALL of: `aware.level === 'unaware'`, `meter === 0`, `caution === 0`, `!alerted`, `incident < 0`,
   `!searchReq`, `!lc.active`, `camBody === null`, `brkGroup < 0`, `!lure.active`, `reviving === null`,
   `entry === null`, `crew === null`, `alarm === null`, `turnT <= 0`, `!heard`, `!gunfire`,
   `called <= 0`, `hunt < 0`, `pendingHunt < 0`, `radioT <= 0`, `!ctx.radioOpen?.(this)`, `!taken`, `blindT <= 0`,
   `link === null`, `!passive`, `torchOverride !== true`, `(ctx.alarmStage?.() ?? 0) === 0`, `!ctx.alarmRaised()`.
   `nearestPlayer2`: min of dx^2 + dz^2 over every ref in `ctx.players()` with `target.alive` (local and remote, any
   1-4, no index or slot assumed: `slotOf` stays the only slot seam); `nearestBody2` over `ctx.bodies()` with
   `present && !found`. Index loops, no closures.
3. Dormant think (the PLAN's "think x4" kept at today's cadence: `thinkT` and its `Math.random` draw unchanged, so
   every guard's random sequence and think phase match an awake run): in `perceive`, when `dormant`, skip the ray loop
   (:2248-2311, `used` 0) and `lookForBodies`; the rest runs (room, distances, target, `seenMask` 0, tail).
   Light parity, why it is exact: sight needs 3D distance < 25 m (`focusRange`; close feel 1.8 m; light, stance and
   difficulty scale the rate, never the range: `sightRate` :163-168) and hyp2 > 30 m implies 3D > 25 m, so `mayBeSeen`
   is false for every player; dogs (smell) never sleep; a body in `BODY.range` keeps him awake; every other input
   (hearing, radio, board, alarm, cameras, lights out) is manager-side, unchanged, and wakes him through `calm`.
4. Rails (patrol only, the call at :2535): while `dormant`, `goTo` keeps the leg's route: the first dormant call for a
   goal, a new goal, a `nav.version` change or a wake runs today's code and records straight / path; then a straight
   leg returns `p` without `lineClear`; a path leg follows `routePath` (shift as today), re-checks `lineClear` only when
   it shifts a waypoint (clear: straight from there), no `routeT` replan; path empty: `p`. Awake: today's `goTo`.
5. Still ticks, unchanged: `walker`, `decide`, `move`, `syncHitboxes` (shots hit him), voice, radio timers,
   `updateAwareness`, carry, `pushOpen`; manager: board, radio net / checks, alarm stages, `hear` / `noise`,
   `witnessKill`, `lightsOut` / late scan, consoles, cameras, drones, roles, pairs, torches, bodies' light; anim tier,
   `frame`. Co-op: the host decides from every ref; the client runs no AI; dormant guards stay in the snapshot.
6. `EnemyManager`: `dormancyOn = DORMANCY.enabled` (guard-cap A/B: `em.dormancyOn = false`), ctx
   `dormancy: () => this.dormancyOn`, `dormantThisStep` counted in the guard loop (as `raysThisStep`, :3487). No
   `MAX_AWAKE` cap (PLAN "optional"): a cap could only sleep a guard a player may see, against light parity.
7. D2: (a) `torchWanted` returns false before `field.levelAt` when `torchRule` cannot be true (no carrier, or the
   remapped level not investigating / searching / alert without los): a static read per guard per step saved. (b) The
   per-player light is already one shared read per step (owner-sampled `p.light`, gameState.ts:1667-1677, taken first
   at enemy.ts:2281 / :2336): add no cache, lock it with a test. 8. No hot-path allocation; hyp2 / hyp3; strict TS.

## tests/dormancy.test.ts (each a case)
1. Rule: dormant at WAKE_R + 0.01 m, awake at WAKE_R - 0.01; 10 m away 6 m up: awake; a dead player at 2 m: ignored.
2. Each `calm` term false alone: awake (a table); `dormancyOn` false or no ctx `dormancy`: never; a dog never.
3. Bodies: unfound present at 24 m awake, at 26 m dormant; found or not present at 2 m: dormant.
4. Co-op: 4 refs with `slot` set out of index order (slot 3 at index 1): only the remote near wakes him; all four far:
   dormant; a remote joining at 20 m wakes him the next step.
5. Never graphics: freeze on (rig root disabled), anim tier frozen, flags.guardModels / gfx changed: same `dormant`;
   a source scan: `dormancy.ts` imports only `./perception`, `./bodies`.
6. Awake on his first update after each event reaches him: `hear`, `hearTurn`, `noise` gunfire, `deviceAlert` /
   `lightsOut` (board sends him), `witnessKill` / `checkBody`, a radio call, `setAlarmStage(1)`, `alert`, `applyDamage`
   from 40 m, `beginTakedown`, `setCaution(0.5)`, a player crossing 30 m.
7. Dormant: hitboxes at `pos` each step; no torch; `raysThink` 0; answers `radioCheckNow` as awake; `nav.lineClear`
   spy: <= 1 call per straight leg (awake: every step), one per waypoint on a path leg; `nav.version` bump recomputes.
8. D2: `torchWanted` equals `torchRule` over kind x level x los x caution x holding x light, with `levelAt` not called
   when the verdict is false; a ref with `light` set: `lightField.totalAt` never called from `perceive`.
9. Parity (two runs, each in a fresh module graph via `vi.resetModules()` + dynamic import so `Enemy.num` and its
   seeded `rng` match; same map and scripted inputs; `Math.random` stubbed, same seeded sequence; A `dormancyOn` true,
   B false): (a) open straight patrol, a player walks in from 60 m lit into his focus; (b) the same
   crouched from behind; (c) a noise at 20 m while dormant; (d) a radio call; (e) slot-3 remote of 4 approaches.
   Each step: pos, yaw, level, meter, state, incident, hunt, lastKnown, `seesIndex(0-3)`, `thinkT` equal (`toBe`).
   (f) cornered patrol (walls), nobody near: every step within `nav.cell * 1.5` of B, the same leg sequence, each leg's
   arrival within 0.25 s. Any parity miss is a bug: never widen a tolerance.

## Run
`npx tsc --noEmit -p .`; eslint on the 4 files; `npx vitest run --maxWorkers=2` on `tests/dormancy.test.ts`, every test
importing `enemy.ts` / `enemyManager.ts` / `tests/helpers/teamDoorRig.ts` (`git grep -lE "ai/enemy(Manager)?['\"]" --
tests`: 49 on d91d0e00), `visionIsolation`, `animTier`. Catch-all Proxy doubles (`consoleNoticeA4.test.ts:95`) answer
`ctx.dormancy` with undefined: off by design (item 2), so they never exercise it; say so in the report.

## Done when
Diff = only the 4 files; all above green (counts before / after). An existing test failing = a parity bug: fix the
code or `status: blocked <test, assert>`; never edit another test. List e2e asserts you expect to move (expected none).
Branch pushed; trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; report below (files with lines, test
counts, deviations, lineClear calls awake vs dormant), then `status: done feature/guard-ai-d1-dormancy <sha>`.
Lead after: e2e-stealth-ai, e2e-enemies, e2e-sectorops, e2e-coop; M0 rerun sim buckets.

## Lead answer (Night Shift | Guard AI Build, 2026-10-24)
Accepted as written: (1) dormant guards keep today's think cadence (no "think x4": same `Math.random` sequence and
timing as awake); (2) rails with test (f)'s tolerance (`nav.cell * 1.5`, arrival within 0.25 s) on cornered legs only;
a rails step never leaves the nav path (no step through collision), and straight legs stay exact; (3) D2 = skip the
`torchWanted` `levelAt` read for guards who cannot need a torch, plus the shared-read lock-in test; (4) no `MAX_AWAKE`
cap (light parity). These change guard-cap PLAN.md D1 / D2: the lead tells Marlow Build (guard-cap lead).
