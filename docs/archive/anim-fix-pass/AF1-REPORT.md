# AF1 - Fast-gait feet: no crossing, no sticking (report)

Branch `feature/afp-af1` (off `feature/anim-fix-pass` 69662cf2, AF0 merged at dba5b6a9). Michael P1: "turning when
walking is ok legs wise but anything faster is bad, legs sticking and overlapping eachother".

## What changed and why
1. **Clip track measured on the planted frames and re-centred** (`scripts/mocap/emit.mjs`, `STANCE_HALF`). The old
   `TRACK_HALF` was a whole-cycle mean (swing arc included) and never re-centred, so the planted ankles sat narrow and
   off the midline (jog -6.0 / +5.0 cm, run -5.8 / +1.7, sprint -1.7 / +5.2). Now each side's mean planted ankle x sits
   at -/+ STANCE_HALF: jog 6.0, run 5.5, sprint (run spec) 5.5 cm. The walk keeps its old track exactly (re-centred it
   left e2e-anim's walk track / knee-out ranges in mocapSwitch, and Michael called the walk fine). Regenerated from the
   intermediates (`build/mocap/*.json`, `build/mocap/m3/sprint.json`; the unchanged emitter reproduced all four files
   byte for byte first). `emit.mjs` now also re-emits the M3 sprint loop (`M3_CYCLES`) and takes `--no-doc` (skip the
   TAKES.md section). `walk.ts` regenerated identical; `jog.ts`, `run.ts`, `sprint.ts` change only their `feet` x and `half`.
2. **Planner half floored at the clips' planted half** (`animGraph.ts` writeTargets, `MOCAP_FEET_TRACK`): on the mocap
   share with clip feet, from 2.1 m/s (in full at 2.6) the planner's stance half is floored at `kHalf` instead of
   Body `trackMul` 0.05 (0.35 cm). The planner's turn steps landed on the midline and its uncross gap (FREE_GAP of the
   stance) was ~0.6 cm: the outside foot came across in jog / run turns. `gapNeed` follows (it is read from lX / rX).
3. **Outside foot out by the arc's sagitta in turns** (same block, `arcK` 0.19, `arcMax` 5 cm): a foot planted on a
   straight chord under a curving body comes in toward the midline by its stance's end (jog 3 m/s x 4 rad/s: 1.4 cm with
   2. alone). Only the planner's steps read it.
4. **Clip feet hand a turn to the planner at 1.5 rad/s at a jog+, with hysteresis** (`clipFeet`, `MOCAP_FEET_TURN`):
   off past 1.5, back under 1.0 only after the turn has stayed under 1.0 for 0.3 s (gait clock time), and (from 2.1
   m/s) not while the pace changes faster than 1.5 m/s^2 (a CT 180's pace dip recovering through the walk -> jog band
   was taken back on the walk duty and handed off again 5 frames later). Before, `twistMax / stance` let the clip keep
   pinned feet to ~2.3 (jog), 3.7 (run), 4.7 (sprint) rad/s with no hysteresis. The walk keeps `MOCAP_FEET.turnMax`.
5. Not done from the plan's list: CLIP_PIN_NEED (cause 4) and the crossed rule step on a clip-planted foot. Measured,
   no plant runs past the clock's stance (+0.013 s worst steady, before and after), and a tried crossing lift in
   `footPlanner.holdOrStep` changed no row (the swing foot is passing when it would fire), so `footPlanner.ts` is untouched.

Switch OFF: byte-identical (md5 of the OFF joint dump over walk / jog / run / sprint straight, turning and CT 180s:
da78fcb8... before and after). Every new path needs clip feet (`mFeet`, `CF.valid`), so the placeholders stay
bit-identical too (mocapSwitch).

## Numbers (tests/mocapRunFeet.test.ts, `AFP_REPORT=1`; headless Wren, 60 Hz, CT driver, mocap ON)
Planted track = worst planted ankle offset from the hip midline in the facing frame (cm, + own side), L / R; gap = feet
gap at passing (cm); flips = most clip feet ownership changes in 0.25 s (total).

