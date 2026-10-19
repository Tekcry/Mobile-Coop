# Coverage check: Part 1 clips (26 new clips) against the six audits

Source: `docs/ct-prototype/FOOTAGE-CATALOGUE.md` lines 18-689 (groups 1-3). Audits: `docs/ct-prototype/audit/AUDIT-*.md`.
Text only, nothing frame-checked. "PC" = the player character, "enemy" = a patrolling NPC.
Key: LOC = AUDIT-LOCOMOTION, CAM = AUDIT-CAMERA, AIM = AUDIT-AIM, WALLS = AUDIT-WALLS, TRAV = AUDIT-TRAVERSAL, MENU = AUDIT-ACTIONMENU. "#n" = delta table row; "Missing #n" = item n of that file's "Missing entirely" list; "NM" = that file's "Not measurable" list.
Status in the last column: COVERED = a delta row fits the clip evidence; PARTIAL = a row exists but the clip shows more than the row says (note says what); MISSING = no row at all.

Clip names are the HHMMSS part. Times are catalogue times (+-0.5 s).

## 1. Locomotion on foot

| clip @ s | movement / action | audit row | note |
| --- | --- | --- | --- |
| 105509 0-13.5, 30-46; 105718 0-12, 39-43.5; 105949 0-10, 24-28; 110038 0-6; 110341 0-5.5, 5.5-23, 29-35; 110828 0-5.5; 110818 56-61; 111731 43-47; 112428 12-15; 111908 0-0.5; 112135 7.5-8.5 | Upright walk, away, toward and side-on (one speed) | LOC #5, #6, #14 | COVERED. Speeds are estimates (hand camera, no ruler). 110828 and 110818 56-61 are the only floor-tile rulers for a clean walk speed |
| 110341 1-5 | Slower walk gear (steps slower than 0-1 s) | LOC #14 | COVERED, estimate only |
| 105509 14-15.5; 105845 0-2.5, 22-23, 26-28; 111908 16-17, 32-32.5; 112135 5.5-6 | Stand turn on the spot (legs follow) | LOC #1, #2, #10 | COVERED |
| 105949 10-23.5, 43.5-53.5; 110038 0-6; 110341 9-10, 14-15, 17-18 | Curved walk, 90 and 180 deg direction changes at walk pace, feet cross on small turns | LOC #1, #2, #10, #11 | COVERED. Feet crossing on small turns is LOC #1's "no crossing" claim |
| 105949 28.5-33 | Walk to crouch walk, turn at 32.5 | LOC #17, #15 | COVERED |
| 110038 6.5-11.5; 110117 0-4.5, 5-11.5 | Jog / sprint, straight and looping | LOC #7, #8, #14 | COVERED |
| 110038 7, 8.5, 10; 110117 7, 8.5, 10 | Sprint turns, lean into the turn | LOC #12, #8 | COVERED, bank angle not frame-measured |
| 110117 0-0.5 (start); 110038 11.5-12, 110522 0-3 (slow after run) | Run start and run-to-idle stop | LOC #13 (start), #9 (stop) | COVERED. Catalogue rates C1/C2 "poor" |
| 110117 18.5-27.5; 105624 0-20, 43-65; 105718 14-33; 105845 30.5-31, 33.5-34.5, 37.5-39.5; 110038 31-43.5; 110341 35.5-56, 62-69; 110522 72-76; 110714 0-1.5; 110818 17-27, 33-46; 110936 0-5.5; 111234 49-51; 111823 1.5-9.5, 16-18; 112331 0-20, 30-31.5; 112428 0-8.5 | Crouch walk (all speeds), away, toward, side-on | LOC #15, #16 | COVERED. Hand near the floor on 110341 maps to LOC #16 "hands at knee height" |
| 110117 12-18 | Very low fast crouch move (N4) | LOC #16 | COVERED |
| 111823 11-14 (13-13.5 fastest) | Crouch run, long strides, arms swinging | LOC #16 | COVERED, same row as N4 |
| 105624 20-42; 105949 33.5-43; 110038 15.5-31; 105845 33.5-34.5; 111823 3.5-4.0; 112331 4-5; 112102 14.5-16.5; 111234 1.5-4.5 | Crouch turn on the spot (shuffle) | LOC #1 (105624 24-27 is the measured case) | COVERED. 111823 3.5-4.0 has a hand near the floor in a tight crouch turn, not in the row |
| 105718 12.5-39; 105845 30.5, 35.5; 110341 34.5-35.5, 68; 110616 several; 111823 1-2; 112102 13.5-14; 112135 1.5-2, 5.5; 112331 30-30.5; 112428 11-12, 17-17.5; 111234 1.5-4.5, 47 | Stand to crouch and crouch to stand, standing and walking | LOC #17 | COVERED. 112428 11.5-12 (stand-up after a takedown) is the same move |
| 105624 53-55, 63-65; 112428 1-2.5; 112331 2.5-3.5; 112102 15.5-16; 111823 14.5-15.5 | Drop to one knee / low crouch hold, slow creep | LOC #3, #4 | COVERED. 112428 1-2.5 and 112331 2.5-3.5 are low holds while tracking an enemy: LOC #3 only times the kneel, not the "track an enemy" intent |
| 105624 20-42; 105718 17-21; 110522 72-76; 111234 0-1; 111424 5.5-7, 14.5-15.5; 110714 25.5; 110818 0-2 | Crouch idle (hunched, small shuffles) | LOC #3, #4 | COVERED |
| 105509 15.5-29.5; 110038 12-15; 111908 17.5-20, 33-34.9; 112135 0-1.5; 112102 0-1; 111335 0-1.5; 111823 0.5-1.5 | Standing idle, weight shifts | LOC #20 | COVERED |
| 111335 43-45.5 | Idle then look around, small walk at the rope end | LOC #20 | PARTIAL. "Looks around" head turn is not covered; minor |
| 110522 70.5-72; 110616 9.5-11.5, 16.5-17.5, 20.5-21.5; 110818 15.5-16.5; 111234 5-10 (end); 111335 47.5-48.5; 111731 25-26; 111424 13.5-14, 112102 7.5-8 | Landing after a drop, into a deep crouch, arms out | LOC #18; TRAV #9, #12, #15 | COVERED (drop from hang, ladder release, rappel push-off each have a row) |
| 110522 0-3 | Run toward the camera "over a crate" then slow | LOC #7, #9 | PARTIAL. If this is a run-up vault, no row covers a run-up mantle speed (see TRAV #7 for 20.0-21.3) |
| 105845 31.5-32.5, 36-41.5; 111823 14.5-15.5 | Slow into crouch from crouch-run / stop in crouch | LOC #9 (stand stop) | PARTIAL. LOC #9 is a standing stop only; no crouched stop row |
| 111823 17.0 | Hand pushes off the wall while crouch-running | MISSING | Minor. Belongs LOC |
| 110818 37.0-37.5 | Steps around / over something on the floor while crouch walking | MISSING | Minor. Belongs LOC |
| 110117 4.5, 10.5, 13-14, 26; HUD bottom left | Noise / stance meter segments fill with speed | LOC NM #4 (dropped as unreliable) | MISSING as a feature. LOC found the pips unreliable; not specced |
| 105509, 105718, 110522 and every front view | Three green goggle lights glow when facing the camera | MISSING | Character visual, not a movement. Belongs LOC (or Character Build) |
| 111823 0.5-1.0 | Hand raised to the head at a standstill (N3-4), same instant night vision switches on | MISSING | Likely the goggle-toggle animation: 112542 19.5 (arm raised at the thermal switch) supports it. Belongs LOC (or a new vision file) |
| all clips: idle and walk with a slung rifle, rifle in hand only when aiming | Back-slung diagonal rifle on every walk and idle | AIM #3 and "Correction to the catalogue" | COVERED |

