# guard-ai mill-hunt: H3 check B
Checker: Opus 5.5 (checker B of two, independent of A), 2026-10-27. Scope: `git diff 03a82e58d...97a26b0c6` on
`src/core/flags.ts`, `src/ai/enemy.ts`, `src/ai/enemyManager.ts`, `scripts/e2e-piano.mjs`, `scripts/e2e-affected.mjs`,
`tests/millHuntGlue.test.ts`, `tests/millHuntGlueAlloc.test.ts` (PR 1's own files checked separately). Read: origin/master
CLAUDE.md, BRIEF A1-A16, PLAN rev 2 "Glue (H3)", H3-REPORT (incl. "Update to PR 1's final board"), the board's `admit` /
`free` / `drop` / `tick` / `watch`, then H3-CHECK-A last.

Verdict: PASS

No broken or off-intent glue. Polish below; none blocks.

## Checks
- **Flag off = today's scene.** `i.hunting` has the same truth value (`|| false`); the `mhOn` branch in the searching
  case and `!this.mhOn` in `aimedMotion` reduce to master. `huntBoard()` returns null without `flags.millHunt`, so
  `sceneDarkOn` runs the sweep loop, `placeSlot` keeps `sweepify` / `buildPair`, the 0.2 s block runs `boardStep`,
  `awareness.tick`, `syncCaution`, `glimpseFollow` in master's order (`hb` null), `revive` and `clear` are no-ops.
  `sceneDarkOff` adds two field writes per guard. The glue test pins it (4 watch-only pairs, `glimpseFollow` 5x / s,
  `mhTick` never).
- **Flag on, never calm.** `hunting` is read only at `alertState.ts:197` (searching -> cooldown), so `|| mhOn` holds
  `searching` and touches nothing else. The put-back covers `unaware` / `cooldown` (an investigation's end, a release, the
  co-op pin). A hunt guard only reaches `investigating` through a board send, and `incidents.ts:544` `free()` never picks a
  `searching` guard; `Enemy.ack` returns early for `searching` (`enemy.ts:1740`). Torch on and weapon up follow from
  `searching` (`archetypes.ts:166`, `guardStance.ts:16`), as A1 asks.
- **Combat as today.** `decide` sends any `alerted` guard to the combat code before `calmDecide` (`enemy.ts:3929`); the
  board's `gone()` drops him. Lost sight -> `searching` (bark "lost" as built) -> the next `mhTick` re-admits him at his
  kept index. For up to 0.2 s before that he walks to his pre-fight spot (his last copied goal): harmless.
- **Re-admission.** After a fight: same index (fighter keeps `ms[i]`). Wake: `revive` -> `mhStart`; `inherit` copies
  `slotIdx`, the board's `admit` gives the new object the old index (or a freed one) with the partner link; the waker's
  `koSearch` keeps him `searching`, so the board still drives him. Late spawn: `placeSlot` with `darkOn && millHunt`. The
  first EMP: `sceneDark = true` runs before the spawn (`darkOn` is still false inside `sceneDarkOn`, but that loop does
  not use `placeSlot`), the guards then come through `placeSlot` with `darkOn` true. Restart: `clear()` swaps in an empty
  board and the scene's `sceneDark = true` builds another (load time only).
- **`mhIdx` caching and `member(i)`.** Every way an index changes owner is caught:
  - a dead / taken member freed and the index reused: the old object fails `member(i) !== e` (and `!e.alive` first);
  - a woken guard taking his slot's index: the old object fails `member(i) !== e`;
  - a new board (restart, dark again): a guard not admitted yet (in a fight) keeps the old board's index, which on the
    new board names someone else or nobody, so the copy loop skips him and `mhAdmit` looks him up on his admit.
  `mhAdmit` refreshes the cache only after a successful `admit`, and only when `member(mhIdx)` is not him. No guard can
  read another guard's goal.
- **`mhTick` before `boardStep`.** Safe. `mhTick` writes levels (calm -> `searching`, via `onLevel`: no bark for
  unaware / cooldown -> searching, lure / light check / cam body cleared, a non-pair task dropped as on any search) and
  the four goal fields. `boardStep` reads levels through `fillView`, so it now sees the put-back guard as not free:
  intended (check A polish 4). `awareness.tick` / `syncCaution` read neither. `glimpseFollow` does not run with a board.
  With the flag off the block is master's order.
- **Hand-off allocates 0 B with real Enemies.** The copy is four double stores: `mhPt` (a `P2` array, one elements-kind
  transition on the first double write), `mhFace` (field initialised NaN) and `mhSpeed` (0.45): double fields, never
  given a non-number (only writes: `enemy.ts:1974`, `:1990-1991`, `:2006`, `enemyManager.ts:2501-2504`), no `Enemy`
  subclass. Double fields are updated in place in V8, with or without pointer compression.
- **The alloc test's own file is a real reason, not a cover.** `tests/helpers/sweepGuard.ts:77` builds stand-ins with
  `Object.assign(Object.create(Enemy.prototype), {...})`: dozens of keyed property adds go past V8's fast-property
  limit, so they are dictionary-mode objects, whose double stores box a HeapNumber each; once that feedback reaches the
  manager's `mhTick` stores they go generic. In play `mhTick` only ever sees `new Enemy(...)` instances (one shape
  family), which is exactly what `tests/millHuntGlueAlloc.test.ts` uses (null engine, `Hitboxes` mocked, real slot / pair
  tags, 150 ticks of board walking first). The measured ticks do not move the guards, so legs end by the stuck watch, but
  the board's own allocation over full walks is PR 1's sim test; the glue's part (re-admit + copy) has no branch that
  depends on movement.
