# guard-ai runner-armed: the runner draws and fires (slice brief)
Owner: Guard AI Build. Status: current.

Pinned on origin/master 29f03b6c0. Anchors are quoted by content; line numbers are "~N on 29f03b6c0" only. **Re-find
every anchor on your real base before editing.**

Builder: Opus 5.5 (AI code, G302). Two independent Opus checkers (an AI PR). Ships ON: a fix to a shipped rule (G298),
so no flag and no walk cap (G355). No wire change, no save change, no `PROTOCOL_VERSION` touch.

## Goal
Every human guard is armed (G298). Michael (2026-10-23 ~01:25, G298) picked "Every map" for "no melee-only guards", and
in G295 (2026-10-23 ~01:08): "why would there be melee only guards they should all have weapons". The runner kind is
still melee only on master: `src/config/enemies.json` has `"weapon": null` and a `melee` block (~48-65), so
`Enemy.decide` runs its melee branch (`// ---- melee (runner) ----`, ~3249 `src/ai/enemy.ts`): in reach he strikes
(`applyDamage(... 'melee' ...)`), lunges at 7 m/s from 2.2-6 m, otherwise runs straight at the player and zigzags. He
has no gun model (`gun: null`), never aims, never holsters, and every `def.melee` check (~25 sites in `enemy.ts`,
`enemyManager.ts`, `enemyPuppet.ts`, `carryState.ts`) treats him as a melee kind: never the alarm runner, never sent by
the incident board, never notices bodies, never joins roles, never holsters.

After this slice the runner carries a rifle and fights like the other armed kinds: he draws, aims, fires bursts with
tracers, holsters when calm, joins the alarm run, the incident board, body checks and radio calls like any guard. He
keeps what makes him the runner: a light, fast guard (55 hp, 1.3 / 4.2 m/s, lean build, the hoodie), no cover, who
weaves as he runs in and presses close while he fires.

Facts the lead should know:
- Player Build's J19 S4 (R16, "the runner gets the grunt's weapon block") is **planned, not built**:
  `origin/feature/player-batch-j19` holds only BRIEF / PLAN / STATE (b5f62145b); no S4 branch exists; master's runner
  is unchanged. J19 BRIEF A7 also says "it keeps its melee": with the melee block kept, `if (def.melee)` still wins and
  every melee-kind check still holds, so the data alone would not arm him. This slice takes R16 whole (A1, Q1).
- No live map places a runner. He appears in the parked Warehouse Clear rooms (`src/world/maps/warehouse.ts:96`,
  "Racking Aisles"), the parked mission mode (`src/game/modes/missionMode.ts:46`, `:107`), and in e2e / perf spawns.
  Sector Ops' validator rejects him today ("carries no gun (M1)", `src/game/sectors.ts` ~608); after this slice he
  passes it.

