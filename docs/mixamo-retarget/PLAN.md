# mixamo-retarget - plan
Owner: Player Build. Status: current (2026-10-25; plan check PASS WITH FIXES on 81ec5261, fixes 1-9 applied). Brief:
`BRIEF.md` (Michael's words, A1-A11). Base: origin/master b81c4945b.

## What exists (the CMU path, reused)
- Offline, no Blender: `scripts/mocap/asfamc.mjs` (`loadTake` `:156`: ASF/AMC -> per-bone world positions and
  rest-relative world rotations in the game frame, 120 fps, `selfCheck`), `gait.mjs` (contacts, slide, heading),
  `analyze.mjs` (`analyzeTake` `:66`: strike / toe-off events, cycles), `retarget.mjs` (`MAP` `:26`, `wrenRig` `:34`
  from `scripts/operators/export-joints.mjs`, `retargetTake` `:112` rest correction by shortest arc + leg-length scale,
  `buildSlot` `:338`: calls `retargetTake` itself, segment, 60 fps resample, root extraction (a loop's root yaw is the
  atan2 of its travel, `:353`), loop seam, foot de-slide, events), `emit.mjs` (`emitCycle` `:209`: walk / jog / run gaits
  warped to strikes; `emitOneShot` `:314`: turn / start / stop at `ONESHOT_FPS` 40; `moduleSource` `:383`), `sheets.mjs`
  (stick-figure SVG sheets), `m3.mjs` (a second batch driver).
- Format: `docs/mocap-trial/CLIP-FORMAT.md` (`src/anim/keyed.ts` `KeyedClipDef` `:43`): 1.75 m body frame, `pel`, `q`
  (pelvis, spine, chest, neck), `arm` points, optional `head`, `clav`, `fing`, `fore`, `feet` + `stride` (clip feet);
  cycles phase-warped to left strike 0 / right 0.5; one-shots by progress; no root motion in the clip.
- Runtime: `src/anim/mocap.ts` (`LocoClipSet` `:127`, `MOCAP_SET` `:176`, the "Mocap locomotion" switch `LOCO`); the
  graph's keyed reads (`animGraph.ts:2141` idle, `:2221` crouch, `:2357` speed set); traversal clips are `makeClip`
  channel clips in `src/anim/clips/traverse.ts`, picked from `TRAVERSE_CLIP` (`animGraph.ts:680`, `:1258`), shared by
  Wren and the guards (`enemy.ts:4100` `traverse = 'climb'`). The climb-up's root path is moved by
  `src/player/attachController.ts` (`CLIMB_UP_STAND` `:109`, `CLIMB_UP_PATH` `:114`, `CLIMB_UP_CROUCH_K` 0.654,
  `CLIMB_UP_HANDS`).
- Labels: a clip named `mocap_*` reads as "motion-capture" in the tuner's Now playing line (`nowPlaying.ts:150`, `:176`;
  `GraphPlaying` `:87` has no traversal-clip field); the tuner tunes a capture through Body > Joints, Hands & feet and
  Limb reach on the mocap share (`tunerReach.ts:55` `KEYS_MOCAP_NOTE`); there is no per-clip source field. The Anim
  Studio lists the keyed clips (`studio.ts:154-198`), not the captures.
- Guards: `keyedOk` off (`characterRig.ts:1841`), pinned by `tests/mocapGuards.test.ts`.