## 2. Camera

| clip @ s | movement / action | audit row | note |
| --- | --- | --- | --- |
| all clips (105509 0-3 vs 33-38; 105845 0.5; 110038 1; 111908 0.2, 18.5, 34) | Explore chase camera: distance, height, x offset, pitch, head height | CAM #1, #4, #5, #6 | COVERED |
| 105624 4.0, 48-52; 110038 40-43 | Crouched explore camera distance | CAM #7 | COVERED, estimate |
| 105509 14, 29.5-30; 105624 20.5, 42-43; 105718 34-35; 110038 31-33; 110117 5, 18.5; 110522 several | Hand-orbit swings, fast rise to high, drop to low or front | CAM #18, #8 | PARTIAL. CAM treats these as Michael's orbit (CAM section 5 "Look rate"); no CT rule to copy. Look rate frame left unread |
| 112542 6-11; 110714 23.5-25 | Free-look pan with the stick | CAM #18 | COVERED |
| 110341 21-29, 56-61, 64.5-65; 110522 54-58 | Camera tucked tight by wall or door geometry (N1) | CAM "Matches CT" paragraph (no row number) | COVERED, no fix needed |
| 105845 2.5-5, 8-10, 19-19.5; 111908 0.5-1, 20.5-22; 111953 0-3 | Camera blend from chase to over-the-shoulder aim; aim framing | CAM #2, #10, #13 | COVERED |
| 105845 12.5-18.5; 111908 3-3.5, 5-5.5, 12-13.5, 27-28.5 | Shoulder swap camera arc | CAM #9 | COVERED |
| 105845 10.5; 111908 25.3-26.6 | Scope: cut in, glide out | CAM #3 and Missing (scope) | COVERED |
| 110522 43-52 (hang), 65-70 (shimmy) | Hang and shimmy camera | CAM #14 | COVERED |
| 112102 2-21 | Ladder camera, tilts up and down | CAM #15 | COVERED |
| 111335 2-48 | Rope camera, side-on, top-down on descent | CAM #16 | COVERED |
| 111731 4-40 | Rappel camera | CAM #16 | COVERED |
| 110714 6-13; 111234 12.5-47 | Duct and crawl camera behind the helmet | CAM #17 | COVERED |
| 110818 44.5-46 | Wall peek camera at a corner | CAM #11; WALLS #10 | COVERED |
| 110818 45.0-58, 111823 16-18 | Camera while at or beside a wall (slide / room side) | CAM #12 | PARTIAL. 110818 poster-wall crouch views are close; CAM #12 is standing slide only |
| 110936 5.9-7.0; 110936 12-21; 112331 20.5-28 | Camera during grab and hostage walk | WALLS #26 | COVERED (keep follow camera) |
| 110936 41-47 | Camera during carry | WALLS #27 | COVERED, estimate |
| 112428 8.5-10.5 | Camera drops into the takedown, clips through the arm | CAM section 4 (risks) | COVERED (keep our body fade) |
| 112135 6.5-7.0 | Camera swings close behind the head as a rifle is raised at a door | CAM #2 | PARTIAL. Door aim camera not separately noted |
| 110818 25-28; 112135 7.5-8.5 | Door-open camera (door crack close-in, pulls back) | WALLS #14 (text only), CAM NM bullet 4 | PARTIAL. WALLS #14 fix text has no camera step; CAM NM says no rule visible |
| 110818 0-2, 7.5-8.5; 111234 0-6.5 | Top-down high camera over a floor trap | TRAV #17 (one line in the CT cell) | PARTIAL. No CAM row; TRAV #17 notes it only |
| 111234 6.5-9.5 | Camera swinging inside the shaft | MISSING | Belongs CAM |
| 110818 2.5-7.0 | Optic cable remote view (fish-eye through a floor trap) | WALLS Missing 1 (door version), TRAV Missing 2 (one clause) | PARTIAL. Floor-trap version never specced as a view |
| 112542 1-21.8 | Vision-mode clip camera fixed, low, behind-left | MISSING | No row for the vision cycle (see section 7) |