Bible (`docs/design-bible.md` 5.7) only lists the runner among the archetypes ("guard, runner, sniper, enforcer,
officer"); it gives him no role. The pre-3.0 changelog had "Runner (zigzag charge, lunge, melee)". Decision (A5, A6):
keep the charge (speed, the weave, pressing in), drop the strike and the lunge, add no messenger role.

## Location
- Worktree `C:/NightShift/Mobile-Coop-guard-ai-runner-armed`, branch `feature/guard-ai-runner-armed` (cut from
  origin/master 29f03b6c0). `node_modules` is a junction: never commit it.
- Read first: `git show origin/master:docs/systems/agent-preamble.md`, `git show origin/master:CLAUDE.md`, and the "A
  job" and "Test tiers" sections of `docs/RULES.md` (the awk line in the preamble).
- Branch guard before every write:
  `cd /c/NightShift/Mobile-Coop-guard-ai-runner-armed && test "$(git rev-parse --abbrev-ref HEAD)" = feature/guard-ai-runner-armed && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-guard-ai-runner-armed"`
- Commit and push each finished step: `git add <your files>` only (never `-A` or `.`), short subject tagged
  `guard-ai runner-armed:`, trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`,
  `git push origin feature/guard-ai-runner-armed`.

## Files owned
- `src/config/enemies.json` (the `"runner"` entry only)
- `src/ai/archetypes.ts` (a `runner` entry in `ARCHETYPE`)
- `src/ai/enemy.ts` (the chase return, the attack press, two comments)
- `src/ai/guardHead.ts` (one comment line in the header recipe, no table change)
- `tests/enemyArms.test.ts` (new), `tests/runnerArmed.test.ts` (new)
- `tests/carryState.test.ts`, `tests/sectors.test.ts`
- `tests/helpers/guardPoseGolden.ts`, `tests/helpers/animSkeletonGuardIdentity.ts`, `tests/helpers/guardHeadHarness.ts`
  (comment only)
- `scripts/e2e-enemies.mjs`, `scripts/e2e-modes.mjs`, `scripts/e2e-levels.mjs`
- `changes/feature-guard-ai-runner-armed.md` (new; text below)

## Must NOT touch
- `src/net/**` (no wire change: below), `src/save/**`, `src/player/**`, `src/anim/**`, `src/game/**` (a `src/game`
  edit adds the co-op checker gate; the stale `sectors.ts` comment goes on the polish list, P2).
- `src/ai/enemyManager.ts`, `src/ai/carryState.ts`, `src/ai/enemyDefs.ts`, `src/ai/enemyRig.ts`,
  `src/net/enemyPuppet.ts`: they read `def.melee` / `def.gun` / `def.weapon` generically and need no edit.
- `tests/fixtures/guard-pose-golden.json`, `tests/fixtures/anim-skeleton-guard-identity.json` (never re-capture; A7).
- The fitted tables in `src/ai/guardHead.ts`, `tests/guardHeadSweep.test.ts`, `scripts/guard-head-fit.mjs` (no refit;
  A10).
- The melee fakes in `tests/alarmCall.test.ts` (~265), `tests/camBodyWiring.test.ts` (~194),
  `tests/squadWiring.test.ts` (~183): they build their own `def: { melee: {}, kind: 'runner' }` to test the melee-kind
  rule, which still holds for the dog; leave them (A11).
- `docs/systems/ai.md`: write its new lines in your report (below); the lead folds them.
- `CHANGELOG.md`, `package.json`, `src/core/flags.ts`.

## Co-op (no wire change)
The client poses each guard puppet from its local `ENEMIES[kind]` (`src/net/enemyPuppet.ts` ~154 `mayHolster(...,
!!this.def.melee, ...)`, ~160 `guardHeadRest(... this.def.gun !== null ...)`, ~494 `rp.aim = this.def.melee ... ? 0`,
~497-498 kick / melee). Host and client load the same `enemies.json`, so the runner's puppet gets the rifle model, the
holster carry (its phase already rides `al` bits 7-8 for every holstering kind, A126) and aims, all from data. His shots
reach the client through the existing `tracer` event (`src/net/coopHost.ts` ~327, colour from `e.def.weapon?.tracer`).
Damage is host side. Nothing in `src/net` changes.

## Steps
### 1. `src/config/enemies.json`: the runner entry (~48-65 on 29f03b6c0)
Inside `"runner": { ... }` only:
- `"engageMin": 0` -> `4`; `"engageMax": 1.7` -> `18` (A4).
- `"usesCover": false` stays.
- `"weapon": null` -> the grunt's block verbatim (A3; copy it from `"grunt"`, ~14-25):
  `{ "damage": 7, "rpm": 420, "burstMin": 3, "burstMax": 6, "pauseMin": 0.9, "pauseMax": 1.8, "windup": 0,
  "spreadDeg": 3.2, "range": 34, "tracer": "#ff9a6a" }` (format it as the grunt's: one field per line).
- `"melee": { "damage": 16, "range": 1.7, "cooldown": 0.85, "lunge": 7 }` -> `"melee": null` (A2).
- `"gun": null` -> `"gun": "rifle"` (A3).
- Everything else unchanged (name, hp 55, armor, headMult, speeds, turnSpeed 12, xp, credits, look, height, build,
  plated). `validateEnemyDefs` (`src/ai/enemyDefs.ts` ~74) still passes (weapon present).
Commit: `guard-ai runner-armed: the runner carries the grunt's rifle (G298)`.

### 2. `src/ai/archetypes.ts`: the runner's two rules
In `export const ARCHETYPE = { ... } as const` (~8-65), after the `enforcer` entry (~18-23), add:
```ts
  runner: {
    /** (guard-ai runner-armed, G298) He weaves on the run in (the old charge's zigzag, `Enemy.chasePoint`, beyond 5 m
     *  of his target). Undo: false. */
    weave: true,
    /** He presses in while he fires, as an aggressive guard does (closes to `engageMin` + 3 m in the attack state).
     *  Undo: false. */
    pressIn: true,
  },
