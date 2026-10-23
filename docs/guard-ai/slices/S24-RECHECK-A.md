# S24 recheck A (fix round: check A finding 1) - fresh checker A, 2026-10-23

Verdict: PASS

Head e31edd54 (fix bd0cd244 + e2e / docs 086655a2; the merge on top adds only `scripts/e2e-guard-carry.mjs` and a doc).
Read: agent preamble, CLAUDE.md hard rules / current goal, S24-CHECK-A.md, S24-FIX.md, the S24 brief,
`git diff 96d565e5..086655a2`, `git diff dc964d15..e31edd54 -- src tests scripts` (stat + the fix hunks in context),
`src/ai/radioNet.ts` (startCall / complete / enqueue / cut).

## Blocking
None.

## Finding 1 (solo convergence) - closed. Trace
Victim V shot from the dark, no sighting:
- `Enemy.alert()` -> `onLevel('alert')` (enemy.ts:1733): no `los`, `pendingHunt` -1 -> `hunt` -1; not called + `netOn`
  -> `callContact` (enemy.ts:1270-1274): shout + `radioCall(V, -1, 'contact')` -> `noteCaller` skips -1
  (enemyManager.ts:2840-2846). Completes -> `sink.completed` (enemyManager.ts:352-364): inc -1, `contactHunt` untouched,
  `contactThrough` (command call). Delivery -> `radioDeliver` (:2240-2246) -> `e.radio(0, -1)` -> joiners in combat, `hunt` -1.
- V (or any joiner, any calm guard) sees the player: `perceive` -> `takeSighting(best)` (enemy.ts:2127, recall true) ->
  `reportSighting` slot 0 -> had -1 -> `callContact` again (enemy.ts:1255-1261). The new inc 0 passes the net's
  caller + inc + kind dedupe (radioNet.ts:195); both calls may be open at once (pool 16).
  - Voice: `voice()` (enemyManager.ts:2163-2176): an alerted listener with `hunt` -1 in voice range -> `tell(0)` at once.
  - Radio: completes -> `contactHunt` 0, `alarmHunt` 0 if the alarm is up with -1 (:358-362); every section guard ->
    `radio(0, 0)` -> `tell` (enemy.ts:1223-1228): alerted with none -> `hunt` 0; calm / searching -> `pendingHunt` 0,
    taken on going to combat (enemy.ts:1734). The -1 call's deliveries always land first (same per-receiver stagger,
    earlier t0), and a later -1 never clears a slot.
  - Then: `knownSpot` -> `lkpOf(0)` (walk to the LKP); `rolesFor` (hunt === slot) -> roles; `huntingOf(0)` holds the
    slot while any of them is in combat / searching (V down included); `noteCaller` on the re-call makes V reporter.
  - Reinforcements: spawned after the re-call: `raiseAlarm` (:718) / the completed hook -> `alarmHunt` 0 ->
    `joinReinforcement` (:807-821) / `reinforce` (:979). Spawned before it with -1: `e.section` set, so the re-call's
    delivery binds them as any section guard.
- Own alert while told by a slotless call (`onLevel`, enemy.ts:1733): recall only when called and told of nobody; an
  own alert passes false and its own call below carries the slot. No double call.

## New-bug sweep
- Spam: the re-call fires only on the -1 -> slot step; `hunt` returns to -1 only at cooldown / unaware (enemy.ts:1724),
  revive / inherit (:844), despawn (enemyManager.ts:1647). At most one re-call per guard per fight; a later sighting
  (also of another player) makes none.
- Down / despawned / cut: only a living, perceiving guard re-calls; `radioCut` / `complete` (GV_DOWN / GV_HELD / not
  in view) drop it like any call; `releaseTakedown` / blind recovery re-call with the current `hunt` (unchanged path).
- Restarts / section loads: `contactHunt` reset in `resetAlarm` (section load sectorMode.ts:562, `resetMemory`) and
  `clear` (enemyManager.ts:3142). Within a match it does not expire (polish 1).
- G139: `tell` binds only a guard with no intruder (alerted) or no pending one (calm); a guard hunting / told of A keeps
  A. Voice and radio stay per listener / per section. No leak introduced.
- Hot paths: no allocation (`tell`, the voice branch, the completed hook are scalar); the new wall ray in `voice` runs
  only for alerted listeners with no intruder when the shouter has one; `hearsShout` uses `hyp3`.
- e2e retunes (sectorops S6 (b), guard-cap `pageAlert`): `em.ctx.reportSighting` with a stand-in ref carrying the
  host id, then `tell` before `alert()`; reads correct (private `ctx` is reachable at runtime). Not run here.

## Tests (h) and (f2)
Both run the real `takeSighting`, `callContact`, `tell`, `knownSpot`, `huntPos` on stand-ins, against the real manager
(radioNet, `voice`, `radioDeliver`, `sink.completed`, `raiseAlarm`, `joinReinforcement`, roles, `forgetStep`). (h)
covers the voice-range bind at once, the far bind on delivery, G139 (no A), the reporter, no second call. (f2) covers
solo: all four at slot 0, `knownSpot` = `lkpOf(0)`, one roles group, `alarmHunt` -1 -> 0 and a reinforcement told 0,
slot kept after the victim is down. Without the re-call both fail by reading (near / far stay -1). They test the claim.

## Polish
1. `contactHunt` never expires within a match (Warehouse / Marlow alarm once per match; one Sector Ops section load).
   Co-op only: fight 1's contact named A but its alarm lapsed; much later a slotless guard raises the alarm in a fight
   with B -> `alarmHunt` = A (stale, possibly forgotten); the reinforcements bind A, and since `tell` needs `hunt` -1,
   B's re-call never rebinds them: they hold at the entry until they see someone. Fix: take `contactHunt` only while
   `intruders.valid[contactHunt]`, or reset it when its slot is forgotten. Solo unaffected (one slot).
2. Pre-existing S24: a guard hunting A who sees B switches to B silently (`takeSighting` had >= 0: no call), so the
   section hears of B only from a guard with no intruder. Co-op tactics, not this fix.
3. The re-call has no line of its own (the section hears "callIn" at completion; the told-and-sees path barks "joining").
4. Far joiners stay slotless if the re-caller is cut before his call completes (consistent with M5; documented).
5. Carried: the `onLevel` re-call path has no unit test; two groups handed the same free cover in one roles tick; the
   ghost's per-frame `slotFor`; `mirror()` with no freshest keeps `sightT`.

## What I ran
- `npx tsc --noEmit -p .`: clean (exit 0).
- `npx vitest run tests/twoIntruders.test.ts tests/intruders.test.ts tests/squadWiring.test.ts tests/radioNet.test.ts
  tests/radioWiring.test.ts tests/alarmCall.test.ts tests/responseWiring.test.ts tests/coopPerception.test.ts
  tests/squadRoles.test.ts`: 9 files, 135 / 135 pass.
- No e2e, no full suite (shared laptop, per instructions). The new e2e-coop block and the sectorops / guard-cap retunes
  are unrun.