## 3. Aiming and weapons

| clip @ s | movement / action | audit row | note |
| --- | --- | --- | --- |
| 105845 2.5-3.5, 7.5-8.5, 23.5-26, 31.4-32.5; 111908 20.5-22; 112135 6.5-7.0 | Rifle draw to aim (reach over shoulder, muzzle up, settle) | AIM #1, #3, #9 | COVERED |
| 105845 35.5-36.5; 111908 0.5-1.0 | Pistol draw to aim | AIM #7, #14 | COVERED |
| 105845 3-5, 8-10, 11-12; 111908 1-2.5, 14-15.5, 22-25, 29-31.5; 111953 0-3 | Aim hold, rifle and pistol, over either shoulder | AIM #4, #5, #6; CAM #2 | COVERED |
| 105845 5.5, 11-12, 19-19.5, 28-29; 111908 16-17, 32-32.5; 105845 41.5 | Aim release, lower, instant holster | AIM #2 | COVERED |
| 105845 12.5-18.5 (five swaps in a row); 111908 3-3.5, 5-5.5, 12-13.5, 27-28.5 | Shoulder swap, rifle and pistol | AIM #10; CAM #9 | COVERED |
| 105845 10.5; 111908 25-26 | Scope zoom in and out, first person ring, range readout, 1.5 X / 15x label | AIM #8 and Missing (scope); CAM #3 | COVERED |
| 105845 31.4-32.9, 36-41.5 | Crouched aim, aim while crouch-moving | AIM #19, #18 | COVERED |
| 105845 12-19, 22-23, 26-28 | Turn while aiming (D7) | AIM #9, #12 | PARTIAL. AIM #9 covers the aim-press turn; turn while already aimed only via look rate #12 |
| 105845 19.5-23, 26-28 | Walk with weapon lowered right after an aim | AIM #17 (no carry pose in CT) | COVERED |
| 111953 0.5, 3-4, 5.5-6.5, 6.5-8.5 | Rifle fire from aim, recoil, muzzle flash and smoke, ammo count down | AIM #11 (recoil only) | PARTIAL. Muzzle flash, smoke and the ammo HUD count have no row |
| 111908 18.5-19.0 | Weapon selection bar along the bottom (row of 5 icons), pistol to rifle, PC idle | AIM #13 (behaviour only) | PARTIAL. Bar UI (5 icons, cursor) not specced; behaviour (no body motion) is #13 |
| 110818 48.5-55.5 | Item bar open (4 slots, name under, mouse driven): rifle attachment, pistol, grenades; PC crouched static; ammo block changes to pistol at 54 | AIM #13 (behaviour), nothing on content | PARTIAL. Bar shows grenades and rifle attachments as entries and is mouse driven; no row for the bar UI or its entries |
| 111731 0-2.0, 29-29.5 | Rifle stays slung while rappelling and on a ledge | AIM #3 | COVERED |
| 110936 7.5-9.5 | Pistol to the head of a held enemy (one hand, no gun visible) | AIM Missing #4; WALLS #19 | COVERED as a plan; AIM item 4 is the same pose |
| no reload in any of the 26 clips | Reload | AIM #16 | N/A (not seen, as AIM says) |

