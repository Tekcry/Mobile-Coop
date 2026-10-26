# I5 report: body carry and strike captures on Wren
Owner: mixamo-retarget lead. Status: current (branch feature/mixamo-i5, base feature/mixamo-i3 b932d031; merged feature/mixamo-i4 a3c424b7 and
feature/mixamo-i2 9be7701f).

## What changed
- `src/anim/mixamo.ts`: rows `carry_body_walking` / `carry_body_idle` (on), `elbow_strike` / `cross_punch` (off,
  below), `kneel_down` (off: Studio only); `WREN_CARRY`, `WREN_STRIKE`, `CARRY_IDLE_SECONDS`, `CARRY_STRIKE_SHOT`,
  `strikeContact`, `resolveMixamoCarryStrike` (one line at the end of `resolveMixamo`). No `flags.ts` change.
- `src/anim/animGraph.ts`: `RigTargets.strikeCap`; the keyed gate takes the carry's load (`carryGate`, Wren with a carry
  capture only); `mixamoShots` -> `carryShot` / `strikeShot` after the I3 stance shot; the carry height replaces the
  procedural carry's by its share. With the flag off none of it runs (byte-identical).
- `src/anim/strikeBody.ts`: `strikeBodyAt(ph, out, k = 1)`: by `k` the shoulder line's turn past the hips and the neck's;
  the hips' turn and the weight shift stay whole.
- `src/player/characterRig.ts` (1 line, render only): `strikeBodyAt(..., 1 - t.strikeCap * kw)`. Needed: the rig adds
  the hand-made strike hip / trunk turn after the keyed trunk and no graph output reaches it, so without it a strike
  capture would turn the trunk twice. It triggers the co-op test gate; with `strikeCap` 0 (flag off, rows off) `k` is exactly 1.
- `tests/helpers/mocapMeasure.ts`: `PlanStep.pose` (extra pose fields a step). `tests/mixamoCarryStrike.test.ts` (new).

## How it plays (game clocks only; no gameplay timing changes, the graph never writes its input: test (c))
- Carry: keyed set on by the body's load on the shoulder (`cqCarry`: the hoist eases it in, the put down's hand-over
  out), standing. Walk on the gait phase (left strike 0), idle on its own 10 s loop, by the moving share. Trunk, head,
  arms, pelvis height from the take; pelvis x / z stay the keyed set's (the walk take's pelvis drifts up to 69 cm behind
  its feet over half a cycle: its root path). Feet: the planner's; hands: the rig's reach on the body, as before.
- Strike: the arc (`melee`, `strikeWarp` / `killWarp`) maps 0 -> first frame, the arc contact 0.56 -> the take's
  contact (wrist furthest forward: elbow strike frame 18/68, cross punch 17/36), 1 -> last frame. Weight eased in
  0.03 s / out 0.12 s, standing, holstered, off a wall, not carrying; the take's arms (`keyArmW`), spine, chest, head
  and pelvis height (`strikeCap`). The pelvis turn and x / z stay the keyed set's and the hand-made strike's hip turn and
  weight shift stay whole (the takes spun the hips 92 / 55 deg over the planted feet: the knees twisted across). The cross punch plays only with the elbow strike's row off.
- Put down: the game's is a 0.8 s standing roll off the shoulder (`bodyCarry.beginDrop`) with no clock in the pose
  input; J19 R11 (the kneel) is not built, so `kneel_down` stays Studio only.

## Readings (headless Wren rig, tests/mixamoCarryStrike.test.ts (d))
| Clip | Bone step a frame | Knees x hips | Knee out | Elbow out | Slide | Hand-made |
| --- | --- | --- | --- | --- | --- | --- |
| carry walk 0.8 m/s | 10.0 deg | 0.64-0.91 | 4.8 cm | 13.2 cm | 0.0 | 7.9 deg, 1.20-1.37, 3.5, 6.5, 0.0 |
| carry still | 10.0 deg | 0.91-0.94 | 1.6 cm | 11.8 cm | 0.0 | 10.0 deg, 1.15-1.19, 3.1, 5.7, 0.0 |
| elbow strike | **36.5 deg** | 0.57-0.67 | 5.7 cm | 28.3 cm | 0.0 | 33.1 deg, 0.63-0.70, 5.0, 15.4, 0.0 |
| cross punch | **54.8 deg** | 0.57-0.67 | 5.7 cm | 22.8 cm | 0.0 | as above |

