# CT footage catalogue

Michael's Splinter Cell: Chaos Theory reference footage, labelled against `docs/research/ct-movement/CT-SHOTLIST.md` (codes A1-L1).
Built 2026-10-17 from contact sheets (1 frame per second, 4 per second for clips under 5 s). Times are seconds from clip start, read off 1 s tiles, so edges are +-1 s: frame-step the clip before measuring.

Where things are (local only, `pc/` is never committed):
- Clips: `pc/ct-work/clips/clip_13570_20261017_HHMMSS.mp4` (HEVC 2420x1668, ~55-60 fps, time in name is UTC). Below, clips are named by `HHMMSS` only.
- Screenshots: `pc/ct-ref/2026101714xxxx_1.jpg` and `2026101716xxxx_1.jpg` (local time UTC+11). `pc/ct-ref/13570_*.png` are lossless duplicates of the 16xxxx jpgs (161703-161947, 164437); prefer the png for measuring.
- Contact sheets: `pc/ct-work/sheets/<clip>.jpg` (timestamp burned into each tile), screenshot montages `sheets/shots_A.jpg`, `sheets/shots_B.jpg`.

General notes for anyone measuring:
- Nearly all footage is in night vision (green), on two test levels: a hotel corridor with a door and a marble-wall hallway (A-G), a hotel floor (H, I, K), outdoor yards and alleys (J).
- The CT camera follows the hero, so "side view" clips track him: measure speed against the background (wall seams, the checkerboard floor tiles, the door ~2 m tall), not screen motion.
- The PC CT camera has no free side lock: Michael orbited it by hand, so the angle drifts inside most clips.
- Michael's notes (checklist): rifle out exists only while aiming over the shoulder (A2, A3, B3, C6); the slowest stick speed walks backwards without turning, anything faster turns round 180 deg (D2); no aiming in cover, on a wall or over a low wall (G6, G8, G9).
- Weapon in hand at idle: none visible (the HUD shows the rifle or pistol selected, but the hero is empty-handed unless aiming).

## A. Standing still and posture

| code | file(s) | time range | view | notes | usable |
| --- | --- | --- | --- | --- | --- |
| A1 | 20261017145526_1.jpg | still | side, low | standing, weapon away; cleanest side profile | yes |
| A1 | 20261017145524_1.jpg | still | front | standing, weapon away | yes |
| A1 | 20261017145515_1.jpg, 145529, 145533, 145538, 145519 | still | 3/4 high side, behind, front-high, far side, top-down | standing, weapon away; extra angles | yes |
| A1 | 20261017143430_1.jpg | still | behind, outdoors | normal vision, very dark, launcher selected; test shot before the session | no |
| A1 | 035847 | 0-24 s, 33-35, 39-41 | camera orbits round the standing hero (front, high, side, behind) | weapon away; the hero repositions 24-31 s | partial (camera moves) |
| A2 | 20261017145602_1.jpg (left shoulder), 145605 (right shoulder) | still | over-the-shoulder aim | rifle out = aiming only (Michael); no side or front still possible | partial |
| A3 | 20261017145628_1.jpg (left), 145631 (right) | still | over-the-shoulder aim | pistol aimed; no side still possible | partial |
| A4 | 20261017145708_1.jpg, 145726, 145730 | still | side (both sides) | crouched, weapon away; best side profiles | yes |
| A4 | 20261017145718_1.jpg, 145721 | still | front / front-low | crouched | yes |
| A4 | 20261017145701_1.jpg, 145704, 145733, 145736 | still | behind, high side | crouched; 145736 pistol selected | yes |
| A5 | - | - | - | marked cant (rifle out only while aiming) | no (missing) |
| A6 | 043832 | 0-13 s | high side 3/4, fixed | idle breathing, standing, weapon away; dark, camera above | yes |
| A6 | 043858 | 3-12 s (walks in 0-3) | high side 3/4, fixed | idle, same spot | yes |
| A6 | 043841 | 0-1.6 s | behind | walking away; too short | no |
| (other) | 034747, 034803 | 0-2 s, 0-3 s | side, then camera swings behind | grabbed guard held as shield, pistol out (interrogate prompt); belongs to I6, mis-mapped to A1 | partial |

## B. Speeds

| code | file(s) | time range | view | notes | usable |
| --- | --- | --- | --- | --- | --- |
| B1 | 050259 | 0-11 s walk slow to fast, 12-14 turn at door, 15-17 run back, 18-20 camera near | side (tracking) | standing, weapon away; speed steps continuous | yes |
| B2 | 050330 | 0-9 s crouch walk slow to fast, 10-12 at door, 13-18 crouch run back | side (tracking) | crouched; ticked with B1, same session | yes |
| B3 | - | - | - | cant: rifle out is aiming over shoulder only | no (missing) |
| B4 | 050541 | 1-45 s aim walk forward / strafe / back; 46-58 shoulder swaps and lowering | over-the-shoulder aim | legs mostly out of frame; speed only from background | partial |