## 4. Walls and doors

| clip @ s | movement / action | audit row | note |
| --- | --- | --- | --- |
| 110818 44.5-46 | Crouched back to a wall at a corner, body turned, peeking pose | WALLS #1, #9, #25 | COVERED. Catalogue rates G3 "poor" |
| 110818 57-58 | Standing, back to a bright corner, camera along the corridor | WALLS #3, #15 | COVERED |
| 110818 38.0, 39-41, 46-47.5 | Crouched along the poster wall, moves sideways along it | WALLS #1, #2 | COVERED, unsure whether the PC is attached |
| 110341 (all); 110818 23.5-24.5 | Walks beside a wall, shoulder to a door frame, not attached | WALLS #23 (CT shows no attach on low cover) is the closest | COVERED as "no back-to-wall seen"; no row needed |
| 112135 7.0-8.5; 110818 22.5-30 (already open) | Open door and walk through | WALLS #4 | COVERED |
| 112135 0, 8, 10.5; 110818 25-28, 41.5-43 | Door menu: OPEN DOOR, OPEN DOOR STEALTH, BASH DOOR, OPTIC CABLE; CLOSE DOOR | WALLS #4, #14, #17, #29; MENU option sets | COVERED (stealth and bash never seen performed) |
| 112135 8.0-10.5 | Door closed again | WALLS #17 | COVERED, closer unknown |
| 112135 2.0-5.0 | Crouch at the door foot (optic cable), 3 s hold, menu changes | WALLS Missing 1 | COVERED as a plan. View cut at 5.5 not seen; the view itself is not in this clip |
| 112135 5.5-6.0 | Stand and step back from a door, turn to the camera side | WALLS #4 (step-in spot) | PARTIAL. Step-back after optic cable not in a row |
| 110936 4-7.8, 112331 20.5-23 | Grab from behind: rise, close in, arm round the neck, enemy pulled back | WALLS #5 | COVERED |
| 110936 0-6; 112331 0-20; 112428 0-8.5 | Crouched follow of a walking enemy (3-4 m back), pause, crouch-turn, close to arm's length with a hand forward | WALLS #28 | COVERED (estimate only, needs frame measure) |
| 110936 7.5-37.5; 112331 23-28.5 | Hold idle (chests together, pistol hand at the head, enemy struggles) | WALLS #19 | COVERED |
| 110936 10-37.5; 112331 24-26 | Hostage walk and turn with an enemy in front | WALLS #11 | COVERED |
| 112331 24.5 | Interrogate prompt on a held enemy, no result shown | WALLS Missing 2; MENU option sets | COVERED as plan |
| 110936 37.0-38.2; 112331 28.0-29.0 | Enemy goes limp and is lowered, PC bends over then stands | WALLS #20 | COVERED |
| 112428 8.5-10.5 | Takedown from behind (grab or strike unclear), body ends down | WALLS #13, #22 | PARTIAL. The exact move is not visible; WALLS cannot tell strike from grab here |
| 110936 38-42; 112331 29.5; 112428 11.0 | Body prompt and body pick-up (crouch, hoist onto the shoulder, 2 s) | WALLS #6 | COVERED for 110936; 112331 and 112428 show the menu only (no pickup seen) |
| 110936 42.6-47 | Carry on the shoulder, bent forward, slow | WALLS #7 | COVERED |
| 110936 46.5-47.5 | Drop the body | WALLS #8 | COVERED |
| 110936 48-50.5 | Crouched / stooped next to the body, BODY menu returns | WALLS #6 (menu only) | COVERED |

