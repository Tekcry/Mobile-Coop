PASS

# One-mover check A (PR #387, head c88135b67, base origin/master 833db92ec)

Independent Opus checker, 2026-10-25. Read the diff, `rolesFor` / `rolesStep` (enemyManager.ts), `assignRoles` /
`pickFlank` (squadRoles.ts), `setRole` / `roleStep` / `boundTo` / `setState` / `pickCover` / `pickAdvance` (enemy.ts) and
the e2e counter (scripts/e2e-stealth-ai.mjs:2742-2796).

## Checks run
- `npx vitest run --maxWorkers=2 tests/oneMover.test.ts tests/squadRoles.test.ts tests/guardPolishB.test.ts
  tests/polishBatch.test.ts`: 4 files, 51 tests pass.
- `tests/squadWiring.test.ts` 28 pass; `tests/changesFragments.test.ts` + `tests/guardPolishB.test.ts` 15 pass.
- `npm run typecheck:fast`: clean.
- e2e not run (laptop queue only). The train 77 log (`4189.log:1606`) shows only the count (2), not which path.

## Root cause and paths (my own reading)
`onRoleBound` is set only in `boundTo` (enemy.ts:2992), which only `roleStep` calls and only with `roleMoving`; every
other pick (`pickCover`, `pickAdvance`, `setState`) clears it. So a held guard never starts a role bound between ticks,
and at each tick the mask in `assignRoles` plus the manager's hold leave at most one of point / flank with `moving` when
neither or one is on his way. Two counted movers therefore need a guard already on a role bound to be relabelled into
the pair beside the other one on his way. That is the triage's cause, reached by exhaustion rather than from a trace.

The fix closes every such way in for a standard pair, because the point is always picked before the flank (both fill
orders) and `pickFlank` skips a bound candidate when the point is bound (squadRoles.ts:621, :629):
- walker (ex-reporter / ex-overwatch) made flank beside a bounding point: skipped (the e2e case);
- walker made point beside a flank on his way: the old flank is skipped for flank;
- point / flank swap: only one was on his way (the other was held), the hold covers it;
- point re-picked to another guard: same as the swap;
- open-wait pick: `roleBound` false, not counted by the e2e or `inp.bound` (consistent);
- dying / leaving the group: not `inGroup`, role reset to `R_NONE` at the end of `rolesStep`;
- two squads: per-group `rolesFor`, a guard is in one group only;
- aggressive: exempt in both `pickFlank` and the hold, and the e2e's `aggr` flag.
`inp.bound` uses the same expression the old `ptGoing` / `flGoing` used, so the hold is unchanged. `ptTrip` / `flTrip`
still feed `mates`.

## Loosening / outside effects
- No loosening: the e2e assert, the counter and the hold are unchanged.
- Flank picks are lost only when both the point and the candidate are standard and on a role bound; the candidate's
  walk continues either way (`travelling` blocks a re-route), so the physical moves are the same as before the fix and
  he can take the flank once he arrives (shown in the manager test).
- Hot path: one `Uint8Array` made once in `RoleInput`; one const and one branch in `pickFlank`; one store per member in
  `rolesFor`. No closures, iterators or temp arrays. No `Math.hypot` added. Strict TS clean.

## Test
`tests/oneMover.test.ts` reproduces the bug with the undo on: the pure case gives `point, overwatch, flank` with both
on their way, and the real `EnemyManager` roles tick with stand-in guards gives 2 movers by the e2e's own count. With
the fix it is at most 1, and the arrival case pins the hold. Every fix case fails if the fix is removed.

## Blocking
None.

## Non-blocking polish
1. tests/oneMover.test.ts: no case for the reverse way in, a walker made point while the flank is on his way (the old
   flank skipped). Add a pure `assignRoles` case: the point a bound walker nearest the LKP, the flank candidate bound;
   expect the bound flank candidate not `flank` and never both bound as point and flank.
2. docs/systems/ai.md:227 and the changelog fragment describe only the walker-made-flank case. In the reverse case a
   flank on his way loses the flank role mid-walk (he still finishes the walk under search / overwatch). One clause
   would make the docs complete. Also worth one line: the fix stops no-one mid-walk; it only keeps the labels right
   and the hold working.
3. src/ai/enemyManager.ts:3360: "never makes both of them ones on their way" reads awkwardly and leaves out "standard
   pair only" (aggressive pairs can both be on their way, which the hold already exempts).
4. The cause is shown by exhaustion, not by a trace from the failing run. The `laptop-e2e` status on c88135b67
   (e2e-stealth-ai, run and solo rerun) is the real proof, so do not merge without it.
