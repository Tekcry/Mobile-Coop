# CT measured: back to wall, doors, close combat, vision modes

Measured 2026-10-17 from Michael's Chaos Theory footage for M20 (pure CT) and play notes P5-P11. Read-only pass; frames in `pc/ct-work/frames/walls/` (local, not committed).

How measured:
- Clips are HEVC 2420x1668, variable frame rate, 55-60 fps (`r_frame_rate` 60). Frame-stepped at 4-30 fps with burned-in timestamps. Times are seconds from clip start; +-0.03 s at 30 fps steps, +-0.1 s at 10 fps.
- The CT camera follows the hero and Michael orbited it by hand. Background tracking was tried for slide speed (`shift.js`) but camera orbit dominates, so speeds come from the hero's own stride (shuffle cycle x step length, scaled by his height of about 1.65 m with bent knees). They are +-30%.
- PC CT sets walk speed with the mouse wheel. The footage does not show which wheel step was used, so a speed is "as recorded", not "full stick".
- Colours are sampled from decoded frames (sRGB 0-255, mean +- std over a 30x30 or 20x20 patch). HEVC smooths flat noise a little, so grain is a lower bound.

Catalogue corrections:
- 051917 0-11 s is not "on the wall, front view": the hero walks up to and stands FACING the wall, seen from behind (0.3-3.5 approach, 9.4-10.2 both arms raised overhead, then an aim 11.0-12.0). The back-to-wall entry is at 12.8-13.2; the standing slide is 13.1-20.5.
- 052206 2-20 s is a crouch-walk alongside the counter, not a back-to-wall hold.

## 1. Back to wall (G1-G9)

### Stance, standing (stills 161921, 161923, 161926; 051917 13-20 s; 052021 0-3 s)
- Flat back, square to the wall: the camera faces the wall and the hero's chest faces the camera. Shoulder line is parallel to the wall, within about 10 deg (shoulders read square in all three stills).
- Pelvis and shoulder blades on the wall. The upper chest is pitched slightly forward (about 10 deg) and the shoulders roll forward. The head is NOT on the wall: it is dropped forward 15-25 deg and turned 45-70 deg toward the travel / edge side (161921 turned to his right, 161926 to his left, 051917 13-20 toward travel).
- Knees bent about 25-35 deg at rest, deeper in the shuffle. Feet wide: about 0.5-0.6 m ankle to ankle at rest.
- Arms: hanging at the sides, slightly away from the thighs. Elbows bent about 10-20 deg, hands at mid-thigh, open and relaxed. Hands are not on the wall. No weapon in the hands.

