# Guard figure shader watchdog: builder brief
Owner: Night Shift | Player Build. Status: current.

Lead: Night Shift | Player Build. Builder: Opus (engine / render). Checker: one Opus checker. Estimate: ~380 lines
(src ~80, unit tests ~160, e2e ~130, docs ~10).

**Base.** `feature/gm-watchdog` as pushed: cut from origin/feature/gm-flip 37a620451 (#375, not merged yet) plus this
brief. If #375 has merged before the build starts, the lead first recuts `feature/gm-watchdog` from origin/master and
cherry-picks this brief's commit (the lead's step; the builder never rebases or merges master). Read the agent preamble
(`git show origin/master:docs/systems/agent-preamble.md`) first; its rules hold.

## Goal
A guard figure (`GuardFigure`, the realistic guard body, default on since #375) whose shader will not compile never
leaves the guard invisible. While the figure's shown level of detail (LOD) has an unready main-pass effect, the merged
S1 body (the "smooth body") stands in; a figure effect that is stuck or failed is recompiled with the S1 body's own
watchdog (`src/player/bodyEffectRecovery.ts`), same numbers, same log style; when the figure's effect is ready the
figure takes over again. Render side only: gameplay reads none of it (CLAUDE.md hard rule). No per-frame allocation.

## Why (what exists)
- The S1 body has a watchdog: `SmoothBody.frame` calls `watchBodyEffect(mesh, watch, now)` once per render per body
  mesh. `stuckReason` drops an unready effect at once when Babylon's poll timed out (`getCompilationError()` contains
  "timed out"), the compile failed with all fallbacks used, or its program context was disposed; a compile merely
  running is dropped only after `STUCK_MS` 90000 ms AND `STUCK_FRAMES` 30 frames. `recompileEffect` drops the effect
  from every sub-mesh, the engine cache and the GL pipeline cache, undoes Babylon's CPU-skinning fallback, at most
  `MAX_RECOMPILES` 3 per effect key, logging `smooth body <mesh>: body shader <reason>, recompiling (n/3)` per recompile
  and `... 3 recompiles done, left to Babylon` once.
- The figure has none. `GuardBody.ready()` (`src/ai/guardBody.ts` ~line 162) disables the merged body as soon as the
  figure's first LOD meshes are BUILT (`figure.onMeshes`), not when its shader is ready. A figure effect that compiles
  slowly or never leaves the guard invisible. Only LOD2's shader is warmed on the loading screen (`guardWarm.ts`,
  20 s give-up); a GPU run already printed `[guards] the guard shader did not compile on the loading screen (it
  compiles at the first draw)`, and LOD0 / LOD1 always compile at their first draw.
- The anim tier watches `gb.viewMesh` (`enemy.ts` ~4703). Today that is the figure mesh even while it draws nothing,
  so an invisible-figure guard is also animated at the off-screen rate.
- Since train 159 `e2e-guard-carry` opens `guardmodels=0` (triage: `C:/NightShift/scratch/ctcore/gc159-TRIAGE.md`),
  so no suite exercises a figure compile fault.

## Out of scope
- Warming LOD0 / LOD1 shaders on the loading screen; `guardWarm.ts` (its 20 s give-up, its warning) is not touched.
- Holding the previous LOD while a new LOD compiles (`GuardFigure.update`'s LOD switch is not touched).
- The load gate and pop-in count: `GuardBody.shown` keeps its meaning (`gameState.ts` `gateRead`, `readyGuards`).
- Shadow-depth effects (an unready figure shadow shader does not bring the merged body back).
- The S1 watchdog's numbers and behaviour, the player figure (`OperatorFigure`), the shield (`guardShield.ts`), WebGPU.
- `scripts/e2e-affected.mjs`: `src/ai/` and `src/player/bodyEffectRecovery` already pick `e2e-guard-carry`.

## Files and exact behaviour

### 1. `src/player/bodyEffectRecovery.ts` (~8 lines)
- `watchBodyEffect(mesh, w, now, what = 'smooth body')` and `recompileEffect(scene, effect, reason, label, what =
  'smooth body')`: `watchBodyEffect` passes `what` on. Both log lines start `${what} ${label}: body shader ...`
  (wording otherwise unchanged; the default keeps every existing line byte-identical). A default string parameter
  allocates nothing.
- Header comment: one line, "(gm-watchdog) the guard figures' effects use the same watch and cap (`GuardFigure.drawState`,
  logged as `guard figure`)". The cap stays per effect key (`RECOMPILES`), shared with the S1 body; figure keys differ
  (GUARDFIG define), so the two never share a count.