## 5. Traversal

| clip @ s | movement / action | audit row | note |
| --- | --- | --- | --- |
| 110522 7-24; 110616 1-1.5 (and 23-24.5) | Climb onto a waist or high crate (mantle), also run-up and second crate | TRAV #7 | COVERED |
| 110616 1.0-1.5, 19.0-19.5, 22.9-24.5; 110522 42-42.5 | Jump-grab up to a ledge (one arm or both arms reaching) | TRAV #8 | COVERED |
| 110522 9.5 | Jump between crates with arms spread | MISSING | E3 gap jump, catalogue partial. Belongs TRAV. Measure 110522 9.0-10.0 |
| 110616 1.5-3.5, 14-16, 19.5-20.5, 23-24.5; 110522 43-52; 111424 11.5-12 | Hang from a ledge or crate top, body against the face, small sway | TRAV #4, #5; CAM #14 | PARTIAL. No row for the static hang pose or its idle sway (TRAV #5 sway is for the shimmy only; TRAV #5 text says "HANG static") |
| 110616 4-5, 25-26.5; 110522 52.5-54, 59.5-61; 111424 12.5-13.5 | Pull up and mantle onto the top, ends crouched | TRAV #6, #21 | COVERED |
| 110616 7.5-9.5; 110522 57.5-59; 111424 10-11.5 | Lower over an edge or rail into a hang | TRAV #20 | COVERED |
| 110522 64-70 | Grab the side edge and hang (from standing on top) | TRAV #20 | COVERED |
| 110522 65-70 | Shimmy sideways, arms straight, legs swing | TRAV #4, #5 | COVERED |
| 110522 70.5-71.5; 110616 9.5-11.5 | Release from a hang and drop, arms out | TRAV #9; LOC #18 | COVERED |
| 110616 12.0-13.5; 110616 27-28.5; 110522 24-29, 36-42 | Walk along a crate top, narrow top, counter top, ledge | TRAV #22 | PARTIAL. 110522 38.5 "hands on the counter" and 24-29 "sits and steps along the top" not in the row |
| 110522 29.5-35.5 | Cross a beam or railing (leg over), walk the catwalk | TRAV #19, #22 | COVERED |
| 110616 29-30.5 | Climb onto a thin beam / ledge above a lit room, end crouched at the edge | TRAV #7, #22 | PARTIAL. Climb onto a thin beam top has no separate row |
| 110522 41.5 | Counter top: crouch or drop at the end | MISSING | Not in any row. Belongs TRAV |
| 111424 1.0, 3.0-4.5 | Rail vault (running; second vault over the rail, kicks legs up and over, lands crouched) | TRAV #18 | COVERED |
| 111424 7.5-8.5, 9-10.5 | Crouched stoop / crawl on a lower platform, climb onto the rail edge | MISSING | Minor. 111424 7.5-10.5; unclear. Belongs TRAV |
| 111823 7.0-9.5 | Crouched climb over a railing (sprawled, perched, legs over, lower into a crouch) | TRAV #19 | COVERED |
| 110522 29.0-31 | Same slow climb over, at a walk | TRAV #19 | COVERED |
| 112102 1-2.5 | Step to the ladder base, reach a rung, mount from the bottom | MISSING | Mount timing not in TRAV #10 (cadence only). Belongs TRAV. Measure 112102 1.0-2.5 |
| 112102 2.5-5.5, 8.5-12 | Climb the ladder up (hand over hand, knee up) | TRAV #10 | COVERED |
| 112102 12.5-14 | Ladder top-out onto a platform | TRAV #11 | COVERED |
| 112102 7.5-8 | Let go near the bottom, short fall, arms out | TRAV #12 | COVERED |
| 112102 17.0 | Mount the ladder from the top (torso at the rim) | MISSING | Belongs TRAV. Measure 112102 16.5-17.5 |
| 112102 17.5-20.5 | Descend the ladder (direction unclear) | TRAV #10 (up cadence only) | PARTIAL. No down rate or pose |
| 112102 21-21.5 | Hands on the platform rim, step back on from the ladder | MISSING | Top-out from a descent is not in TRAV #11. Belongs TRAV. Measure 112102 20.5-22 |
| 112102 14.5-16.5 | Walk and crouch-turn on the platform, kneel | LOC #1, #3 | COVERED |
| 111335 1.0-2.0 | Grab onto a rope (hands up, feet leave the floor) | TRAV Missing 1 | COVERED as plan |
| 111335 2.0-14.5, 38-40, 46-47.5 | Climb the rope up, hand over hand, soles on the wall | TRAV Missing 1 | COVERED as plan |
| 111335 15-17.5 | Top of the rope: over the lip, kneel | TRAV Missing 1 | COVERED as plan |
| 111335 22-23.5 | Go over the edge onto the rope (2 s, swings under the lip) | TRAV Missing 1 | COVERED as plan |
| 111335 24-35.5 | Descend the rope hand over hand | TRAV Missing 1 | COVERED as plan |
| 111335 36-38, 40-45.5 | Bottom of the rope, stand, let go | TRAV Missing 1; LOC #18 | COVERED as plan |
| 111731 2.0-4.0 | Rappel hook-on from a roof edge | TRAV #13 | COVERED |
| 111731 29-29.5 | Re-start the rappel from a mid-wall ledge (sit back into the rope) | TRAV #13 | PARTIAL. Ledge start not in the row |
| 111731 4-24 | Rappel down the wall, legs out, tucked pause | TRAV #14 | COVERED |
| 111731 24-26 | Push off and drop onto a ledge | TRAV #15 | COVERED |
| 111731 33.5-34.0 | Cable crosses and the PC swings out | MISSING | Belongs TRAV. Measure 111731 33.0-35.0 |
| 111731 34.5-40 | Hang near the bottom, feet on the floor / body, rope taut, unhook | TRAV #15 | PARTIAL. Unhook at low height is #15; the "feet on a body" contact is not |
| 110714 0-2.0 | Approach and enter the crawl space | MISSING | Entry transition not in any row. Belongs TRAV |
| 110714 6-13; 111234 12.5-47 | Crawl on all fours, one reach per second | TRAV #16 | PARTIAL. #16 covers camera and head bob; the crawl cycle pose and entry are not specced |
| 110714 13.5-16; 111234 47-48.5 | Emerge from the crawl space / duct, stand up, step out crouched | MISSING | Exit transition not in any row. Belongs TRAV |
| 111234 22-23.5 | Turn a corner inside a duct | MISSING | Belongs TRAV |
| 110818 9-12; 111234 4.5-5 | Open the floor trap (crouch to the grate, lift the lid) | TRAV #17 | COVERED |
| 110818 12-16.5; 111234 5-6 | Lower feet first through the hatch, hang, drop into the room | TRAV #17, #9 | COVERED |
| 111234 6.5-10 | Descend a vertical shaft, arms spread, hands on the shaft sides (3 s) | MISSING | Not in TRAV #17 (that is a 0.8 s drop). Belongs TRAV. Measure 111234 6.0-10.0 |
| 110818 0-2, 7.5-8.5; 111234 1.5-4.5 | Crouched over the grate, small turns, deploys the cable | TRAV #17 | PARTIAL. Deploy / hold pose over a hatch is only "hold the crouch pose over the hole" |
| 110714 25.5-26.5 | Crouched over the grating with the rifle slung | TRAV #17 | COVERED |

