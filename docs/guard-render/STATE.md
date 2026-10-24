# Guard render: state

## Now: phase 2 (2026-10-24, lead Test Runner)
Michael ~13:40 chose 24-guard rendering now (ROADMAP "Now: guard-render"). Plan: `docs/guard-render/PLAN2.md`
(S8 measure, S9 cascade depth cull, S10 freeze lamp rule, S11 / S12 Player's figure and torch-cone cuts, S13 active
meshes; S14 dormancy dropped: Guard AI builds nothing, AI is 2-5% of a guard). Branch `feature/guard-render-2`
(worktree C:/NightShift/Mobile-Coop-guard-render-2, from master 6b44efb8). Next: S8a (read Player's c76cf326 G8 cull
run), S9 + S10 builders in parallel once Sector Ops confirms the freeze / world.ts handover.
- S9 built (2026-10-24): moon cascades cull casters by view depth too (shadow reach vs split + blend band,
  `sunCascadeCull.ts` `SunCascadeLists.setDepth` / `fill`, wired in `world.ts` `cascadeList`); unit tests pass. Next: GPU
  A/B (guard-cap sectorops,campusops 0 / 12 / 24 vs `?guardsun=0`), e2e smoke sectorops darkness lightbake.
- S10 built (2026-10-24, 0f010bcf): the freeze's lamp rule tests each guard's own lamp shadow volume (caster cone away
  from the lamp to its reach, none outside a spot cone) vs the frustum, then occlusion rays at the landings
  (`sectorGuardFreeze.ts` `guardFrustum` / `lampProbe`, view `occluded3`); unit tests pass. Next: GPU A/B (guard-cap
  away / patrol / alert at 24, sectorops + campusops vs `?guardfreeze=0`), e2e sectorops stealth-ai darkness, a look
  shot of an off-screen guard's lamp shadow sliding into view.

- 2026-10-24 ~14:45: S9 + S10 Opus checker PASS; its two light-parity notes applied in 9f7dddbb (moon SHADOW_DROP 6 m /
  cap 16 m; a lamp whose shadow probe finds no landing keeps the guard drawn). S8a done: Player's G8 cull run c76cf326
  (shots/g8b-c76cf326): campus 24 alert frame p95 11.9 ms with figures, maplight 23-30 draws (S12 dropped), moon CSM
  94-101 draws (S9's target). Queued: guard-cap A/B branch 9f7dddbb vs master 6b44efb8 (sectorops + campus, 0/12/24,
  patrol / away / alert; out C:/NightShift/scratch/gr2/cap-<sha>) + e2e smoke sectorops darkness lightbake stealth-ai.
  Then: look shots (cascade splits + blend band, campus roof guard, low moon, off-screen lamp shadow sliding in), PR.
  Known, older than S10: torch-atlas (charShadows / torchShadows) shadows are not seen by the freeze.
