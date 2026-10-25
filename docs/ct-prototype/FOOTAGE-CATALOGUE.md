# CT footage catalogue, 2026-10-19 (all 90 clips)

Michael's overnight brief (2026-10-19 23:15 / 23:20, `DECISIONS.md`): catalogue the clips, audit our movement against
them, replicate it with original code. This file is the catalogue step; the audit is `AUDIT.md`.

- Clips: `pc/ct-work/clip_13570_*` (Steam recordings, gitignored), converted to `pc/ct-work/clips/<clip>.mp4` by
  `scripts/ct-ref/convert-clips.sh` (HEVC 2420x1668, ~60 fps). 64 clips from 2026-10-17 (62 catalogued in
  `docs/archive/locomotion/research/ct-footage-catalogue.md`) and 26 new from 2026-10-19 (16 min).
- Sheets: `scripts/ct-ref/sheets.sh` (6 x 4 tiles, clip seconds burned in): new clips at 2 fps in `pc/ct-work/sheets/`
  (12 s a sheet), old clips at 1 fps in `pc/ct-work/sheets-old/` (24 s a sheet). Read from small tiles: times are +-0.5 s
  (new) / +-1 s (old); frame-step the mp4 before measuring.
- Codes: `docs/archive/locomotion/CT-SHOTLIST.md` (A1-L1). New codes per group: N1-N4 (group 1), N2-1.. (group 2), N3-1.. (group
  3), O1-1.., O2-1.., O3-1.. (moves the old catalogue missed).
- Built by six reading agents (one per group of clips), assembled unedited; where they disagree, the footage wins.

Contents: Part 1, the new clips (three groups); Part 2, the old catalogue checked against the footage (three groups).

# Part 1. New clips (2026-10-19)

## New clips, group 1 (105509 105624 105718 105845 105949 110038 110117 110341 110522 )


Built from 6 x 4 contact sheets at 2 frames per second (tile time burned in, edges about +-0.5 s). Frame-step the clip before measuring. Durations from `pc/ct-work/convert.log`.
Clip names are shortened to the HHMMSS part (`clip_13570_20261019_HHMMSS`). Sheets are `pc/ct-work/sheets/<clip>-NN.jpg`.

Common to all 9 clips:
- Rifle selected in the HUD (ammo 29 / 59, bottom right). The hero is empty-handed at idle; the rifle or a pistol appears only while aiming (as in the old catalogue).
- Gear glow: the hero's goggle lights show as three green dots when he faces the camera.
- A noise / stance meter sits bottom left of the HUD. Its segments fill at the faster speeds (visible in 110117 at about 4.5 s and 10.5 s, and in 110522 at about 39 s).
- Two scenes: a dim storeroom / warehouse in normal vision (105509 to 110117) and a concrete loading bay with a vented wall in night vision (110341, 110522).
- The camera is the normal CT chase camera. It is not locked: Michael orbited it by hand in most clips, so the angle drifts. Walls and doors pull it in close (see N1).
- New codes (not in CT-SHOTLIST.md):
  - N1 = camera pulled in tight by wall or door geometry (extreme close-up of the hero).
  - N2 = action menu while next to crates.
  - N3 = walking across a beam or ledge top (unclear).
  - N4 = fast crouch move (low hunched travel).

---

### 105509 (46.5 s)
- Setting: storeroom with large crates, shelving with boxes, a lift truck far end. Normal vision, dim. Camera: behind and above (high 3/4), moving; swings to the front at 30 s. Weapon away.
- Timeline:
  - 0-13.5 s: hero walks away from the camera at a steady walk (upright, arms swinging, legs visible). The scene looks the same at 0 and 12 s, so he may be walking a loop or the camera follows round. Camera behind and high.
  - 14-15.5 s: hero turns on the spot to the left; the camera swings round with him and rises higher.
  - 15.5-29.5 s: hero stands almost still (idle, slight weight shifts, rifle slung on the back). A step at about 15.5 s and 24.5 s. Camera high 3/4 from behind, fixed.
  - 29.5-30 s: camera cuts or swings fast to the front of the hero.
  - 30-46 s: hero walks toward the camera (front view), upright, steady walk. Goggle lights visible. The camera backs off in front of him; crates pass on the right.
- Codes: B1 (walk, partial: one speed only), A6 (idle 15.5-29.5), F1, F2 (camera swing at 14 and 30 s), D2 (about 14 s turn, partial).
- Measure here: walking speed from crate and shelf seams at 0-13 s (behind) and 31-45 s (front); idle breathing 17-23 s; camera distance and height behind at 0-3 s versus in front at 33-38 s (door or crate ruler: the large crate is about 1.5 m).
- Action menu: none.

### 105624 (65.1 s)
- Setting: same storeroom. Normal vision. Camera: behind (low), then high above, then front. Weapon away.
- Timeline:
  - 0-20 s: hero crouch-walks away from the camera. Deep knee bend, back rounded, small steps; camera behind and low (shoulder height).
  - 20.5 s: camera rises fast to a high top-down 3/4.
  - 20.5-42 s: hero stays crouched in the same spot and turns slowly on the spot (body rotates, knees bent, a small shuffle of the feet); camera high, fixed.
  - 42-43 s: camera drops to the front.
  - 43-65 s: hero crouch-walks toward the camera. At about 53-55 s and 63-65 s he drops lower (one knee near the floor, slow creep). He stays crouched throughout.
- Codes: B2 (crouch walk, behind and front), D6 (crouch turn on the spot 20-42 s), A4 (crouch idle, partial), F2 (camera drop and rise).
- Measure here: crouch walk speed 2-12 s (behind) and 46-52 s (front); crouch height against the large crate at 0-3 s and 48-52 s; turn rate and feet 22-40 s.
- Action menu: none.

### 105718 (43.9 s)
- Setting: same storeroom. Normal vision. Camera: 3/4 from the front-left, moving; fixed front at 39 s. Weapon away.
- Timeline:
  - 0-12 s: hero walks diagonally toward the camera, upright; goggle lights seen at 1.5 s, 4.5 s, 7 s. Camera 3/4 from the front, slightly high.
  - 12.5-14 s: stand to crouch (knees bend, back drops).
  - 14-17 s: crouched move.
  - 17-21 s: crouch idle / slow crouch walk.
  - 21-24 s: crouch to stand and back to crouch, repeated.
  - 24.5-28.5 s: crouched.
  - 29-33.5 s: stands up and walks, then drops to crouch (about 30.5 s), stands again (32 s).
  - 34-35 s: camera swings to a new angle; hero crouches at 34 s, stands at 35.5 s.
  - 37-37.5 s: crouch again; 38 s: stands.
  - 39-43.5 s: hero walks toward the camera, upright, front view.
  - The crouch toggles roughly every 2 to 3 s, so this is the stand/crouch transition run, both standing and while walking.
- Codes: E1 (stand to crouch and back, standing and walking), B1 and B2 (partial), F2.
- Measure here: transition timing at 12-14 s, 21-24 s, 29-33 s, 34-35.5 s, 37-38 s (frame-step; each crouch or stand is about 0.5 to 1 s); head height before and after the crouch.
- Action menu: none.

### 105845 (41.9 s)
- Setting: same storeroom. Normal vision. Camera: behind (mid height), then over-the-shoulder aim camera, many switches; one scope view. Weapon: rifle aimed, plus a pistol (small weapon) from about 36 s.
- Timeline:
  - 0-2.5 s: hero stands, back to the camera, then starts to turn.
  - 3-5 s: rifle raised, aim camera over the left shoulder. The crosshair is at the pipe wall.
  - 5.5-7.5 s: rifle lowered, hero stands and idles.
  - 8-10 s: rifle aimed over the left shoulder.
  - 10.5 s: scope (zoom) view with the range readout (about 4 m on the pipe), a circular reticle.
  - 11-12 s: scope off, aim camera.
  - 12.5-14.5 s: shoulder swap: the camera moves through the hero's back to the right shoulder (12.5 s back view, 13-14 s right shoulder, 14.5 s back view).
  - 15-18.5 s: swap again, left (15-15.5 s), back (16 s), right (16.5-17 s), left (17.5-18.5 s). So several shoulder swaps in a row.
  - 19-19.5 s: aim released; the camera drops behind.
  - 19.5-23 s: hero walks away (standing, weapon lowered), then turns toward the camera (22-23 s).
  - 23.5-26 s: aim again, then released; hero walks.
  - 26-28 s: walks, then looks and turns.
  - 28-29 s: aim over the left shoulder, released.
  - 30.5-31 s: crouch walk; 31.5-32.5 s: aim with the rifle (crouched or just after crouch); 33.5-34.5 s: crouch and turn (low, hunched).
  - 35.5 s: front view standing with goggles lit.
  - 36-41.5 s: aiming a small weapon (pistol) over the right and left shoulder, then lowering, with crouched moves at 37.5 s and 38-39.5 s; the camera moves in and out of the aim view.
- Codes: F3 (rifle raise and lower), F5 (shoulder swaps, strong coverage), F6 (scope zoom 10.5 s), F4 / A3 (pistol aim, 36-41.5 s), A2 (rifle aim stills, partial), D7 (turn while aiming, partial), E1 (partial), F7 (crouched aim, 31.5-32.5 s, partial).
- Measure here: aim-in timing and camera blend at 2.5-3.5 s, 7.5-8.5 s, 19-19.5 s; shoulder swap duration 12-14.5 s and 15-18.5 s; scope on/off 10-11 s; camera distance behind versus aim (compare 7 s and 8.5 s); pistol raise 35.5-36.5 s.
- Action menu: none.

### 105949 (53.9 s)
- Setting: same storeroom, and its upper half (shelf wall) later. Normal vision. Camera: behind and above, moving; high 3/4 for 33-53 s. Weapon away.
- Timeline:
  - 0-10 s: hero walks away from the camera along the lane between crates (steady walk, upright), camera behind and high.
  - 10-16 s: curved turns. Hero turns left and back (10.5 s), spins to face the other way (13 s), turns again at 15.5-16 s. Shows 90 and 180 degree direction changes at walking speed.
  - 16.5-23.5 s: walks, turning again at 19.5 s and 22.5 s.
  - 24-28 s: walks away; slows to a crouch walk at 28.5 s.
  - 28.5-33 s: crouch walk, lower and slower; 32.5 s he turns.
  - 33.5-43 s: crouched, turns on the spot with the camera high. His feet shuffle.
  - 43.5-53.5 s: stands and walks in curved turns, camera high; moves up to the wall (45 s), turns at 46 s, 47 s.
- Codes: D4 (curve walking), D5 (turn and reverse; speed is walk, not full), D6 (crouch turn 33.5-43 s), D1 (partial), B1 and B2 (partial).
- Measure here: turn timing and the leg and foot sequence at 10-16 s, 19-20 s, 22-23 s; crouch turn 34-42 s; turn radius at 44-53 s using the shelf boxes (each box about 0.4 m).
- Action menu: none.

### 110038 (43.9 s)
- Setting: same storeroom and its shelf corner. Normal vision. Camera: behind, then high 3/4, then low behind. Weapon away.
- Timeline:
  - 0-6 s: hero walks away, upright, a gentle curve right.
  - 6.5-11.5 s: faster, leaning, longer strides: a jog or sprint in the open floor, in a looping path (turns at 7 s, 8.5 s, 10 s).
  - 12-15 s: stands still and idles at the wall.
  - 15.5-31 s: crouched, turning on the spot and shuffling; camera high.
  - 31-33 s: camera drops behind him; hero crouch walks at the lens.
  - 33-43.5 s: crouch walk, camera behind then front (37-43.5 s); hero comes toward the camera, bent forward with the head low.
- Codes: B1 (faster step, partial), B2, D6 (15.5-31 s), A6 (idle 12-15 s), F2.
- Measure here: sprint stride at 7-11 s (frame-step; compare to walk at 0-5 s); crouch walk at the camera 37-43 s; head height in crouch at 40-43 s.
- Action menu: none.

### 110117 (28.2 s)
- Setting: same storeroom. Normal vision. Camera: behind (0-4.5 s), then high (5-17.5 s), then in front (18.5-27.5 s). Weapon away.
- Timeline:
  - 0-4.5 s: hero runs / sprints. Big arm swing, long stride, noise meter segments full. Behind, then he curves toward the camera. At 2-3 s the shadow in the corridor hides him.
  - 5-11.5 s: sprint in the open area with the camera high; direction changes at 7 s, 8.5 s, 10 s (a fast lean into the turn).
  - 12-18 s: very low hunched travel, near a crawl (crouched, bent far forward); the meter shows fewer segments. Camera high. Turns at 13.5 s, 16 s, 17.5 s.
  - 18.5-23 s: crouch walk toward the camera, then away at 21 s.
  - 23.5-27.5 s: crouch walk toward the camera, front view, steady.
- Codes: C1 (full speed, partial), B1 (fast, partial), D5 (sprint turns, partial), B2 (crouch speeds), N4 (very low fast crouch move, 12-18 s).
- Measure here: sprint speed against the crates 0-4.5 s; turn lean 7-10 s; crouch walk speed in front 24-27.5 s; the noise meter segments at 4.5 s, 10.5 s, 13-14 s, 26 s.
- Action menu: none.

### 110341 (69.7 s)
- Setting: concrete loading bay with a large vented wall panel, a ribbed door at the end, and a small light high on the wall. Night vision (green, bright flares at the vent and lamp). Camera: side, high 3/4, moving; collides with the door frame. Weapon away.
- Timeline:
  - 0-5.5 s: hero walks along the wall, side-on and slightly away, upright; slow steps at 1-5 s (a slower speed than 0-1 s).
  - 5.5-23 s: walks along the wall toward the corner; the camera rotates, showing the vent and the floor grid. Feet cross over a bit on small turns (9-10 s, 14-15 s, 17-18 s).
  - 21-29 s: camera moves in on the door; the hero is at the bottom right, very close to the lens (N1). Hero's head and helmet fill the corner at 23-28.5 s.
  - 29-35 s: hero walks away from the door along the wall to the right, side-on; he turns toward the camera at 33-34 s.
  - 34.5-35.5 s: hero crouches.
  - 35.5-56 s: crouch walk along the wall, side-on and from above; steady, back bent, one hand sometimes near the floor; the camera follows with a slow swing.
  - 56-61 s: hero near the door frame; camera very close behind the door edge (N1); hero crouched facing the lens at 57-61 s.
  - 62-65 s: crouch move back along the wall; 64.5-65 s: camera swings in extreme close to his back and shoulder.
  - 65.5-69.5 s: crouch walk, then stands up at about 68 s.
- Codes: B1 (slow walk, partial), B2 (crouch walk along the wall, good), E1 (stand to crouch 34.5-35.5 s, crouch to stand 68 s), F2, N1 (camera tucked in near the door, 21-29 s, 56-61 s, 64.5-65 s). No back-to-wall move is shown: the hero walks near the wall but does not press to it.
- Measure here: crouch walk speed against the vent panel 36-47 s; walk speed 0-5 s and 30-33 s (the vent panel is about 3 m wide; the door frame, 2 m tall, is the ruler at 24-28 s); how far the camera pulls in at 23-28.5 s.
- Action menu: none.

### 110522 (76.5 s)
- Setting: night vision, a store area with large crates (stacked 2 high), then a stairwell and upper floor with a counter, and a ledge above a loading bay with a vented wall. Camera: behind and high, moving; very close at climbs. Weapon away.
- Timeline:
  - 0-3 s: hero runs toward the camera over a crate, then slows.
  - 3-6.5 s: hero steps up to the crates and pushes close; the action menu appears at 4.5 s (see below). Camera high.
  - 7-8 s: hero crouches and gets onto a crate: the camera shows him low beside the box.
  - 8.5-12 s: climbs onto a crate (hands on the top, one knee up at 10.5-11 s), then pulls up and stands on top (11.5-12 s). Leap between crates at 9.5 s: he jumps and spreads his arms.
  - 12-24 s: climbs further across a stack of crates: steps up and down, crouches on a crate top (13-14 s), drops to the floor (14.5-15 s), then climbs back (16-18 s), runs and climbs onto a higher crate (19-24 s). Hands on the crate edge, feet pushing off the face.
  - 24-29 s: sits and steps along the top of a crate to a ledge near the wall; he turns his back to the lens (27.5-28 s).
  - 29-35.5 s: climbs across a beam or railing (29.5-31 s, one leg over) and walks along a catwalk toward the camera (32-35.5 s) in view of a stairwell and floor (N3, unclear).
  - 36-42 s: walks along a counter top, then beside it (38.5 s: hands on the counter), turns toward the lens (40-41 s), crouches or drops (41.5 s).
  - 42-42.5 s: hero reaches both arms up to a ledge: a jump-grab.
  - 43-52 s: hangs from the ledge by both hands, body vertical, legs dangling; small sway; camera front-on, wall behind with a vent panel. Held for about 9 s.
  - 52.5-54 s: pulls up and over the ledge (53 s, knees rising), camera close above.
  - 54-58 s: camera swings very close behind the hero (N1), then he drops back down a side edge (57.5-58 s: arm up, grabbing the edge).
  - 58.5-64 s: hangs again at 58.5-59 s, pulls up (59.5-61 s), walks on top (61-63.5 s), and at 64-64.5 s grabs the edge to hang off the side.
  - 65-70 s: hangs from the ledge again; shimmies sideways: the vent panel slides across behind him (65-70 s). Arms straight above the head, legs hanging.
  - 70.5-71.5 s: lets go and drops (camera above, hero lands crouched).
  - 72-76.5 s: crouch idle, then crouch walk along the wall; camera swings to the corridor and door at 74-75 s.
