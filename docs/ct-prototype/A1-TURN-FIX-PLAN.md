# A1.2 - Lower body follows the body in turns: diagnosis and fix plan

Read-only design, 2026-10-18. Follows the failed A1.1 playtest. Prototype (G4): every number is a starting value.
Line numbers are from the working tree on `feature/ct-prototype` at the time of reading (another agent was editing
`src/`; re-check them before editing).

## 1. What Michael saw

- Flick 180 at a walk: "Smooth turn but legs go backwards, too slow."
- Run reversal: "Legs backwards again."
- Fast spin: "Legs cross over and are very unnatural."
- General: "Legs don't follow body", "legs should follow body to prevent issue", guards "move weird".

Footage target (A1-TURN-FOOTAGE.md): no pivot, no leg twist, a spin is the walk cycle on a <= 0.2 m circle at about
1 step per 90 deg (one step per 0.2-0.25 s), flick 180 in 0.40 s with about 2 steps, run reversal 0.37 s with the
running gait continuing.

## 2. Root cause in plain terms

The upper body turns at up to 450 deg/s, but the legs only take a step when the body has travelled a stride's
DISTANCE. In a turn the body barely travels (tight circle, and the pace dips by up to 55 %), so the legs almost stop
stepping while the hips spin. A planted foot stays locked in the world, toes still pointing the old way, and the knee
is aimed along that foot. After 90-180 deg of body turn over one planted foot, the knee points sideways or backwards
and the legs twist across each other. The next landing spot is a straight-line guess along the current velocity,
which in a spin points somewhere the body will not be, so the swing foot lands across the planted one.

Numbers: standing gear 3 (2.0 m/s) has a 0.7 m step, a 0.7 s gait cycle and a stance of about 0.43 s; at 450 deg/s the
body turns about 190 deg over one planted foot. Gear 2 (0.75 m/s): 0.45 m step, 1.2 s cycle, about 0.74 s stance,
about 330 deg of body turn per planted foot. The footage has about 1 step per 90 deg. A flick 180 at a walk (0.4 s)
gets about 1 step instead of 2, so one foot stays planted through most of the turn and ends with its toes (and knee)
pointing back: that is "legs go backwards". The turn rate and timing are right; the legs are the problem.

A1.1 did not fix it because its new rules (`turnStep` 0.75 rad, the side-by-side gap rule) only act when BOTH feet are
planted, which in a walk gait is about a quarter of the cycle, and its test counted crossings only on frames with
both feet planted, never checked foot yaw against the pelvis, and never checked the knee direction.

## 3. The four hypotheses

| # | hypothesis | verdict | evidence |
| --- | --- | --- | --- |
| a | Gait / stride driven by world velocity while the body yaw turns faster, so legs step backwards relative to the hips | TRUE for the cadence (the main cause), FALSE for the player's stride direction, TRUE for enemies | The gait clock advances by ground distance only: `motion.ts:375-378` (`phase += sp / (2 * stepLength)`), the same in the remote / enemy fallback `animGraph.ts:598`, and the planner's step timing `animGraph.ts:1112-1113` (`g.moving` and `g.cycleTime` from speed only). No yaw-rate term anywhere. The pace dip `motion.ts:331` (`CT.turnDip` 0.55) slows the clock further exactly in a turn. For the player, velocity is along the facing (`motion.ts:348-353`), so stride direction is not backwards; for enemies velocity follows the nav vector and the facing turns separately (`enemy.ts:1574-1581`, `faceTravel` never set), so `localX / localZ` (`enemy.ts:1715-1716`) blend in strafe and back clips (`animGraph.ts:559-566`). |
| b | Foot planner places steps along velocity instead of along the facing | TRUE (in two ways) | Landing spot is a straight-line extrapolation `root + vel * lead` (`footPlanner.ts:272-276`), ignoring the yaw rate: in a 450 deg/s spin the velocity turns about 130 deg within one `lead` (about 0.3 s), so the target sits on the tangent, outside the circle. The stance offsets and landing yaw use the CURRENT yaw (`footPlanner.ts:289`, `aim` 491-550, `f.toYaw = yaw` at 550), so a foot lands already 60-130 deg behind the body. For enemies and remotes the velocity itself can point away from the facing. |
| c | Planted feet are world-locked through large yaw changes | TRUE (the dominant visible symptom) | A planted foot's position and yaw are locked (`footPlanner.ts` header 5-7, `holdOrStep` 422-472). The A1.1 turn rule needs the other foot planted (`o.contact`, lines 425 and 432), so it is off for about 75 % of a walk cycle; otherwise the foot only lifts when the gait clock says so (lines 245-247), i.e. after 190-330 deg of body yaw (section 2). Swing foot yaw eases the SHORTEST way from `fromYaw` to `toYaw` (`footPlanner.ts:653`): past 180 deg of difference it flips and the foot swings round the wrong way, through the other leg. |
| d | The IK twists legs instead of the pelvis following | TRUE | The knee pole is the FOOT's world yaw (`characterRig.ts:1776-1778`, called with `L.yaw / R.yaw` at 1524-1525), while the hip joints ride the pelvis, which carries the full body yaw (root `rotation.y = visYaw`, `player.ts:271`; pelvis only adds the clip's small gait twist, `characterRig.ts:1494`). Foot 120 deg behind the pelvis = thigh twisted 120 deg, knee pointing back. Nothing turns the pelvis toward the feet. Worse, the spine LAGS the turn (`animGraph.ts:790`, `yawLag = -yawRate * 0.04`, up to 0.25 rad), so the hips lead the chest: the opposite of "legs follow the body". |