- S9b built (2026-10-24): the moon list (`world.ts` `updateSunCasters`) keeps only what Babylon draws from an entry:
  `sunCasterDrawn` (`sunCascadeCull.ts`) drops disabled (ancestors too), invisible and blocked LOD-level meshes (their
  master's entry draws the `getLOD` pick); `markSun` on `onEffectiveEnabledStateChangedObservable` refills next frame
  (as Player's `LightRig.fillCasters`). Static level list unchanged. Expected moon entries per figure guard ~5 -> 2.
  Unit tests pass. Next: rides the S9 guard-cap A/B.

- 2026-10-24 ~17:40 GPU A/B (guard-cap, branch 9f7dddbb = S9+S10 vs master 6b44efb8; docs/guard-render/run-s9s10-ab.md,
  raw C:/NightShift/scratch/gr2/cap-*): S9 WORKS - moon CSM draws at 24 alert 71.9 -> 38.3 (sectorops), 80.6 -> 48.7
  (campus); campus 24 all cells faster (alert p95 9.9 -> 9.2, patrol 9.0 -> 8.6, away 5.0 -> 4.5). REGRESSION:
  sectorops 24 alert p95 8.5 -> 11.8 (med 7.1 -> 7.6), torchshadow draws 17.9 -> 45.1; sectorops patrol p95 7.1 -> 8.3.
  Suspect S10's checker fix (a lamp with no shadow landing keeps the guard drawn: indoor low lamps -> many more guards
  drawn, so more torch-atlas casters). NEXT: A/B on 9f7dddbb with ?guardfreeze=0 and on 47041500 (S10 before the fix) for
  sectorops 24 alert only; log __sector.debug().guardFreeze counts; fix S10 (e.g. no-landing counts as seen only within
  N m of the lamp, or add a near-feet floor sample like the moon path) and re-measure. e2e gr2-e2e (smoke sectorops
  darkness lightbake stealth-ai on 9f7dddbb) queued, verdict pending. S9b (3360b85b) not yet in any A/B or checker.

- 2026-10-24 ~17:55 regression diagnosis (Opus, read-only, ~75%): NOT S10. In Sector Ops the only shadowing spots are
  the intensity-0 torch / char atlas slots, skipped at sectorGuardFreezeView.ts:348, so spotN = 0 and the S10 lamp
  path never runs; most of the 24 alert guards are on screen (no frustum freezing). Torch-atlas draws follow the AI's
  torch aim (master itself: 34.2 at 12 guards vs 17.9 at 24). Noise: the branch's 0-guard alert cell had p95 13.6 vs
  master 3.4. S9 fill costs ~0.02-0.05 ms. Queued to settle it: diag a/b/c (S10 pre-fix, guardfreeze=0, head) and
  interleaved repeats base / head / base (sectorops 0,24 alert + patrol; out C:/NightShift/scratch/gr2/rep-*). Decide on
  medians across repeats. Open (older): the freeze never sees the atlas shadow lights (view:348).

## Phase 1 (history)
## Now
**CLOSED 2026-10-23 ~17:10** (orchestrator approved: close with #225, M1 CPU overage to the polish list; perf tuning
waits for Michael's playtest, current goal). Every planned slice is on master (S1, S3a, S5, S6, S7, S4; S2 skipped:
voxel path only, and the voxel look is now retired).

**M1 result** (guard-cap on master 4.75.0 f5912402, 4189 alone, laptop GPU, Epic 1920x1080, ~15:53;
`C:/NightShift/scratch/work/guardrender-m1-f5912402/RESULTS.md`). Target: 24 facing, frame CPU p95 <= 12 ms,
GPU p95 <= 15 ms.

| Map | N | cell | frame CPU p95 | GPU p95 | draws |
| --- | --- | --- | --- | --- | --- |
| sectorops (warehouseOps) | 24 | patrol / facing | 13.9 | 8.6 | 239 |
| sectorops | 24 | alert / facing | 15.9 | 10.1 | 300 |
| ctcourse (Marlow) | 24 | patrol / facing | 12.7 | 7.1 | 167 |
| ctcourse | 24 | alert / facing | 13.2 | 7.7 | 183 |
| ctcourse | 12 (its cap, M3) | patrol / alert | 8.6 / 9.0 | 5.8 / 5.7 | 143 / 156 |
| campusOps (5504e2e3, 4.73.0) | 24 | patrol / alert | 17.8 / 19.7 | 11.4 / 11.6 | 541 / 589 |

GPU passes everywhere; frame CPU misses at 24 facing by 0.7-3.9 ms (7.7 ms on campus). Marlow at its 12-guard cap
passes. Per added guard ~0.28 ms frame CPU (patrol) / ~0.33 ms (alert). Campus 24-guard CPU is being cut by Sector Ops
(guard freeze, #226).

## Polish list (after the playtest)
- M1: frame CPU p95 at 24 facing guards (sectorops 13.9 / 15.9, Marlow 12.7 / 13.2 vs 12 ms). Biggest buckets per the
  draws-per-pass lines: sun CSM shadow casters (91 draws at 24 alert) and the TAA / gBuffer passes.

## S1 done (2026-10-23)
- (a) 63c5bdfe `src/player/smoothBodyMerge.ts` (pure) + `tests/smoothBodyMerge.test.ts`: joint-space positions,
  normals = normalize(M3 * n), colour / pattern / color2, matricesIndices / weights, `ppos` / `pnrm`, per-part ranges,
  `flashColors` / `heatPattern` / `paintPart`, `restBox`.
- (b) 2901fde1 `src/player/smoothBody.ts`: one bone per joint node (bind identity), `onBeforeComputeObservable` pose
  (no allocation), one scene observer per scene for all bodies (`markAsDirty` + sticky ragdoll check -> always
  active), fixed root-local `BoundingInfo` on both meshes (rest box + PAD 1 m sideways, 0.3 m up / down), LOD via
  `getLOD` (the low mesh is blocked as an LOD level), merged geometry cached per (joints, parts, instance values),
  parts `setEnabled(false)`. `BoundingInfo` exported from `src/core/babylon.ts`.
- (c) 00012998 `src/player/smoothBodyPlugin.ts` (priority 220, `SMOOTHBODY` when `ppos` present: vPatPos / vSurfPos
  = ppos, vSurfNrm = pnrm) on `partSkinMat` before freeze; `src/world/partLibrary.ts`: base metadata `library`,
  `low(base)`, `trackLod(hi, lo)` (setLodScale moves merged LODs). No `world.ts` hunk needed (setLodScale already
  goes through the library).
- (d) 09f329f7 characterRig hook (CT Core's file, its own commit): `src/player/characterRig.ts` line 3 (import),
  1232 (`merge?: boolean` in the opts type), 1308-1309 (comment + `else if (opts.merge ...) this.voxel =
  buildSmoothBody(...)`), 1315 (`voxel: VoxelBody | SmoothBody | null`). Constructor + field only, no per-frame code,
  nothing in 1850-2010 / 2600-2700 or `src/anim`. Diff: `git show 09f329f7 -- src/player/characterRig.ts`.
- (e) 3c559e43 `merge: true` in `src/ai/enemyRig.ts` and `src/ai/body.ts`; `guardMerge` in `src/core/flags.ts`
  (`?guardmerge=0` off; `buildSmoothBody` returns null).
- (f) ac088549 `tests/smoothBody.test.ts` (NullEngine): a grunt rig with merge, walked 20 frames, moved and turned:
  every 7th vertex of every part, both LODs, skinned = instance world position (< 1e-4 m); colours; flash; ragdoll
  re-parent -> always active; one shared observer; `guardMerge = false` -> parts. Also fixed in (f): the per-mesh
  buffers were built lo-first while `meshes` is [hi, lo] (flash would have written the wrong buffer).
- Checks run: `tsc --noEmit -p .`, eslint on every changed file, vitest single files: smoothBodyMerge, smoothBody,
  voxel, animGear, coopTorches, enemyManagerDespawn, hearing, sectorRestart (all pass). No full check, no e2e.

## S1 checker (2026-10-23 ~09:10, fresh Opus): PASS WITH NOTES
- Applied: `LIVE` entry deleted on `scene.onDisposeObservable` (an undisposed body kept a disposed scene alive).
- Known pixel difference (accepted, more correct): `lightRig.ts:456` and `world.ts:342` skip casters with
  `radiusWorld < 0.3`; that used to drop heads, hands, forearms and feet, and the merged body is over 0.3 m, so those
  now cast moon / lamp / flashlight shadows. Note it in the look check and the on / off GPU comparison.
- Later (S7): GPU buffers are per body (CACHE shares only CPU arrays); share VertexBuffers per cache entry.
- GPU run: first-draw compile of the BONES + VERTEXCOLOR + SMOOTHBODY variant may hide the first guard for a few
  frames; the box has only 0.3 m headroom (raised hands poke out).

## S7 (2026-10-23, branch `feature/guard-render-s7` off S1 d53caf0f): shared GPU buffers per cache entry
Re-planned by the job lead: S1's checker note ("GPU buffers are per body; CACHE shares only CPU arrays"). The PLAN's
merged-LOD-distance tuning is not in this slice.
- What: guards built from one `CACHE` entry (same look, build, height) now share the static GPU vertex buffers
  (position, normal, matricesIndices, matricesWeights, color2, ppos, pnrm) and the index buffer of each LOD level.
  Per guard stay: `color` (flash, lens glow), `pattern` (w = thermal heat), the skeleton / bone texture, the
  root-local `BoundingInfo` (culling), the Geometry (its own VAOs). No shader, material or plugin change, so normal /
  thermal / night vision and light parity are untouched; `?guardmerge=0` (parts) untouched (`buildSmoothBody` returns
  before any of it).
- How (`src/player/smoothBody.ts`): `STATIC` kinds (35-44); `Shared` + `SHARED` per scene per `MergedBody` (45-62,
  `sharedBufferCount` test hook); `mesh()` wraps the shared Babylon `Buffer`s in per-mesh `VertexBuffer`s with
  `takeBufferOwnership` and sets the shared index `DataBuffer` with `setIndexBuffer(..., is32Bits)` (212-226); CPU
  `_indices` restored so `getIndices()` still answers; `share()` (243-265) uploads on the first user, raises the index
  buffer's count per later user; `dispose()` (335-341) drops the entry with the last user. Disposal rides Babylon's
  own reference counts (`Geometry.setVerticesBuffer` -> `Buffer._increaseReferences`; geometry dispose ->
  `_releaseBuffer`), so the GPU buffer goes with the last mesh, whoever disposes it (also scene dispose); the scene's
  map is deleted on `scene.onDisposeObservable`. A guard of a look whose users all left uploads afresh.
  `src/core/babylon.ts:69-70`: `Buffer as GpuBuffer`, type `DataBuffer`.
- Test (`tests/smoothBody.test.ts` "guard-render S7", NullEngine): two grunts -> 2 entries (hi, lo); every static kind
  and the index buffer are the same `DataBuffer` / `Buffer` (references 2); colour / pattern buffers, skeleton,
  bounding info and geometry differ; a flash + heat on one leaves the other; dispose one -> references 1, the other
  keeps every buffer, full index count and is still in the active list after a render; dispose both -> references 0,
  `Buffer.isDisposed`, entries 0; a third guard uploads afresh; scene dispose clears the map.
- Numbers (NullEngine, grunt): hi 6250 vertices / 36900 indices, lo 2628 / 15168. Static 96 B a vertex + 4 B an
  index (Uint32 -> 32-bit index buffer): hi 748 KB + lo 313 KB = 1.06 MB shared per look; per guard left: colour +
  pattern 32 B a vertex = 284 KB. Per guard 1.34 MB -> 0.28 MB; 24 guards of one look 32.3 MB -> 7.9 MB of buffers,
  and a spawn uploads 0.28 MB instead of 1.34 MB (after the first of its look). No frame-time claim: draws, bone
  uploads and vertex fetch are unchanged; GPU not run.
- Checks: `tsc --noEmit -p .`, eslint on the changed files, vitest single files smoothBody, smoothBodyMerge, voxel,
  animGear, coopTorches, enemyManagerDespawn, sectorRestart: all pass. No full check, no e2e, no GPU run.
- Doubts: (1) `_indices` is a private Geometry field (Babylon 9.29); without it `getIndices()` would return [] (no
  game code reads it on these meshes; picking is off). (2) Not seen on a GPU: WebGL draws read `is32Bits` from the
  shared buffer (passed explicitly); WebGPU untested. (3) Sharing helps only within a look: guards of different
  defs / factions still upload their own. (4) 16-bit indices (hi < 65535 vertices) would halve the index share; not
  done (no look change, small).
- Checker: PASS WITH NOTES. Finding 4 (context restore) fixed: an `onContextRestoredObservable` observer per scene
  (removed on scene dispose) sets every live entry's shared vertex buffer references to its users (each Geometry's
  rebuild resets them to 1; each geometry rebuilds its own index buffer from `_indices`) and empties the lookup so
  later spawns upload fresh; bodies hold their `Shared` (not the cache key), so dispose never touches a newer entry.
  Leak left: users - 1 GL buffers per kind per restore (Babylon gives no handle). Test: restore path on NullEngine,
  4 disposal orders. WebGPU unverified until a GPU run (comment at the upload).

## S1 doubts (for the checker / the GPU run)
- Not rendered on a GPU yet: the plugin's shader (PBR + SURF_OBJECT + BONES + VERTEXCOLOR) compiles only in the e2e /
  GPU run; a compile error would show as missing guards in smoke.
- LOD swap: the merged body switches as one at the body's sphere centre; the instances switched part by part (parts
  ~1 m from the centre swap slightly earlier / later near 16 m x Detail).
- `setHeadVisible` is a no-op (one mesh, no head split): only the player's camera fades a head, and the player keeps
  its own figure. Pattern scale is fixed at build (a joint scaled at run time would not stretch the pattern).
- Rest box margins (1 m / 0.3 m) are a guess: a keyed pose reaching further than 1 m past the rest box (takedown
  victim, lying without a ragdoll: the root itself rotates, so `lay` is fine) could cull a frame early at the screen
  edge. Ragdolls re-parent the joints, so they go always-active.

## S6 (2026-10-23)
What: per-cascade sun / moon shadow caster lists (S6a/S6b, exact) and guards leaving the moon cascades beyond 40 m
(S6c/S6d, GUARD_SUN_REACH, 3 m hysteresis); `?guardsun=0` turns both off.
Checker: PASS WITH NOTES (light parity clean). Findings fixed here: (1) the custom cascade render list is set only under
the baked moon (Babylon re-prepares a custom list per cascade layer; without the baked moon the level is in it);
(2) reach is measured from the player (`World.frame` focus), not the orbit camera; (3) body rigs register
GUARD_SUN_REACH like a guard's corpse.
Measure at c181002e (laptop GPU, alone; `run-s6-on`, `run-s6-off`): with 24 guards alert (spread out) frame 8.4 -> 8.1 ms
on sectorops and 7.3 -> 6.5 on ctcourse; active meshes 639 -> 617 and 552 -> 503; draws 303 -> 271. Patrol / facing /
away cells within run noise (+-0.5 ms). Render CPU: no regression on these baked-moon maps. Shadow map renders unchanged.
Look change needing Michael's approval before S6d reaches master: past 40 m in moonlight a guard loses its ground shadow
(blobs are off while sun shadows are on). The measured gain is small, so the job lead may drop S6c/S6d.
MICHAEL 2026-10-23 12:15: "Ship S6 without S6d". Reverted S6d (c181002e: enemyRig reach + tests/guardSunReach.test.ts)
and fix (3) (063605ff: body.ts reach). The S6 PR ships S6a/S6b (per-cascade lists) and S6c (the reach machinery, no
caller passes a reach, so no look change). The measure above ran WITH S6d: the master gain is S6b only (smaller).
S6d stays on c181002e for a later look check (ground shadow past 40 m) if Michael wants it.

## Next
S1 is checked (PASS WITH NOTES), master merged in (4.68.0 + later), the GPU runs are in (`run-s1`, `run-s1-off`,
`run-s0-base`: 24 guards facing, sectorops frame 9.7 -> 7.1 ms), the changelog fragment (`changes/feature-guard-render.md`),
TESTING.md line and `docs/systems/world-and-characters.md` section are written.
1. DONE 2026-10-23 ~11:35: look check `look-s1/` (laptop GPU, 2198d0da, `look-s1/s1-look.mjs` + `look-shot.js`): merge on
   vs `?guardmerge=0` in normal / thermal / night vision read the same by eye (same silhouette, colours, thermal
   pattern, NV shading); no missing guard, no console errors.
2. PR to master (2026-10-23): checker PASS WITH NOTES, nothing in `src/net` / protocol / save, so it rides the next
   train on CI `check` (heavy-usage rule); e2e at 70470c30 was GREEN 14/14 (smoke stealth-ai sectorops ctcourse coop
   netmove anim takedown; 668d623d adds only the dispose cleanup), the train's full run covers the final head.
3. DONE: CT Core OK'd the characterRig hook (item d).
4. Next slices: S5 PR (stacked on S1), S3a after its fix round 2 + e2e, S6 after its fix round + e2e (S6d look change
   waits for Michael); then re-plan from PLAN section 4.

## S5 (guard anim cost cuts L1, L3-L6; L2 dropped)
- Branch feature/guard-render-s5, checker PASS WITH NOTES, CT Core OK'd. L2 dropped (guards would snap on a mocap
  setting change, ~3-5 us).
