# AF1 - checker (fresh)

Branch `feature/afp-af1` at 6ae0869e vs `origin/feature/anim-fix-pass` (0c886207). Reviewed PLAN.md "AF1", AF1-REPORT.md
and the full diff.

## Verdict: PASS

## Acceptance bars (mocapRunFeet, AF0 harness `tests/helpers/afpMeasure.ts`, 60 Hz, both directions)
| bar | check |
| --- | --- |
| planted track >= +2 cm each side, jog / run / sprint straight and 1.5 / 2.5 / 4 rad/s | asserted in `fails()` per run; test passes (report worst 2.8 cm, jog 1.5 R; before 9 rows under bar, worst -1.2) |
| passing gap >= 7 cm | asserted; worst 11.5 cm |
| plant <= stance + 0.1 s turning > 1 rad/s | asserted; worst +0.013 s |
| slide <= 1.5 cm | asserted; 0.0 cm |
| ownership flips <= 1 per 0.25 s | asserted on steady runs and the 1.8 rad/s weave; CT flicks report-only, 1 at most |
| walk turns within +-10 % | asserted vs before numbers at +-1.5 / +-2.5 rad/s (10 % + 2 mm); report says identical |
| OFF untouched | every new path gated by `hF > 0` (needs `mFeet`, `keyMocap`) or inside clipFeet's mocap branch; mocapSwitch passes (OFF md5 / placeholders) |

## Code rules
- No hot-path allocation: only scalars, fields on the graph, `as const` tables; no closures, no temp vectors.
- No Math.hypot. tsc clean, eslint clean on animGraph.ts and mocapRunFeet.test.ts.
- Files: animGraph.ts, emit.mjs, clips jog / run / sprint (regenerated, walk.ts identical), new mocapRunFeet.test.ts,
  docs, one changelog fragment. footPlanner.ts untouched (report explains why cause 4 / crossed-rule step were dropped:
  bars met without them). All inside AF1's file list.

## Required fixes
None.

## Polish list
- src/anim/animGraph.ts:2651 - the new `cf*` fields sit between clipFeet's JSDoc and the method, so that JSDoc now
  attaches to `cfTurnOk`; move the fields above the comment.
- src/anim/animGraph.ts:2980-2981 - `MOCAP_FEET_TRACK` / `MOCAP_FEET_TURN` added at file end, outside the plan's
  "2540-2660 only" range (harmless; note for AF3 / AF4b merges on the same file).
- tests/mocapRunFeet.test.ts:95 - the walk control has no before numbers for +-4 rad/s, so those two rows are reported, not asserted.
- `docs/archive/mocap-trial/TAKES.md` clip half numbers stale (report open item, `--no-doc`).
- CT flick 90 / 180 planted foot reads -3 to -6 cm across the hip midline (outside the bars; pelvis shift, AF2's area).

## Tests run (headless, single files, at 6ae0869e)
- mocapRunFeet: 6 passed, 1 skipped (report)
- mocapRunTurn: 4 passed
- mocapSwitch: 13 passed
- mocapPlayer: 10 passed, 1 skipped
- footPlanner: 12 passed
- footTurn: 14 passed
- animFixPass: 1 passed
- `npx tsc --noEmit -p .`: clean; eslint (animGraph.ts, mocapRunFeet.test.ts): clean
- e2e not rerun (report: e2e-anim / e2e-clip ok at 6ae0869e's build).
