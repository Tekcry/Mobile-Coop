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
