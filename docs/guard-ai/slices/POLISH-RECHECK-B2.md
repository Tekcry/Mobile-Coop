FIX: 1 item. The original case is closed, but the new clear in `setRole` (enemy.ts:2890-2891) leaves a role-swap two-mover hole relative to master. The fix is to delete that line.

# Guard AI polish - re-check of the B2 fix (09d16b80)

Opus re-checker, 2026-10-25. Branch `feature/guard-ai-polish`, head 09d16b80. Line numbers are from 09d16b80.
Tests: `npx vitest run --maxWorkers=1 tests/guardPolishB.test.ts tests/squadWiring.test.ts tests/squadRoles.test.ts`:
3 files, 63 tests, all pass.

## Fix items

1. **A role change in the middle of a walk clears `roleBound`, so the manager again stops counting a guard who is still walking.**
   - `setRole` clears the flag on any role change (`enemy.ts:2887-2892`).
   - The walker keeps going to the old cover: `travelling` is true (`enemy.ts:2912`), so `roleStep` never re-bounds him.
   - The manager reads the flag before it calls `setRole` (`enemyManager.ts:3363-3364`, then `:3380`). The first tick
     of the swap still counts him. Every tick after that does not.
   - Point and flank are re-chosen every tick and are not sticky. Point goes to the nearest guard with a point cover
     (`squadRoles.ts:492-520`). Flank goes to the best flank cover score (`squadRoles.ts:611-628`).
   - So the swap happens in real play:
     - **Point to flank, near the end of a bound.** With no cover 2 m further forward, the point has no point cover
       (`c < 0`, `squadRoles.ts:504`), so another guard becomes point. The walker can get flank.
     - **Flank to point, mid-walk.** A flanker walking in gets nearer to the LKP than the point in cover, so he becomes
       point. The old point can get flank.
     - **Reporter to flank, mid-walk.** The reporter's call goes through while he walks to his reporter cover (a
       `boundTo` walk too).
   - What happens next:
     - The walker, now point or flank, is in `seekCover` with `roleBound` false.
     - If the new point's `moving` is 0 (the overwatch is moving, or flank first), `assignRoles` frees the other guard
       (`squadRoles.ts:551`). The manager does not hold him back, so two guards move at once.
     - Master counted any `seekCover`, so it held the other guard. This is the same defect as B2-check item 1, through
       another door.
     - The e2e counter (`e2e-stealth-ai.mjs:2746`) reads the same flag, so it would not catch this either.
   - Smallest fix:
     - Delete `this.onRoleBound = false;` and its comment in `setRole` (`enemy.ts:2890-2891`).
     - Drop "and a new role" from the field doc (`enemy.ts:2820-2822`) and from ai.md (`docs/systems/ai.md`, the B2 line).
     - The flag then means "this continuous `seekCover` walk was started by `boundTo` (any role), with no own pick
       since". That is always a subset of master's rule, so it cannot open a two-mover hole. It also cannot hold a mate
       longer than master did (see check 2).
     - Test: the manager fakes skip `Enemy.setRole`, so add an Enemy-level case in squadWiring's `roleProbe` style.
       Start with `onRoleBound` true, call `setRole` with another role, and expect `roleBound` still true.

## Checks

**(1) The original scenario is closed. PASS.**
- `boundTo` sets the flag after `setState('seekCover')` (`enemy.ts:2982`, `:2992`).
- While he walks, nothing re-picks or clears it:
  - `travelling` blocks `boundTo` (`enemy.ts:2912`, `:2919`).
  - The open wait runs only from `chase` or `idle` (`enemy.ts:2932-2936`).
  - The `seekCover` branch picks a cover only when `!coverPicked` (`enemy.ts:3214`).
- A new role cover past his target in the last ~2 m no longer matters: the manager reads only the flag
  (`enemyManager.ts:3363`).
- The new guardPolishB case is the checker's probe: the extra cover at (0.5, -5), the point at (0, -8.6), the
  overwatch in `chase`. It asserts `cover !== 0` and `flank.moving` false. Under the pre-fix test
  (`coverIdx === out.cover[pt]`) it would be true.