## C. Starting and stopping

| code | file(s) | time range | view | notes | usable |
| --- | --- | --- | --- | --- | --- |
| C1 / C2 | 050649 | run 0-4, turn at door 4-8, start 9, stop 10-12, walk 12-16, run 17-19, turn 19-21, walk / stop 22-27 | side (tracking) | standing; several starts and stops; C1 has no separate clip | yes |
| C2 | 050718 | 0-11 s | side (tracking) | slow walk; the stop is not obvious at 1 fps, frame-step | partial |
| C3 / C4 | 050827 | walk 0-9, full-speed burst 10, stop 11-13, walk 14-17, burst 18, walk 19-21, turn 22, walk 23-26, burst 27, stand 28-31, burst 32, stand 33-35 | side (tracking) | middle and full speed starts / stops; C4 has no separate clip | yes |
| C5 | 050933 | crouch walk 0-6, turn 6-7, crouch walk / run 7-19, door turn 20-25, crouch slow with stops 26-47 | side (tracking), high | crouched starts / stops | yes |
| C6 | - | - | - | cant: rifle out = aim view only | no (missing) |

## D. Turning

| code | file(s) | time range | view | notes | usable |
| --- | --- | --- | --- | --- | --- |
| D1 | 051044 | 0-35 s | behind / low 3/4, fixed | slow stick circle, turn on the spot; front, side and back of the hero all shown | yes |
| D2 / D3 | 051250 | 0-28 s | top-down | flick behind and fast spins; slowest speed walks backwards, faster turns 180 (Michael); D3 has no separate clip | yes |
| D4 | 051401 | 0-10 s | behind, high | walking slowly, curves left then right | yes |
| D4 / D5 | 051339 | slow curves 0-16, fast turns and reversals 17-34 | top-down | good for foot placement in turns | yes |
| D5 | 051421 | 0-13 s | behind, high | full-speed 90 deg turn and reversal | yes |
| D6 | 051501 | slow 0-16, fast 17-28 | top-down | crouched turn on the spot | yes |
| D7 | 051543 | aim and turn 1-14, aim pitched at floor 15-30, back 31-32 | over-the-shoulder aim | rifle aimed while turning with the camera | yes |

## E. Crouch, roll, jump, fall

| code | file(s) | time range | view | notes | usable |
| --- | --- | --- | --- | --- | --- |
| E1 | 053800 | stand 0, crouch 1-3, stand 4-7, crouch walk 8-9, stand walk 10-11, crouch 12-13, stand 14-15 | side (tracking) | stand-crouch both still and moving | yes |
| E2 | 053816 | run 0-1, roll 2-4, recover 5 | side | roll from full speed, one only | yes |
| E3 | 053849 | standing jump ~1, walking jump ~5, run jump 12-13 | side (tracking) | frame-step to find takeoff / landing | yes |
| E4 | - | - | - | not attempted (no tick) | no (missing) |

## F. Camera

| code | file(s) | time range | view | notes | usable |
| --- | --- | --- | --- | --- | --- |
| F1 | 051606 | 0-8 s | behind, high | walk forward then slow / stop; the 3 s settle is barely in frame | partial |
| F1 / F2 | 051636 | camera swung left / right while walking 0-10, walk and stand from behind with look-around 11-22 | behind, orbiting | shows whether the camera swings by itself | yes |
| F1 (extra) | 053525 | 0-36 s | behind | long walk from behind through rooms; good default-camera framing reference | yes |
| F3 | 051709 | idle 0, raise 1-2, aim 2-7, lower 8 | behind, then over-shoulder | rifle, 3 m from a door | yes |
| F3 | 20261017161703_1.jpg, 161706, 161712, 161715 (+ png duplicates) | still | over-shoulder aim, left | rifle aim stills at the door | yes |
| F4 | 051739 | raise 0.25-0.75, aim 0.75-2.25, lower 2.5-3.4 | behind, then over-shoulder | pistol | yes |
| F4 | 051747 | single frame | over-shoulder aim | 0.03 s clip, effectively a still | yes |
| F4 | 20261017161743_1.jpg (+ png) | still | over-shoulder aim | pistol aim still | yes |
| F5 | 051812 | pistol: aim left 1, switch right 2-3, back left 4-5, lower 6; weapon swap 7-10; rifle: aim 11, right 12-13, back 14, lower 15 | over-shoulder aim | shoulder switch both weapons | yes |
| F5 (extra) | 050541 | 46-58 s | over-shoulder aim | more rifle shoulder swaps | yes |
| F6 | - | - | - | skipped | no (missing) |
| F7 | - | - | - | ticked done but no crouched aim still or clip found | no (missing) |