The strike rows with the hand-made hips (before: elbow strike knees **0.30**-0.70, knee out **29.3 cm**; cross punch
0.44-0.69, **22.6 cm**). The carry rows after the I4 merge (standing_idle on): carry walk knees 0.65-0.92, still 0.92-0.97,
knee out 0.5 cm; the rest as above.

Elbows on the carry are with free hands (no body in the test); in play the hands are on the body. Visibly broken (the
hard caps in the test): a bone step past max(25 deg, hand-made + 1), knees crossing / splayed past the crab range and
the hand-made move, a knee bowed 10 cm past the hand-made, a planted slide 3 cm past it. Carry rows on. The
hip spin is fixed (the knees as hand-made), but both strikes still fail the bone step: the take's 18 / 17 frames to
contact are played over the arc's ~4 (`strikeWarp`), so a forearm turns 36.5 deg (elbow strike, frame 13 of the run;
shoulderL-elbowL 34.4 at frame 15) / 54.8 deg (cross punch) in a frame against the cap 34.1 (hand-made 33.1 + 1). Rows
off. A fix would be the take's own drive timing (e.g. contact a frame or two later than the arc's), which changes how
the strike reads against the game's hit: Michael's call.

## Partner view
`RemoteAvatar` poses the same `CharacterRig` (`operatorRig`: `tuneRows`, so `wrenReady`) from `MoveState`: `bend`,
`bendDrop`, `carryBody`, `carrySide` (coop-carry `carryLoad`) and `melee` (the same warps), stride `facing` unless aiming
/ wall: the same graph path, so the partner sees the same carry. The carry idle's 10 s clock and the walk's gait phase
are each rig's own (as the hand-made keyed idle). No `src/net` edit.

## Tests
- `tests/mixamoCarryStrike.test.ts` 10/10 ((a) and (b)'s off-vs-on comparisons turn every non-I5 row off: I4 ships
  standing_idle and the stance on). Full list after the merges (17 files: mixamoCarryStrike, mixamoTraverse,
  mixamoSwitch, mixamoStance, mixamoEmit, mocapSwitch, mocapGuards, climbHands, animSkeletonIdentity, strikePops,
  animN4dKill, animN4cStrike, cqGait, carry, carryState, coopCarry, changesFragments): 167 passed, 1 skipped.
  mixamoTraverse passes with the I2 fix (it measures `mixamoTrav` directly). typecheck clean, eslint clean.
- Allocation: on 1610 vs off 1520 B a frame through a carry and a strike (the carry turns the keyed set on: its
  sampleKeyed / mixKeyed calls box their doubles as every keyed frame does; tolerance 8 x 16 B).
- Pending laptop: affected-e2e (`src/anim`, `src/player`: co-op group), e2e-anim, e2e-weapons-carry, anim-audit.

## Deviations
- One line in `src/player/characterRig.ts` (above).
- Lethal blows: the grab's kill (bend > 0: `keyedOk` off, no keyed weight) never plays a strike capture. The takedown's
  lethal blow and its tail (`killWarp`, the victim pulled to the hands, no bend) reach `strikeShot` on the same arc, so
  with a strike row on they would play the take at the kill's pace (~0.8 / s before contact) with the arms off the
  victim: wrong. Rows are off, so nothing plays today; before a strike row goes on, the pose needs a kill bit (RigPose /
  AnimInput from `takedownController` and `poseFromMoveState`) and `strikeShot` must skip it. Noted at the rows.
