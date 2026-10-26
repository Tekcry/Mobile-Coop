# I2b report: traversal clip fixes, every row on
Owner: mixamo-retarget lead. Status: current (branch feature/mixamo-i2b, from feature/mixamo-i2; merged ec486d6b).

Rule used (Michael 2026-10-26, via the coordinator): where a Mixamo clip and a hand-made clip cover the same move the
capture wins (row true) unless it is visibly broken in play (a spin, a pop, hands far off the grips); a worse number
alone is tuned in the Anim Studio. Hands on the lip stay a hard gate on the lip climb-up (`tests/climbHands.test.ts`).
The `mixamo` flag and its default are untouched: the rows only play under the Mixamo source (a separate slice builds
the "Animation source" setting).

## Rows (MIXAMO_ON, headless, Wren rig, 60 Hz)
| Capture | Row | Reading with it on | Cap | Hand-made |
| --- | --- | --- | --- | --- |
| hanging_idle, shimmy left / right | on | palms 0.00 cm, soles 0.00 | 1 cm | 0.00 / 0.00 |
| climbing_ladder | on | palms 0.00 cm; soles 38.4 cm (the rig's climb foot cap, not contact); into the top-out the first frame moves the right ankle 19.9 cm | soles hand-made + 10 cm; switch frame hand-made + 5 cm | 0.00; 31.6; 15.7 |
| climbing_ladder_to_standing | on | top-out palms 3.15 cm | hand-made + 0.2 cm | 11.8 |
| crawling_hands_and_knees | on | joints 3.4 cm a frame, 1.7 cm velocity change (spYaw -0.10..0.15, was -4.72..-1.42) | 6 / 4 cm | 0.5 / 0.1 |
| braced_hang_to_crouch | on | climbHands: palms 0.0 cm on the lip, slide 0.4, foot on top k 0.474, shoulders 0.488 m (arm 0.538), knee 2.6 cm clear, release wrists 2.8 cm a frame | 1.5 cm; k <= 0.475; 0.538 m; 2.4 cm; 3.0 cm | 0.0; 0.474; 0.49 m; 2.6; 2.8 |
| freehang_climb (stand-up past the crouch) | on | climbHands whole exit: trunk 8.9 / 3.07 cm (step / velocity change a frame), arms 12.2 / 9.8, legs 17.0 / 20.9, toes 19.6 / 24.6; release wrists 2.8 | trunk 9.6 / 3.1; arms 16.2 / 23.5; legs 17.4 / 24.2; toes 20.9 / 39.9; wrists 3.0 | trunk 8.6 / 2.7, arms 12.2 / 6.2, wrists 2.8 |

Both lip climb-up captures play together in a match (braced in the `climbUpCrouch` slot, free-hang in `climbUpStand`);
the climbHands mixamo-on run measures that pair. As captured (no stand-up fix) the pair read trunk 15.7 / 5.1 cm.

## What changed
- `scripts/mocap/mixamoChannels.mjs`: the yaw fix. A segment (hips or chest) pitched past `YAW_FROM_RIGHT` (75 deg) at
  any frame of a take takes its yaw from its right axis for the whole take (the forward axis near the vertical turned
  its heading half a circle as the crawl's chest crossed 90 deg; the track was already unwrapped). Re-emitted
  `trav_crawling_hands_and_knees.ts`, `trav_freehang_climb.ts`, `trav_braced_hang_to_crouch.ts` and their `CHANNELS.md`
  sections; the other five traversal modules byte-identical.
- `src/anim/animGraph.ts` (traverse): a capture giving way to another across a move change (`mxKind`) is inertialized,
  as capture <-> hand-made was (the ladder capture to the top-out capture jumped a joint 23.5 cm, now 19.9).
- Braced hold (`src/anim/mixamo.ts` `MIXAMO_HOLD`, typed `WREN_HOLD`; graph climb-up branch): the hand-made climb-up
  plays under the capture while the hands hold the lip; the capture blends in by smoothstep over k 0.58 - 0.78, its clock
  from the take's k 0.56 at 0.58 to the crouch; the feet stay the hand-made climb-up's to the crouch (`HOLD_FEET_CH`);
  the stand-up fades in over 0.34 of k. Blended in earlier (k0 0.475) the capture's lower shoulders put the grips out
  of reach over k 0.53 - 0.59 and the wrists snapped 3.5 - 3.7 cm as the grips let go.
- Free-hang stand-up (`MIXAMO_STAND`, typed `WREN_STAND`; graph): the take's yaw turn (`pelYaw`, `spYaw`) kept at 0.15
  of its own over the hand-made climb-up's (the take turns the hips to 1.5 rad and ends at 0.89), and its clock past
  the crouch slowed mid-way and quicker at the ends (x + 0.45 sin(2 pi x) / 2 pi over the crouch to the end: the same
  take, start and end). Only with a capture in the stand slot; the hand-made stand-up is untouched.
- Hot paths: every hold / stand value is read from a `Float64Array`, the capture weight lives in `mx[MX_CW]`, the
  yaw bases in a typed array (an object's double fields had boxed 16 B a frame); "no allocation" reads 0.0 B a frame on
  every capture path.
- `tests/mixamoTraverse.test.ts`: the crawl's visible-break cap and shipped check; the ladder soles capped at hand-made
  + 10 cm; the top-out switch frame at hand-made + 5 cm with the ladder capture on.

## Sweeps (scratch harness, not committed)
- Braced: span, k0, from, ease, stand and per-channel keeps; under 3.0 cm on the release wrists only once the capture
  comes in after the grips are mostly off (k0 0.58, span 0.2, from 0.56, stand 0.34: 2.8).
- Free-hang (with braced on): yaw 1 / 0.5 / 0 as timed trunk 15.7 / 14.1 / 11.7; the take cut short at k 0.85 - 0.92
  (played slower) 9.9 - 11.4 and worse with the mid slow-down; yaw 0 slow 0.3 - 0.5: 9.4 - 8.6 / 3.06; yaw 0.15 slow
  0.45: 8.9 / 3.07 (picked: keeps some of the take's turn, arms 9.8 vs 11.3 at yaw 0); yaw 0.3: 10.0 (fails).
- The trunk's 3.06 - 3.07 cm velocity change is at k 0.667 (the stand-up's first frames); 0.03 cm under the cap.

## Tests
typecheck:fast, eslint (mixamo.ts, animGraph.ts, mixamoTraverse.test.ts) clean. vitest climbHands, mocapGuards,
mixamoTraverse (12/12, allocation 0.0 B), mocapSwitch, animSkeletonIdentity, changesFragments: 42 passed, 1 skipped.

## Known gaps / for the Studio
- Free-hang stand-up wrists: a one-frame 11 cm velocity change at k 0.86 at yaw 0 (9.8 cm at the picked 0.15, under the
  arms cap 23.5; hand-made 6.2); outside the release window climbHands caps at 3 cm. Worth a look in play.
- Free-hang alone (braced row off, or the Studio pick) fades its stand-up in over 0.08 of k, not 0.34: not measured.
- Crawl: no hand / knee anchor measure (no vent crawl state in the harness), as in I2.