- Codes: J1 (climb onto crate: 7-24 s, good; high ledge, 53 s), J2 (hang, shimmy, pull-up, drop: 43-52 s, 58.5-71.5 s, good), E3 (jump between crates, 9.5 s; grab jump 42-42.5 s; partial), E4 (drop from ledge 70.5-71.5 s, partial), E1 (partial), N1 (close camera), N2 (action menu), N3 (beam walk 29.5-35.5 s), B2 (crouch walk 72-76 s, partial).
- Measure here: climb timing at 8.5-12 s and 16-24 s; crate height against the hero (crate about 1 m, stack about 2 m); hang pose at 44-51 s (arm angle, grip, leg dangle, sway); pull-up 52.5-54 s; shimmy speed 65-70 s against the vent panel; drop 70.5-71.5 s.
- Action menu (top right list, two entries: INTERACT and PICKUP OBJECT, each in its own bar):
  - It appears while the hero is next to a crate, flicking on and off as the hero moves along it: about 4.5-5.5 s, 6 s, 8-9 s, 10.5 s, 13-13.5 s, 20-20.5 s. Frame-step to get the exact on and off times.
  - Highlight: could not tell from the sheet which entry is highlighted. Both bars look the same tone; frame-step to check.
  - What happens next: after each appearance the hero climbs or hops onto the crate (the climb at 8.5-12 s follows 8-10.5 s). No crate pick-up or carry is seen. The menu is not seen at the end of any climb.

---

## Summary

| code | clips and times | quality |
| --- | --- | --- |
| A6 idle (standing) | 105509 15.5-29.5 s; 110038 12-15 s | partial (high camera) |
| A4 crouch idle | 105624 20-42 s; 105718 17-21 s | partial |
| A2 / A3 aim stills | 105845 3-5 s, 8-10 s, 36-41.5 s | partial |
| B1 walk speeds | 105509 0-13 s, 30-46 s; 105718 39-43.5 s; 105949 0-10 s; 110341 0-5 s, 29-33 s | partial (one or two speeds) |
| B2 crouch speeds | 105624 0-20 s, 43-65 s; 110117 18-27.5 s; 110341 35.5-56 s; 110038 31-43.5 s | good |
| C1 / C2 start and stop | 110117 0-4.5 s (run) | poor |
| D1 / D2 turns | 105509 14-15.5 s; 105949 10-16 s | partial |
| D4 curve walking | 105949 10-23.5 s, 43.5-53.5 s | good |
| D5 turn and reverse | 105949 10-16 s, 19-23 s; 110117 5-11.5 s (sprint) | partial |
| D6 crouch turn | 105624 20-42 s; 105949 33.5-43 s; 110038 15.5-31 s | good |
| D7 turn while aiming | 105845 12-19 s | partial |
| E1 stand / crouch | 105718 12-43.5 s (many); 110341 34.5-35.5 s, 68 s | good |
| E3 jump | 110522 9.5 s, 42-42.5 s | partial |
| E4 drop | 110522 70.5-71.5 s | partial |
| F1 / F2 camera | all clips; 105509 14 s, 30 s; 105624 20.5 s, 42 s | partial (hand orbit) |
| F3 rifle aim in / out | 105845 2.5-5.5 s, 7.5-10 s, 19-19.5 s, 23-29 s | good |
| F4 pistol aim | 105845 36-41.5 s | partial |
| F5 shoulder swap | 105845 12.5-18.5 s | good |
| F6 scope zoom | 105845 10.5 s | partial (one frame at 2 fps) |
| F7 crouched aim | 105845 31.5-32.5 s | poor |
| J1 climb | 110522 7-24 s, 53 s | good |
| J2 hang, shimmy, pull-up, drop | 110522 42-71.5 s | good |
| N1 camera pulled in by geometry | 110341 21-29 s, 56-61 s, 64.5-65 s; 110522 54-58 s | good |
| N2 action menu (INTERACT, PICKUP OBJECT) | 110522 4.5-5.5, 6, 8-9, 10.5, 13-13.5, 20-20.5 s | good |
| N3 beam / ledge-top walk | 110522 29.5-35.5 s, 38-41 s | poor (unclear) |
| N4 fast crouch move | 110117 12-18 s | poor |

Not covered in these 9 clips: A1, A5, B3, B4, C3 to C6, G (back to wall: none seen), H (doors), I (close combat), J3 to J10, K (only the night vision look), L.

## New clips, group 2 (110616 110714 110818 110828 110936 111234 111335 111424 111731 )


Built from the 2 fps contact sheets (`pc/ct-work/sheets/clip_13570_20261019_<HHMMSS>-NN.jpg`, 12 s per sheet). All 34 sheets of the 9 clips were readable. Times are clip seconds read off half-second tiles, so edges are +-0.5 s: frame-step the clip before measuring. Durations from `convert.log`. Clip files: `pc/ct-work/clips/clip_13570_20261019_<HHMMSS>.mp4`.

Shot codes are from `docs/archive/locomotion/CT-SHOTLIST.md`. Moves not in the list use new codes `N2-1`, `N2-2`, ... (this catalogue only):

| new code | name |
| --- | --- |
| N2-1 | Rope climb, up and down (hand over hand, feet on the wall) |
| N2-2 | Crawl space / duct crawl (camera close behind the head) |
| N2-3 | Floor trap: open it from above and drop through |
| N2-4 | Optic cable remote view through a floor trap |
| N2-5 | Item bar weapon swap (mouse driven, rifle to pistol) |
| N2-6 | Rail vault (jump over a catwalk rail) and hang under the rail edge |

General notes:
- All 9 clips are night vision (green), a fixed HUD at bottom right (health bars, item name and ammo). Rifle selected = ammo "29 / 59" (111424: 27 / 57; 111731: 30 / 60); pistol selected = "20 / 40". The hero is empty-handed whenever he is not aiming, as in the earlier batch.
- Camera is the normal follow camera (behind, orbiting by hand), never a locked side view, except the rope clip (111335) where it hangs side-on at a roughly constant distance.
- The action menu (top right) has two looks. Passive: a header row "INTERACT" and the available options in dim text. Active (while A is held): the header becomes "BACK TO GAME" and one option gets a bracketed white highlight. The menu disappears when A is released, the highlighted option runs.
- The clips repeat the same two spaces: a hangar with stacked crates (110616), and a prison-like block with a floor trap above a bunk room, a poster corridor and a vehicle bay (110714, 110818, 110828, 110936, 111234, 111335).

---

### 110616 (31.0 s)
- Setting: warehouse / hangar with two-high stacked crates, a stair and a lit floor patch, night vision. Camera: behind, moving; turns to high and looking down when the hero stands on a crate (6-8 s, 25-30 s). Rifle selected on HUD (29/59), hero empty-handed. No action menu in this clip.
- Timeline:
  - 0-1.0 s: walks up to a tall crate stack, back to camera, normal walk, arms swinging.
  - 1.0-1.5 s: jumps up, both arms go overhead to the crate top edge.
  - 1.5-3.5 s: hangs by both hands from the crate top edge, legs straight down, body against the crate face. Camera orbits from front to side, a possible small shimmy (check in frame-step).
  - 4.0-5.0 s: pull-up: knees swing up, hero rolls onto the crate top (mantle), ends kneeling / crouched on top.
  - 5.5-7.5 s: crouched on the crate top, camera high behind looking down on him.
  - 7.5-8.5 s: rises, lowers himself over the edge, arms up on the ledge (8.0 s), hangs from the edge facing the crate (8.5-9.5 s).
  - 10.0-11.5 s: lets go, lands in a crouch at the crate foot, then stands (11.5 s).
  - 12.0-13.5 s: stands and walks (slow, then a half-run step at 12.5 s) beside the crate.
  - 14.0-16.0 s: reaches up with one hand (14.0), then both hands on the crate edge, hangs and pulls (15.0-16.0 s), camera side-high.
  - 16.5-17.5 s: drop / crouch at the foot of the crate.
  - 18.0-18.5 s: stands facing the crate; 19.0 s jumps with one arm reaching; 19.5-20.5 s hangs from the crate top, arms up.
  - 21.0-21.5 s: drops to a crouch; crouch step away.
  - 22.0-22.5 s: stands at the crate foot, back to camera.
  - 23.0-24.5 s: jumps and hangs by both hands, arms straight up.
  - 25.0-26.5 s: pull-up, sits on the crate edge with a leg over (25.5-26.0), crouches on top.
  - 27.0-28.5 s: stands on top, walks to the far edge along a narrow top surface, back to camera.
  - 29.0-30.5 s: climbs onto a thin beam / ledge above a lit room with stairs, ends crouched at the edge looking down (camera high behind).
