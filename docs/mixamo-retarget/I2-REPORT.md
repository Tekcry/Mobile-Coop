# I2 report: traversal captures on Wren
Owner: mixamo-retarget lead. Status: current (branch feature/mixamo-i2).

## What changed
- `src/core/flags.ts:54,133`: the `mixamo` flag (`?mixamo=0/1`, null = off; default OFF until the orchestrator rules, A1).
- `src/anim/mixamo.ts`: the slot table `MIXAMO_TRAV` (:38), `MIXAMO_ON` (:55), the clocks (`HANG_IDLE_SECONDS`,
  `SHIMMY_TRAVEL`, `SHIMMY_SPEED`, `STAND_FADE` :76), `MIXAMO_KEEP` (:91, the pelvis offset kept hand-made: palms on the
  grips), the resolved table `WREN_TRAV` (:99) rebuilt once per change by `resolveMixamo` (:104), `setMixamo` (:123),
  `setMixamoStudio` (:129), `mixamoStudioEntry` (:138).
- `src/anim/animGraph.ts:1274-1279`: Wren (`wrenReady`) with a filled slot plays `mixamoTrav` (:2927), else the
  hand-made `TRAVERSE_CLIP` as before; `:1310-1318` the climb-up's origin and the hang clocks. `mixamoTrav` passes no
  double across a call (`mxDt` / `mxT` / `mxW` fields, `mxOver` :3022, `keepSave` / `keepApply` :3035-3045), so the
  capture path allocates no more than the hand-made path (a call the graph does not inline boxes each double, 16 B).
- `src/anim/studio.ts:13,280`, `src/game/studioStage.ts:466`: picking a capture loop in the Anim Studio plays it on the
  Studio's Wren whatever the flag says; the loop's text says when a capture stays hand-made in matches.
- `TESTING.md`: the `?mixamo=1` line.

## Anchor errors (headless, Wren rig, AttachGrips; tests/mixamoTraverse.test.ts, tests/climbHands.test.ts)
Palms: rig.gripError 3 frames after a grip lands. Soles: the ankle's drift while its plant holds still.

| Capture | Palms (capture / hand-made) | Soles (capture / hand-made) | Other |
| --- | --- | --- | --- |
| hanging_idle | 0.00 / 0.00 cm | 0.00 / 0.00 cm | |
| braced_hang_shimmy_right | 0.00 / 0.00 cm | 0.00 / 0.00 cm | |
| braced_hang_shimmy_left | 0.00 / 0.00 cm | 0.00 / 0.00 cm | |
| climbing_ladder | 0.00 / 0.00 cm | 38.4 / 31.6 cm | hand-made foot lift kept: palms 5.1-5.9 cm |
| braced_hang_to_crouch | 29.3 / 0.35 cm | 0.00 / 0.00 cm | trunk near upright as the knee comes on |
| freehang_climb (stand-up end) | 0.35 / 0.35 cm | 0.00 / 0.00 cm | climbHands: trunk 20 cm a frame (limit 9.6), wrists 9.9 cm velocity change (limit 3); fade 0.2 / 0.3 of k no better |
| climbing_ladder_to_standing | 7.0 / 11.8 cm (4.2 after the ladder capture) | 0.00 / 0.00 cm | neither meets 1 cm; the capture is closer |
| crawling_hands_and_knees | not measured (no vent crawl state in the harness) | | joints 13.8 cm a frame, 24.9 cm pops (hand-made 0.5 / 0.1): its spYaw wraps round -pi (keys -4.72 to -1.42 rad), the shoulder line flips; crawlOut starts 4.6 rad of spYaw away |

## MIXAMO_ON
| Capture | In matches | Why |
| --- | --- | --- |
| hanging_idle | on | anchors as the hand-made clip |
| braced_hang_shimmy_left / right | on | anchors as the hand-made clip |
| braced_hang_to_crouch | off | palms 29 cm off the lip |
| freehang_climb | off | stand-up end pops (the take ~4x faster, M4) |
| climbing_ladder | off | soles 38 cm vs 32 on held plants; keeping the hand-made foot lift puts the palms 5-6 cm off |
| climbing_ladder_to_standing | on | palms 7.0 cm against the hand-made 11.8 (better, not 1 cm) |
| crawling_hands_and_knees | off | the M4 yaw wrap: the joints jump 13.8 cm a frame (hand-made 0.5), the shoulder line flips (gap below) |
The rule: a capture whose palms or soles miss more than the hand-made clip, that pops more, or that is unmeasured stays off
rather than take a hand-made fix.

## Tests
- `tests/mixamoTraverse.test.ts` (10): flag and table, Studio pick, off bit-identical after on / pick and clear, guard
  graph identical with the flag on, slots by MIXAMO_ON (and every capture with all let on), no pop at the stand-up fade
  or shimmy turn, bytes a frame (hang 1312 vs hand-made 1328, climb-up 1312 vs 1312), anchor errors above.
- `tests/mocapGuards.test.ts`: a guard's hang, shimmy, ledge climb-up, ladder, top-out and crawl bit-identical with the
  flag on (grunt, heavy, officer); control: Wren moves with it on.
- `tests/climbHands.test.ts`: every check with the flag off and on.
- Off identity: `tests/animSkeletonIdentity.test.ts` and `tests/mocapSwitch.test.ts` pass on the master fixtures.
- anim-audit, flag on vs off: pending laptop run (`affected-e2e` with `anim-audit`, plus `e2e-traverse`, `e2e-anim`,
  `e2e-clip`, `e2e-ctcourse`; look video).

## Known gaps
- The ladder sole measure is weak: on both clips the ankle sits 46-49 cm above its held plant in the harness (the rig's
  climb foot cap), so the drift compares the clips' foot lift, not contact. e2e-traverse checks the plant targets only.
- The vent crawl capture: M4 to fix its yaw wrap (spYaw keys -4.72 to -1.42 rad, unwrapped round -pi; the shoulder line
  flips and the joints jump 13.8 cm a frame), then a hand / knee anchor measure (no vent crawl state in the harness)
  before it can play in matches.
- The ladder top-out misses its grips by 4-7 cm (hand-made 11.8): neither meets bible 5.12.2 #2.
- With braced_hang_to_crouch and freehang_climb off, the lip climb-up is hand-made in matches; a retimed stand-up end
  (M4) could bring freehang_climb back.
- Not done: the Mixamo setup in `ATTACH_PROBE_SETUPS` and a crawl probe state (M4-REPORT open item).
- The graph's own frame cost (about 0.8-2.3 kB a frame on these states, before I2) is not this slice's.
