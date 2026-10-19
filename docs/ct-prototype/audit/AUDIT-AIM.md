# Audit: aiming and weapons (2026-10-20)

Covered: rifle and pistol ADS pose, aim pitch / yaw, draw, holster, carry (sling), swap, scope, fire / recoil, crouched aim, reload.
Clips: 111908 (0-2, 15.6-17.2, 20-22.4, 24.8-27.2, 31.6-34), 111953 (3-4.6), 105845 (30.5-33.5), 051543 (12-33), 054237 (8-10.4), 053709 (31-39), 053525 (34-36.8), 034747 (1.0); frames in `pc/ct-work/frames/aim/`. Ours: `pc/ct-work/ours/aim*`, `swap/reload/drawpistol/holster-side`, `docs/ct-prototype/shots/f/aim*`, `draw-side`.

## Correction to the catalogue (read first)
The rifle is NOT carried in both hands outdoors. 053525 35-36.8, 053709 34.5-38 and 054237 8-9 all show it slung
diagonally across the back in the lit courtyard: upper end (stock) at the right shoulder blade, muzzle down to the left
hip, about 45 deg from vertical, hands empty (frames `c053525_courtyard_34-36.8.jpg`, `c053709_sling_34-38.jpg`,
`c105845_sling30.6_crouchaim32.4.jpg`). Same indoors. The "both hands, muzzle low" read was the backlit slung rifle.
So: one carry everywhere, slung; weapon in hand only while aiming (our current rule is right; no outdoor carry state).

