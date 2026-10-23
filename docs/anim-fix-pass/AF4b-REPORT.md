# AF4b - P4 crouched strafe / wall slide (Michael, walk 4.72: "with rifle clips and moves around constantly, pistol shifts between knees")

Branch `feature/afp-af4b` (6dc4ccb2 = feature/anim-fix-pass with AF0, AF1, AF2, AF4a, AF5, AF6 + AF3; origin/feature/anim-fix-pass
merged before the final push: AF3-CHECK.md and STATE.md only). Opus implementer, 2026-10-23.

## What changed and why (src/anim/animGraph.ts only; no characterRig.ts change)
- Kneel side (cause 1): off a wall the knee is no longer picked from the planner's lead (crouched the stance lead is zeroed,
  so after a sideways stop it was arbitrary). Armed, the gun hand's knee (right hand: the right knee, KNEEL); holstered the
  lead rule stays (free movement squats instead, KEYED_CROUCH.squat). With the lead forced to flip at each stop, the old rule
  changed knee 9 times in 10 stops; now 0.
- "Pistol between knees" (found while measuring): crouched, Michael's pistol low ready (WREN_PISTOL_READY y -0.34, pitch
  1.16, tuned standing) hung at knee height between the knees, and the rig's body clearance (characterRig `clearBody`)
  pushed it out of one thigh or the other frame to frame: 15 cm wrist jumps a frame at the wall, gun vs leg -0.4..-1.6 cm in
  the crouched stop-go. Crouched it now comes up and ahead (`CROUCH_GUN.pistol` y +0.15, z +0.08, pitch -0.5 by pistol
  low-ready share x crouch) and rises up to 0.2 m at the middle of a kneel going down or up (the body folds over it there:
  clearance push 8.8 -> 2 cm, wrist step 1.3 -> 0.5 cm a frame). The lift is by the crouch or the kneel, whichever is more
  (fix after e2e-anim): standing from the kneel the crouch runs out in standTime while the knees are still up, and by the
  crouch alone the hang dropped into the rising thighs; the body clearance threw the pistol 11 cm sideways (e2e-anim "low
  ready still: crouch -> stand", pistol in hand: wristL 14.5 cm a frame, gate 11.5). Now 5.5 cm (wristL), push 0.
  `CROUCH_GUN.pistol.z` stays 0.08 (the 0.16 experiment left this pop at 14.5).
- Pistol steady grip (AF4a carry): crouched the raised pistol bobbed into the body clearance (0-3.6 cm push each step);
  it is held 5 cm further out crouched (`PISTOL_REACH_CROUCH`): 1.01 -> 0.67 cm a frame; PISTOL_GRIP_STEADY back to 1.0.
- Wall (cause 3): crouched at a wall the body is side-on (the free crouch carriage along the travel), so the drawn gun now
  keeps the open-ground carry instead of the WALL_READY tuck (muzzle down along the wall, which side-on and bent over put
  the muzzle in the thighs). By the crouch (`smoothstep((crouch - 0.35) / 0.5)`), not the body's turn, so the reversal
  (the body turning through square) never swings the gun into the tuck and back; standing at a wall the tuck is unchanged.
  The crouch muzzle raise (`bendK`) now applies there, plus `CROUCH_GUN.wall` (y +0.3, z +0.1, pitch -0.7, half when
  raised), and armed the side-on stance drops WALL_SIDE_POSE.spine's extra lean (trunk 45.1 -> 39.9 deg; holstered as before).
- Cause 2 (forward pelvis sway on a sideways step) tried and NOT landed: re-centring the drawn crouched legs' keyed lateral
  sway by the sideways share cut the steady strafe's hips 2.2 -> 0.7 cm p2p but put the knee-out at 3.3 cm (e2e-anim gate 3.0,
  2.8 before) and left stop-go / flips unchanged (their swing is the kneel and the stops, not the sway). Reverted.
Undo: CROUCH_GUN all 0 and `gs = sideK` -> `cw = wallReadyW` (old tuck), PISTOL_REACH_CROUCH 0, the kneel line's
`i.armed ? ... :` branch, the `(i.armed ? 0 : 1)` factor on WALL_SIDE_POSE.spine.

