# CT camera, measured from footage

Measured 2026-10-17 from Michael's Chaos Theory clips for P15 (close aim camera) and P16 (shoulder swap), pure CT per DECISIONS M20.
Read-only research; nothing here is a decision. Scratch frames: `pc/ct-work/frames/camera/` (local only).
Clip names are `clip_13570_20261017_HHMMSS.mp4`, shortened to `HHMMSS`; times are seconds from clip start.

## 0. Method and assumptions

- Clips: HEVC 2420x1668 (aspect 1.451), constant 60 fps (ffprobe r_frame_rate 60/1, avg 60.0). Timing is frame-stepped at 20-60 fps; +-1 frame = +-17 ms, transition edges +-2-3 frames.
- **FOV assumption: 75 deg horizontal across the full 2420 px width** (CT `DefaultFOV 75`, research S17). Focal length f = 1210 / tan(37.5) = **1577 px**; vertical FOV 55.7 deg. If CT instead renders Hor+ from 4:3 (vertical 59.8 deg, 79.7 deg horizontal at this aspect), every distance below shrinks by 8 %.
- Distance from size: d = f x real size / pixels. Body sizes used: the hero 1.80 m, shoulder breadth over the arms 0.55 +- 0.05 m (bulky suit), head (with cap) 0.16 m from behind, 0.19 +- 0.02 m from the rear three-quarter.
- Cross-check: in 051709 the door opening (assumed 2.1 m tall, 660 px at 0.6 s) gives door distance 5.0 m; the hero (shoulders 500 px) is 1.7-1.75 m from the camera, which puts him 3.3-3.4 m from the door. Michael's note says ~3 m. The two cues agree within ~10 %, so the camera figures below are good to roughly +-15 %.
- The night-vision overlay has barrel-like distortion near the edges (walls bow). All size measurements are taken inside the middle ~60 % of the frame.
- The PC camera is orbited by hand (Michael), so pitch and yaw drift; the measurements use what stays constant across clips (target point, distance, lateral offset).

## 1. Explore camera

### 1.1 Framing at rest and walking
| Measure | Value | Source |
| --- | --- | --- |
| The hero's head top on screen | at frame centre, y = 0.49-0.51 of height, in every explore clip and at every pitch (17 deg to ~50 deg down) | 051709 0.6 s (y 836 of 1668), 053525 28 s (833), 051636 16 s (820), 051606 1 s (~840) |
| Visible body | head to mid-thigh / knee at the default pitch; feet cut off. Whole body only when pitched steeply down | 051709 0.6, 053525 1-32 s; 051606 (steep) |
| Shoulder width on screen | 470-500 px (19-21 % of width) | 053525 28 s 470 px, 051636 16 s 500, 051709 0.6 s 500 |
| Head width | 110-112 px (4.6 %) | 053525 28 s, 051709 0.6 s |
| Horizontal position, walking straight away | The hero's spine at 0.42-0.50 of width (slightly left of centre), typical 0.45 | 053525 sheet 1-32 s; 051709 0.6 s head at x 1050 |
| Horizontal position with lead room | 0.33-0.38 or 0.56-0.62 (see 1.3) | 051636 2.5-6.4 s, 7.5-11.5 s |

### 1.2 Geometry (estimates)
| Quantity | CT estimate | How |
| --- | --- | --- |
| Distance camera to the hero's upper back / head | **1.8 m +- 0.25** (shoulder width 1.6-1.85 m; head width 2.2 m; door solve 1.75 m) | sizes above |
| Horizontal distance behind the hero | 1.65-1.9 m | door solve, 051709 0.6 s |
| Camera height | **~2.3 m** (0.5 m above the head top) at the observed ~17 deg pitch | door solve: horizon at row 345, camera height 2.34 m |
| Pitch | ~17 deg down (051709, from the horizon and the door's converging sides); ~25 deg in 051636 16 s (from converging pillars); player-controlled | |
| Look-at / pivot | The hero's **head top (~1.8 m)**: it stays on the frame centre whatever the pitch, so the camera orbits a point at head height and aims at it | all explore clips |
| Lateral (shoulder) offset | **0.1-0.2 m** to the hero's right (the hero's spine 100-200 px left of centre at ~1.8 m) | 053525, 051709 0.6 s |