- NOT based on feature/guard-render when built: merged origin/feature/guard-render, then origin/master (no conflicts).
  The PR to master carries S1 too until PR #204 merges; retarget or wait.
- Tests after the merges: tsc clean; animSkeletonGuardIdentity, footPlanner, guardPoseGolden green (no re-capture).
- Measured: bench medians per guard ms/frame on NullEngine, L3 0.0276/0.0423/0.0366 -> 0.0280/0.0334/0.0317 (noise).
  Whole-S5 end-to-end cost on the GPU PC: measure pending.
- Changelog fragment: changes/feature-guard-render-s5.md.
- Next: PR to master (not opened yet).

## Open
1-5: answered (BRIEF.md M1-M6).
6. GPU share (+1.1 ms a guard) is not explained by triangles; S1's run will show whether it was the per-pass
   instance-buffer uploads.

## Done
- 2026-10-23 ~17:10: M1 measured (table in "Now"); job closed (rides in the voxel-retire batch PR).
- 2026-10-23: step-1 analysis, BRIEF / PLAN / STATE written.
- 2026-10-23: S1, S3a, S5, S6, S7, S4 merged (4.68.0 - 4.75.0); S4 measured (`run-s4-on|off`).
- 2026-10-23: S1 implemented (commits a-f, see "S1 done"); master 4.68.0 merged in before it.

