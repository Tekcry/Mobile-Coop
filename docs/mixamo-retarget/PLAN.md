# mixamo-retarget - plan
Owner: Player Build. Status: current (2026-10-25). Brief: `BRIEF.md` (Michael's words, A1-A11). Base: origin/master
b81c4945b.

## What exists (the CMU path, reused)
- Offline, no Blender: `scripts/mocap/asfamc.mjs` (`loadTake`: ASF/AMC -> per-bone world positions and rest-relative
  world rotations in the game frame, 120 fps, `selfCheck`), `gait.mjs` (contacts, slide, heading), `retarget.mjs`
  (`MAP` Wren joint -> CMU bone `:26`, `wrenRig` `:34` from `scripts/operators/export-joints.mjs`, `retargetTake` `:112`
  rest correction by shortest arc + leg-length scale, `buildSlot` `:338`: segment, 60 fps resample, root extraction,
  loop seam, foot de-slide, strike / toe-off events), `emit.mjs` (`emitCycle` `:209`, `emitOneShot` `:314`,
  `moduleSource` `:383`: the keyed TS module), `sheets.mjs` (stick-figure SVG sheets), `m3.mjs` (a second batch driver).
- Format: `docs/mocap-trial/CLIP-FORMAT.md` (`src/anim/keyed.ts` `KeyedClipDef` `:43`): 1.75 m body frame, `pel`, `q`
  (pelvis, spine, chest, neck), `arm` points, optional `head`, `clav`, `fing`, `fore`, `feet` + `stride` (clip feet);
  cycles phase-warped to left strike 0 / right 0.5; one-shots by progress; no root motion in the clip (the game moves
  the root).
- Runtime: `src/anim/mocap.ts` (`LocoClipSet` `:127`, `MOCAP_SET` `:176`, the "Mocap locomotion" switch `LOCO`); the
  graph's keyed reads (`animGraph.ts:2141` idle, `:2221` crouch, `:2357` speed set); traversal clips are `makeClip`
  channel clips in `src/anim/clips/traverse.ts`, picked from `TRAVERSE_CLIP` (`animGraph.ts:680`, `:1258`).
- Labels: a clip named `mocap_*` reads as "motion-capture" in the tuner's Now playing line (`nowPlaying.ts:150`, `:176`);
  the tuner tunes a capture through Body > Joints, Hands & feet and Limb reach (`tunerReach.ts:55` `KEYS_MOCAP_NOTE`);
  there is no per-clip source field today. The Anim Studio lists the keyed clips (`studio.ts:154-198`), not the
  captures.
- Guards: `keyedOk` off (`characterRig.ts:1841`), pinned by `tests/mocapGuards.test.ts`.

## Clip map (CLIP-LIST.md -> what it replaces, owner of the hook)
| Clip (slug) | Output | Replaces (A8: only if it measures as well or better) | Slice |
| --- | --- | --- | --- |
| hanging_idle | channel clip | `HANG` (traverse.ts:23), hands stay on the grips by the rig's IK | I2 |
| braced_hang_shimmy | channel clip, cycle on `traverseT` | the ledge shimmy (HANG over the cadence) | I2 |
| freehang_climb | channel clip, progress | `CLIMB_UP` (traverse.ts:366) from a free hang | I2 |
| braced_hang_to_crouch | channel clip, progress | `CLIMB_UP` crouch variant (`CLIMB_UP_CROUCH_K` :365) | I2 |
| climbing_ladder | channel clip, cycle on rung cadence | `CLIMB` (traverse.ts:57) | I2 |
| crawling | channel clip, cycle | `CRAWL` (traverse.ts:122); also coop-kit K1's `crawlUnder` | I2 / hand-off |
| crouch_to_stand, stand_to_crouch | keyed one-shot | the procedural stance change (min 0.3 / 0.25 s, bible 5.12.2 #6) | I3 |
| crouched_walking | keyed cycle + feet | `MOCAP_CROUCH_WALK` (CMU 136_09) only if better; else Studio only | I1 |
| standing_idle | keyed cycle | `KEYED_IDLE` (Wren); guards later (G1) | I1 / G1 |
| pulling, lifting | keyed one-shots | team pull (`pullHaul`) / shutter lift (`shutterLift`) placeholders | hand-off |
| carry, kneel_down | keyed cycle / one-shot | the body carry walk, J19's put-down (R11) | hand-off |
| punch | keyed one-shot | the knock-out strike (`strikeBody.ts`, J19 S1) | hand-off |
Files may land with other names: M1 slugs whatever is in the folder and M3's recipe maps slugs to rows by title words.

## Slices
Model per RULES: Opus for anim / engine code and the pipeline maths; Sonnet only from strict Opus briefs (data,
tests, credits). Sizes are changed lines. Every slice: branch guard, path-limited commits, `npm run typecheck:fast` +
`npx vitest run <its files>`, fresh checker. Blender runs (M1 run step only) wait for the orchestrator to lift the
desktop CPU cap.

**M1 FBX dump (Opus, ~450).** `scripts/mocap/py/mixamo_dump.py` (headless Blender: factory startup, import each FBX
with the FBX importer, armature only; per frame the world head / tail and the rest-relative world rotation of every
pose bone (`pose_bone.matrix @ bone.matrix_local.inverted()`, armature world applied), the rest pose's heads / tails,
the scene fps and frame range) and `scripts/mocap/mixamo.mjs` (driver: lists `C:/NightShift/scratch/mixamo/clips/*.fbx`
or `MIXAMO_DIR`, whatever the file names; slug = lower-case title with `_`; sha256 per file; skips a file whose dump
is newer and the same hash; runs Blender through `findBlender()` from `scripts/operators/blender.mjs` (read only) as
`cmd /c start "" /B /BELOWNORMAL /WAIT <blender> -b --factory-startup -noaudio --python-exit-code 1 --python ...`;
writes `build/mocap/mixamo/raw/<slug>.json` and `build/mocap/mixamo/manifest.json`). The run is wrapped by the lead in
`heavy-lock take ... && node scripts/mocap/mixamo.mjs ...; heavy-lock release ...`. Test: `tests/mixamoDriver.test.ts`
(slugging, manifest, skip logic; Blender mocked). Depends: nothing. Parallel with M2, M5, M6.

**M2 Bone map and take adapter (Opus, ~550).** `scripts/mocap/mixamoMap.mjs` (pure): `MIXAMO_MAP` from
`mixamorig<N>:` names to the CMU-named slots `retarget.mjs` reads (Hips->root, Spine1->upperback, Spine2->thorax,
Neck->upperneck, Head->head, LeftArm->lhumerus, LeftForeArm->lradius, LeftHand->lhand, LeftUpLeg->lfemur,
LeftLeg->ltibia, LeftFoot->lfoot, LeftToeBase->ltoes, the hip joints from the UpLeg heads, right side the same;
LeftShoulder / RightShoulder -> clavicle extras; finger chains Thumb / Index / Middle / Ring / Pinky 1-3 -> finger
extras; `*_End` and HeadTop_End ignored; `Spine` folded into the pelvis-to-spine rest correction, A6). Mismatched
proportions: lengths are always Wren's (the rest correction aims Wren's own segments), the pelvis follows the hips scaled
by the leg-length ratio as for CMU, the feet land at Wren's size; hips width and arm length differences fall out of the
keyed `arm` points (the rig aims its own arm bones). `scripts/mocap/mixamoTake.mjs`: `loadMixamoTake(slug)` returning
the `loadTake` shape (`skel` with `bones` dir / length / `metres`, `parent`, `pos` / `quat` maps, `frames`, `fps` 120,
`dead`, `zeros`): Blender Z-up to the game frame (+X right, +Y up, +Z forward, left-handed), the facing measured from
the rest pose (hip line and toe direction, not assumed), floor from the 5th percentile of the lowest foot point,
30 -> 120 fps (A3), in-place detection (A4). `retarget.mjs` gains an injected loader and a source string
(`retargetTake(rig, take, { load })`, `buildSlot(..., { licence })`, default the CMU ones, byte-identical output for
CMU). Tests: `tests/mixamoMap.test.ts` (every Wren joint mapped, prefixes `mixamorig:` / `mixamorig2:`, missing-bone
error), `tests/mixamoTake.test.ts` (a synthetic dump built in the test: a T-pose, a walk-like swing, an in-place clip;
frame conversion, facing, resample, `selfCheck` passes), and a CMU regression (an emitted CMU intermediate unchanged,
from a cached take when `.mocap-cache` exists, else skipped with a note). Depends: the dump format (fixed here and in M1
together: this PLAN's M1 field list). Parallel with M1.

**M3 Keyed emitter for Mixamo (Opus, ~700).** `scripts/mocap/data/mixamo-clips.json` (the recipe per slug: kind
`cycle` / `oneShot`, target, trim seconds or "auto", travel `z` / `+x` / `-x` / none, channels to keep) and
`scripts/mocap/mixamoEmit.mjs`: segments a cycle from the clip's own contacts (`gait.mjs` `footContacts`, the CMU
thresholds) or trims a one-shot to its moving span (joint speed over a threshold, 0.1 s margin), root extraction as
CLIP-FORMAT (cycles: the straight-line trend of the hips' ground projection; one-shots: the take's own path, heading
taken out progressively; in-place clips: root fixed), foot contact marks from the same contacts into `feet` (the clip
feet mode) and `duty`, frame rate 60 / cycles 48 frames through `buildSlot`, then `emitCycle` / `emitOneShot` /
`moduleSource`. Extra channels: `clav` from the shoulder bones, `fing` (curl = mean flexion of joints 1-3 / 90 deg,
spread = joint 1 abduction / 30 deg), `fore` from the hand's roll (A7). Output: `src/anim/clips/mixamo/<slug>.ts`, each
`name: 'mocap_<slug>'`, header naming "Mixamo", the site title, the frames used and "do not edit". Generated report:
`docs/mixamo-retarget/CLIPS.md` (per clip: frames, speed, stride scale, slide before / after, reach short, direction
error; the TAKES.md style through `takesdoc.mjs`'s marker writer pointed at this file). Sheets: `sheets.mjs` on the
intermediates (SVG, no GPU). Tests: `tests/mixamoEmit.test.ts` (recipe validation, trim, root extraction on a synthetic
intermediate; every emitted module builds through `keyedClip`, loops close, planted feet fall back at the stride).
Depends: M2 (code), M1 run (real clips). Parallel with M4.

**M4 Channel-clip emitter for traversal (Opus, ~650).** `scripts/mocap/mixamoChannels.mjs`: the retargeted Wren
intermediate -> a `makeClip` module (`src/anim/clip.ts` `ClipDef`, the channels `traverse.ts` keys: `hLX..hRZ` and
`fLY / fLZ ...` hand and foot targets in the root frame at 1.75 m, `pelY`, `pelPitch`, `pelRoll`, `spPitch`, `hdPitch`,
`width`, `grip` / `offGrip` 0), keys reduced to a curve with an error bound (1 cm, 1 deg) so the modules stay small,
clocked as the clip they replace (`traverseT` cadence for loops, progress for climb-ups). Hands and feet stay on the
anchors through the rig's `reachL/R` / `plantL/R` (the clip's hand channels are the fallback only, as today). Output
`src/anim/clips/mixamo/trav_<slug>.ts`. Tests: `tests/mixamoChannels.test.ts` (key reduction bound, clock mapping,
the module builds through `makeClip`). Depends: M2. Parallel with M3.

**M5 Source label, Studio and tuner (Opus, ~600; its own slice per Michael ~19:05).**
`src/anim/mocapSources.ts`: one table, clip name -> `{ source: 'cmu' | 'mixamo', title, take?, credit }` for every
clip in `clips/mocap` and `clips/mixamo` (generated rows written by M3 / M4's emitters between markers, the CMU rows
by hand once). `nowPlaying.ts`: "motion-capture" gains the source, e.g. "Now playing: motion-capture (Mixamo) hang"
(the per-frame key stays allocation-free: a source tag in the packed key). `studio.ts`: a "motion capture" group in the
loop player listing every capture (CMU and Mixamo) with its source in the label, keyed ones through the existing
`keyed()` entry, channel clips through the traversal entries (`studioTraversal.ts`) on their props. Tuner: the Body >
Joints, Hands & feet and Limb reach rows work on Mixamo clips exactly as on CMU (the mocap share), the reach probe
(`tests/tunerReachProbe.test.ts`) gains the Mixamo states so greyed rows stay true; `KEYS_MOCAP_NOTE` unchanged. Tests:
`tests/mocapSources.test.ts` (every clip module has a source row; every Mixamo row has an art-credits row with URL and
licence), `tests/nowPlaying.test.ts` extended, `tests/animStudio.test.ts` entry list. The checker reads every
Mixamo title against G6 by hand (no reference-game names). Laptop: `e2e-studio`, `e2e-anim`. Depends: the table shape only (it ships with
the CMU rows first, Mixamo rows as M3 / M4 land). Parallel with M1-M4.

**M6 Credits (Sonnet from a strict Opus brief, ~80).** `docs/art-credits.md`: the free-asset rule's header text
(Michael ~19:00) and a "Motion capture (Mixamo)" table: one row per bundled clip: repo path, the Mixamo title, source
URL `https://www.mixamo.com/`, author "Adobe (Mixamo)", licence (A11: the FAQ sentence, date read), date added, used
by. Raw files: "not in the repo (`C:/NightShift/scratch/mixamo/clips/`)". `.gitignore`: a comment line that raw Mixamo
files never enter the repo (they are outside it already). Lands before or with the first PR that commits a clip.
Depends: M3 / M4 slug list. Parallel.

**I1 Locomotion and idle on Wren (Opus, ~500).** `src/anim/mixamo.ts`: `MIXAMO_ON` (per clip, default per A1 / A8),
the resolved set built once per change (like `applyMocapSwitch`), read by reference in the graph; `src/core/flags.ts`:
`mixamo: boolean | null` (`?mixamo=0/1`, the `onOffFlag` pattern). `standing_idle` in place of `KEYED_IDLE`
(`animGraph.ts:2141`, the same sampler, its `half` / `kneeOut`); `crouched_walking` as `LocoClipSet.crouchWalk` only if
the A8 measure says so. Off = byte-identical (tests pin it, as `mocapSwitch.test.ts` does). Tests:
`tests/mixamoSwitch.test.ts` (on / off identity, headless rig measures: slide, continuity, knee / elbow ranges).
Laptop: `e2e-anim`, `e2e-move`, `e2e-clip`, co-op group (`src/player` reach); look video. Depends: M3, M5.

**I2 Traversal on Wren (Opus, ~700).** The `TRAVERSE_CLIP` table (`animGraph.ts:680`) and the climb-up pick (`:1258`)
read a resolved table from `mixamo.ts` (swapped per clip once per change; no per-frame lookup): hang, shimmy, climb-up
(free / crouch), ladder, crawl. Hands / feet on anchors within 1 cm (bible 5.12.2 #2). Tests: `tests/mixamoTraverse.test.ts`
(off identity, reach and plant errors headless). Laptop: `e2e-traverse`, `e2e-anim`, `e2e-clip`, `e2e-ctcourse`; look
video. Depends: M4, M5. Parallel with I1, I3 (different lines of animGraph: the lead merges; if both touch the file the
lead serialises them).

**I3 Stance changes (Opus, ~400).** Crouch-to-stand / stand-to-crouch as one-shots over the stance blend, timed by the
game's stance clock (never faster than 0.25 / 0.3 s), on the mocap share; drawn stance stays as today. Tests:
`tests/mixamoStance.test.ts`. Laptop: `e2e-anim`, `e2e-move`, `e2e-stealth`. Depends: M3, M5. Serialised after I1 if
both edit the same graph block.

**G1 Guard idle (Opus, later, own flag `mixamoGuards`).** Standing idle on guard rigs (`keyedOk` gate for the idle only),
`tests/mocapGuards.test.ts` and the guard identity fixture updated on purpose; Guard AI lead told first (A10).

**Switch-on (in each I slice).** A clip turns on by default when the headless measures and the audit are at least as good
as the clip it replaces and the checker passes (A1, A8); the look video path goes in the PR body; the orchestrator adds a
walk-card line. Walk cap (RULES "Walk pacing", G288): Michael's ~19:05 approval is logged as A1 for the orchestrator's
count; the per-clip `MIXAMO_ON` entry is the undo.

## Hand-offs (A9: converted and shown in the Studio here, wired by the owner)
- pulling, lifting, crawling (crawl-under): the team pull / shutter poses owed to Marlow (mission-framework;
  `KIT_POSE_IDS` placeholders on mission-engine) and coop-kit K1's `crawlUnder`: a note in `docs/mixamo-retarget/HANDOFF.md`
  with the clip module, its clock and the suggested hook.
- carry, kneel_down, punch: J19 (body carry, put-down R11, the knock-out strike S1).
- J19 deletes the run hop (R18); no hop or slide clip is asked for.

## Order and parallel runs
M1, M2, M5, M6 now (M1's Blender run waits for the CPU cap); M3 and M4 after M2; I1 / I2 / I3 after M3 / M4 + M5 (I2
can start on M4 alone with the CMU-only label); G1 last. PRs: M1+M2 (pipeline, ~1,000), M3 (+ first clips), M4,
M5, I1, I2, I3, each under ~1.5k lines.

## Flag
`mixamo` in `src/core/flags.ts` (`?mixamo=0/1`), with `MIXAMO_ON` per clip in `src/anim/mixamo.ts`: unfinished clips
stay off; owner Player Build; switch-on date per clip in its PR body and ROADMAP.

## Claims
- Files (new): `scripts/mocap/py/mixamo_dump.py`, `scripts/mocap/mixamo.mjs`, `scripts/mocap/mixamoMap.mjs`,
  `scripts/mocap/mixamoTake.mjs`, `scripts/mocap/mixamoEmit.mjs`, `scripts/mocap/mixamoChannels.mjs`,
  `scripts/mocap/data/mixamo-clips.json`, `src/anim/clips/mixamo/*.ts`, `src/anim/mixamo.ts`, `src/anim/mocapSources.ts`,
  `tests/mixamo*.test.ts`, `tests/mocapSources.test.ts`, `docs/mixamo-retarget/*`.
- Files (edited): `scripts/mocap/retarget.mjs` (loader injection only, CMU output unchanged), `src/core/flags.ts`
  (one flag), `src/anim/animGraph.ts` (idle, crouch walk, traversal table, stance: I1-I3), `src/anim/mocap.ts`
  (crouch-walk slot, I1), `src/anim/nowPlaying.ts`, `src/anim/studio.ts`, `src/anim/studioTraversal.ts`,
  `src/ui/tunerReach.ts` (only if a probed row changes), the tests those slices name, `docs/art-credits.md`,
  `.gitignore` (comment). Read only: `scripts/operators/blender.mjs`, `scripts/operators/export-joints.mjs`,
  `src/anim/keyed.ts`, `src/anim/clip.ts`.
- Not touched: `src/anim/clips/team.ts`, kit clips, `src/game/*` carry / takedown code (hand-offs), `src/net/*`.
- Maps: none. Wire: none (no `PROTOCOL_VERSION` change). Save: none.
- Sizes: every PR under ~1.5k changed lines (above).
