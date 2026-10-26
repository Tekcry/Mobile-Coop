# I1 report: standing idle and crouched walk on Wren
Owner: mixamo-retarget lead. Status: current (branch feature/mixamo-i1).

## What changed
- `src/anim/mixamo.ts`: `MIXAMO_ON` rows `standing_idle` / `crouched_walking` (:76, :79, both off, below);
  `STANDING_IDLE_SECONDS` 6 (:168), `KEYED_IDLE_PERIOD_S` 12 (:175, a copy of `animGraph.ts` `KEYED_IDLE_PERIOD`:
  importing it would be a load-time cycle; a test pins the two equal), the resolved `WREN_KEYED` (:178) rewritten by
  `resolveMixamoKeyed` (:181), called once at the end of I2's `resolveMixamo` (:133).
- `src/anim/animGraph.ts:53` own import line; `:2176` `keyedSet` samples `KI.idle` over `KI.idlePeriod` and takes its
  `half` / `kneeOut`, where `KI` is `WREN_KEYED` on a Wren rig and `HAND_IDLE` (:3141, `KEYED_IDLE` / 12) on any other.
  None of I2's hunk lines touched.
- `src/anim/mocap.ts:215-229`: `MOCAP_SET_MX` (a copy of `MOCAP_SET`), `mocapActive`, `setMocapCrouchWalk`;
  `setMocapLocomotion` and `applyMocapSwitch` (:262) use `mocapActive` for the ON set. `MOCAP_SET` is unchanged.
- `tests/mixamoSwitch.test.ts` (new, 10 tests), `changes/feature-mixamo-i1.md`.

## A8 readings (headless Wren rig, tests/mixamoSwitch.test.ts (d))
| Clip | Measure | Mixamo | Replaced clip | Limit |
| --- | --- | --- | --- | --- |
| standing_idle vs KEYED_IDLE | seam step (phase 1 -> 0) | 0.0 deg (3 seams) | 0.0 deg (1 seam) | 25 |
| | largest bone step a frame | 0.3 deg | 0.0 deg | 25 |
| | knees x hips | 0.66-0.67 | 0.69 | 0.5-1.1 |
| | knee outside ankle | 3.1 cm | 3.5 cm | 9.3 (idle tune) |
| | elbow outside shoulder | **12.8 cm** | 7.2 cm | 8.0 (idle tune) |
| crouched_walking vs CMU 136_09 (0.5 / 0.8 / 0.9 m/s, mocap on) | planted slide | 0.00-0.01 cm | 0.00-0.01 cm | 1 |
| | largest bone step a frame | 9.8 / 14.2 / 15.4 deg | the same | 25 |
| | knees x hips | **0.30-0.96** | 0.68-0.76 | 0.5-1.25 |
| | knee outside ankle | **20.0 cm** | 5.4-5.9 cm | 3 |
| | elbow outside shoulder | **27.0-27.5 cm** | 5.3-5.4 cm | 6 |

`MIXAMO_ON`: `standing_idle` false (elbows past e2e-anim's idle limit, the hand-made idle within it);
`crouched_walking` false (the capture's hips turn 31-48 deg off its travel, CMU -2 to -8: knees and elbows far out).
Both stay Studio only (A8). The rule in the test: within the limit where the replaced clip is, else no worse than it.

## Tests
- `tests/mixamoSwitch.test.ts` 10/10: off identity (graph 21 s with the mocap switch off and on; the anim-skeleton
  identity fixture), on (idle, crouch walk slot and A2), only Wren (a guard graph on the keyed path), A8 measures,
  bytes a frame (idle 994.4 on / 994.4 off, crouched sneak 2055.1 / 2055.1).
- Pending laptop run: `affected-e2e` for `src/anim` (with `anim-audit`, `e2e-weapons-carry`), `e2e-anim`, `e2e-move`,
  `e2e-clip`; no look video while both rows are off.

## Deviations
- The brief said guards never reach `keyedSet`: an unarmed rig walking along its facing (`keyedOk`) does, so the graph
  picks Wren's table by `wrenReady` (a reference compare, no flag branch); the guard test runs on that path.
- `setMocapCrouchWalk` re-copies `MOCAP_SET` into `MOCAP_SET_MX` on each call (tests swap the set's clips).
- Base is I2's final head d4731d3f (not 4184e40f), as the lead set up the branch.

## Open
- The idle would pass with its elbows brought in about 5 cm (an arm-in layer on the capture, or a re-take); the
  crouched walk needs a capture that walks along its facing. Both are M3 / Studio work, not this slice's.