## 4. The fix (A1.2): step with the turn, plan in the body frame, hips follow

Principle: the body (chest) leads, the pelvis follows a little behind, the legs follow the pelvis. Feet are planned in
the pelvis frame; the world-locked contact stays (no foot slide), but no planted foot is ever left long enough for the
body to out-turn it.

### 4.1 Gait clock from distance AND turning (shared by player, remotes, enemies)

`src/anim/motion.ts`
- Add a pure export:
  `gaitRate(speed, yawRate, M, lateral): number` = `max(speed / (2 * stepLength(speed, M, lateral)), |yawRate| / (2 * TURN_STEP))`
  in gait cycles per second, with `TURN_STEP = PI / 2` (one step per 90 deg of body turn, footage 051339).
  At 7.85 rad/s that is 2.5 cycles/s, one step per 0.2 s (footage 0.2-0.25 s). Straight walking is unchanged
  (yaw rate 0). `max`, not a sum: at a full run turn (4.2 m/s, 6.1 rad/s) the linear rate 1.84 and the angular 1.94
  give 1.94, no cadence jump.
- `MotionDriver.finish` (375-378): advance `phase` by `gaitRate(sp, this.yawRate, M, lat) * dt`, and also when
  `sp <= 0.02` but `|yawRate| > TURN_GAIT_MIN` (1.0 rad/s), so a spin at a very low pace still steps.
- Add `MotionDriver.faceGoal` (rad): the stick heading while free and pushed (set in `stepCt` from `th`), else `yaw`.
  The planner uses it to cap its yaw prediction.

`src/anim/animGraph.ts`
- Phase fallback (598): use `gaitRate(i.speed, i.yawRate, undefined, lateralShare(i))` so remotes and any rig without
  a driver phase get the same clock.
- Gait outputs (1112-1113): `g.moving = (s > ... || |i.yawRate| > TURN_GAIT_MIN) && i.grounded`;
  `g.cycleTime = 1 / gaitRate(...)` (1.2 s floor when both are zero). Add `g.turning` (0..1) =
  `smoothstep((|yawRate| / (2 * TURN_STEP)) / linearRate - 0.5)` (how much of the cadence comes from turning).
- Duty in a turn: `g.duty` eases toward `TURN_DUTY` 0.52 by `g.turning` (shorter stance, less body yaw over a planted
  foot: at 2.5 cycles/s the stance is 0.21 s, about 95 deg at the cap, split +-47 deg by the mid-stance aim in 4.2).
- `localX / localZ` blend (559-566, 609-614): in facing mode (4.3) feed `dirX = 0, dirZ = 1` unless the deliberate
  back walk (`MotionDriver.backward`, a new optional `AnimInput.backward`) is on. No strafe or back clip in a free turn.
- Replace the spine lag (790) with the follow model in 4.4 (delete `yawLag`; the chest no longer trails the hips).

### 4.2 Foot planner: land where the body will be, facing where it will face

`src/anim/footPlanner.ts`
- `PlannerInput` gains `yawRate` (rad/s), `faceGoal` (rad), `stride: 'facing' | 'velocity'`, `pelvisYaw` (rad, from
  4.4; equals `yaw` when not supplied). `emptyPlannerInput` defaults: 0, 0, `'velocity'`, NaN.
