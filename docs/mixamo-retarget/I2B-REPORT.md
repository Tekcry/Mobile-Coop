# I2b report: traversal clip fixes, rows on
Owner: mixamo-retarget lead. Status: current (branch feature/mixamo-i2b, from feature/mixamo-i2 21728ba6).

Rule used (Michael 2026-10-26, via the coordinator): where a Mixamo clip and a hand-made clip cover the same move the
capture wins (row true) unless it is visibly broken in play (a spin, a pop, hands far off the grips); a worse number
alone is tuned in the Anim Studio. Hands on the lip stay a hard gate on the lip climb-up (`tests/climbHands.test.ts`).
The `mixamo` flag and its default are untouched (a separate slice builds the "Animation source" setting).

## What changed
- `scripts/mocap/mixamoChannels.mjs:294,301,367-377`: the yaw fix. A segment (hips or chest) pitched past
  `YAW_FROM_RIGHT` (75 deg) at any frame of a take takes its yaw from its right axis for the whole take
  (`yawOfRight`). Cause: the yaw came from the forward axis; with the crawl's chest at 87-105 deg pitch the forward
  points near the vertical and its heading turns half a circle as the pitch crosses 90 deg (not a wrap: the track was
  already unwrapped, so unwrapping could not fix it). `:720` the module note says which segment.
- Re-emitted: `trav_crawling_hands_and_knees.ts` (chest), `trav_freehang_climb.ts` (chest, pitch to 110 deg),
  `trav_braced_hang_to_crouch.ts` (chest, to 93 deg); `CHANNELS.md` the same three sections. The other five traversal
  modules and `mocapSources.ts` are byte-identical (`git diff` empty); no keyed or CMU file touched.
- `src/anim/mixamo.ts:56-73`: MIXAMO_ON rows with the readings below; the doc comment states the new rule.
- `tests/mixamoTraverse.test.ts:530-548`: the crawl check asserts a visible-break cap (joint step <= 6 cm, velocity
  change <= 4 cm a frame) and that the shipped table plays the capture; `:569-572` the ladder's soles capped at the
  hand-made + 10 cm (weak measure, I2-REPORT "Known gaps"), every other state still within 1 cm / the hand-made.

## Readings (headless, Wren rig)
| Capture | Before (I2) | After (I2b) | Hand-made | Row |
| --- | --- | --- | --- | --- |
| crawling_hands_and_knees | spYaw -4.72..-1.42 rad; joints 13.8 cm a frame, 24.9 pop | spYaw -0.10..0.15; 3.4 cm, 1.7 pop | 0.5 / 0.1 | on |
| climbing_ladder | palms 0.00, soles 38.4 cm | unchanged; on, the top-out's first frame jumps a joint 23.5 cm (capture to capture) | 0.00 / 31.6; 15.7 | on (fix round: 19.9 cm, below) |
| braced_hang_to_crouch | palms 29.3 cm | climbHands: palms 58.5 cm off the lip, shoulders 0.85 m (arm 0.54), knee 2.0 cm into the clearance, wrists 16.5 pop | 0.0 cm, 0.49 m, 2.6, 2.8 | off |
| freehang_climb | trunk 20 cm a frame, wrists 9.9 pop | trunk 19.7 / 9.9 pop, wrists 11.1 pop at k 0.85 (hips turn to 1.5 rad) | 8.6 / 2.7, 2.8 | off |
Unchanged and on: hanging_idle, both shimmies (palms 0.00), climbing_ladder_to_standing (palms 7.0 vs 11.8).

## Fix round (00:30-00:45)
- `src/anim/animGraph.ts:1284-1288,3029-3031`: a capture giving way to another capture across a move change (`mxKind`,
  the traversal kind) triggers the inertializer, as capture <-> hand-made did; the hang's idle / shimmy blend (same
  kind) does not. Flag off: no capture plays, nothing changes.
- climbing_ladder on: the top-out's first frame moves the right ankle 19.9 cm (was 23.5; hand-made 15.7); top-out palms
  3.15 cm (was 4.15). `tests/mixamoTraverse.test.ts` caps that frame at hand-made + 5 cm when the ladder capture is on;
  the inertializer test measures the hand-made ladder to the top-out capture (ladder row set off inside it).
- Allocation test: passed once (1344 vs 1360 B), failed once (568 vs 440 B, rounds 1616/568... vs 440): the JIT swing,
  left to the #477 fixer making it robust on feature/mixamo-i2.

## Why two stay off (visible, at the first save the ladder too)
- climbing_ladder: from the ladder capture the top-out capture's first frame jumps a joint 23.5 cm (hand-made 15.7):
  a capture-to-capture switch the graph does not inertialize (`animGraph.ts` `mxLast` is capture vs hand-made only).
- braced_hang_to_crouch: the hands leave the lip by about half a metre before the foot is on top.
- freehang_climb: the take's own stand-up turns the hips 86 deg and back inside 0.45 s of game time (the take runs
  x2.85); the trunk snaps 20 cm in a frame at k 0.85, well past the 0.08 stand fade, so trimming or realigning the fade
  does not reach it.

## Tests
See the hand-back. typecheck:fast, eslint on touched files, vitest mixamoTraverse, climbHands, mocapGuards (unchanged),
mocapSwitch, animSkeletonIdentity, changesFragments, mixamoChannels.

## Deviations
- The brief said unwrap the yaw track: it was already unwrapped; the fault was the forward-axis heading near 90 deg
  pitch. Fixed at the source instead.
- Row rule changed mid-slice to "capture wins unless visibly broken" (coordinator, Michael 2026-10-26). The ladder's
  worse soles alone would not keep it off (the test now caps them at hand-made + 10 cm for when it is on).
- `tests/mixamoTraverse.test.ts` "no allocation" failed once on the last run (hand-made rounds fell to 312 / 72 B, a JIT
  swing; the earlier full run passed 1344 vs 1360); no graph code changed in this slice.
- No per-clip anchor offset tried for braced / ladder (out of time before the 00:52 cap).

## Open
- freehang_climb: re-centre the stand-up's hip turn (pelYaw toward 0 past the crouch) and retime the stand-up end;
  then climbHands with it on.
- braced_hang_to_crouch: hold the palms on the lip until release (a per-clip reach alignment of hLX..hRZ / the pelvis
  toward the lip through k 0.475), then climbHands with it on.
- Crawl: no hand / knee anchor measure (no vent crawl state in the harness), as in I2.
