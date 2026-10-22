# S4 module - awareness and caution (pure part)

Job guard-ai, slice S4 (PLAN row S4, design section 4, BRIEF M1, M3, goals 2-3, A2, A3, A4, A8), 2026-10-23.
Built: `src/ai/awareness.ts` + `tests/awareness.test.ts`. Nothing else touched; integration is a later step.

## API (`src/ai/awareness.ts`, no Babylon, no allocation per call or tick, no randomness)
- `type Caution = 0 | 1 | 2` (none | timed knockout | held death / intruder). `MAX_KEYS` 32: guard keys 0-31 per
  section, masks are u32.
- `CAUTION`: `koSearch` 60, `koCautious` 180, `sens` 1.3, `waitMul` 0.6, `holds` 8 (pool per section).
- `holdKindFor(kind: IncidentKind)`: `bodyDead -> 'dead'`, `witnessKill -> 'witness'`, `contact`, `missing`; other kinds
  -> null (they hold nobody). Reuses `IncidentKind` from `incidents.ts` via `import type`.
- `class Awareness` (one per section; `section` field):
  - per key (typed arrays): `caution` (effective), `cautionT` (s left in the timed phase), `phase`
    (`PHASE_NONE` / `PHASE_SEARCH` / `PHASE_CAUTIOUS`). Masks: `ko`, `dead`, `held` (OR of every hold's `aware`).
  - hold pool (struct of arrays): `holdOpen`, `holdKind`, `holdId` (monotonic), `holdInc` (incident id), `aware`,
    `downAware`, `holdSeq`.
  - `openHold(kind, awareMask, inc = -1) -> holdId`: dead keys dropped, KO'd keys go to `downAware`.
  - `addAware(holdId, key)`, `addAwareMask(holdId, mask)` (the section once a report gets through).
  - `onDown(key, lethal)`: dead leaves every hold; KO moves `aware -> downAware` (A3: eliminated until woken). Either
    ends his timed caution.
  - `onRevived(key)`: `downAware -> aware` in every hold he was in (held caution back).
  - `startKo(waker, woken)`: revives `woken` if still down, then both search `koSearch` -> cautious `koCautious` -> 0. A
    second find restarts the search. Dead / KO'd keys ignore it.
  - `tick(dt)`: timed countdown (the overshoot carries into the cautious phase, so the total is exact); holds settle.
  - `resetKey(key)` (a new guard on a freed key, e.g. reinforcements on 24-31), `clear()` (section load, restart).
  - queries: `cautionOf`, `isSearching` (timed search phase; true even when also held), `isEliminated`, `sightMul`,
    `waitMul`, `holdCount()` (holds with `aware != 0`), `slotsUsed()`, `isOpen`, `awareOf`, `downAwareOf`, `holdFor(inc)`,
    `kindOf(holdId)`.

Rules as built:
- Held beats timed: a key in both reads 2; his timer still runs underneath. A held key leaves the hold only by being
  eliminated (which also ends his timer), so "held drops back to timed" never happens in practice.
- A hold with `aware == 0` holds nobody (the caution is cleared) but stays **dormant** in the pool while it has
  `downAware` keys, so waking one brings it back. It frees when both masks are 0.
- Pool exhaustion (8 in use): a new hold takes the oldest dormant slot first (its KO'd keys forget it: waking them
  brings nothing back), else its keys merge into the oldest active hold (`merges` counts it). A merge never clears
  caution early (the merged hold clears only when every key of both is eliminated). 8 per section is far above the
  expected load (a handful of deaths per section).
- Keys outside 0-31 are ignored (no throw).

## Tests (`npx vitest run tests/awareness.test.ts`: 18 pass)
Held: death witnessed by 2 -> both held; one eliminated -> still held; both -> hold clears, caution 0; time alone never
clears held (1 h); a later learner (voice / radio) must be eliminated too; `addAwareMask` + `holdFor(inc)`; A3: KO an
aware guard counts as eliminated, revive -> hold back, killed while KO'd -> gone for good; KO'd key opened into a hold
remembers it once woken; `resetKey`; `holdKindFor`.
Timed: KO found -> waker + woken search 60 s, cautious to 240 s (checked at 59 / 61 / 239 / 241 s), then 0, nobody
else; knobs x1.3 / x0.6; held + timed stays held, timer runs underneath, KO'd + woken by `startKo` -> held again and
searching; a hold clearing leaves another key's timed caution; a timed key going down loses the timer; dead ignores
`startKo`; a second find restarts the search.
Pool / keys: exhaustion (merge into oldest, then dormant reuse first, documented forgetting); key 31 and out-of-range
keys; deterministic replay; 10k ticks with churn: same typed arrays, slots <= 8, no new fields.
`npx tsc --noEmit -p tsconfig.json`: clean. ESLint on both files: clean.

## What integration must wire (later step; `enemy.ts`, `enemyManager.ts`, `incidents.ts`)
1. **Stable guard keys.** Add `Enemy.key` (squad-slot index in the section, 0-31) stamped at spawn, and
   `Body.guardKey`. `EnemyManager.revive` today builds a new `Enemy(ctx, b.def, b.pos, Math.random() * 6)` and loses
   everything per-guard. It must carry over: `key`, `squad` (and `joinSquad` the new one into the roster in place of
   the old), the patrol route (`setPatrol(route)` with the same route and post; keep the route on the body or a
   key-indexed table), `post` (P2) / future leash and `highSecurity`, `info` (GuardInfo, unless spent), `hold`
   (RoomRect), `passive`, the section, the officer / archetype buff source (comes with `def`). Also: the board names
   guards by `Enemy.num`, which a revive changes; map key -> num in the `GuardView` refill. The random yaw should
   become deterministic (A7). `Body` needs `guardKey` set from `Enemy.key` in die / knockOut.
2. **Down / revive hooks.** `Enemy.die` -> `onDown(key, true)`; knockout -> `onDown(key, false)`; the existing reviving
   flow (`ctx.revive`, `BODY.reviveTime` 3 s) -> `startKo(finderKey, body.guardKey)` (it revives the woken key itself).
   Body hidden in a container / despawned while KO'd: leave it eliminated (dormant hold frees when he is never woken
   and the pool needs the slot), or call `onDown(key, true)` if the body is gone for good. `despawn` / section unload
   -> `clear()` (or `resetKey` per guard). Reinforcements: `resetKey` on their key 24-31.
