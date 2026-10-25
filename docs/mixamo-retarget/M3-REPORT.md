# mixamo-retarget M3 - report
Owner: Player Build (M3 builder, Opus). Status: done (2026-10-25). Branch `feature/mixamo-retarget-m3`. Plan: `PLAN.md` M3.

## Built
- The 12 keyed Mixamo clips as real modules, `src/anim/clips/mixamo/<slug>.ts` (`mocap_<slug>`), each with its row in
  the keyed marker block of `src/anim/mocapSources.ts`, so each shows in the Anim Studio's "motion capture" group as
  "motion capture (Mixamo): <name>" and is tuned there like the CMU captures (Body > Joints, Hands & feet, Limb reach on
  the mocap share; the Studio pins the row's body state).
- `scripts/mocap/data/mixamo-clips.json`: one recipe per slug (kind, file, title, note, target, trim, travel, inPlace,
  gait band, ownTrack, channels, Studio row, limits), checked by `validateRecipes` (slug rule from M1's `slugOf`, title,
  kinds, body states read from `tune.ts`).
- `scripts/mocap/mixamoEmit.mjs`: one command regenerates every module, every row and `CLIPS.md` from the dumps:
  `node --import ./scripts/operators/ts-resolve.mjs scripts/mocap/mixamoEmit.mjs` (`[slug ...]` re-emits some and keeps
  the other rows; `--dry` prints only). Intermediates and stick-figure sheets go to `build/mocap/mixamo/{keyed,sheets}/`.
  - `gait`: a Mixamo walk clip is one whole cycle whose last frame repeats the first, so the loop is the whole take (the
    duplicate is `buildSlot`'s closing frame, never sampled twice), events from `buildSlot`'s de-slid contacts, then
    `emitCycle` with the capture's own track (`ownTrack`, as m3.mjs). `analyzeTake` is not used: it finds the strikes
    but 0 cycles on a one-cycle take (the M1+M2 checker saw the same). A cycle without strikes falls back to a loop
    (flagged in CLIPS.md); none did.
  - `loop`: `buildSlot` `inPlace`, seamed over its period, sampled at even phases at 20 per second of take
    (`LOOP_FPS`; the plan's 48 frames would be 8 per second on a 6 s idle), no `feet`.
  - `timed`: trimmed to the moving span (mean speed of 10 joints over max(0.1 m/s, 8 % of the peak), 0.1 s margin),
    root the take's own path with its heading taken out (in place when A4 says so), 40 samples a second
    (`ONESHOT_FPS`), `MOCAP_<SLUG>_SECONDS` exported.
  - Module header: first line "GENERATED ... Do not edit" (PR size gate), Mixamo, the site title, the file, the 30 fps
    frames used.
- `scripts/mocap/takesdoc.mjs`: `writeSection(name, body, file = TAKES_MD)`, so the same marker writer fills
  `docs/mixamo-retarget/CLIPS.md` (section `mixamo-keyed`; M4 can add its own).
- `tests/mixamoEmit.test.ts` (10 tests): recipes valid and the plan's kinds, wrong recipes refused; duplicate last
  frame; trim span; the three kinds on synthetic intermediates (loop even phases and closure, timed seconds and end
  frames, gait 48 frames with feet and stride, gait without strikes -> loop); the row block writer (replace, keep,
  CRLF, missing markers); every committed module is a built `KeyedClip` with header and row, loops and gaits close,
  planted feet fall back at the stride, one-shots export seconds equal to the row's cycle.

## Per clip (CLIPS.md, short)
| Clip | Kind | Frames | Seconds | Notes |
| --- | --- | --- | --- | --- |
| crouched_walking | gait | 48 | 1.133 | 1.66 m/s, stride 1.88 m, seam step 0.9 cm (typ 1.5), slide 1.2 / 1.7 cm, pelvis -24 cm |
| carry_body_walking | gait | 48 | 2.867 | 0.91 m/s, stride 2.62 m, seam 0.7 cm, slide 1.2 / 1.4 cm |
| crawling_prone | gait | 48 | 2.333 | 0.23 m/s, pelvis -86 cm (flat), slide 9 / 21 cm, reach short 9.9 cm (limits) |
| standing_idle | loop | 120 | 6 | in place, seam 0 |
| carry_body_idle | loop | 200 | 10 | in place, seam 0 |
| crouch_to_stand | timed | 88 | 2.167 | pelvis from -47 cm |
| stand_to_crouch | timed | 104 | 2.583 | pelvis to -54 cm |
| elbow_strike | timed | 68 | 1.667 | whole take moves |
| cross_punch | timed | 36 | 0.867 | |
| kneel_down | timed | 86 | 2.117 | pelvis -58 cm |
| kneeling_pull_up | timed | 180 | 4.483 | pelvis -59 cm throughout |
| pulling_up_to_a_ledge | timed | 154 | 3.817 | hips rise ~1.75 m (limits) |
| lifting_heavy_object | timed | 386 | 9.617 | slide 6.3 / 9.3 cm after |

Retarget direction error 0 deg on every clip, leg scale 0.993 (A5: Wren's own mesh). Studio rows: gaits on the
treadmill at their own pace (sneak crouched / carry / crawl), idles `idle` / `carry`, stance changes `crouchIdle`,
strikes and the lift `idle`, the lay-down `carry`, the hauler `crouchIdle`, the ledge pull `ledge`.

## Files
New: `scripts/mocap/mixamoEmit.mjs`, `scripts/mocap/data/mixamo-clips.json`, `src/anim/clips/mixamo/*.ts` (12),
`tests/mixamoEmit.test.ts`, `docs/mixamo-retarget/CLIPS.md`, this report. Edited: `src/anim/mocapSources.ts` (keyed
block only), `scripts/mocap/takesdoc.mjs` (the `file` parameter). `docs/art-credits.md`: the 12 rows M6 wrote already
match the paths and names; unchanged.

## Commits
- `f34160bdd` merge of `feature/mixamo-retarget` (M1 dump, M2 adapter): the M3 base (98091bc2) did not hold them.
- `c43f0fe8e` WIP m3 (save): emitter, recipes, takesdoc parameter, the 12 modules, rows, CLIPS.md.
- `f8f4c901f` emitter test and the recipes' limits.
- this report.

## Tests and results
- `npm run typecheck:fast`: clean. `npx eslint tests/mixamoEmit.test.ts`: clean.
- `npx vitest run tests/mixamoEmit.test.ts tests/mocapSources.test.ts tests/animStudio.test.ts tests/nowPlaying.test.ts
  tests/mixamoTake.test.ts tests/mixamoMap.test.ts`: 72 passed, 1 skipped (M2's CMU regression, no CMU take here).
- No e2e, no Blender, no GPU (not needed; the Studio look is the laptop's `e2e-studio`).

## Limits
- No leg channel from a capture: the keyed format's legs are the foot planner's IK legs under the captured pelvis, so
  kneels, the hauler and the prone crawl show trunk and arms over a deep squat / folded legs, not knees or legs on the
  floor. The prone crawl's dragging toes read as contacts (slide 9-21 cm).
- `pulling_up_to_a_ledge` climbs about 1.75 m: on flat Studio ground Wren rises into the air; the game wiring must move
  the root as the climb-up does.
- Not emitted: `clav`, `fing`, `fore` (A7). Every recipe keeps `head` only.
- Stance changes keep the take's crouch depth, not the game's crouch height (I3 maps them onto the stance clock).

## Open items
- Rerun after the M2 spine fix (Spine -> spine, Spine1 / Spine2 -> chest): the one command above rewrites the modules,
  rows and CLIPS.md; then `npx vitest run tests/mixamoEmit.test.ts tests/mocapSources.test.ts` and commit the changed
  files. No hand-tuning around the torso was done.
- A7 extra channels (clavicles, finger curl / spread, forearm twist) from the take's shoulder, finger and hand bones.
- Module size: about 0.54 MB of generated TS for the 12 (the 9.6 s lift and the 10 s carry idle are the largest); the
  Studio imports them eagerly. Lower `LOOP_FPS` / trim the lift if the bundle needs it.
- The two shimmy-mirror check in PLAN M3 belongs with M4's channel clips (both traversal), not done here.
