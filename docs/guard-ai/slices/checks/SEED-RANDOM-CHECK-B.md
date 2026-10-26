# guard-ai seed-random: check B
Owner: Guard AI Build. Status: current.

Checker B (Opus 5.5), head bcc705955, diff 994e636d2..bcc705955. Focus: co-op, the rest of the codebase, e2e harnesses.

Verdict: PASS

The five draws are replaced with seeded ones with the same ranges, nothing allocates, the combat `rng` stream is
untouched, and no `Math.random(` is left in `src/ai`. `npm run typecheck:fast` green; `npx vitest run
tests/replayDeterminism.test.ts tests/aiSeeded.test.ts tests/guardAiAlloc.test.ts tests/reconDroneSight.test.ts
tests/alarmCall.test.ts`: 5 files, 53 passed, 1 todo. No e2e run (as instructed).

## Findings

1. **Likely e2e red, not a game fault: `scripts/e2e-stealth-ai.mjs:209` 'vision-detect'.** The scenario runs the same
   approach three times (off / thermal / electro) and asserts the detection frame matches within +-1 frame. It got
   identical runs by reseeding `Math.random` (`:219`, seed 12345) before each `t.reset()` + `t.spawn`. Each run spawns
   a new guard, so the runs now have nums N, N+1, N+2 (`src/ai/enemy.ts:377`, `nextId` is page-global and never
   reset), so their think phases differ (`enemy.ts:386`, `:428`). LOS starts at the first think and the meter fills per
   frame after that (`updateAwareness`), so `alertAt` moves with the first-think offset (up to 0.25 s = 15 frames).
   Measured over nums 1-400: consecutive nums' first thinks fall within 1/60 s of each other only 62/399 times (16%).
   The result is fixed for a given suite, so it is either always green or always red; red is the likely outcome. Fix
   (test-side, if the laptop run is red): in `run()` after `const e = t.spawn(...)`, pin the stream so every run is the
   same: `e['senseRng'].reseed(12345); e['thinkT'] = 0;`. Code-side alternative (wider, would also make a section
   restart replay the same cadence): after `e.key = this.freeKey()` in `EnemyManager.spawn`, reseed the perception
   stream from `combatSeed(this.matchSeed, SEED_SENSE, e.key)` and redraw `thinkT`.
2. **The e2e `Math.random` mocks no longer steer the cadence or radio jitter.** About 20 blocks in
   `scripts/e2e-stealth-ai.mjs` (e.g. `:520` 'lkp' "think ticks, reaction and radio jitter", `:2395`, `:2435`, `:2480`,
   `:2556`, `:2636`, `:2958`, `:3015`, `:3186`) and `scripts/e2e-sectorops.mjs` (`:557`, `:3554`, `:3677`) seed
   `Math.random` and say in their comments that this fixes the think cadence and radio delays. Both are still
   deterministic, but now through guard nums, so a block's timing depends on how many guards earlier scenarios spawned
   (scenario order, an `only` filter). Running a single scenario may now behave differently from the full suite. Not
   blocking: the bounds are unchanged (cadence [0.22, 0.30), radio [0.4 + 0.03 d, +0.3), shout [0.3, 0.6)), and
   sectorops `:557` reads after 1.0 s, which still covers the worst case. The comments are now stale (polish 1).
3. **Co-op: no divergence.** Only `EnemyManager.spawn` / `revive` construct `Enemy` (`enemyManager.ts:1666`, `:2022`)
   and `ReconDrone` (`:2029`). The client has no `EnemyManager` (`src/net/holdPulse.ts:5`), and `src/net` builds
   `EnemyPuppet`s, never `Enemy`. No `src/net` file mentions drones. Host-authoritative, so there is nothing to match.
4. **CPU spread kept.** First-think offsets for nums 1-400 have mean 0.1252 s (uniform 0.125) and a flat histogram over
   [0, 0.25). Twenty guards spawned together land on 10-11 of the 15 60 Hz frames, as many as independent uniform
   draws would. The murmur avalanche in `combatSeed` decorrelates neighbouring nums. No think pile-up, and the
   `raysStep` budget sees the same load as before.
5. **Radio salt.** `SEED_RADIO ^ Math.imul(engagement, 2654435761)` (`enemyManager.ts:657`, `:671`) never collides
   with a real engagement id or the other salts for engagements 0-99999 (checked). callAlert and shout give one
   listener the same jitter within an engagement. That is harmless.
6. **Replay scope (by design, A2 / A3).** Seeding is by page-global `num` plus the literal `0x5eed`
   (`enemy.ts:386`, `reconDrone.ts:55`), not `EnemyManager.matchSeed`. The same play replays the same cadence only from a
   fresh page load: a section restart or a revived guard gets new nums. The combat `rng` already works this way, and
   the change is strictly better than `Math.random`. It is not off-intent (G143: nothing a player plans around).

## Polish
1. Update the stale e2e comments that say the cadence and radio delays "draw on" `Math.random`
   (`e2e-sectorops.mjs:557`, `:3554`; `e2e-stealth-ai.mjs:520`, `:216`).
2. `enemyManager.ts:657`: `*this.diff.reaction` is missing a space (`* this.diff.reaction`).
3. The changelog's "the same play gives the same guard behaviour every time" claims more than the code does (finding 6).
   Suggested wording: "...from the match seed instead of chance, so guard timing is replayable".
4. A3 follow-up: pass `matchSeed` into `Enemy` / `ReconDrone` (or reseed in `spawn` from the slot key, finding 1) so a
   mode that sets its own seed also moves the cadence and the drone angle.
