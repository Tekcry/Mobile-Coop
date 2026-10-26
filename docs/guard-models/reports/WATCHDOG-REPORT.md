# Guard figure shader watchdog: build report
Owner: Night Shift | Player Build. Status: built, e2e pending (laptop queue).

Brief: `docs/guard-models/WATCHDOG-BRIEF.md`. Builder: Opus. Branch `feature/gm-watchdog` (cut from feature/gm-flip
37a620451, #375 not merged yet).

## Built
- `src/player/bodyEffectRecovery.ts`: `watchBodyEffect` and `recompileEffect` take `what` (default `'smooth body'`), so
  every existing log line is byte-identical; the guard figures log as `guard figure <mesh>: body shader ...`.
- `src/operators/runtime/guardFigure.ts`: each part has its own `EffectWatch`; `drawState(now)` watches every drawn
  part of the shown LOD (the S1 body's watchdog: timed-out / failed / disposed compiles recompiled at once, a running
  compile only after `STUCK_MS` and `STUCK_FRAMES`) and returns 1 (all ready), -1 (one unready) or 0 (nothing to judge).
- `src/ai/guardBody.ts`: `fallback` / `fallbacks`; once per render, while shown and not frozen, the merged S1 body
  stands in while the figure's shown LOD is unready and goes when it is ready (0 holds whatever shows). `viewMesh`
  follows the body that draws. `shown` and `ready()` unchanged.
- Tests: `tests/guardBody.test.ts` W1-W5, `tests/bodyEffectRecovery.test.ts` R1.
- `scripts/e2e-guard-carry.mjs`: the page setup takes `{ spot, define, faultMs }`; the S1 legs run as before
  (SMOOTHBODY, 1 s, `guardmodels=0`); a second page, figures on, forces a 5 s GUARDFIG compile timeout and checks the
  stand-in, the recompile and the hand-back.
- `docs/systems/testing-tools.md`: the suite's entry.

## Numbers used
The S1 watchdog's own, unchanged: `STUCK_MS` 90000, `STUCK_FRAMES` 30, `MAX_RECOMPILES` 3 per effect key. The e2e
fault cut: 5000 ms (the brief's).

## Two points where the brief could not be followed word for word
- `GuardBody` already has `readonly standIn: boolean` (Wren's files stand in), so the brief's `private standIn(on)`
  is named `setFallback(on)`.
- `drawState`: when the watch recompiles a part's effect, the drop leaves the sub-mesh with no effect, so reading it
  after the watch finds nothing to judge, and W1's "render -> fallback true" could not hold. A part whose effect the
  watch recompiled this render counts as unready (it was).

## Tests
- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run tests/guardBody.test.ts tests/bodyEffectRecovery.test.ts tests/guardFigure.test.ts
  tests/guardFigureWarm.test.ts tests/guardWarmMenu.test.ts tests/smoothBody.test.ts`: 6 files, 69 tests pass.
- e2e: `e2e-guard-carry` (`E2E_GPU=1`) on the laptop queue: pending (the lead requests it).

## What Michael should see
Nothing, unless a guard's shader stalls: then the older smooth body shows in his place until the shader is ready,
instead of an invisible guard. The first time he gets within 25 m / 6 m of a guard base, that guard may briefly
show the older body while its closer-detail shader compiles (only the far one is compiled on the loading screen).
