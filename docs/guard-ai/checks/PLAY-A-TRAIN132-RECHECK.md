# Play A train 132 re-check - PR #588 (feature/guard-ai-home, fix round 55a8cddcb)

Fresh Opus re-checker. Read-only on code. Scope: FIX 1 and FIX 2 of `PLAY-A-TRAIN132-CHECK.md` and any new fault from
55a8cddcb.

## Verdict: FIX

FIX 1 and FIX 2 are fixed in the game code. One new fault: `EnemyManager.update` now calls `this.nav.sliceTick()`, and
a test that builds an EnemyManager on a stub nav without it fails (FIX R1, a red suite).

## Runs

Temp worktree: 55a8cddcb merged with origin/master and origin/feature/light-realism-l1 (removed afterwards).

- `npx vitest run tests/guardHome.test.ts tests/nav.test.ts`: 34/34 (the S1 case from (60, -36) included).
- `npx vitest run tests/perceive4.test.ts`: 1 failed / 11, `TypeError: this.nav.sliceTick is not a function`
  (`enemyManager.ts:3712`). Same result in the PR worktree.
- PR worktree: `tests/consoleNoticeA4.test.ts` 2/2, `tests/lockedDoorPath.test.ts` 12/12 (they call `em.update` on a
  real nav); `npm run typecheck:fast` clean.
- Scratch probes (three tests appended to the temp copy of guardHome, deleted with it), check B wall grid, real
  EnemyManager token:
  - Starvation order (the later-listed guard b starts first, then a thinks before b every frame, 20 expansions per
    slice): `b:path, a:path`, at most 1 slice per frame, one `sliceStart` each. The old fault is gone.
  - Dead owner (a stops thinking mid-slice): b takes over after 30 frames (`SLICE_IDLE`); a comes back: `a:lost` once,
    waits for b's search (no token spent), restarts once and gets his path. No restart loop.
  - Really no path (the solid-wall grid, both guards with the token): both get `none`, then `walker.giveUp` once each.

## FIX 1 - fixed

- `enemy.ts:2820` and `2825`: `sliceFree(this)` is read before `longPlanFree()`, so a guard who cannot run a slice never
  takes the frame's token. `sliceFree` is now a pure read (`navGrid.ts:743`).
- Deadlock: none. While a live owner's search runs, every other home guard fails `sliceFree` and leaves the token; the
  owner takes it at `enemy.ts:2811` each frame and his `sliceStep` zeroes `idle` (at most 1 at anyone's ask, after
  `sliceTick` at the top of `EnemyManager.update`). `decide` runs every update (`enemy.ts:2481`; only `perceive` is on
  the think cadence), so a calm owner steps every frame. No other code takes `ctx.longPlan`. A free slot is taken by
  the first asker in list order; each guard makes one long plan per point, so the queue drains.
- Lost slot: `sliceLost` (`navGrid.ts:802-811`) and `enemy.ts:2887` leave `homeLong` false. The lost guard then waits
  behind the new owner (`sliceFree` false, the window held at `2825`, no token used) and restarts when the slot frees.
  A version change is lost only on a lock / closure change (`setClosed`), never per frame, so no restart loop. This
  also closes the earlier Polish P3.
- A takeover now needs 30 frames (1 s at 30 Hz) with the owner not stepping: only a dead / fighting / laddering owner.
- Give-up with no path: `sliceStart` false or a real `null` (cap or empty heap, `sliceLost` false) sets `homeLong`, so
  the next stuck window gives the point up (probe above).
- Allocation: `sliceTick` and the `sliceLost` field allocate nothing.

## FIX 2 - fixed

`enemy.ts:272` `homeCap: 120000` (12 frames at 10000; per-frame cost unchanged), above the measured worst ~77000. The S1
list adds guard 0 from (60, -36) (`far`: only the walk home is asserted) and passes on the merged layout.

## FIX R1 - `tests/perceive4.test.ts:330`: the stub nav has no `sliceTick`

Scenario: "coop4 AI2: EnemyManager.raysThisStep > sums every guard's rays over one update ..." builds an EnemyManager
on `{ version: 0, walk, cols: 2, rows: 2 }` and calls `em.update(1 / 60)`; the new `this.nav.sliceTick()`
(`enemyManager.ts:3712`) throws. Grep of every `new EnemyManager(` test: only perceive4 calls `update` on a stub nav
(consoleNoticeA4, lockedDoorPath and guardHome use a real NavGrid there).

Minimal fix: add `sliceTick: () => {}` to that stub (`perceive4.test.ts:330`). Keep the production call unguarded.

## Polish

- P1 The new guardHome test "(check FIX 1) plans that need many slices" does not reproduce the starvation order: a is
  first in the list and also starts first, so the waiter never thinks before the runner; it passes on the old code too.
  Start b alone in frame 0 (`em.update(dt); b.calmDecide(dt);`), then a before b each frame, and expect
  `['b:path', 'a:path']` in that order with no `lost` (the scratch probe above did this and passed).
- P2 (carried) `navGrid.ts` `octile` destructures `this.center(i)` (a 2-array per heap push); use `centerInto`.
- P3 (carried) nav tests for a closure change mid-slice (null with `sliceLost`, slot free), s = g and `sliceCancel`.
