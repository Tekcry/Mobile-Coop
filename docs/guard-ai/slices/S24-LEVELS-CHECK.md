# S24 levels fix check - fresh Opus checker, 2026-10-24

Commit reviewed: f3c62b00 (triage report f8158b18, `S24-LEVELS-TRIAGE.md`). Read-only review; one test file run.

## Verdict: PASS

## Correctness
- `spawn(.., true)` -> `sendIn(e)`: `e.tell(commandHunt())` then `e.alert()`. `tell` on a calm guard sets
  `pendingHunt`; `onLevel('alert')` has no target / los yet (not ticked), so it takes `pendingHunt` as `hunt`. Order is
  right (told before combat), so his contact / `callAlert` names the slot.
- `commandHunt()` returns only a valid slot or -1: `alarmHunt` when `intruders.valid[a] === 1`, else
  `intruders.freshest` (valid-or--1 by construction in `intruders.ts`). `tell(-1)` is a no-op. No path hands a guard
  the player's real feet; nothing known still means `knownSpot` falls back to own sighting / stimulus / own position
  (A148 kept). No wallhack reopened.
- Knowledge scope: production `spawn(.., true)` callers are all parked modes (`coordinated = false`): Mission
  pressure spawns (`missionMode.ts:108`), Clear's alarm squads (`clearMode.ts:96` via `onAlarm`), `reinforce` from
  `stealthSystems.ts:676` (parked only), and Sector's `p.alerted && !(p.reinforce && em.coordinated)` (only the
  parked branch; Sector's live reinforcements spawn calm and take `joinAsReinforcement(route, alarmHunt)`, unchanged).
  In the parked modes there is no radio net and pre-S24 they shared one lkp, so "the freshest" is no wider than before.
- Response teams (`spawnReinforcement` coordinated, alerted false), Course (`courseMode.ts:656`, false), Infiltration
  (false), Mission's initial squads (false): untouched.
- `reinforce` / parked `joinReinforcement`: the following `e.tell(this.alarmHunt)` is now a no-op whenever
  `commandHunt` found a slot. Only change: alarm slot forgotten + another valid -> he hunts the freshest valid (A150)
  instead of a positionless slot. Improvement, consistent with the response teams.
- Co-op: `src/net` never spawns; the host spawns and `commandHunt` picks a per-player slot (host or client) the
  same way. Client's slot is handled like any other (i2 covers a guest slot).
- Hot path: `sendIn` / `commandHunt` allocate nothing; `spawn` is not a per-frame path anyway.
- Strict TS: typed-array compare `=== 1` is fine under `noUncheckedIndexedAccess`.

## e2e-levels staging
Honest. The player is reported seen where he stands (stand-in ref with the host's id, so the real ref is not marked
spotted; same pattern as `e2e-sectorops.mjs:3274` and `guard-cap.mjs:468`), then the runner spawned alerted is sent in
on that slot. The test still measures ladder traversal on `flowOf(slot)`; the asserts and budgets are unchanged. The
not-done message now prints `slot / hunt`, useful for the next triage.

## Other alerted-spawn callers (scripts)
All call `em.clear()` (or `t.reset()` -> `em.clear()`) first, which clears the intruders and `alarmHunt`, so
`commandHunt()` is -1 and the fix changes nothing for them: they behave exactly as S24 before f3c62b00.
- `e2e-enemies.mjs:135` (enforcer "in sight"): Clear mode (stealth on). An alerted guard's `pickTarget` takes the
  player with los, and with los `decide` goes for `t.feet`. Passes if he gets line of sight in 4.5 s (the block's
  premise: clear line picked with `nav.lineClear`, facing the player). Not a feet dependency, no retune needed. If it
  fails it is sight, not A148. (The calm enforcer hit earlier in the same scenario may have made a slot valid; then the
  fix only pulls `p` toward the player's earlier spot, which is on the way.)
- `e2e-enemies.mjs:156` (sniper): laser / glint / shots all need sight; same reasoning, unaffected, should pass.
- `e2e-enemies.mjs:276-277` (alarm runner): both guards frozen (`update` no-op), 0.1 s step, asserts which runs the
  panel: hunt is irrelevant. Passes.
- `e2e-modes.mjs:89-90`, `e2e-clear.mjs:198`: set `stealth = false` -> `decide` uses `t.feet` regardless. Unaffected.
- `e2e-pad.mjs:32`: guard 0.9 m in front, `em.clear()` first; sight-driven, unaffected.

## Unit tests
`npx vitest run tests/twoIntruders.test.ts`: 12 / 12 pass (3.0 s). (i) and (i2) use the real `Enemy.tell` and
`knownSpot` and the real private `sendIn` / `commandHunt` on a real `EnemyManager`; only `alert()` is a stand-in that
mirrors the no-target branch of `onLevel('alert')` (take `pendingHunt`). Honest for what it claims.

## Polish (not blocking)
1. `reinforce` (`enemyManager.ts:979`) and parked `joinReinforcement` (`:811`) still call `e.tell(this.alarmHunt)`
   after `spawn(.., true)`; now redundant except to give a positionless alarm slot when nothing is valid. Could go, or
   get a comment.
2. `commandHunt`'s freshest fallback is any guard's report, not strictly what command heard. Fine for the parked modes
   (only production callers); if a live-mode caller ever spawns alerted, it should use `contactHunt` / `alarmHunt` only.
   A one-line note on `sendIn` would pin that.
3. The (i)/(i2) `alert` stand-in does not exercise the real `onLevel` branch (`target && los` first) or the contact
   call naming the slot; a real `Enemy` test would cover the full path.
4. `changes/feature-guard-ai-s24.md` has no line for Mission / Clear reinforcements now going to the known spot (and
   standing when nobody saw anyone).
