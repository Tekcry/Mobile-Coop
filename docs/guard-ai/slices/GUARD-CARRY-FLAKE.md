# e2e-guard-carry flake (s23-regress, a87ef34c)

Verdict: **test bug** (a race between the forced fault's cut poll and the recovery). No game bug: the body recovered,
GPU skinned and drawn, in 1.2 s. The same assert fix is already on master (bdfe97eef, carry-fix, train 32/33); the
s23 / s24 line was cut before it, so it still carried the old assert.

## Evidence
Log: `C:/NightShift/scratch/laptop-queue/runs/20261023T090122-night-shift-guard-ai-a87ef34c-c9e9/4189.log`
(laptop queue, port 4189, beside a second run on 4192: `log.txt` 09:40:12 "pr on 4189" and "pr on 4192").

Failing run (4189.log:510-534):
```
grunt calm after the forced compile timeout: 85 frames / 1.2 s rendered until the check
  e10-smooth: ready true/true gpuSkin true infl 1 cpuFallback false | ...
ok - ... e10-smooth material ready for its mesh (no compile error recorded)
ok - ... grunt's body is among the camera's active meshes
forced fault: injected into 1 body effect(s) [NUM_BONE_INFLUENCERS 1], 0 poll timeout(s), 1 dropped by the recovery; recovery logged "recompiling": yes (1)
Error: ASSERT: the forced fault fired (1 effects faulted, 0 timeouts): else Babylon's compile path changed ...
    at file:///C:/NightShift/Mobile-Coop-testrun-4189/scripts/e2e-guard-carry.mjs:299:5
    [warning] smooth body e10-smooth: body shader program disposed, recompiling (1/3)
```
Solo rerun, same commit (`rerun-e2e_guard_carry.log:10-27`): 420 frames / 4.2 s, `1 poll timeout(s), 1 dropped`,
`body shader compile timed out, recompiling (1/3)`, all ok (body left CPU skinned, the NOTE lines: carry-fix2's gap).

## Cause
The forced pass faults the grunt's first body effect: its program never reports compiled, and a copy of Babylon's poll
(`setInterval` 16 ms, `left -= 16` from `FAULT_MS` 1000, so ~63 ticks) calls `_processCompilationErrors` with the
timeout error. The fix (`src/player/bodyEffectRecovery.ts:43-56`, `stuckReason`) recompiles an unready body effect
on whichever comes first: "compile timed out", "compile failed", or "program disposed" (`pc._isDisposed`).

Under load the faulted program's pipeline context was flagged disposed before the poll's 63 ticks ran (ticks are
starved while the page renders long frames; two suites shared the laptop GPU). Paths that set `_isDisposed` on an
in-flight context: Babylon's name-keyed `resetCachedPipeline` (`node_modules/@babylonjs/core/Materials/effect.functions.js:23`,
disposes whatever pipeline is cached under the effect key, not the one passed) and the gl-warning-fix
`_deletePipelineContext` patch (`src/core/babylon.ts:184-201`, flags a still-linking context disposed at once). The
recovery then dropped the effect as "program disposed" (1 dropped, 1 "recompiling" line), the guard drew at once, and
the cut poll never reached its timeout (it stops when the effect is disposed). The assert required `timeouts >= 1`, so
it failed although the fault fired and the fix worked. Which side wins depends on load, so the result was random.

The game behaved as designed: an effect whose program is disposed under it can never become ready, and the recovery
recompiles it. Nothing to change in `src/`.

## Change (`scripts/e2e-guard-carry.mjs`)
- The "fault fired" assert accepts either terminal state of the faulted effect: Babylon's cut poll timed out, or the
  recovery dropped it (`f.timeouts >= 1 || f.disposed >= 1`). The line is word for word master's (bdfe97eef), so the
  merge with master is clean (checked with `git merge-file`: 0 conflicts). The outcome no longer depends on which side
  of the race wins, so wall-clock load no longer matters to it. The check's own wait was already a condition wait
  (until the body is ready and drawn, at least 200 frames, at most 30 s); the solo rerun needed 4.2 s.
- Diagnostic only: each faulted pipeline context gets a setter on `_isDisposed` that records a few stack frames of the
  first calls that flag it disposed, printed as `forced fault: faulted program flagged disposed by: ...`. The next
  occurrence then names the exact caller (the recovery's own drop shows up there too).
- `node --check` passes. Not run locally (the laptop Test Runner queue runs suites).

## Why it still fails on the original bug
The bug: a body compile times out and is never recovered (master 4f6db420 before the fix).
- Without the recovery the faulted effect is never dropped by it, but the cut poll always times out in the end (it
  only stops on ready or disposed, and the faulted context never reports ready), so `timeouts >= 1` holds and the assert
  passes; the body never becomes ready, `check` fails ("material ready for its mesh (Error: Operation timed out ...)")
  and the pass rethrows that failure: suite FAIL.
- If something other than the recovery disposed the faulted effect and a fresh effect then drew the body, the next
  assert still needs the recovery's "recompiling" log line (`recompiled.length > 0 && f.disposed >= 1`): suite FAIL.
- If the fault never takes hold (Babylon's compile path changed), `faulted` is 0: suite FAIL as before.

## Follow-up
None needed on this branch once it merges master (which already holds bdfe97eef and carry-fix2's GPU-skin assert).
If the diagnostic shows a caller other than the recovery or `src/core/babylon.ts`, log it in the guard-ai STATE.
