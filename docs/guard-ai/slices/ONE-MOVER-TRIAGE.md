# One-mover triage (e2e-stealth-ai 'squad roles', 4.100.2)

Opus triage, 2026-10-25. Branch `feature/guard-ai-batch3` from origin/master 833db92ec (4.100.2). Verdict: **AI bug**
(role assignment), not a test bug. The test's count is right and stays as it is.

## Failure
Train 77 (head 059955e7), run and rerun, 2 of 2:
`ASSERT: at most one guard advancing / bounding to his role's cover at once, the one-mover rule (2; ... any seekCover 2;
aggressive false)` (`scripts/e2e-stealth-ai.mjs:2796`). The counter (`:2742-2745`) counts a point or flank in
`seekCover` with `Enemy.roleBound`, sampled every 0.25 s.

## Evidence
- The AI code is the same as train 76 (740292b9), which passed (`(1; ... any seekCover 2 ...)`): train 77 adds only a
  Blender script, docs and the version. The scenario's Math.random is seeded, but the fight it builds depends on state
  from earlier scenarios, so a small shift exposed a hole that was already there. Trains 74-76 and the polish runs
  passed at 1.
- Logs: `C:/NightShift/scratch/laptop-queue/runs/train-77-059955e7/4189.log:1606`, `rerun-e2e_stealth_ai.log:263`.

## Cause (line numbers from origin/master 833db92ec)
1. Reporter and overwatch walks are role bounds too. `assignRoles` lets the reporter and overwatch move whenever they
   want their cover (`squadRoles.ts:540`), with no regard to the point or flank. `roleStep` sends any role but the point
   at once (`enemy.ts:2918`), and `boundTo` sets `onRoleBound` for every role (`enemy.ts:2992`).
2. B2's re-check keeps the flag through a role change (`enemy.ts:2890`), so the manager keeps counting the walker. That
   part is right.
3. The hole: roles are re-chosen every tick. The reporter's role ends as soon as his call is through
   (`enemyManager.ts:3337`), and the overwatch / flank scores move as guards walk. So a guard still walking to his
   reporter or overwatch cover can be picked as the flank (`pickFlank`, `squadRoles.ts:585`) while the point is on his
   own bound.
4. Point and flank are then both on their way. The manager's hold (`enemyManager.ts:3363-3367`) only holds one of
   them when the other is going and he is not. With both going it holds neither, and the e2e sees 2 movers.

This happens in the game, not just in the count: two guards labelled point and flank are both walking out in the open
at the same time, and nobody holds either of them.

## Fix
- `RoleInput.bound` (`squadRoles.ts`): 1 when the member is on a role bound now (`seekCover` with `roleBound`; any
  `seekCover` under the `POLISH_B.roleTrip` undo). The manager fills it (`enemyManager.ts:3322`) and its hold reads it
  (`:3366-3367`, the same value as before).
- `pickFlank` (`squadRoles.ts:621`, `:629`): while the point is on a role bound, a member on one too is not made the
  flank (both standard; an aggressive point or walker is exempt, as in the hold). The walker keeps his walk under his
  old role or search. Once he is in his cover he can take the flank again, and he is held while the point is still
  on his way. So at every roles tick at most one of point and flank is on his way.
- The point is picked before the flank in both fill orders, so one check in `pickFlank` covers both ways in: a walker
  made point beside a flank on his way, and a walker made flank beside a point on his way.
- The rule is not loosened. The e2e counter and the manager's hold are unchanged. Reporter and overwatch still move as
  before (the rule is "one of point / flank", `docs/systems/ai.md`).
- Undo: `ONE_MOVER.roles` false.
- No allocation: one `Uint8Array` per `RoleInput`, made once.

## Tests
- `tests/oneMover.test.ts`, 6 cases:
  - Pure `assignRoles`: with the undo the walker is made the flank (the bug). With the fix he is not. Only one of the
    two on his way gives the old roles. An aggressive point is exempt.
  - Manager roles tick with stand-in guards: with the undo, 2 movers (the e2e failure). With the fix, at most 1. After
    the walker arrives he is the flank again and is held.
- Run: `npx vitest run --maxWorkers=2` on every test importing `squadRoles` / `enemyManager` / `enemy` / `gameState` /
  `stealthSystems`: 68 files, 914 tests, all pass. `npm run typecheck:fast` and eslint on the changed files are clean.
- e2e not run here: e2e-stealth-ai goes through the laptop queue on the PR head.

## Overlap with #377 (`feature/guard-ai-polish2`, not merged)
#377 touches `src/ai/enemy.ts` and `src/ai/enemyManager.ts`, but not `squadRoles.ts`. Its `enemyManager.ts` hunks
(~98, 306, 688, 2816, 2871, 3115, 3138) are not in `rolesFor` (~3300-3390), so a textual conflict is unlikely. Its
flank change (A189, a flank bound's `flankK` detour test in `boundTo`) is on the same path but does not touch
role picking.
