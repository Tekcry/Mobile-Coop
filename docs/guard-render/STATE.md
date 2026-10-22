# Guard render: state

## Now
Step 1 (analysis) done: `BRIEF.md` (ask, goal, limits, A1) and `PLAN.md` (what a guard is, constraints, slices S0-S7
with expected ms, files, owners, measurement). No code changed. Branch `feature/guard-render`, on master d140e097
(4.66.0).

## S1 WIP (2026-10-23, stopped on the usage limit)
Done: design only; no code written, characterRig.ts NOT touched (no hook yet, no line range). Master was still
d140e097 at the stop (PR #182 / 4.67.0 open): merge origin/master before touching characterRig.ts.
Not done: A2-A7 in BRIEF.md (orchestrator decisions 1-6), every S1 commit (a)-(f), build, tests.
Design settled (Babylon 9.29 source read):
- Pure `src/player/smoothBodyMerge.ts`: per part the unit mesh (pos, nrm, idx), its 16-float part->joint matrix
  (Babylon row-vector, built on the Babylon side with Matrix.Compose so Euler order matches), bone index, color /
  pattern / color2, patScale (row lengths of the instance world matrix). Out: joint-space positions, normals =
  normalize(M3 * n) (NOT inverse-transpose: instances render without NONUNIFORMSCALING, so this matches today's
  pixels), colours, pattern, color2, matricesIndices / weights (1.0), `ppos` = unit pos * patScale, `pnrm` = unit
  normal, per-part vertex ranges; flash / heat / part-paint helpers; rest box + margins. Vitest in tests/.
- Bones: one per joint node a part hangs on, bind = identity, local = node world * root inverse (VoxelBody.pose
  pattern, no allocation) in skeleton.onBeforeComputeObservable. Shadow RTTs call scene._prepareSkeleton
  (objectRenderer.js:769), so camera-culled guards still cast posed shadows.
- One shared scene observer for all smooth bodies: bones[0].markAsDirty() + ragdoll check (any bone node's parent
  changed -> alwaysSelectAsActiveMesh = true, sticky). Fixed root-local BoundingInfo on both LOD meshes (add
  BoundingInfo export to src/core/babylon.ts). LOD mesh is skipped by the scene (isBlocked) and picked via getLOD.
- Parity: PatternPlugin / SurfacePlugin use `position * scale(finalWorld)` and the raw `normal`, which differ on a
  skinned merged mesh: a new tiny plugin (priority > 200, define when `ppos` present) on partSkinMat overwrites
  vPatPos / vSurfPos = ppos and vSurfNrm = pnrm. Registered in partLibrary.ts before freeze. partLibrary also: base
  metadata gains `library`, `low(base)` for the 16 m LOD geometry, `trackLod(hi, lo)` so setLodScale moves merged LODs.
- characterRig hook (separate commit, ~4 lines, constructor + field only, nowhere near 1850-2010 / 2600-2700):
  import, `merge?: boolean` in the opts type, `else if (opts.merge && this.style === 'detailed' && skin) this.voxel =
  buildSmoothBody(...)` after the VoxelBody line, `voxel: VoxelBody | SmoothBody | null`. SmoothBody implements
  meshes / setHeadVisible / setPartColor / setFlash / setHeat / dispose, so existing routing works; no per-frame call.
- Opt-in: `merge: true` inside the existing CharacterRig opts in enemyRig.ts and body.ts (one line each).
  `?guardmerge=0` via a `guardMerge` flag in src/core/flags.ts, read by buildSmoothBody (returns null when off).
- Integration test possible under NullEngine (tests/voxel.test.ts pattern): build a guard rig with merge, pose it,
  compare skinned vertex world positions with the parts' instance world positions.
- Env: the worktree has no node_modules; a junction to another worktree's node_modules was refused by auto mode.
  `npm ci` (or a permitted node_modules) is needed before build / vitest.

## Next
0. S1: implement the design above (commits a-f per the orchestrator's brief), after merging origin/master.
1. Orchestrator: answer the open questions below (or log assumed decisions A2+), and coordinate owners: CT Core for
   S1 / S2 / S5 (rig, `src/player/characterRig.ts`, new `src/player/smoothBody*.ts`, `src/voxel/voxelBody.ts`,
   `src/anim/*`), Guard AI Build for the one-line opt-ins and S3 (`src/ai/enemyRig.ts`, `src/ai/body.ts`,
   `src/ai/enemy.ts`, `src/ai/hitboxes.ts`), the World owner for `src/world/partLibrary.ts` / `src/world/world.ts`.
2. S0: bring `scripts/guard-cap.mjs` from `origin/feature/guard-cap` and take a 4.66.0 baseline on the laptop GPU.
3. S1: the merged rigidly skinned guard body (expected -28 to -32 ms frame CPU at 24 facing), measured as S0.

## Open
1. "Playable" at 24: assumed 60 Hz at Epic 1920x1080 (frame CPU p95 <= 12 ms, GPU p95 <= 15 ms) on the laptop; the
   performance.md Epic line (main p95 5.5 ms, 10 guards) cannot hold at 24. Michael's number?
2. The head hit volume reads the rig pose (`src/ai/enemy.ts:1815-1816` -> `hitboxes.sync`), and today's anim LOD
   scales with the Detail setting (`characterRig.ts:370-372`): a latent graphics-to-gameplay leak. Fix by a sim-side
   head (S3a) or fixed tiers + staleness cap (S3b)? Guard AI Build + CT Core to agree.
3. Marlow Yard's live cap is `MAX_ALIVE = 12` (`src/ai/enemyManager.ts:26`); "with headroom" at 24 means raising it
   for ctcourse, or headroom at 12?
4. `guard-cap.mjs` is not on master: merge guard-cap first, or copy the script into this job?
5. Owner of `src/world/partLibrary.ts` and `src/world/world.ts` (S1, S6, S7).
6. GPU share (+1.1 ms a guard) is not explained by triangles; S1's run will show whether it was the per-pass
   instance-buffer uploads.

## Done
- 2026-10-23: step-1 analysis, BRIEF / PLAN / STATE written.

## Resume prompt
```
You are the job lead for the Night Shift Mobile-Coop job "guard-render" (Babylon.js 9 + Havok PWA, desktop).
Worktree C:/NightShift/Mobile-Coop-guard-render, branch feature/guard-render. First: git fetch -q origin && git merge -q --ff-only origin/master.
Read CLAUDE.md ("Sessions", "Hard rules", "Definition of done"), then docs/guard-render/BRIEF.md, PLAN.md and STATE.md.
Branch guard before every write:
cd /c/NightShift/Mobile-Coop-guard-render && test "$(git rev-parse --abbrev-ref HEAD)" = feature/guard-render && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-guard-render"
Assumed decision A1: the no-perf-tuning rule is lifted for guard render cost only (undo: revert the job).
Do next, per STATE.md "Next": check the open questions' answers (orchestrator / docs/guard-render/BRIEF.md M-answers), do S0
(bring scripts/guard-cap.mjs from origin/feature/guard-cap; request the 4.66.0 baseline run on the laptop GPU from
Character Build: E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=sectorops,ctcourse --counts=0,12,16,24
--cells=patrol,away,alert --out=docs/guard-render/run-s0, alone), then S1 (the merged rigidly skinned guard body) with
an implementer and a fresh checker per docs/systems/session-method.md. Coordinate files with CT Core (rig / anim) and
Guard AI Build (src/ai) before editing theirs. Keep gameplay off graphics state and light parity (PLAN section 2).
Update STATE.md, commit (end with "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"), push, report to the orchestrator.
```