### Stance, crouched (stills 161937, 161944, 161947; 051917 29-37 s; 052021 9-16 s)
- Not a flat back. The torso turns 60-90 deg toward the travel direction, so the hip and the wall-side shoulder / upper arm are on the wall. This is the "sideways shoulder-to-wall" Michael chose (M20 Q3: "CT is like this already").
- Deep crouch: spine pitched 40-55 deg forward over the knees. Head forward of the knees, looking along the wall in the travel direction.
- At rest one knee is down or near the floor (161947: the trailing knee on the floor, the lead foot planted, thigh near horizontal). Hands hang low: one near the lead knee, one near the floor.
- Head height about 0.9-1.0 m: in 052206 (7 s, 16 s) the cap top sits just below the lip of a waist-high counter (about 1.0 m; it reaches the hero's belt when he stands, 26 s).
- Changing direction (051917 32.67-33.17) turns the body through square-on to the wall and round to the other side in about 0.4-0.5 s.

### Entry
- One button press. Two clean cases: 051917 12.8-13.2 and 052059 14.4-14.85. Facing the wall, the hero spins 180 deg on the spot and his back lands on the wall in 0.3-0.45 s (+-0.1). There is no slide or glide toward the wall: he was already within about 0.5 m.
- From standing beside the wall (side-on) the turn is shorter, about 90 deg in about 0.25 s (inferred from the same rate).

### Slide
- Standing (051917 15.5-18.0): a side-step shuffle. Feet go wide, the trailing foot closes, repeat. Cycle (wide to wide) is 1.1 s +-0.1 (wide 15.5 / 16.6 / 17.6, narrow 16.06 / 17.19). Ankle spacing is about 0.6 m wide and 0.2-0.25 m narrow, so it gains about 0.35-0.45 m per cycle. Speed is about **0.35 m/s +-0.1** at the recorded wheel step.
- The body stays square to the wall while sliding standing. The head leads in the travel direction. The knees bob down at the narrow phase (head dips about 5 cm). There is no torso lean.
- Crouched (051917 29-37; 052021 9-13): a sideways crouch-walk facing the travel direction, the lead leg stepping out and the trailing knee dropping low. Speed is not measurable from these clips (camera orbit). Visually it is the same as or slower than the standing shuffle: about 0.25-0.35 m/s, low confidence.
- Michael's N5 ("moves too quick along the wall") fits: Night Shift is 0.9 / 0.6 m/s.

### Wall end / outside corner (051917 20.5-28.5, 052021 3.2-5.25)
- The hero stops at the edge. Body stays on the wall. Feet do not step past the edge.
- Peek, standing: the head turns about 80-90 deg toward the opening and the head and wall-side shoulder lean out past the edge by about 0.15-0.25 m. There is no step out, no torso lean-out and no weapon.
- Peek camera (051917 21.0-21.375; 052021 3.5-3.75): the camera cuts or swings quickly in 0.3-0.4 s +-0.1. It moves sideways to the open side, past the corner line, and in to about 1.0-1.5 m from the hero's head, near his head height. It yaws about 40-60 deg toward the hidden space. The hero's head and shoulder end at the screen edge on the wall side, and most of the frame shows the space round the corner (051917 22.5: the door down the side passage fills the frame).
- The peek holds as long as the stick is held toward the edge (052021 3.75-5.0, about 1.25 s). The return to the slide camera takes about 0.25 s (5.0-5.25).
- Crouched peek (051917 25.5-28.5): the same, from the crouch. The hero's head comes up a little to about 1.0 m and the camera uses the same close side framing.
- Trigger: it starts as the hero reaches the edge while still pushing toward it (no extra button seen).

### Leaving
- Drawing or aiming leaves the wall at once (052059 0.0-0.5 crouched and 11.6-12.0 standing). On the aim press the camera swings to the over-shoulder view in about 0.27 s (11.6-11.87). The hero spins to face the camera's forward, here INTO the wall, and has the rifle up by about 0.4 s (12.0). There is no aim pose on the wall and no lean-out shot (Michael's G6 note, confirmed).
- Leaving by button or by pulling away is not clearly recorded. 051917 38.5-39.75 shows the hero stand from the wall crouch (about 0.3 s) and then go side-on, but the input is unknown. Assume the CT manual: press the button again. Mark this "unverified on footage".

