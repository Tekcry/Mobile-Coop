# studio-pairs: AUDIT fix 12, GPU round (on 8091de94)

Evidence: the laptop's GPU sheets on `origin/shots/studio-pairs-8091de94` (`docs/studio-pairs/shots-8091de94/`), run with
`scripts/anim-natural/audit.mjs` from anim-natural 42cdfba6 (not tracked on this branch). CPU checks only here.

## 1. Hold pairs: the guard still white, skin glowing

Root cause: the audit script, not the studio, puts the shared part bases back into the stage lights' lists, and the
studio never took them out again.
- `audit.mjs:625-647` (42cdfba6) wraps `studio.lightsFrame` for the team-pair rows and pushes, for every puppet mesh,
  `ms.sourceMesh ?? ms` into each stage light's `includedOnlyMeshes`. The puppets' rig parts are hidden part instances,
  so this pushes the shared part bases (`PartLibrary`): every part instance in the scene is then lit by the four stage
  lights (at the pair rows' x2). It also raises the shared `partMat`'s `maxSimultaneousLights`.
- The team-pair rows run before the hold rows (`audit.mjs` STUDIO list: boost ... revive, then hold_idle ...). In a hold
  row the wrapper returns early, but `StudioStage.stageFrame` (`src/game/studioStage.ts:345-356` at 8091de94) only
  rewrote the lists when Wren's mesh count changed, so the bases stayed. The hold guard (parts, light grey cloth, skin)
  and Wren's slung rifle (parts) read white; skin over 1.0 blooms orange.
- Frame 0.00 s of hold_idle is not "darker": the guard's body is not drawn at all there (only the helmet): the guard is
  built at that row, and its parts' material recompiles for the extra lights first.
- Why the CPU run looked fine: it did not run the team pairs before the holds in one page (order-dependent, not a GPU
  shader path). A frozen material also keeps a shader built with the extra light slots after a list shrinks
  (`PBRBaseMaterial.isReadyForSubMesh` returns early when frozen), so removing the bases alone would not be enough.

Fix (`src/anim/studio.ts` `stageLightKeep`, `src/game/studioStage.ts` `stageFrame` / `unlight`):
- On the once-a-second check, any shared part base (a mesh with instances) or instance found in a stage light's list is
  dropped; anything else pushed (a puppet's figure) stays, so the audit's pair lighting still works.
- The meshes that leave a list have their frozen material frozen again (`freeze()` marks it dirty), so the next frame
  recompiles it for the lights it still takes. Also done when her own list is rewritten.

Still worth fixing in the audit (anim-natural owns it): push `ms` only when `!ms.sourceMesh` (line 642; same pattern in
the key light at 848). With the studio fix the hold rows are clean either way.

## 2. Pair puppets: `1@8.x`, "LOD1"

Root cause: a misread label, not a failed hold. `figure.current` (audit.mjs:727) is the LOD index into `LOD_NAMES =
['hero', 'lod0', 'lod1', 'lod2']` (`src/operators/runtime/manifest.ts:10-17`): 1 is LOD0. Every boost tile reads 1, so
the hold of 8091de94 works (no swap through the loop). The puppets are Wren's own figure (same library, materials and
LOD0 file as the player); they carry no gun (`operatorRig` builds none; her guns are the player's weapon slots), and
the audit lights them with the stage lights at x2 from 8 m, which washes the suit out.

Fix: `__studioStage.puppets()` also returns `lodName` (`'lod0'`), so a label can print the name. Suggest the audit label
use it.

## Tests

`tests/animStudioPairsView.test.ts`: `stageLightKeep` drops a pushed base and instance, keeps her figure and a puppet
figure; LOD index 1 is `lod0`. `npx tsc --noEmit -p .` clean, the file's 5 tests pass, eslint clean on touched files.
No e2e covers `puppets()` (`scripts/e2e-studio.mjs` has no LOD assertion).

## What the GPU sheets must show (same command, same audit.mjs)

- pair-hold_idle / _back / _choke / _knife: the guard in grey cloth with normal skin (no white body, no orange glow),
  Wren's slung rifle dark, in every frame. Frame 0.00 s of the first hold row may still miss the guard's body (its
  first compile); from 0.33 s it is drawn with room light.
- pair-boost (and the other team pairs): labels stay `1@...` on both puppets every tile (1 = LOD0); they look as before.

## GPU rerun on 63ec33ec (laptop, 2026-10-22 ~18:55; shots/studio-pairs-63ec33ec 00d66c1d)
Verdict: fixed. Hold rows: the guard in grey-blue cloth with normal skin, Wren's rifle dark in every frame; team pairs
at LOD0 (`1@`), no puppet vanishes. Polish list (cosmetic, not blocking):
- A thin orange rim on the guard's hands / forearm edges in some frames (hold_idle 2.00-3.67 s, hold_choke 0.46 s,
  4.13-4.58 s): bloom on skin under the audit's x2 pair stage light.
- The first hold row on a fresh page draws the guard's body only from ~2.0 s (helmet from 1.0 s): his part shaders
  compile on first use. The audit should wait on `__studioStage.puppets()` readiness before its first tile; a warm-up
  compile of the guard parts when the studio opens would hide it in play.
