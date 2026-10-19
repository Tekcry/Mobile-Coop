# P1b - crouch depth and wall arms (2026-10-19)

Prototype slice (G4), numbers are starting values (G10). Not committed.

## Bug 1 - crouch like a quadruped (back 70-90 deg, run lean 43 deg)
**Cause.** P1's posture lean (`POSTURE`, in `animGraph.ts`) was meant as the total torso pitch but was ADDED to the old
armed-carriage hunch: `HUNCH.spine` 0.5 rad x carry weight (+ pelvis 0.1), `crouchBend` 0.34 rad, `crouchK * 0.08`, then
`postureLean` 0.62 rad. P1 measured with `carrier = false` (no hunch), so it read 34-39 deg; the game player (carrier, drawn
or ready hands) stacked to 68-70 deg crouched, 63 deg kneeling, 43 deg at the run (double the 23 deg target).
**Fix.** The posture lean now replaces the hunch where it applies: the lean block runs before the carriage block and
`postureW = max(crouchK, runK) * carriage` scales `hunch` and `crouchBend` by `(1 - postureW)`. Raised weapon (aim),
walls, traversals unchanged (carriage is 0 there). `crouchLean` 0.62 -> 0.74 (measured total fell 4 deg once the
hunch's pelvis share went), new `kneelLean` 0.1 x kneel weight (kneel pose is less bent by itself).

| torso pitch (hips -> neck, from vertical) | before | after | target |
| --- | --- | --- | --- |
| crouch idle, carrier | 68.5 | in 35-45 | 35-45 |
| crouch walk 0.85 m/s, carrier | 69.9 | in 35-45 | 35-45 |
| kneel idle | 63.0 | in 35-45 | 35-45 |
| run 4.2 m/s | 43.3 | in 18-28 | ~23 |
(The test asserts the bands; before = measured by the first failing run.)

## Bug 2 - wall stance hand on hip, elbow out
**Cause.** At the wall the support hand blended (`offWall` 0.85) onto the rig's `wallHand` point (hip height, behind)
and the free hand used the default hang (`shoulderHalf + 0.06`, 0.92 arm length: elbow bowed out).
**Fix (pose targets only; `solveArm`, wrists, grips, `AIM_POCKET`, `weaponPivot` untouched).** `offWall` is 0 (no wall
contact), the support hand lets go of the foregrip while still and lowered (`offGrip = 1 - wallHang`), and both free
hand targets blend to `WALL_ARMS` (x 0.03 out from the shoulder joint, reach 0.985 of the arm, z 0.03) by `wallHang`.
Edge peek and slide: moving takes the hand back to the weapon as before (`moveW`). Limit: the rig's arms end at hip
height (wrist 0.845 vs hip joint 0.86), so hands read "at the hips, hanging", not mid-thigh, until Wren's proportions.

## Files
`src/anim/animGraph.ts` (POSTURE, WALL_ARMS, lean block moved up, hunch scale, wall hang), `tests/posture.test.ts` (new,
9 tests: crouch idle / walk armed and holstered, kneel, run armed and holstered; wall unarmed / armed wrists below the
hip joint and elbows < 0.27 m from the centre line).

## Stills (`docs/ct-prototype/shots/p1b/`)
`crouch-before.png`, `crouch-after.png` (crouch, 12 frames, 0.12 s, side), `wall-before.png`, `wall-after.png` (wall,
4 frames, 0.3 s, front), GPU (`E2E_GPU=1`). The slung rifle follows the back, so its angle follows the torso.

## Results
- `npm run check`: pass (0 errors, 1648 tests + 1 skipped, build ok).
- e2e on 4193 one at a time: smoke ok, e2e-wall ok, e2e-anim FAIL on one assertion only: "aim framing blend 0.33 s
  (~0.6 s, G103)" (camera aim framing, not touched by this slice; fails on solo reruns; the rest of the suite is ok).