```
Update the file header's first sentence list to mention "the runner's weave and press".

### 3. `src/ai/enemy.ts` (~6 lines; tag `(guard-ai runner-armed)`)
1. The melee comment `// ---- melee (runner) ----` (~3249) -> `// ---- melee (the dog; every human kind is armed,
   G298) ----`. The branch body is unchanged (the dog keeps it).
2. The chase fall-through at the end of `case 'chase'` (~3350):
   `return this.goal(this.chasePoint(dt, tp, false), this.los ? def.walkSpeed : def.runSpeed, null);` ->
   `return this.goal(this.chasePoint(dt, tp, def.kind === 'runner' && ARCHETYPE.runner.weave), this.los ? def.walkSpeed : def.runSpeed, null);`
   with the comment `// (guard-ai runner-armed) the runner weaves on his run in (ARCHETYPE.runner.weave)`.
   Leave the other `chasePoint(dt, tp, false)` calls (armour move ~3319, the stealth advance ~3347, the enforcer ~3284)
   as they are.
3. `case 'attack'` (~3371):
   `const away = this.dist < def.engageMin ? -1 : this.tacticsProfile === P_AGGRESSIVE && this.dist > def.engageMin + 3 ? 1 : 0;` ->
   ```ts
   // (guard-ai runner-armed) the runner presses in like an aggressive guard (ARCHETYPE.runner.pressIn)
   const press = this.tacticsProfile === P_AGGRESSIVE || (def.kind === 'runner' && ARCHETYPE.runner.pressIn);
   const away = this.dist < def.engageMin ? -1 : press && this.dist > def.engageMin + 3 ? 1 : 0;
   ```
4. `chasePoint`'s doc (~3555): "Runners zigzag." -> "`zig`: a lateral weave beyond 5 m (the dog's charge; the runner's
   run in, `ARCHETYPE.runner.weave`)."
`ARCHETYPE` is already imported (~41). No new field, no closure, no temporary: a string compare and two constants per
step (hot path allocates nothing). Commit.

### 4. `src/ai/guardHead.ts`: header comment only
In the regenerate recipe (~22-23): "grunt, heavy, sniper, enforcer, officer, droneOp armed, the runner unarmed" ->
"grunt, heavy, sniper, enforcer, officer, droneOp armed, the runner unarmed (as fitted before G298 armed him; refit:
polish P1)". No table or code change.

### 5. Unit tests
1. `tests/enemyArms.test.ts` (new, ~45 lines; pure, imports `ENEMIES`, `ENEMY_KINDS` from `src/ai/enemyDefs`):
   - "every human kind carries a gun (G298)": for each kind with `!def.quadruped`: `def.weapon` truthy, `def.gun` not
     null, `def.melee` null (message names the kind). A melee block would make him a melee kind at every `def.melee`
     read.
   - "only the dog is melee": the quadruped kinds are exactly `['dog']`, `ENEMIES.dog.melee` not null, `weapon` null.
   - "the runner: the grunt's weapon block, the rifle, a 4-18 m band, no cover, still light and fast":
     `ENEMIES.runner.weapon` `toEqual(ENEMIES.grunt.weapon)`, `gun` 'rifle', `engageMin` 4, `engageMax` 18,
     `usesCover` false, `hp` 55, `runSpeed` greater than `ENEMIES.grunt.runSpeed`.