- Codes: J1 (climb onto a high ledge or crate) and J2 (hang from a ledge, pull up, drop); E4 (drop from a crate, 9.5-11.5 s, 16-17.5 s, 20.5-21.5 s).
- Measure here: 1.0-5.5 s and 23.0-26.5 s (clean jump, hang, pull-up on the same crate, camera low and close): hang time, pull-up time, height of the hang (crate top vs the hero's standing height, the hero is about 1.8 m). 8.0-11.5 s for the lower-down and drop. 12.0-13.0 s for a walk speed against the crate seams.
- Action menu: none visible.

### 110714 (26.9 s)
- Setting: dark lower corridor leading into a low crawl-space tunnel, then a concrete duct room with pipes and a floor grating. Night vision. Camera: in front of the hero first (0-1.5 s, low), then behind and very close inside the tunnel, then static in the duct room, then moving again. Rifle selected (29/59), hero empty-handed.
- Timeline:
  - 0-1.5 s: hero moves toward / past the camera, upright-ish then crouched; at the tunnel mouth the menu shows "ENTER CRAWL SPACE".
  - 2.0 s: hero fills the frame from behind, entering the tunnel.
  - 2.5-5.5 s: camera in the tunnel looking down its length (a lit patch at the far end), hero out of frame.
  - 6.0-13.0 s: camera very close behind and above his helmet. The hero moves on all fours / belly forward: the near arm reaches and plants alternately (visible 6.5, 8.5, 9.0, 10.0, 11.5, 13.0 s), roughly one reach per second. Light patches slide past (floor vents).
  - 13.5-16.0 s: he emerges into the larger duct room (floor, pipe elbow on the far wall), camera pulls back; hero ends at the screen edge.
  - 16.5-23.0 s: camera static facing the pipe wall, hero partly visible bottom right at 16-17 s, then off screen. A menu is up for most of this span (see below).
  - 23.5-25.0 s: camera swings (look around): pipe, wall cracks, a floor grating.
  - 25.5-26.5 s: hero is back in view, crouched over the floor grating, back to camera, rifle slung on his back. Menu "OPEN TRAP / OPTIC CABLE" appears. The next clip (110818) opens on this same pose.
- Codes: J9 (into and out of a vent or crawl space), N2-2 (crawl space crawl).
- Measure here: 6.0-13.0 s for the crawl cycle (reach period, speed vs the floor seams) and the camera distance / height behind the head. 13.5-16.0 s for the transition out. 0-2.0 s for the approach.
- Action menu:
  - 1.0 and 1.5 s: passive, header "INTERACT", one option "ENTER CRAWL SPACE" (not highlighted).
  - 16.5-23.0 s: menu on screen the whole span, camera and hero static. The header flips between "INTERACT" (16.5, 20.5, 21.0) and "BACK TO GAME" (17.0-20.0, 22.0-23.0). Rows are "BACK TO GAME" and "EXIT FRONT"; the highlight moves between them (reads as EXIT FRONT at 17.0, BACK TO GAME at 18.0-18.5, and so on). This looks like the player scrolling the menu with A held. Nothing is chosen (the hero never exits at the front within the clip); at 23.5 the menu has gone and the camera is turning.
  - 26.0 and 26.5 s: passive, "INTERACT / OPEN TRAP / OPTIC CABLE".

### 110818 (61.5 s)
- Setting: starts at the floor trap of 110714, then a bunk room below (table, bunk beds, two guards), then a door, an outside corridor with a large poster on the wall, a floor door at the end. Night vision. Camera: top-down above the hero at the trap, optic-cable remote view (2.5-7 s), behind and high in the room, then behind / side in the corridor. Rifle selected (29/59), switches to pistol at 54 s (20/40).
- Timeline:
  - 0-2.0 s: hero crouched over the trap grating, top-down camera, small turns and arm movement (deploying the cable after the menu choice).
  - 2.5-7.0 s: optic cable view: fish-eye shot down through the grating into the room below. 2.5 s floor tiles and a bed frame, 3.0 s dark transition frame (cable moving), 3.5-4.5 s a guard sitting on the floor against a table with a rifle, 5.0-5.5 s bunk beds and a second guard on the wall side, 6.0-6.5 s the table and chairs, 7.0 s the seated guard again.
  - 7.5-8.5 s: back to the top-down hero view, crouched at the grate.
  - 9.0-11.5 s: opens the trap: hero crouched, lifts the grating; the lid swings up (11.0-11.5 s).
  - 12.0-15.0 s: hero kneels at the open hatch with the lid upright beside him, then leans in.
  - 15.5-16.5 s: drops through the hatch into the room (camera inside the room at 15.5 s, hero landing large in the foreground at 16.0-16.5 s; a guard to the left).
  - 17.0-19.0 s: crouch walk across the room past the seated guard and a bunk bed, hero in front of the camera, back / three-quarter view, upper body bent forward. A guard stands at the left at 19.0 s.
  - 19.5-23.0 s: crouch walk to the bright door at the far right, fast crouched steps, camera close behind.
  - 23.5-24.5 s: crouched in the doorway, shoulder to the door frame.
  - 25.0-28.0 s: crouched at the door leaf (open door), menu for the door appears.
  - 28.5-30.5 s: crouch / half-stand next to a wall with a poster; rifle slung diagonally across the chest at 29.0 s.
  - 31.0 s: one dark transition frame with a boxed crosshair reticle (reads as a camera cut or a sight / remote view frame).
  - 31.5-33.0 s: close shot of the hero crouching against the poster wall.
  - 33.5-38.5 s: crouch walk along the corridor, camera behind and low; he steps around something on the floor (37.0-37.5 s); at 38.0 s he moves sideways along the wall.
  - 39.0-41.0 s: crouched at the poster wall near two doors.
  - 41.5-43.0 s: a door beside him is open (lit room with bunks inside, 41.5-42.5 s). Crouched next to it.
  - 43.5-46.0 s: crouch walks back along the poster wall; at 45.0 s back to the wall, body turned to the corner, peeking pose; 46.0 s turning.
  - 46.5-47.5 s: close then wide, the hero turns away down the corridor.
  - 48.0-55.5 s: crouched, bent over, nearly static on the left side of the corridor while the item bar is used (see Action menu): weapon change, rifle to pistol at about 54.0 s.
  - 56.0-61.0 s: stands and walks down the corridor with the pistol selected (20/40, no pistol visible in hand). At 57.0-58.0 s he stands pressed to a bright corner, back to the wall, camera looking along the corridor. 58.5-61.0 s: a normal-speed walk away from the camera, ends with a half turn toward the camera (61.0 s).
- Codes: H2 (open a door and walk through, 22-30 s, partial: door already open when seen, menu with the stealth open option), H5 / N2-4 (optic cable, 2.5-7.0 s, through a floor trap, not under a door), N2-3 (trap, 9-16 s), B2 (crouched walk, 17-27 s and 33-46 s, partial: no side view), G3 (hero against a wall, 44.5-46.0 s and 57-58 s, partial), N2-5 (item bar swap, 48.5-55.5 s), E4 (drop through the trap, 15.5-16.5 s).
- Measure here: 17.0-23.0 s for a crouch walk across the room (bunk bed, table as rulers, tile floor is dark); 33.5-38.5 s and 43.5-46.0 s for a crouched walk along the corridor (floor tile grid visible, poster is a good ruler, doors about 2 m); 58.5-61.0 s for a standing walk speed in the same corridor; 9.0-12.0 s for the trap opening time; 15.0-16.5 s for the drop through the trap (height of the room ceiling).
- Action menu:
  - 0.0 s: passive, "INTERACT / OPEN TRAP / OPTIC CABLE". 0.5 s: active, "BACK TO GAME" header, OPTIC CABLE highlighted. 1.0 s: menu gone, then the remote view runs (2.5-7.0 s).
  - 8.5 s: passive again. 9.0 s: active, OPEN TRAP highlighted. 9.5 s: menu gone, then the hero opens the trap (9.5-11.5 s).
  - 25.0, 26.0, 26.5, 27.0, 27.5 s: passive door menu "INTERACT / OPEN DOOR / OPEN DOOR STEALTH / BASH DOOR / OPTIC CABLE", never highlighted at the sampled times; fades at 28.0 s as he moves away.
  - 33.0-47.5 s and 47.5-61.0 s: passive "INTERACT / SWITCH OBJECT" for nearly the whole span (small gaps), never active.
  - 41.5-43.0 s: passive door menu again (OPEN DOOR, OPEN DOOR STEALTH, BASH DOOR, OPTIC CABLE), fades at 43.0 s.
  - 49.5-55.0 s: the bottom item bar is open (a horizontal row of 4 item slots with the item name under it, a mouse pointer is visible on it at 49.5, 50.5, 51.5, 52.0 s). It scrolls through: rifle attachment (49.5), pistol (50.0), a grenade (50.5), rifle attachment (51.0-51.5), another grenade (52.0), rifle attachment (52.5-53.0), pistol (53.5-54.0). At 54.0 s the HUD ammo block changes to the pistol and the bar closes. The top-right menu stays passive while the bar is open, so the bar is a separate input (here driven by the mouse), not an entry of the A menu.

### 110828 (6.0 s)
- Setting: the poster corridor. Night vision, camera behind and slightly above, moving with the hero. Pistol selected (20/40), hero empty-handed.
- Timeline:
  - 0-1.0 s: walks away from the camera down the corridor, normal walk.
  - 1.0-2.0 s: walks past the poster (it fills the left of the frame at 1.0-1.5 s), camera swings in close.
  - 2.0-3.0 s: camera falls behind again, hero crosses to the right side of the corridor.
  - 3.0-5.5 s: steady walk, three-quarter back view; a small figure (a guard) is visible at the far end of the corridor from 4.0 s. The passive "INTERACT / SWITCH OBJECT" menu shows from 3.0 s.
- Codes: B1 (standing, weapon away, walk) partial: single speed, no side view. F1 (walk forward, camera behind) partial.
- Measure here: 0-2.0 s for walking speed against the floor tile grid and the poster. Only 6 s, so use it as a quick speed read.
- Action menu: passive "INTERACT / SWITCH OBJECT" from 3.0 to 5.5 s, never active.

### 110936 (51.0 s)
- Setting: an office room with a checkerboard floor and desks, then a tiled corridor with the poster wall. Night vision. Camera: behind the hero, moving, going high (looking down over the hero) while he walks with the guard. Pistol selected (20/40).
- Timeline:
  - 0-2.5 s: hero crouch-walks in from the left edge of a doorway toward a guard standing with his back turned far across the room.
  - 3.0-5.0 s: crouched approach from behind, closing the distance; the guard walks slowly away.
  - 5.5 s: menu "GRAB CHARACTER" shows, hero rises from the crouch (still behind the guard).
  - 6.0-7.0 s: grab: hero's arm goes round the guard's neck from behind, guard is pulled back against him (7.0 s: hero's right arm raised, the guard's head in the crook).
  - 7.5-9.5 s: guard held in front, hero's free hand at the guard's head (pistol to the head, no gun visible), both facing away from the camera.
  - 10.0-11.5 s: hero walks the guard forward across the room, camera behind in the dark.
  - 12.0-21.0 s: camera high above and behind, orbiting slightly; the hero walks with the guard in front of him, one arm round the guard's neck, other hand up at the head (hands position visible 14.0-20.0 s), slow walk. He leaves the carpeted room onto the tile floor at 21 s.
  - 22.0-27.5 s: walks the guard down the tiled corridor, camera high behind; at 26.5-27.5 s the hero turns the pair about 90 deg to the left.
  - 28.0-31.5 s: further turns with the guard, camera swings overhead (hero rotating in place at 28.0-29.5 s).
  - 32.0-37.0 s: near the poster wall, slow walk and small steps, guard still held.
  - 37.5 s: the guard goes limp, the hero releases him, guard on the floor at the bottom left.
  - 38.0-40.0 s: hero crouched / standing over the body, menu "BODY" shows, then highlighted (39.5-40.0 s).
  - 40.5-42.0 s: body dragged / lifted: the body is stretched on the floor (40.5-41.5 s), the hero crouched at it, then hoisted onto his back (42.0 s).
  - 43.0-47.0 s: carries the body down the corridor, bent forward, a slow walk, camera high behind. The shadow of the carried body shows on the floor.
  - 46.5-47.5 s: hero stands upright and the body lies on the floor (dropped), then he moves on.
  - 48.0-50.5 s: crouched / stooped next to the body, the "BODY" menu returns at 50.0-50.5 s.
- Codes: I1 (walk up behind an unaware guard, 0-6 s, partial: the finish is a grab, not a strike), I6 (grab a guard, walk with him, knock him out, 6-37.5 s), I7 (pick up a body, carry it, drop it, 38-47 s), D5 / D6 partial (turns while holding the guard, 26.5-31.5 s).
- Measure here: 3.0-5.5 s for the approach speed (crouched) and the distance at which the grab prompt appears; 6.0-7.5 s for the grab animation (arms, timing); 12.0-21.0 s for the walk speed with a held guard (checkerboard floor tiles are a ruler, camera is high and nearly top-down); 26.5-31.5 s for turning with a held guard; 41.0-47.0 s for the carry (body position on the back, speed along the corridor tiles).
- Action menu:
  - 5.5 s: passive "INTERACT / GRAB CHARACTER" (hero close behind the guard), then the grab happens at 6.0 s.
  - 38.0, 38.5, 39.0 s: passive "INTERACT / BODY".
  - 39.5, 40.0 s: active, header "BACK TO GAME", BODY highlighted. Menu gone at 40.5 s, the body is then moved (40.5-42.0 s).
  - 50.0, 50.5 s: passive "INTERACT / BODY" again.

### 111234 (51.7 s)
- Setting: the floor trap room again, then down a shaft, a long duct with pipes and a fan, and out into a vehicle bay (truck, lit forklift area). Night vision. Camera: top-down at the trap, then behind and very close to the head in the ducts, finally behind-side in the bay. Rifle selected (29/59).
- Timeline:
  - 0-1.0 s: hero crouched over the grating, top-down camera, menu "OPEN TRAP / OPTIC CABLE".
  - 1.5-4.5 s: crouching, standing and crouching again around the grating (turns on the spot, facing the camera at 0-1, away at 1-2.5, sideways at 3.5-4.5); a lit item (white rectangle) on the floor at the right.
  - 5.0-6.0 s: the trap is open (hole where the grating was); hero steps / lowers feet first into the hole, camera top-down, the grating panel leaning at the top.
  - 6.5-9.5 s: descending a shaft: seen from above, hero going down with arms spread (hands on the shaft sides, 7.0-8.5 s), the camera swings as he turns inside the shaft.
  - 10.0-12.0 s: hero at the bottom, seen from behind and above, a lit space with pipes ahead; he starts to crawl into a horizontal duct.
  - 12.5-19.5 s: duct crawl: camera right behind the helmet, the duct is a rectangle with pipes at the right and a grille with a fan at the far end (13.5-17 s); the hero moves forward on all fours or belly, small side-to-side movement.
  - 20.0-27.0 s: camera tight on his shoulder and the slung rifle, turning a corner (22.0-23.5 s), back view.
  - 28.0-33.0 s: passes a fan vent on the right (28.0-29.5 s) and moves under a big conical pipe and a grille (30-33 s).
  - 34.0-36.0 s: crawls under a ceiling grating, the camera tilts up to look at it.
  - 36.5-46.5 s: long straight crawl in a duct with a ceiling grating (38-44.5 s) and then louvre vents (45-47 s), camera right behind the head, hero static in frame.
  - 47.0 s: he stands up (back view) at the duct exit.
  - 47.5-48.5 s: exits the duct, bent over / crouched, in the bay (door light, truck at the left).
  - 49.0-51.0 s: crouch walks around a truck with the camera behind and side, then crouched.
- Codes: J9 (vent / crawl space in and out), N2-2 (duct crawl, 12.5-47 s), N2-3 (trap open and drop, 4.5-10 s), E4 (drop through the trap into a shaft).
- Measure here: 12.5-19.5 s and 36.5-46.5 s for the crawl speed and camera offset (the duct grating is a regular grid); 5.0-9.5 s for the descent length / time; 47.0-51.0 s for the exit and a crouched walk in open space.
- Action menu: 0.0 and 0.5 s only: passive "INTERACT / OPEN TRAP / OPTIC CABLE", no highlight. Menu gone from 1.0 s as the hero opens the trap by hand (no active menu was sampled).

### 111335 (49.7 s)
- Setting: a tall industrial space with corrugated wall panels, a rope hanging from above, a fan vent and platform at the top, a warehouse with a truck and a forklift at the bottom. Night vision. Camera: side-on, medium distance, fixed height that tracks the hero up and down the rope (2-14.5 s, 22.5-36 s, 38-40 s), looking down from above at the platform (15.5-22 s) and a ground view (40-49 s). Rifle selected (29/59), hero empty-handed, rifle slung.
- Timeline:
  - 0-1.5 s: stands beside the rope, side view, upright, hands down. Menu.
  - 1.5-2.0 s: hands up to the rope, feet leave the floor.
  - 2.0-14.5 s: climbs up the rope hand over hand. The body is leaned back about 30 deg from the wall, both knees bent and the soles on the wall; one hand reaches above the other and the legs push in step. About one reach per second. Camera tracks him up the frame.
  - 15.0-17.0 s: top of the climb: camera shows an empty floor, a fan, then the hero comes over the lip and kneels / sits (16.5-17.5 s), with the rifle visible across his chest at 17.0 s.
  - 17.5-21.5 s: camera looking down onto a platform with a grated hatch; hero kneels at the platform edge (menu again at 19.5 s).
  - 22.0-23.5 s: climbs back down over the edge, camera above looking straight down on him hanging on the rope, knees tucked.
  - 24.0-35.5 s: descends the rope, hand over hand: arms alternate, legs curled; camera looks down from above, nearly top-down, constant size. The wall panels appear at the left at 34.0 s.
  - 36.0-37.5 s: near the bottom, stands on the rope's end area, menu.
  - 38.0-40.0 s: climbs up again a short way (feet on the wall panels at 38.0-39.0 s), then lets go.
  - 40.5-42.5 s: low camera at the floor, hero holding the rope, face up; forklift in the lit area behind (41.5-42.0 s).
  - 43.0-45.5 s: stands at the rope, looks around, small walk (44.5 s).
  - 46.0-47.5 s: climbs a short way again, body horizontal-ish with soles on the wall.
  - 48.0-48.5 s: crouched on the ground (just landed).
  - 49.0 s: stands and walks off toward a truck.
- Codes: N2-1 (rope climb up and down, whole clip), J2 partial (hanging, 22-24 s), E4 partial (dropping from the rope, 47.5-48.5 s). Closest list entry J3 (ladder and drainpipe) is vertical climbing but not a rope, so not used.
- Measure here: 2.0-14.5 s (cleanest side view, constant camera): climb speed (metres of panels per second), the reach period, lean angle and foot placement; 24.0-35.5 s for the descent speed; 1.0-2.5 s for the grab; 36.5-38.5 s for the bottom entry; 22.0-23.5 s for the transition at the top lip (how he turns from climbing up to climbing down).
- Action menu:
  - 0.0, 0.5 s: passive "INTERACT / GRAB ONTO ROPE". 1.0 s: active, header "BACK TO GAME", GRAB ONTO ROPE highlighted. 1.5 s: menu gone, hero on the rope.
  - 17.5, 18.0 s: passive. 19.5 s: active, GRAB ONTO ROPE highlighted (hero at the platform edge), then he goes over (22.0 s).
  - 36.5 s passive, 37.0 s active highlight (bottom of the rope). 40.0, 40.5 s passive; 43.0, 43.5 s passive; 45.0 s passive; 48.5, 49.0 s passive. Each time the rope is within reach the menu shows, and the next climb follows after an active frame.

### 111424 (16.2 s)
- Setting: a metal catwalk with a handrail along a lit hall, ground level below with a body on the floor; a louvred wall behind. Night vision. Camera: behind-left, then high above looking down and across the rail. Rifle selected (27/57), hero empty-handed. No action menu.
- Timeline:
  - 0-0.5 s: walks along the catwalk toward the rail, normal walk.
  - 1.0 s: vaults the rail: one leg and both hands over, body tilted, running jump.
  - 1.5-2.5 s: lands / stands on the far side, upright, at a crate, walks.
  - 3.0-4.5 s: turns back; leans over the rail with both hands on it, kicks the legs up and over (3.5-4.0 s), lands crouched behind a crate (4.5-5.0 s).
  - 5.5-7.0 s: crouched on a lower platform beside the rail, camera looks down from above.
  - 7.5-8.5 s: crouched / kneeling at the rail, camera high; he gets onto the rail edge (8.5 s, one arm out).
  - 9.0-10.0 s: low on the platform, crawls / stoops, then stands at the rail (10.0-10.5 s).
  - 11.0 s: goes over the rail, arms out.
  - 11.5-12.0 s: hangs from the edge with both hands up, body straight down, legs together.
  - 12.5 s: pulls up, head and chest over the edge, hands at the chest.
  - 13.0-13.5 s: sits astride the rail with a leg over, then drops to a crouch on the platform (14.0 s).
  - 14.5-15.5 s: crouched behind the rail, looking out.
- Codes: J1 (chest-high wall / rail climb, 3-4.5 s, 13-14 s), J2 (hang from a ledge, pull up, 11.5-13.5 s), N2-6 (rail vault, 1.0 s and 3.0-4.5 s), E4 partial.
- Measure here: 11.0-14.0 s (hang and pull-up at the rail, camera high and steady); 0.5-1.5 s and 3.0-4.5 s for the vault timing and the take-off distance from the rail.
- Action menu: none visible.

### 111731 (46.8 s)
- Setting: a night alley between brick walls, a rope-down from a roof edge, a lamp, boxes, a body at the bottom and a burning vehicle at the far end. Night vision, strongly overexposed lights. Camera: high above the hero at the start (looking over the roof edge), then side-high on the rappel, then behind at ground level. Rifle selected (30/60), rifle slung on his back while rappelling.
- Timeline:
  - 0-0.5 s: hero at the roof edge in the foreground, a subtitle line from the hero ("I'll be careful") is on screen.
  - 1.0-1.5 s: menu active on RAPPEL ON WALL.
  - 2.0-3.5 s: steps over the edge, attaches to the rope: camera top-down on his back (3.0 s), rope in his right hand (3.5 s).
  - 4.0-12.0 s: rappel down the wall. Legs straight out against the wall, torso upright and leaning back, right hand on the rope behind him and above, left hand free; he steps down the wall at a steady slow pace. Camera side-high, alley below.
  - 12.5-14.0 s: continues, turning toward the wall (camera moves round).
  - 14.5-18.5 s: pause / slow section: he hangs close to the wall with legs tucked (a ball shape), camera looking straight at the wall, brick courses as a ruler.
  - 19.0-24.0 s: legs extend again, stepping down the wall, then pushes off hard at 24.0-24.5 s (feet apart, torso out).
  - 25.0-26.0 s: let go: drops upright with legs together.
  - 26.5-28.5 s: standing on a ledge, rifle on his back, side view. Menu back.
  - 29.0-29.5 s: steps off the ledge (back to the wall, sits into the rope, legs up at 29.0 s) and re-rappels.
  - 30.0-34.0 s: descends, one foot on the wall, rope from the left hand; at 33.5-34.0 s a cable crosses the frame and he swings out.
  - 34.5-40.0 s: hangs near the bottom beside a body, feet touching the floor / body, rope taut, camera looking down at him.
  - 40.5-41.5 s: standing at the foot of the wall, menu "CLIMB UP".
  - 42.0-42.5 s: camera high above, hero looking away.
  - 43.0-47.0 s: walks the alley, camera behind, ground level: 44.0 s a quick walk toward the left, 45.0-46.5 s a steady walk along the wall and boxes.
- Codes: J8 (rappel down, swing out, 2.0-40.0 s, aim is not shown), E4 (the free drop at 25.0-26.0 s), J1 partial (the CLIMB UP prompt, 40.5-42.0 s, no climb shown), F1 partial (walk with camera behind, 43-47 s).
- Measure here: 4.0-12.0 s and 19.0-24.0 s (clean, near side-on rappel, constant camera): steps per second, wall angle of the body, speed down the brick courses; 24.0-26.0 s for the push-off and the drop; 2.0-4.0 s for the roof-edge start.
- Action menu:
  - 0.0, 0.5 s: passive "INTERACT / RAPPEL ON WALL". 1.0, 1.5 s: active, header "BACK TO GAME", RAPPEL ON WALL highlighted. Menu gone at 2.0 s, the hero goes over the edge.
  - 26.5 s passive, 27.0 s passive (on the ledge, same option). The player then rappels again at 29.5 s.
  - 40.5, 41.0, 41.5, 42.0 s: passive "INTERACT / CLIMB UP"; never active in the sampled frames.

---

## Summary table

| code | clips and times | quality |
| --- | --- | --- |
| J1 (climb onto a high ledge / over a rail) | 110616 1.0-5.5, 23.0-26.5; 111424 3.0-4.5, 13.0-14.0 | good |
| J2 (hang from a ledge, pull up, drop) | 110616 1.5-5.0, 8.0-11.5, 15.0-16.5, 19.5-21.0, 23.0-26.5; 111424 11.5-14.0 | good |
| J3 (ladder, drainpipe) | none | missing |
| J8 (rappel down, swing out) | 111731 2.0-40.0 | good (no aim) |
| J9 (vent / crawl space in and out) | 110714 0-16; 111234 5.0-10.0, 12.5-48.5 | good |
| H2 (open a door, walk through) | 110818 22.5-30.0, 41.5-43.0 | partial (door already open, only prompts show) |
| H5 (optic cable) | 110818 0.5-7.5 (through a floor trap, not under a door) | partial |
| I1 (approach an unaware guard from behind) | 110936 0-6.0 | partial |
| I6 (grab a guard, walk with him) | 110936 6.0-37.5 | good |
| I7 (pick up, carry and drop a body) | 110936 38.0-50.5 | good |
| B1 / F1 (walk, camera behind) | 110828 0-5.5; 110818 56.0-61.0; 111731 43.0-47.0 | partial (single speed, no side view) |
| B2 (crouched walk) | 110818 17.0-27.0, 33.0-46.0; 111234 49.0-51.0; 110936 0-5.0 | partial (no side view) |
| D5 / D6 (turns) | 110936 26.5-31.5 (turning with a held guard) | poor |
| G3 (wall stand / slide) | 110818 44.5-46.0, 57.0-58.0 | poor |
| E4 (drops) | 110616 9.5-11.5, 16.0-17.5, 20.5-21.5; 111731 25.0-26.0; 110818 15.5-16.5; 111335 47.5-48.5 | partial |
| N2-1 (rope climb, up and down) | 111335 1.5-48.5 (best 2.0-14.5, 24.0-35.5) | good |
| N2-2 (crawl space / duct crawl) | 110714 6.0-16.0; 111234 12.5-47.0 | good |
| N2-3 (floor trap open and drop) | 110818 9.0-16.5; 111234 4.5-10.0 | good |
| N2-4 (optic cable remote view) | 110818 2.5-7.0 | good (one pass) |
| N2-5 (item bar weapon swap, mouse) | 110818 48.5-55.5 | good (one pass) |
| N2-6 (rail vault, hang under rail) | 111424 1.0-14.5 | good |

## Action menu index (this batch)

| prompt and options | clip and time | seen as |
| --- | --- | --- |
| ENTER CRAWL SPACE | 110714 1.0-1.5 | passive |
| EXIT FRONT (with BACK TO GAME) | 110714 16.5-23.0 | passive / active, highlight alternates |
| OPEN TRAP, OPTIC CABLE | 110714 26.0-26.5; 110818 0.0-1.0, 8.5-9.5; 111234 0.0-0.5 | passive then active (optic cable at 110818 0.5; open trap at 110818 9.0) |
| OPEN DOOR, OPEN DOOR STEALTH, BASH DOOR, OPTIC CABLE | 110818 25.0-28.0, 41.5-43.0 | passive only |
| SWITCH OBJECT | 110818 33.0-61.0; 110828 3.0-5.5; 110818 (item bar at 49.5-55.0 is a separate mouse bar) | passive only |
| GRAB CHARACTER | 110936 5.5 | passive, then grab at 6.0 |
| BODY | 110936 38.0-40.0, 50.0-50.5 | passive, active at 39.5-40.0 |
| GRAB ONTO ROPE | 111335 0.0-1.0, 17.5-19.5, 36.5-37.0, 40.0-49.0 | passive then active |
| RAPPEL ON WALL | 111731 0.0-1.5, 26.5-27.0 | passive then active at 1.0-1.5 |
| CLIMB UP | 111731 40.5-42.0 | passive only |

## New clips, group 3 (111823 111908 111953 112102 112135 112331 112428 112542 )


Source: 8 clips, `pc/ct-work/clips/clip_13570_20261019_HHMMSS.mp4`; contact sheets `pc/ct-work/sheets/<clip>-NN.jpg` (6x4 tiles, 2 tiles per second, 12 s per sheet). Times below are the burned-in clip seconds, so edges are +-0.5 s; frame-step before measuring.
Codes are from `docs/archive/locomotion/CT-SHOTLIST.md`. New codes use the prefix N3-n and are defined in the summary. Every sheet of every clip was read; none were unreadable and no file was missing. Small HUD text (menu rows) is read off 320 px tiles, so some rows are marked uncertain.

General notes:
- All clips are PC CT in night vision (green) unless stated. Wide fisheye look, HUD on, normal follow camera or hand-orbited.
- Radio subtitles appear top left in several clips; ignore them. A mission-objective box appears bottom right in 111823 from 10.5 s.
- The rifle is carried across the back at idle and is in hand only while aiming.

### 111823 (18.6 s)
- Setting: concrete service walkway with a railing, climbing plants, a lit shutter at the far end, and a lower walkway with a hazard-striped barrier. Night vision from 0.5 s (0-0.5 s is normal vision, dark). Camera: low in front of the hero at the start, then high behind and above, orbiting and tracking; ends close behind and left. Rifle selected, not drawn.
- Timeline:
  - 0-0.5 s: normal vision, hero standing, seen from the front, far camera; night vision switches on at 0.5 s.
  - 0.5-1.5 s: hero stands facing the camera, one hand raised toward the head (goggle or ear touch), then starts to turn and bend.
  - 1.5-6 s: low stooped crouch-walk across the floor from centre toward the right-hand wall, high camera looking down; at 3.5-4.0 s he is bent right over with hand near the floor (tight crouch turn). Slow to medium crouch walk.
  - 6-7.0 s: crouch-walk along the railing to the right, leaning forward, short steps.
  - 7.5-9.0 s: hero goes over the railing: sprawled across the rail at 7.5 s, perched on top at 8.0 s, swinging legs over and lowering on the far side with hands on the rail at 8.5 s, crouched low on the other side at 9.0-9.5 s. Probably a rail climb-over and drop to the lower walkway; verify by stepping.
  - 9.5-11 s: camera on the lower walkway (hazard-striped barrier at left); hero crouched low, one hand near the floor, turning toward the barrier. Objective box appears at 10.5 s.
  - 11-14 s: hero crouch-runs forward and to the right past the striped barrier, leaning hard forward, rifle on back; 13.0-13.5 s is the fastest part (long strides, arms swinging).
  - 14.5-15.5 s: slows and crouches low; camera swings close behind his shoulder (hero fills the frame at 15.5 s).
  - 16-18 s: camera behind and left; hero moves toward the lit shutter along the left wall, bent forward, one hand pushing off the wall at 17.0 s, then crouch-walks on.
- Codes: A1 (0.5-1.0 s, front, partial), B2 / C5 (crouch speeds, partial, camera moves), E1 (stand to crouch, 1.0-2.0 s), J1 / E4 (rail climb over and drop, 7.0-9.5 s, uncertain), N3-4 (head touch, 0.5 s, uncertain).
- Measure here: 11-14 s (crouch-run speed against the hazard stripes and floor slab seams); 16-18 s (crouch walk along a straight wall, steadier camera); 7-9.5 s (rail transition, camera about 3 m away, hand and leg positions).
- Action menu: none.

### 111908 (34.9 s)
- Setting: outdoor concrete alley between two tall concrete walls, hazard-striped barrier at the far end, plants on the left. Night vision. Camera: mostly the over-the-shoulder aim camera (hero's head fills the left or right third), otherwise behind and fixed. Pistol selected 0-20 s, rifle selected from 20.5 s.
- Timeline:
  - 0-0.5 s: hero walks toward the camera down the alley (front view, upright walk), camera far.
  - 0.5-1.0 s: camera swings in to over-the-shoulder behind him; hero raises the pistol (aim start).
  - 1.0-2.5 s: pistol aim over the hero's left shoulder (head left of centre, pistol forward at screen centre), nearly motionless.
  - 3.0-3.5 s: shoulder swap: head moves from left to right of screen, camera passes behind the back (the back and a white back light fill the frame at 4.5 s).
  - 3.5-5 s: aim over the other shoulder (head right), pistol at lower centre.
  - 5.0-9.5 s: swaps between shoulders and holds aim; the 5.5 s and 8.0 s tiles show the head low at lower left (transition frames).
  - 10.0-11.5 s: camera passes behind the back again (torso fills the frame at 10.0 s), aim resumes over the right shoulder at 10.5-11.0 s.
  - 11.5-13.5 s: another swap (head right at 12-13 s, torso fills the frame at 13.5 s).
  - 14-15.5 s: aim over left shoulder, steady.
  - 16.0-17.0 s: aim lowers; hero turns away and walks from the camera into the alley (slight knee dip at 16.5 s).
  - 17.5-20.0 s: standing idle, weapon away, seen from behind at about 6 to 7 m, camera fixed.
  - 18.5-19.0 s: weapon selection bar along the bottom of the screen (row of 5 icons, cursor on the pistol), switching to the rifle.
  - 20.5-21.5 s: hero turns back toward the camera (back fills the frame), draws and raises the rifle.
  - 22.0-25.0 s: rifle aim over the right shoulder (head left, rifle forward), steady.
  - 25.5 s: scope view (zoom readout 15x, range readout about 16.5 m) aimed at the far barrier.
  - 26.0-26.5 s: leaves the scope; camera swings behind the back.
  - 27.0-28.5 s: shoulder swap with the rifle (head right, low at 27.5 s).
  - 29.0-31.5 s: rifle aim over the left shoulder, steady.
  - 32.0-32.5 s: aim released, hero turns and steps away.
  - 33.0-34.9 s: standing idle from behind, weapon away, camera fixed, about 5 m.
- Codes: F3 / F4 (pistol raise 0.5-1.0 s; rifle raise 20.5-22 s), F5 (shoulder swap, pistol 3.0-3.5, 5.0-5.5, 12-13.5 s; rifle 27-28.5 s), F6 (scope in and out, 25-26 s), A2 / A3 (aim over shoulder holds: pistol 1-2.5 s, rifle 22-25 s), A1 (idle from behind, 17.5-20 s and 33-34.9 s, partial), N3-1 (weapon selection bar, 18.5-19.0 s).
- Measure here: 3.0-5.5 s and 12.0-13.5 s (swap duration and camera path; the alley walls give a ruler); 0.5-1.0 s and 20.5-22.0 s (raise-to-aim time and the camera move from behind to over the shoulder); 22-25 s (aim camera offset: head width in frame, rifle position); 17.5-20 s (idle camera distance and height); 25.0-26.0 s (scope entry and exit).
- Action menu: none (the weapon selection bar at 18.5-19.0 s is not the context menu).

### 111953 (9.1 s)
- Setting: concrete corridor with a lit doorway ahead, night vision. Camera: over-the-shoulder aim, fixed for the whole clip (hero's head at right, rifle at lower left). Rifle drawn and aimed.
- Timeline:
  - 0-3.0 s: hero aims the rifle at a lit doorway, almost motionless; muzzle flash and smoke at 0.5 s (a shot fired); ammo 30.
  - 3.0-3.5 s: a guard steps into the doorway and fires; hero fires back.
  - 4.0 s: guard down; ammo drops to 29.
  - 5.5-6.0 s: a second guard appears in the doorway, firing; hero fires again.
  - 6.5-8.5 s: more shots (ammo 23 to 21), bodies on the floor; a bright beam appears from the doorway side at 7.5 s. Subtitle text indicates a mission-failed line.
- Codes: A2 (steady rifle aim, 0-3 s), N3-5 (shooting guards from aim, 3-8.5 s).
- Measure here: 0-3 s (aim camera offset: head width about a quarter of the frame, zero camera drift); 3.0-4.0 s and 5.5-6.5 s (fire and recoil on the aim camera). Hero posture (standing or crouched) is not distinguishable.
- Action menu: none.

### 112102 (23.4 s)
- Setting: concrete shaft with a steel ladder, ending at a small platform with a handrail and grate floor. Night vision. Camera: starts behind the hero, fixed low; from 2 s it follows and tilts up, orbiting; at the top it looks down on him. Rifle on the back, not drawn.
- Timeline:
  - 0-1.0 s: hero stands facing the ladder base, back to the camera, idle.
  - 1.0-2.0 s: steps to the ladder; at 2.0 s one arm reaches up to a rung.
  - 2.5-5.5 s: climbing up hand over hand, one knee up on a low rung at 3.0 s and 4.5 s; camera tilts up and rotates left; roughly 2 to 3 rungs per second (verify).
  - 6.0-7.0 s: continued climb, camera very high looking up (window at top right).
  - 7.5-8.0 s: arms spread wide at 7.5 s, then standing at the foot of the ladder at 8.0 s with the camera low again: he lets go, slides or drops back to the bottom. Verify.
  - 8.5-12.0 s: climbing up again, same hand-over-hand rhythm.
  - 12.5-13.0 s: top-out: arm reaches over the platform edge (12.5 s), then hero fills the frame as he steps up and over (13.0 s).
  - 13.5-14.0 s: crouching on the platform, then standing, back to the camera, camera high looking down.
  - 14.5-16.5 s: walks and crouch-turns on the platform (kneeling at 15.5-16.0 s, turns toward the ladder).
  - 17.0 s: at the ladder edge, mounting the ladder from the top (torso at the rim).
  - 17.5-20.5 s: on the ladder seen from above, arms alternating up and down, legs wide; direction unclear (looks like descending, possibly then climbing; check).
  - 21.0-21.5 s: hands on the platform rim, then steps back onto the platform.
  - 22.0-23.4 s: standing on the platform, turning; ends close behind his back.
- Codes: J3 (ladder up and down), N3-6 (ladder top-out and mount from the top: 12.5-14 s, 16.5-17.5 s, 21-21.5 s), E1 (crouch on platform, 13.5-14 s).
- Measure here: 2.0-5.5 s and 8.5-12.0 s (climb rate: count rungs per second; rungs look about 0.3 m apart); 12.0-14.0 s (top-out timing); 7.0-8.5 s (the release or drop); 16.5-17.5 s (mount from the top). Camera moves, so measure against the rungs.
- Action menu: none.

### 112135 (11.3 s)
- Setting: a washroom or hallway with urinals at left and a dark door panel in the middle; night vision. Camera: behind the hero, fixed at about 3 m; close over the shoulder at 6.5-7.0 s; front view at 7.5-8.5 s; then a white-out. Rifle on the back, drawn at 7.0 s.
- Timeline:
  - 0-1.5 s: hero stands in front of the door, facing it, slight shifting; action menu on screen.
  - 2.0-5.0 s: hero crouches low in front of the door (knees bent, hands low at the door), consistent with a door-bottom action such as the optic cable; holds crouched while the menu changes.
  - 5.5-6.0 s: stands and steps back, turning toward the camera side.
  - 6.5-7.0 s: camera swings close behind his head; he raises the rifle toward the door (aim at 7.0 s).
  - 7.5-8.5 s: the door is open (panel swung to the left); hero walks through toward the camera, upright walk, into bright light.
  - 9.0-10.0 s: image whites out from the bright room (night vision overload); the door panel moves back into view at 10.0 s.
  - 10.5-11.0 s: door closed again (dark panel), hero's head visible at the bottom edge.
- Codes: H2 (open door and walk through, 7.0-8.5 s, partial), H5 (door-bottom action, 2.0-5.0 s, uncertain; the menu offers it), H1 (door closed again, 8.0-10.5 s, uncertain), F3 (rifle raise at a door, 6.5-7.0 s, partial), N3-7 (door context menu, below), E1 (crouch at a door, 2.0 s).
- Measure here: 7.0-8.5 s (door swing speed and angle; a door is about 2 m for the ruler, the dark panel is about 60 percent of frame height at 0-5 s); 5.5-7.0 s (stand-up and rifle raise timing at a door); 1.5-2.0 s (stand to crouch).
- Action menu: at 0.0 s a box top right titled INTERACT lists OPEN DOOR, OPEN DOOR STEALTH, BASH DOOR, OPTIC CABLE (4 rows; the highlighted row is not readable at this resolution). At 0.5 and 1.0 s the box shows a single row, BACK TO GAME (menu closing or reopening); at 1.5 s a bare INTERACT box with no readable rows. From 2.0 s an INTERACT box returns with 2 rows (unreadable), grows to about 4 rows at 4.5-5.0 s, and is gone by 5.5 s. At 8.0 s and 10.5 s a smaller INTERACT box shows one row, CLOSE DOOR (hero by the open door). After the first menu the hero crouches at the door (2.0 s), then stands, steps back and the door is open by 7.5 s; which row was chosen is not visible.

### 112331 (31.6 s)
- Setting: large hall with a wood floor, a glass wall along the right, a staircase far away; night vision. Camera: high behind and left of the hero, following; close behind at 9.5-10.5 s; front-facing at 29-31 s. Rifle on the back, never drawn.
- Timeline:
  - 0-8.0 s: hero crouch-walks (stooped, knees bent, low torso lean) behind a patrolling guard who walks away at a steady pace; gap about 3 to 4 m; pause at 2.5-3.5 s (crouched, still, tracking the guard); steps again at 4.0-5.0 s with a crouch-turn toward the guard.
  - 8.0-9.5 s: hero speeds up and closes to arm's length (one hand forward at 8.5-9.0 s).
  - 9.5-11.5 s: guard walks on, hero keeps pace crouched; no contact yet.
  - 12-20 s: crouch-follows the guard along the glass wall (guard walks away to the right), camera orbits to side-on; the hero gains slowly.
  - 20.5-22 s: hero reaches the guard from behind, hands up at the guard's head and shoulders (21.0 s).
  - 22.5 s: action menu appears (below); guard held at 23.0 s, hero's arm around the guard's neck, guard in front of the hero, guard's rifle visible pointing up at 23.5 s.
  - 24.0-25.5 s: hero holds the guard, facing the wall; interrogate menu at 24.5 s.
  - 26.0-28.0 s: hero holds the guard against his chest, camera low behind; hero's goggle lights (3 lights) visible at 26.0-27.0 s.
  - 28.5 s: the guard is lowered or knocked out (hero bends over the body).
  - 29.0 s: hero stands up and turns away from the body.
  - 29.5 s: pickup menu appears; hero stands facing the camera, upright.
  - 30.0-31.5 s: hero walks toward the camera, drops to a crouch (kneel at 30.5 s), then crouch-walks off to the right (31.0 s).
- Codes: I6 (grab from behind, hold, lower the guard, 20.5-28.5 s), I1 (approach behind an unaware guard, 0-20 s, no strike shown), N3-8 (stealth crouch follow of a walking guard, 0-20 s), I7 (body menu only, 29.5 s, partial), E1 (stand to crouch, 30.0-30.5 s), B2 (crouch speeds, partial), N3-2 (interrogate option, 24.5 s).
- Measure here: 12-20 s (side-on crouch-walk speed against glass panel seams and floor boards; guard speed too); 20.5-22 s (the grab from behind: closing distance and arm positions); 28.0-29.0 s (lowering the guard); 30-31.5 s (crouch-walk speed on open floor, front view).
- Action menu: (1) 22.5 s: box top right with rows BACK TO GAME and GRAB CHARACTER (2 rows; the second row looks highlighted but this is uncertain); by 23.0 s the hero has the guard held. (2) 24.5 s: INTERACT with INTERROGATE (held guard); no result shown, hero keeps holding. (3) 29.5 s: INTERACT with BODY (the lowered guard); the menu clears by 30 s and no pickup is shown.

### 112428 (18.1 s)
- Setting: same hall, with a wooden staircase on the left; night vision. Camera: high behind and right, following; close behind the hero at 9.5-11 s; side-on at 12-15 s. Rifle on the back.
- Timeline:
  - 0-8.5 s: hero crouch-walks behind a patrolling guard who walks away across the hall; gap about 4 m at 0-2 s, closing to about 1.5 m by 8.0 s. At 1.0-2.5 s the hero sinks into a low crouch and holds, then continues. Speed picks up at 5.0-8.0 s.
  - 8.5-9.5 s: hero closes on the guard and takes him down (grab or strike); the camera drops into the action (hero beside the guard at 9.0 s, hero's arm fills the frame at 9.5 s).
  - 10.0-10.5 s: camera is inside the hero's arm and torso (clips through the model).
  - 11.0 s: camera back out; pickup menu on screen; hero in a low pose, guard out of frame (down).
  - 11.5-15 s: hero stands up and walks upright along the glass wall (walk, slight lean, head turned toward the window); still bent at 12.0 s.
  - 13.0-14.5 s: elevator menu on screen as he passes a door.
  - 15.5 s: hero stops, back to the camera; the downed body is visible at left from 16.0 s.
  - 16.0-16.5 s: hero walks right, menu back.
  - 17.0-17.5 s: crouches near the stairs at the right.
- Codes: I1 or I6 (approach and takedown from behind, 0-10 s; the exact move is not visible), N3-8 (stealth follow, 0-8.5 s), I7 (body menu, 11.0 s), N3-3 (call elevator menu, 13.0-14.0 s and 16.0 s), B1 (upright walk beside the glass wall, 12-15 s, partial), E1 (stand to crouch, 17.0-17.5 s).
- Measure here: 0-8.5 s (approach distance over time, stair treads as a ruler); 12.0-15 s (upright walk speed against the glass mullions, near side-on); 11.0-12.0 s (stand-up after a takedown).
- Action menu: (1) 11.0 s: INTERACT with BODY (hero beside a downed guard); gone by 11.5 s. (2) 13.0 s: INTERACT with CALL ELEVATOR (one row; highlight not readable); present at 13.0, 13.5, 14.0 s, gone at 14.5 s as the hero walks on without a visible selection. (3) 16.0 s: INTERACT with CALL ELEVATOR again as he returns; no selection shown.

### 112542 (21.8 s)
- Setting: a dark open room with square pillars, low tables and indoor plants beyond a glass wall; the hero stands at the left with a second dark figure at his right (probably a carried or held body, not resolvable). Camera: fixed at about 3 m, low, behind-left; a free-look pan to the right at 6-11 s. The clip is a vision mode cycle.
- Timeline:
  - 0-0.5 s: normal vision, very dark; hero a silhouette with a goggle light.
  - 1.0-3.0 s: thermal vision (purple background, heat colours): the hero and the second figure in red, yellow and green; the second figure is hotter; small hero movement at 2.5 s.
  - 3.5-5.5 s: EMF vision (dark blue, only bright lines and dots for electrical objects); pan right by 5.0 s showing a rectangle of lines.
  - 6.0-7.5 s: night vision again; white-out at 6.0 s from a lamp; a standing figure far across the room at 7.0 and 7.5 s.
  - 8.0-9.5 s: normal vision (dark, warm tones), camera pans round the room.
  - 10.0-11.5 s: normal vision, hero in the foreground at lower right.
  - 12.0 s: normal vision, back at the start view.
  - 12.5-13.5 s: thermal.
  - 14.0-15.5 s: EMF.
  - 16.0-17.0 s: night vision (hero upright and the round shape at his right are clear).
  - 17.5-19.0 s: normal vision.
  - 19.5-20.0 s: thermal (hero's left arm raised at 19.5 s).
  - 20.5 s: EMF.
  - 21.0-21.8 s: night vision.
- Codes: K1 (thermal, 1.0-3.0, 12.5-13.5, 19.5-20 s; close hero only, no far guard), K4 (EMF, 3.5-5.5, 14-15.5, 20.5 s), K3 (night vision, same room, 6-7.5 s with a pan, 16-17 s, 21-21.8 s), N3-9 (normal vision, no goggles, dark room: 0-0.5, 8-12, 17.5-19 s). K2 not covered.
- Measure here: not a movement clip. Stills: 1.5-2.0 s (thermal), 4.0 s (EMF), 7.0 s (night vision), 9.0 s (normal). Cycle order is normal, thermal, EMF, night vision, normal, about 2.5 s on each mode; the HUD does not change.
- Action menu: none.

## Summary

New codes defined in this batch:
- N3-1: weapon selection bar (row of 5 icons along the bottom, pistol to rifle).
- N3-2: interrogate prompt on a held guard.
- N3-3: call elevator context prompt.
- N3-4: head or goggle touch at a standstill (uncertain).
- N3-5: shooting guards from the over-the-shoulder aim, with recoil and ammo drop.
- N3-6: ladder top-out and mount from the top onto a platform.
- N3-7: door context menu (OPEN DOOR, OPEN DOOR STEALTH, BASH DOOR, OPTIC CABLE; CLOSE DOOR on an open door).
- N3-8: stealth crouch follow of a walking guard until the takedown.
- N3-9: normal vision (no goggles) in a dark room.

| code | clips and times | quality |
| --- | --- | --- |
| A1 | 111823 0.5-1.0 s (front); 111908 17.5-20 s, 33-34.9 s (behind) | partial |
| A2 | 111908 22-25 s, 29-31.5 s (rifle aim); 111953 0-3 s | good |
| A3 | 111908 1-2.5 s, 14-15.5 s (pistol aim) | good |
| B1 | 112428 12-15 s (upright walk beside glass wall) | partial |
| B2 / C5 | 111823 1.5-14 s; 112331 0-20 s; 112428 0-8.5 s (crouch walk and crouch run) | partial (camera moves, long runs) |
| E1 | 111823 1-2 s; 112102 13.5-14 s; 112135 2 s; 112331 30-30.5 s; 112428 17-17.5 s | partial |
| E4 / J1 | 111823 7-9.5 s (rail climb over, unsure) | poor |
| F3 | 111908 0.5-1.0 s (pistol), 20.5-22 s (rifle); 112135 6.5-7.0 s | good |
| F4 | 111908 0.5-1.0 s | good |
| F5 | 111908 3.0-3.5, 5.0-5.5, 12-13.5, 27-28.5 s | good |
| F6 | 111908 25-26 s | good |
| H1 / H2 | 112135 7.0-10.5 s | partial |
| H5 | 112135 2.0-5.0 s (inferred from the menu) | poor |
| I1 | 112331 0-20 s; 112428 0-8.5 s | partial (no strike shown) |
| I6 | 112331 20.5-28.5 s | good |
| I7 | 112331 29.5 s; 112428 11.0 s (menu only) | poor |
| J3 | 112102 2-12.5 s, 17-21 s | good |
| K1 | 112542 1-3, 12.5-13.5, 19.5-20 s | partial (hero close only) |
| K3 | 112542 6-7.5, 16-17, 21-21.8 s | good |
| K4 | 112542 3.5-5.5, 14-15.5, 20.5 s | good |
| N3-1 | 111908 18.5-19.0 s | partial |
| N3-2 | 112331 24.5 s | poor |
| N3-3 | 112428 13.0-14.0, 16.0 s | partial |
| N3-4 | 111823 0.5 s | poor |
| N3-5 | 111953 0.5-8.5 s | good |
| N3-6 | 112102 12.5-14, 16.5-17.5, 21-21.5 s | partial |
| N3-7 | 112135 0-5, 8, 10.5 s | partial |
| N3-8 | 112331 0-20 s; 112428 0-8.5 s | good |
| N3-9 | 112542 0-0.5, 8-12, 17.5-19 s | good |

# Part 2. Old clips (2026-10-17) checked against the catalogue

## Old clips, group 1


Method: every sheet of every clip in old-1.list read (1 fps, 6 x 4 tiles). Times are tile times (+-1 s). Extra signal used: the HUD noise bar (segmented bar left of the weapon name) fills with dots while the hero runs or crouch-runs and is empty while he walks, so it marks speed changes the pose alone does not. It decays over about 1-2 s, so a lit bar can trail the real stop. Tiles are small: anything marked "frame-step" needs the video.

Duration source: convert.log. HUD weapon text is not named here.

### 034747 (1.95 s)
- Catalogue rows: A "(other)" (034747, 034803), I6 (extra). Verdict: correct (belongs to I6, not A1).
- Corrections: 034747 is side view only for the whole 2 s; the "camera swings behind" is 034803 only. Both tiles show the hero static, pistol arm forward, a guard (camouflage uniform) held in front of him; no walking.
- Missed: nothing beyond I6 (grab / hold with prompt). Hero does not move, so no locomotion value.
- Action menu: 0-1 s (whole clip) "INTERACT" with one option "INTERROGATE". Nothing follows inside the clip.

### 034803 (3.22 s)
- Catalogue rows: A "(other)", I6 (extra). Verdict: correct.
- Corrections: tiles 0-1 s side view (identical pose to 034747); at 2 s the camera has swung behind and high, looking down over the hero's shoulders into the room; the held guard is in front of him. Range 0-3 is right.
- Missed: nothing.
- Action menu: 0-2 s (whole clip) "INTERACT" > "INTERROGATE", still shown after the camera swing. Nothing follows.

### 035847 (42.0 s)
- Catalogue rows: A1. Verdict: corrected.
- Corrections:
  - Standing hero with an orbiting camera is 0-23 s, not only 0-24 (fine) but the later usable block is 31-41 s, not just 33-35 and 39-41: 31-32 side (hero at the door, facing right), 33-35 front (goggles lit), 36-38 side facing left, 39-41 behind. Add 36-38 (side view, usable).
  - 19-23 s the camera is almost straight above the hero (top-down), not listed. Hero looks hunched from above (foreshortening; do not read this as crouch).
  - 24-30 s the hero walks / shuffles to a new spot with small steps (25 stride, 26 close to the camera with noise bar lit, 27-28 steps, 29 stopped). 5-7 s hero seems to lean or take a step while the camera tilts (dutch angle at 5); frame-step before using 3-8 s as a pure idle.
  - Weapon away throughout, pistol selected on the HUD.
- Missed:
  - Top-down standing view 19-23 s (code A1, "from above" extra).
  - Short walk with a stop at 24-30 s (O1-1: slow repositioning walk, side / close view, camera moving; low value).
- Action menu: none.

### 043832 (13.43 s)
- Catalogue rows: A6 (0-13 s). Verdict: correct.
- Corrections: camera shifts slightly in the first 1-2 s (curtain edge enters at 1 s), then fixed. Clean idle from about 2 s. Hero stands still the whole time (very small sway); weapon away although the rifle is selected on the HUD, which matches the catalogue note.
- Missed: nothing.
- Action menu: none.

### 043841 (1.60 s)
- Catalogue rows: A6 (0-1.6 s, "no"). Verdict: correct.
- Corrections: none. Two tiles: hero walking away from the camera toward a lit door, behind view, rifle away.
- Missed: nothing.
- Action menu: none.

### 043858 (12.5 s)
- Catalogue rows: A6 (3-12 s, walks in 0-3). Verdict: correct.
- Corrections: the walk-in is about 0-2.5 s (stride visible 0-2, stopped by 3); the camera also drifts from behind to the high 3/4 over 0-2 s. Idle then holds 3-12.5 s in the same spot as 043832. Sheet ends at 12 s (last 0.5 s not seen).
- Missed: walk-in then stop at 2-3 s (C2-type stop from slow walk, high 3/4 view; code C2 extra, hero in a fixed camera: good for stop timing).
- Action menu: none.

### 050259 (21.23 s)
- Catalogue rows: B1. Verdict: corrected.
- Corrections:
  - 0-11 s walk slow to fast is right. Rough read: 3-4 s slowest (upright, short steps), 5-7 walk, 8-10 faster (long stride, knees bent), run (noise bar full) from about 11 s.
  - 11-14 s: not only "turn at door". At 11 the hero stops at the corridor end beside the scanner prompt; 12-14 a body is on the floor beside him, the camera drops very close to his head (13) and he reverses at run speed; at 14 he is already running back. It is a run-speed reversal (D5 type) at the end of the run.
  - 15-17 run back is right (bar full through 17). 
  - 18-20 s: hero is walking again (bar empty), camera comes in near at 18 then rises behind and high at 19-20. "Camera near" is only 18.
- Missed: run-speed reversal 12-14 (D5, side, close camera); the stop before it at 11-12 (C4-type, full-speed stop); run to walk deceleration at 17-18 (C4 stop, side).
- Action menu: 11 s "INTERACT" > "HACK RETINAL SCANNER"; 12-14 s "INTERACT" > "BODY"; 15 s "INTERACT" > "HACK RETINAL SCANNER". Single option each, none selected; the hero runs on.

### 050330 (18.62 s)
- Catalogue rows: B2. Verdict: corrected (small).
- Corrections:
  - Hero is crouched the whole clip (never stands). 0-9 s crouch walk with speed rising (noise bar starts lighting about 4-6 s, more at 8-9).
  - 10-12 s at the door: a body lies on the floor to the hero's right from 10 s; he is stationary and crouched at 11-12.
  - Crouch run starts about 12.5 s (bar full at 13), not 13 exactly; the reversal happens at crouch-run speed with the camera close (13). 14-17 s crouch run back is right (bar full). 18 s slows to crouch walk, camera near.
- Missed: crouch-run reversal 12-14 (D6 / D5 crouched, side view); crouch run to walk slowdown at 18 (C5-type stop).
- Action menu: 12 s "INTERACT" > "OPEN DOOR" / "OPEN DOOR STEALTH" / "BASH DOOR" (3 options); 13 s "INTERACT" > "HACK RETINAL SCANNER". None selected; the hero turns and crouch-runs back. Note BASH DOOR is offered here (relevant to H4, which the catalogue says has no bash).

### 050541 (59.12 s)
- Catalogue rows: B4 (1-45 aim walk / strafe / back; 46-58 swaps); F5 (extra, 46-58). Verdict: corrected.
- Corrections:
  - 0 s hero stands (rifle away, behind view); raise to aim at 0-1 s (left shoulder: hero at the left of the frame). Not listed (F3 raise, extra).
  - 1-45 s is mostly standing aim with camera turns, not walking: the door grows at 7-9 and 38-41 (forward step or walk, then back at 10 and 42), and the camera sweeps the room at 17-24 and 27-35 (aim turning, D7 type). No strafe is visible at 1 fps; frame-step for strafe. Legs out of frame, as the catalogue says.
  - Shoulder swaps (46-58): left shoulder 1-45; right 46-48; left 49; lowered 50 (camera pulled in behind the hero, aim off); right 51-52; left 53-54; lowered 55; right 56-57; lowered 58 and the hero walks away toward the door. So swap points are about 45.5, 48.5, 50.5 (via lowered), 52.5 and 55.5 (via lowered). Catalogue range 46-58 is right.
  - Aim reticle (small ring) is visible on the door in some tiles (3, 13, 15-16, 26, 32, 34-35, 46), so the reticle shows while aiming at a distance.
- Missed: F3 rifle raise at 0-1 and lowers at 50, 55, 58 (extra rifle raise / lower, over-shoulder); D7-type aim turning 17-35 (extra); walk off after lowering at 58 (start of walk from aim lowered).
- Action menu: none.

### 050649 (28.38 s)
- Catalogue rows: C1 / C2. Verdict: corrected.
- Corrections (speed from pose and noise bar):
  - Run 0-5 (bar fills by 3-5), run-speed turn at the corridor end beside the body 5-8 (menu BODY at 5-6): catalogue "run 0-4, turn 4-8" is about right, run runs to 5.
  - A full-speed burst at 9 (bar full); the hero is upright and slower at 10-11 (stop or slow, "stop 10-12" is about right).
  - Walk is 12-14 only. The hero is already running at 15 (long stride, bar full) and runs until about 21. So "walk 12-16, run 17-19" should read walk 12-14, run 15-21.
  - Turn at the scanner 19-21 sits inside that run (run 15-21, turn about 19-21).
  - Slows to a walk at 22; walking 23-25; standing from about 26 (hero upright, legs together at 26-27). "walk / stop 22-27" is right with the stop at about 26.
  - Weapon away; camera tracks from the side; scanner and sticker on the wall are good fixed markers.
- Missed: stop from run at 10 (C4-type full-speed stop); start from walk to run at 14-15 (C3/C4 start, side); run-speed reversals at 5-8 and 19-21 (D5, side).
- Action menu: 5-6 s "INTERACT" > "BODY"; 9 s "INTERACT" > "HACK RETINAL SCANNER"; 15-17 s the same scanner option; 20-21 s the same. Single option each, none selected.

### 050718 (12.0 s)
- Catalogue rows: C2. Verdict: corrected.
- Corrections: the hero walks slowly for the whole clip; the noise bar stays empty. A stop is not visible at 1 fps and may not exist: between 3 and 6 s the wall sticker holds the same screen position while the hero only drifts right about 25 px, which could be a near-stop. Frame-step 2-8 s. From 7 s the camera moves again with him. So this clip shows slow walk, not a confirmed C2 stop / restart.
- Missed: nothing else.
- Action menu: none.

### 050827 (36.2 s)
- Catalogue rows: C3 / C4. Verdict: corrected.
- Corrections (pose and noise bar; bursts show as long-stride runs with the bar full):
  - Walk 0-9: right (9 is a stopped, upright pose rather than a walk).
  - Bursts at 10, 18, 22, 27 and 32 (five, not four). 22 is a burst with a turn at the door (hero leaning hard, arms out), not just "turn".
  - Stops: 11 (upright right after the 10 burst), 19-21 (walk at 19, then standing 20-21 near the camera), 23, 26 (hero faces the door with his back to the camera, standing), 28, 30.
  - 29 and 31 are walking steps. 33-35 is walking slowly toward the camera (steps at 33 and 34), not "stand": catalogue "stand 33-35" is wrong, "stand 28-31" is wrong for 29 and 31.
  - 24-25 walk, 26 hero stops with his back to the camera (the camera is at the door frame).
- Missed: nothing new beyond the above; a hero reversal at the door at 22 (D5, side, close).
- Action menu: none (the hero passes the scanner and the body at 33-35 with no prompt).

### 050933 (47.67 s)
- Catalogue rows: C5. Verdict: corrected.
- Corrections:
  - Hero is crouched throughout.
  - 0-6 crouch walk. 6-7 is mostly a camera shift (door frame to wall); the hero is already moving fast at 7.
  - Crouch-run bursts (bar full) at 7, 13, 20, 26 and 32; slow crouch walk between.
  - 20-25 is the door wait, not just a turn: he reaches the door at 20 (run), waits crouched and idle 21-25 (5 s) with the door menu showing, then crouch-runs away at 26.
  - 26-47: slow crouch walk with stops. From about 42 to 47 the hero is crouched and stationary; at 43-46 his hand goes to the floor (idle gesture), the wall does not scroll.
- Missed: crouched idle 21-25 and 42-47 (O1-1: crouched idle, side view, with idle hand-down gesture at 43-46; A4 has stills only); crouch-run reversal at 20 and 26 (D6 crouched).
- Action menu: 20 s "INTERACT" > "HACK RETINAL SCANNER"; 21-25 s "INTERACT" > "OPEN DOOR" / "OPEN DOOR STEALTH" / "BASH DOOR"; 26 s "INTERACT" > "HACK RETINAL SCANNER". None selected; door stays shut; after 25 he runs off.

### 051044 (35.68 s)
- Catalogue rows: D1. Verdict: corrected.
- Corrections:
  - Camera is not fixed: the room pans and the view tilts (a painting enters at the left 6-8, the door moves in frame, tilt changes at 24-35). Height stays "low 3/4 / behind-to-front". 
  - The hero turns on the spot the whole time and does not travel. Front-facing (goggles lit) at about 3-5, 11, 14-16, 18, 24, 29-35, so about 5 turns in 35 s (about 6-7 s a turn); not "a full circle".
  - 32-35 hero stands still facing the camera (front idle, about 4 s).
  - A body lies on the floor at the left (6-8, 12, 16).
- Missed: standing front-view idle 32-35 (A1 front, video, usable but short); long slow stick-circle turns, 5 full rotations (D1 extra).
- Action menu: none.

### 051250 (28.68 s)
- Catalogue rows: D2 / D3. Verdict: correct (view label corrected).
- Corrections: view is a steep high camera (about 60-70 deg, shows helmet top), not strictly top-down; it follows the hero. The hero is moving in most tiles (0-5 walking with the bar empty; bar lit at 6-7, 9-10, 12, 18-19, 21, 23-28), not spinning on the spot. A body lies at the left from about 1 s. Facing flips between facing and away from the camera at about 7-8, 11, 17-18, 20, 22, 24-26, which fits the "flick behind" and fast reversals. Michael's note about the slowest speed walking backwards cannot be verified at 1 fps.
- Missed: nothing beyond D2 / D3.
- Action menu: none.

### 051339 (34.53 s)
- Catalogue rows: D4 / D5. Verdict: corrected.
- Corrections:
  - Starts fast: at 0-1 s the hero is already in a run lean (bar full at 1). Slow curves are 2-16, with bursts at about 6 (bar full) and 13-16 rising.
  - Fast turns and reversals 17-32 (bar full the whole time, the body banks almost horizontal in the turns at 17, 22, 24, 26, 29-30, 32). 
  - 33-34 slows to a stop (hero standing, back to the camera, bar empty). "17-34" should be 17-32 plus a stop at 33.
  - Camera yaws about 90 deg at 20-23 (wall corner enters at the right).
- Missed: body lean / banking in fast turns (D5 extra: this is the best banking reference in the set); run to stop at 33 (C4-type stop, high view).
- Action menu: none.

### 051401 (11.37 s)
- Catalogue rows: D4. Verdict: correct.
- Corrections: one clear curve at 3-5 (torso swings round) and a second direction change at 8-10 (hero angled, the room view yaws at 10); straight walk 0-3 and 6-8. A body lies at the left 0-5. Bar empty (slow walk) throughout. Sheet ends at 10 s.
- Missed: nothing.
- Action menu: none.

### 051421 (14.15 s)
- Catalogue rows: D5. Verdict: corrected (detail).
- Corrections: walking at 0 (bar empty), full speed from about 1 s (bar full 1-8), the 90 deg turn at 1-4 (camera yaws about 90 deg between 1 and 2, hero in a deep lean or low pose at 2-4), the reversal about 5-8 (hero faces the camera at 6, side at 7), slowing at 9-13 (bar falls, hero from front at 12-13). Range 0-13 is right (clip 14.15 s).
- Missed: slow-down to a near stop at 12-13 (C4-type).
- Action menu: 5 s "INTERACT" > "BODY" (hero passes the guard's body). Not selected.

### 051501 (29.05 s)
- Catalogue rows: D6. Verdict: correct.
- Corrections: slow crouched turn on the spot 0-16 (bar empty); fast turns 17-27 (bar full from 17); at 28 the hero looks more upright and is no longer spinning (stand-up or step out of the crouch; frame-step 27-29). Hero stays on one spot.
- Missed: possible stand up from crouch at about 28 (E1-type, high view, to confirm by frame-step).
- Action menu: none.

### 051543 (33.04 s)
- Catalogue rows: D7. Verdict: correct.
- Corrections: none to the ranges. At 0 s the hero stands (rifle away, camera behind-left) and the rifle is raised at 0-1 s (left shoulder). 1-14 aim turning (door 7-9, large window 10, blank wall 11-12 with the hero's head filling the frame, window 13, door 14). 15-30 camera pitched down to the floor (checker tiles; a guard's legs enter at the top at 27-28). 31 pitch coming up, 32 horizon and door. The aim reticle is a small ring at screen centre (1, 22, 30).
- Missed: rifle raise at 0-1 (F3 extra, over-shoulder); aim pitch full down and back (F3 / D7 extra, clean pitch limits).
- Action menu: none.

### 051606 (9.10 s)
- Catalogue rows: F1. Verdict: corrected.
- Corrections: walk forward 0-6 (stride visible through 6), stop at about 6.5, and only about 2.5 s of idle settle is in the clip (7-9), not 3 s. Camera is stable 6-9 (door in the same screen place, no visible recentre). 0-6 is a plain walk (bar empty), speed unknown (door grows).
- Missed: nothing.
- Action menu: none.

### 051636 (22.72 s)
- Catalogue rows: F1 / F2. Verdict: correct (detail).
- Corrections: 0-10 the hero walks while the camera swings far off the behind position (1-5 hero seen from the side with the painting wall behind; 6-9 side-on, turned toward the camera at 9). 11-22 he stands with his back to the camera and the camera look-around alternates: centre 12, left 13, right 14, centre 15, left 16-17-18, right 19-21, centre 22. No automatic recentre is visible, but the sheet cannot show whether the camera moved on its own at 1 fps. A body lies at the left or right in some tiles (0, 1-5, 10, 14, 19).
- Missed: nothing.
- Action menu: none.

## Corrections that matter most for movement

1. 050649 (C1/C2): walk is only 12-14; run is 15-21 (not 17-19); full-speed burst at 9 then a stop at 10-11; stop from walk at about 26. 
2. 050827 (C3/C4): bursts at 10, 18, 22, 27, 32 (22 is a burst with a turn, not just a turn); 33-35 and 29 / 31 are walking, not standing.
3. 050259 (B1): full run is reached by about 11 s; the "turn at door" 12-14 is a run-speed reversal; 18-20 is a walk; B1 is not a pure walk-speed ladder at the end.
4. 050933 (C5): crouch-run bursts at 7, 13, 20, 26, 32; 21-25 is a 5 s door wait (crouched idle) with the door menu; 42-47 is crouched idle.
5. 050330 (B2): crouch-run reversal from about 12.5 s; hero never stands.
6. 051339 (D4/D5): starts fast (0-1), slow 2-16, fast 17-32 with heavy body banking in the turns, stops at 33.
7. 051044 (D1): camera is not fixed; hero rotates about 5 times, not once.
8. 050541 (B4): it is mostly aim turning with the camera; forward and back steps only around 7-10 and 38-41; no strafe confirmed; shoulder-swap times listed above.
9. 050718 (C2): no confirmed stop or restart in the clip.
10. 051606 (F1): stop at about 6.5 s, settle only 2.5 s.
11. 035847 (A1): usable standing orbit also at 31-32 and 36-38, plus top-down 19-23; the hero steps at 24-30.
12. Prompts: BASH DOOR is offered at 050330 (12) and 050933 (21-25) but never used (H4 note); the noise bar on the HUD is a free speed-change marker for every clip above.

## Old clips, group 2


Method: every sheet in `pc/ct-work/sheets-old/` read tile by tile (1 fps, 6 x 4 tiles; a tile at time t shows the frame at t s). Durations from `convert.log`. Catalogue = `docs/archive/locomotion/research/ct-footage-catalogue.md`. All times are +-1 s unless a clip is under 5 s. "Frame-step" = confirm in the mp4 before measuring.
Confidence tags: (sure) read clearly off the tile; (likely) reading of small figures; (check) ambiguous at 1 fps.
No sheet exists for 051747 (0.033 s clip, 2 frames), so it could not be checked against a sheet.
The catalogue's "view" column is mostly right. Two recurring things it never states: (a) the HUD box bottom right has a noise/light bar that fills when the hero runs (e.g. 052502 at 1-2 s); (b) when the hero stands at a door frame or wall end facing the camera, his goggle lights show lit green (051917 at 21-27, 052021 at 4 and 14, 052059 at 10-11 and 15).

---

### 051709 (9.0 s)
- Catalogue rows: F3 (idle 0, raise 1-2, aim 2-7, lower 8). Verdict: correct.
- Corrections: none. Rifle (HUD shows the rifle). Camera is behind at 0 and 8, over the left shoulder from 1 to 7 (sure). Camera snaps to the aim view within 1 s of the raise.
- Missed: nothing. The hero stands about 3 m from the door at 0 and is further forward and left at 8 (small walk during the aim) (likely).
- Action menu: none.

### 051739 (3.43 s)
- Catalogue rows: F4 (raise 0.25-0.75, aim 0.75-2.25, lower 2.5-3.4). Verdict: corrected (end of aim).
- Corrections: the sheet is 1 fps, so only 0, 1, 2 s are visible. At 0 the camera is already close behind the hero, shifted left (clip starts mid-raise or just after a lower) (likely). At 1 s: aim, crosshair, left shoulder (sure). At 2 s: camera is back behind the hero, no crosshair, no arm out, so the aim has ended by 2.0 s, not 2.25-2.5 (likely). Aim end is probably 1.5-2.0 s; frame-step.
- Missed: nothing. Pistol HUD.
- Action menu: none.

### 051747 (0.033 s)
- Catalogue rows: F4 (single frame, 0.03 s, effectively a still). Verdict: correct as to duration (0.0332 s, 2 frames at 60 fps). Content not checkable: no sheet was made.
- Corrections: none possible. Missed: none. Action menu: none known.

### 051812 (16.03 s)
- Catalogue rows: F5 (pistol: aim left 1, switch right 2-3, back left 4-5, lower 6; weapon swap 7-10; rifle: aim 11, right 12-13, back 14, lower 15). Verdict: correct.
- Corrections: pistol: aim 1, head on the right side of the screen at 2 and 3, left again 4 and 5, lowered at 6 (sure). Weapon wheel (bottom centre, three icons) visible at 7, 8 and 9; at 9 the highlighted entry is the rifle with an "attachment" label; the HUD label changes from pistol to rifle at 10 (sure). So the swap UI is 7-9, HUD updated 10. At 10 the hero is moving (turning right) while the wheel is already closed. Rifle: aim 11 (left), right 12-13, left 14, lowered 15 (sure). Camera returns behind the hero at 15 with the hero standing right of the door.
- Missed: the hero turns and steps at 10 (between swap and re-aim). No code needed; note for the weapon-swap row.
- Action menu: none in the top right. The weapon wheel is bottom centre, 7-9 s, three entries, pistol highlighted at 7-8, rifle at 9.

### 051917 (41.58 s)
- Catalogue rows: G1 / G3 / G4 / G5 ("approach 0-4, on wall front view 2-10, step off 9-12, standing slide 13-20, wall end at door frame 21-28, crouched slide 29-37, stand 38-41"). Verdict: corrected.
- Corrections:
  - 0-8: the hero is seen from behind (the back light is visible), walking up to a wallpaper wall and standing facing it. He is not on the wall in 2-8 (likely). The catalogue's "on wall front view 2-10" is wrong for 2-8.
  - 9-12: arms spread at 9, body turning at 10, back-3/4 at 12. Read as the hero turning 180 deg to put his back on the wall, with the camera not moving (the door pillar at the left edge is identical at 8, 12 and 13) (likely, check by frame-step). The catalogue calls this "step off 9-12"; it is more likely the attach.
  - 13-20: standing slide, hero in profile with head turned left, legs crossing (sure). Matches.
  - 21-24: hero at the door-frame end of the wall, facing the camera, goggles lit, camera closer to him (sure). 25: still at the frame. 26: crouched, moving (crouch toggled between 25 and 26). 27: standing up at the frame, big in frame (leans toward the camera, peek-like). 28-29: crouched again, moving off.
  - Crouched slide is 28-37 (starts at 28, not 29). 38: standing (stands between 37 and 38). 39: hero low and half out of frame (camera tilts down). 40-41: walking, upright.
- Missed:
  - Brief aim raise (camera snaps to the over-shoulder view facing the wall, rifle visible) at 5 and at 11, about 1 s each, code G6 (aim attempt near the wall; the hero is facing the wall at both times).
  - Hero stands up at the frame at 27 between two crouched stretches (G5 peek pose or a stand-crouch toggle at the corner).
- Action menu: none.

### 052021 (17.37 s)
- Catalogue rows: G3 / G4 / G5 (standing slide 0-8 with corner 3-5, crouched slide 9-16 with corner 13-16). Verdict: corrected (small).
- Corrections: standing slide 0-8 (sure); the hero reaches the door frame at 3-4 (4: right at the frame, facing the camera, goggles lit) and heads back left from 5 (so a direction reversal at the corner, 4-5) (likely). Crouch starts between 8 and 9 (sure), crouched slide 9-12. At the corner 13: crouched; 14: standing, close to the camera, goggles lit; 15-16: crouched again (sure). So at both corners (here and 051917 at 27) the hero stands or leans out at the frame then crouches again. Clip ends 17.4 s; last tile is 16.
- Missed: stand at the corner at 14 (G5 peek pose, same as 051917 at 27). The reversal after the standing corner (4-5).
- Action menu: none.

### 052059 (20.38 s)
- Catalogue rows: G6 / G7 ("crouched on wall 0, aim attempt 1-5, standing on wall 6-11, leave 12-13, again 14-19"). Verdict: corrected.
- Corrections:
  - 0: crouched near the door frame, moving (sure).
  - 1-5: aim raised. 1: camera over-shoulder facing the wall (gun hand left); 2: camera very close behind the hero's neck and back; 3-5: aim facing the door and room corner (sure). The hero has turned away from the wall by 3.
  - 6: hero seen from behind beside the door, standing, turning. 7-9: hero in profile, standing, sliding sideways (legs cross at 9) (likely). 10-11: at the wall end by the door frame, facing the camera, goggles lit. So on-wall standing is about 7-11, with the attach turn at 6-7 (the same back view to front view turn seen in 051917 at 9-12).
  - 12: second aim tap (camera over-shoulder facing the wall, gun left), about 1 s. 13-14: hero seen from behind near the door, walking to the frame. 15: at the frame facing the camera, goggles lit (on the wall again). 16-17: moving off, walking away to the right. 18-19: third aim attempt (18: over-shoulder facing the wall; 19: camera close behind the hero).
  - So three aim attempts (1-5, 12, 18-19), not one, and the hero is "on wall" at 7-11 and 15, not 6-11 and 14-19.
- Missed: attempts 2 and 3 (G6). A small HUD noise bar shows at 7.
- Action menu: none.

### 052206 (37.72 s)
- Catalogue rows: G8 / G9 (crouched along a waist-high counter 0-20, standing walk along it and at its end 21-37). Verdict: corrected (small).
- Corrections: crouched movement 0-20 (sure). The hero is upright (stood up) at 1 and 3 inside that stretch (likely; stand-crouch toggles or brief rises, frame-step). Standing walk 21-35 (sure). Counter end reached at 27-29 (28 leaning round the end, 29 at the end facing the camera, goggles lit) and again 35-37; at 37 he is crouched at the end with the camera showing the open side (sure). So the clip ends with a crouch at the counter end, not a stand. Counter top is chest high on the standing hero (24-26) and head height on the crouched hero. Camera swings between a wide diagonal and a flat view (it does not hold side-on).
- Missed: the stand to crouch at 36-37. The brief stand-ups at 1 and 3.
- Action menu: none.

### 052349 (21.0 s)
- Catalogue rows: H1 (approach + menu 0-5, stealth open 6-8, camera in door frame 9-11, open 12-17, close 18-20). Verdict: corrected (the close).
- Corrections:
  - 0-5 menu and approach (sure). Menu shows at 0, 1, 3, 4; absent at 2 (hero stepped back, camera drifted).
  - 6-8 stealth open: arm on the door at 6, door open and hero standing in the doorway at 7-8 (sure).
  - 9: camera at the door hinge side, door open, prompt is CLOSE DOOR (sure). 10-11: the door is now closed and the prompt is OPEN DOOR. So the first close happens at about 9-10, not 18-20.
  - 12-14: hero at the closed door, full menu at 12, cursor on the first item at 13, menu gone 14. 15-17: camera close to the door while it opens (door panel fills the frame), 18: door open with the room beyond (sure). 19-20: prompt CLOSE DOOR, hero walking in; the close itself is not executed before 20 s (the clip is 21.0 s) (likely).
  - So: open (stealth) 6-8, close 9-10, open (normal) 13-18, close prompt 19-20 with no close shown. The catalogue's "open 12-17, close 18-20" mislabels the second action. Nothing here is a half-way stop or a slow close with the stick.
- Missed: the close at 9-10; both opens are different speeds (stealth, then normal).
- Action menu (top right):
  - 0, 1, 3: INTERACT: OPEN DOOR, OPEN DOOR STEALTH, BASH DOOR, OPTIC CABLE (no cursor visible). 4: header changes to BACK TO GAME, cursor on OPEN DOOR STEALTH. 5: gone. Follows: stealth open 6-8.
  - 9: INTERACT: CLOSE DOOR (one entry). Follows: door closes (10).
  - 10, 11: INTERACT: OPEN DOOR (one entry, door closed, camera at the door).
  - 12: full four-item list. 13: BACK TO GAME, cursor on OPEN DOOR (first). 14: gone. Follows: normal open 15-18.
  - 15, 16: two entries, OPEN DOOR highlighted, BASH DOOR below; 17: one entry, OPEN DOOR highlighted (check: low-res text; the list shrinks while the door opens).
  - 19, 20: INTERACT: CLOSE DOOR highlighted. Nothing follows within the clip.

### 052441 (32.52 s)
- Catalogue rows: I1 / I6 (guard walks 0-6, save menu 7-11, approach behind 12-16, grab 16-17, hold / walk 18-29, 30-32 after). Verdict: corrected.
- Corrections:
  - 0-1: guard far down the hall in a lit doorway; hero in the foreground looks crouched (likely). 2-3: guard walks toward the hero (2 is mid-hall, 3 beside him); 4-6: guard at the door on the left, hero upright at the right of the door.
  - 7-11: save game screens (pause, save slot list 9-10, overwrite warning with YES / NO at 11) (sure). Correct. No context list.
  - 12-14: hero walks up to the guard, who stands at the door. The grab is at about 14-15: at 15 his arms are round the guard; at 16 the hold is set (sure). Catalogue says grab 16-17: about 1-1.5 s late.
  - 17: INTERROGATE prompt appears. 18-21 hold, camera swings to look down the hall; 22-25 camera top-down; 26-29 high behind. Prompt stays 17-29 and is never used. Guard resists (arms flap) 18-29.
  - 30: prompt gone, guard on the floor, hero standing over him (so the knock-out or release is at 29-30). 31: hero alone, camera close. 32: hero walking away down the hall; a camo figure stands far ahead at the right (a second guard, or the same one up again; check).
  - "Walk with guard" is unclear: the floor scrolls in 18-29 and the hero is moving, but slowly (likely).
- Missed: crouch at 0-3 (likely). The prompt is never confirmed. After 30 a standing figure is visible at 32 (check).
- Action menu: 17-29 INTERACT: INTERROGATE (one entry, highlighted); no selection seen. Gone at 30. Save menu is a full-screen menu, not a context list.

### 052502 (7.1 s)
- Catalogue rows: I2 / I3 (approach 0-1, strike 2-3, guard down 4-6). Verdict: correct.
- Corrections: none. Detail: the HUD noise bar rises at 1-2 (a run-up; sure), then drops at 3. The guard walks toward the hero and faces him at 2 (so the guard is facing, I2). Contact at 2-3, guard on the floor at 4, hero standing over him 5-6. The hero is further than 8 m away at 0 (guard in the lit end of the hall).
- Missed: nothing.
- Action menu: none.

### 052527 (6.02 s)
- Catalogue rows: I1 (strike 2-3, guard down 4-5). Verdict: correct (menus missing).
- Corrections: none to times. The view is behind-side rather than a pure side view. 0: guard walking by the door at the left, hero at the right; 2: contact; 3: guard collapsing, hero bending over; 4-5: guard on the floor, hero upright (sure).
- Missed: the context list (below). The door here is locked.
- Action menu: 1: INTERACT: PICK LOCK (highlighted), BREAK LOCK, OPTIC CABLE (no bash option on a locked door). 2-3: none (strike). 4-5: the same list plus BODY (a fourth entry, because a body is at hand). Nothing is selected.

### 052607 (21.0 s)
- Catalogue rows: I6 (grab at door 2-3, interrogate hold 4-8, knock out 9-10, carry body 11-20). Verdict: corrected (small).
- Corrections: guard stands at the door 0-1 (sure). 2: menu appears with GRAB CHARACTER highlighted; 3: grab (hands at the guard's head, sure). 4-6: hold, menu shows INTERROGATE, camera low then moving; 7: menu gone and the hero holds the guard with a hand at his face (likely the interrogation animation, 7-8); 8: top-down. 9-10: the guard goes limp and is lowered or lifted (knock out) (likely). 11: guard on the hero's shoulder, camera top-down. Carry 11-19 along the hall. 20: the body is on the floor or the hero is setting it down; a camo figure is upright at the upper right (check; likely a drop, so the carry ends about 19-20).
- Missed: the order of prompts (GRAB CHARACTER first, then INTERROGATE once held).
- Action menu: 2: INTERACT: [GRAB CHARACTER], PICK LOCK, BREAK LOCK, OPTIC CABLE; follows: grab 3. 4-6: INTERACT: [INTERROGATE] (one entry); follows (7) the prompt vanishes and the interrogate hold plays; then knock out 9-10.

### 052704 (40.6 s)
- Catalogue rows: I7 (carry 0-24 through doors to stairwell, drop / tip over railing 26-40). Verdict: corrected.
- Corrections:
  - 0-1: the hero is down on the body beside the wall and lifts it (pick-up, likely). Carry starts at 2, not 0. Carry 2-24 through the hall (sure), a door at 9 (CLOSE DOOR prompt), lit room 10-17, exit door with a running-figure sign at 18-23.
  - 21: prompt OPEN DOOR at the exit door; 22: door closed; 23: door open and the hero walks through; 24: CLOSE DOOR prompt behind him.
  - 25-37: stairwell outside, hero carrying the body along the stairs and a railing (sure). 28 and 39: an upright camo figure is at the railing above the hero (check; second person, or the held body).
  - 38: camera pitched up towards a wall and tree, body on the floor at the bottom (so the body was dropped at about 37-38). 39: hero standing at the railing, rifle held in front (aim or ready). 40: body lying beside the railing, prompt BODY.
  - There is no evidence on the sheet of a throw over the railing: the body ends on the landing at 40 (likely). The "tip over railing" note should be treated as unproven. Drop is at 38, not spread over 26-40.
- Missed: pick-up at 0-1. Rifle raised at 39 (F3 style). Body drop to the landing at 38.
- Action menu: 9: INTERACT: CLOSE DOOR (while carrying). 21: INTERACT: OPEN DOOR. 24: INTERACT: CLOSE DOOR. 40: INTERACT: BODY (pick up). No other options appear while carrying.

### 052752 (13.02 s)
- Catalogue rows: H2 (0-12, open at normal speed, walk through, close). Verdict: corrected.
- Corrections: the sequence on the sheet is not a single open, walk through, close. 0-3: hero walks up to a closed door, top-down (sure). 4-5: prompt CLOSE DOOR (so the door is open) with the hero at the door, 5 facing the camera in the doorway. 6: prompt OPEN DOOR (the door is closed again). 8: full list. 9-10: door open, hero at the door. 11: hero past the door, view tilted by an object in the lower left. 12: CLOSE DOOR prompt, hero turning. So there are at least two open/close cycles, and the close at the end is only offered, not shown (clip is 13.0 s). Which open is the "normal speed" one cannot be told at 1 fps (check, frame-step 3-9).
- Missed: second open (8-9). Top-down camera throughout, not "behind, high".
- Action menu: 4, 5: INTERACT: CLOSE DOOR. 6: INTERACT: OPEN DOOR (one entry). 8: INTERACT: OPEN DOOR (highlighted), OPEN DOOR STEALTH, BASH DOOR, OPTIC CABLE; follows: door open 9-10 and the hero walks through. 12: INTERACT: CLOSE DOOR; no follow within the clip.

### 052832 (19.65 s)
- Catalogue rows: H3 (a guard walks to a door and through it; not clearly "finds an open door"). Verdict: correct (detail added).
- Corrections: none. Detail: 0-1 guard at the open door far down the hall, hero standing near the camera. 2-9: guard stands or paces by the door (hero stays still). 10: guard steps into the doorway. 11-12: camera swings to face the door; the guard is in it. 13-17: guard walks away into a lit room. 18-19: the door is closed again (it shut between 17 and 18; who closed it is not visible). It does not show a guard "finding" the door.
- Missed: door closes by itself behind the guard at 17-18 (H3, useful).
- Action menu: none.

### 052901 (18.43 s)
- Catalogue rows: H4 (pause 0, door 1-2, thermal through door 4-7 and 10-15, dark 16-17; "no"), K2 (4-15 thermal through a door, guard visible). Verdict: corrected.
- Corrections:
  - 0: pause menu (SAVE GAME, LOAD GAME, RESTART MISSION, SETTINGS, TRAINING VIDEOS, QUIT TO MAIN MENU). 1-2: night vision, hero at a closed door, a hand raised at 2. 3: black frame (vision switch). 4-7: thermal; 4 shows the hero from behind, 5-7 are over-shoulder aim views with a crosshair (thermal aim, head filling the left), a faint cold figure beyond the door at 7 (sure). 8: back in night vision, aim view, rifle fired at the door: a flash right of the crosshair, and the ammo count drops from 24 / 24 to 23 / 23 (sure from the HUD at 8-10). 9: black frame. 10-11: thermal aim; 12-15: thermal third person at the door with a cold figure far beyond it.
  - 16: very dark, a dim room with a bookshelf seen at upper left (door open or camera inside) and the HUD bar filling (likely normal vision). 17: black.
  - The catalogue's "door 1-2" is the hero standing at the door; there is a rifle shot at the door at 8 that nobody lists (no bash).
- Missed: rifle shot at 8 (O2-1, fire rifle at a door). Vision switches pass through a black frame at 3, 9 and 16 (O2-2). Aiming in thermal (4-7, 10-11). Pause menu at 0 (O2-3).
- Action menu: 12-14: INTERACT: [PICK LOCK], BREAK LOCK, OPTIC CABLE (locked door, no bash). 15: the list is greyed out (selection taken); follows: dark view at 16 (door or lock action, not resolved; check).

### 052952 (25.2 s)
- Catalogue rows: H5 (door 0-12, optic cable view 13-16 and 21-23). Verdict: corrected (small).
- Corrections: the optic views are 13-16 and 21-23 (sure); 14 shows the view rotating or panning. Detail on the "door 0-12": 0-1 menu, 2-3 hero opens the door; 4-5 camera low with the weapon in view (tilted, rifle visible at the bottom, red dot); 6-7 hero in the doorway, top-down; 8 CLOSE DOOR prompt, camera at the hinge side; 9-10 door closed (hero in front); 11 menu with the cursor passing over OPEN DOOR STEALTH; 12 hero crouched at the door. So the first door open (0-3) is not part of the cable use; the cable is selected at about 12 (cursor on item 2 at 11, then item 4). Second use: 17-20 crouched at the door, menu at 18, cursor on OPTIC CABLE at 19, view 21-23, out at 24 (hero crouched at the door).
- Missed: the hero crouches at the door before each cable use (12, 17-20, 24). The cable view has a frame overlay and shows a dim room with a lit rectangle and no guard.
- Action menu:
  - 0: INTERACT: OPEN DOOR, OPEN DOOR STEALTH, BASH DOOR, OPTIC CABLE. 1: BACK TO GAME, cursor on OPEN DOOR. Follows: door opens 2-3.
  - 8: INTERACT: CLOSE DOOR (one entry).
  - 11: BACK TO GAME, cursor on OPEN DOOR STEALTH (scrolling past). Follows: optic cable view 13-16.
  - 18: INTERACT: full four-item list. 19: BACK TO GAME, cursor on OPTIC CABLE (fourth). Follows: cable view 21-23.

### 053049 (35.43 s)
- Catalogue rows: H6 (lockpick view 12-24; "0-8 body carry (I7); 25-29 dark; 30-34 lit storeroom"), I7 (carry 0-6, drop 7-8). Verdict: corrected.
- Corrections:
  - Body: 0-1 the hero lifts or has just lifted the body; carry 1-5; at 6 the body is on the floor at the left and the hero stands (drop at about 5-6, sure). The catalogue's "carry 0-6, drop 7-8" is 1-2 s late for the drop. 7-8 is not a drop: it is a rifle raise (7 over-shoulder aim view with crosshair, 8 top-down aim), which no row lists.
  - 9-11: hero walks to the locked door. 12-14: lockpick view in night-vision glare (washed out, pick tool in the lock). 15-24: lock close-up in normal vision, pins visible, the picture does not change (sheet shows no progress; check). So lock view is 12-24 (sure).
  - 25-26: menu for the unlocked door; 27: dark; 28-29: dark room with the hero's silhouette in a lit doorway; 30-34: lit storeroom in normal vision, CLOSE DOOR prompt at 30-31; hero walks in from behind at 32-33 and appears facing the camera, goggles lit, at 34 (sure). Matches.
- Missed: rifle raise at 7-8 (F3). Body is picked up in 052704 at its end and carried again here (continuity).
- Action menu: 10: INTERACT: PICK LOCK, BREAK LOCK, OPTIC CABLE (no cursor seen); follows: lockpick 12-24 (PICK LOCK). 25, 26: INTERACT: OPEN DOOR, OPEN DOOR STEALTH, BASH DOOR, OPTIC CABLE; follows: nothing selected within view, door opens by 28. 30, 31: INTERACT: CLOSE DOOR.

### 053114 (7.05 s)
- Catalogue rows: H4 (menu "break lock" 1, crouched break 2-5, door opens 5-6). Verdict: correct.
- Corrections: none to times. Detail: 0: four-item list (PICK LOCK, BREAK LOCK, OPTIC CABLE, BODY), the dropped body lies at the left; 1: BACK TO GAME with the cursor on BREAK LOCK; 2-4 hero crouched at the lock, 4 a bright thin line at the door edge (tool or glint); 5: door opens, bright light; 6: hero crouched or rising at the open door, only BODY is offered (no CLOSE DOOR).
- Missed: nothing.
- Action menu: 0: INTERACT: PICK LOCK, BREAK LOCK, OPTIC CABLE, BODY. 1: BACK TO GAME, cursor on BREAK LOCK; follows: crouched break 2-4, door opens 5. 6: INTERACT: BODY only.

### 053200 (3.01 s)
- Catalogue rows: K1 (053200, 053323: 0-1 s thermal, then pause menu). Verdict: correct.
- Corrections: thermal at 0 (the hero's head and arm at the bottom). Pause menu at 1 and 2 (cursor on SAVE GAME).
- Missed: nothing. Pause menu list (not a context list): SAVE GAME, LOAD GAME, RESTART MISSION, SETTINGS, TRAINING VIDEOS, QUIT TO MAIN MENU.
- Action menu: none (pause menu only).

### 053251 (44.92 s)
- Catalogue rows: K1 (guard close / walking 4-17, guard far ~15 m and static 18-44). Verdict: corrected (start and detail).
- Corrections: 0-2 are night vision (guard at the door, hero at right, 2 guard further off); 3 is a black frame (switch); thermal runs 4-44 (sure). The catalogue starts at 4: right for thermal. Guard distance: mid-range and moving 4-11 (small, upper left), 12-13 he is right in front of the hero (overlapping the hero's head), walks away 14-17; from 18 he is a small static figure in a blue rectangle (door opening), standing there to the end with tiny shifts (arm at 34-35 and 38). The hero is still, bottom of frame, 18-44. No camera pan at all in this clip (K1 asked for a 5 s pan).
- Missed: the night vision opening 0-2 (the same scene as 052607 start). The vision switch black frame at 3 (O2-2).
- Action menu: none.

---

## Corrections that matter most for movement

1. Back to wall, 051917 and 052059: the hero is seen from behind walking up to the wall and standing facing it (051917 2-8, 052059 6), then turns about 180 deg to put his back on the wall (051917 9-12, 052059 6-7). The camera does not move during the attach. The catalogue's "on wall front view 2-10" is wrong for 2-8. Frame-step to measure the turn (check).
2. Aim near the wall: three aim attempts in 052059 (1-5, 12, 18-19) and two brief ones in 051917 (5, 11). Each snaps the camera over the shoulder facing the wall; with the hero turned away from the wall by the end of the longer ones. The aim is only about 1 s in four of them.
3. Wall corner (052021 at 14, 051917 at 27): the hero stands or leans out toward the camera at the frame, then crouches again. Crouched slide begins at 8-9 (052021) and 28 (051917), not 29.
4. Low cover, 052206: brief stand-ups at 1 and 3 during crouch-walk; the clip ends crouched at the counter end, not standing.
5. Aiming (F3/F4): 051739 aim ends by about 2.0 s, not 2.25-2.5. Shoulder swaps in 051812 are as catalogued.
6. Doors: 052349 closes the door at 9-10 (not 18-20); 052752 has at least two open and close cycles; 052832 shows the door closing by itself at 17-18.
7. Grab and carry timings: 052441 grab at 14-15 (not 16-17), hold ends 29-30; 052607 carry 11-19, put down at 20; 052704 pick-up at 0-1, carry 2-37, drop at 38 on the landing, no throw over the railing visible; 053049 carry 1-5, drop at 5-6, then a rifle raise at 7-8.
8. Standing aim fire and vision: 052901 fires the rifle at a door at 8 (ammo 24 to 23); vision switches always pass through one black frame.
9. Context menu rules (for the interact system): a locked door lists PICK LOCK, BREAK LOCK, OPTIC CABLE (plus BODY when a body is at hand); an unlocked closed door lists OPEN DOOR, OPEN DOOR STEALTH, BASH DOOR, OPTIC CABLE; an open door lists only CLOSE DOOR; a held guard lists INTERROGATE; an unaware guard at close range lists GRAB CHARACTER. The header changes to BACK TO GAME while the cursor is being moved.

## Old clips, group 3


Source: `docs/archive/locomotion/research/ct-footage-catalogue.md` against the 1 fps sheets in `pc/ct-work/sheets-old/`. Every sheet of every clip was read. Times are the burned-in clip seconds (tile N = frame at N.0 s), so an edge is still +-1 s. "Unsure" marks a reading that needs a frame-step. Clip names are HHMMSS. Every clip in this batch has at least one catalogue row.

HUD notes that apply to all clips: the bottom-right panel shows a noise/visibility bar that fills with dots when the hero runs, crouch-runs, jumps or fires (seen 054021 0-3, 053816 2-5, 053849 9-12, 054237 11-13, 054502 1-2, 054802 1). The weapon line reads rifle in the hotel and courtyard clips, launcher in every alley clip (054702 onward), so "weapon away" at idle holds for those too.

Weapon carry (contradicts the catalogue's "none visible" note): a rifle is slung diagonally across the hero's back indoors (053525 17-19, 053709 14, 054411 48-52). In the lit courtyard after the door he carries the rifle in both hands, muzzle low (053525 35-36, 053709 33-38). Not drawn by an aim input that the sheet shows; frame-step 053525 33-35 to see when it comes up.

---

### 053323 (2.2 s)
- Catalogue rows: K1 (053200, 053323). Verdict: correct.
- Corrections: none. Thermal at 0 and 1 s, the hero fills the lower right, upright, same place in both tiles (walking away or standing, unsure). No menu.
- Missed: nothing.
- Action menu: none.

### 053437 (44.5 s)
- Catalogue rows: K2. Verdict: corrected.
- Corrections:
  - 0 s is normal night vision (hero walking down the hotel corridor, door at left, behind view); 1 s is black (vision switching); thermal runs 2-44. The row implies thermal from 0.
  - "Walking 2-35" is not one steady walk. 2-8 and 11-25 walk away from the camera. 9-10 the camera is jammed against the hero (head fills the frame, at a door, prompt CLOSE DOOR). 26-28 the hero turns side-on and goes round a corner (profile at 26-28, back view at 29, profile again 31 and 34-35 with wide strides). 36-37 the camera is again pressed against him (his head fills the frame) as he enters a cool lit room. 38-44 he walks away from the camera.
  - "Window / lamps hot 36-44": correct (a hot window block upper left, two hot lamp spots, from 36).
- Missed:
  - D4 (walking curves): two clear 90 degree turns in thermal at 26-28 and 34-35.
  - O3-1 camera pulled in against a door frame or wall: 9-10 and 36-37 (also 053525 5-7 and 33-34).
- Action menu:
  - 0, 1, 2 s: INTERACT with PICK LOCK / BREAK LOCK / OPTIC CABLE / BODY (a locked door and a body in range). Nothing selected; walking continues.
  - 3 s: INTERACT with BODY only. Then the menu is gone.
  - 8-10 s: INTERACT / CLOSE DOOR (door he has just passed). Not used.
  - 36-37 s: INTERACT / CLOSE DOOR (door behind him). Not used.

### 053525 (37.3 s)
- Catalogue rows: F1 (extra), K3. Verdict: corrected.
- Corrections:
  - Beat list (all behind view): 0-4 straight corridor walk toward an open door (best default-camera framing, camera about 2.5 m back, slightly above); 5-7 camera at the doorway, hero hidden at 5 then head and back at 6-7, prompt CLOSE DOOR; 8-14 walks through a window-lit room; 15-16 night vision white-out (bloom) at the window, hero ghosted; 17-23 crosses the room while the camera orbits round to his left; 23-26 hero side-on facing an arched window (slows, stops 24-25, turns away 26); 27-30 walks to a door; 30-31 opens it (side-on); 31-32 steps through; 33-36 outdoors in a lit courtyard.
  - The "good default-camera framing" claim is true for 0-4 and 8-14 only. 5-7 and 33-34 have the camera squeezed against geometry (33-34 shows only the back of his head and shoulders).
  - Duration is 37.3 s; the row's "0-36" is right.
- Missed:
  - H2: open a door and walk through, 27-32 (the OPEN DOOR prompt falls between tiles; compare 053709 29).
  - D4: turn toward the arched window 23-26 and away 26-27.
  - O3-3: rifle slung on the back 17-19; rifle in both hands 35-36 (see top).
  - K3: night vision overload at a bright window 14-16.
  - F2 (unsure): camera swings round the hero 17-26 while he walks; Michael may have been steering.
  - O3-1: camera against the doorway 5-7, 33-34.
- Action menu: 5-7 s INTERACT / CLOSE DOOR (door he is passing). 33-34 s INTERACT / CLOSE DOOR (door he just came through). Nothing used; the menu goes when he walks away.

### 053617 (37.4 s)
- Catalogue rows: K4. Verdict: correct.
- Corrections: none. EMF view, the hero is never visible; near-blank blue frame. Bright dots (lights/devices) start at 31-32 and are clear 33-36 ("devices visible 32-36": fine, add 31). The prompts line up with 053709 and 053525 (same route, EMF this time), so the hero is walking the whole clip.
- Missed: nothing for movement.
- Action menu: 0-1 s INTERACT / BODY. 6-7 s INTERACT / CLOSE DOOR. 33-34 s INTERACT / CLOSE DOOR. None used.

### 053709 (39.2 s)
- Catalogue rows: (other) K row. Verdict: corrected.
- Corrections: dark 0-5; window light starts at the right edge 6-8; hero visible in the shaft 9-14 (silhouette); haze washout 15-16; dim room with the window grid on the floor 17-22; hero visible near the arched window 22-25; dark 26-30; courtyard glimpsed 31 and fully lit 32-38. The row's "9-25" should read about 6-25, "26-31" about 26-30, "32-38" about 31-38.
- Missed:
  - H2: door open and walk through, 29-32.
  - H4 (partly): BASH DOOR is offered at 29 but not chosen.
  - O3-3: rifle in both hands in the courtyard, 33-38; rifle slung at 14.
  - A walk of the same route as 053525 and 053617: all three can be used to compare vision modes.
- Action menu:
  - 0 s: INTERACT with PICK LOCK / BREAK LOCK / OPTIC CABLE / BODY. Nothing selected.
  - 5-7 s: INTERACT / CLOSE DOOR. Not used.
  - 29 s: INTERACT with OPEN DOOR / BASH DOOR / OPTIC CABLE. Next: the door opens 30-31, he walks through 31-32.
  - 32-34 s: INTERACT / CLOSE DOOR after the door. Not used.

### 053800 (15.9 s)
- Catalogue rows: E1. Verdict: correct with one fix.
- Corrections: 4-7 is a standing walk, not a stand-still (the background scrolls from the door frame to the wall; hero's stride visible). The rest holds: stand 0, crouch still 1-3 (camera and hero static), crouch-walk 8-9, stand-walk 10-11, crouched walk 12-13 (12 is the transition, the posture is clearly low at 13), stand-walk 14-15. The stand-to-crouch on the move happens at 7-8 and 11-12; both are only one tile, frame-step for timing.
- Missed: nothing.
- Action menu: none.

### 053816 (5.9 s)
- Catalogue rows: E2. Verdict: corrected (roll not confirmed).
- Corrections:
  - 0 s standing at a door frame; 1 s first strides (door frame barely moved, so he is only starting). 2-4 a deep hunched fast move along a marble wall (about 3 s, with the noise bar rising); 5 hunched at a door with a scanner box at lower right.
  - A roll cannot be a 3 s event. Tile 2 is a curled, forward-thrown pose and could be the roll or a roll start (unsure); 3-4 are a deep-lunge crouched sprint. Treat the roll as at most about 2 s, one tile, and frame-step before measuring its length or distance. "Recover 5" is wrong: 5 is still crouched at the scanner.
- Missed: O3-5 retinal scanner interaction (crouched at the scanner at 4-5).
- Action menu: 4 s INTERACT / HACK RETINAL SCANNER. Not used in this clip (clip ends at 5.9 s).

### 053849 (15.5 s)
- Catalogue rows: E3. Verdict: correct with an addition.
- Corrections: 1 (arms out, legs apart, one tile), 5 (airborne, body tilted at a door), and 12 (full stride, forward lean) are consistent with standing jump, walking jump and run jump. Tile 11 shows him turning toward the camera (goggles lit), so 10-11 is a walk plus turn. Noise bar fills at 9-12. All times +-1 s; the takeoff and landing frames are not on the sheet.
- Missed: I7 (body): at 14 he is crouched at a door beside a dark body on the floor; 15 is a floor-level camera with prompt INTERACT / BODY. This is the start of a body pick-up.
- Action menu: 15 s INTERACT / BODY. Next: clip ends (pick-up is not shown).

### 054021 (23.8 s)
- Catalogue rows: J1 / J2. Verdict: corrected.
- Corrections:
  - 0-3 runs to a glass-topped counter (noise bar full 0-3), 4 walks the last step; 5 jumps and grabs the edge; 6 over the top; 7-10 inside the counter, crouched, camera high and looking down; 11-12 at a drawer unit (not listed; no prompt); 13-15 mantles up the inner rail and over to the outside (not a hang); 16-18 lands outside and crouches; 19 jumps again and grabs the outer edge; 20-21 hangs from the edge by both hands, feet free; 22 pulled up and sitting on the edge; 23 standing on top.
  - Catalogue "climb at edge / hang 13-15" should be "mantle over rail 13-15"; "hang 19-21" should be "jump 19, hang 20-21".
  - View: camera is high and often top-down inside the counter, not "behind, high" throughout.
- Missed:
  - E4: drop from the rail to the floor 15-16 (about 1 m, lands crouched).
  - J1: a second counter mantle, 12-15, from the inside.
  - O3-1: camera clipping during the mantle (7-10 shows a wall edge sweeping across).
- Action menu: none.

### 054103 (23.7 s)
- Catalogue rows: J2. Verdict: corrected.
- Corrections:
  - 0-1 idle at the foot of the counter, prompt CLOSE DOOR (a door is next to him); 2-3 climbs over the rail (3 crouched on top, camera above and behind); 4 stands inside; 5-7 is on the floor outside again (5 crouched, 6 runs left, 7 stands facing the counter), so "drop 5-7" is wrong: the drop is at about 4-5.
  - 8 jumps and grabs the rail; hang 9-19 (hands on the edge, about 11 s); 20 lets go; 21 lands crouched; 22 still crouched; 23 stands.
  - "Shimmy": at 1 fps the hero moves only a few tens of pixels along the counter (right at 11-13, back at 17-19), so a short shimmy is possible but unproven. Frame-step.
- Missed: E4: drop from a hang to the floor at 20-21, landing crouch visible at 21-22 (height about 2 m).
- Action menu: 0-1 s and 5-6 s INTERACT / CLOSE DOOR. Not used.

### 054201 (3.35 s)
- Catalogue rows: K3 / K4. Verdict: correct as far as the sheet shows.
- Corrections: this sheet has only 3 tiles (0, 1, 2 s). Thermal at 0 and 1 s (hero walking, noise bar dotted), EMF look at 2 s. The row's 4 per second sub-edges (NV 2.5-3, normal 3.25) lie after the last tile and could not be checked.
- Missed: nothing.
- Action menu: none.

### 054237 (15.05 s)
- Catalogue rows: (other) J row. Verdict: corrected.
- Corrections:
  - 0-8 is a courtyard walk (not J3). 0-2 walks along a wall and under an arch; 3 the camera is pushed into the arch wall and the hero is nearly hidden (lower right); 4 he turns left about 90 degrees at a fence; 5-8 walks away along a garden path, side-on at 8.
  - 9 the camera snaps to an over-the-shoulder aim (hero lower left, right shoulder view); 9-11 aims at a small standing figure in the garden; ammo reads 20 until 11, 18 at 12 and 14 at 13, so firing is about 11.5-13.5 (not from 9). 14 is dark, the hero is not visible, and the weapon line has switched to the pistol (unsure: vision off or a camera cut).
- Missed:
  - F3 (rifle raise and aim, live): the raise is between 8 and 9.
  - F5 (weapon swap) at 13-14.
  - D4: left turn at 4, camera clip at 3 (O3-1).
- Action menu: none.

### 054411 (53.35 s)
- Catalogue rows: J3 (drainpipe), J4 (27-32), J9 (35-52). Verdict: corrected.
- Corrections:
  - First pipe climb: 0-1 stands at the foot; 2-7 climbs up (a balcony rail and a plaque appear at the top of frame); 8-12 climbs back down (the lamp and gate at lower left re-enter at 9); 13 on the ground. The row's "up 2-12, drop 13-16" is wrong: up 2-7, down 8-12, then idle 13-17 (13-15 faces the wall; 16 turns his back to the camera; 17 faces the wall again).
  - Second climb: 18-26 up (18 first grip). "Up again 17-26" should read 18-26.
  - 27 reaches a horizontal hold and hangs with both arms up; 28-32 hangs (about 5 s). The hero moves a little along the hold (a wall plate shifts about 60 px relative to him between 28 and 30), so a short hand-over-hand is plausible but not shown clearly. 33 drops (arms out in the air), 34 crouched on a wooden platform. So J4 "drop 33-34" holds.
  - J9: 35 stands at a wall opening; 36-44 is the inside of a duct (camera ahead of him; hero not visible); 45-47 reaches the far end (prompt EXIT FRONT, foggy beyond); 48-52 the hero is visible again from behind, bent over in a larger duct, rifle slung across his back; 51-52 turns his head and crouches.
- Missed:
  - E4: the drop at 33 onto a platform, crouch at 34 (a drop of about 1.5-2 m from a hang).
  - O3-3: rifle slung on the back at 48-52.
- Action menu: 36 s INTERACT / EXIT BACK (inside the duct). 45 s INTERACT / EXIT FRONT. Next: 46-47 camera moves on through the duct, 48 hero visible. Neither prompt is confirmed as pressed; the exit at 45-47 happens without an obvious press.

### 054502 (22.3 s)
- Catalogue rows: J3 (ladder). Verdict: corrected.
- Corrections: 0-2 approach (camera swinging, noise bar dotted at 1-2); 3-4 mounts (hands on rungs, feet just off the ground); 5-12 climbs up with the camera high and looking down (a roof edge reaches the top of frame at 11-12, the top of the climb); 13-20 climbs back down (the ladder foot and the bright patch come back at 16-17, ground in frame at 18-20); 21 lands crouched on gravel. The row says "up 3-17, down 17-21". Better: up 3-12, down 13-20, land 21 (unsure of the exact turn, +-1 s).
- Missed: E4: step off the ladder to the ground and crouch at 21 (height about 2 m, unsure).
- Action menu: none.

### 054702 (31.0 s)
- Catalogue rows: J6. Verdict: corrected (description).
- Corrections:
  - The sheet does not show a clear wall jump. 0-2 the hero is hunched or off the ground against a large dark panel (a dumpster or big door) in an alley, a tile each (a jump off the panel is possible, unsure); 3-6 a black bag moves relative to him (he carries and drops it); 7-14 crouched at the panel edge, a guard with a bright torch at a distance; 15-20 is not gameplay: pause menu (15-16) and a save-game screen (17-20); 21-30 crouched at the panel with the guard walking past in the distance (24-30).
  - The row's ranges 0-14, 15-20, 21-30 match, but call 15-20 "pause and save menu".
- Missed:
  - O3-2: pick-up object and drop it (3-9), hiding behind a large object from a guard with a light (7-14, 21-30).
  - O3-4: pause and save menu (15-20). Not a move.
- Action menu: 4-9 s INTERACT / PICKUP OBJECT (a bag or object by his feet). 15-16 s pause menu list (save, load, restart, settings, training videos, quit); 17-20 s save game slot list. 24-30 s INTERACT / PICKUP OBJECT again. Nothing is picked up on the sheet beyond 4-6.

### 054802 (10.15 s)
- Catalogue rows: J1 / J2. Verdict: correct.
- Corrections: only fine edges. 0-2 walks on fire-escape grating and stairs (noise bar dotted at 1); 3 at the edge, 4-5 hangs by both hands below the platform edge, 6-8 pulls up and over (8 is horizontal across the rail), 9 crouched on the platform. The catalogue "hang 3-5, pull up 6-9" fits.
- Missed: O3-6 (stairs): grating and stair walk 0-2 (no shotlist code). Camera is high and top-down.
- Action menu: none.

### 054824 (4.6 s)
- Catalogue rows: I2 / I3. Verdict: corrected (code).
- Corrections: the guard is unaware and standing with his back turned, and the hero approaches crouched (tile 0), grabs and drops him at 1-2, so it is a stealth strike from behind (I1), not I2 (frontal run-up) or I3 (guard facing him). 0 hero crouched beside a standing guard; 1 strike; 2 guard on the floor, hero standing close to the camera; 3 hero crouches beside the body; 4 hero crouched against a pillar (body out of frame).
- Missed: nothing.
- Action menu: none.

### 055600 (3.7 s)
- Catalogue rows: I1 / I2. Verdict: corrected (code).
- Corrections: 0 hero holds a guard from behind next to a car (arm round his torso); 1 hold, the guard sagging; 2 the guard is on the ground and the hero stands over him with an arm and leg extended; 3 guard lying, hero upright. This looks like a grab then knock-out (I6 start, or I1), not a frontal strike (I2). Frame-step 0-2 to separate grab and strike.
- Missed: nothing.
- Action menu: none.

### 055649 (42.0 s)
- Catalogue rows: J2 / J4. Verdict: corrected.
- Corrections:
  - 0-1 walks to a wall with a vertical pipe; 2 grabs the pipe; 3-4 climbs it. 5-11 the camera is jammed against the wall and shows his head and shoulders (hand over hand on the pipe, visible); 12 the hero is out of frame; 13-19 the camera is below and to one side with the hero hanging by hands and the building tilted in the background. So 5-19 is not unusable: the pole-grip hands, the hand-over-hand and the transition to the ledge are in frame, just from an odd angle.
  - 20-37 hangs from a horizontal ledge by both hands and moves along it (a fire-escape platform drifts from the right edge toward the bottom centre). 38 the camera is close, he hangs by the hands (not legs-up). 39 drops onto the fire-escape platform, 40 crouched, 41 stands and goes down the stairs.
  - No legs-up or upside-down hang in this clip.
- Missed:
  - E4: the drop at 38-40 onto the platform (about 2 m).
  - O3-6: stairs at 41.
- Action menu: none.

### 055717 (8.1 s)
- Catalogue rows: J3 (fire-escape ladder). Verdict: corrected.
- Corrections: 0-1 he is on the fire-escape grating (walking or crouch walking, noise dots at 1), not yet on the ladder. 2 mounts the ladder at the platform edge; 3-6 descends; 7 lands crouched on newspapers and bags. The row's "ladder down 0-6" should be "ladder 2-6, land 7".
- Missed: O3-6 (stairs), grating walk 0-1. E4: last rungs to the ground and crouch at 7.
- Action menu: none.

---

## Corrections that matter most for movement

1. Pipes (054411): drainpipe is up 2-7 then down 8-12, not up 2-12. Second climb 18-26, hang 27-32, drop 33. Hand-over-hand is unproven.
2. Ladder (054502): up 3-12, down 13-20, land 21 (not up to 17).
3. Hang to ground drops are recorded (054103 20-21, 054411 33-34, 055649 38-40, 054502 and 055717 landing crouch): E4 is partly covered, with landing crouch. The catalogue lists E4 as missing.
4. Ledge hangs: 054103 8-19 (a short lateral drift only), 055649 20-38 (a real shimmy to a platform, not legs-up), 054021 20-21 (hang then pull up at 22).
5. E2 (053816): 2-4 is a 3 s crouched sprint; the roll, if any, is one tile. Do not take roll duration or distance from 2-4.
6. E1 (053800): 4-7 is a walk, not a stand; stand-crouch on the move at 7-8 and 11-12.
7. Camera: pulled hard into doorways and wall edges (053437 9-10 and 36-37, 053525 5-7 and 33-34, 054237 3). The camera orbit in 053525 17-26 and the aim snap in 054237 9 are the best camera evidence in this batch.
8. Aiming (054237): the aim begins at 9, the first shot is about 11.5, and 14 shows a pistol HUD with a dark frame.
9. Weapon carry: rifle slung on the back indoors, rifle in both hands outdoors (053525 35-36, 053709 33-38). The "none visible" note is wrong.
10. Turns: 90 degree walk turns in thermal (053437 26-28, 34-35) and outdoors (054237 4) are usable for D4.
11. Not wall jump: 054702 is a dumpster hide with a pick-up and a pause/save screen. Keep J6 as missing.
12. Codes: 054824 is I1 (stealth takedown), 055600 is a grab plus knock-out (I6 or I1).