**(2) Every way a walk ends clears the flag. PASS, except item 1.**
- **Clears that are right:**
  - Arrival: the path is empty, so `setState('inCover')` (`enemy.ts:3232-3234`).
  - A stuck guard: the 6 s timeout, `setState('chase' | 'attack')` (`enemy.ts:3225`). `stateT` advances in `update`
    (`enemy.ts:2220`), and every think in `seekCover` reaches the switch: `roleStep` returns null in `seekCover`
    (`enemy.ts:2932-2936`).
  - A path failure inside `boundTo` (`blockCover`, `enemy.ts:2978-2980`) returns before the flag is set.
  - A reserve failure after `setState` (`:2983`) leaves it cleared.
  - Death and KO: `die` calls `setState('dead')` (`enemy.ts:2171`, `knockOut` at `:2201`).
  - Combat state changes: `attack`/`inCover` to `seekCover` (`:2142`, `:2163`), the flanker's `tactics` (`:3360`), the
    sniper relocate (`:3106`, from another state only). All go through `setState`.
  - Own picks: `pickCover` (`:3459`), `pickAdvance` (`:3403`).
  - The open wait: `pickCover`, then `setState('seekCover')` from `chase` (`:2955-2957`).
- **No new no-mover hole.**
  - `ptGoing` / `flGoing` are `seekCover && roleBound` (`enemyManager.ts:3361-3364`), a strict subset of master's
    `seekCover`.
  - So a flag stuck true can at worst hold a mate as master did. It never holds one longer: the flag only matters while
    the same `seekCover` lasts, and that ends on arrival, the 6 s timeout or death.
  - Cases where the brain is off: blinded (`blindT`, `enemy.ts:2233`, still `inGroup`) and taken (out of the group,
    `enemyManager.ts:3388`). Both are the same as master.
  - The Sector Ops freeze is render-only (`enemy.ts:4008-4027`). Gameplay and `stateT` run.
  - Despawn: off `enemies`, so not in a group.

**(3) Same-state re-entry in `setState`. PASS (one harmless window).**
- `setState` returns early on the same state (`enemy.ts:1096`). The flag can only be true in one continuous
  `seekCover` since `boundTo`. Every seekCover-to-seekCover path either calls `pickCover` (clears it) or `boundTo`
  (sets it).
- Window (not blocking): the armour move inside `seekCover` (`enemy.ts:3127-3141`) sets `coverPicked` false and
  `coverIdx` -1. It goes through `setState('seekCover')`, which does nothing, so the flag stays true until the next
  think's `pickCover` clears it (`:3214-3216`). A roles tick in that gap still counts him for one tick, which is the
  safe side and matches master.
- Nothing leaves the flag wrongly false while a `boundTo` walk goes on, except item 1.

**(4) The e2e reads a real field. PASS.**
- `guards` are real `Enemy` instances from `t.spawn` (`e2e-stealth-ai.mjs:2697`). The same loop already reads the
  `roleName` getter and the private `huntPos` / `muzzle` members.
- `roleBound` is a public getter on `Enemy` (`enemy.ts:2824-2826`), so `mv` (`:2746`) is not always false.

**(5) No allocation, and the undo gives master's rule. PASS.**
- The fix adds one boolean field and a getter, and no per-step allocation.
- With `POLISH_B.roleTrip` false, `ptGoing = ptTrip = state === 'seekCover'` (`enemyManager.ts:3363`). This is the same
  as `origin/master` (`enemyManager.ts:3247-3248` there).
- Nothing else reads the flag (`onRoleBound` is only written in `enemy.ts`; `roleBound` is read only in
  `enemyManager.ts:3363-3364` and the e2e), so with the undo the writes do nothing.
- The test fakes carry `roleBound` and `onRoleBound` (`guardPolishB.test.ts:219`, `squadWiring.test.ts:37`, `:474`).
