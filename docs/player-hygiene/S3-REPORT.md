- Done (Night Shift | Cloud Builder 1, 2026-10-25, on ee7993e2):
  - Commit 1 (parity check): `tests/takedownAlloc.test.ts` on the unchanged code passed against the committed fixture
    (6 pass, the `...Into` case skipped; scan 1152.2 B per step, carry wait 0.0 B, "master"). Verified, no change: the
    test and fixture were not re-recorded and are unchanged since.
  - Commit 2 (refactor): `src/game/takedown.ts` `pickTakedownInto(i, out, to)` / `assistPlanInto(..., los, out)` write
    all nine plan fields in place (the same expressions, the same order) and return true / false; `pickTakedown` /
    `assistPlan` are wrappers with a fresh plan (and `to`) as before. The `ground` closure is `groundInto(out, kind, i)`,
    `drop` / `above` are `dropInto(out, i)` / `aboveInto(out, i)`; their doubles (dx, dz, dy, face, ux, uz) go through a
    module `Float64Array` (`GEO`), not as arguments (see Deviations). `src/game/takedownController.ts`: members
    `scanPlan`, `scanTo`, one `scanOffer`, `activePlan`, `activeTo`; `tryVictim` uses `ballistics.hitDistance` for both
    sight checks (same masks) and fills the member offer; `start()` copies the offer's plan into `activePlan` first and
    applies the grab approach there (the scan's scratch is never mutated); `carryStep` is an index loop (first match).
    `:274-279` (the J15 lines) untouched.
  - Readings (`tests/takedownAlloc.test.ts`, three runs): scan **0.0 B** per step (was 1152.2), carry wait **0.0 B**
    (was 0.0); 7 / 7 (wrapper parity, `...Into` parity with `bad` 0, scan, carry wait, both alias tests).
  - Checks: `npm run typecheck` clean; eslint clean; the brief's vitest set 10 files, 159 / 159.
- Deviations:
  - `groundInto` / `dropInto` / `aboveInto` take their doubles from `GEO` instead of the brief's argument lists: after
    the parity sweeps feed `pickTakedownInto` many input shapes, V8 stopped inlining `groundInto` and boxed its three
    double arguments (the scan read 96 B per step in the full file, 0 B alone). Values are bit-identical (the parity
    tests pass). Undo: the argument lists, if the sweeps ever stop running first.
  - `tests/coopWalkFixes.test.ts:120` and `tests/hangDownTakedown.test.ts:78`: their fake `ballistics` gains
    `hitDistance: () => 100` (as the takedownAlloc fake): the controller no longer calls `ray` in `tryVictim`. Not in
    the brief's file list; needed for its vitest set to pass.
- Left: the laptop suites, affected + e2e-coop + e2e-netmove, run by the lead.
- J15 note: `takedownController.ts:274-279` (the `for` header, `const e`, the P6 comment, the skip) untouched, so J15's
  one-line `e.def.quadruped ||` merges cleanly.