| v m/s | run | before trk L / R, gap, flips | after trk L / R, gap, flips |
| --- | --- | --- | --- |
| 3 | straight | 5.2 / 2.5, 15.9, 0 | 5.2 / 3.4, 16.9, 0 |
| 3 | 1.5 R / L | 4.0 / 1.8, 14.7 - 5.0 / 2.9, 16.2 | 4.0 / 2.8, 13.3 - 4.9 / 3.9, 12.6 (1 flip each) |
| 3 | 2.5 R / L | 1.1 / 6.5, 10.7 - 8.1 / **-0.3**, 10.7 | 6.5 / 6.5, 16.1 - 8.1 / 5.1, 16.1 |
| 3 | 4 R / L | **0.2** / 6.4, 10.3 - 8.0 / **-1.2**, 10.3 | 6.0 / 6.4, 16.2 - 8.0 / 4.5, 16.2 |
| 4 | straight | 5.3 / **0.9**, 13.0 | 5.1 / 4.5, 16.3 |
| 4 | 1.5 R / L | 4.5 / **0.5**, 12.6 - 5.5 / **1.0**, 13.2 | 4.8 / 4.4, 11.5 - 5.4 / 5.1, 14.3 |
| 4 | 2.5 R / L | 4.1 / **0.0**, 11.9 - 5.4 / **1.4**, 13.6 | 5.2 / 8.0, 15.6 - 7.9 / 5.4, 15.7 |
| 4 | 4 R / L | **0.4** / 7.9, 11.4 - 7.7 / **0.7**, 11.5 | 5.4 / 7.9, 16.4 - 7.7 / 5.7, 16.4 |
| 5 | straight | **1.0** / 4.1, 10.4 | 4.6 / 4.4, 14.4 |
| 5 | 1.5 R / L | **1.1** / 4.3, 10.6 - **0.9** / 3.7, 10.0 | 4.4 / 5.0, 13.0 - 4.4 / 3.1, 13.1 |
| 5 | 2.5 R / L | **1.2** / 4.3, 10.3 - **0.7** / 3.5, 9.8 | 4.8 / 7.8, 14.9 - 7.4 / 5.2, 14.9 |
| 5 | 4 R / L | **1.2** / 3.9, 9.5 - **0.2** / 3.5, 9.5 | 5.1 / 7.8, 15.2 - 7.4 / 5.5, 15.2 |
| 3 / 4 / 5 | weave (yr 1.8 sin, 1.2 s) | 4.3 / 1.6 - 4.8 / 0.8 - 1.0 / 4.1, 0 flips | 4.6 / 3.2 - 5.0 / 4.7 - 3.6 / 4.0, 0 flips |
| 3 / 4 / 5 | CT flick 90 (report only) | -3.5 / 0.2 - 1.9 / -5.8 - -0.9 / -1.3, flips 1 / 1 / 2 | -3.5 / 0.3 - 2.3 / -3.1 - 2.7 / 2.2, flips 1 |
| 3 / 4 / 5 | CT flick 180 (report only) | 0.1 / -6.0 - -5.0 / -2.3 - -0.5 / -4.1, flips 2 / 3 / 1 | 0.2 / -6.2 - -4.9 / -1.6 - 1.6 / -1.1, flips 1 |
| 1.4 | walk turns 1.5 / 2.5 / 4 both ways | as after (identical) | -3.9 / 9.0, 9.9 - 6.2 / -6.9 - -6.1 / 6.7 - 4.3 / -9.8 - -8.6 / 2.0 - 0.1 / -10.9 |

Bold: under the +2 cm bar. Plant past stance (s): jog 0.008, run 0.002, sprint 0.013 before and after. Slide: 0.0 cm
everywhere. Twist at lift: jog 13-14, run 7-11 (before 9-14), sprint 5-7 deg (before 7-20).

## Acceptance (PLAN.md AF1)
| bar | result |
| --- | --- |
| no planted foot crossed (track >= +2 cm each side), jog / run / sprint straight and 1.5 / 2.5 / 4 rad/s both ways | PASS (worst 2.8 cm, jog 1.5 R) |
| passing gap >= 7 cm | PASS (worst 11.5 cm) |
| no plant longer than stance + 0.1 s while turning > 1 rad/s | PASS (worst +0.013 s) |
| contact slide <= 1.5 cm per plant | PASS (0.0 cm) |
| no ownership flip more than once per 0.25 s | PASS (steady, weave, flicks: 1 at most) |
| walk-turn numbers unchanged (+-10 %) | PASS (identical) |
| OFF dumps untouched | PASS (md5 identical) |
| tests mocapRunTurn, mocapSwitch, mocapPlayer, footPlanner, footTurn, mocapRunFeet | PASS (all) |
| e2e-anim (turn feet), e2e-clip | PASS (both) |

## Runs
- Vitest (single files): mocapRunFeet 6 + 1 skipped (report), mocapRunTurn 4, mocapSwitch 13, mocapPlayer 10 + 1 skipped,
  footPlanner 12, footTurn 14; also mocapSprint 10, mocapFix2 11, mocapQuickStop 7, mocapShortStart 1, mocapStopPitch 1,
  mocapGuards 3, mocapStrafe 12, mocapCrouch 6, mocapCrouchShift 2, turnCrossRig 1, turnFollow 48, mocapDefault 3,
  crouchEntryRig 1, keyedCrouch 8, posture 9, animFixPass 1: all pass.
- `npx tsc --noEmit -p .` clean; eslint on animGraph.ts and mocapRunFeet.test.ts clean (emit.mjs is eslint-ignored).
- e2e (desktop lane 2, port 4192, E2E_GPU=1, E2E_JOBS=1, fresh build at 8206f867): e2e-anim ok (48 s, incl. the turn feet rows), e2e-clip ok (12 s).
- After sheets (GPU, port 4189, same commands as before/README.md, P1 rows only): docs/archive/anim-fix-pass/after-af1/ on-walkturn, on-jog, on-run, on-run-back, on-sprint. on-run-back vs before: the planted feet sit slightly wider of the midline at 0.40-0.45 s (before: on / across it); the change is small at a glance, the numbers above carry it. OFF sheets and P2-P4 sheets not redone (untouched by AF1).

## Open items
- CT flicks (90 / 180 deg at 6.1-7.85 rad/s, outside the plan's bars): the planted foot still reads across the hip
  midline (-3 to -6 cm at jog / run). In the root frame it is at the midline (-0.5 cm): the hips shift ~3 cm over it in
  the flick, which is the pelvis / carriage (AF2's area) more than the foot. The flick ownership flips are fixed.
- `docs/mocap-trial/TAKES.md` "clips" section not rewritten (`--no-doc`); its jog / run half numbers are the old ones.

## Changelog
- Mocap jog / run / sprint feet no longer cross or stick in turns: the clips' planted track is centred and measured on
  the stance (emit.mjs), the planner's turn steps keep the clips' stance width (and the outside foot steps out by the
  turn's arc), and the clip feet hand turns to the planner from 1.5 rad/s with hysteresis.
