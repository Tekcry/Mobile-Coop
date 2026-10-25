# I4 report: keyed clip fixes, the in-game Mixamo rows on
Owner: mixamo-retarget lead. Status: current (branch feature/mixamo-i4).

Rule (Michael 2026-10-26 ~00:15): where a Mixamo clip and a hand-made clip cover the same move, Mixamo wins unless it
is visibly broken; the A8 readings below are information. The clips play only when the player picks Mixamo (the
`mixamo` flag stays default off; the three-way source setting is feature/mixamo-on's).

## What changed
- `scripts/mocap/mixamoTake.mjs`: `facingOffTravel`, `turnTake` (after `mixamoLoader`): the recipe's `turn`
  ('travel' measured, or degrees) turns the pelvis, trunk, arms and neck about the vertical onto the travel; the legs
  keep their world rotations (the feet stay on the take's own track) and the head its world rotation (the gaze); the
  positions are rebuilt by FK (bone lengths unchanged).
- `scripts/mocap/mixamoEmit.mjs`: recipe fields `turn`, `armIn` validated; `buildIntermediate` applies `turn`;
  `armIn` (the `arm` channel's elbow and wrist turned about the chest's forward axis through the shoulder, a constant on
  every frame: seams and steps kept) applied in `emitRecipe`; the header and CLIPS.md notes name the corrections;
  `moduleText` writes a clip without the `head` channel (emit.mjs always wrote it: the path was unused before).
- `scripts/mocap/data/mixamo-clips.json`: crouched_walking `turn: "travel"` (-38.9 deg), standing_idle `armIn: 11`,
  stand_to_crouch `trim: [0.95, 1.5]` (the drop), crouch_to_stand `trim: [0.35, 1.25]` (the rise), both stance clips
  `channels: []` (no head channel).
- `src/anim/clips/mixamo/{crouched_walking,standing_idle,stand_to_crouch,crouch_to_stand}.ts` re-emitted; the other
  nine keyed clips byte-identical (checked with git diff after a full run). `src/anim/mocapSources.ts`: the stance rows'
  `cycle` (0.55 / 0.9 s). `docs/mixamo-retarget/CLIPS.md` regenerated. CMU output untouched (emit.mjs, retarget.mjs not
  edited).
- `src/anim/mixamo.ts`: `MIXAMO_ON` rows standing_idle, crouched_walking, stand_to_crouch, crouch_to_stand true with
  their readings; `STANCE_SHOT.edge` 0.15 -> 0.4 (the shot's fade in / out over 0.4 of the stance blend: at 0.15 the
  weight dropped 0.6 in one frame and the neck stepped 30 deg).
- Tests: `tests/mixamoSwitch.test.ts` (d) and `tests/mixamoStance.test.ts` (d) log the A8 pass / fail and assert the
  shipped rows (true), with hard caps for a visible break: bone step a frame under e2e-anim's 25 deg (seam, frame, full
  change, reversal), planted slide under `FOOT_SLIDE`.
- `docs/mixamo-retarget/PLAN.md` I3 line: the player's 0.22 s stance times.

## A8 readings (headless Wren rig, before -> after)
| Clip | Measure | I1 / I3 | I4 | Replaced clip | Limit |
| --- | --- | --- | --- | --- | --- |
| standing_idle | elbow outside shoulder | 12.8 cm | 7.75 cm | 7.2 | 8 |
| | seam / bone step | 0.0 / 0.3 deg | 0.0 / 0.3 deg | 0.0 / 0.0 | 25 |
| | knees x hips, knee out | 0.66-0.67, 3.1 cm | the same | 0.69, 3.5 | 0.5-1.1, 9.3 |
| crouched_walking (0.5 / 0.8 / 0.9 m/s) | knees x hips | 0.30-0.96 | 0.71-0.79 | 0.68-0.76 | 0.5-1.25 |
| | knee outside ankle | 20.0 cm | 3.5-4.0 cm | 5.4-5.9 | 3 |
| | elbow outside shoulder | 27.0-27.5 cm | 27.2-27.7 cm | 5.3-5.4 | 6 |
| | slide, bone step | 0.00-0.01 cm, 9.8 / 14.2 / 15.4 | the same | the same | 1, 25 |
| stand_to_crouch | bone step | 18.5 deg | 24.6 deg | 25.8 | 25 |
| | velocity pop | 20.2 cm | 16.9 cm | 6.5 | 7.5 |
| | elbow out | 12.6 cm | 10.6 cm | 7.2 | 6 |
| crouch_to_stand | bone step | 24.3 deg | 16.0 deg | 14.3 | 25 |
| | velocity pop | 11.3 cm | 13.8 cm | 6.4 | 7.5 |
| | elbow out | 7.8 cm | 10.9 cm | 6.75 | 6 |
| reversal at crouchK 0.5 | bone step, pop | 18.5, 29.0 | 24.6, 22.2 | 13.1, 13.9 | 25, 7.5 |

Knees, knee out and slide on both stance changes stay at the hand-made blend's. Stance edge tried: 0.15 (pop 12.2 /
12.7, neck step 25.9 / reversal 25.9), 0.3 (13.4 / 10.6, reversal step 25.5), 0.4 (above, every step under 25), 0.5
(17.4 / 15.3, reversal pop 19.6). The idle passes A8; the crouched walk passes all but the elbows (the capture's sneak
pose holds the arms wide, 22-26 cm in the raw take itself, not the facing); the stance changes fail the velocity pop and
elbows but stay under the bone-step cap: on by the new rule.

## Tests
- typecheck:fast clean; eslint on the touched TS files clean (the .mjs scripts are eslint-ignored). vitest: mixamoSwitch,
  mixamoStance, mixamoTraverse, mocapSwitch, mocapCrouch, crouchPops, crouchEntryRig, mocapGuards, animSkeletonIdentity,
  mixamoDriver, mixamoEmit, mixamoTake, mocapSources, changesFragments: 94 passed, 2 skipped (stance and emit fixes rerun:
  9/9, 10/10). Stance tests keep I1 rows off in `shotsOn`; the mid-change count allows the 4 frames under the 1e-4 skip.

## Deviations
- The yaw correction turns the trunk only (legs keep their world rotations, the head its gaze): turning the whole body
  about the hips would have dragged the planted feet sideways (the take's feet already step along the travel).
- The stance clips drop the head channel and the shot's edge fade widened to 0.4 (mixamo.ts, the I3 constant): the
  trims alone left the neck stepping 26-30 deg at the fade.
- Rows on under Michael's 2026-10-26 rule rather than A8.

## Open
- The I3 checker's leg-channel note (`mixKeyed` blends leg channels by the shot weight): the knee readings through both
  changes equal the hand-made blend's, so no visible pull; not traced in code.
- The animGraph `./mixamo` imports (:53, :57) not folded (animGraph.ts untouched).
- Laptop e2e with Mixamo picked: e2e-anim's stand <-> crouch pop gate (7.5) and the crouched elbow limit would fail on
  these clips; they run only when Mixamo is picked.
