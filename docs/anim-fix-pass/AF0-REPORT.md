# AF0 report - measurement harness (branch feature/afp-af0, off feature/anim-fix-pass 69662cf2, merged 73e71142)

## What
- `tests/helpers/afpMeasure.ts` (new): the harness. One exported function per measure, JSDoc'd, all taking a `Rec`
  (mocapMeasure) and, where a `Rec` lacks the data, a `Probe` (keepElbowOut state, gun segment, kneel, stick).
- `tests/animFixPass.test.ts` (new): report-only (always passes); runs the AF0 scenario set and writes
  `docs/anim-fix-pass/before/numbers.md` (committed).
- `tests/helpers/mocapStrafe.ts`: `aimRun` gains `opts` (`weight` pistol 0.7, `wall` drawn crouched back-to-wall slide), the
  stick's `crouch`, the kneel rule (`KNEEL_STILL`, playerController), `R.yaw` = the visual yaw; new `CROUCH_PLANS`
  (crouched steady, stop-go, flips through the dead zone, wall slide, wall reversal) = polish 7's plan entries. Defaults
  unchanged: tests/mocapStrafe.test.ts 12/12 pass.
- `scripts/anim-audit.mjs`: crouch gear caps (3 places) now `GEARS.crouch` 0.85 / 1.3 / 1.7 / 2.15 / 2.6 (gear 6 = 2.6,
  unreachable crouched); remote ready wait (below).
- `scripts/anim-sheet.mjs` (planner addition): `wallcrouchslidedrawn` / `wallcrouchslidedrawnp` (rifle / pistol: cover,
  crouch, draw, slide right, reversal left, still). Not rendered (no GPU slot); scenario syntax mirrors `wallcrouchslide`.

## Exported API (afpMeasure.ts)
- Runs: `runGait(v, yr, {crouch, warm, sec, mode, target})` (ctRun), `runAimed(plan, {weight, wall, mode})` (aimRun) -> `{R, P, pistol}`;
  `makeProbe`, `decimate(R, 2)` (30 Hz view of the 60 Hz sim: every 2nd frame).
- Feet: `plantedTrack` (signed planted-ankle offset from hip midline, facing frame, per foot; + footTrack pelvis-frame min),
  `passingGap`, `plantDurations`, `contactSlideWorst`, `ownershipFlips` (flips/s, max per 0.25 s).
- Arms / trunk: `wristJerk` (root-frame 2nd difference, cm/frame), `elbowOutRate` (keepElbowOut changes/s), `trunkPitch`,
  `standingHipY` / `pelvisBelowStanding`, `bankRoll(R, sg)` (trunk bank into the turn, pelvis roll, shoulder roll).
- Balance / hips: `comOffset` (CoM fore-aft vs support midpoint), `pelvisLateral` (p2p, step, beyond pace x dt), `rampDelta`.
- Gun / hand: `gunClearance` (gun segment vs leg and trunk capsules, `CAPSULE`, `GUN_EXTENT`), `gripLateral` (right wrist vs hips:
  mean, p2p, per-frame step, per-cycle spread), `kneelSummary` (episodes, side changes, kneel frames within 0.4 s of a stick flip).
- Sets: `gaitScenarios`, `crouchScenarios`, `strafeScenarios`, `wallScenarios`, `measureAll(run, sg)` -> flat `Measures`.

## Headline before numbers (mocap ON, 60 Hz; full table docs/anim-fix-pass/before/numbers.md)
- Feet, planted-ankle offset (cm, < -0.5 crossed): jog 3.0 turn 4 rad/s L/R ankle 8.0 / -1.2 and 0.2 / 6.4; run 4.0 turn 4 R: 0.4 / 7.9
  with feet gap -2.4 cm (crossed); sprint 5.0 0.2-1.2 on the left foot (< +2 cm bar); walk turn control 2.5 rad/s gap -0.7..-1.3.
  Passing gap: run 4.0 straight 13.0, turns 11.4-13.6; sprint 9.5-10.6. Plant max: walk 0.47 s, jog 0.15, run 0.10, sprint 0.08.
  Slide <= 0.01 cm everywhere. Ownership flips 0 in these runs (clip feet never hand over: see open items).