## Clip map (CLIP-LIST.md -> what it replaces, owner of the hook)
| Clip (slug) | Output (emit kind) | Replaces (A8: only if it measures as well or better) | Slice |
| --- | --- | --- | --- |
| hanging_idle | channel clip, loop | `HANG` (traverse.ts:23), hands stay on the grips by the rig's IK | I2 |
| braced_hang_shimmy | channel clip, cycle on `traverseT` | the ledge shimmy (HANG over the cadence) | I2 |
| freehang_climb | channel clip, progress on the climb-up path | `CLIMB_UP` (traverse.ts:366) from a free hang | I2 |
| braced_hang_to_crouch | channel clip, progress on the climb-up path | `CLIMB_UP` to the crouch (`CLIMB_UP_CROUCH_K`) | I2 |
| climbing_ladder | channel clip, cycle on the rung cadence | `CLIMB` (traverse.ts:57) | I2 |
| crawling | channel clip, cycle | `CRAWL` (traverse.ts:122); also the `crawlUnder` placeholder | I2 / hand-off |
| crouch_to_stand, stand_to_crouch | keyed timed one-shot | the procedural stance change (min 0.3 / 0.25 s, bible 5.12.2 #6) | I3 |
| crouched_walking | keyed gait cycle + feet | `MOCAP_CROUCH_WALK` (CMU 136_09) only if better; else Studio only | I1 |
| standing_idle | keyed non-gait loop | `KEYED_IDLE` (Wren); guards later (G1) | I1 / G1 |
| pulling, lifting | keyed timed one-shots | team pull (`pullHaul`) / shutter lift (`shutterLift`) placeholders | hand-off |
| carry, kneel_down | keyed gait cycle / timed one-shot | the body carry walk, J19's put-down (R11) | hand-off |
| punch | keyed timed one-shot | the knock-out strike (`strikeBody.ts`, J19 S1) | hand-off |
Files may land with other names: M1 slugs whatever is in the folder and M3's recipe maps slugs to rows by title words.

## Slices
Model per RULES: Opus for anim / engine code and the pipeline maths; Sonnet only from strict Opus briefs (data,
tests, credits). Sizes are changed lines. Every slice: branch guard, path-limited commits, `npm run typecheck:fast` +
`npx vitest run <its files>`, fresh checker. Blender runs (M1 run step only) wait for the orchestrator to lift the
desktop CPU cap.

**M1 FBX dump (Opus, ~450).** `scripts/mocap/py/mixamo_dump.py` (headless Blender: factory startup, import each FBX
with the FBX importer, armature only). Per frame, per pose bone: the world head position and the rest-relative world
rotation `W · R · W⁻¹`, where `R = pose_bone.matrix @ bone.matrix_local.inverted()` (armature space) and `W` the
armature object's world matrix (the importer's 0.01 scale and axis turn taken out of the rotation, kept for positions).
The rest pose's bone heads (world). Tails are not written: the FBX importer guesses them, so every segment end is the
child bone's head (M2). The scene fps and frame range. `scripts/mocap/mixamo.mjs` (driver): lists
`C:/NightShift/scratch/mixamo/clips/*.fbx` (or `MIXAMO_DIR`), whatever the file names; slug = lower-case title with `_`;
sha256 per file; skips a file whose dump is newer with the same hash; runs Blender through `findBlender()` from
`scripts/operators/blender.mjs` (read only) as `cmd /c start "" /B /BELOWNORMAL /WAIT <blender> -b --factory-startup
-noaudio --python-exit-code 1 --python ...`; writes `build/mocap/mixamo/raw/<slug>.json` and
`build/mocap/mixamo/manifest.json`. The lead wraps the run in `heavy-lock take ... && node scripts/mocap/mixamo.mjs ...;
heavy-lock release ...` (one shell command). Test: `tests/mixamoDriver.test.ts` (slugging, manifest, skip logic;
Blender mocked). Depends: nothing. Parallel with M2, M5, M6.

