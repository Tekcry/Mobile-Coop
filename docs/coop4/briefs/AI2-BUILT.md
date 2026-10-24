# AI2 built: perception over 4 players, budget and cost (Opus builder, 2026-10-24)

Branch `feature/guard-ai-coop4-ai2`, off AI1 d530ebe0. Brief: `docs/coop4/briefs/AI.md` section 1 "AI2", A181.

## Built
- `src/ai/targetPick.ts`: `PERCEIVE = { maxRays: 9 }` (A181; undo `Infinity`) and pure `perceiveOrder(n, cur, hunt,
  dist, rr, out: Int8Array): number`: `cur`, then `hunt` (deduped), then every other live player nearest first (ties:
  lower index), that tail rotated left by `rr`; dead / out-of-range players left out. Insertion sort plus an in-place
  three-reversal rotation: no allocation (measured, `bytesPerCall` <= one HeapNumber).
  "Rotated by rr among equals" is read as: the tail (the players of equal priority after `cur` / `hunt`) is
  distance-sorted, then rotated, so each tail player waits in turn. Pure distance order would starve the farthest.
- `src/ai/enemy.ts` `perceive`: the per-player loop is split in two passes. Pass 1 (every player): the scratch reset,
  distance, angle, `cur`, `hi`, `near` (as before). Pass 2 (the rays): with `n < COOP4.from` (1-2 players) index
  order, never capped (today: max 6 rays); with `n >= 3` the `perceiveOrder` order, each player started only while
  `used + cost <= PERCEIVE.maxRays`, cost = chest + head (if `headPoint`) + hips (calm) = 3 calm / 2 alerted, 0 when
  `mayBeSeen` is false (no ray, skipped before the budget check). A skipped player keeps rate 0 / los 0 / no sight
  bit this think. `perRR` (per guard) steps once per capped think and wraps at 12 (a multiple of every tail length
  1-4, so the rotation never skips). New per-guard counters: `raysThink` (player sight rays at the last think) and
  `raysStep` (since the manager last read it). `lookForBodies`' body ray is not counted (not a player ray).
- `src/ai/enemyManager.ts`: `raysThisStep` (reset at the top of `update`, summed from each guard's `raysStep` right
  after `e.update(dt)`, which zeroes it).
- Effect: 4 alerted players = 8 rays (never capped). 4 calm players in one field, no current target: 9 rays a think,
  each player started 3 thinks in 4. With a calm target (`cur`, the usual case: the best seen or the nearest) he is
  started every think and the other three share 2 places (each 2 thinks in 3). 3 calm players = 9 = the budget (all
  started). 1-2 players: unreachable, index order, bit-for-bit today.

## Cost (from the brief, unchanged by this slice)
Linear worst case: 4 players <= 2x the 2-player AI cost = 0.008-0.026 ms / guard, 24 guards <= ~0.65 ms a frame;
combat 8 rays per guard per think (~4 Hz) = ~770 rays / s at 24 guards. The cap bounds the calm worst case at 9 per
think (was 12). The per-think extra work is one `perceiveOrder` over <= 4 entries at 3+ players only. The AI6 laptop
measure (4 fakes vs 2, 24 guards, pass <= 2x) reads `raysThisStep`.

## Shared files touched (line ranges on this branch)
- `src/ai/enemy.ts`: 63-65 (imports), 84-85 (`P_ORDER`), 285-290 (`perRR`, `raysThink`, `raysStep`), 2155-2175
  (perceive: pass 1 end, pass 2 head with the order and budget), 2228-2229 (`raysThink` / `raysStep` after the loop).
- `src/ai/enemyManager.ts`: 158-160 (`raysThisStep` field), 3265 (reset in `update`), 3368-3370 (sum in the guard
  loop).

## Tests (all green)
- `tests/targetPick.test.ts` (+10): `pickTarget` with n = 4 (calm best rate, nearer on equal rate, nearest when none
  seen, dead never wins; alerted sticky cur, nearest seen, hunt, cur, nearest; ties lower index); `perceiveOrder`
  (cur / hunt first, dead out, cur = hunt once, equal distances by index, rr rotates the tail only); budget 9 with 4
  calm -> 3 started, 4 thinks cover each 3 times; with a cur: cur every think, the others 2 in 3; 4 alerted -> all 4,
  8 rays; 1-2 players never reach the budget.
- New `tests/perceive4.test.ts` (11, the real `Enemy.perceive` on the coopPerception stand-in with 4 fake players):
  rays per think with 4 calm in field = 9 (3 started), each started 3 of 4 thinks, the waiting one has no sight bit;
  with a target he is never left out and nobody starves; 4 alerted = 8; the hunted player's 3 rays first; a player
  behind him costs no ray (the 3 in field all fit); a dead player never started; undo `maxRays: Infinity` = 12.
  2-player identity: 168 two-player cases (calm, alerted, dog, turned; lit, dark, crouched, moving, part / fully
  hidden) x two thinks: the ray sequence equals today's (index order, chest, head, hips when calm, only when
  `mayBeSeen`), <= 6 rays, `perRR` never moves, and every result (target, dist, rate, los, losHead, meter, light,
  lastKnown, stimulus, sight bits, rays) is identical with `maxRays` 0 and with the gate off (`COOP4.from`
  Infinity); solo with `maxRays` 0 still casts 3. `EnemyManager.raysThisStep` sums and zeroes per update.
  `perceiveOrder` allocates nothing.
- Unedited and green: `tests/coopPerception.test.ts` (S23 solo parity vs the old perceive), `tests/twoIntruders.test.ts`,
  `tests/fourIntruders.test.ts`, `tests/intruders.test.ts`, `tests/awarenessWiring.test.ts`,
  `tests/coopGuardAi.test.ts`, `tests/consoleNoticeA4.test.ts`, `tests/lockedDoorPath.test.ts`,
  `tests/combatHearing.test.ts`. `npx tsc --noEmit -p .` clean; eslint clean on the touched files.

## Hooks / one-liners for Sector Ops
None: AI2 needs nothing from the net layer or Sector Ops files. Test Runner / AI6 read `em.raysThisStep` (all guards,
one update) and `enemy.raysThink` (one guard, last think; e2e 'four seen': <= 9).

## Proposed changelog line (for `changes/feature-guard-ai-coop4.md`)
- Guards watching 3-4 players cast at most 9 sight rays a think (A181): the one they perceive and the one they hunt
  first, the rest nearest first in rotation, so nobody is left unseen for long; 1-2 players unchanged.

## Proposed `docs/systems/ai.md` note (perception section; shared doc, left to the lead)
- (coop4 AI2, A181) At 3+ players `perceive` starts players in `perceiveOrder` (target, hunted intruder, the rest
  nearest first rotated per think) within `PERCEIVE.maxRays` 9 sight rays (3 calm, 2 alerted, 0 out of view); a player
  left out reads unseen that think. 1-2 players: index order, uncapped. Counters: `Enemy.raysThink`,
  `EnemyManager.raysThisStep`.

## Risks
1. A calm guard with 4 players in view and a target sees each of the other three 2 thinks in 3: their meter fill on
   him is per target only (A143), so the effect is a slightly later switch to a better-seen player, never a missed
   target. Undo `PERCEIVE.maxRays: Infinity`.
2. Hard to observe in play: only with 4 players at once in one calm guard's field and close range. AI6 'four seen'
   asserts it.
3. Merge: AI3 / AI4 also touch `enemyManager.ts` (different ranges: 748-870, 1749); the 3 lines here sit in the field
   block and `update`, conflicts unlikely.