## G. Back to wall

| code | file(s) | time range | view | notes | usable |
| --- | --- | --- | --- | --- | --- |
| G1 | 20261017161921_1.jpg, 161923, 161926, 161932, 161940 (+ png) | still | front / front-high (camera between the hero and the room), one near the door frame | standing on wall | yes |
| G2 | 20261017161937_1.jpg, 161944, 161947 (+ png) | still | front-side | crouched on wall | yes |
| G1 / G3 / G4 / G5 | 051917 | approach 0-4, on wall front view 2-10, step off 9-12, standing slide 13-20, wall end at door frame (corner, peek) 21-28, crouched slide 29-37, stand 38-41 | front (camera faces the wall), drifts | the CT camera does not stay behind on the wall | yes |
| G3 / G4 / G5 | 052021 | standing slide 0-8 with corner at 3-5, crouched slide 9-16 with corner 13-16 | front-side | slide speeds and corner stop / peek | yes |
| G5 | - | - | - | no STILL of the camera while peeking | partial |
| G6 / G7 | 052059 | crouched on wall 0, aim attempt 1-5 (camera goes over-shoulder, the hero leaves the wall), standing on wall 6-11, leave 12-13, again 14-19 | front, then over-shoulder | no aim on the wall (Michael) | yes |
| G8 / G9 | 052206 | crouched along a waist-high counter 0-20, standing walk along it and at its end 21-37 | side (tracking) | cant: no aiming in cover; still useful for low-cover crouch-walk | partial |

## H. Doors

| code | file(s) | time range | view | notes | usable |
| --- | --- | --- | --- | --- | --- |
| H1 | 052349 | approach + menu 0-5, stealth open 6-8, camera in door frame 9-11, open 12-17, close 18-20 | behind | slow / stealth open and close | yes |
| H2 | 052752 | 0-12 s | behind, high | open at normal speed, walk through, close | yes |
| H3 | 052832 | 0-19 s | behind | a guard walks to a door and through it; not clearly "finds an open door" | partial |
| H4 | 053114 | menu "break lock" 1, crouched break 2-5, door opens 5-6 | high side | lock break, no bash, no guard | partial (marked skip) |
| H4 | 052901 | pause 0, door 1-2, thermal through door 4-7 and 10-15, dark 16-17 | behind / thermal | attempt; no bash recorded | no |
| H5 | 052952 | door 0-12, optic cable view 13-16 and 21-23 | high behind, then cable view | | yes |
| H6 | 053049 | lockpick view 12-24 | lockpick close-up | 0-8 body carry (I7), 25-29 dark, 30-34 lit storeroom in normal vision (good lit-model reference) | yes |

## I. Close combat

| code | file(s) | time range | view | notes | usable |
| --- | --- | --- | --- | --- | --- |
| I1 | 052527 | strike 2-3, guard down 4-5 | side | non-lethal strike on a guard at a door; best side view of a strike | yes |
| I1 / I6 | 052441 | guard walks 0-6, save menu 7-11, approach behind 12-16, grab 16-17, hold / walk with guard 18-29, 30-32 after | behind / high | grab from behind and walk | yes |
| I2 / I3 | 052502 | approach 0-1, strike 2-3, guard down 4-6 | behind | guard facing the hero | yes |
| I2 / I3 | 054824 | strike 0-2, guard down, crouch 3-4 | side-behind, alley level | short | partial |
| I1 / I2 | 055600 | 0-3.5 s | behind-side, alley by a car | strike / takedown | partial |
| I4 | - | - | - | ticked done, no clip found (strike with no guard) | no (missing) |
| I5 | - | - | - | ticked done, no lethal attack clip found | no (missing) |
| I6 | 052607 | grab at door 2-3, interrogate hold 4-8, knock out 9-10, carry body 11-20 | behind, then top-down | | yes |
| I6 (extra) | 034747, 034803 | 0-2 s, 0-3 s | side, behind | human shield with pistol | partial |
| I7 | 052704 | carry 0-24 (through doors to stairwell), drop / tip over railing 26-40 | high behind / top-down | marked skip but recorded | yes |
| I7 | 053049 | carry 0-6, drop 7-8 | top-down | | yes |
| I8 | - | - | - | skipped | no (missing) |

## J. Traversal

