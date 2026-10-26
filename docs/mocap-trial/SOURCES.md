# mocap-trial - sources

Source: CMU Graphics Lab Motion Capture Database, http://mocap.cs.cmu.edu/ (ASF skeleton + AMC motion, 120 fps).
Licence (home page): "This data is free for use in research projects. You may include this data in commercially-sold
products, but you may not resell this data directly, even in converted form." Acknowledgement text the site asks for:
"The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF
EIA-0196217."

Raw files go to `.mocap-cache/` (gitignored). URL pattern: http://mocap.cs.cmu.edu/subjects/<S>/<S>.asf and
http://mocap.cs.cmu.edu/subjects/<S>/<S>_<NN>.amc.

## Candidate takes (from the site's locomotion lists; used = marked after the retarget)
| Take | Description | For |
| --- | --- | --- |
| 16_15, 16_16, 16_21, 16_22, 16_31, 16_32 | walk | walk loop |
| 16_35, 16_36, 16_45, 16_46, 16_56 | run/jog | jog loop |
| 16_55 | run | run loop |
| 16_17, 16_18 / 16_19, 16_20 | walk, 90-degree left / right turn | walk turn on the move |
| 16_41, 16_42 / 16_43, 16_44 | run/jog, 90-degree left / right turn | jog turn |
| 16_51, 16_52 / 16_53, 16_54 | run, 90-degree left / right turn | run turn |
| 16_08, 16_57 | run/jog, sudden stop | jog stop |
| 16_33, 16_34 | slow walk, stop | walk stop |
| 35_01, 35_02, 35_03 | walk | walk loop (second performer) |
| 35_17, 35_18, 35_19 | run/jog | jog loop (second performer) |
| 69_13, 69_14 | walk, turn in place (repeated) | turn in place |
Skeletons: 16.asf, 35.asf, 69.asf.

## Used (integration, 2026-10-22): in the game behind the switch (`src/anim/clips/mocap/`, converted, no raw data)
| Take | Seconds of the take | Clip | Slot |
| --- | --- | --- | --- |
| 16_15 (16.asf) | 0.525-1.675 (one cycle) | `walk.ts` | walk (the speed blend) |
| 16_36 (16.asf) | 0.3-1.092 (one cycle) | `jog.ts` | jog (the speed blend) |
| 16_46 (16.asf) | 0.158-0.85 (one cycle) | `run.ts` | run (the speed blend) |
| 16_18 (16.asf) | 1.692-4.05 | `turn_move_l.ts` | 90 deg turn left while walking (the right one plays mirrored when empty) |
| 16_19 (16.asf) | 1.242-3.408 | `turn_move_r.ts` | 90 deg turn right while walking |
| 16_31 (16.asf) | 0-2.183 | `start.ts` | start from standing (walking) |
| 16_34 (16.asf) | 0.458-2.883 | `stop.ts` | stop to standing (walking) |
| 69_13 (69.asf) | 15.5-19.058 (the first 90 deg of a walking turnaround) | `turn_in_place.ts` | 90 deg turn on the spot (the left one mirrored) |
| 136_09 (136.asf) | 4.233-5.508 (one R-strike cycle, 120 fps frames 508-661; scripts/mocap/m3.mjs) | `crouch_walk.ts` | (mocap-trial-2) the crouched sneak band's body (BRIEF A5, MT2-CROUCH.md) |
| 127_07 (127.asf) | 0.325-1.008 (one R-strike cycle, 120 fps frames 39-121, 0.683 s, 4.42 m/s performer, about 4.0 m/s at Wren's size; scripts/mocap/m3.mjs) | `sprint.ts` | (mocap-trial-2) the sprint band past the run (BRIEF A6, MT2-SPRINT.md) |

Emitted, not in the game yet (`build/mocap/clips/`, a later step): `extra/` 16_41 / 16_44 (jog 90 turns), 16_51 / 16_53
(run turns, performed at a jog, 16_53 cut at 68 deg), 69_14 (the left turn on the spot and both 180 turnarounds with
69_13), 16_57 (jog stop), 16_55 (run start from a walk); `alt/` 35_01 (walk, second performer), 16_35 (jog), 16_45
(run). Downloaded, not used: 16_16, 16_17, 16_20-16_22, 16_32, 16_33, 16_42, 16_43, 16_52, 16_54, 16_56, 16_08, 35_02,
35_03, 35_17-35_19.

## Weapons (later step, not downloaded)
To list from the site's search (gun / rifle / aim / carry) when the weapon step starts.

## Downloaded 2026-10-22 ~22:25 for the gaps (standing OK), not yet used
104.asf + 104_06, 104_08 (StartJog), 104_53, 104_54, 104_55 (StartRun), 104_09, 104_10 (JogStop); 69_16, 69_17, 69_18
(turn in place); 127.asf + 127_15, 127_16 (Run Turn Left / Right); 143.asf + 143_03 (Start to Run); 78.asf + 78_31
(Pivoting).

## Downloaded 2026-10-23 (M3), not yet used
Approval: BRIEF M3 (Michael ~00:20, "Yes, download them"). Found with the site's own search (sneak, crouch, sidestep,
side step, sideways, wall, peek, sprint, fast, dash, creep, shuffle, hide) and the subject pages of 139, 143, 127 and 9;
fetched one at a time from http://mocap.cs.cmu.edu/subjects/<S>/ (a 2 s pause between files). 21 takes + 2 new skeletons
(136.asf, 139.asf; 69.asf, 127.asf and 143.asf were already in the cache), 13.2 MB in all. Every take parses (asfamc.mjs
self-check OK). Analysis: TAKES.md "M3 takes".
| Take | Site description | Size KB | Category |
| --- | --- | --- | --- |
| 136_10 | Walk Crouched (subject 136 "Weird Walks") | 1053 | crouch walk (runner-up; 136_09, 890 KB, is used: "Used" above) |
| 139_29, 139_32, 139_34 | Sneaking (subject 139 "Action Walks, sneaking, wounded, looking around") | 1638, 1478, 878 | sneak |
| 139_11 | Run To Sneak | 248 | sneak (from a run) |
| 127_06, 127_07, 127_08 | Run (subject 127 "Action Adventure Obstacles, running, jumping, ducking, rolling") | 135, 113, 109 | sprint (127_07 is used: "Used" above) |
| 127_03 | Run (from standing) | 261 | sprint start |
| 127_04 | Walk to Run | 350 | sprint start (from a walk) |
| 143_42 | Run (subject 143 "General Subject Capture") | 418 | sprint (second performer) |
| 143_40 | Walk Sideways | 751 | strafe (walk, left then right; crosses the feet) |
| 69_56 | walk sideways and turn (opposite direction) (subject 69 "walking") | 600 | strafe right; standing wall side-step right |
| 69_59 | walk sideways and turn | 546 | strafe left; standing wall side-step left |
| 127_13, 127_14 | Run Side Step Left / Right | 144, 118 | fetched for a run strafe; a forward run with a sidestep dodge (TAKES.md) |
| 139_14, 139_15 | Sneak Sideways | 773, 842 | crouched back-to-wall side-step |
| 139_01, 139_04 | Looking Around | 849, 689 | back-to-wall peek (stand-in) |