## Delta table (most visible first)
| # | item | CT (clip @ s, value, how) | ours (file:symbol, value) | delta | fix | size | feel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Rifle draw: back to cheek | 111908 20.88 off the back, at the cheek 20.98-21.05, settled 21.1 (30 fps): ~0.15-0.2 s travel, no mid pose; camera in 20.65-21.0 (0.35 s); 054237 camera 9.35, cheek 9.75-9.8 | `drawState.ts` DRAW_TIME_PRIMARY 0.4 + `weaponCarry.ts` DRAW_RAISE {from 0.5, time 0.45}: off back 0.15 s, held at chest 0.25-0.55 s, at eye 0.6-0.75 s (shots/f/draw-side) | ours ~0.3 s slower and has the chest hold Michael calls "weird low ready" | DRAW_RAISE.from 0.5 -> 0.3, DRAW_RAISE.time 0.45 -> 0.2, DRAW_TIME_PRIMARY 0.4 -> 0.3; swap clip back-slot `travelKeys` pocket arrival 0.8 -> 0.65 | S | 3 |
| 2 | Holster (rifle and pistol) | Instant: rifle on the back in the first pull-out frame (111908 31.9 aim, 32.0 slung, 15 fps); pistol gone 15.87 -> 15.93; camera out to ~2 m in ~0.4 s; hero walks off at once | `drawState.ts` HOLSTER_TIME 0.55 s; rifle muzzle sweeps up over the helmet 0.20-0.33 s (ours/holster-side) | ~0.45 s too long and a visible arc | HOLSTER_TIME 0.55 -> 0.2 (G103's 0.5-0.6 was the camera lower; the weapon itself is instant in footage); keep CAMERA.adsOutRate 7; rifle path: muzzle down toward the left hip, never up (see #3) | S | 3 |
| 3 | Back carry orientation | Diagonal, stock at right shoulder, muzzle down to left hip, ~45 deg (refs above) | `operators/handFrame.ts` WREN_BACK_MOUNT backC up [0,1,0]: vertical, muzzle up, barrel ~0.3 m above the helmet (ours/aim-front 0.00) | wrong look; causes #2 arc and ceiling / duct / door-frame clipping | new mount frame `backDiag`: up ~[-0.7,-0.7,0] (muzzle down-left), origin at the right shoulder blade; `actions.ts` REACH back key -> [0.14, 1.3, -0.12] over the right shoulder; draw = swing about the right shoulder up and forward into the pocket. Needs a Blender anchor (scripts/operators) or a game-side override | M | 3 |
| 4 | Upper body rigid, tilt at the hips | 051543 15-30 pitch to ~60-65 deg down: head + rifle hold the same relative place in frame the whole way (rigid block); split hips vs spine not visible (estimate) | `animGraph.ts` spPitch share AIM_CHEST.pitch 0.75, head adds aimPitch*0.45 on top, pelvis 0; weapon set to full aim pitch in world (`characterRig.ts` ~1776) so the remaining 25 % bends at the wrists, head over-rotates (~1.2x) | wrists and head carry aim; no hip hinge (Michael WALK: "weapon still turning at wrists ... tilt at the hips") | raised: pelPitch += aimPitch * 0.35 * raise (clamp +-0.35 rad), spPitch share 0.75 -> 0.65 (pelvis + spine = 1.0), head share 0.45 -> 0.45 * (1 - raise) (weld only when raised), HUNCH.aim 0.05 -> 0.1; pelvis Z back 0.08 * sin(pelPitch) for balance; feet stay planted by IK | M | 3 |
| 5 | Pistol hold | Two hands, compact, hands below and right of the head at chin height: hands centre x 0.39, y 0.68 of frame vs head 0.22 / 0.45 and reticle 0.5 / 0.5; gun under the sight line, forearms rising from below (111908 2.2) | `animGraph.ts` PISTOL_REACH {x -0.07, y 0.015, z 0.1} + SIGHT_RAISE: pistol at eye height ~25 cm from the face, elbows bent high, forearms vertical in OTS (shots/f/aimpistol-ots), torso leaning back (ours/aimpistol-side) | too high, too close, chest back | PISTOL_REACH.y 0.015 -> -0.06, z 0.1 -> 0.2, x -0.07 -> -0.09; raised pistol: chest forward (HUNCH.aim applies, add spPitch +0.08 * pistolK); no SIGHT_HEAD roll for pistol | S | 3 |
| 6 | Aim framing (head in frame) | Head centre x 0.20-0.22 of width, ~30 % wide (111908 2.2, 23.5; ct-measure-camera.md s.2) | `camera.ts` shoulderAds 0.42, boomAds 0.35: head at x 0.0-0.08, partly off-frame; whole rifle receiver at frame bottom centre (shots/f/aim-ots) | head too far left; rifle too visible | shoulderAds 0.42 -> 0.22 (estimate; check with the camera audit; F1a raised it after playtest 1) | S | 2 |
| 7 | Pistol draw timing | Camera starts 0.6, pistol in view 1.17, settled 1.5 (111908, 12 fps): ~0.55 s; 051739 0.63-0.73 s | DRAW_TIME_SIDEARM 0.3; pistol at eye 0.20-0.27 s (ours/drawpistol-side); adsInTime 0.27 s | ours ~0.25 s fast | DRAW_TIME_SIDEARM 0.3 -> 0.5 (Michael halved G103 in F1a: confirm; else keep 0.3) | S | 2 |
| 8 | Scope | Hard cut in (111908 25.3-25.4) and out (26.0-26.1); first person, circular reticle, "1.5 X" label, range readout in m (15.2-16.6 m) | `weapons.json` rifle adsZoom 0.72 blended on the OTS camera (`shoulderCamera.ts` zoom), hero still on screen, no overlay | no first person, no overlay, wrong zoom | zoomOn: camera to the sight point, hide the body, FOV / 1.5 (adsZoom 0.72 -> 0.667), 0 s blend both ways, DOM overlay ring + raycast range "xx.xxM" | M | 2 |
| 9 | Aim-press body turn | Facing camera to facing away in ~0.45 s (111908 20.25-20.7), then raise | `movement.ts` turnAim 360 deg/s, turnAccel 60: ~0.55 s for 180 | slightly slow | turnAim 360 -> 450 deg/s (= CT.turnRate 7.85) | S | 1 |
| 10 | Shoulder swap camera arc | Pull-back to ~0.85 m mid-swap (0.4 at rest), 0.40 / 0.43 s | `camera.ts` swapArc 0.3, swapRate 13 (~0.45 s) | arc a bit shallow | swapArc 0.3 -> 0.45 | S | 1 |
| 11 | Recoil (rifle, single shot) | Head and camera move under ~1 % of frame on the shot at 3.87 (111953, 15 fps); ammo 30 -> 29 same frame | camera kick 1.1 deg * 0.65 ADS + shake 0.04 (ok); weapon flip `animGraph.ts` rec * 0.12 / mass rad (~7 deg rifle, ~10 deg pistol) | weapon flip large (estimate: rifle mostly out of frame in CT) | flip 0.12 -> 0.05 rad; keep camera kick | S | 1 |
| 12 | Aim look rate (pad) | Body locked to camera, 60 deg/s pan, 120 deg/s fastest (051543) | BASE_YAW_RATE 3.6 * ADS_LOOK 0.3 = 62 deg/s, 87 with hold accel | top end low | none now (Michael: "Aiming is good too"); ADS_LOOK 0.3 -> 0.4 only if he asks | S | 1 |
| 13 | Swap while holstered | Selection only, no body motion (111908 18.5-19, 051812 7-10); next aim draws the new gun | `playerWeapons.ts` swap press sets swapT = 0 even when stowed (estimate: may play a reach) | check | when stowed: change index only, swapT stays -1 | S | 1 |

## Missing entirely
- First-person scope view with ring overlay and rangefinder (111908 25.3-26.0, 105845 10.5). Plan: #8; one camera mode flag
  in `shoulderCamera.ts`, overlay in `src/ui/hud`, range from the existing fire raycast. 1 slice.
- Diagonal back sling (all clips). Plan: #3; a `backDiag` frame in WREN_BACK_MOUNT and the carry slot, swap reach keys,
  travel path swinging about the right shoulder.
- Instant holster hidden by the camera fast-out (111908 15.9, 32.0). Plan: #2.
- Pistol one-handed over a held guard's shoulder, arm near straight at shoulder height, rifle still slung (034747 1.0).
  Plan: check the grab state draws the sidearm one-handed (pistolK pose with offGrip 0, arm reach 0.9).

## Clipping and believability risks in our renders
- Vertical back rifle: barrel ~0.3 m above the helmet (ours/aim-front 0.00); fills the OTS view behind the head
  (shots/f/aimpistol-ots 0.15); will hit ceilings, ducts, door frames.
- Holster / swap arc: muzzle swings up and back over the helmet at 0.20-0.33 s (holster-side, swap-side 0.20): barrel through the head risk.
- Rifle aim: head sits ahead of the stock line and the butt rides high on the shoulder (aim-side 0.60-0.75); Michael reports the stock clipping. Add a test: butt point vs the shoulder joint and deltoid capsule, at aim pitch -60..+45 deg.
- Pistol aim: torso leaning back with hips forward, pistol 20-25 cm from the face, forearms vertical (aimpistol-side, -ots).
- Stance while aiming: feet side by side and narrow (aim-side, aimpistol-side); a light bladed stance (left foot ~0.15 m forward) reads more believable (estimate, legs never seen in CT aim).
- Front rifle aim: support forearm flat across the chest (aim-front 0.60) is fine; no clip seen. Reload (reload-side) no clip seen.

## Not measurable from the footage
- Hip vs spine split of the aim pitch: CT never shows a third-person view of an aiming hero; only that head and rifle stay rigid together (051543).
- Legs, stance and aim walk / strafe gait: legs out of frame in every aim clip (050541 has no visible strafe).
- Reload: no reload in any clip.
- Draw / holster path: hidden by the camera move and the head; only start and end times.
- Pistol arm extension in metres: one view, no depth ruler.
- Weapon swap while aiming: never done in the footage.
- Mouse aim behaviour: no input display.