## Resume prompt
```
You are the job lead for the Night Shift Mobile-Coop job "guard-render" (Babylon.js 9 + Havok PWA, desktop).
Worktree C:/NightShift/Mobile-Coop-guard-render, branch feature/guard-render. First: git fetch -q origin && git merge -q origin/master.
Read CLAUDE.md ("Sessions", "Hard rules", "Definition of done"), then docs/guard-render/BRIEF.md (answers M1-M6), PLAN.md and STATE.md.
Branch guard before every write:
cd /c/NightShift/Mobile-Coop-guard-render && test "$(git rev-parse --abbrev-ref HEAD)" = feature/guard-render && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-guard-render"
Assumed decision A1: the no-perf-tuning rule is lifted for guard render cost only (undo: revert the job).
S1 (the merged rigidly skinned guard body) is implemented and pushed (STATE.md "S1 done", "S1 doubts").
Do next, per STATE.md "Next": a fresh checker on S1 (docs/systems/session-method.md); ask Character Build for the S1
guard-cap run on the laptop GPU (port 4189, alone), merge on and ?guardmerge=0, and the e2e suites smoke stealth-ai
sectorops ctcourse coop netmove anim takedown on the pushed head; send CT Core the characterRig hook (STATE.md item d).
Then re-plan from the numbers (PLAN section 4). Keep gameplay off graphics state and light parity (PLAN section 2).
Update STATE.md, commit (end with "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"), push, report to the orchestrator.
```

