# Night Shift current movement (code survey, 2026-10-17, HEAD after step 22)

Read-only survey for the CT comparison (M19). Paths under src/. Angles rad (deg).

## 1. Speeds, starts, stops
- Gears m/s (config/movement.ts:157-158): crouched 0.42 / 0.75 / 1.08 / 1.5 / 1.9 / 2.3; standing 0.65 / 1.1 / 1.65 / 2.3 / 3.15 / 4.15 (~17% under 3.2.0). Spawn gear 3. Rocker max 1-5; stick snaps with 15% hysteresis (speedGears.ts:121-173). Sprint = gear 6 (4.15).
- Aim: min(gear, 1.4) standing / 1.0 crouched x strafe 0.9 / back 0.75; reload x0.75.
- CT pace (anim/motion.ts:300-355): one critically damped spring; start 95% in 0.3 s; stop 98% in 0.25 s; snap to 0 below 0.1 m/s. Turn inertia tau (0.15/3) x k, k 0 at 0.4 -> 1 at 1.6 m/s. Pivot when > 1.2 m/s and stick > ~134 deg from travel: brake, flip, hold 0.3 s.
- Release: stick latched up to 0.15 s, then `stop` sliding (2v/w, ~0.36 m from sprint) then idle; gait clock runs while > 0.02 m/s; closing step if the swing is > 5 cm behind; pose blends to idle tau 0.04 s. Walking and sprinting share the spring.
- 3.2.0 (docs/ct-movement.md:79-85): velocity zero next step, gait clock froze, frozen mid-stride blended to idle over 0.12 s, planted feet stayed, no finishing step, start 0.08 s, no pivots, stopHold kept the frozen stride.

## 2. Turning
- Standing still, not aiming: body holds facing, camera orbits; no turn in place. Moving: body turns 720 deg/s (accel 240 rad/s2); from rest the heading snaps to the stick.
- Aiming still: root turns 360 deg/s without stepping; feet take idle steps (0.34 s) only when the error (fwd/0.16, lat/0.075, yaw/0.38) passes 1; off a wall a planted foot never steps round with the body (turnStep Infinity, characterRig.ts:1227).
- "Bendy legs": knee pole and foot yaw follow the planted feet's world yaw while the hips turn (characterRig.ts:1758-1781): ~122 deg of body turn per idle step at 360 deg/s; spine counters 0.6 of pelvis yaw; soft-knee pelvis drop.

## 3. Posture (+ pitch = forward)
- Chest world pitch = 0.4 x pelvis + spine (characterRig.ts:1485). Idle clip pelvis pitch 0.07; gait clips 0.1-0.34; crouch clips 0.28-0.44.
- HUNCH carriage (animGraph.ts:313,757-770) whenever armed or holstered-ready and not at a wall: spine +0.5 (28.6 deg), pelvis +0.1, head -0.34, pelvis drop 0.07 m; crouched spine +0.34 more. Result: standing idle chest ~33 deg forward, crouched ~62 deg, sprint ~38 deg. This is the "bent over" look (P1, P4).
- Accel lean 0.012 rad per m/s2, cap 0.09 (+ up to 0.1 stick intent): barely visible (P1).
- Holstered arms (M14): hands 0.06 m out / 0.05 m ahead of the shoulder, elbow 18 deg standing, swing 0.06 m per m/s cap 0.15.

## 4. Back to wall (player/wallController.ts, animGraph.ts)
- Stance: flat back (chest pitch ~-0.02 standing, -0.09 crouched), back within 3 cm of the face, wider feet. Entry: context press only (A83), 0.9 m / 100 deg cone, settle <= 0.45 s; leave: pull > 0.7 for 0.3 s or context.
- Slide 0.9 / 0.6 m/s; edge stop; peek: push > 0.6 for 0.25 s; head 0.25 m, rig lean 0.45; camera pivot swings 0.6 m to the edge, turns up to 25 deg over 0.45 s; shoulder shift ~0.17 m. Wall camera boom 2.6, shoulder 0.55.
- Lean-out: body 0.35 m past the edge, arc 85 deg, leaves the wall past 100 deg for 0.3 s; camera lean offset 0.2 m.
- Low wall (0.75-1.45 m): always crouched; aiming mid-wall stands FULLY up (capsule 1.15 -> 1.75 m, wallController.ts:953) (P8). Edge side lean crouched, head capped at wall top - 0.14 m.

## 5. Door peek (world/doorPeek.ts)
- Crack 0.12 of the swing (~4 deg drawn) over 0.6 s; eye at the crack, FOV x0.85, look +-35 deg. Cannot push further gradually: stick in or interact opens fully; stick back held 0.2 s or context closes (P10).

## 6. Elbow strike (game/elbowStrike.ts)
- Anticipation 0-0.15 s, contact 0.5 s, recovery 0.4 s, total 0.9 s (P5 "too slow"). Reach 1.2 m, 90 deg cone. No enemy needed: a whiff exposes the striker for the recovery (P5).

## 7. Camera (config/camera.ts, shoulderCamera.ts)
- Boom 2.2 m hip / 1.5 m ADS (+0.3 sprint, +0.2 cover, +-pace term); shoulder 0.62 / 0.58; pivot 1.62 / 1.18; follow spring 16 (~125 ms); look-ahead 0.14 x v cap 0.3 m; auto-recentre after 1.5 s; FOV 75 deg Hor+, +4 sprint, x0.75 ADS. ADS boom 1.5 m is far from a close over-the-shoulder view (P15).
- Shoulder swap moves the camera only; the weapon stays in the right hand except D9 wall edges (P16).

## 8. Remap conflicts (A71)
- Same-group duplicates only warn ("Saved anyway; both fire together"); no block, no prompt to rebind the other verb (P12).
