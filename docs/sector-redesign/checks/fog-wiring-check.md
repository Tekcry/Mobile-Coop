# Fog wiring - fresh Opus check

Verdict: PASS

Branch `feature/sector-redesign-fog2` @ d0e7f2f4, checked as `git diff 031b54f1 HEAD` (5 files, +156 / -11) against
`origin/cloud-queue:briefs/sector-redesign-fog-wiring.md`. No must-fix.

## 1. Behaviour unchanged
- `src/game/gameState.ts:614` `lampBeams: mapLampBeams(world.map.theme)`; `src/vfx/volLights.ts:65-67`
  `theme?.lampBeams ?? true`. Same value as the old `world.map.theme.lampBeams ?? true` (`MapDef.theme` is required,
  `src/world/mapDef.ts:126`; the `?.` only adds an undefined guard).
- `src/vfx/postStack.ts:467` passes `this.opts.lampBeams ?? true` (old `const beams`), `reg.lights`, `this.ids`, `n` and
  the same three uniform arrays; `volLights.ts:72-89` is the old loop verbatim (`writeVolLight(lights[ids[i]!]!, k, ...,
  lampBeams)`, `k++`, returns `k` = `n` = old `this.volCount`). `writeVolLight` (`volLights.ts:35-61`) untouched.
- Maps: the only `lampBeams` in `src/world/maps` is `campusOps.ts:106` (`false`); every other map takes the default
  `true`, as before. No other `lampBeams` reader in `src`.

## 2. The new test catches the gap (each mutation run, then `git checkout -- <file>`)
`npx vitest run tests/volLightsWiring.test.ts --maxWorkers=2`, baseline 4/4:
- (a) `gameState.ts:614` -> `lampBeams: true,`: red (wiring guard, `tests/volLightsWiring.test.ts:84`), 1 failed / 3 passed.
- (a2) `gameState.ts:614` line deleted: red (same guard).
- (b) `postStack.ts:467` option -> literal `true`: red (wiring guard, `:83`).
- (c) extra: `volLights.ts:85` drops the `lampBeams` argument: red (`writeVolLights` test, `:40`).
- Restored: 4/4, `git status` clean.

## 3. Hard rules
- No per-frame allocation: `writeVolLights` is a plain counted loop over typed arrays, no closure / iterator / temp
  (`volLights.ts:72-89`); `postStack.ts:467` passes existing fields. `mapLampBeams` runs once at level setup.
- Babylon: `volLights.ts` and the new test import nothing from `@babylonjs` (0 hits); `postStack.ts` imports unchanged
  apart from `writeVolLight` -> `writeVolLights` (`:24`).
- Strict TS: `npx tsc --noEmit -p .` exit 0. `import type` not needed (value imports only).
- Scope: only the brief's files plus the gameState import line (`:17`, reported as a deviation, necessary).
- Tests: `npx vitest run tests/volLightsWiring.test.ts tests/glslPrecision.test.ts tests/governor.test.ts
  tests/graphics.test.ts tests/volLights.test.ts --maxWorkers=2`: 5 files, 32/32.

## Polish
- P1 The wiring guard reads `src/...` relative to the process cwd (`tests/volLightsWiring.test.ts:83-84`); it works
  from the repo root (vitest's root) but `new URL('../src/...', import.meta.url)` would make it cwd-proof.
- P2 The guard matches exact source text, so a harmless rewrite (renaming `world`, splitting the option into a local)
  fails it; the failure message should say "update the guard with the wiring" so the next builder does not just loosen it.
- P3 `writeVolLights` keeps both `i` and `k`, which are always equal (moved unchanged on purpose; could return `n`).