## S3a fix round (2026-10-23, feature/guard-render-s3a)
Fresh checker verdict FIX, four findings. Commits 67560313 (guardHead + enemy + unit tests), 0c399192 (parity harness,
cases, sweep, fit script). The WIP rewrite (c8128bdb: per-direction `MOVE` tables, gait-clock bob) was kept: it compiles
and its free-movement tables pass against the new harness; only the wall tables were wrong and are refitted.
- Harness: `tests/helpers/guardHeadHarness.ts` moves the body through a `MotionDriver` as `Enemy.move` does and builds
  the `RigPose` exactly as `Enemy.frame` (gait clock, motion state, accel, stride, dash); the old test set speed along
  the facing with no driver, so strafe / backpedal / wall walks were never seen.
- Finding 1 (walking wall peek): `WALL_MOVE` / `WALL_LEAN_MOVE` refitted by `scripts/guard-head-fit.mjs wall` from
  `tests/guardHeadSweep.test.ts` (`GUARD_HEAD_SWEEP=1 GUARD_HEAD_SETTLE=2.5 GUARD_HEAD_LEN=2 GUARD_HEAD_OUT=<file>`); the
  leaning walk gets the stride's first harmonic. Cases: wall walk leaning out both sides, back to the cover point,
  side step both ways, the full peek walk cycle both sides.
- Finding 2 (strafe / backpedal): `GuardHeadIn.moveX / moveZ` (velocity in his frame) and `phase` (gait clock) fed by
  `Enemy.syncHitboxes`. Cases: strafe L / R aimed, backpedal, diagonal back, slow strafe at pitch 0.3, the patrol look
  walks L / R / back, walk / strafe / backpedal start-stop.
- Finding 3 (blind + seized): the rig shows one emote; `beginTakedown` replaces the flashbang's, so the rig shows the
  held pose only. `guardHead` now takes `poseW` (the sim copy of the rig's `emoteW`, 5 per s up / down, the last pose
  kept while it fades) and `held` wins over `blind`; `Enemy.blindPose` tracks whose emote it is. Cases: blind + seized
  (T2), blind then seize (T3), unit test.
- Finding 4 (impossible signs): high-cover lean is always away from the wall side (`coverPeek = -edge.side`,
  `coverWallSide` the side away from the edge); low cover never leans (removed); cover poses run on `usesCover` kinds
  only (grunt, sniper, officer; not the heavy or the runner).
- T3 "steady" now also waits out the driver's start / stop / turn / pivot states (a stop lasts ~1 s).

Worst parity errors (m; 3D, both yaws): T1 0.042 (aim -0.3 heavy); T1 strafe / back 0.034; T2 0.036 (held ko);
T2 blind + seized 0.008; T2 wall walk lean 0 0.041; T3 0.108 every frame, 0.039 steady; T3 strafe / walk start-stop
0.043. Written exceptions (in the test, measured worst rounded up): wall walk leaning out 0.167 (bound 0.17), peek walk
cycle 0.289 (bound 0.29, every frame and steady), backpedal start 0.127 (bound 0.13).

Open doubts (for the checker):
1. The leaning wall walk: the rig's hips sit 0.7 m out on the outer foot (`PEEK_HIP` x lean 1) and its head rides a
   10-17 cm once-a-stride sawtooth set by the foot planner, not locked to the gait clock (a per-kind phase-binned fit
   still leaves 5-9 cm). The first leaning step from rest dips up to 25 cm under the fit. The sim has no feet, so the
   head sphere (r 0.115) can sit off the drawn head for ~0.1 s at that step. Fixing it needs the rig (a smaller
   `PEEK_HIP` / lean for guards) or a sim foot model; neither is in this slice.
2. The backpedal from rest: the rig's head dips 12 cm 0.6-1.6 s in and settles by ~2.5 s (the T1 back walks use a 3 s
   settle). Not modelled.
3. (Fixed in round 2.) The `MOVE` tables were the WIP's, its sweep script not kept.
4. `WALL_*` pitch terms are the WIP's (the sweep runs at pitch 0).
5. GPU / e2e not run (laptop): e2e-stealth-ai, e2e-takedown, e2e-sectorops, e2e-enemies, e2e-coop, e2e-ctcourse.

### Fix round 2 (2026-10-23)
The fresh checker returned PASS WITH NOTES; three items and one test bound fixed. Commits ad4f6ead (emote step, walked
hostage), 5c0fa9cc (free / hostage fit modes, `MOVE` regenerated), then the steady bounds and this STATE.
- Item 1 (blocked the job PR: `MOVE` could not be regenerated): `scripts/guard-head-fit.mjs free` fits every `MOVE`
  class (AF0 / AF1 / AV0 / AV1 / DF / DV / NF0 / NF1 / NV0 / NV1) at once, one least-squares system per axis, each
  frame weighted by the stride class, dash share and crouch `guardHead` blends; `--write` replaces the block between the
  `<guard-head-fit free>` markers. The free sweep (`GUARD_HEAD_CASES=free`) now has crouch 0 / 1, all six armed kinds
  at aim 0.2 / 0.4 / 0.7 / 1 (aim 1 also at pitch -0.3 / 0.3) and the runner, 14 directions, the standing / crouched
  speed knots capped at the run speed. It runs in 8 parts (one vitest each: a single process runs out of heap).
  Regenerate (also in the `guardHead.ts` header):
  `for i in 0 1 2 3 4 5 6 7; do GUARD_HEAD_SWEEP=1 GUARD_HEAD_CASES=free GUARD_HEAD_EVERY=3 GUARD_HEAD_PART=$i/8 GUARD_HEAD_OUT=free-$i.tsv npx vitest run tests/guardHeadSweep.test.ts; done`
  then `node scripts/guard-head-fit.mjs free free-*.tsv --write`. The output is deterministic (refit = the committed
  block). The regenerated tables differ from the WIP's mostly in cells the game barely reaches (AF0 above the dash
  speed, the dash's new aim terms); fit residual p95 1-3 cm per group, worst 7.5 cm (sniper aim 0.2 near the dash).