| code | file(s) | time range | view | notes | usable |
| --- | --- | --- | --- | --- | --- |
| J1 / J2 | 054021 | climb onto counter 4-6, drop down 7-10, climb / hang at edge 13-15, hang 19-21, pull up 22 | behind, high | mantle and hang | yes |
| J2 | 054103 | mantle 2-4, drop 5-7, hang and shimmy 8-20, drop 21-22 | behind | | yes |
| J2 / J4 | 055649 | pipe climb up 0-5, camera clips into the wall 5-19, hand-over-hand along a ledge / pipe 20-38, drop 39-41 | behind / below | 5-19 unusable | partial |
| J1 / J2 | 054802 | hang from fire escape 3-5, pull up 6-9 | top-down | | partial |
| J3 | 054502 | ladder up 3-17, down 17-21 | above / behind | | yes |
| J3 | 054411 | drainpipe up 2-12, drop 13-16, up again 17-26 | behind / side | | yes |
| J3 | 055717 | fire-escape ladder down 0-6, land 7 | high side | | yes |
| J4 | 054411 | 27-32 s | behind | hanging hand-over-hand from a horizontal pipe, then drop 33-34; no legs-up or upside-down aim | partial |
| J5 | 20261017164437_1.jpg (+ png) | still | behind | The hero in a narrow corridor (split-jump spot); no split jump done (skipped) | no |
| J6 | 054702 | 0-14, pause 15-20, 21-30 | behind, alley | wall jump attempt, not achieved (Michael: couldn't do it) | no |
| J7 | - | - | - | skipped | no (missing) |
| J8 | - | - | - | not attempted | no (missing) |
| J9 | 054411 | 35-52 s | behind, then inside the vent | into a vent and crawling | yes |
| J10 | - | - | - | skipped | no (missing) |
| (other) | 054237 | walk 0-8, rifle aim and fire 9-13 | behind, outdoor courtyard | not a J3 clip; extra walk-and-aim reference | partial |

## K. Vision modes

| code | file(s) | time range | view | notes | usable |
| --- | --- | --- | --- | --- | --- |
| K1 | 053251 | guard close / walking 4-17, guard far (~15 m) and static 18-44 | behind, thermal | no separate stills; grab frames from the clip | yes |
| K1 | 053200, 053323 | 0-1 s, 0-2 s | thermal | The hero only; 053200 then pause menu | partial |
| K2 | 053437 | The hero walking in thermal 2-35, window / lamps hot 36-44 | behind, thermal | no wall-with-person-behind shot | partial |
| K2 | 052901 | 4-15 s | thermal through a door | guard visible through the door | partial |
| K3 | 053525 | 0-36 s | behind, night vision | NV walk through rooms; no dedicated still | yes |
| K3 / K4 | 054201 | thermal 0-1.5, EMF 1.75-2.25, NV 2.5-3, normal 3.25 | behind | vision-mode cycle | partial |
| K4 | 053617 | 0-36 s (devices visible 32-36) | EMF | almost blank blue frame | partial |
| (other) | 053709 | dark 0-8, room lit by window 9-25, dark 26-31, lit courtyard with lamps 32-38 | behind, normal vision | best light-and-shadow reference without goggles | yes |

## L. Co-op

| code | file(s) | time range | view | notes | usable |
| --- | --- | --- | --- | --- | --- |
| L1 | - | - | - | skipped (no second player) | no (missing) |

## Z. Game files

| code | file(s) | time range | view | notes | usable |
| --- | --- | --- | --- | --- | --- |
| Z1 | - | - | - | no `pc/ct-ref/ini/` folder found | no (missing) |

## Coverage

Good (usable footage for the item):
- A1, A4, A6; B1, B2; C1-C5 (C1 and C4 inside 050649 / 050827); D1-D7 (D3 inside 051250); E1, E2, E3; F1, F2, F3, F4, F5; G1, G2, G3, G4, G7; H1, H2, H5, H6; I1, I2, I3, I6, I7; J1, J2, J3, J9; K1, K3.

Partial:
- A2, A3 (aim view only, by design of CT); B4 (aim view, legs out of frame); G5 (peek in video, no peek still); G6, G8, G9 (CT has no aiming in cover, the clips show that); H3, H4 (break lock, no bash); J4 (hand-hang only); K2, K4.
- Camera moved: A1 video 035847 (orbit), G clips (camera faces the wall, drifts), all B-E "side" clips track the hero.
- Too dark: 043832 / 043858 (A6, usable but dim), 053709 0-8 s and 26-31 s, 053617 (EMF).

Missing:
- A5, B3, C6 (no rifle-out-not-aiming state in CT); E4; F6, F7; I4, I5 (ticked, no clip found); I8; J5, J6, J7, J8, J10; L1; Z1 (ini files).
