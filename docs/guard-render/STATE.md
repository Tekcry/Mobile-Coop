# Guard render: state

## Now
S1 (merged rigidly skinned guard body) implemented and pushed on `feature/guard-render` (commits a-f below), on master
4.68.0. Unit + NullEngine tests pass; nothing measured or seen on a GPU yet. Guards (`enemyRig.ts`) and carried /
fresh bodies (`body.ts`) opt in; `?guardmerge=0` gives the old instanced parts for comparisons.

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

## Next
1. Fresh checker for S1 (session-method), then Character Build on the laptop (port 4189, GPU alone):
   `E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=sectorops,ctcourse --counts=0,12,16,24 --cells=patrol,away,alert --out=docs/guard-render/run-s1`
   and the same with the merge off (the script has no query option; `--maps` takes `<mapId>:<mode>` and appends it
   raw): `--maps='warehouseOps:sector&sectorGuards=0&guardmerge=0,ctcourse:course&guardmerge=0' --out=docs/guard-render/run-s1-off`.
   Compare render() CPU, evaluation, active meshes, GPU, frame CPU (PLAN section 5); look check screenshots (normal,
   thermal, night vision) of one guard on and off.
2. e2e on the pushed head: smoke, stealth-ai, sectorops, ctcourse, coop, netmove, anim, takedown.
3. Send CT Core the hook (item d above) for `characterRig.ts`.
4. Then re-plan after S1's numbers (PLAN section 4); S2 / S3 next.

## Open
1-5: answered (BRIEF.md M1-M6).
6. GPU share (+1.1 ms a guard) is not explained by triangles; S1's run will show whether it was the per-pass
   instance-buffer uploads.

## Done
- 2026-10-23: step-1 analysis, BRIEF / PLAN / STATE written.
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
3. The `MOVE` tables are the WIP's; its sweep script was not kept. The new harness holds them (T1 passes), but only the
   wall tables can be regenerated (`scripts/guard-head-fit.mjs wall`).
4. `WALL_*` pitch terms are the WIP's (the sweep runs at pitch 0).
5. GPU / e2e not run (laptop): e2e-stealth-ai, e2e-takedown, e2e-sectorops, e2e-enemies, e2e-coop, e2e-ctcourse.