- Item 2 (the harness re-implemented the emote logic): `GuardEmoteState` + `emoteBlind` / `emoteSeize` /
  `emoteBlindEnd` / `emoteStep` in `src/ai/guardHead.ts`, called by `Enemy` and the harness. Unit tests: blind, seize,
  release with the flash on (fails if `emoteSeize` keeps the flashbang's emote; checked by deleting the line), the
  flash end, the knockout limp. The old `this.blindPose = false` in `beginTakedown` is now `emoteSeize`.
- Item 3 (walked hostage): the held pose now also replaces the free-move side offset, and `HELD_MOVE` (fitted by
  `guard-head-fit.mjs hostage` from `GUARD_HEAD_CASES=hostage`: 8 directions, 0.15-1.6 m/s) adds the rig's own gait
  under the pose (`rp.phase` -1 when held, so the frozen motion clock is not read). Parity cases (T2): hostage walked
  1.2 and 0.6 m/s ahead, 0.6 m/s sideways (the game caps the hold at 0.7 m/s): worst 0.024 m (was 0.085-0.111).
- Peek walk cycle steady bound: T3 "steady" also waits for the driver to reach its pace (acceleration under
  0.2 m/s^2: the rig leans on `accelFwd` / `accelSide`, the sim has no term). Settled frames measured 0.050-0.087 m:
  steady bound 0.09 (was 0.29, off). Backpedal start settled 0.083-0.105 m: steady bound 0.11 (was 0.13).

Worst parity errors after round 2 (m; 3D, both yaws; every frame / steady for T3):
| Case | Worst |
| --- | --- |
| T1 idle / walk / run | 0.028 (run) |
| T1 aim, crouch | 0.042 (aim -0.3, crouch aim) |
| T1 strafe / backpedal / diag / look walks | 0.034 (look walk R) |
| T2 wall still / lean | 0.033 |
| T2 wall walk lean 0 | 0.041 |
| T2 wall walk leaning out (exception 0.17) | 0.167 |
| T2 held poses | 0.036 (ko) |
| T2 hostage walked (new) | 0.024 |
| T2 blind, blind + seized, climb | 0.033 |
| T3 crouch, lean, seize, release, strafe | 0.108 / 0.041 |
| T3 walk start-stop | 0.104 / 0.016 |
| T3 peek walk cycle (exception 0.29, steady 0.09) | 0.289 / 0.087 |
| T3 backpedal start (exception 0.13, steady 0.11) | 0.129 / 0.105 |
The refit moved some T1 cases by up to 1.2 cm (look walk back 0.014 -> 0.026, crouch walk 0.014 -> 0.016), all within
the unchanged bounds.

Follow-ups (not in this slice):
1. The peek walk cycle: the first leaning step from rest leaves the sim head up to 29 cm off the drawn head for up to
   ~0.2 s (a headshot there can miss or hit air). Needs a smaller `PEEK_HIP` / lean for guards in the rig, or a sim
   foot model.
2. The checker's unverified notes: wall walks are tested only at +-90 deg and pitch 0 (the `WALL_*` pitch terms are
   unchecked); kick / melee (`rp.kick`, `rp.melee`) are not modelled; the sim head is computed in the fixed step and
   leads the drawn (interpolated) head by up to one step.
3. Hostage walk crouched (the knockout lowering) fades `HELD_MOVE` with crouch, not fitted.