## 6. Action menus and prompts

| clip @ s | movement / action | audit row | note |
| --- | --- | --- | --- |
| 110522 4.5-5.5, 6, 8-9, 10.5, 13-13.5, 20-20.5 | Passive INTERACT / PICKUP OBJECT list flickering near crates | MENU Option sets, delta #3; MENU "Clipping and believability" (flicker) | COVERED. No pickup or carry seen |
| 110818 0.0-1.0, 8.5-9.5; 111234 0-0.5; 110714 26-26.5 | OPEN TRAP / OPTIC CABLE: passive, hold A active, release runs | MENU #1, #3, #4 | COVERED |
| 110714 1.0-1.5 | ENTER CRAWL SPACE prompt | MENU option sets | COVERED |
| 110714 16.5-23.0 | EXIT FRONT with BACK TO GAME, highlight alternates while scrolling | MENU #4, #7 and CT spec | COVERED. Menu shown while the PC is out of frame: odd, flagged in MENU as unresolved |
| 110818 25-28, 41.5-43; 112135 0-5, 8, 10.5 | Door menu (4 rows, CLOSE DOOR) | MENU option sets, #2 | COVERED |
| 110818 33-61; 110828 3-5.5 | INTERACT / SWITCH OBJECT passive, never active | MENU option sets (providers: PICKUP / SWITCH OBJECT) | PARTIAL. What SWITCH OBJECT does is not known; no animation row |
| 110936 5.5 | GRAB CHARACTER prompt, grab 0.5 s later | MENU option sets | COVERED |
| 110936 38-40, 50-50.5; 112331 29.5; 112428 11 | BODY prompt, highlight on press, body moved | MENU #3, #4 | COVERED |
| 111335 0-1.5, 17.5-19.5, 36.5-37, 40-49 | GRAB ONTO ROPE passive then active | MENU option sets | COVERED |
| 111731 0-1.5, 26.5-27, 40.5-42 | RAPPEL ON WALL, CLIMB UP | MENU option sets | COVERED. CLIMB UP never taken in the clip |
| 112331 22.5, 24.5; 112428 13-14.5, 16 | GRAB CHARACTER, INTERROGATE, CALL ELEVATOR | MENU option sets; WALLS Missing 2 | COVERED as option sets. Elevator is passive only, no use seen |
| 111908 18.5-19.0; 110818 48.5-55.5 | Weapon bar / item bar is not the A menu | AIM #13 | See section 3 |
| 110522 4.5-20.5 | Hold A near a crate, highlight unreadable, then the climb | MENU #1 | COVERED, whether INTERACT = climb is unresolved |

