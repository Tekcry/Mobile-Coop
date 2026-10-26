# I6 report: the Mixamo locomotion set on Wren
Owner: mixamo-retarget lead. Status: current (branch feature/mixamo-i6).

## What changed
- Dump: `scripts/mocap/mixamo.mjs --only <slug,...>` (a partial run; the manifest keeps its other entries). The 17 new
  FBX dumped under `heavy2.lock` (heavy.lock held by the laptop queue), Blender `-b`, below normal; the pack-* folders
  and the other new singles not touched.
- Emitter (`scripts/mocap/mixamoEmit.mjs`): kind `turn` (emit.mjs's turn path: by the yaw turned, cut at `turnDeg`);
  gait band `strafe` (travel +x / -x); `cycles` (a take holding several cycles keeps its first: Jogging holds 3);
  `faceTake` (a sideways loop's root turned to the take's facing; the Mixamo strafes turn hips 68 deg and chest 51 deg
  into the travel while the head looks ahead, so m3.mjs's pelvis-mean faceRoot would face the travel; a take whose chest
  faces away from its rest facing, Crouched Sneaking Left, is reversed); a Mirror take's Studio label keeps its note.
- 30 recipes (`scripts/mocap/data/mixamo-clips.json`), 17 new modules `src/anim/clips/mixamo/*.ts`, 17 Studio rows
  (`src/anim/mocapSources.ts` keyed block), `CLIPS.md` regenerated (the 12 older modules came out identical).
- `src/anim/mixamo.ts`: `MIXAMO_LOCO` 11 rows (slot each), `MIXAMO_ON` rows. They play only with the `mixamo` flag on
  (the "Animation source: Mixamo" setting's switch) and "Mocap locomotion" on (A2); flag off is `MOCAP_SET` itself.
- Merged origin/feature/mixamo-i2 9be7701f (the capture path allocates nothing): mixamoSwitch (e) passes.
- Tests: `tests/mixamoLoco.test.ts` (d) readings, `tests/mixamoEmit.test.ts` (turn, faceTake, new validation, sideways
  feet), `tests/mixamoDriver.test.ts` (`--only`), `tests/mixamoSwitch.test.ts` (I1 tests isolate their rows).

## Fit to the game (speeds and timing unchanged)
Gaits play on the game's gait phase with the clip feet scaled to the game stride (walk x0.67-0.83, jog x1.16-1.42,
strafe x0.2-0.44); start / stop by progress over the CMU slot seconds; turns by the yaw turned (90 deg a clip). The
Mixamo walking turns turn only 34-39 deg: spread over the game's 90.

## Readings (headless Wren rig, mocap switch on, against CMU in the same move)
| Clip -> slot | Mixamo | CMU | Row |
| --- | --- | --- | --- |
| walking -> walk 1.6 m/s | step 10.8 deg, knees 0.79-0.99, knee out 1.6, elbow 14.9 cm | 13.4, 0.55-0.82, 3.6, 6.3 | on |
| jogging -> jog 3.0 | 17.3, 0.45-0.87, 6.1, 13.0 | 10.7, 0.65-0.97, 2.7, 5.8 | on |
| running -> run 4.3 | **25.1**, **-0.38**-1.88, **25.3**, 15.1 | 13.8, 0.80-1.25, 5.1, 5.0 | off |
| fast_run -> sprint 5.0 | 22.9, **-0.18**-1.36, **20.0**, 21.7 | 24.8, 0.75-1.29, 2.6, 8.0 | off |
| start_walking -> start | 20.6, 0.51-0.90, 4.9, 15.2 | 17.0, 0.50-0.98, 4.9, 7.0 | on |
| stop_walking -> stop | 22.0, 0.49-0.98, 4.8, 19.4 | the same as start | on |
| right_turn -> turnInPlace (spin 3 rad/s) | 20.2, 0.61-1.17, 10.4, 12.9 | 20.2, 0.51-1.19, 10.9, 7.2 | on |
| walking_left_turn / _mirror -> turnMoveL / R | 15.4, -0.22-1.58, 18.4, 7.5 / 9.2 | 15.4, -0.22-1.58, 18.4, 6.8 | on |
| left / right_strafe_walking -> strafeL / R (aim 0.7) | 11.4, 0.60-2.11, 1.6, 3.9, gap 9.0 | 16.5, 0.63-2.16, 3.3, 3.9, gap 9.4 | on |

Planted slide 0.0 cm everywhere. "Visibly broken" (the test's `broken`): slide over 3 cm, a pop over 25 deg a frame,
knees under 0.2 x hips, a knee over 12 cm out, elbows over 25 cm out (each also past CMU by a margin). Mixamo carries
its elbows 13-22 cm out (CMU 5-8): logged, judged a style, not broken. Studio only: run_to_stop, left_turn, the
crouched sneaks, the backwards walk and run (no game slot; backwards emitted in place as loops).

## Tests
- `tests/mixamoLoco.test.ts` 16/16; `npx vitest run` of mixamoSwitch, mixamoStance, mixamoTraverse, mocapSources,
  animStudio, nowPlaying, mixamoEmit, mixamoDriver, mixamoTake, mixamoMap, mocapGuards: 118 passed, 1 skipped (M2's CMU
  regression) after the mixamoSwitch fix (10/10, (e) allocation included). `npm run typecheck:fast`, eslint: clean.
- Pending laptop: affected-e2e for `src/anim` (e2e-anim, e2e-move, anim-audit), the Studio look (`e2e-studio`).

## Open
- Run / sprint: the knees cross at the game's run band (the take runs at 5.3-5.6 m/s, scaled down; a narrow crossover
  track under Wren's planner feet). A re-take or a track widening in the emitter could bring them back.
- The elbows: an arm-in layer on the Mixamo share if Michael finds the arms wide.