### Fix round 3 (2026-10-23)
The fresh checker's should-fix: the walked-hostage fit at 60 deg sat on the facing / velocity stride boundary
(cos 60 = 0.5000000000000001), its frames split between the classes (clamped to the 50 deg row or the 70 deg row), the
V 70 row turned to noise, residuals at dir 60 0.144-0.160 m (bound 0.08), and the head stepped ~6 cm forward as a
walked hostage's direction crossed 60 deg.
- Measured the rig across the boundary (16 directions 40-80 deg, 0.3-0.9 m/s): the rig itself steps there. It takes
  stride 'facing' when `localZ > 0.5` (`Enemy.frame`), and armed its head sits 6.7 cm further back on the facing stride
  (forward -0.075 against -0.008 m), reached in ~0.1 s (keyed walk weight tau 0.08 s, its pelvis rate 1.2 m/s); the
  runner has no step (-0.007 / -0.008). So `HELD_MOVE` keeps the class switch, on the rig's own test bit for bit
  (`heldFacing`: `sp > 0.01 && mz * (1 / sp) > 0.5`, as `localZ` is computed): a blend would be off the rig for every
  steady direction inside the band, the step only for the rig's ~0.1 s crossing. The free `MOVE` lookup keeps its
  `mz > 0.5 * sp` (refitting it needs the 8-part free sweep; it differs from the rig's test only at exactly 60 deg).
- Knots: `TH_HF` 0 / 30 / 45 / 50 / 55 / 59 (facing), `TH_HV` 61 / 75 / 90 / 120 / 150 / 180 (velocity), `SP_H`
  0.15 / 0.3 / 0.45 / 0.6 / 0.75 / 0.9 / 1.2 / 1.6. The sweep (`HOSTAGE_DIRS`, also -90) has no frame on the boundary;
  `GUARD_HEAD_LEN=3` (the dips below are irregular); `GUARD_HEAD_DIRS` / `GUARD_HEAD_SPEEDS` override it for exploring.
  The refit is deterministic (two sweeps, the same block). The script reports per direction at the hold's speeds
  (<= 0.75) apart from the faster ones (0.9-1.6, reached only in a turning hold).
- Near the boundary the facing stride slips sideways and the rig's head dips up to 11 cm below its mean for ~0.5 s at
  irregular times (the foot planner catching up: 52-60 deg at 0.45 m/s, 54-60 at 0.6, 58-60 at 0.75, also 45 deg at
  0.3-0.45 and straight back at 0.3); the fit gives the mean, the dip stays as residual.
- Harness: `heldMove.turn` (`HeldTurn`: rate, optional from / to): the operator walks along her facing and turns, the
  hostage placed `GRAB.hold` ahead / `GRAB.side` to her side and facing her way (`TakedownController` holding); a turn
  with an end marks the T3 change.
- Parity cases (new): diag 45 and 60 at 0.6 m/s, turning arcs at the cap 0.75 m/s (1.5 rad/s both ways; 3 rad/s both
  ways, exception), the 180 at her free-movement turn cap (`CT.turnRate` 7.85 rad/s, both ways, T3 exception). The 1.2 m/s
  case is now labelled a bound check (the hold cap is `GRAB.speedCap` 0.75 m/s, a straight 1.2 m/s walk cannot happen).
- `HELD_MOVE` doc: the boundary choice, the dip band, the aim follow-up below, and the release transient (`poseW`
  fades over 0.2 s with the last held pose kept, `HELD_MOVE` and the `sxm` removal scaled by it).

Fit residuals per direction, hold speeds 0.15-0.75 m/s (m, worst / p95 over grunt, runner, heavy):
| Dir | Worst | p95 |
| --- | --- | --- |
| 0 | 0.017 | 0.013 |
| 30 | 0.017 | 0.013 |
| 45 | 0.068-0.097 | 0.029-0.052 |
| 50 | 0.075-0.094 | 0.022-0.040 |
| 55 | 0.072-0.087 | 0.053-0.075 |
| 59 | 0.068-0.088 | 0.058-0.077 |
| 61 | 0.019-0.043 | 0.014-0.029 |
| 75 | 0.015-0.038 | 0.013-0.024 |
| 90 / -90 | 0.015-0.072 | 0.011-0.029 |
| 120 | 0.015-0.038 | 0.012-0.023 |
| 150 | 0.040-0.049 | 0.017-0.031 |
| 180 | 0.096-0.106 | 0.047-0.051 |
At 0.9-1.6 m/s (a turning hold only): worst 0.12-0.15 at 50-59 deg (p95 0.07-0.10), 0.084 at 0 (heavy), else <= 0.11.
Round 2 at dir 60: 0.144-0.160 (p95 0.067-0.092).

Parity worst errors, hostage cases (m; 3D, both yaws, grunt / runner / heavy):
| Case | Worst |
| --- | --- |
| T2 held hostage (still) | 0.012 |
| T2 walked 1.2 (bound check, over the cap) | 0.016 |
| T2 walked 0.6 / side 0.6 | 0.013 / 0.025 |
| T2 walked diag 45 0.6 (new) | 0.037 |
| T2 walked diag 60 0.6 (new; the class differs by root yaw, the sim follows it) | 0.074 |
| T2 turning arc 1.5 rad/s R / L (new) | 0.015 / 0.020 |
| T2 turning arc 3 rad/s R / L (new, exception 0.15) | 0.145 / 0.097 |
| T3 180 at the turn cap R (new, exception 0.26, steady 0.12) | 0.255 / steady 0.026 |
| T3 180 at the turn cap L (new, exception 0.26, steady 0.12) | 0.153 / steady 0.113 |
Everything else unchanged; the whole parity file passes (165 tests).

Follow-ups (not in this slice):
4. A fast turning hold: the rig's body lags its root (up to 14 cm sideways, 18 cm forward in the 180 at the cap: he
   swings round her at 2.4-2.9 m/s for 0.4 s) and dips after a left turn (10 cm, ~0.6 s); the 3 rad/s arc sits in the
   slip band at 1.1-1.4 m/s. The sim has no yaw-rate term. Needs a yaw-rate input to `guardHead` or a slower hostage
   swing in the hold.
5. The held stride class also follows the guard's `aimWeight()` in the rig (`rp.stride` is 'velocity' at 0.5 or more,
   e.g. a guard seized while investigating, 0.7); the sim gets aim 0 when held and assumes 'facing' under 60 deg: up to
   ~7 cm forward off for such a guard. Needs the held guard's stride aim in `GuardHeadIn` (one field from
   `Enemy.syncHitboxes`).
6. The facing stride's sideways-slip dip near 45-60 deg (above) is the rig's foot planner; a fix belongs in the rig.