### 2. `src/operators/runtime/guardFigure.ts` (~30 lines)
- Import `newEffectWatch, watchBodyEffect, type EffectWatch` from `../../player/bodyEffectRecovery`.
- `GuardPart` gains `watch: EffectWatch`, set to `newEffectWatch()` in `instance()` (load time).
- New method, after `update` in the file:
  ```ts
  /**
   * (gm-watchdog) Once per render, after `update`: the shown LOD's main-pass effects. Each drawn part's effect is
   * watched (`watchBodyEffect`, logged as 'guard figure': a timed-out, failed or disposed compile is recompiled at once,
   * one that never finishes after STUCK_MS and STUCK_FRAMES, at most MAX_RECOMPILES per variant). 1: every drawn
   * part's effect is ready; -1: one is unready; 0: nothing to judge (disposed, disabled, no LOD shown, or no effect
   * asked for yet: culled since it was shown, or just dropped by a recompile). No allocation.
   */
  drawState(now: number): number
  ```
  Body: return 0 when disposed, `!this.enabled` or no shown LOD. For each part of the shown LOD: skip `p.count === 0`
  (no visible piece, never drawn); call `watchBodyEffect(p.mesh, p.watch, now, 'guard figure')` for EVERY drawn part
  (no early return before all are watched); then read `p.mesh.subMeshes?.[0]?.effect`: null or disposed is not judged;
  `!isReady()` marks unready; ready marks ready. Return -1 if any unready, else 1 if any ready, else 0. Plain loop, no
  closures, no arrays.

### 3. `src/ai/guardBody.ts` (~35 lines)
- New fields: `fallback = false` ("(gm-watchdog) The figure is in (`shown`) but its shown LOD's shader is not ready
  (compiling, or stuck and being recompiled): the merged body stands in. `shown` keeps its meaning: the load gate and
  the pop-in count read it."); `fallbacks = 0` ("(tests, e2e) times the merged body has stood in").
- `frameAll`: `const now = performance.now()` once per render, `list[i]!.frame(cam, now)`.
- `frame(camera, now = performance.now())`: after the existing `update` / `skip` lines, before `shield?.follow()`:
  ```ts
  // (gm-watchdog) no judgement while frozen (the root disabled draws nothing of either body)
  if (this.shown && this.rig.root.isEnabled(false)) {
    const s = f.drawState(now);
    if (s !== 0) this.standIn(s < 0);
  }
  ```
- `private standIn(on: boolean)`: no-op when `on === this.fallback` or disposed; else set `fallback`, `fallbacks++`
  when `on`, and `setEnabled(on)` on each of `rig.renderMeshes` (indexed loop). The figure's meshes stay enabled
  (Babylon must keep asking for its effect). So a state of 0 holds whatever is showing: no flicker when a recompile
  drops the effect, and no stand-in for a guard culled since spawn.
- `ready()` unchanged (the first LOD in: merged body off, `fallback` false). The first judgement comes at the next
  render: a figure whose effect is cached and ready never brings the merged body back (today's spawn path, no
  overlap frame); one that is not ready is invisible for at most that one frame, then stood in.
- `viewMesh`: `(this.shown && !this.fallback ? this.figure.mesh : null) ?? this.rig.voxel?.meshes[0] ?? null`, so the
  anim tier tracks the body that draws.
- Header comment bullet "The merged body ... stays drawn until the figure's first LOD is ready" gains: "(gm-watchdog)
  and comes back while the figure's shown LOD's shader is not ready (`GuardFigure.drawState`); a stuck or failed figure
  compile is recompiled by the S1 body's watchdog (`bodyEffectRecovery.ts`)".

### 4. `tests/guardBody.test.ts` (~150 lines): new `describe('(gm-watchdog) the figure shader watchdog')`
Use the file's `setup()` and stand-in GLBs. `beforeEach` of the block: `rec.resetEffectRecovery()`. Babylon's draw-time
readiness call is mirrored by a helper `ask(gb)`: for each mesh of `gb.figure.lodMeshes(gb.figure.current)`,
`m.material!.isReadyForSubMesh(m, m.subMeshes[0]!, false)`. Copy the 8-line `timeOut(e)` helper and the
`engine.createEffect` fault spy pattern (key includes `GUARDFIG`) from `tests/bodyEffectRecovery.test.ts`. Drive time
with `gb.frame(scene.activeCamera, now)` where a test needs `now`.
- W1 "a figure effect that times out: the merged body stands in, the effect is recompiled, the figure takes over once
  ready; `shown` never drops": fault on; wait shown; render; ask; render -> `fallback` true, `fallbacks` 1, every
  merged mesh enabled, `viewMesh` = merged mesh, warn called with `guard figure` and `compile timed out, recompiling
  (1/3)`, the faulted effect disposed, the part's sub-mesh effect null; render again -> still `fallback` (state 0
  holds); fault off; loop ask + render until ready (<= 40) -> `fallback` false, merged meshes disabled, `viewMesh` = the
  shown LOD's mesh; `gb.shown` true at every step.