2. `tests/runnerArmed.test.ts` (new, ~170 lines). Copy the stand-in pattern of `roleProbe` in
   `tests/guardPolishA.test.ts` (~58-200: `Object.create(Enemy.prototype)`, a stub ctx, `Object.assign` of the fields
   `decide` reads); do not import from or edit that file. Your probe: `def: ENEMIES.runner` (or a kind given),
   `stealth: () => false`, `hunt: -1`, `aware: { alert: true, level: 'alert' }`, `los` / `dist` / `state` / `stateT` /
   `pos` given, target feet at the origin, `ctx.onMelee = vi.fn()`, `ctx.nav.lineClear = () => true`, and the
   instance's `tryFire` replaced by `vi.fn()` after the assign. Cases (each `decide(1 / 60)` steps as `roleProbe.step`):
   - "in sight inside 18 m he goes to the attack and fires; no strike": runner at (0, 0, -10), `los` true, `dist` 10,
     state 'chase': one step -> state 'attack'; the next step calls `tryFire`; `ctx.onMelee` never called; no
     `applyDamage` on the target (give the target `target.applyDamage = vi.fn()` and assert it is not called).
   - "point blank he still shoots, never strikes": `dist` 1.2, state 'attack', `los` true, `meleeCd` 0: `tryFire`
     called, `onMelee` not called, `meleeCd` stays 0.
   - "he presses in while he fires": state 'attack', `los` true, `dist` 10 (> 4 + 3): the goal point is closer to the
     target than his position (the dot of goal - pos with target - pos is positive beyond the strafe's lateral part:
     assert the along-target component > 0). The same probe with `def: ENEMIES.grunt` (P_STANDARD) at `dist` 10 has
     an along-target component of 0 (strafe only). Inside `engageMin` (`dist` 3) the runner backs off (component < 0).
   - "he weaves on the run in": state 'chase', `los` false, `dist` 12, `stateT` 0.3, `pos.x` 0 (sin(1.2) != 0): the
     goal point is off the straight line to `knownPt` by more than 0.3 m; the grunt probe's goal is on it (< 1e-6).
   - "no allocation": wrap ten `decide` steps of the attack case in `bytesPerCall` (`tests/helpers/allocPerCall.ts`, as
     `guardPolishA.test.ts` A14 does) and assert the same bound that test uses.
3. `tests/carryState.test.ts` (~58-71): in "every guard kind with a gun holsters except the sniper and the enforcer;
   the dog and melee kinds never", add `expect(want.runner).toBe(true);` after `want.officer`.
4. `tests/sectors.test.ts` (~245-268, "(sector-redesign G3 / G20) guards: everyone armed ..."):
   - Add `'runner'` to the armed loop: `for (const k of ['grunt', 'officer', 'sniper', 'droneOp', 'runner'] as const)`.
   - Keep the M1 rule covered with a stand-in: replace the three runner asserts (~253, ~262, ~264) by a block that
     swaps `ENEMIES.runner` for `{ ...keep, weapon: null, gun: null }` inside `try { ... } finally { ENEMIES.runner =
     keep; }` (comment: "no shipped human kind lacks a gun since G298: a stand-in def keeps the M1 rule tested") and
     runs the same three expectations inside it, unchanged.
5. `tests/helpers/guardPoseGolden.ts` (~94-98) and `tests/helpers/animSkeletonGuardIdentity.ts` (~89-93): the loop's
   `const def = ENEMIES[kind];` -> `const def = kind === 'runner' ? GOLDEN_RUNNER : ENEMIES[kind];` with, before the
   loop, `/** (guard-ai runner-armed, A7) The fixtures were captured with the runner unarmed (before G298): his key keeps
   that def, so the fixture stays valid and still covers the unarmed rig; the armed lean rig is the sniper's key. */
   const GOLDEN_RUNNER = { ...ENEMIES.runner, gun: null };` (the rig reads only look, height, build, plated, gun, kind:
   `src/ai/enemyRig.ts` ~21-40). No fixture change.