## S4 (2026-10-23, feature/guard-render-s4, cut from S3a 220d3cf7)
Anim tiers for guards (PLAN S4). Commits 34ecc539 (pure rules + tests), 6cd4162f (scene side + flag), b5a374d3
(characterRig hook), 077212ff (enemy hook).
- Rules (`src/ai/animTier.ts`, pure, first match wins): `?animtier=0`, pinned (`taken`: takedown / held / hostage;
  `rig.emote !== null`: flashbang blind, close-quarters poses; `climbing`) or within 4 m (horizontal) of any player
  (`ctx.players()`, so remote players count on the host): every frame. Off-screen (a render happened since the last
  update and the merged body was drawn in no local camera view): every 4th frame. Beyond `ANIM_TIER_FAR` 22 m
  (= `ANIM_LOD_DISTANCE`, asserted; never scaled by Detail) from the nearest local camera (`activeCameras`, else
  `activeCamera`): every 2nd. Else every frame. Stagger: solve when `(tick + slot) % period == 0`, slot = the guard's
  spawn number (`Enemy.num`), tick per guard; the first update always solves; the skipped time is carried into the
  next solve (`AnimTierState.carry`, the rig's `lodDt` stays 0 for guards). The weapon glide runs every frame (the
  rig's `stepGlide` before the skip).
- Scene side (`src/ai/animTierView.ts`): one `onAfterActiveMeshesEvaluationObservable` observer per scene marks a
  tracked merged mesh drawn when `mesh._renderId === scene.getRenderId()` right after a camera's active-mesh
  evaluation (frustum, layer mask, visibility and LOD-null all already applied; shadow / RTT passes do not fire it).
  Disposed meshes are pruned there. No merged body (`?guardmerge=0`, voxel path not applicable: always active) =
  never off-screen. Headless steps (`stepHeadless`, no render between updates) count as seen, so e2e that step
  without rendering keep full rate for near guards.
- Files and exact lines for the owners (line numbers on 077212ff):
  - Player Build, `src/player/characterRig.ts` (b5a374d3): 1699-1702 (doc + `animate(dt, s, solveDt?: number)`),
    1706-1707 (`solveDt < 0` returns after `stepGlide`; else `dt = solveDt`), 1709 (`const cam = solveDt ===
    undefined ? ... : null`: the camera LOD only without a hint). Callers without the hint (player, puppets,
    dummies, studio) are unchanged. Diff: `git show b5a374d3`.
  - Guard AI Build, `src/ai/enemy.ts` (077212ff): 46 (import), 217-218 (field), 358-359 (constructed after the rig,
    before the constructor's `frame(0, 1)`), 2089-2090 (`rig.animate(dt, rp, this.animTier.dt(...))`). Diff:
    `git show 077212ff`.
  - `src/core/flags.ts`: `animTier` (interface + `params.get('animtier') !== '0'`), next to `guardMerge`.
- Co-op / gameplay readers of the render pose (verified by grep of every `.rig.` reader): on the host and solo,
  none for an `Enemy` (the head hit volume is the S3a sim head; perception eye from the sim; takedowns read the
  player's rig and the enemy's sim pos; the death ragdoll / carried body starts from the last solved pose, visual
  only). Not a blocker for S4, but listed: `src/net/enemyPuppet.ts:312-314` (the client's guard puppet) still
  copies its hitbox head from the rendered rig, under the old Detail-scaled camera LOD. S4 does not tier puppets.
- Tests: `tests/animTier.test.ts` (14: every rule, unknown visibility, stagger 4 / 8 guards at period 4 and 6 at
  period 2 = even per frame, carry with none lost, drop to period 1). Passed single files: animTier, animGuard,
  animSkeletonGuardIdentity, footPlanner, smoothBody, enemyManagerDespawn, hearing, sectorRestart, guardHead;
  `tsc --noEmit -p .` and eslint on the changed files clean. No full check, no e2e, nothing measured.
- e2e a run should cover: smoke, stealth-ai, takedown, enemies, sectorops, ctcourse, coop, netmove, anim; plus the
  S0 guard-cap run (PLAN section 5) with and without `?animtier=0` for `ai.anim` and frame CPU (away cell especially).

S4 doubts (for the checker):
1. `mesh._renderId` is Babylon-internal (typed public in the d.ts). If Babylon changes when it sets it, guards read
   as always off-screen (4th-frame animation on screen, visible as choppy) or never. A GPU / e2e look is the check.
2. A guard that steps into view is drawn once with a pose up to 3 frames old (its first visible frame); then full
   rate. The S1 rest box + 1 m pad makes the mesh "drawn" slightly before it is really on screen, which helps.
3. Remote views (camera gadgets) swap `activeCamera`; if any view renders through a render target with its own
   camera, guards seen only there count as off-screen (not found by grep: `activeCameras` / RTT users are TAAU,
   night bloom, baked lamps only).
4. Stagger uses a per-guard tick from spawn, so guards spawned on different frames mix their phases; the slot keeps
   a batch spawn even, a mixed population is spread but not exactly even.
5. Pinned list choices beyond the brief: climbing (a traverse clip). Near-player radius 4 m is a guess.

Checker (Opus, fresh, 2026-10-23): PASS WITH NOTES. Carry exact, glide every frame, pinned / near-player full rate,
no gameplay reader of the stale pose, the off-screen test right in Babylon 9 (shadow / RTT passes cannot match).
Polish list: (1) animTierView.ts:39 - with freezeActiveMeshes / snapshot rendering the observer never fires and every
guard reads off-screen: treat scene._activeMeshesFrozen as seen if either is ever turned on; (2) enemy.ts:2090 - rp.kick
decays every frame, recoil pulses on skipped frames are lost (off-screen / far only); (3) enemyPuppet.ts:312-314
(pre-existing, src/net): the client puppet's hit head is the rendered rig, the host's is the S3a sim head; build the
puppet hit head from guardHead later.
e2e GREEN on adcd5fa7 (laptop GPU, JOBS=3, wall 330 s): smoke, stealth-ai, takedown, enemies, sectorops:1-5,
ctcourse:1-3, coop, netmove, anim (15/15). Measure (guard-cap, ?animtier=0 vs on, 4189 alone): done, see "S4 measure".

## S4 measure (2026-10-23 ~14:00-14:26, laptop 4090, Epic 1920x1080, uncapped, 4189, head 5809afe6)
`run-s4-on` (default) vs `run-s4-off` (`?animtier=0`), counts 0 / 12 / 24, same build, 20 min apart. Frame ms med,
24 guards (12 in sight on Sector Ops):

| Cell | Sector Ops on / off | Marlow on / off |
| --- | --- | --- |
| patrol/facing | 9.4 / 10.7 | 9.5 / 9.3 |
| patrol/away | 7.7 / 8.4 | 5.2 / 7.3 |
| alert/facing | 13.0 / 12.3 | 9.6 / 11.5 |

- `ai.anim` per sim step at 24, Sector Ops patrol/facing: 0.838 on vs 1.295 off (-35%); alert 1.224 vs 1.29.
  Marlow facing 1.096 vs 0.944 (Marlow's guards stand within the 4 m near-player radius more often; noise-level).
- So S4 gives ~-0.7 to -2 ms where guards are away or far (as PLAN S4 said) and ~0 facing. The +0.7 on Sector Ops
  alert is inside the run-to-run spread under load.
- 0-guard base unchanged (sectorops 3.4 vs 3.2, ctcourse 2.8 vs 2.5).
- Not a code regression: S4's 24-guard numbers are above S1's run (7.1 ms), so a 3-build A/B (sectorops, 0 and 24,
  patrol only, back to back, ~14:28-14:33) ran 668d623d (S1) 11.0 ms, b1e1809b (master 4.74.0) 10.8 ms: the same
  build is ~4 ms slower than at ~10:07, so the laptop's shared load, not the code, moved. (5809afe6's point in that
  A/B overlapped another run's build: void.) Logs: C:/NightShift/scratch/runs/guardrender-regr-*.
