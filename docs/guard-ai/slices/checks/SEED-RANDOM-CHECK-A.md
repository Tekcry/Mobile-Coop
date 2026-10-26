# guard-ai seed-random: check A (Opus, independent)
Owner: Guard AI Build. Status: current.
Verdict: PASS

Reviewed `git diff 994e636d2 bcc705955` against `docs/guard-ai/slices/SEED-RANDOM-BRIEF.md` and origin/master
`CLAUDE.md` hard rules. Ran `npm run typecheck:fast` (green), eslint on the six touched source/test files (green) and
`npx vitest run tests/replayDeterminism.test.ts tests/aiSeeded.test.ts tests/squadRoles.test.ts tests/guardPolishA.test.ts
tests/guardAiAlloc.test.ts tests/alarmCall.test.ts tests/squadWiring.test.ts tests/enemyManagerDespawn.test.ts
tests/reconDroneSight.test.ts`: 9 files, 127 passed, 1 todo. No e2e run.

## Findings (none blocking)
1. Initialiser order is correct. `src/ai/enemy.ts:377` `num` -> `:382` `rng` -> `:386` `senseRng` -> `:428` `thinkT`
   (draws from `senseRng`). No other field initialiser between them draws from either stream.
2. Ranges unchanged: think start `senseRng.next() * 0.25` in [0, 0.25) (`enemy.ts:428`); cadence `0.22 + next() * 0.08`
   in [0.22, 0.30) (`enemy.ts:2406`); radio jitter `seeded01(..) * 0.3` in [0, 0.3) (`enemyManager.ts:657`, `:671`);
   drone `seeded01(..) * 2pi` in [0, 2pi) (`reconDrone.ts:55`). `seeded01` = uint32 / 2^32, so strictly < 1.
3. Combat dice untouched: `Rng`, `combatSeed` body, `seedFor` and the `rng` field init are unchanged (only the `rng`
   doc comment moved). No new `rng.next()` anywhere; the cadence moved off `Math.random` onto a separate stream, so
   combat sequences cannot shift. `senseRng`'s seed `combatSeed(0x5eed, -1, num)` can never equal a combat reseed
   `combatSeed(0x5eed, engagement, num)` for engagement >= 0.
4. ReconDrone angle: field is `0` (`reconDrone.ts:36`), set as the first statement of the constructor (`:55`) from the
   parameter `operator` directly; first read is in `update`/`place` (`:81`, `:147`). Correct.
5. Radio key ordering: `callAlert`/`shout` fire after `rng.reseed(ctx.combatSeed(this))` on going to combat
   (`enemy.ts:2157` before `:2170`; the delayed call-in `:2389` later still), so `engagement` is already the current
   one when the jitter is drawn. A1 holds (`seedFor` uses the same counter, `enemyManager.ts:3543`).
6. Determinism claim holds within a run: same spawn order + `matchSeed` (never reassigned in `src` or `tests`; only
   the default `0x5eed`, `enemyManager.ts:469`, so the A3 literal matches) gives the same cadence, radio delays and
   drone angles. What still breaks replay across runs: `num` is a module counter (`enemy.ts:234`, never reset), so a
   section restart or a second mission in one page load gives new nums and so a new cadence / jitter / drone angle.
   This is the same keying the combat `rng` already uses (S8), and the brief scopes the claim to "the same spawn
   order" (A2, A3). Acceptable, not off-intent: the varied quantities are sub-reaction-scale timing (<= 0.3 s) and
   nothing a player plans around becomes unpredictable within a run. See polish P1.
7. Same listener, same jitter across `callAlert` and `shout` in one engagement: no gameplay effect. `Enemy.radio`
   (`enemy.ts:1573-1579`) keeps the first pending delay (`called <= 0`), so a second call never re-times him. Distinct
   listeners get independent draws (keyed by `o.num`, avalanche-mixed), and distance still spreads `callAlert`, so no
   lockstep waking. The parked-mode shout has no distance term, but the jitter is per listener, as before.
8. Hot paths allocate nothing: `seeded01` is a pure int-math call per listener; `senseRng.next()` is the existing
   allocation-free mulberry32; no closures or temporaries added. `aiSeeded.test.ts` measures it.
9. Owned files only: `git diff --stat 29f03b6c0 bcc705955` touches exactly the brief's seven files plus the brief.
   Strict TS green. `tests/replayDeterminism.test.ts:159` `ALLOW = {}`; the static count (`split('Math.random(')` on
   comment-stripped `src/ai/**/*.ts`) fails on any new call.

## Polish (non-blocking)
- P1 Restart stability: key `senseRng`, the radio jitter and the drone angle (and, separately, the combat dice) on the
  guard's spawn slot (as `look` is, `enemyManager.ts:1105`, `:2023`) instead of the global `num`, so a section restart
  replays exactly. A follow-up for both streams, not this slice.
- P2 Changelog fragment says "the same guard behaviour every time": true per run from load; a restart re-keys (P1).
  Consider "every replay of a run".
- P3 `enemyManager.ts:657` `*this.diff.reaction`: missing space after `*` (eslint does not flag it).
- P4 `squadRoles.ts:697` comment "negative, so they never collide": `SEED_RADIO ^ imul(engagement, ..)` is not
  negative for engagement > 0; harmless (no observable correlation), but the comment overstates it.
- P5 The static count matches `Math.random(` only; a bare reference (`const r = Math.random`) would slip through.
  Pre-existing, Test Runner's file: `/Math\.random\b/` would close it.
- P6 `enemyManager.ts:657`, `:671` repeat the stream expression; a local `const radioStream = ..` before each loop
  would read better (cosmetic).