6. `tests/helpers/guardHeadHarness.ts` (~18): the `FREE` doc "rifle average, melee lean, rifle broad" -> "rifle average,
   rifle lean (the runner, armed since G298), rifle broad". `ARMED` and `ALL_ARMED` unchanged (A10).
Commit after each file group passes.

### 6. e2e (one suite owns guard archetypes: `e2e-enemies`)
1. `scripts/e2e-enemies.mjs`: a new scenario `'runner'` in the `run('autostart=warehouse&mode=clear', [...])` list,
   after `'sniper'` (~148). Header line 1-6: add "runner (draws, fires bursts, never strikes, presses in)". Body
   (sim time on the manual clock, `window.__t` helpers):
   - `t.tp(8, 0, -4, 0)`; `const e = t.spawn('runner', 8, 9, Math.PI, true)` (the sniper scenario's lane: 13 m, clear).
   - Count strikes: `let strikes = 0; const prev = em.onEnemyMelee; em.onEnemyMelee = (x) => { if (x === e) strikes++; prev?.(x); };`
     (restore it at the end, `try / finally`).
   - Record `d0` (feet distance), step 6 s in 0.5 s steps (`t.step(0.5)`).
   - Return `{ fired: e.roundsFired, drawn: e.carry.drawn, gun: !!e.gun, kindMelee: !!e.def.melee, strikes, d0, d1,
     state: e.state }`.
   - Asserts: `gun && !kindMelee` "the runner carries a gun model and no melee block (G298)"; `drawn` "his gun is
     drawn in the fight"; `fired > 0` "the runner fires on the player (N rounds)"; `strikes === 0` "no hand-to-hand
     strike"; `d1 < d0 - 2` "he presses in while he fires (d0 -> d1 m)".
   - Name check: no other scenario name contains "runner", so `--only=runner` runs this one alone.
2. `scripts/e2e-modes.mjs` "enemy types" (~83-98 on `proving&mode=mission`): keep the spawns. Before the `sim(4)`,
   wrap `g.enemyMgr.onEnemyMelee` to count calls on `window.__runnerStrikes`. Replace
   `assert(hp1 < hp0, \`runner closes in and deals melee damage ...\`)` by: `hp1 < hp0` "the runner and the heavy fire
   on the player (hp0 -> hp1)"; the runner's `roundsFired > 0` "the runner fires (N rounds)"; strikes 0 "the runner
   never strikes hand to hand (G298)". The heavy block after it is unchanged.
3. `scripts/e2e-levels.mjs` (the ladder `chase`, ~74): an armed runner who sees the player across storeys stops and
   fights from his own (that was the old grunt / runner difference), so this nav-link test blinds him: right after
   `const e = em.spawn('runner', ...)` add `e.losTo = () => false;` with the comment "(guard-ai runner-armed, A8) an
   armed guard in sight fights from his storey; this is a ladder-link test: sightless, he follows the reported last
   known position across the ladder (`sendIn` below), as the melee runner did once sight broke". Update the header
   comment near ~40-45 ("the runner takes the ladder once sight breaks") to say so. Keep the budget formula, the seed,
   the margin and every assertion text. Never raise the budget.
Commit.

### 7. Changelog fragment `changes/feature-guard-ai-runner-armed.md`
```
# Guard AI: the runner is armed
kind: patch
- Guards: the runner now carries a rifle and fights like the other armed guards (G298: every guard is armed). He draws,
  aims and fires bursts, holsters when calm, and joins alarm runs, body checks and investigations like any guard; no
  more hand-to-hand strikes or lunges. He is still the fast, light guard without cover who weaves as he runs in and
  presses close while firing. Seen in the parked Warehouse modes; no live map places a runner.
```

## Report lines for `docs/systems/ai.md` (the lead folds them)
- ~90 "Melee kinds (dogs, runners) keep `Enemy.hear` ..." -> "The dog (the only melee kind since G298) keeps ...".
- ~491 "enforcer, melee kinds and dogs never holster" -> "enforcer and the dog never holster (the runner holsters since
  G298)".