### Low cover (052206)
- There is no cover pose for low cover. Along the counter the hero simply crouch-walks parallel to it, side-on (the counter on his shoulder side), head just below the counter top (2-20 s). Standing (21-37) he walks or back-to-walls past it with the top at belt height.
- There is no aiming over cover (Michael's G8 / G9 note): aiming is the normal crouched aim with no rise.

## 2. Doors (H1-H6)

### Interaction model (052349, 052752, 052952, 053049)
- A context menu at the door lists OPEN DOOR / OPEN DOOR STEALTH / BASH DOOR / OPTIC CABLE (unlocked). A locked door lists PICK LOCK / BREAK LOCK / OPTIC CABLE (053049 10 s, 052901 12.5 s). With a door stealth-ajar the menu becomes OPEN DOOR / BASH DOOR (052349 15-18). With it open the menu is CLOSE DOOR.

### Stealth open (052349)
- Quick stealth push (stick near full; select at about 4.9 s): 5.25-5.9 the hero sidesteps to the latch side and turns 30-45 deg toward the door, hand rising to it (0.65 s). The door starts at 5.95. Angle from the door's apparent width (+-10 deg): 6.1 about 45 deg, 6.2 about 57, 6.3 about 69, 6.6 about 73, 6.7-7.0 about 78. It then drifts on its own to about 85-90 deg by 9 s.
  - So the peak is about 200-250 deg/s for the first 0.15 s, then about 125 deg/s, then easing. Closed to about 75 deg takes about 0.75 s.
- Body: the hero's near arm is extended with the palm on the door from 6.1 to 6.5 (he pushes it; the hand follows the door to about 60-70 deg, then lets go). The torso leans in about 10 deg. Arms are back at his sides by 6.8. Feet stay planted.
- Slow stealth push (select 14.1): 14.5-14.75 the same step-in to the latch side, then the camera moves IN to about 0.3-0.6 m from the door face at the hero's head height (15.0), a close door-crack view. The door starts at about 15.6 and opens steadily to about 30-45 deg by 18.25 (2.6 s). That is about **12-18 deg/s**, roughly constant, so it follows the stick. At 18.5 the camera pulls back to the normal follow camera as the hero walks through.
- Close: CLOSE DOOR is a menu action (052349 19-20; 052752 5-6). In 052752 the door goes from open to closed in under about 1 s (+-0.3; CLOSE prompt at 5.1, OPEN prompt by 5.9). Closing by walking backwards with the stick was not recorded.
- Walking through: the hero walks through at normal speed with no hand on the door once it is open (052752 3.9-4.6).

### Optic cable (H5, 052952 19-23 s; 13-16 s)
- Select OPTIC CABLE (19). The hero crouches at the door and the view cuts to the cable view in about 1.5-2 s.
- The cable view is full screen and floor-level, looking under the door into the room. It is a strong fisheye (about 120-140 deg; lamps and walls bow), with a rounded-rectangle vignette, in the current goggle mode. It pans (14 s shows a pan). Exit cuts back to the follow camera.

### Lockpick (H6, 053049 10-24 s)
- PICK LOCK cuts to a full-screen close-up of a pin-tumbler lock with a pick in it (about 6 pins). It lasts about 12 s in this clip. The goggles can be switched inside it (12-14 NV, 15-24 normal).

### Guard and open doors (H3)
- 052832 shows a guard walking through a door. No reaction to an open door is recorded.

## 3. Close combat (I1-I7)

### Non-lethal strike from behind (I1, 052527)
- Range at the press: the hero's chest about 0.6-0.8 m behind the guard's back (1.9 s), so 0.8-1.0 m centre to centre.
- Timeline (30 fps step): the arm leaves his side at 1.95. At 2.05 the open hand is at the guard's neck. **Contact at 2.10 +-0.03, so wind-up to contact is 0.15 s +-0.05.** The arm stays extended on the guard's head to about 2.35. The guard's head snaps forward 2.15-2.3.
- Move: a one-handed **open-palm strike, palm heel to the back of the head / neck**, with the arm straight. The hero steps in with the same-side foot, lunging about 0.3-0.5 m.
- Guard: head forward and arms flung out (2.3). He crumples forward and down 2.4-2.6 and is on the floor by about 3.3 (about 1.2 s after contact). The hero follows him down bent over (2.6-3.9). The guard is out cold with no further input: the context menu offers BODY at 4 s.

### Strike from the front, coming in at a run (I2, 052502)
- The hero runs in (1.0-1.4) and slows to a walk within about 1 m (2.35).
- Wind-up starts at 2.42 (one arm swings forward and up). **Contact at 2.50 +-0.03 to the face / jaw: wind-up 0.1 s**, an open hand or forearm to the face. The other arm swings back for balance. The hero's body turns into it about 20-30 deg.
- Guard: head knocked back 2.55-2.75 and slumps against the wall / door 2.8-3.0. He goes down 3.0-3.9 with the hero staying in contact as he falls. He is on the floor by about 3.9 (about 1.4 s after contact).
- The hero's free control: he stands idle by about 3.9-4.0, about 1.4 s after contact. This includes the follow-down; whether input can cut it short was not recorded.
- One hit knocks the guard out from the front too (M20 Q4 "one-hit knockout from any side", confirmed). The I3 alert-guard case (054824, 055600) looks the same at 1 fps; not frame-stepped.

### Grab, human shield, carry (I6, I7)
- Grab: GRAB CHARACTER from the menu behind a guard (052607 2 s). He is held about 1 s later (3 s). The hero's arm is round the guard's neck from behind, the hero's head beside the guard's (034747 0.5).
- Hold: the INTERROGATE prompt stays. The hero walks the guard (052441 18-29, both moving at about a slow walk). Pistol drawn: the hero's right arm is extended over or past the guard's shoulder, aiming (034747 / 034803). The camera goes over the shoulder when aiming (034803 2.0-2.5).
- Knock out from the hold (052607 9-10). Carry is a fireman's carry over the shoulder at about a walk (052607 11-20, 052704 0-24). Drop: put down (053049 7-8) or tipped over a railing (052704 26-40).

## 4. Vision modes (K1-K4)

### Thermal (K1 053251; K2 053437, 052901)
- Palette: a false-colour ramp (sampled across the far guard, 053251 9.0 s, x 900-1020 at y 700):
  - background (33,9,63) dark indigo, then halo (31,12,86) and deep blue (3,12,222)
  - bright blue rim (2,23,251), then cyan-blue (57,151,255), then teal (13,127,109)
  - green (0,107,42), then yellow-green (161,212,9), then yellow (215,254,31)
  - orange to red core on the warmest areas (face, chest, armpits: 052901 6.5, 053251 9 near body)
  - Cold gear on the body (rifle and strap) shows as deep blue inside the warm figure (053437, 052901 12.5).
- Background: a near-uniform indigo (33-35, 8-13, 44-68) with a soft large-scale gradient. **The room is almost invisible even close**: walls, floor and furniture are flat. Doors and windows read only as slightly lighter blue-purple rectangles, very soft (053437 2-34, 054201 0.8).
- Hot objects: lamps are small cyan-green blobs. A lit window is a light cyan-blue patch (053437 36-42). People are always the hottest thing in view.
- Blur: everything is soft. A body edge goes from background to the bright blue rim over about 20 px at 2420 wide (0.8% of width) and carries a blue glow halo 20-60 px wide outside the silhouette. Inside the body there are no texture or clothing details, only blotchy heat regions. Faces are not readable.
- Noise: strong grain **only on warm areas** (std 17-23 per channel on a flat body patch). The cold background is clean (std 0.3-2.5). This is the opposite of the current Night Shift grain, which is strongest on the cold scene.
- Range: a guard at about 15 m (053251 18-44) is still a full-colour green / yellow figure with a blue rim, as bright as at 5 m. **There is no distance falloff on people.** What is hard to see at range is the world, not the people: you cannot read any geometry.
- Through walls / doors: **a guard behind a closed wooden door shows as a dim blue silhouette** (052901 12.5 s, at the low end of the ramp, soft). No case of seeing through a solid wall or glass was recorded.
- Comparison with `research/thermal-flir.md` (FLIR spec): CT is not realistic FLIR. It is a colour ramp, not White Hot. It has no lamp-light leak and no light or shadow. It keeps full brightness on bodies at range with no distance fade. Geometry is near-flat at every distance. It halos bodies. The FLIR spec's "heat not light" input (5.1), soft blur (5.2) and halo (5.5) agree with CT. Its White Hot palette (5.7), distance falloff (5.3) and A26 "never through doors" (5.9) do not.

### Night vision (K3, 053525)
- Monochrome pale green-grey: mid-wall (62,72,52) to lit (94,105,80). Bright light blooms to near white-green with soft bloom (053525 10 s window).
- Grain is fine and low, std about 2.5-3 per channel on flat walls (about 1%). Detail is fully readable at range.
- Binocular goggle mask: a circular eyepiece vignette with dark diamond corners, shared by all modes.

### EMF (K4, 053617; 054201 1.75-2.25)
- A flat dark navy fill (16,36,61) to (12,29,52) with almost no geometry; walls barely darker. Std about 1, no grain.
- Electronic devices are small white-hot glowing blobs with a soft halo, visible at range (053617 32-36).

### Mode cycle (054201)
- One button cycles thermal, EMF, night vision, normal. Each switch is an instant cut at 0.25 s step resolution, with no transition effect.

## Tables

### Back to wall
| Item | CT measured | Night Shift now | Change needed |
| --- | --- | --- | --- |
| Standing stance | Flat back, shoulders parallel (+-10 deg), chest pitched about 10 deg forward, head off the wall turned 45-70 deg to travel, knees 25-35 deg, feet 0.5-0.6 m, arms hanging, hands mid-thigh | Flat back, chest pitch about -0.02 rad, back within 3 cm, wide feet | Keep flat back. Add forward shoulder roll and chest pitch about 10 deg, a dropped and turned head (off the wall), deeper knee bend and relaxed hanging arms |
| Crouched stance | Sideways: torso turned 60-90 deg to travel, hip and shoulder on the wall, spine 40-55 deg forward, trailing knee near the floor, head about 0.9-1.0 m | Flat back crouch (chest -0.09); P6 / P8 "unrealistic" | Replace with the sideways shoulder-to-wall crouch. A direction change turns through square-on in about 0.45 s |
| Entry | Button only; spin 180 deg (from facing) in 0.3-0.45 s, no glide | Context press, 0.9 m / 100 deg cone, settle <= 0.45 s | Keep the press. Turn in place 0.3-0.45 s; shorten the reach to about 0.5 m (no visible glide) |
| Slide speed | About 0.35 m/s standing (+-0.1), shuffle cycle 1.1 s; crouched about 0.25-0.35 (low confidence) | 0.9 / 0.6 m/s | Cut to about 0.35 / 0.3 m/s at the default pace. Drive the shuffle cycle from speed (about 0.4 m per cycle) |
| Slide body | Square to the wall standing, head leads, knees bob 5 cm, no lean | P7 "awkward lean" | Remove the slide lean |
| Edge peek body | Stops at the edge. Head turns 80-90 deg, head and shoulder past the edge 0.15-0.25 m. Holds while pushing | Push > 0.6 for 0.25 s; head 0.25 m, rig lean 0.45; P7 head bends wrong way | Head yaw to the open side only, clamp. Small head-and-shoulder lean, no rig lean. Trigger on arrival while pushing (drop the 0.25 s wait or keep it short) |
| Edge peek camera | Moves in 0.3-0.4 s to the open side past the corner, about 1.0-1.5 m from the head, yaw 40-60 deg into the hidden space, the hero at the frame edge; back in 0.25 s | Pivot swings 0.6 m, turns up to 25 deg over 0.45 s; P7 "can't see around the corner" | Larger move: past the corner line, yaw 40-60 deg, close framing, 0.3-0.4 s in / 0.25 s out |
| Lean-out | None | Body 0.35 m past the edge, arc 85 deg | Remove (M20 Q1) |
| Aim on wall | Leaves the wall; camera to over-shoulder 0.27 s, the hero turns to the camera forward, rifle up at 0.4 s | Low wall: stands fully to aim; edge aim (D9 / D10) | Aim = leave the wall and do a normal aim. Remove the low-wall stand-to-aim and the edge aim |
| Leave | Aim or draw (seen); button again (manual, not seen) | Pull > 0.7 for 0.3 s or context | Keep the context press. Keep the pull-away only if Michael wants it (not CT-confirmed) |
| Low cover | No special pose: crouch-walk side-on, head just below about 1.0 m top; normal crouched aim | Always crouched; aim stands to 1.75 m | Remove low-wall special aim; crouched aim stays crouched |

### Doors
| Item | CT measured | Night Shift now | Change needed |
| --- | --- | --- | --- |
| Menu | OPEN / OPEN STEALTH / BASH / OPTIC (+ PICK / BREAK if locked) | Door peek and open | Match the CT list (names our own) |
| Stealth step-in | 0.4-0.65 s step to the latch side, turn 30-45 deg, hand up | None | Add a short step-in |
| Stealth open | Stick-driven. Slow about 12-18 deg/s, door-crack camera 0.3-0.6 m from the door. Fast push about 200 deg/s peak, closed to about 75 deg in 0.75 s, then drifts to 85-90 | Crack 0.12 over 0.6 s, then full open or close only | Door angle follows the stick, 0 to about 15 deg/s slow up to about 200 deg/s. Camera in close at the crack while slow |
| Body | Palm on the door while pushing up to about 60-70 deg, lean 10 deg, feet planted | No hand contact | Hand IK on the door up to about 65 deg |
| Walk through | Normal speed, no hand once open | Same | None |
| Close | Menu CLOSE, under about 1 s | Stick back 0.2 s or context | Keep, about 0.8 s close |
| Optic cable | 1.5-2 s in; floor-level fisheye about 130 deg, pans, goggle modes work | Not built (or not in this survey) | Later step |
| Lockpick | Full-screen pin close-up, about 6 pins | Not built (or not in this survey) | Later step |

### Close combat
| Item | CT measured | Night Shift now | Change needed |
| --- | --- | --- | --- |
| Trigger range | About 0.8-1.0 m centre to centre, guard in front | Reach 1.2 m, 90 deg cone, whiffs allowed | About 1.0 m (+0.2 lunge). Only with a guard in range (P5) |
| Wind-up to contact | 0.10-0.15 s (+-0.05) | Anticipation 0.15, contact 0.5 s | Contact at about 0.15 s |
| Move | One-handed open-palm strike: palm heel to the back of the head from behind; hand or forearm to the face from the front; same-side lunge 0.3-0.5 m; other arm swings back | Elbow strike | Palm strike (M20 Q4b) with a 0.3-0.5 m lunge |
| Hold after contact | Arm on the target about 0.25 s | - | Same |
| Guard | Out cold in one hit from any side; head snaps, crumples, on the floor 1.2-1.4 s after contact; BODY prompt | - | Match: one-hit KO, ragdoll or fall about 1.2 s |
| Total until the hero is free | About 1.4 s after contact (he follows the guard down) | 0.9 s total | About 1.4 s with the follow-down (can be shortened if it feels slow; P5 asked faster, so test) |
| Grab / shield / carry | Grab about 1 s; arm round the neck; walk with the hostage; pistol over the shoulder; KO from hold; fireman's carry at walk | (not in this survey) | Out of prototype scope unless Michael asks |

### Vision
| Item | CT measured | Night Shift now | Change needed |
| --- | --- | --- | --- |
| Thermal palette | Indigo bg, blue rim, cyan, green, yellow, red core | Cold blue-grey to white-hot | M20 says CT-pure. CT's ramp is a mechanic-level look, not a logo, but the FLIR doc warned against copying it. **Michael to choose: CT ramp vs White Hot** |
| Thermal input | Heat only; no light or shadow; geometry near-flat at all distances | Lit-scene luma (lamps read warm) | Heat-only input; flatten the world to about the bg level |
| Thermal blur / halo | Soft bodies, about 0.8% width edge, blue glow halo 20-60 px at 2420 | 4 taps at 0.0018 H, no halo | Wider blur (FLIR spec 0.0025-0.0035 H) plus an outer glow halo |
| Thermal noise | Heavy grain on warm areas (std 17-23 / 255), clean background | Grain strongest on the cold scene | Invert: grain scales up with heat |
| Thermal range | People full brightness at 15 m; no falloff | No falloff | No falloff on people (CT). The FLIR spec's distance fade is not CT |
| Through doors | Dim blue silhouette through a wooden door; no wall or glass case seen | A26: never | Michael decides: CT shows through doors (dim). Gameplay must stay unaffected |
| Night vision | Green-grey (62,72,52) mid, bloom on lights, grain std about 2.5 | Night vision "good" (P11) | Keep; check that grain stays about 1% |
| EMF | Flat navy (16,36,61), no geometry, devices white blobs with halo, no grain | Electro ramp with grain (21v) | Flatten to navy, remove grain, white device glow |
| Mode switch | Instant cut, cycle thermal, EMF, NV, normal | - | Instant cut |

Open points for Michael: the thermal palette (CT ramp or White Hot); thermal through doors (CT yes, A26 no); whether pull-away leaves the wall (not seen in CT footage); whether the strike's follow-down (about 1.4 s) should be kept.
