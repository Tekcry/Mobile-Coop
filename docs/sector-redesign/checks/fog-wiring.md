# Campus fog fix - vol-light wiring test (fog-check Polish P1)

The gap: `theme.lampBeams` -> `gameState.ts` (PostStack option `lampBeams`) -> `postStack.ts` `frame` ->
`writeVolLight(..., beams)` had no test; dropping the gameState line or the last argument passed every test.

## What changed
- `src/vfx/volLights.ts:65` `mapLampBeams(theme)`: `theme?.lampBeams ?? true` (pure, allocation-free).
- `src/vfx/volLights.ts:72` `writeVolLights(lights, ids, n, lampBeams, pos, dir, col): number`: PostStack's vol-light
  loop moved here unchanged (`writeVolLight` per slot 0..n-1, returns the count). No closure, no temporaries.
- `src/vfx/postStack.ts:467` `frame`: `this.volCount = writeVolLights(reg.lights, this.ids, n, this.opts.lampBeams ?? true, ...)`;
  import `writeVolLight` -> `writeVolLights` (`:24`). Same values written, same count.
- `src/game/gameState.ts:614` `lampBeams: mapLampBeams(world.map.theme)`; import at `:17`.
- New `tests/volLightsWiring.test.ts` (4 tests):
  - `mapLampBeams`: undefined / `{}` / true -> true, false -> false.
  - Real map defs: campusOps -> false, ctcourse and warehouseOps -> true.
  - `writeVolLights` on a fake list (coned box lamp with no model, LED strip, torch; ids out of order, n = 3): with false
    only the torch takes the long march (reach, own cone, gain 1.6), the lamp and strip march <= 3.2 m at cos 0.88,
    gain 1; with true the coned box lamp beams too (reach 12 m, cos(0.7), gain 1.6), the strip does not; count = n,
    slot n untouched.
  - Wiring guard (source text, one regex each): `postStack.ts` calls `writeVolLights(` with
    `this.opts.lampBeams ?? true`; `gameState.ts` has `lampBeams: mapLampBeams(world.map.theme)`.

## Checks
- `npx vitest run tests/volLights*.test.ts --maxWorkers=2`: 12/12 (volLights 8/8, volLightsWiring 4/4).
- `npx tsc --noEmit -p .`: clean. eslint on the three src files and both tests: clean.
- Regressions caught (each applied, run, restored; 12/12 after restore):
  - postStack passes `true` instead of the option: wiring guard fails.
  - gameState `lampBeams:` line removed: wiring guard fails.
  - `writeVolLights` drops `lampBeams` to `writeVolLight`: the `writeVolLights` test fails.
  - `mapLampBeams` ignores the theme: the `mapLampBeams` and real-map tests fail.

## Deviations
- `gameState.ts` also gains its import line (`:17`), needed for `mapLampBeams`.
- The guard regexes match the exact expressions (`this.opts.lampBeams ?? true`, `mapLampBeams(world.map.theme)`),
  slightly stricter than "contains `mapLampBeams(`", so passing a constant also fails.
- No separate beam flag exists in the uniforms; the test asserts what the shader reads per slot: march (pos.w),
  cone (dir.w) and gain (col).