- ~713 after `ENEMY_KINDS`: "Every human kind is armed (G298, `tests/enemyArms.test.ts`); the runner is the light, fast
  no-cover guard: the grunt's rifle, engage 4-18 m, `ARCHETYPE.runner` weave (the chase) and pressIn (the attack)."
- ~777 "fails a human guard with no gun (no runners, M1)" -> "fails a human guard with no gun (M1; none ships since
  G298)".

## Checks
- `npm run typecheck:fast`
- `npx eslint src/ai/enemy.ts src/ai/archetypes.ts src/ai/guardHead.ts tests/enemyArms.test.ts tests/runnerArmed.test.ts tests/carryState.test.ts tests/sectors.test.ts tests/helpers/guardPoseGolden.ts tests/helpers/animSkeletonGuardIdentity.ts tests/helpers/guardHeadHarness.ts scripts/e2e-enemies.mjs scripts/e2e-modes.mjs scripts/e2e-levels.mjs`
- `npx vitest run tests/enemyArms.test.ts tests/runnerArmed.test.ts tests/carryState.test.ts tests/sectors.test.ts tests/archetypes.test.ts tests/killScore.test.ts tests/guardPoseGolden.test.ts tests/animSkeletonGuardIdentity.test.ts tests/guardHeadParity.test.ts tests/guardHeadCheck.test.ts tests/coopTorches.test.ts tests/coopGuardCarry.test.ts tests/guardGunCarry.test.ts tests/enemyGunMerge.test.ts tests/guardPolishA.test.ts tests/guardAiAlloc.test.ts tests/squadWiring.test.ts tests/alarmCall.test.ts tests/camBodyWiring.test.ts tests/guardVariant.test.ts tests/guardLook.test.ts tests/changesFragments.test.ts`
- `tests/guardHeadParity.test.ts` now runs the runner's FREE cases armed (the data flips them). If a runner case fails
  its tolerance: stop, do not loosen a tolerance or touch the tables; report the case and its numbers (Q4, polish P1).
- e2e (laptop queue only; the PR head's `affected-e2e` runs by itself). The lead requests the deciding suites by name
  (named requests gate, LEGACY included): `node scripts/laptop-queue/request.mjs --sha <full sha> --pr <n> --suites
  "e2e-enemies e2e-modes e2e-levels" --set runner-armed --requester "Night Shift | Guard AI Build" --fix`. Deciding
  names: `e2e-enemies --only=runner` ("the runner fires on the player", "no hand-to-hand strike", "he presses in"),
  `e2e-modes` "enemy types", `e2e-levels` "a runner climbs the rack ladder to the player" / "a runner on the rack
  climbs down to the player". No co-op group needed (no `src/net`, `src/save`, `src/player`, `src/game` or wire
  change).

## Done looks like
- In Warehouse Clear (`?legacy=1`, Hunter) the Racking Aisles runner carries a rifle on his back while calm, draws it
  when he is alerted, fires bursts with tracers, weaves on the run in, presses in while firing, and never punches.
  `?autostart=warehouse&mode=clear` with `e2e-enemies --only=runner` green.
- `tests/enemyArms.test.ts`: every human kind has a gun and no melee block; only the dog is melee.
- Sector Ops' validator accepts a runner; the M1 rule still rejects a gunless human (stand-in).
- Goldens unchanged and green; tsc, eslint and the vitest list green; the three deciding suites green on the laptop.

## Size
About 350 changed lines: JSON ~20, `archetypes.ts` ~12, `enemy.ts` ~8, `guardHead.ts` 1, new tests ~215, test edits
~25, e2e ~60, fragment 6. Well under ~1.5k.

