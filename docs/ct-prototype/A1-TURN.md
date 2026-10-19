# A1.1 - turn follow (2026-10-18)

Prototype (G4): every number is a starting value.

## Built
1. Turn-rate cap scales with speed (`MotionDriver.updateYaw`, CT path): `CT.turnRate` 7.85 rad/s (450 deg/s) up to 3.0 m/s
   (walk, jog, all crouched speeds), falling linearly to `CT.turnRateRun` 6.1 rad/s (350 deg/s) at 4.2 m/s. Footage: spin
   400-450 deg/s (051339), run 300-400 (051339 0-2.4, 17-19.7). The pace dips in a turn, so a run reversal ends up faster
   than the run cap alone; unit test still <= 0.45 s. Accel unchanged (300).
2. Planted feet follow the body in every state (`footPlanner.holdOrStep`): `turnStep` is finite everywhere (0.75 rad,
   set in `characterRig` and the `emptyPlannerInput` default; wall keeps 1.2), and a planted foot that the turning body has
   carried level with or across the other foot (gap < 0.5 x `minGap` in the body frame) steps round to its own side.
3. Removed the reversal-pivot logic (`PIVOT_TURN`, `PIVOT_REACH`, `pivotReach`). Crossing guard in `aim` and the swing
   bow-out in `swingTo` now use the landing foot's yaw (`yaw` / `f.toYaw`) instead of the body's current yaw, and the bow-out
   window widens with the yaw still to turn. Removed the unused `lateral` helper.
No wire change (pure local pose logic that remotes run too). `PROTOCOL_VERSION` stays 14.

## Files
`src/config/movement.ts`, `src/anim/motion.ts`, `src/anim/footPlanner.ts`, `src/player/characterRig.ts`,
`tests/motion.test.ts`, `tests/footPlanner.test.ts`.

## Tests
Added: `motion` turn-rate cap by speed (walk ~450, run ~350 deg/s); `footPlanner` tight walking circle at 0.75 / 2.0 / 3.0 m/s
(no crossed planted feet, planted slide < 3 cm). Existing M1 bounds needed no change. The crossing check counts only frames with
both feet planted: an airborne foot can be mid-swing across for a few frames in a 7 rad/s spin (not fixed).

## Results
`npm run lint` 0 errors; `npx vitest run` 130 files / 1464 tests pass; `npm run build` ok.
e2e (port 4193, software GL, one at a time): smoke, e2e-move, e2e-anim pass. e2e-netmove: known flaky, failed the first
run, second solo run showed no failure line in the grep (not confirmed pass); M1 saw the same suite fail before this change.
Not run: GPU / perf checks (pending PC run).

## Try
`?autostart=proving&mode=sandbox`. Spin the stick on the spot at walk and crouch: a tight walking circle, feet stepping
round without crossing. Flick 180 at walk (about 0.4 s) and at a full run (slower turn, more arc). Watch planted feet
through a fast turn for toes pointing sideways.
