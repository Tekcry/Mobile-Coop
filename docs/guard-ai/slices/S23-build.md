# S23 Every player is seen - build report (cloud builder, 2026-10-23)

Status: DONE. Branch `feature/guard-ai-s23`, base 41204e30 (4.80.0). Solo parity case (d) passes. Not committed by the
builder (a WIP save commit 1e98ec46 holding the four src files appeared mid-build; it was not made by the builder).

## Files and line ranges
- `src/ai/targetPick.ts` (new, 1-75): `MAX_INTRUDERS` 4, `TARGETS { all, sticky }`, `mayBeSeen`, `nearestTarget`,
  `pickTarget`. Pure, imports only `perception.ts`; module-level `rangeOut` scratch.
- `src/ai/enemy.ts`: import (61); per-player module scratch `P_*` + `P_SIGHT` (66-82); `seenMask` field (245-246);
  `seesIndex(i)` and `get targetDist` (663-673); `perceive` rewritten (1895-2035; the rooms block is unchanged).
- `src/ai/enemyManager.ts` `assignFlanker` (2667-2668): `e.targetDist` instead of the distance to `players()[0]`.
- `src/game/gameState.ts` `updateStealthHud` (2584-2585): `!e.seesIndex(0)` instead of `!e.inSight`.
- `tests/targetPick.test.ts` (new), `tests/coopPerception.test.ts` (new).
- `changes/feature-guard-ai-s23.md` (new, kind minor); `docs/systems/ai.md` (381-390, one S23 paragraph).

## Tests added
- `tests/targetPick.test.ts` (7): mayBeSeen equals `sightRate > 0` on a grid (dist 0-30 step 0.25, angle -pi..pi step
  pi/90, speed 0/1/4, standing and crouched; > 40k points); calm "no" cases, alerted / dog pass; calm pick (highest rate,
  none = nearest); alerted cur / nearest visible / hunt / cur / nearest; dead never picked (all dead -1); ties; the
  `TARGETS` defaults, `MAX_INTRUDERS`, `nearestTarget`.
- `tests/coopPerception.test.ts` (5), real `Enemy.perceive` on `Object.create(Enemy.prototype)`, stub ctx, ray stub:
  (a) A hidden nearer, B lit at 9 m: target B, rate > 0, `seesIndex(1)` true, `seesIndex(0)` false; with `TARGETS.all`
  false the target is A (the undo). (b) combat on B, A walks nearer hidden (6 / 4 / 2.5 / 1.5 m): target B, `los` true,
  `reportSighting(B)` only; B ducks and A shows: switches to A. (c) both visible calm: lit B beats shadowed A; the rate
  equals B's solo rate (no adding). (d) solo parity against a copy of the pre-S23 code path: 280 cases (8 body setups x
  5 guard setups incl. alerted, dog, turned, light-field-read x 7 spots): target, dist, rate, meter, smelled, stimulus
  always equal; for every case where the player can be seen (> 200): los, losHead, lastKnown, lastSeenT, targetLight,
  the whole `sight` input, `inSight`, `seesIndex(0)` equal too; no live player: null target. (e) calm guard facing away,
  player 15 m behind at a sprint: 0 rays for him (3 for B in front); solo 0 rays; alerted 2 rays.

## Checks
- `npx tsc --noEmit -p .`: clean.
- `npx eslint` on the 6 changed TS files: clean (after one test fix: a useless assignment).
- vitest, per file before -> after: armourFire 9 -> 9, armourFireWiring 11 -> 11, awarenessWiring 19 -> 19,
  coopGuardAi 16 -> 16, guardSpacing 20 -> 20, hearing 22 -> 22, perception 29 -> 29, squadRoles 22 -> 22,
  squadWiring 16 -> 16; new targetPick 7, coopPerception 5. Total 164 -> 176, all green. Extra: every test file that
  builds an Enemy or EnemyManager (33 files, 482 tests) green. No existing test number edited.
- Not run (as instructed): e2e, GPU, `npm run check`.

## Deviations
1. Scratch arrays and `pickTarget`'s `rate` / `dist` are `Float64Array`, not `Float32Array`: f32 rounding would change
   the solo rate and distance copied to the guard (the brief asks for identical numbers; case (d) compares exactly).
2. `seesIndex` bit = the player's exposure > 0 (any body sample: chest, head, or hips when calm; in combat = los), not
   chest-or-head los: the same test as `inSight`, so the host's arcs in solo are exactly as before.
3. `mayBeSeen` also mirrors sightRate's behind factor (outside the field the close term counts only at motion > 0.8):
   an exact mirror; the grid test asserts equality, not only "no false no".
4. Added `nearestTarget(n, dist)` (the `TARGETS.all` false path, testable). `TARGETS.sticky` false is wired by passing
   `cur` -1 to `pickTarget` (nearest seen each think).
5. The pitch of the target is recomputed in the tail from the re-read aim point (no stored pitch array); identical value.
6. Docs: only `ai.md` and the fragment (lead's file list); the brief's `coop.md` and `TESTING.md` lines are not written.

## Open items for the lead
- Solo is not 100% identical, by the brief's own ray skip: for a player a calm guard cannot see at all (`mayBeSeen`
  false) no ray is cast, so `los`, `lastKnown`, `lastSeenT` and the exposure (`inSight`) stay unset for him. Target,
  rate, meter, instant detect and stimulus are unchanged. Visible effects: (1) a calm guard turned away whose meter is
  still draining no longer shows a host arc (before, `inSight` was set by a clear line behind him); (2) a responder on a
  reinforcement entry route (`entryStep`, ends on `los`) no longer ends it on a line to a player behind him; (3) the
  `spotted` flag at a sighting alert reads `los` (a sighting alert needs a seeable player, so no change in practice).
  Watch `e2e-stealth-ai` / `e2e-stealth` arcs in the regression run.
- `docs/systems/coop.md` and `TESTING.md` lines from the brief's step 5 (not in this builder's file list).
- e2e-coop block "every player seen (guard-ai S23)" not added (lead's instruction); the solo regression suites from the
  brief need the laptop run.
