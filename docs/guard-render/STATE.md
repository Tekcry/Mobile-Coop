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
