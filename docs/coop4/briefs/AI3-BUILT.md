# AI3 built: hearing and teammates (Opus builder, 2026-10-24)

Branch `feature/guard-ai-coop4-ai3`, off AI1 d530ebe0. Brief: `docs/coop4/briefs/AI.md` section 1 "AI3".

## What was built
- A173 (holds at 2 players, named exception): `RADIO.queue` 64 -> 128 (`MAX_INTRUDERS` x 32), `src/ai/radioNet.ts`
  (the constant and its two doc comments). Fixed pool, no other change. Undo: 64.
- "Partner" logic generalised to teammates: re-audited `src/ai` (grep `partner`, `players()[`, `length === 2`, host /
  guest hard-coding): every `partner` is a talking-pair guard (S10), no player-pair logic exists. Nothing to change.
- Hearing over N noise makers: `EnemyManager.hear` / `hearFight` / `reportHeard` were already per `by` id and per slot
  (AI1's `slotForId`). No code change; proven by the new tests below.
- A172 pure part (client hold-noise owner): `EnemyManager.hear(pos, reach, 'noise', null, by)` already locates a
  client by id; the new test shows the current coopHost call (no `by`) locates nobody and the fixed call locates the
  client at the item, at 2 and 4 players. The call site itself is Sector Ops' (below).

## For Sector Ops (N1): the one line, not edited here
`src/net/coopHost.ts:771` (`onHoldPulse`), replace
`    em.hear(it.pos, it.holdNoise);`
with
`    em.hear(it.pos, it.holdNoise, 'noise', null, r.ref.id);`
(as the host's own hold, gameState.ts:1321 / 1421). A172 holds at 2 players too (it is the 2-player bug (d) of the
audit). Same change: the header of `src/net/holdPulse.ts:8` should read `enemyMgr.hear(item, holdNoise, 'noise', null,
client id)`. Undo: drop the argument.

## Files
- `src/ai/radioNet.ts`: lines 34-35 (header comment), 61-63 (`queue: 128`).
- `tests/radioNet.test.ts`: the overflow test (~line 251) now passes the pool with `floor(RADIO.queue / 32) + 1`
  calls (it hard-coded 3 x 32 > 64); new describe "four intruders (coop4 AI3, A173)" at the end; imports
  `MAX_INTRUDERS`.
- `tests/combatHearing.test.ts`: new describe "hearing with 3-4 intruders (coop4 AI3)" at the end (existing tests
  unedited).
- No shared file touched (enemyManager.ts, enemy.ts, intruders.ts unchanged).

## Tests (all green)
- `tests/radioNet.test.ts` 29/29: `RADIO.queue === MAX_INTRUDERS x 32`; 4 contacts in one section of 32 guards (31
  receivers each): `dropped` 0, 124 delivered, each receiver once per contact (64 would have dropped 60); 2-player
  identity: 2 contacts x 31 peak at 62 queued (fits the old 64), every delivery on the pure `staggerDelay` schedule.
- `tests/combatHearing.test.ts` 19/19: 4 bys -> slots 0-3 located at their noises, `locT` 0, each combat guard hunts
  his maker; a searcher on slot 2 hears slots 1, 3, 0 (walks to each, each located) and keeps hunt 2 until slot 2 is
  `switchAfter` stale, then switches; 2-player identity: one scripted fight (sighting, steps, a searcher, a lure) ends
  deep-equal (slots, LKPs, `locT` / `seenT` / `valid`, hunts, heard clocks, spot, freshest) with 2 players and with 2
  silent unseen teammates added; A172 hold noise with / without `by` at 2 and 4 players.
- `tests/twoIntruders.test.ts`, `tests/fourIntruders.test.ts`: green, unedited.
- `npx tsc --noEmit -p .`: clean. eslint on the 3 changed files: clean.

## Changelog line (proposed, for `changes/feature-guard-ai-coop4.md`)
- coop4 AI3: the section radio's receiver queue holds 128 (4 simultaneous contacts x 32 guards) so no receiver is
  dropped in a 4-player fight; hearing locates each of up to 4 intruders by its own noise (tests).

## docs/systems/ai.md (proposed line, not edited: shared file)
Radio net: "receiver queue 128 entries per section (`RADIO.queue`, coop4 A173)".

## Risks
- None at 1-2 players for the queue: a larger pool only matters when the old one would have overflowed (the identity
  test). Memory: +64 entries x ~37 bytes per section net.
- The coopHost line changes 2-player play on purpose (A172): a guest's noisy hold now locates him in a fight / search,
  as the host's always did. e2e-coop has no hold-noise assert; e2e-ctcourse a6PumpHouse (client hold, calm
  attendant's meter) is unaffected: calm guards take today's path whatever `by` (combatHearing "calm guards" test).