## 7. Vision modes

| clip @ s | movement / action | audit row | note |
| --- | --- | --- | --- |
| 112542 1-3, 12.5-13.5, 19.5-20 | Thermal vision (heat colours, purple background) | MISSING | No vision audit file exists. Measure 112542 1.5-2.0 |
| 112542 3.5-5.5, 14-15.5, 20.5 | EMF vision (dark blue, bright lines on electrical objects) | MISSING | Measure 112542 4.0 |
| 112542 6-7.5, 16-17, 21-21.8; 111823 0.5 on; all other clips | Night vision (green, lamp bloom, white-out in bright rooms) | MISSING | Measure 112542 7.0; white-out in 112135 9-10, 111731 all, 112542 6.0 |
| 112542 0-0.5, 8-12, 17.5-19; 111823 0-0.5 | Normal vision, dark, no goggle | MISSING | Measure 112542 9.0 |
| 112542 (whole) | Vision cycle order normal, thermal, EMF, night, normal, about 2.5 s each, HUD unchanged | MISSING | Belongs a new AUDIT-VISION |
| 111823 0.5-1.5; 112542 2.5, 19.5 | Goggle touch animation on a vision switch | MISSING | See section 1 |

## 8. Other animations seen with no audit row

| clip @ s | movement / action | audit row | note |
| --- | --- | --- | --- |
| 111953 3.0-8.5 | Enemies step into a doorway and shoot back, PC is hit and the mission fails | MISSING | AI and mission-fail. No AUDIT-AI file. Out of the six files |
| 111731 0-0.5 | PC subtitle line on screen | MISSING | Story text, not an audit item. Ignore |
| 111823 10.5 | Mission objective box bottom right | MISSING | HUD. Not an audit item |

---

## MISSING from the audit

Each item: what, best clip and time to measure, area file it belongs in.