**M2 Bone map, take adapter, retarget options (Opus, ~600).** `scripts/mocap/mixamoMap.mjs` (pure): `MIXAMO_MAP` from
`mixamorig<N>:` names to the CMU-named slots `retarget.mjs` reads (Hips->root, Spine1->upperback, Spine2->thorax,
Neck->upperneck, Head->head, LeftArm->lhumerus, LeftForeArm->lradius, LeftHand->lhand, LeftUpLeg->lfemur,
LeftLeg->ltibia, LeftFoot->lfoot, LeftToeBase->ltoes, the hip joints from the UpLeg heads, right side the same;
LeftShoulder / RightShoulder -> clavicle extras; finger chains Thumb / Index / Middle / Ring / Pinky 1-3 -> finger
extras; `*_End` and HeadTop_End ignored; `Spine` folded into the pelvis-to-spine rest correction, A6). Segment end
points (the rest `dir` and `length` each slot needs) always come from the child bone's head, never an importer tail:
upper arm -> ForeArm head, forearm -> Hand head, hand -> `LeftHandMiddle1` head, thigh -> Leg head, shin -> Foot head,
foot -> `ToeBase` head, toe -> `Toe_End` head (else the foot's length forward), neck -> Head head, head -> HeadTop_End.
Mismatched proportions: lengths are always Wren's (the rest correction aims Wren's own segments), the pelvis follows
the hips scaled by the leg-length ratio as for CMU, the feet land at Wren's size; hip width and arm length differences
fall out of the keyed `arm` points (the rig aims its own arm bones). `scripts/mocap/mixamoTake.mjs`:
`loadMixamoTake(slug)` returning the `loadTake` shape (`skel` with `bones` dir / length / `metres`, `parent`, `pos` /
`quat` maps, `frames`, `fps` 120, `dead`, `zeros`): Blender Z-up to the game frame (+X right, +Y up, +Z forward,
left-handed), the facing measured from the rest pose (hip line and toe direction, not assumed), floor from the 5th
percentile of the lowest foot point, 30 -> 120 fps (A3), in-place detection (A4).
`retarget.mjs`: an injected loader and source string that pass through (`buildSlot(rig, pick, choice, suffix, takeInfo,
{ load, licence })` hands `load` to its own `retargetTake(rig, take, { load })` call), and an in-place loop option
(`{ inPlace: true }`: the root fixed at the start pose's ground point and heading, no travel yaw, for idle / hang loops
whose travel atan2 at `:353` is noise). Defaults are the CMU ones; CMU output byte-identical. `analyze.mjs`:
`analyzeTake(entry, { load })` (the same injection), so Mixamo gait clips get their strike / toe-off events from the
existing analysis. Tests: `tests/mixamoMap.test.ts` (every Wren joint mapped, prefixes `mixamorig:` / `mixamorig2:`,
end points from child heads, missing-bone error), `tests/mixamoTake.test.ts` (a synthetic dump built in the test: a
T-pose, a walk-like swing, an in-place clip; frame conversion, `W · R · W⁻¹` with a scaled / turned armature, facing,
resample, `selfCheck` passes; an in-place loop's root stays fixed), and a CMU regression (an emitted CMU intermediate
unchanged, from a cached take when `.mocap-cache` exists, else skipped with a note). Depends: the dump format (fixed
here and in M1 together). Parallel with M1.

**M3 Keyed emitter for Mixamo (Opus, ~800).** `scripts/mocap/data/mixamo-clips.json` (the recipe per slug: emit kind,
target, trim seconds or "auto", travel `z` / `+x` / `-x` / none, channels to keep) and `scripts/mocap/mixamoEmit.mjs`.
Emit kinds:
- `gait` (crouched walking, carry): `analyzeTake` events through the injected loader, then `buildSlot` + `emitCycle`
  as CMU (strike-warped, clip feet, `duty`).
- `loop` (standing idle): a non-gait loop, not strike-warped: `buildSlot` with `inPlace`, the loop seamed over its own
  period, sampled at even phases (48 frames), no `feet` (the planner keeps the feet), written through `moduleSource`.
- `timed` (stance changes, punch, kneel down, pulling, lifting): a generic one-shot by progress over its own seconds,
  trimmed to its moving span (joint speed over a threshold, 0.1 s margin), root as the take's own path with its heading
  taken out progressively (in place when A4 detects it), at `ONESHOT_FPS` 40 like the CMU one-shots, plus its seconds
  constant.
Mixamo loops repeat their first frame as the last: the emitter drops the duplicate before seaming. Extra channels:
`clav` from the shoulder bones, `fing` (curl = mean flexion of joints 1-3 / 90 deg, spread = joint 1 abduction / 30
deg), `fore` from the hand's roll (A7). Output: `src/anim/clips/mixamo/<slug>.ts`, each `name: 'mocap_<slug>'`, header
naming "Mixamo", the site title, the frames used and "do not edit". Source rows: M3 writes its own marker block in
`src/anim/mocapSources.ts` (`// @mixamo-keyed-begin` / `-end`). Generated report: `docs/mixamo-retarget/CLIPS.md` (per
clip: frames, speed, stride scale, slide before / after, reach short, direction error; through `takesdoc.mjs`'s marker
writer pointed at this file). Sheets: `sheets.mjs` on the intermediates (SVG, no GPU). Tests:
`tests/mixamoEmit.test.ts` (recipe validation, the three kinds on synthetic intermediates, duplicate-frame drop, trim,
root extraction; every emitted module builds through `keyedClip`, loops close, planted feet fall back at the stride).
Depends: M2 (code), M5 (the table and markers), M1 run (real clips). Parallel with M4.