- W2 "nothing asked for yet: no judgement, no stand-in": wait shown; render x3 without `ask` -> `fallback` false,
  `fallbacks` 0, merged meshes disabled.
- W3 "a compile still running: the merged body stands in, nothing logged, recompiled only after STUCK_MS and
  STUCK_FRAMES": make the asked effect unready with no error (`_isReady` false, no `_compilationError`, a live
  pipeline context); `frame(cam, t)` for 40 frames at t < `STUCK_MS` -> `fallback` true, `console.warn` not called;
  then frames at t >= `STUCK_MS` -> one `compile stuck, recompiling (1/3)` line.
- W4 "frozen or disabled: no judgement": an unready effect with `rig.root.setEnabled(false)` -> render x3, `fallback`
  unchanged (false); `gb.figure.setEnabled(false)` with the root enabled -> same.
- W5 "past MAX_RECOMPILES per variant the merged body stays": the fault kept on through 4 drops -> warn lines: 3
  `recompiling` + 1 `left to Babylon`; `fallback` true after the last.
- Existing tests unchanged and passing (the first one's `shown` / merged-disabled asserts hold: it never asks).

### 5. `tests/bodyEffectRecovery.test.ts` (~12 lines)
- R1 "the log names the caller": a timed-out S1 effect via `watchBodyEffect(mesh, w, 0)` logs `smooth body <name>:
  body shader compile timed out, recompiling (1/3)`; after `resetEffectRecovery()` and a fresh timed-out effect,
  `watchBodyEffect(mesh, w, 0, 'guard figure')` logs `guard figure <name>: body shader compile timed out, ...`.

### 6. `scripts/e2e-guard-carry.mjs` (~130 lines): a figures-on leg with a forced figure fault
- Refactor only as needed: the page-side setup lambda becomes `SETUP({ spot, define, faultMs })`; the fault hooks
  match `new RegExp('#define ' + define + '\\b')` instead of the literal SMOOTHBODY; `FAULT_MS` comes from `faultMs`.
  The existing S1 legs run exactly as now (`define: 'SMOOTHBODY'`, 1000 ms, `guardmodels=0`), with their own final
  error asserts, then `browser.close()`.
- Figures-on leg: `launch` again with `autostart=warehouse&mode=infiltration&gfx=high&guardmodels=1`, same viewport;
  `SETUP({ spot: spotArg, define: 'GUARDFIG', faultMs: 5000 })` (5 s, not 1 s: gives the merged body's own first
  compile time to finish while it stands in; see Doubt 3).
- `__gc.arm()` with GUARDFIG also releases the loading-screen warm meshes' hold: for each mesh whose name starts
  `guard-warm-`, `sm.setEffect(null)` on every sub-mesh whose effect's defines match, before the flush. Without this
  the warmed LOD2 effect stays cached and the fault never fires.
- New `__gc.figure()` (page side, test only): for `em.enemies[0].gbody`: `shown`, `fallback`, `fallbacks`,
  `lod` (`figure.current`), `figDrawn` (`figure.mesh` enabled, among the active meshes, its effect ready),
  `figGpuSkin`, `figInfl` (NUM_BONE_INFLUENCERS from the effect defines), `mergedOn` (every `rig.voxel.meshes`
  enabled), `mergedDrawn` (one merged mesh among the active meshes with its material ready).
- Steps: `reset`, 3 frames, `arm` (assert hooked), spawn a grunt at the spot, `look()`, then sample every 5 frames for
  at most 105 s, stopping when `shown && !fallback && figDrawn` and the fault is spent; count `fallbackSeen` (samples
  with `fallback && mergedOn`), `standInDrawn` (samples with `fallback && mergedDrawn`), and `vanished` (samples after
  the first 10 frames with neither `figDrawn` nor `fallback && mergedOn`). Then `disarm`.
- Asserts (each message says what it measured):
  1. the forced figure fault fired (faulted >= 1, timeouts >= 1 or dropped >= 1), else "Babylon's compile path changed
     and this leg tests nothing";
  2. `fallbacks >= 1` and `fallbackSeen >= 1`: the merged body stood in while the figure's shader was faulted;
  3. `vanished === 0`: the watchdog's logic never left the guard with neither body;
  4. `standInDrawn >= 1`: the stand-in was actually drawn;
  5. at least one `/guard figure .*recompiling/` line and dropped >= 1: recovered through the recompile;
  6. end state: `shown && !fallback`, `figDrawn`, `figGpuSkin && figInfl > 0`, `!mergedOn`;
  7. no effect failed to compile and no console errors, outside the forced fault's own lines (as the S1 forced pass).
  Log `fallbacks`, `lod`, the sample counts and the recompile lines.
- Header comment: one paragraph "(gm-watchdog)" on the new leg; replace the gm-flip paragraph's last sentence to say
  the figures-on leg now covers the figure.

### 7. Docs (~10 lines)
- `docs/systems/testing-tools.md` `e2e-guard-carry` entry: add "then, figures on, a forced guard-figure compile
  timeout: the merged body stands in and the figure's effect is recompiled".
- Report: `docs/guard-models/reports/WATCHDOG-REPORT.md` (built, numbers used, files, commits, tests, e2e result, what
  Michael should see: nothing, unless a shader stalls). STATE.md is the lead's.

## Checks
- `npm run typecheck:fast`; `npx vitest run tests/guardBody.test.ts tests/bodyEffectRecovery.test.ts
  tests/guardFigure.test.ts tests/guardFigureWarm.test.ts tests/guardWarmMenu.test.ts tests/smoothBody.test.ts`.
- e2e on the laptop queue only, `E2E_GPU=1`: `e2e-guard-carry` on the pushed head (`--suites "e2e-guard-carry"`); the
  PR's affected-e2e runs by itself. No red-before-green run (prototype rule: one test set, no reruns); assert 1 guards
  against a leg that tests nothing.
- Checker (Opus): reads the diff against this brief; confirms no allocation in `drawState` / `frame` (no closures,
  arrays, template strings outside the log path), `shown` semantics untouched, the S1 legs unchanged, every existing
  log line byte-identical; reruns the checks above; posts the `checker` status.

## Doubts
1. Visible change at LOD switches: LOD0 / LOD1 compile at their first draw (only LOD2 is warmed). Today the guard
   vanishes for that compile; after this the old merged body stands in for it (old look, then the new). Better than
   invisible, but Michael may notice the swap the first time he gets within 25 m / 6 m of each base. The real fix is
   warming LOD0 / LOD1 in `guardWarm.ts` (separate brief).
2. One overlap frame on the rare hand-back: the frame the figure's effect becomes ready it draws while the merged body
   is still enabled (disabled at the next render). Spawns with a cached ready effect never overlap. Accepted.
3. The merged body's own shader may never have compiled in a figures-on page (its guards' figures came in before it
   drew), so the stand-in can take its own compile time to appear. The 5 s fault covers that on the laptop. If assert 4
   fails while 2 and 3 pass, report it; do not tune the time or rerun.
4. `e2e-guard-carry`'s quarantine owner is Night Shift | Guard AI Build (`scripts/e2e-quarantine.json`); this edits it
   from Player Build. Tell that lead; the S1 legs are unchanged.
5. During a stand-in both bodies may cast a shadow if the figure's depth shader is ready but its main shader is not
   (same pose, one darker shadow). Accepted.
6. The figure's stuck-compile clock starts at the watch's first sight of the effect, not at the compile start: a
   loading-screen warm that gave up after 20 s can stand in up to 90 s more before a "compile stuck" recompile (the
   merged body shows meanwhile). Babylon's own 120 s timeout is caught at once.
7. Base: #375 is not merged; see Base above.