- `updateMoving` landing spot (272-289), replacing `root + vel * lead`:
  - `T = lead` as now. Predicted yaw change `dy = clamp(yawRate * T, -|wrap(faceGoal - yaw)|, +|...|)` (signed with
    yawRate, never past the goal; remotes without a goal clamp at `+-PI/2`).
  - Chord prediction of the root on the arc: `pRoot = root + R(yaw + dy / 2) * (0, vf * T)` where `vf` is the speed
    along the facing in `'facing'` mode (`max(0, v . facing)`, or `-backSpeed` when walking backwards) and the full
    velocity in `'velocity'` mode (aiming, wall, cover). Exact enough for r <= 0.6 m, allocation free.
  - Landing yaw (the foot's `toYaw`) = the predicted MID-STANCE yaw: `yaw + clamp(yawRate * (toLand + 0.5 * duty *
    cycleTime), goal cap)`. The foot is then about half the stance's turn ahead at touchdown and half behind at
    toe-off (+-47 deg at the cap), never 100+ deg behind.
  - Ideal stance offsets are rotated by that landing yaw (`aim(f, i, side, px, pz, landYaw)`).
- `aim` crossing guard (495-511): measure in the landing yaw frame (as A1.1) AND re-check against the other foot's
  CURRENT position in the current pelvis frame; take the stricter. `minGap` 0.13 m stays.
- `swingTo` (615-661):
  - Bow-out in the current pelvis frame (`i.pelvisYaw`), not `f.toYaw`; window `swingNear` 0.18 m widened by
    `1 + min(1.5, |yawRate| * 0.2)`.
  - Foot yaw interpolation turns the way the body turns: `d = wrap(toYaw - fromYaw)`; if `|d| > 2.0` and
    `sign(d) != sign(yawRate)` and `|yawRate| > 1`, use `d + 2 PI * sign(yawRate)`; then clamp `|d|` to `MAX_SWING_YAW`
    2.4 rad per swing. No more wrong-way foot spin through the other leg.
- Hard no-crossing post-pass, new private `uncross()`, run at the end of `update`: in the pelvis frame, for the
  airborne foot only, push it outward so `latR - latL >= MIN_GAP_ANY` (0.08 m) whenever the two are within 0.25 m
  along; a planted foot is never moved. If both are planted and crossed (`latL > latR - 0.02`), the one that lands
  last steps next frame (the existing A1.1 rule, now with the contact condition dropped: see next bullet).
- `holdOrStep` (422-441): the turn rule and gap rule fire even when the other foot is airborne IF the other foot's
  swing is past 0.7 (land it now with `land()`, then lift this one): an early swap, never both feet in the air.
  `turnStep` becomes a backstop only: 0.9 rad (`characterRig.ts:1239`, wall keeps 1.2).
- Planted twist cap, new: a planted foot more than `TWIST_MAX` 0.7 rad (40 deg) from the pelvis yaw rotates about
  its ball to the cap (position kept, counted in a new `FootState.scrub` in rad like `slide`). With the cadence fix it
  should be ~0; the counter proves it.

### 4.3 Stride mode: locomotion in the character's frame

- `'facing'` mode: free movement (player not aiming, remote not aiming and not on a wall, enemies not aiming). The
  stride runs along the facing at the facing-projected speed `vf`; no sideways step, and backwards only for the
  slowest-gear back walk.
- `'velocity'` mode: aiming / strafe-locked, wall slide, cover, traversal: today's behaviour.
- Set in `characterRig.animate` from `RigPose`: new optional `RigPose.stride` (player: `aiming || wall ? 'velocity' :
  'facing'`; enemies: `face !== null ? 'velocity' : 'facing'`; remotes: `aim > 0.5 || mp.wall ? 'velocity' : 'facing'`).

### 4.4 Pelvis follows the legs, chest keeps the facing

`src/player/characterRig.ts` (pure part in a new Babylon-free `src/anim/turnFollow.ts` so it is unit-testable)
- `pelvisFollow(prev, rootYaw, Lyaw, Ryaw, Lcontact, Rcontact, dt)`: target = `0.5 * wrap(meanFootYaw - rootYaw)`
  where `meanFootYaw` is the planted foot's yaw (both planted: their circular mean; none: 0 target), clamped to
  `+-PELVIS_FOLLOW_MAX` 0.35 rad (20 deg), eased with tau 0.06 s. Sign result: in a turn the pelvis trails the chest by
  up to 20 deg.
- Apply at 1494: hips yaw `pe.yaw + follow`; spine (1497) gets `- follow` on top of its existing counter so the chest
  stays exactly on the root yaw (aim, camera, light probe unchanged; gameplay reads nothing here).
- Feed `pin.pelvisYaw = yaw + follow(previous frame)`, `pin.yawRate = i.yawRate`, `pin.faceGoal = s.faceGoal ?? yaw`
  (new optional `RigPose.faceGoal`, player sets `m.faceGoal`), `pin.stride`.
- Knee pole (`solveLegWorld` 1776-1778): pole yaw = `pelvisYaw + clamp(0.5 * wrap(footYaw - pelvisYaw), -0.6, 0.6)`,
  not the raw foot yaw. The knee points between the hips and the toes, never backwards. The ankle keeps the foot's
  world yaw (1789-1790).

### 4.5 Turn tuning left as is (check after the legs work)

`CT.turnRate` 7.85 / `turnRateRun` 6.1 / accel 300 and `turnDip` 0.55 stay. "Too slow" is read as the legs
lagging, not the yaw. If it still reads slow with stepping legs: footage peaks at about 600 deg/s in the first 0.1 s of
a flick, so try `turnRate` 8.8 for the first 0.1 s or lower `turnDip` to 0.4 (pace 60 % at the turn's middle).

## 5. Co-op remotes

No wire change, `PROTOCOL_VERSION` stays 14. A remote has no driver phase, so it uses the `animGraph` fallback clock,
which now includes `gaitRate` with the yaw rate the rig already measures from its interpolated root
(`characterRig.ts:1139-1144`). The planner gets the same `yawRate`, `stride` (from the remote's `aim` and wall flags)
and `pelvisYaw`; `faceGoal` is absent, so the prediction clamps at `+-PI/2`. The measured velocity lags by the
`approachTo` 0.06 s smoothing (`characterRig.ts:1119`), but in `'facing'` mode only its projection on the facing is
used, so a lagging velocity can no longer pull a remote's stride sideways or backwards. Smooth `yawRate` for remotes
with tau 0.05 s (20 Hz snapshot steps) before it feeds the clock.

## 6. What enemies inherit

Everything in 4.1, 4.2, 4.4 is shared (motion `finish`, `animGraph`, `footPlanner`, `characterRig`): turn-stepping
cadence, arc prediction, mid-stance landing yaw, the no-crossing pass, pelvis follow and the knee pole. Two enemy-side
changes, both in `src/ai/enemy.ts`:
- `RigPose.stride = face !== null ? 'velocity' : 'facing'` (1715 area), and in `'facing'` mode `localX = 0, localZ = 1`
  (no strafe / back clips on a patrol turn).
- Patrol facing follows travel: set `mi.faceTravel = face === null` (1576-1581). The existing non-CT travel path
  (`motion.ts:234-245`, heading arcs at `travelRate`) then keeps the velocity on the facing. Their stepped on-the-spot
  turns (`startChunk`) stay; the turn-stepping clock does not apply in the `turn` state (chunks already step).
Guards' remaining "weird" look (arms, posture) is outside this slice.

## 7. Unit tests that prove it

All in Vitest, pure modules, 60 and 120 Hz.

`tests/footPlanner.test.ts`, new `describe('foot planner: legs follow the body (A1.2)')`, driven by a real
`MotionDriver` (CT, free) through the planner with `gaitRate`, `pelvisFollow` and the new inputs:
1. Feet never cross in pelvis space, EVERY frame (not only both-planted): scenarios spin (stick rotating 10 rad/s, 3 s)
   at 0.75 / 2.0 / 3.0 / 4.2 m/s and crouched 0.85 / 2.1; flick 180 at 0.75, 2.0, 3.0; run reversal at 4.2. Assert
   `latR - latL >= 0.06` m in the pelvis frame on every frame where the feet are within 0.25 m along, and `>= 0.11` m
   when both are planted.
2. Planted feet follow: every frame `|wrap(plantedFootYaw - pelvisYaw)| <= 0.7` rad, and the summed `scrub` over each
   scenario `< 0.15` rad (the cap is a backstop, not the mechanism).
3. Knee never backwards: the pole yaw from the new pure helper is within 0.6 rad of the pelvis yaw every frame.
4. Stride direction: at every landing in a turn, the landing spot minus the root, in the landing pelvis frame, has a
   forward component `>= -0.03` m (never behind the hips; the slowest-gear back walk is excluded and tested apart), and
   the landing foot yaw is within 0.6 rad (35 deg) of the body yaw at landing. On straight travel over 1 m/s the step
   vector is within 20 deg of the facing.
5. Cadence: a held spin at 450 deg/s lands 4 +- 1 steps per 360 at every standing and crouched speed (footage 051339).
6. Flick 180 at 2.0 m/s: the yaw completes in 0.36-0.45 s (existing bound), 2 +- 1 landings inside the turn window,
   and both feet within 0.6 rad of the body yaw 0.15 s after the yaw settles.
7. No planted slide: `maxPlantedSlide < 0.02` m in all scenarios (A1.1 allowed 0.03).
8. Remote parity: feed the same trajectories as a remote does (positions sampled at 20 Hz, interpolated, velocity
   measured and smoothed, yaw rate measured, no driver phase, no `faceGoal`); assertions 1, 2 and 4 hold with the same
   bounds plus 0.02 m / 0.1 rad.
9. Slowest-gear back walk: landings may be behind the hips (forward component `<= 0`), feet keep the facing yaw,
   no crossing.

`tests/motion.test.ts`
- `gaitRate`: straight walk unchanged from today's value; spin at 7.85 rad/s gives 2.5 cycles/s; run turn uses the max.
- The phase advances by >= 0.9 cycles through a 0.4 s flick 180 at 2.0 m/s (about 2 steps).

`tests/anim.test.ts` (or the graph's test file)
- `g.moving` is true for a spin at 0.1 m/s with yaw rate 6 rad/s; `g.cycleTime = 1 / gaitRate`; `g.duty` near 0.52
  in a full-rate spin, unchanged walking straight; free-mode `dirZ` stays 1 through a flick (no back clip weight).

`tests/turnFollow.test.ts` (new): pelvis follow sign, clamp 0.35 rad, tau, and the chest-yaw sum unchanged.

Enemy: `tests/enemy*.test.ts` (or a new pure test on the motion input): a calm enemy turning 90 deg on a nav path at
1.5 m/s keeps its velocity within 30 deg of its facing.

e2e (`scripts/e2e-anim.mjs`, quick run): add `kneeTwistMax` (deg, pole vs pelvis) and `crossFrames` to the `turn180`
and spin sections; bounds 35 deg and 0. GPU / visual checks: pending PC run.

## 8. Files and order

1. `src/anim/motion.ts`: `gaitRate`, `TURN_STEP`, `TURN_GAIT_MIN`, clock in `finish`, `faceGoal`.
2. `src/anim/animGraph.ts`: phase fallback, `g.moving / cycleTime / duty / turning`, facing-mode direction, delete
   `yawLag`.
3. `src/anim/turnFollow.ts` (new, pure): `pelvisFollow`, `kneePoleYaw`.
4. `src/anim/footPlanner.ts`: new inputs, arc prediction, mid-stance landing yaw, directional swing yaw, `uncross`,
   early swap in `holdOrStep`, twist cap and `scrub`.
5. `src/player/characterRig.ts`: `RigPose.stride / faceGoal`, planner feed, pelvis follow at 1494-1498, knee pole
   in `solveLegWorld`, `turnStep` 0.9.
6. `src/player/player.ts` (`stride`, `faceGoal`), `src/net/remoteAvatar.ts` (`stride`), `src/ai/enemy.ts` (`stride`,
   `faceTravel`).
7. Tests as section 7; `npm run lint`, `npx vitest run`, `npm run build`, `npm run e2e:quick`.

Size: about 200-260 lines of code plus tests. Risk: stairs and slopes use the same landing path (the chord
prediction reduces to today's at zero yaw rate); the wall path is `'velocity'` mode and unchanged.

## 9. What Michael should try after A1.2

`?autostart=proving&mode=sandbox`. Spin the stick at each speed and crouched: the feet step round under the hips
about 4 times per turn, knees forward, never crossing. Flick 180 at a walk: two forward steps in the turn, no foot
left pointing back. Run reversal: the running steps carry through the turn. Watch a patrolling guard round a corner:
he faces where he walks.