**M4 Channel-clip emitter for traversal (Opus, ~750).** `scripts/mocap/mixamoChannels.mjs`: the retargeted Wren
intermediate -> a `makeClip` module (`src/anim/clip.ts` `ClipDef`, the channels `traverse.ts` keys: `hLX..hRZ` and
`fLY / fLZ ...` hand and foot targets in the root frame at 1.75 m, `pelY`, `pelZ`, `pelPitch`, `pelRoll`, `spPitch`,
`hdPitch`, `width`, `grip` / `offGrip`), keys reduced to a curve with an error bound (1 cm, 1 deg). Clocks: loops
(hang, shimmy, ladder, crawl) on the `traverseT` cadence of the clip they replace. Climb-ups: the game moves the root
along `CLIMB_UP_PATH` (attachController.ts `:114`, `CLIMB_UP_STAND` `:109`), so each take is re-expressed relative to that
game root path at the same progress (take pose minus the game root at progress k), and time-warped so the take's hand
release, foot on top and crouch land on `CLIMB_UP_HANDS`, `offGrip` and `CLIMB_UP_CROUCH_K`. Hands and feet stay on the
anchors through the rig's `reachL/R` / `plantL/R` (the clip's hand channels are the fallback, as today). No
`src/player` edit. Output `src/anim/clips/mixamo/trav_<slug>.ts`; source rows in its own marker block of
`mocapSources.ts` (`// @mixamo-trav-begin` / `-end`). Tests: `tests/mixamoChannels.test.ts` (key reduction bound, clock
mapping, the climb-up warp landing its events on the game's constants, the module builds through `makeClip`).
Depends: M2, M5 (markers). Parallel with M3.

**M5 Source label, Studio and tuner (Opus, ~700; its own slice per Michael ~19:05).** Lands first among M3-M5 writers:
`src/anim/mocapSources.ts`, one table, clip name -> `{ source: 'cmu' | 'mixamo', title, take?, credit }`, the CMU rows by
hand, and the two empty marker blocks M3 and M4 own. `nowPlaying.ts`: `GraphPlaying` (`:87`) gains a traversal-clip
field (`trav: Clip | null`, set by the graph when a traversal clip plays; I2 sets it for the Mixamo ones) and a source
tag in the packed key (allocation-free), so the game shows e.g. "Now playing: motion-capture (Mixamo) hang" and
"motion-capture (CMU) walk". `studio.ts`: a "motion capture" group in the loop player listing every capture (CMU and
Mixamo) with its source in the label, keyed ones through the existing `keyed()` entry, channel clips through the
traversal entries (`studioTraversal.ts`) on their props. Tuner: keyed captures are tuned by Body > Joints, Hands & feet
and Limb reach on the mocap share, exactly as CMU. Channel clips have no mocap share: they are tuned by the attached
rows that already move the traversal clips (Body > Joints on the attached groups, Hands & feet `handOutAdd` and the
attached reach rows in `tune.ts` `ATTACHED`, the climb speed `shimmyMul`); the reach probe (`tests/tunerReachProbe.test.ts`)
gains hang, shimmy, ladder and climb-up states with the Mixamo clips on and proves those rows change the pose (no greyed
row that works, no live row that does nothing). `KEYS_MOCAP_NOTE` gains "and climbing / hanging" if the probe needs it.
Tests: `tests/mocapSources.test.ts` (every clip module has a source row; every Mixamo row has an art-credits row with
URL and licence), `tests/nowPlaying.test.ts` (source words, the traversal field, no allocation), `tests/animStudio.test.ts`
(entry list). The checker reads every Mixamo title against G6 by hand. Laptop: `e2e-studio`, `e2e-anim`, `anim-audit`;
a short Studio look video (the motion-capture group, labels, a row moved). Depends: nothing (ships with the CMU rows;
Mixamo rows as M3 / M4 land). Parallel with M1, M2.

**M6 Credits (Sonnet from a strict Opus brief, ~80).** `docs/art-credits.md`: the free-asset rule's header text
(Michael ~19:00) and a "Motion capture (Mixamo)" table: one row per bundled clip: repo path, the Mixamo title, source
URL `https://www.mixamo.com/`, author "Adobe (Mixamo)", licence (A11: the FAQ sentence, date read), date added, used
by. Raw files: "not in the repo (`C:/NightShift/scratch/mixamo/clips/`)". `.gitignore`: a comment line that raw Mixamo
files never enter the repo (they are outside it already). Lands before or with the first PR that commits a clip.
Depends: M3 / M4 slug list. Parallel.

**I1 Locomotion and idle on Wren (Opus, ~500).** `src/anim/mixamo.ts`: `MIXAMO_ON` (per clip), the resolved set built
once per change (like `applyMocapSwitch`), read by reference in the graph; `src/core/flags.ts`: `mixamo: boolean |
null` (`?mixamo=0/1`, the `onOffFlag` pattern; default OFF until the orchestrator's walk-cap ruling, A1).
`standing_idle` in place of `KEYED_IDLE` (`animGraph.ts:2141`, the same sampler, its `half` / `kneeOut`);
`crouched_walking` as `LocoClipSet.crouchWalk` only if the A8 measure says so. Off = byte-identical (tests pin it, as
`mocapSwitch.test.ts` does). Tests: `tests/mixamoSwitch.test.ts` (on / off identity, headless rig measures: slide,
continuity, knee / elbow ranges). Laptop: `affected-e2e` for `src/anim` (with `anim-audit`, `e2e-weapons-carry`),
`e2e-anim`, `e2e-move`, `e2e-clip`; no co-op group (no `src/player` file); look video. Depends: M3, M5.

**I2 Traversal on Wren (Opus, ~700).** The `TRAVERSE_CLIP` table (`animGraph.ts:680`) and the climb-up pick (`:1258`)
read a resolved Wren table from `mixamo.ts` (swapped per clip once per change; no per-frame lookup) only on Wren rigs
(`wrenReady`): guards share the table (`enemy.ts:4100`) and keep the hand-made clips; `tests/mocapGuards.test.ts`
gains a guard climb pinned unchanged with the flag on. Clips: hang, shimmy, climb-up (free / crouch), ladder, crawl.
Sets `GraphPlaying.trav` (M5). Hands / feet on anchors within 1 cm (bible 5.12.2 #2); `tests/climbHands.test.ts` passes
with the clips on. Tests: `tests/mixamoTraverse.test.ts` (off identity, reach and plant errors headless). Laptop:
`affected-e2e` (`src/anim`), `e2e-traverse`, `e2e-anim`, `e2e-clip`, `e2e-ctcourse`; look video. Depends: M4, M5.
Parallel with I1, I3 (different blocks of animGraph; if both touch the same block the lead serialises them).

**I3 Stance changes (Opus, ~400).** Crouch-to-stand / stand-to-crouch as timed one-shots over the stance blend, timed
by the game's stance clock (never faster than 0.25 / 0.3 s), on the mocap share; drawn stance stays as today. Tests:
`tests/mixamoStance.test.ts`. Laptop: `affected-e2e` (`src/anim`), `e2e-anim`, `e2e-move`, `e2e-stealth`; look video.
Depends: M3, M5. Serialised after I1 if both edit the same graph block.

**G1 Guard idle (Opus, later, own flag `mixamoGuards`).** Standing idle on guard rigs (`keyedOk` gate for the idle
only), `tests/mocapGuards.test.ts` and the guard identity fixture updated on purpose; Guard AI lead told first (A10).
Tests: `tests/mixamoGuards.test.ts` (flag off identity, on: idle only). Laptop: `e2e-stealth-ai`, `e2e-enemies`,
`e2e-anim`, co-op group (guard puppets); look video.

**Switch-on (A1).** Player / animation is AT CAP (ROADMAP:73, "3: AT CAP"). Until the orchestrator rules: each I slice
lands its `MIXAMO_ON` entries true (the clips that pass A8 and the checker) while the `mixamo` flag defaults OFF; the
whole Mixamo set counts as one walk-card feature; the first default-on (the flag's default to true) follows the
orchestrator's ruling, with the look videos' paths in the PR bodies and a walk-card line.

## Hand-offs (A9: converted and shown in the Studio here, wired by the owner)
Each goes as a row in the owner's PLAN / STATE through the orchestrator (not only `docs/mixamo-retarget/HANDOFF.md`,
which keeps the clip module, its clock and the suggested hook):
- crawling (crawl-under): the `crawlUnder` placeholder in mission-engine's `KIT_POSE_IDS` (`team.ts:44`, mapped to
  `'crouchWalk'` at `:61`): to the mission-framework lead (Campaign Build).
- pulling, lifting: the team pull / shutter poses owed to Marlow (mission-framework, `KIT_POSE_IDS` placeholders on
  mission-engine): to Campaign Build and Marlow Build.
- carry, kneel_down, punch: J19 (Player's own batch): body carry, put-down R11, the knock-out strike S1; a row in
  `docs/player-batch-j19/PLAN.md` on its branch.
- J19 deletes the run hop (R18); no hop or slide clip is asked for.

## Order and parallel runs
M2, M5, M6 builders now; M1 code now, its Blender run when the CPU cap lifts. M5 lands the source table and markers
before M3 / M4 write rows. M3 and M4 after M2 (+ M5); I1 / I2 / I3 after M3 / M4 + M5; G1 last. PRs: M1+M2 (pipeline,
~1,050), M5, M3 (+ first clips), M4, I1, I2, I3, each under ~1.5k lines.

## Flag
`mixamo` in `src/core/flags.ts` (`?mixamo=0/1`, default OFF until the orchestrator rules, A1), with `MIXAMO_ON` per
clip in `src/anim/mixamo.ts`; owner Player Build; switch-on date in the PR body and ROADMAP.

## Claims
- Files (new): `scripts/mocap/py/mixamo_dump.py`, `scripts/mocap/mixamo.mjs`, `scripts/mocap/mixamoMap.mjs`,
  `scripts/mocap/mixamoTake.mjs`, `scripts/mocap/mixamoEmit.mjs`, `scripts/mocap/mixamoChannels.mjs`,
  `scripts/mocap/data/mixamo-clips.json`, `src/anim/clips/mixamo/*.ts`, `src/anim/mixamo.ts`, `src/anim/mocapSources.ts`
  (M5 owns the table; M3 / M4 own one marker block each), `tests/mixamo*.test.ts`, `tests/mocapSources.test.ts`,
  `changes/feature-mixamo-retarget.md` (changelog fragment), `docs/mixamo-retarget/*`.
- Files (edited): `scripts/mocap/retarget.mjs` (loader injection + in-place loop option; CMU output byte-identical),
  `scripts/mocap/analyze.mjs` (loader injection only), `src/core/flags.ts` (one flag), `src/anim/animGraph.ts` (idle,
  crouch walk, Wren traversal table, stance, `GraphPlaying.trav`: I1-I3), `src/anim/mocap.ts` (crouch-walk slot, I1),
  `src/anim/nowPlaying.ts`, `src/anim/studio.ts`, `src/anim/studioTraversal.ts`, `src/ui/tunerReach.ts` (only if a
  probed row or the note changes), `tests/mocapGuards.test.ts` (I2 pin, G1), `tests/tunerReachProbe.test.ts`,
  `tests/nowPlaying.test.ts`, `tests/animStudio.test.ts`, `docs/art-credits.md`, `TESTING.md` (one line: the Studio's
  motion-capture group and `?mixamo=1`), `.gitignore` (comment). Read only: `scripts/operators/blender.mjs`,
  `scripts/operators/export-joints.mjs`, `src/anim/keyed.ts`, `src/anim/clip.ts`, `src/player/attachController.ts`.
- Not touched: `src/player/*`, `src/anim/clips/team.ts`, kit clips, `src/game/*` carry / takedown code (hand-offs),
  `src/net/*`.
- Maps: none. Wire: none (no `PROTOCOL_VERSION` change). Save: none.
- Sizes: every PR under ~1.5k changed lines (above).