Not on the site: no "sprint" (the fastest named runs stand in), no back-to-wall, wall slide or corner peek ("wall" and
"peek" only hit a wall smash and peekaboo games: the sideways sneak and "Looking Around" stand in), no jogging strafe.
Skipped: subject 77 "careful creeping" / "creeping walk" (captured at 60 fps; the pipeline reads 120 fps), 120 "Mickey
sneaky walk" (cartoon style), 142_22 "Sneaky" (stylized walks), 83 sidesteps (single steps on and off a ledge).

## Downloaded 2026-10-26 (piano-knife S2), not used
The bounded CMU 18-23 check for a two-person grab-from-behind take (piano-knife S2-BRIEF item 6, BRIEF A14; G268).
Subject pages read: 18 + 19 ("human interaction and communication"), 20 + 21 ("human interaction - at play,
formations"), 22 + 23 ("human interaction"); the pairs are subjects A and B of one capture with matching take numbers
(confirmed on the site; a shared lab frame confirmed: 22_01's hands meet within 1 cm). Shortlist: the 6 takes whose
description names a pull or an attack between the two (none names a grab, choke, drag, fight or struggle); fetched one
file at a time from http://mocap.cs.cmu.edu/subjects/<S>/ (a 2 s pause between files). 18.asf, 19.asf, 22.asf, 23.asf
(7 KB each) + 12 AMC files. Every take parses (asfamc.mjs self-check OK). None fits a grab from behind (no take has
one performer behind the other within 0.7 m); verdict table in the piano-knife S2 report.
| Take | Site description | Size KB (A / B) |
| --- | --- | --- |
| 18_03 + 19_03 | A pulls B; B resists | 460 / 460 |
| 18_04 + 19_04 | A pulls B; B resists | 315 / 310 |
| 18_05 + 19_05 | A pulls B by the elbow; B resists | 340 / 338 |
| 18_06 + 19_06 | A pulls B by the elbow; B resists | 315 / 315 |
| 22_01 + 23_01 | B sits; A pulls up B | 608 / 608 |
| 22_20 + 23_20 | violence - A picks up high stool, threatens to strike B | 291 / 292 |