### 1.3 Automatic side swing (F2)
- 051636 5.6-8.0 s (Michael swinging the camera round while the hero walks): the hero sits at 0.33-0.38 of width while the view looks to one side of his heading, then slides to 0.56-0.62 as the view swings to the other side and he walks screen-left. The slide from 0.36 to 0.56 takes **~1.0-1.2 s** (6.4 s to 7.6 s), smooth, no snap.
- Size of the swing: +-0.10 to 0.14 of screen width from the straight-ahead position, i.e. about **+-12-15 deg of bearing** (~+-0.4 m at 1.8 m). The hero is pushed to the side away from where he is heading, so the screen opens in his direction of travel (matches research S15).
- During fast runs and 180 deg reversals (051421 0-13.5 s) the hero stays inside 0.38-0.57 of width: the lead offset shifts but never more than ~0.1 of width.

### 1.4 Follow and stop (F1)
- 051606 0-8.75 s (walk away then stop, 4 fps crop sheet): the hero's head stays on the same screen spot within ~15 px through walking, slowing and standing. At that pitch 15 px is ~0.02 m of ground lag. **The camera follows rigidly**: no visible spring lag behind the walking hero, no overshoot or settle when he stops, no head bob on screen.
- The 3 s "settle" in the shot list is not visible: nothing moves after the stop at ~7.3 s.
- Runs (051421) show only the lead-room drift above, not a distance lag (the hero's size stays constant).

## 2. Aim camera (rifle and pistol)

### 2.1 Framing
| Measure | Rifle | Pistol | Source |
| --- | --- | --- | --- |
| The hero's head width | 700-730 px (29-30 % of width) | 690-730 px | stills 145602, 161703 (rifle); 145628, 161743, 051812 1.8 s (pistol); 051709 2.5 s |
| Head centre, right-shoulder aim | x = 0.20-0.22 of width (~680 px = 23 deg left of the reticle) | same | 145602, 161703, 145628, 051709 2.5 s |
| Head centre, left-shoulder aim | x = 0.78-0.81 (mirror) | same | 145605, 145631, 051812 2.8 s, 052059 3.6 s |
| Head top | y = 0.25-0.27 of height (0.09 when aiming pitched down) | same | stills; 052059 3.6 s |
| What else is in frame | neck, shoulder and upper arm fill the lower corner on the hero's side; the hands and weapon sit just inboard of the head, 170-500 px from the reticle | same | |
| Reticle | screen centre | screen centre | all |

### 2.2 Geometry (estimates)
| Quantity | CT estimate |
| --- | --- |
| Camera to head centre | **0.4 m +- 0.1** (0.19 m head over 730 px at f 1577) |
| Behind the head | 0.35-0.45 m |
| Lateral from the head centre (towards the weapon shoulder) | **0.16 m +- 0.05** (0.4 x sin 23 deg): the camera sits right over the firing shoulder |
| Height | head height: the head centre sits 4-6 deg above the screen centre; with the 15-17 deg down aim in 051709 that puts the camera ~1.8-1.95 m, i.e. eye height to head top |
| FOV change | **none measurable (0 to -10 %)**. 051709: the door grows 660 to 964 px (x1.46) from explore to aim. With the camera moving from ~1.75 m behind to ~0.38 m behind the hero who stands 3.0-3.4 m from the door, an unchanged FOV predicts x1.4-1.5; a x0.75 zoom would need the camera to move backwards. |
| Pistol vs rifle | same framing within measurement error (pistol head ~3 % smaller, 0.42 m vs 0.40 m) |

### 2.3 Transition timing (60 fps clips)
| Event | Duration | Shape | Source |
| --- | --- | --- | --- |
| Pistol, into aim (the hero already facing) | camera moves 0.13-0.15 s, reaches the aim framing ~0.65 s, settled 0.73-0.77 s: **~0.6 s** | ramp in, close to linear then eases; **camera leads the weapon**: the pistol only comes up into view at 0.63-0.73 s | 051739 0.10-0.87 s at 30 fps |
| Rifle, into aim with a ~90 deg body turn | camera starts 1.1-1.2 s, overshoots slightly in (door width 100 at 1.5-1.7 s vs 85 final), settled 1.9-2.0 s: **~0.75 s** | | 051709 0.6-3.0 s at 10 fps |
| Rifle, out of aim | last aim frame 7.75 s, big jump by 7.85 s, settled ~8.3 s: **~0.5 s** | fast-out: about half the distance in the first 0.1 s | 051709 7.3-8.75 s at 20 fps |
| Pistol, out of aim | 2.45 s to ~3.05 s: **~0.6 s** | fast-out (half way by 2.5 s) | 051739 at 10 fps |

## 3. Shoulder swap while aiming (F5)

| Measure | Pistol | Rifle | Source |
| --- | --- | --- | --- |
| Duration (last framing to new framing settled) | **0.40 s** (2.09 to 2.49 s, 24 frames) | **0.42-0.45 s** (12.17 to 12.59-12.6 s) | 051812 at 60 fps |
| Camera path | not a sideways slide: it pulls **back and across**. Mid-swap (pistol 2.15-2.29 s, rifle 12.25-12.35 s) the hero's head width halves (~380 px), so the camera is ~0.8-0.9 m away, centred behind his back (spine at 0.45-0.50 of width), then it moves in to the mirrored framing | same | |
| Order | **camera first**: the first moving frame (2.10 s / 12.18 s) shows the camera already pulled back while the gun has not moved | same | |
| Weapon | leaves the old side and goes out of view at the centre of the chest during the wide mid-point; the pistol is still out to the old side at 2.25 s and is up on the new side by 2.39 s; the rifle stock shows on the new shoulder by 12.50 s. Arrival ~0.1 s before the camera settles | rifle swap 0.03-0.05 s longer; also a visible head turn and shoulder lift at 12.18-12.23 s | |
| Grip either side | two-handed, mirrored: hands and gun ~0.1 m inboard of the cheek on the camera side. Which hand is on the grip is **not resolvable** in the night-vision silhouettes; the mirrored pose is consistent with the manual's "moves the gun to the other side" | stock on the new shoulder; same mirrored framing | crops `c051812_p18`, `c051812_p28` |
| Raise vs swap | a swap does not drop to the explore camera: it is a separate, shorter blend through a mid-distance point | | |

Extra swaps (050541 46-58 s) were not frame-stepped (budget).

## 4. Crouched aim and wall camera

### 4.1 Crouched aim
- No dedicated clip (F7 missing). 052059 3.6 s (aiming after leaving a crouched wall position, stance not confirmed): left-shoulder aim, head 720 px wide, centre at x 0.81, pitched down; same distance and offset as the standing aim, mirrored. Read: CT keeps the same close shoulder framing and lowers it with the head. Unconfirmed.

### 4.2 Wall camera (G1-G5)
- **Correction to the catalogue**: in 051917 2-10 s the hero shows his back (the back light patch and the goggle strip seen from behind; the front still 145524 has no chest patch), so that stretch is the hero at or near the wall facing it with the normal explore camera, and 4.5-5.4 s is an aim raise. The wall-mode front views are 051917 13-37 s, 052021 0-16 s and stills 161921-161947.
- Standing slide (052021 1 s, 051917 16 s): the camera is on the room side, **looking at the wall and at the hero's front / front-side**; whole body in frame, head top at 0.50 of height, feet at 0.98-1.0; the hero at 0.41-0.46 of width. Same distance class as explore (~1.8 m, shoulder width 400-480 px); camera above head height looking down.
- Crouched slide (052021 10 s, 051917 33 s): same camera, head top at 0.43, feet at the frame bottom, the hero at 0.33-0.5 of width (lead room towards the slide direction).
- At a corner / door frame (052021 4.2 s standing, 14.2 s crouched; 051917 21-28 s): the camera **moves in to ~0.8 m (+-0.2)** (head 265 px vs 112 in explore) and puts the hero at **0.72-0.77 of width** with his face turned past the corner, so the left two-thirds of the screen show the space beyond the corner (the door frame here).
- On the wall Michael orbits a lot, so the wall-entry swing (behind to front) was not timed.

## 5. Comparison

Night Shift values from `research/current-code.md` section 7 (`config/camera.ts`, `shoulderCamera.ts`).

| Item | CT measured | Night Shift now | Change needed |
| --- | --- | --- | --- |
| Explore distance | ~1.8 m slant to the hero's head (+-0.25), 1.65-1.9 m behind | boom 2.2 m | shorten to ~1.8 m |
| Explore target / height | head top (~1.8 m) on the frame centre; camera ~2.3 m high at the default ~17 deg pitch | pivot 1.62 m | raise the pivot / look-at to ~1.75-1.8 m so the head top sits on centre and the default view looks down over him |
| Explore lateral offset | 0.1-0.2 m (the hero at 0.42-0.50 of width) | shoulder 0.62 m (the hero ~16 deg off centre, ~0.32 of width) | cut to ~0.15 m |
| Auto side swing | lead room +-12-15 deg (+-0.10-0.14 of width), away from the travel direction, ~1.0-1.2 s blend | auto-recentre after 1.5 s; no lead room noted | add a travel-direction lead offset; keep it smooth (~1 s) |
| Follow | rigid, no visible lag or settle, no bob | follow spring 16 (~125 ms) + look-ahead 0.14 x v (cap 0.3 m) | stiffen the follow (lag <= ~20 ms) or drop the spring; drop look-ahead in favour of the lead offset |
| Aim distance | ~0.4 m (+-0.1) camera to head, 0.35-0.45 m behind it | boom 1.5 m | ~0.4 m (P15 "much closer") |
| Aim lateral | ~0.16 m (+-0.05) from the head centre, over the weapon shoulder; head at 0.21 / 0.79 of width, ~29 % of width wide | shoulder 0.58 m | ~0.16-0.2 m |
| Aim height | eye height to head top (~1.7-1.9 m) | pivot 1.62 m (hip) / 1.18 (crouch) | ~eye height; crouched follows the head |
| Aim FOV | unchanged (0 to -10 %) | x0.75 (75 to 56 deg) | remove or reduce to >= x0.9 |
| Into aim | 0.6 s (pistol), 0.75 s with a body turn; camera leads, weapon up at ~0.65-0.75 s | not in the survey | camera blend ~0.6 s, weapon raise finishing after the camera |
| Out of aim | 0.5-0.6 s, fast-out (half way in 0.1 s) | not in the survey | ease-out curve, ~0.5 s |
| Shoulder swap camera | 0.40 s (pistol) / 0.43 s (rifle); arcs back to ~0.85 m behind the spine then in to the mirror side; starts first | camera-only slide | 0.4-0.45 s arc through a pulled-back mid-point |
| Shoulder swap weapon | weapon leaves the old side, crosses at chest height out of view during the wide mid-point, appears on the new side ~0.3 s in; two-handed mirrored grip | weapon stays right-handed (except D9 wall edges) | real transfer to the other shoulder / hand, timed inside the camera arc (step 25, P16) |
| Wall camera | room side, facing the wall and the hero's front, whole body, ~1.8 m; at a corner moves in to ~0.8 m and puts the hero at 0.72-0.77 of width so the space past the corner fills the screen | wall boom 2.6 m, shoulder 0.55, behind the hero; peek swings the pivot 0.6 m and turns up to 25 deg | shorten; at the corner move in and offset the hero hard to the far side (P7 "can't see around the corner") |
| Crouched aim | same close shoulder framing, lowered (one unconfirmed sample) | pivot 1.18 crouched | same offsets as standing, pivot follows the head |

## 6. Gaps
- Exact hand on the grip after a swap (NV silhouettes), crouched aim (F7), wall-entry swing timing, sprint FOV, the 050541 extra swaps: not measured.
- A normal-vision clip (lit room, 053709 32-38 s) would allow hand detail and a better head size; none of the aim clips are in normal vision.

## Frames used (`pc/ct-work/frames/camera/`)
`f051709_t06`, `f051709_t25` (explore vs aim geometry), `c053525_t28`, `f051636_t16`, `f051606_t01` (explore), `s051636_0_12`, `s051636_swing` (side swing), `s051606_crop`, `s051421` (follow), `s051709_raise`, `s051709_lower`, `s051739_all`, `s051739_raise30` (aim timing), `stills_aim` (A2 / A3 / F3 / F4 stills), `s051812_pistolswap`, `s051812_pistol60`, `s051812_rifleswap`, `s051812_rifle60`, `c051812_p18`, `c051812_p28` (swap), `f052059_t36` (aim after wall), `wall_4`, `wall_052021`, `s051917_entry`, `s051917_45`, `stills_wall` (wall).