1. Vision modes (thermal, EMF, night vision, normal-vision dark room, cycle timing, white-out). 112542 1.5-2.0, 4.0, 7.0, 9.0 for looks; 112542 0-21.8 for the cycle times; 112135 9-10 for white-out. New AUDIT-VISION (no current file fits).
2. Goggle-touch animation on a vision switch (hand to head). 111823 0.5-1.5 (night vision on at 0.5) and 112542 19.5. AUDIT-LOCOMOTION (or the vision file).
3. Noise / stance HUD meter (segments fill at the faster speeds). 110117 4.5, 10.5, 13-14, 26. AUDIT-LOCOMOTION (HUD).
4. Mount ladder from the bottom and from the top, plus top-out from a descent. 112102 1.0-2.5 (bottom), 16.5-17.5 (top), 20.5-22 (descent end). AUDIT-TRAVERSAL.
5. Ladder descent rate and pose. 112102 17.5-20.5. AUDIT-TRAVERSAL.
6. Vertical shaft descent through the floor trap (arms spread, hands on the shaft sides). 111234 6.0-10.0. AUDIT-TRAVERSAL (camera too: AUDIT-CAMERA).
7. Crawl space and duct: entry, exit, corner, and the all-fours cycle pose (not only the camera). 110714 0-2 (entry), 6-13 (cycle), 13.5-16 (exit); 111234 22-23.5 (corner), 47-48.5 (exit). AUDIT-TRAVERSAL.
8. Jump between crates with arms spread (gap jump, E3). 110522 9.0-10.0. AUDIT-TRAVERSAL.
9. Swing out on a rappel when a cable crosses; and a rappel restart from a mid-wall ledge. 111731 33.0-35.0 and 29.0-29.5. AUDIT-TRAVERSAL.
10. Hang pose and idle sway (static, not the shimmy). 110522 44-51, 110616 1.5-3.5. AUDIT-TRAVERSAL.
11. Crouched or stoop move on a lower platform beside a rail, and the get-onto-the-rail move. 111424 7.5-10.5. AUDIT-TRAVERSAL.
12. Counter-top and ledge-top moves: hand on the counter, crouch or drop at the end, sit-and-step along a crate top. 110522 24-29, 36-42. AUDIT-TRAVERSAL.
13. Muzzle flash, smoke and the ammo counter on fire. 111953 0.5, 3-4, 5.5-6.5 (30 fps sheets). AUDIT-AIM.
14. Weapon bar UI (5 icons) and item bar UI (4 slots, name, mouse scroll, grenades and rifle attachments as entries). 111908 18.5-19.0 and 110818 49.5-54.0. AUDIT-AIM (or the gadget wheel work).
15. Crouched stop and the slow-into-crouch from a crouch-run. 111823 14.5-15.5. AUDIT-LOCOMOTION.
16. Hand on the wall during a crouch-run; step around an obstacle on the floor. 111823 17.0; 110818 37.0-37.5. AUDIT-LOCOMOTION (minor).
17. Goggle glow lights on a front view (visual). 105509 31-45. AUDIT-LOCOMOTION or Character Build (minor).
18. Shaft, floor-trap and door cameras: top-down trap camera, shaft camera, door crack camera step. 111234 6.5-9.5; 110818 0-2; 110818 25-28. AUDIT-CAMERA.
19. Optic cable as a remote view through a floor trap (fish-eye, enemies seen below). 110818 2.5-7.0. AUDIT-WALLS (or the gadget file).
20. Stand-back after crouching at a door (post optic cable). 112135 5.5-6.0. AUDIT-WALLS.
21. What SWITCH OBJECT does (no animation known). 110818 33-61 (menu only); 110828 3-5.5. AUDIT-ACTIONMENU.
22. Enemy shoot-back and the mission-fail result from the PC being hit. 111953 3-8.5. No audit file (AI / mission); belongs a future AUDIT-AI.

Partial rows that need an edit rather than a new item: LOC #9 (add a crouched stop), CAM #12 (crouched poster-wall camera), AIM #9/#12 (turn while already aimed), WALLS #13 and #22 (112428 takedown type unknown), TRAV #16 (add the crawl cycle), TRAV #17 (add the deploy pose over a hatch), TRAV #22 (add the counter-top hands).

## Counts

Table rows (grouped distinct moves): 153. COVERED or N/A: 103. PARTIAL: 24. MISSING rows: 26, which merge into 22 items in the list above. 7 partial rows need an edit to an existing audit row.
