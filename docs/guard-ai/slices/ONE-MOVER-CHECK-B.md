PASS

# One-mover check B (independent Opus checker, PR #387)

Head checked: c88135b67 on `feature/guard-ai-batch3` (base origin/master 833db92ec). Diff: `git diff origin/master...c88135b67`.

## Blocking items
None.

## What was checked

### 1. Can 2 standard movers still appear? (the e2e's `movers`: a point / flank in `seekCover` with `roleBound`)
- The only way to start a role bound is `Enemy.roleStep` -> `boundTo` (`src/ai/enemy.ts:2920`, `:2973-2994`). It needs
  `roleMoving`, and that comes only from the roles tick (`setRole`, `enemyManager.ts:3383`). Every `setState` clears
  `onRoleBound` (`enemy.ts:1110`), and so do `pickAdvance` and `pickCover` (`:3404`, `:3460`). The e2e
  (`scripts/e2e-stealth-ai.mjs:2743-2746`) and `inp.bound` (`enemyManager.ts:3322`) use the same test: `seekCover`
  plus `roleBound`.
- At a roles tick, the point is picked before the flank in both fill orders (`squadRoles.ts:509-540`). If the point
  is bound and standard, `pickFlank` skips every bound standard member (`:620-629`), so the pair is never both bound.
  This also covers the reverse way in: a walker made point beside a flank already on his way. That flank is skipped
  and loses his role.
- Between ticks, no role or `roleMoving` changes. If neither is bound, the moving mask lets only one go
  (`squadRoles.ts:558-560`). If one is bound, the manager's hold sets the other's `moving` to 0
  (`enemyManager.ts:3366-3370`). A held guard already in `seekCover` from an open-wait pick has no `roleBound`, so the
  strict count (not asserted) is the only place he shows.
- The hold now reads `inp.bound`. It is the same value as the old `ptGoing` / `flGoing`: `assignRoles` changes no
  enemy state. With `ONE_MOVER.roles` false the code matches master exactly.
- Stale state: `inp.bound` is refilled for every member on every `rolesFor`, so the patch keeps no state across
  ticks. Death, takedown or a carried body (`!alive` / `taken`), lost alert, `closing` and despawn all drop the guard
  out of `inGroup`, and `rolesStep` sets his role to `R_NONE` (`:3294`), so the e2e does not count him. A guard who
  alerts again mid-walk keeps `roleBound` correctly. Only the host runs roles (`rolesStep`, `:3577-3581`). The flag is
  not on the wire.
- Exemptions: an aggressive point or candidate is exempt in both `pickFlank` and the hold. In that case the e2e's
  `aggr` is set (any profile other than base). A secure guard's point or flank becomes search in `setRole`, so he is
  not counted.

### 2. Gameplay
- No flank is picked only while the point is bound and every flank candidate is bound too. One walk lasts at most
  `seekCover`'s 6 s timeout (`enemy.ts:3223`). Standard `advanceHold` (2.5 s) is longer than the 0.5 s tick, so at
  least one tick sees the point in cover. That tick makes the walker flank, and the hold keeps the point until the
  walker stops. A walker whose cover is unreachable gets no bound (`boundTo` path / detour check), and a blocked walk
  ends at 6 s.
- No deadlock. The point waits only for a bound flank, and that walk always ends. The excluded walker waits for
  nobody: he keeps walking under his overwatch or search role (`travelling`, `enemy.ts:2912`), and a search guard
  keeps `seekCover` on the default state machine.

### 3. Conventions
- No allocation: one `Uint8Array` per `RoleInput`, made once. `pickFlank` adds two scalar reads.
- Strict TS. `npm run typecheck:fast` is clean. `ONE_MOVER` follows the same `as const` undo pattern as `POLISH_B`,
  which tests flip through `Mut<>`. The changelog fragment passes `tests/changesFragments.test.ts`. `docs/systems/ai.md`
  is updated.

### 4. Unit test
- `npx vitest run tests/oneMover.test.ts tests/squadRoles.test.ts tests/guardPolishB.test.ts --maxWorkers=2`: 42/42
  pass.
- A temporary copy of `tests/oneMover.test.ts` was run with `ONE_MOVER.roles` forced to false, then deleted. The two
  fix cases fail (`assignRoles` makes the walker the flank; the manager tick gives 2 movers) and the undo cases pass.
  The test pins the behaviour.

## Non-blocking polish
1. `src/ai/enemyManager.ts:3360-3361`: "so a hold always has the other one to hold" claims too much. Aggressive pairs
   are exempt, and `out.flank` can be -1. Reword to "(both standard)".
2. `tests/oneMover.test.ts` covers only a walker made flank beside a bound point. Add the reverse case: a bound walker
   made point while the current flank is bound. Check that the flank is skipped (demoted, still walking) and that
   movers stay at 1 or less. The code handles it, but nothing pins it.
3. A behaviour note for `docs/systems/ai.md`: a flank who is mid-bound loses his role whenever the point pick lands on
   a bound walker. He finishes the walk as overwatch or search. That is fine, but worth one clause.
4. The e2e was not run here (rule). The PR still needs the laptop-queue `e2e-stealth-ai` on c88135b67. The fix rests
   on a code trace, not on the train 77 log showing the walker as flank. A green 'squad roles' block on train 77's
   setup is the real proof.
