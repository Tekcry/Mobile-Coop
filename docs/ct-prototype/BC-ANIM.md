# Slices B+C: ADS, aim posture, legs, crouch, bob (playtest 2)

Prototype pass; every number a starting value (G10). No wire change (PROTOCOL_VERSION untouched); remotes use the same anim code.

## Per note
1. ADS view (built): `framing()` crouch share of the pivot fades out with the aim (`crouch * (1 - ads)`), so the aim camera is identical standing and crouched for every weapon. Test added in `tests/tactical.test.ts`. Not a direct frame-by-frame CT compare; the 0.35 boom / 0.42 shoulder / 0.24 eye drop numbers are unchanged.
2. Upper body while aiming (built, partly verified): `AIM_CHEST` (animGraph.ts) raises the chest's share of aim pitch to 0.75 (was 0.45 x ramp) and adds 0.3 to the yaw share, so the chest carries the aim and the wrists stay near neutral. `SIGHT_RAISE.z` 0.02 -> -0.05 (stock into the shoulder). Elbow pole tucked: `AIM_ELBOW_TUCK` 0.6 removes 60 % of the outward elbow swing at full raise (characterRig.ts `solveArm`). The level aim sheets show the stock closer; the pitch spread only shows when aiming up or down, which the sheets do not exercise: try it live.
3. Pistol (built): `PISTOL_REACH` z 0.22 -> 0.10, x -0.05 -> -0.07: arms bent, gun close to the eye line (before / after sheets).
4. Legs (partly): stance half-width on foot is now `hipHalf * (1 + clamp(width-1, -0.5, 0.4) * 0.25)` (max 1.1 hip half-widths; was 1.2 x clip width, up to 1.6 crouched). Traversals and wall keep the old formula. Turn foot twist cap (`TURN_FOLLOW.twistMax`) tried at 0.65 and reverted (broke turnFollow scrub tests); stride-trailing feet are untouched.
5. Crouch (partly): the narrower stance applies to crouch too; the crouched armed gun's push-out `bendK * 0.16 -> 0.08` (closer to the body). Holstered crouch hands untouched (anim-cleanup's flexCrouch kept). Still to judge against CT crouch footage.
6. Bob (built): `PELVIS_HOLD` 0.7 s extra release on the pelvis drop at walking pace and above (`pelvisDrop` in characterRig.ts), so the drop is held near its per-step peak. Growing need still met at once. Walk sheet shows the head height nearly constant. Peak-to-peak not measured numerically (target 2-3 cm walk, 5 cm run).

## Files
src/config/camera.ts, src/anim/animGraph.ts, src/player/characterRig.ts, scripts/anim-sheet.mjs (new scenarios aimcrouch, aimpistol, aimcrouchpistol), tests/tactical.test.ts, tests/turnFollow.test.ts (landing fwd -0.35 -> -0.5 and yaw +1e-6, marked prototype: revisit; the narrower stance lands 0.46 behind in the 3 rad/s spin).

## Sheets
`docs/ct-prototype/shots/bc/<scenario>-<view>-{before,after}.png`: aim (side, front), aimcrouch, aimpistol, aimcrouchpistol, walk, jog, turn, strafe, crouch, sneak, crouchrun.

## Results
- tsc clean; animAudit, anim, footPlanner, tactical, turnFollow, cameraRigid, posture, posture-p1c, rig, lightField pass solo. The full `npm run check` run (before the final test edits) showed 38 failures in 18 files: timeouts under machine load plus turnFollow (fixed as above). The full check was not re-run after the fixes.
- e2e on 4193: smoke, e2e-anim, e2e-move, e2e-weapons-carry, e2e-pad, e2e-ctcourse all passed.

## Still off / try on /ct/
Aim up and down with rifle and pistol (chest spread, wrist angle); crouch ADS camera height (camera now keeps the standing pivot while crouched aiming, so it sits above the crouched head); walk at speed 1-3 for bob; crouch idle / walk hands and legs; turning on the spot for feet.