3. **Witnessed-kill event.** On `onKilled` (and on a takedown seen without seeing the player: the witness cannot tell
   non-lethal, design 4), each calm guard of the section with the victim in his sight field within `BODY.range` and
   one LOS ray -> `board.report('witnessKill', ...)` and `openHold('witness', witnessMask, incId)`. Seen player ->
   `contact` instead (`openHold('contact', ...)` from the contact incident).
4. **Body found.** Dead: the finder -> `board.report('bodyDead')` + `openHold('dead', finder | voice hearers, incId)`;
   radio `deadReport` (S5 RadioNet); when it completes -> `addAwareMask(holdFor(incId), liveSectionMask)`; killing the
   finder first keeps it to finder + voice hearers. No alarm from it (A2). KO: the finder wakes him (existing flow) ->
   `startKo`; radio one line, section `ack` only, nobody else cautious (M3). Missing (board escalation) ->
   `openHold('missing', sectionMask, incId)` per design 3.
5. **Tick.** `awareness.tick(0.2)` at 5 Hz with the board.
6. **Cautious behaviour knobs** (read per guard by key): sight rate x `sightMul(key)` (`CAUTION.sens` 1.3); patrol pauses
   x `waitMul(key)` (0.6; `PatrolWalker` wait); cautious patrol pace 0.95 and investigate pace (A9); torch rule as
   searching; `isSearching(key)` -> pair search round the KO spot (`searchAt`, waker and woken together);
   caution 1 lets `AlertMachine` go cooldown -> unaware when the timer ends; caution 2 replaces `AlertMachine.fought` as
   the source of permanent caution (`fought` stays for combat stance). Music does not follow caution (A8).
7. **Board link.** `IncidentBoard` scoring uses `cautiousMul` on `LEVEL.cooldown`; feed caution >= 1 into that level (or
   a view flag) so cautious guards are picked first.

Skipped (not this step): all wiring above, radio (S5), e2e. No wire change (caution is host-only).
