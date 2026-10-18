# P1c - standing and crouched idle posture (2026-10-19)

Prototype slice (G4), numbers are starting values (G10). Not committed.

## Cause
- Standing idle lean / claw: the armed-carriage hunch (`HUNCH.spine` 0.5 rad + pelvis 0.1) applied whenever `carryW`
  was on, and `carryOn` includes holstered "ready hands" (rifle on the back). So a holstered Wren stood ~30 deg bent.
- Kneel: `wantKneel` (graph) from `kneel` (player: crouched and still > 0.25 s). The footage doc has NO idle kneel
  (crouch idle is a deep two-foot squat; kneel appears only as real-world low-cover doctrine / CT team boost inference).

## Fix (`src/anim/animGraph.ts`)
- `POSTURE.kneel = false`: the idle kneel is off (flag kept to bring it back). Controller `kneeling` untouched (gameplay).
- New eased `hunchS`: the hunch scales by `POSTURE.hunchHolstered` 0.05 (holstered) or `hunchArmed` 0.4 (weapon in hand).
- Ready hands crouched: `zCrouch` 0.04 -> 0, `xCrouch` 0.05 -> 0.03, `flexCrouch` 0.6 -> 0.45 (elbow floor 15 deg test).
- No change to solveArm, wrists, grips, AIM_POCKET, weaponPivot.

## Numbers (holstered, carrier)
| | before | after |
| --- | --- | --- |
| standing idle torso pitch | ~30 | 3.0 deg |
| standing idle wrists vs hip joint | forward, near hip | 3 cm below hip, 5 cm ahead of neck |
| crouch idle torso | 35-45 | 42 deg (kept) |
| crouch idle knees / ankles height | one knee on the ground after ~0.5 s | knees 0.29-0.36 m, ankles 0.07 m |

## Tests
`tests/posture-p1c.test.ts` (new): standing torso < 10, wrists below hips; crouch + kneel requested keeps both feet
planted and torso 35-45. `tests/anim.test.ts` kneel-stance test now asserts no kneel stance. Posture bands from P1b unchanged.

## Stills (`docs/ct-prototype/shots/p1c/`, GPU)
`crouch-before.png`, `crouch-after.png` (crouch, 12 frames, 0.12 s, side; frame 0 is the standing idle).

## Results
`npm run check` pass (1667 tests + 1 skipped). e2e on 4193 one at a time: smoke ok, e2e-anim ok, e2e-wall ok.

## Still wrong
Hands still read slightly forward in the stills (forearm points forward-down; the wrist sits under the neck in the
numbers): hand/wrist orientation belongs to feature/weapons. Rig arms end at hip height (see P1b).