- Run carriage: pelvis below standing jog 6.6 / run 11.6 / sprint 18.4 cm; trunk 12.2 / 15.0 / 31.9 deg; pelvis roll run -4.6 deg;
  bank into turn run 4.6 R / -4.6 L (= the constant capture roll, unchanged by turning: 4.6 straight too); wrist jerk max 2.06 (run) /
  3.54 (sprint) cm/frame at 60 Hz, 6.7 / 11.9 at the 30 Hz view. keepElbowOut: 0 changes/s in every headless gait and strafe run.
- Crouch (trunk deg / hips cm / CoM-dbl cm / pelvis lateral p2p / step cm): idle 28.4 / 50.6 / 4.2 / 0.6; gear 1 43.1 / 68.7 / 15.0 /
  8.4 / 47; gear 2 35.5 / 65.1 / 13.2 / 5.0 / 56; gear 3 28.0 / 61.7 / 11.2 / 3.3 / 64. Gear 1 -> 3 ramp: trunk -15.0 deg, hips -6.9 cm.
- Crouched aimed strafe (rifle / pistol): steady pelvis lateral p2p 2.2 cm, grip-hand step 0.4-1.0 cm/frame; stop-go 8.1-10.9 cm p2p,
  flips 12.7 cm p2p; kneel 10 episodes / 10 cycles, 0 side changes in this harness; pistol hand 18 cm vs rifle 23 cm off the hips
  (pistol sits at the knee); gun vs trunk +0.9 rifle / +8.8 pistol cm, gun vs legs >= +37 cm (clear: capsule model, see below).
- Drawn crouched wall slide: gun vs legs -2.2 to -10.5 cm and vs trunk -4.3 to -16.0 cm (rifle), pistol -1.4..-8.6 / -12.3..+5.9;
  reversal: pelvis p2p 7.7 cm, feet gap -8.7 cm (crossed), slide 2.83 cm, grip-hand step up to 33.5 cm/frame.

## Remote audit wait
Cause: `startMode` in scripts/e2e-net-lib.mjs waits 8 s (sim time) for `session.allReady`; under `E2E_NETSIM=typical` the client's
ready crosses the simulated link with the host near 28 fps. anim-audit.mjs now has `startModeSlow` (re-sends ready every 2 s, up to
40 s, 30 s for the client state); e2e-net-lib.mjs untouched (shared). RUN RESULT: NOT RUN. Both desktop lanes were held (CPU 97%) and dist was stale, so the lock rules blocked it; the fix is syntax-checked only. Command for the laptop: `E2E_GPU=1 E2E_NETSIM=typical node scripts/anim-audit.mjs <url> --remote --quick` (script C:/NightShift/afp-af0-remote.sh does lock + build + run).

## Tests
vitest tests/animFixPass.test.ts pass (report), tests/mocapStrafe.test.ts 12/12, `tsc --noEmit -p .` clean, eslint on the three
test files clean, `node --check scripts/anim-audit.mjs` and anim-sheet ok.

## Open items / caveats
- Wall run is the harness's stand-in (wall behind the root, body side-on from `wallYawOffset`, `wallSide` = travel direction), not the
  game's wall solver: wall numbers are directional. Its reversal flips `wallSide`, which is what P4 describes.
- Gun capsule: grip node + fixed extents along its +z (rifle -0.2..+0.55 m, pistol -0.03..+0.18); radii in `CAPSULE`. Approximate.
- 30 Hz is a subsample of the 60 Hz sim (ctRun / driveRig are fixed 60 Hz and not in AF0's files).
- keepElbowOut never fires in the headless gait / strafe runs (only the wall run: 1.25 activations/s); AF2 may need a game-side
  probe for the "random hands" cause. Clip-feet ownership never flips headless either (clipOn constant): AF1 should check it e2e.
- Kneel side never changes in the stop-go harness: the lead-driven flip of animGraph.ts:1159 needs the real planner lead after a sideways
  stop; AF4b should re-check with the anim-sheet `aimcrouchstrafep` or an e2e.
- Changelog line (the parent's fragment covers the branch): "Animation fix pass: measurement harness and before numbers."
