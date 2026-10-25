# map-ready S10 check: kept parts (compiled shaders)
Owner: Night Shift | Sector Ops Build. Status: current.

Fresh Opus 5.5 checker. Head checked: `110c0454b` on `feature/map-ready-s10`; S10 diff only (`06849c4f4..110c0454b`:
`src/core/app.ts`, `src/core/keptParts.ts`, `tests/keptParts.test.ts`, `tests/pluginCode.test.ts`, the build report and
the changelog fragment). Read: origin/master `CLAUDE.md`, PLAN S10 (:384-412) and claims (:19-88), `briefs/S10.md`,
BRIEF A16 / A18, `checks/s10-build.md`. Babylon facts checked against `node_modules/@babylonjs/core` 9.29.0.

## Verdict: PASS (desk)
The desk part passes. The brief's checker gate also needs `e2e-coop` + `e2e-netmove` green, flag off and on, plus
`e2e-lightbake` and `e2e-desktop`. Those are laptop runs the lead requests and were not run here (desktop rules), so
they remain open before merge.

## Fix list
None.

## What was checked
- **Intent.** Matches PLAN S10 and the brief. `releaseState` with the flag on: S9 `handOver`, then `keepEffects`, then
  `scene.dispose()`, then `releaseUnkept` in place of `releaseEffects()` (`app.ts:397-411`). Context loss calls
  `dropTextures()` + `dropEffects()` (`app.ts:111-115`). `KEPT_EFFECTS` 400, LRU eviction, and `effReused` /
  `effCompiled` / `heldEffects` are written to S1's `loadCounters` (fields already exist in `mapReadyStats.ts:15`, file
  not edited). The plugin audit table covers all six plugins. Spot-checked `LampPlugin.getCustomCode`
  (`bakedLamps.ts:1549+`): it reads only `this.std` (the material class, so the shader name, which is in the key),
  local strings and module constants. `this.lamps` is read only in `prepareDefines` / bind. `SurfacePlugin` reads
  `space` / `atlas` / `wet` only in defines, attributes and bind. No plugin file was edited, so none is a claim issue.
- **Flag-dark.** Flag off: `keepEffects` / `releaseUnkept` / `dropEffects` / `countEffect` are no-ops, the
  `createEffect` wrapper and the effect drop are not installed, and `releaseEffects()` runs as before. The only change
  that is always live is the `_compiledEffects` cast read. Production is unchanged.
- **Hard rules.** Babylon: `keptParts.ts` stays pure with no Babylon import. `app.ts` only casts. Network,
  localStorage and gameplay reading graphics state: none. Hot paths: the wrapper allocates one rest array per
  `createEffect`, which runs on define changes or load, not in AI / nav / anim loops (polish 1).
- **Keep / reuse logic against Babylon 9.29:**
  - The cache key is `vertex + "+" + fragment + "@" + defines + globalDefines` (`thinEngine.pure.js:1683`). A cache
    hit does `_refCount++` and calls the caller's `onCompiled` itself, so the stripped `onCompiled` is never needed on
    reuse.
  - `_key` is the effect's cache key (ctor `key` param), so `countEffect`'s lookup is sound. A new effect starts at
    `_refCount` 1 and a hit is >= 2, so `effCompiled` counts compiles only.
  - The strip covers every field the effect takes from its creator that can close over a material: `onCompiled`,
    `onError`, `onBind`, `_fallbacks` (EffectFallbacks holds a mesh for CPU skinning), `_processCodeAfterIncludes`,
    `_processFinalCode` (the plugin manager closures), and the observers. `_onBindObservable` is read as a field, not
    through the getter. The remaining fields are names, arrays, numbers, the pipeline context and the engine. The
    NullEngine walk + `gc()` test shows the old material and scene are collected.
  - Deviation 3 (`dropEffects` uses `dispose()`, not force) is correct in 9.29. `_rebuildEffects`
    (`abstractEngine.pure.js:211`) calls `_prepareEffect()`, which compiles from `_vertexSourceCode` /
    `_fragmentSourceCode`, not the stripped hooks, and `Effect.AutomaticallyClearCodeCache` is false
    (`effect.pure.js:1230`; nothing in `src/` sets it). So a live kept effect rebuilds with its plugin code intact, and
    a forced dispose would break the live match's materials.
  - Eviction: one `dispose()`, then `releaseUnkept` force-frees anything not held. This holds even when reference
    counts drift. A held effect that left the cache (for example `bodyEffectRecovery.recompileEffect`'s
    `dispose(true)`) is forgotten at the next keep, and a successor under the same key is kept fresh.
  - Effects that are not ready (still compiling) are not kept and are force-released as today.
  - Menu <-> match: both directions go through `releaseState` (`main.ts:141`, `:396`). Menu effects and match effects
    are both kept within the 400 budget, and LRU follows actual reuse.
  - S1's `loadPrograms` (the `_compiledEffects` count delta) then counts only new programs on a repeat load, which is
    what the done-line needs.
- **Memory.** Bounded by count (400). Each kept effect keeps its processed source strings in the JS heap, as a live
    match already does. The heap 5% check over 3 loads is the laptop proof (polish 3).
- **Tests.** `pluginCode.test.ts`: two maps give the same code, uniforms and samplers for all six plugins, and the same
  final source on compiled keys. Fail-first was reported. `keptParts.test.ts`: 6 pure tests plus 4 NullEngine tests,
  covering the same effect on the same key with `_refCount` 1 -> 2 and `effCompiled` 0, the strip, unreachability with
  gc, context loss, flag off with the real `releaseEffects`, and the S9 stats shape updated.

## Polish list
1. `app.ts:118` the `createEffect` wrapper's `(...a)` allocates a rest array on every call, including cache hits. This
   is load-time in practice. A fixed-arity forward (11 params) would allocate nothing if a per-frame `createEffect`
   path ever appears.
2. `releaseState` with `prev.scene.isDisposed` already true skips `keepEffects`, so held effects the dead match touched
   are not re-stripped. The current flows never hit this (`releaseState` nulls `state` before `setState` disposes).
   Stripping held effects in `releaseUnkept` too would close it.
3. The budget counts effects, not bytes. If the laptop heap check shows the kept set costing more than ~5%, cap by
   source length (`_vertexSourceCode.length + _fragmentSourceCode.length`) the way S9 caps textures by MB.
4. Deviation 3 relies on `Effect.AutomaticallyClearCodeCache` being false. A one-line test assert (or a comment at
   `dropEffects`) would catch a future change that sets it.
5. The changelog fragment is `changes/feature-map-ready-s10.md`, while PLAN names the shared
   `changes/feature-map-ready.md`. Fold it at the S10 merge if the job uses one fragment.

## Commands run (desktop, one at a time)
- `npm run typecheck:fast`: clean (exit 0).
- `npx vitest run tests/pluginCode.test.ts tests/keptParts.test.ts --maxWorkers=2` (BelowNormal priority): 2 files,
  23 passed, 0 failed (23.7 s).
- Not run (by rule): e2e, `npm run dev`, `npm run check`.

## Open before merge (lead)
`e2e-coop` + `e2e-netmove` flag off and on (the brief's checker gate), `e2e-lightbake` (repeat load) and `e2e-desktop`
(a quality change mid-match) with `mapready=1`, then `map-ready-measure.mjs --gated` repeat rows (`effCompiled` 0 for
kept materials, heap after 3 loads within 5% of after 1) and a forced `WEBGL_lose_context` mid-match.
