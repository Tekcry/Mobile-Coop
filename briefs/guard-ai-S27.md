status: done feature/guard-ai-s27 fe567fd6
# guard-ai S27: role guards take cover, fire only where they can see, draw on an alarm

Lead: Night Shift | Guard AI Build. Model: **Opus only** (AI code). The full strict brief is
`docs/guard-ai/slices/S27.md` on origin/feature/guard-ai (`git show origin/feature/guard-ai:docs/guard-ai/slices/S27.md`):
read it whole. Also CLAUDE.md "Hard rules" and docs/systems/agent-preamble.md on master. Assumptions A161-A164 in the
brief are ACCEPTED by the lead.

- Base (the brief's "Order" alternative, chosen by the lead to run beside S26): origin/feature/guard-ai-s24 (96d565e5
  or later; an S24 fix round runs now). New branch `feature/guard-ai-s27`. Its regions (`roleStep`, `suppressLkp`,
  `aimAt`'s suppress branch, `inCover` order, `carryCalm`, one AiContext hook) do not overlap S25b's search branch or
  S26's `hear`. **Before marking done**: fetch, merge origin/feature/guard-ai-s24 again if it moved (keep its fix),
  re-run the unit list. Line numbers in S27.md are from 96d565e5: re-grep every anchor.
- Only files: the "Branch and files" list of S27.md (src/ai/squadRoles.ts, enemy.ts, enemyManager.ts, tests,
  `changes/feature-guard-ai-s27.md` (new fragment, kind minor), docs/systems/ai.md, TESTING.md). No protocol, no save.
- Do NOT add or retune e2e scripts; list every e2e assert you expect to change by design, with file:line.
- Hot paths allocate nothing; hyp2 / hyp3, never Math.hypot; strict TS.
- Run: `npx tsc --noEmit -p .`, eslint on changed files, vitest on the S27.md test list plus every test file that
  builds an Enemy or EnemyManager. No e2e, no GPU, no npm run check.
- Done: branch pushed, report below, status line done.

## Report (Night Shift | Cloud Builder 1, 2026-10-23): done, feature/guard-ai-s27 fe567fd6
Base 086655a2; origin/feature/guard-ai-s24 moved to 7fe4f6a2 during the build (docs + e2e-coop.mjs / e2e-guard-carry.mjs
only, no src): fast-forward merged, unit list re-run. Diff vs S24 = only the S27.md files (8 files, +514 / -15).
Files (head line numbers):
- `src/ai/squadRoles.ts:162-167`: `SQUAD.openWait` 3, `SQUAD.suppressView` true.
- `src/ai/enemy.ts`: SQUAD import :46; `AiContext.alarmStage?()` :167-169; `SUPPRESS_CHECK` 0.25 :222-223; `carryCalm`
  :1364-1368; fields :2475-2492 (`openT`, `openNoCover`, `suppressAim`, `suppressing`, `suppressOk`, `suppressCheckT`,
  `suppressRounds`, `suppressHeld`); `setRole` reset :2520-2524; `roleStep` open wait :2561-2590; `suppressLkp`
  :2618-2646; `attack` tactics gate :2794-2796; `inCover` order (radio hold before tactics) :2886-2895; `aimAt` suppress
  branch :3135-3138.
- `src/ai/enemyManager.ts:625-626`: ctx `alarmStage: () => this.alarmStage`.
- `tests/squadWiring.test.ts:5-6, 362-696`: probe on Enemy's prototype running the real `decide` at 60 Hz, cases (a)-(e).
- `tests/guardGunCarry.test.ts:106-163`: alarm stage 1 draws; stage 0 holsters after the calm hold; no hook as before.
- `docs/systems/ai.md:222-230, 376-378`; `TESTING.md:147-150`; `changes/feature-guard-ai-s27.md` (minor).
Tests: tsc, eslint clean. Unit list (S27.md list + every test building an Enemy / EnemyManager or importing enemy /
enemyManager / squadRoles / carryState; combatHearing.test.ts does not exist on this base): 39 files 538 -> 552 / 552
(squadWiring +11 -> 27, guardGunCarry +3 -> 5). A 44-file superset also green (757). Mutation: all 9 new behaviour tests
fail against the base enemy.ts.
Deviations:
1. Open-wait fallback: at the wait's end `roleStep` calls today's `pickCover`, then `setState('seekCover')` with
   `coverPicked` true (seekCover walks the path). With no cover anywhere he stays crouched in `chase`, no retry until he
   sees his target, reaches cover or changes role. The literal fallback (attack, strafe upright 2.6 s, back to chase)
   would break the brief's own Goal and test (a) (he stays crouched).
2. With no role cover the pick runs on his second think: crouched at once, in seekCover the next step (test (a)).
3. `openT` also resets in `attack`, not only on sight / in or on the way to cover.
e2e asserts expected to change by design: none found. No holster assert follows an alarm stage in e2e-sectorops.mjs or
e2e-guard-carry.mjs (Warehouse, stage 0). Watch-only (open-waiting role guards now take cover; expected to hold):
scripts/e2e-coop.mjs:1348-1350 (S24 kOwn / kOther, "each pair moves toward its own spot"), scripts/e2e-sectorops.mjs:3331
(S6 "they close on it along the route"). Unaffected: e2e-stealth-ai 'lkp' :473-536, e2e-tactics (no roles).
Lead's e2e still to add: the 'squad roles (guard-ai S27)' scenario in e2e-stealth-ai, the S13 carry assert in
e2e-sectorops (block at :3338 on).