## Bars (AF0 harness, sim 60 Hz, mocap on; before = 6dc4ccb2 -> after)
| bar | before | after |
| --- | --- | --- |
| same kneel side over 10 stop-go cycles (alternating L / R, lead flipping each stop) | 9 changes (rifle and pistol) | 0 |
| pistol hand lateral vs pelvis across the cycles <= 3 cm (aimed / low ready) | 0.5 / 1.4-2.1 | 0.4 / 0.3 |
| wall slide gun vs leg >= 0 cm, rifle L / R / reverse | -2.3 / -10.5 / -10.4 | 2.5 / 2.4 / 2.2 |
| wall slide gun vs trunk >= -1 cm, rifle L / R / reverse | -4.0 / -11.6 / -14.7 | 18.4 / 18.4 / 10.2 |
| wall slide gun vs leg, pistol L / R / reverse | -1.4 / -8.9 / -9.6 | 15.9 / 16.1 / 15.9 |
| wall slide gun vs trunk, pistol L / R / reverse | 3.9 / -2.7 / -3.5 | 36.3 / 35.9 / 34.1 |
| crouched strafe gun vs leg, pistol low ready steady / stop-go | 0.3 / -0.4..-1.6 | 13.0-13.8 / 0.6 |
| crouched strafe gun vs leg / trunk, aimed rifle and pistol (all plans) | >= 37 / >= 0.8 | >= 38 / >= 0.8 |
| pistol steady grip <= 1.0 cm a frame (0.4 / 0.7 m/s) | 0.68 / 1.01 | 0.45 / 0.67 |
| e2e-anim crouched aimed strafe knee-out <= 3.0 (harness steady 0.7) | 2.8 | 2.8 (unchanged) |
| e2e-anim low ready still crouch -> stand <= 11.5 cm a frame (pistol; in-game repro, zz script) | 8.4 (AF1 run) | 14.5 first cut, 5.5 now |
Unchanged (not this slice's code path): crouched strafe hips steady 1.7-2.2, stop-go 6.3 / 8.2, flips 7.0 cm p2p; stop-go
knee-out 10.0 / 10.3 cm during kneel transitions; gear 3 step 50 cm (49.6, AF3); after-af4b/numbers.md has the whole table.

## Tests (single files, desktop)
crouchStrafe 16/16 (AF4a's 9 + 7 new: one knee with the lead flipping, pistol spread, gun clear on strafe aimed and low
ready, wall slide both ways and reversal, pistol low-ready crouch -> kneel -> stand pop and clearance push (push 4.2 cm
by the crouch alone, 0 now); the old kneel rule fails 2 of them), keyedCrouch 8/8, mocapCrouch 7/7, mocapStrafe
12/12, rig 21/21, mocapPlayer 10 (+1 skipped), mocapSwitch 13/13, bodyMotion 13 (+1), animSkeletonIdentity 1 (+1),
animFixPass 1/1 (its before/numbers.md rewrite not committed; copy in after-af4b/numbers.md). `npx tsc --noEmit -p .`
clean; eslint on animGraph.ts and crouchStrafe.test.ts clean.
e2e (desktop, E2E_GPU=1, JOBS=1): e2e-anim on 3b61826e + z 0.16 FAIL only on "low ready still: crouch -> stand" (14.5,
wristL); every other assert passed. The cause was found with an in-game repro of the e2e's stand <-> crouch block (an
uncommitted zz script, the pistol in hand as in the full suite): 14.5 before the fix, 5.5 after (all 9 transitions within
their gates). The full e2e-anim and e2e-clip on the final head are NOT run: the orchestrator stopped desktop e2e
(laptop queue).

## Open items
- e2e-anim and e2e-clip on this head (laptop).
- Hip swing on stop-go / flips 6-8 cm p2p (bars 8.5 / 8 met) and knee-out 10 cm during kneel transitions: the kneel pose
  and the stop itself, not the keyed sway (see cause 2 above); a kneel-pose job if Michael still sees it.
- Wall reversal (pre-existing, unchanged): knee-out 33.9 cm and planted slide 9.2 cm as the body turns 180 deg; the pistol
  wrist reads 13 cm a frame in the root frame through that turn (held near the centre line). Not a bar here.
- The pistol low-ready crouched stop-go clears the legs by 0.6 cm (the kneel): small headroom.
- AF3 polish (lead's note): MOCAP_CROUCH_POSE.leanD is unused (the drawn crouch never takes the capture); left as is.
- Feel check for Michael: armed, the kneel is always on the right knee; crouched pistol low ready sits higher.

## Changelog
changes/feature-afp-af4b.md.
