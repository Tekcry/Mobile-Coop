status: done feature/guard-ai-s23 a87ef34c
# guard-ai S23: every player is seen (co-op perception)

Lead: Night Shift | Guard AI Build. Model: Opus (AI perception code). The full strict brief is
`docs/guard-ai/slices/S23.md` on origin/feature/guard-ai (git show origin/feature/guard-ai:docs/guard-ai/slices/S23.md).
Read it whole and follow it exactly; this file only adds the cloud specifics. Also read CLAUDE.md "Hard rules" and
docs/systems/agent-preamble.md on master.

- Base: origin/master 41204e30 (4.80.0). New branch: `feature/guard-ai-s23`. Line numbers in the brief are from
  e383ba16 (= the 4.80.0 content): re-grep the anchors.
- Only files to edit: `src/ai/targetPick.ts` (new), `src/ai/enemy.ts` (perceive and the two getters), `src/ai/enemyManager.ts`
  (`assignFlanker` only), `src/game/gameState.ts` (the one `updateStealthHud` line), `tests/targetPick.test.ts` (new),
  `tests/coopPerception.test.ts` (new), `changes/feature-guard-ai-s23.md` (new fragment, kind minor), and
  `docs/systems/ai.md` (one short S23 paragraph). Not `src/net/*`, not `perception.ts` numbers, no protocol or save
  change. Do NOT add the e2e-coop block (the lead does that with the laptop run).
- Hot paths allocate nothing (no closures, iterators or temp vectors in perceive / pick); hyp2 / hyp3, never Math.hypot.
  Strict TS, `import type` where type-only.
- Run (unit only: no e2e, no GPU, no npm run check): `npx tsc --noEmit -p .`; `npx vitest run tests/targetPick.test.ts
  tests/coopPerception.test.ts` plus the brief's re-run list (squadWiring, squadRoles, awarenessWiring, hearing,
  perception*, coopGuardAi, armourFire, guardSpacing); `npx eslint` on the changed files.
- Done: all of the above green, solo parity case (d) passing, pushed. Commit trailer:
  "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Then the report below and `status: done feature/guard-ai-s23 <sha>`.
- The assumed decisions A143-A145 in the brief are accepted as written. The question for Michael in it does not block.

## Report (Night Shift | Cloud Builder 1, 2026-10-23)
- Branch `feature/guard-ai-s23` at a87ef34c, off master 41204e30. It has two commits: 1e98ec46, the account-cap WIP save of the four src files, and a87ef34c, which completes it. Built by an Opus agent; Opus reviewed the src for hot-path allocation (none in perceive or pick). The full build report is `docs/guard-ai/slices/S23-build.md`.
- Files changed:
  - `src/ai/targetPick.ts` (new): `MAX_INTRUDERS` 4, `TARGETS {all, sticky}`, `mayBeSeen`, `nearestTarget`, `pickTarget`. Pure, scratch at module level.
  - `src/ai/enemy.ts`:
    - :61 import; :66-82 per-player module scratch.
    - :245-246 `seenMask`; :663-673 `seesIndex(i)` and the `targetDist` getter.
    - :1895-2035 `perceive`: index loops, nothing allocated.
  - `src/ai/enemyManager.ts` :2667-2668: `assignFlanker` uses `e.targetDist`.
  - `src/game/gameState.ts` :2584-2585: the arcs use `!e.seesIndex(0)`.
  - `changes/feature-guard-ai-s23.md` (minor); `docs/systems/ai.md` :381-390.
- Tests:
  - `tests/targetPick.test.ts` (7): `mayBeSeen` equals `sightRate > 0` exactly on a grid of more than 40k points; the calm and alerted picks; ties; dead players.
  - `tests/coopPerception.test.ts` (5): cases (a)-(e). Case (d) is solo parity against a copy of the old path over 280 cases, and it passes.
- Checks:
  - `npx tsc --noEmit -p .` clean; eslint on the 6 changed TS files clean.
  - Vitest before -> after: armourFire 9, armourFireWiring 11, awarenessWiring 19, coopGuardAi 16, guardSpacing 20, hearing 22, perception 29, squadRoles 22, squadWiring 16 (all unchanged), plus targetPick 7 and coopPerception 5. Total 164 -> 176, all passed.
  - Every test file that builds an Enemy or EnemyManager also passes: 33 files, 482 tests.
- Deviations:
  1. The scratch arrays are `Float64Array`, not Float32, so solo parity can be exact.
  2. The `seesIndex` bit uses the same exposure > 0 test as `inSight`, so the solo arcs are as before.
  3. `mayBeSeen` also mirrors sightRate's "behind, walk or faster" close-by rule (an exact mirror).
  4. `nearestTarget` was added for the `TARGETS.all` false path.
  5. The target's pitch is recomputed from the re-read aim point; the value is identical.
  6. Only `ai.md` and the fragment were written, following this queue brief's file list. The S23.md step-5 lines for `coop.md` and `TESTING.md` are still to do.
- **For the lead (solo is not 100% identical, by design of the brief):** a calm guard casts no ray at a player he cannot see. For that player, `los`, `lastKnown`, `lastSeenT` and exposure are no longer set. Target, rate, meter, instant detection and stimulus are unchanged. Visible effects:
  1. A calm guard turned away whose meter is still draining no longer shows a host arc.
  2. An `entryStep` responder no longer drops his route on a line to a player behind him.
  3. `spotted` reads `los`, but has no practical change.

  Watch the arcs in `e2e-stealth-ai` / `e2e-stealth` in the regression run.
- Not done here: the e2e-coop block (left to the lead, as instructed); the laptop solo regression suites.