## Assumptions (overnight: assumed and logged, never asked)
- **A1** This slice owns R16 whole: the runner's `enemies.json` entry and `tests/enemyArms.test.ts` (J19 PLAN gave both
  to Player's S4). Why: S4 is not built, both would edit the same JSON block (a conflict), and S4's data with the melee
  kept (J19 A7) would not arm him in play. Undo: if S4's R16 lands first, cut a new branch from that master, keep its
  weapon block, and replay only Steps 1 (melee null, engage band, gun), 2-7 on top.
- **A2** The runner loses his melee block (no strike, no lunge). Why: `def.melee` means "a melee kind" at ~25 reads;
  G298 says he fights like the other armed kinds, and no armed kind strikes. Undo: the melee block back plus a
  `meleeOnly = !!def.melee && !def.weapon` predicate at each read (a larger AI slice).
- **A3** The grunt's weapon block verbatim and the rifle model (J19 PLAN R16 and the orchestrator say "the grunt's
  weapon block"; J19 BRIEF A7's "the grunt's sidearm" is read as a slip: the grunt carries no sidearm). Undo: `"gun":
  "pistolSd"` and the officer's block (damage 11, rpm 200, ... range 26).
- **A4** Engage band 4-18 m (was 0-1.7: a reach, not a fight range); no cover, hp, speeds and look kept. Undo: the two
  numbers in JSON.
- **A5** His runner identity is two rules, `ARCHETYPE.runner.weave` (the old charge's zigzag, beyond 5 m) and
  `pressIn` (as an aggressive guard). Undo: set either false.
- **A6** No runner-specific role (no preferred alarm runner, no fleeing for help): the bible gives him none, and a new
  role is a new rule, not this fix. As an armed guard he now joins the alarm run, the incident board, body and light
  checks and radio calls exactly as any guard (no squad roles: `usesCover` false, as the heavy). Undo: n/a (Q2).
- **A7** The never-re-capture goldens keep the runner's key from a frozen unarmed copy of his def (`gun: null`). Undo:
  a re-capture with the fixture owner's OK.
- **A8** `e2e-levels`' ladder chase blinds the runner (`e.losTo = () => false`, the e2e-enemies `freeze` precedent):
  it tests ladder links, not combat. Undo: delete the line (he would fight from the other storey).
- **A9** No `src/game` edit: `sectors.ts`'s comment "no melee-only kinds such as the runner" (~588) stays stale (polish
  P2); no `ai.md` edit by the builder (report lines). Undo: n/a.
- **A10** No head-fit refit: the unarmed tables (`idleN*`, `NF0`, `heldNoGun`) now serve no human kind but stay; the
  sweep keeps its runner-unarmed line. Undo: polish P1 (refit with the runner in `ALL_ARMED`, drop the unarmed rows).
- **A11** The three melee fakes named `kind: 'runner'` in `alarmCall` / `camBodyWiring` / `squadWiring` tests stay:
  they build their own def to test the melee-kind exclusion, which still guards the dog. Undo: rename their `kind` to
  'dog' in a polish pass.

## Polish list (not this slice)
- P1 Refit the guard head free MOVE table with the runner armed; drop the unarmed tables if nothing reads them.
- P2 `src/game/sectors.ts` ~588 comment: "no melee-only kinds such as the runner" -> "no gunless human kind".
- P3 The melee fakes' `kind: 'runner'` (A11).

## Open questions for the lead
- **Q1** Tell Player Build to drop R16 from J19 S4 (S4 keeps R17, the goggle default) before S4 is briefed to a
  builder, or hold this slice until S4 lands (then A1's undo).
- **Q2** Should the runner earn a role from his name (the preferred alarm runner, or the one who runs for help)? That
  is a new rule for Michael, outside G298's fix. Suggest: no; put it on the walk card if wanted.
- **Q3** Rifle or pistol for the lean hoodie guard (A3)? A look call; the rifle matches "the grunt's weapon block".
- **Q4** If `guardHeadParity` fails on a runner case, accept the polish refit (P1) as its own Opus anim slice before
  this PR, or let this PR pin the runner's FREE cases to a frozen unarmed def as the goldens do (A7)?