- **Co-op.** Host only: the client's spawn, search and dark are the host's (`pianoScene.ts:565`), and `sceneDark` is set
  only through the host's `empHooks` (`pianoScene.ts:165-168`). No change under `src/net`, no wire or save field
  (`searching` already goes out as level 2, `coopHost.ts:119`). The co-op pin hook (`e2e-piano.mjs:328-341`) sets every
  guard `unaware` by `aware.set` after each host step; `mhTick` puts them `searching` once per 12 steps; pinned guards'
  `update` is a no-op, and the knife scene's takedown allows any level (`takedownController.ts:472` `vCalm = this.knife
  || ...`; `:420` skips only `alert`). The kills are unaffected.
- **e2e-piano is honest.**
  - Blinding: `ctx.diff` is `em.diff` (`enemyManager.ts:677`), read live in `perceptionMul` (`enemy.ts:1388`), the
    object is not frozen, restored in `finally` before the restart.
  - 30 s: every live guard `searching` and `mhOn`, `h.n > 0`.
  - Cap by positions: every live guard in each board room box on that line's storey, every 0.5 s for 60 s, not the board's
    own counts.
  - Closing in: line distance (not Euclid) to W1's stop; the set is the far ground guards (> 15 m) not in `spread` /
    `regroup` at 30 s, the ones left out are logged; empty set fails (`ids.length > 0`), strict `m1 < m0`.
  - `mSkip` onsets logged with times, no assertion (as briefed).
  - Restart: board on, phase 0, every live guard searching on the hunt.
  - `E2E_MILLHUNT=0`: `?millhunt=0` on both runs, the hunt block skipped, `START_BAD` = `PAST_SUSPICIOUS` with the old
    text; "no detection at the start" unchanged in both.
- **Hard rules.** `hyp2` in `mhStep`, no closure (the board's `out` is null), strict TS clean, the flag is
  `darkFlag(.., PREVIEW_ON)`. `millHunt.ts` imports only types, `hyp2` and `sceneSweep` (no cycle into `enemy.ts`).

## FIX
None.

## Agreement / differences with check A
Check A reviewed an earlier head (5336f4735, the `out` callback). Agreed on all checks. Since then:
- A polish 1 (192 B a tick) is closed: 0 B with real guards (above).
- A polish 2 (closing-in set) is closed by the `spread` / `regroup` exclusion.
- A polish 4 (order) is closed by `mhTick` before `boardStep`; I found nothing else in the block that depended on the
  old order.
- A polish 5 (member slots never freed) is closed by the board's `free` (PR 1); the 30-wake test covers it.
- A polish 3 (perception 0 does not stop `instantDetect`) and 6 (no missing-partner watch for hunt pairs) still stand;
  I agree. On 3, the numbers: the start bay stops nearest W1 are 2.5 m (stop 2's `pt2` 8.0, 5.4) and 2.8-3.3 m away, and
  the leg between stops 2 and 3 passes about 2.3 m east of W1; `instantDetect` needs < 1.6 m and torch light at the
  `lit` level, so the risk stays low unless the operator's stick check walks him east.

## Polish
1. **e2e-affected: the glue files do not select e2e-piano.** `src/ai/enemy.ts` / `enemyManager.ts` match only
   `'src/ai/'` (`e2e-affected.mjs:331`, first match wins, `:391`), so a later change to the hunt glue (or GA6's sweep,
   pre-existing) does not run the piano suite. Consider adding `e2e-piano` for `src/ai/enemyManager`. Low.
2. **Board (PR 1, for the lead): `admit`'s slot take-over assumes one live guard per `slotIdx`.** `placeSlot` can place a
   slot again while its old guard lives (`enemyManager.ts:2399`, `prev && prev !== e`); two live guards with the same
   `slotIdx` would take the index from each other on every `mhTick` (each one's `memberIndex` is -1 after the other's
   take-over). Not reachable in the mill (each slot placed once per spawn; a restart clears). A guard on `ms[k].alive`
   in the take-over would close it.
3. **`mhStep` turns to the aim 0.2 m early.** Between `MH_NEAR` 0.3 and `HUNT.arrive` 0.5 he still walks but already has
   the board's yaw as his face (`enemy.ts:3637`): a short sidestep into the stop. Cosmetic; Michael's walk decides.
4. **H3-REPORT note 4 is stale.** It says the incident board "can still `sendTo` a hunt guard (`sendable` includes
   searching)"; `incidents.ts:544` `free()` excludes `searching`, as check A and the later update say. Doc only.

## Commands and results (worktree C:/NightShift/Mobile-Coop-guard-ai-mill-hunt-h3 at 97a26b0c6)
- `npm run typecheck:fast`: exit 0.
- `npx vitest run` on the 79 test files importing `ai/enemy` / `ai/enemyManager` / `sceneSweep` / `pianoGuards`
  (including `millHunt`, `millHuntGlue`, `millHuntGlueAlloc`, `pianoGuards`, `sceneSweep`, `guardAiAllocManager`) plus
  `tests/millHuntThornbeck.test.ts`: 80 files passed, 1206 passed, 1 skipped (33 s).
- `node --check scripts/e2e-piano.mjs`: exit 0.
- Not run (as briefed): e2e (queued on the laptop), `npm run check`, `npm run dev`. No code changed by this check.
