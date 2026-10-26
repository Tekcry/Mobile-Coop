# mixamo-retarget - converted clips
Owner: Player Build. Status: generated (sections between the markers are rewritten by their emitters; M3 keyed, M4 channel).

<!-- mocap:mixamo-keyed -->
## Keyed clips (M3, scripts/mocap/mixamoEmit.mjs)

Generated; rerun `node --import ./scripts/operators/ts-resolve.mjs scripts/mocap/mixamoEmit.mjs` (the M1 dumps in
`build/mocap/mixamo/raw/`). Each clip is `src/anim/clips/mixamo/<slug>.ts` (`mocap_<slug>`), listed in the Anim Studio's
"motion capture" group by its row in `src/anim/mocapSources.ts`. Every clip built through the game's `keyedClip`.

Columns: kind as written; the 30 fps frames used of the file ("dup last": the last frame repeats the first, so the loop
is the whole clip and the duplicate closes it); clip frames and seconds (a gait: the cycle; a loop: its period; a
one-shot: the trimmed span); speed m/s (Wren); stride per cycle and the game/clip stride scale over the walk band
(1.4-2.1 m/s; the crouched and carry walks play slower, so read the scale as relative); the loop seam before -> the
closing step after (cm, typical step); foot slide median/max before -> after the de-slide (cm); leg reach short (cm, the
IK could not reach a locked foot); retarget direction error (deg, worst segment); the height offset putting the flat
ankle at Wren's (cm); the lowest pelvis (cm from rest, a deep crouch / kneel / prone shows here).

| Slug | Kind | Frames used / file | Clip frames | Seconds | Speed | Stride, scale | Seam | Slide cm | Reach short | Dir err | Height off | Lowest pelvis |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| crouched_walking | gait | 0-34 / 35 (dup last) | 48 | 1.133 | 1.66 | 1.88 m, x0.62-0.77 | 0 cm / 0.1 deg (knL) -> 1 (typ 1.5) | 0.9/1.1 -> 1.1/1.5 | 0 | 0 | -1.8 | -24.2 |
| carry_body_walking | gait | 0-86 / 87 (dup last) | 48 | 2.867 | 0.91 | 2.62 m, x0.44-0.55 | 0 cm / 0 deg (shR) -> 0.7 (typ 0.9) | 1.2/1.6 -> 1.2/1.4 | 0.1 | 0 | -1.5 | -8.4 |
| crawling_prone | gait | 0-70 / 71 (dup last) | 48 | 2.333 | 0.23 | 0.54 m, x2.16-2.68 | 0 cm / 0 deg (wrR) -> 0.6 (typ 0.5) | 9.2/13.2 -> 9.2/20.7 | 9.9 | 0 | -9.6 | -85.6 |
| standing_idle | loop | 0-180 / 181 (dup last) | 120 | 6 | 0 | - | 0 cm / 0.1 deg (neck) -> 0 (typ 0) | 0/0 -> 0/0 | 0 | 0 | -1.5 | -1.2 |
| carry_body_idle | loop | 0-300 / 301 (dup last) | 200 | 10 | 0 | - | 0 cm / 0 deg () -> 0 (typ 0) | 0/0 -> 0/0 | 0 | 0 | -1.4 | -5.8 |
| crouch_to_stand | timed | 11-38 / 78 | 37 | 0.9 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -11.4 | -56.2 |
| stand_to_crouch | timed | 29-45 / 123 | 23 | 0.55 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -3.9 | -44.4 |
| elbow_strike | timed | 0-50 / 51 (dup last) | 68 | 1.667 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.7 | -12.3 |
| cross_punch | timed | 0-26 / 27 (dup last) | 36 | 0.867 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1 | -13.2 |
| kneel_down | timed | 8-72 / 84 | 86 | 2.117 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.5 | -57.6 |
| kneeling_pull_up | timed | 2-136 / 143 (dup last) | 180 | 4.483 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -10.4 | -58.8 |
| pulling_up_to_a_ledge | timed | 0-115 / 116 | 154 | 3.817 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -11.2 | -0.7 |
| lifting_heavy_object | timed | 6-295 / 346 (dup last) | 386 | 9.617 | - | - | - | 3.5/4 -> 6.3/9.3 | 0 | 0 | -3.1 | -50.9 |
| walking | gait | 0-31 / 32 (dup last) | 48 | 1.033 | 1.67 | 1.73 m, x0.67-0.83 | 0 cm / 0 deg (hipR) -> 1.1 (typ 1.8) | 1.3/1.4 -> 1.1/1.5 | 0 | 0 | -1.9 | -9.2 |
| jogging | gait | 0-26 / 78 (dup last) | 48 | 0.85 | 1.8 | 1.53 m, x1.16-1.42 | 0.5 cm / 28.9 deg (wrR) -> 1.3 (typ 1.9) | 4.4/7.5 -> 1/1.3 | 1.7 | 0 | -2.6 | -9.8 |
| running | gait | 0-19 / 20 (dup last) | 48 | 0.633 | 5.55 | 3.51 m, x0.72-0.74 | 0 cm / 0 deg (toeR) -> 5 (typ 4.4) | 1.6/1.6 -> 1.1/1.3 | 1.1 | 0 | -2.7 | -8.4 |
| fast_run | gait | 0-16 / 17 (dup last) | 48 | 0.533 | 5.3 | 2.83 m, x0.9-0.92 | 0 cm / 0 deg () -> 7.1 (typ 5.9) | 1.7/2.1 -> 0.7/0.8 | 1.8 | 0 | -2.5 | -10 |
| start_walking | timed | 3-44 / 45 | 56 | 1.383 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -2.2 | -9.9 |
| stop_walking | timed | 0-68 / 81 | 91 | 2.25 | - | - | - | 2.8/2.8 -> 1.4/1.4 | 0 | 0 | -1.8 | -9.3 |
| run_to_stop | timed | 0-27 / 28 | 37 | 0.9 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.3 | -26.9 |
| right_turn | turn | 0-28 / 29 (dup last) | 31 | 0.767 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.6 | -2 |
| left_turn | turn | 0-28 / 29 (dup last) | 31 | 0.767 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.6 | -2.1 |
| walking_left_turn | turn | 0-36 / 37 | 44 | 1.1 | - | - | - | 1.4/1.4 -> 1.2/1.2 | 0.4 | 0 | -2.6 | -8.6 |
| walking_left_turn_mirror | turn | 0-36 / 37 | 43 | 1.083 | - | - | - | 1.2/1.2 -> 1.2/1.2 | 0.5 | 0 | -2.4 | -8.8 |
| left_strafe_walking | gait | 0-31 / 32 (dup last) | 48 | 1.033 | 1.62 | 1.68 m, x0.2-0.44 | 0 cm / 0 deg (knL) -> 1.2 (typ 1.8) | 1.4/1.4 -> 0.7/0.7 | 0 | 0 | -1.4 | -11.2 |
| right_strafe_walking | gait | 0-31 / 32 (dup last) | 48 | 1.033 | 1.62 | 1.68 m, x0.2-0.44 | 0 cm / 0 deg (hipL) -> 1.3 (typ 1.9) | 1.5/1.7 -> 0.8/1 | 0 | 0 | -1.4 | -11.3 |
| crouched_sneaking_left | gait | 0-38 / 39 (dup last) | 48 | 1.267 | 0.99 | 1.26 m, x0.26-0.59 | 0 cm / 0 deg (elR) -> 0.8 (typ 1.1) | 0.9/1.3 -> 2/2.6 | 0 | 0 | -1.1 | -27.4 |
| crouched_sneaking_right | gait | 0-33 / 34 (dup last) | 48 | 1.1 | 1.06 | 1.16 m, x0.29-0.64 | 0 cm / 0 deg (toeR) -> 0.9 (typ 1.1) | 2.6/3.5 -> 1.8/2.1 | 0 | 0 | -1.1 | -29 |
| walking_backwards | loop | 0-29 / 30 (dup last) | 19 | 0.967 | 0 | - | 126.3 cm / 0 deg (shL) -> 1 (typ 1.5) | 2.1/4.9 -> 0.3/0.9 | 0 | 0 | -5.9 | -12.1 |
| run_backwards | loop | 0-45 / 46 | 30 | 1.5 | 0 | - | 130.5 cm / 81.4 deg (knR) -> 4.6 (typ 1.5) | 0/5.7 -> 1.2/3.8 | 0 | 0 | -2.6 | -30.4 |
| pistol_idle | loop | 0-40 / 41 (dup last) | 27 | 1.333 | 0 | - | 0 cm / 0 deg () -> 0 (typ 0) | 0/0 -> 0/0 | 0 | 0 | -1.2 | -5.1 |
| pistol_walk | gait | 0-24 / 25 (dup last) | 48 | 0.8 | 2.51 | 2.01 m, x0.58-0.72 | 0 cm / 0 deg (shR) -> 1.7 (typ 2.1) | 2.1/2.6 -> 0.8/0.8 | 1.5 | 0 | -1.7 | -10 |
| pistol_run | gait | 0-15 / 16 (dup last) | 48 | 0.5 | 4.67 | 2.33 m, x0.76-0.94 | 0 cm / 0.3 deg (knR) -> 2.5 (typ 3.3) | 1.6/2.1 -> 1.4/2.1 | 0 | 0 | -3.2 | -10.2 |
| pistol_walk_backward | loop (gait fell back) | 0-31 / 32 (dup last) | 21 | 1.033 | 1.38 | - | 0 cm / 0 deg (anR) -> 0.9 (typ 1.3) | 1.2/1.3 -> 1.7/2.1 | 0 | 0 | -2.2 | -14.5 |
| pistol_strafe | loop (gait fell back) | 0-17 / 18 (dup last) | 15 | 0.567 | 2.12 | - | 0 cm / 0 deg () -> 1 (typ 1.9) | 1.4/1.6 -> 1.2/1.5 | 0 | 0 | -2.8 | -16.9 |
| pistol_strafe_2 | gait | 0-18 / 19 (dup last) | 48 | 0.6 | 2.38 | 1.43 m, x0.23-0.52 | 0 cm / 0 deg (wrR) -> 2 (typ 2) | 1.5/1.7 -> 0.7/0.8 | 0 | 0 | -1.4 | -19.4 |
| pistol_run_backward | loop (gait fell back) | 0-16 / 17 (dup last) | 15 | 0.533 | 3.24 | - | 0 cm / 0 deg (toeR) -> 2.4 (typ 2.4) | 1.7/2 -> 1.4/1.6 | 0 | 0 | -2.4 | -12.9 |
| pistol_walk_arc | gait | 0-22 / 23 (dup last) | 48 | 0.733 | 2.45 | 1.8 m, x0.65-0.8 | 0 cm / 24.3 deg (pelvis) -> 1.7 (typ 2.3) | 2.2/8.5 -> 1.1/2 | 1.4 | 0 | -2.2 | -9.1 |
| pistol_walk_arc_2 | gait | 0-23 / 24 (dup last) | 48 | 0.767 | 2.5 | 1.92 m, x0.61-0.75 | 0 cm / 31.7 deg (pelvis) -> 1.6 (typ 2.4) | 4/5.4 -> 0.7/0.9 | 0.6 | 0 | -1.6 | -11.4 |
| pistol_run_arc | loop (gait fell back) | 0-18 / 19 (dup last) | 15 | 0.6 | 3.36 | - | 0 cm / 45.1 deg (pelvis) -> 2.2 (typ 2.8) | 0/0 -> 0.7/0.7 | 0 | 0 | -2.8 | -20.9 |
| pistol_run_arc_2 | gait | 0-19 / 20 (dup last) | 48 | 0.633 | 3.19 | 2.02 m, x0.88-1.08 | 0 cm / 28.6 deg (pelvis) -> 2 (typ 2.6) | 1.2/1.5 -> 0.5/0.5 | 0 | 0 | -2.5 | -17.3 |
| pistol_walk_backward_arc | gait | 0-18 / 19 (dup last) | 48 | 0.6 | 1.72 | 1.03 m, x1.12-1.39 | 0 cm / 24.3 deg (pelvis) -> 1.6 (typ 1.6) | 6.6/8.1 -> 1.4/2.2 | 0 | 0 | -1.4 | -23 |
| pistol_walk_backward_arc_2 | gait | 0-18 / 19 (dup last) | 48 | 0.6 | 1.73 | 1.04 m, x1.12-1.39 | 0 cm / 19.4 deg (pelvis) -> 2.1 (typ 1.9) | 7/8.2 -> 1.8/2.5 | 0 | 0 | -2 | -22.5 |
| pistol_run_backward_arc | loop (gait fell back) | 0-15 / 16 (dup last) | 15 | 0.5 | 2.47 | - | 0 cm / 38.2 deg (pelvis) -> 2.6 (typ 2.3) | 2.5/2.5 -> 2.1/2.1 | 0 | 0 | -3.4 | -21.6 |
| pistol_run_backward_arc_2 | loop (gait fell back) | 0-15 / 16 (dup last) | 15 | 0.5 | 2.65 | - | 0 cm / 28.2 deg (pelvis) -> 2.7 (typ 2.1) | 1.9/2.4 -> 1/2.1 | 0 | 0 | -2.9 | -19.7 |
| pistol_kneeling_idle | loop | 0-114 / 115 (dup last) | 76 | 3.8 | 0 | - | 0 cm / 0 deg (toeR) -> 0 (typ 0) | 0/0 -> 0/0 | 0 | 0 | -6.2 | -51.4 |
| pistol_stand_to_kneel | timed | 0-25 / 30 | 34 | 0.817 | - | - | - | 0/0 -> 0/0 | 0 | 0 | 0.1 | -45.3 |
| pistol_kneel_to_stand | timed | 0-26 / 41 | 35 | 0.85 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -0.3 | -45.3 |
| pistol_jump | timed | 0-60 / 61 (dup last) | 81 | 2 | - | - | - | 0/0 -> 0/0 | 0.1 | 0 | -1.7 | -41.7 |
| pistol_jump_2 | timed | 0-24 / 25 (dup last) | 33 | 0.8 | - | - | - | 1.5/1.5 -> 1.8/1.8 | 0 | 0 | -2.4 | -16 |
| rifle_idle | loop | 0-61 / 62 (dup last) | 41 | 2.033 | 0 | - | 0 cm / 0.6 deg (shR) -> 0 (typ 0) | 0/0 -> 0/0 | 0 | 0 | -1.2 | -6.6 |
| rifle_idle_aiming | loop | 0-63 / 64 (dup last) | 42 | 2.1 | 0 | - | 0 cm / 0 deg (wrR) -> 0 (typ 0) | 0/0 -> 0/0 | 0 | 0 | -1.2 | -5.9 |
| rifle_walk_forward | gait | 0-30 / 31 | 48 | 1 | 1.81 | 1.81 m, x0.64-0.79 | 0 cm / 3 deg (elL) -> 1.2 (typ 1.7) | 1.1/1.3 -> 0.5/0.7 | 0 | 0 | -2.1 | -18.2 |
| rifle_run_forward | gait | 0-15 / 16 (dup last) | 48 | 0.5 | 4.54 | 2.27 m, x0.78-0.96 | 0 cm / 0 deg (chest) -> 3 (typ 3.2) | 1.4/1.6 -> 0.7/0.7 | 0 | 0 | -1.6 | -15.7 |
| rifle_sprint_forward | gait | 0-15 / 16 (dup last) | 48 | 0.5 | 6.8 | 3.4 m, x0.75-0.76 | 0 cm / 0 deg (elL) -> 5.2 (typ 4.6) | 0.8/1.1 -> 0.9/1.6 | 0 | 0 | -3.1 | -11.8 |
| rifle_walk_backward | loop (gait fell back) | 0-29 / 30 | 19 | 0.967 | 1.82 | - | 0.7 cm / 11.3 deg (hipL) -> 1.6 (typ 1.7) | 2.3/2.3 -> 3.7/5.8 | 0 | 0 | -0.9 | -17.9 |
| rifle_walk_left | loop (gait fell back) | 0-30 / 31 (dup last) | 20 | 1 | 1.81 | - | 0 cm / 0.1 deg (shL) -> 1.2 (typ 1.6) | 1.3/1.7 -> 1.4/2 | 0 | 0 | -1.5 | -20.4 |
| rifle_walk_right | gait | 0-30 / 31 (dup last) | 48 | 1 | 1.81 | 1.81 m, x0.18-0.41 | 0 cm / 0 deg (head) -> 1.1 (typ 1.6) | 1.4/1.7 -> 1.1/1.2 | 0 | 0 | -1.8 | -16.1 |
| rifle_walk_crouching_forward | gait | 0-30 / 31 (dup last) | 48 | 1 | 1.93 | 1.93 m, x0.6-0.75 | 0 cm / 0 deg (shR) -> 1.5 (typ 1.8) | 1.7/2.4 -> 0.8/1.1 | 0 | 0 | -2.3 | -28 |
| rifle_turn_90_left | turn | 0-30 / 31 (dup last) | 39 | 0.983 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.6 | -8.1 |
| rifle_turn_90_right | turn | 0-30 / 31 (dup last) | 37 | 0.933 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.8 | -7.8 |
| rifle_crouching_turn_90_left | turn | 0-38 / 39 (dup last) | 40 | 1 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -10.5 | -60.2 |
| rifle_crouching_turn_90_right | turn | 0-38 / 39 (dup last) | 48 | 1.2 | - | - | - | 2.9/2.9 -> 1.8/1.8 | 0 | 0 | -10.3 | -60.7 |
| rifle_idle_crouching | loop | 0-62 / 63 (dup last) | 41 | 2.067 | 0 | - | 0 cm / 0.3 deg (wrR) -> 0 (typ 0) | 0/0 -> 0/0 | 0 | 0 | -5.3 | -55.7 |
| rifle_idle_crouching_aiming | loop | 0-63 / 64 (dup last) | 42 | 2.1 | 0 | - | 0 cm / 0 deg (wrR) -> 0 (typ 0) | 0/0 -> 0/0 | 0 | 0 | -5.2 | -55.6 |
| rifle_walk_forward_left | gait | 0-30 / 31 (dup last) | 48 | 1 | 1.81 | 1.81 m, x0.18-0.41 | 0 cm / 0.9 deg (toeR) -> 1.3 (typ 1.7) | 1.1/1.6 -> 0.6/0.7 | 0 | 0 | -1.6 | -18 |
| rifle_walk_forward_right | gait | 0-30 / 31 (dup last) | 48 | 1 | 1.81 | 1.81 m, x0.64-0.79 | 0 cm / 0 deg (shL) -> 1.1 (typ 1.4) | 1.1/1.5 -> 1.2/1.5 | 0 | 0 | -2.2 | -17.8 |
| rifle_walk_backward_left | loop (gait fell back) | 0-30 / 31 | 20 | 1 | 1.81 | - | 0 cm / 4.2 deg (toeR) -> 0.9 (typ 1.6) | 1.9/1.9 -> 0.9/1 | 0 | 0 | -2 | -14.6 |
| rifle_walk_backward_right | loop (gait fell back) | 0-30 / 31 (dup last) | 20 | 1 | 1.81 | - | 0 cm / 0.9 deg (toeR) -> 1.3 (typ 1.7) | 1.2/1.8 -> 0.5/0.7 | 0 | 0 | -1.2 | -18.1 |
| rifle_walk_crouching_backward | loop (gait fell back) | 0-30 / 31 (dup last) | 20 | 1 | 1.93 | - | 0 cm / 0 deg (knR) -> 1.1 (typ 1.8) | 1/1 -> 0.6/0.7 | 0 | 0 | -1.3 | -28.4 |
| rifle_walk_crouching_left | loop (gait fell back) | 0-30 / 31 (dup last) | 20 | 1 | 1.93 | - | 0 cm / 0 deg (shL) -> 1 (typ 1.5) | 1.1/1.5 -> 0.9/1.1 | 0 | 0 | -1.1 | -26.5 |
| rifle_walk_crouching_right | gait | 0-30 / 31 (dup last) | 48 | 1 | 1.93 | 1.93 m, x0.17-0.39 | 0 cm / 0 deg (knR) -> 1 (typ 1.5) | 1.1/1.3 -> 0.8/1.1 | 0 | 0 | -1.2 | -27.4 |
| rifle_walk_crouching_forward_left | gait | 0-30 / 31 (dup last) | 48 | 1 | 1.93 | 1.93 m, x0.17-0.39 | 0 cm / 0.1 deg (elR) -> 1.3 (typ 1.8) | 0.9/0.9 -> 0.9/0.9 | 0 | 0 | -1.3 | -28.8 |
| rifle_walk_crouching_forward_right | gait | 0-30 / 31 (dup last) | 48 | 1 | 1.93 | 1.93 m, x0.6-0.75 | 0 cm / 0 deg (shR) -> 1.3 (typ 1.6) | 1.5/1.8 -> 1.1/1.2 | 0 | 0 | -2.9 | -33.1 |
| rifle_walk_crouching_backward_left | loop (gait fell back) | 0-30 / 31 (dup last) | 20 | 1 | 1.93 | - | 0 cm / 0 deg (shL) -> 1 (typ 1.5) | 1.3/1.5 -> 1/1.5 | 0 | 0 | -1.2 | -30.4 |
| rifle_walk_crouching_backward_right | loop (gait fell back) | 0-30 / 31 (dup last) | 20 | 1 | 1.93 | - | 0 cm / 0.3 deg (hipR) -> 1 (typ 1.6) | 1/1 -> 0.7/0.9 | 0 | 0 | -1.5 | -28.6 |
| rifle_run_forward_left | gait | 0-15 / 16 (dup last) | 48 | 0.5 | 4.54 | 2.27 m, x0.15-0.33 | 0 cm / 0 deg (elL) -> 2.7 (typ 3) | 1.3/1.8 -> 0.7/1 | 0 | 0 | -1.9 | -10.6 |
| rifle_run_forward_right | gait | 0-15 / 16 (dup last) | 48 | 0.5 | 4.54 | 2.27 m, x0.78-0.96 | 0 cm / 0 deg (chest) -> 3.9 (typ 3) | 1.4/1.6 -> 0.7/0.7 | 0 | 0 | -2.8 | -10.1 |
| rifle_run_left | loop (gait fell back) | 0-15 / 16 (dup last) | 15 | 0.5 | 4.54 | - | 0 cm / 0 deg (elR) -> 2.4 (typ 2.5) | 0.6/0.7 -> 0.7/1.1 | 0 | 0 | -3.6 | -9.6 |
| rifle_run_right | gait | 0-15 / 16 | 48 | 0.5 | 4.54 | 2.27 m, x0.15-0.33 | 0 cm / 9.4 deg (hipR) -> 3 (typ 3.2) | 3.1/4.4 -> 1/1.1 | 0 | 0 | -2.1 | -12.4 |
| rifle_run_backward | loop (gait fell back) | 0-15 / 16 (dup last) | 15 | 0.5 | 4.54 | - | 0 cm / 0.1 deg (shR) -> 2.6 (typ 2.8) | 1.4/1.7 -> 1.3/1.4 | 0 | 0 | -2.8 | -12.9 |
| rifle_run_backward_left | loop (gait fell back) | 0-15 / 16 (dup last) | 15 | 0.5 | 4.54 | - | 0 cm / 0.1 deg (shR) -> 2.6 (typ 2.8) | 1.3/1.5 -> 1.3/1.5 | 0 | 0 | -2.8 | -12.8 |
| rifle_run_backward_right | loop (gait fell back) | 0-15 / 16 (dup last) | 15 | 0.5 | 4.54 | - | 0 cm / 0 deg (elL) -> 2.6 (typ 2.4) | 1.9/2.8 -> 0.9/1.2 | 0 | 0 | -2.5 | -9.7 |
| rifle_sprint_forward_left | gait | 0-15 / 16 (dup last) | 48 | 0.5 | 6.8 | 3.4 m, x0.1-0.22 | 0 cm / 0 deg (shR) -> 5 (typ 4.3) | 0.9/1.5 -> 0.4/0.7 | 0 | 0 | -2.8 | -8.3 |
| rifle_sprint_forward_right | gait | 0-15 / 16 | 48 | 0.5 | 6.8 | 3.4 m, x0.75-0.76 | 0 cm / 8.4 deg (elL) -> 5 (typ 4.1) | 1.2/1.4 -> 1.5/1.9 | 0 | 0 | -3.1 | -8.7 |
| rifle_sprint_left | gait | 0-15 / 16 (dup last) | 48 | 0.5 | 6.8 | 3.4 m, x0.1-0.22 | 0 cm / 0 deg (wrR) -> 4.3 (typ 3.9) | 0.6/0.7 -> 0.3/0.7 | 0 | 0 | -2.5 | -10 |
| rifle_sprint_right | gait | 0-15 / 16 (dup last) | 48 | 0.5 | 6.8 | 3.4 m, x0.1-0.22 | 0 cm / 0 deg (elR) -> 5.2 (typ 4) | 0.8/0.8 -> 0/0 | 0 | 0 | -2.7 | -12.1 |
| rifle_sprint_backward | loop (gait fell back) | 0-15 / 16 (dup last) | 15 | 0.5 | 6.8 | - | 0 cm / 0 deg (chest) -> 3.7 (typ 3.3) | 0.7/0.7 -> 0.2/0.2 | 0 | 0 | -2.2 | -8.2 |
| rifle_sprint_backward_left | loop (gait fell back) | 0-15 / 16 (dup last) | 15 | 0.5 | 6.8 | - | 0 cm / 0 deg (elL) -> 3.7 (typ 3.3) | 0.5/0.5 -> 0.2/0.2 | 0 | 0 | -2 | -8.3 |
| rifle_sprint_backward_right | loop (gait fell back) | 0-15 / 16 (dup last) | 15 | 0.5 | 6.8 | - | 0 cm / 0 deg (elL) -> 4.1 (typ 2.4) | 0.3/0.3 -> 0/0 | 0 | 0 | -1.9 | -9.3 |
| rifle_jump_up | timed | 0-16 / 17 | 22 | 0.533 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.7 | -28.5 |
| rifle_jump_loop | loop | 0-28 / 29 | 19 | 0.933 | 0 | - | 0 cm / 1.8 deg (knR) -> 0 (typ 0.1) | 0/0 -> 0/0 | 0 | 0 | -17.6 | -50 |
| rifle_jump_down | timed | 0-20 / 21 | 28 | 0.667 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.4 | -22 |
| rifle_death_from_the_front | timed | 0-80 / 101 | 107 | 2.65 | - | - | - | 0/3.2 -> 1.7/3.4 | 0 | 0 | -4.7 | -75.3 |
| rifle_death_from_the_back | timed | 0-86 / 90 | 116 | 2.867 | - | - | - | 0/0 -> 0/0 | 9 | 0 | -2 | -75.4 |
| rifle_death_from_right | timed | 0-76 / 100 | 102 | 2.533 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.4 | -80.1 |
| rifle_death_from_front_headshot | timed | 0-81 / 86 | 109 | 2.7 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.8 | -77.8 |
| rifle_death_from_back_headshot | timed | 0-101 / 112 | 135 | 3.35 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.1 | -73.3 |
| rifle_death_crouching_headshot_front | timed | 0-55 / 58 | 74 | 1.833 | - | - | - | 6.6/13.2 -> 1.7/2.6 | 0 | 0 | -3.6 | -79.6 |
| shooter_walking | gait | 0-41 / 42 (dup last) | 48 | 1.367 | 0.94 | 1.28 m, x0.91-1.12 | 0 cm / 0 deg (anR) -> 0.6 (typ 0.9) | 1.8/1.9 -> 1.7/1.7 | 0.3 | 0 | -2.1 | -8.7 |
| shooter_rifle_run | gait | 0-22 / 23 | 48 | 0.733 | 2.97 | 2.18 m, x0.82-1 | 0.2 cm / 7.1 deg (hipL) -> 1.8 (typ 2.4) | 2.7/4.4 -> 2.6/2.9 | 0 | 0 | -2.9 | -17.6 |
| shooter_rifle_aiming_idle | loop | 0-90 / 91 (dup last) | 60 | 3 | 0 | - | 0 cm / 0.3 deg (chest) -> 0 (typ 0) | 0/0 -> 0/0 | 0 | 0 | -1.5 | -4 |
| shooter_walking_backwards | loop (gait fell back) | 0-41 / 42 | 27 | 1.367 | 1.04 | - | 0.3 cm / 8.1 deg (hipL) -> 0.8 (typ 1) | 2.8/3 -> 3.6/5.4 | 0 | 0 | -3.2 | -12.6 |
| shooter_run_backwards | loop (gait fell back) | 0-16 / 17 | 15 | 0.533 | 2.43 | - | 0.2 cm / 8.2 deg (anR) -> 1.7 (typ 1.8) | 2.4/2.9 -> 2.9/3.2 | 0 | 0 | -2.2 | -7 |
| shooter_strafe | gait | 0-20 / 21 (dup last) | 48 | 0.667 | 3.1 | 2.07 m, x0.16-0.36 | 0 cm / 0 deg () -> 1.9 (typ 2.5) | 1.3/1.8 -> 1/1 | 0 | 0 | -2.2 | -13.1 |
| shooter_strafe_2 | loop (gait fell back) | 0-16 / 17 (dup last) | 15 | 0.533 | 2.65 | - | 0 cm / 0 deg (toeL) -> 1.8 (typ 1.8) | 1.9/2.6 -> 2.9/2.9 | 0 | 0 | -4.8 | -9.4 |
| shooter_start_walking | timed | 2-42 / 43 | 54 | 1.333 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -2.6 | -10 |
| shooter_stop_walking | timed | 0-74 / 75 | 100 | 2.467 | - | - | - | 2/2 -> 1.4/1.4 | 0 | 0 | -2 | -9.3 |
| shooter_start_walking_backwards | timed | 1-61 / 62 | 82 | 2.017 | - | - | - | 1.8/1.8 -> 2/2 | 0 | 0 | -1.9 | -11.6 |
| shooter_walk_backwards_stop | timed | 0-38 / 39 | 52 | 1.267 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.8 | -9.4 |
| shooter_firing_rifle | timed | 0-34 / 35 (dup last) | 46 | 1.133 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.5 | -4.1 |
| shooter_jump_forward | timed | 0-27 / 28 (dup last) | 37 | 0.9 | - | - | - | 2.3/2.3 -> 0.8/0.8 | 0 | 0 | -2 | -19.7 |
| shooter_jump_backward | timed | 0-27 / 28 (dup last) | 37 | 0.9 | - | - | - | 1.5/1.5 -> 1.2/1.2 | 0.3 | 0 | -2.3 | -9.7 |
| shooter_walking_to_dying | timed | 0-76 / 93 | 102 | 2.533 | - | - | - | 2.8/2.8 -> 2.6/5.2 | 0 | 0 | -6.1 | -70.2 |
| aa_left_cover_sneak | gait | 0-34 / 35 (dup last) | 48 | 1.133 | 1.11 | 1.26 m, x0.26-0.59 | 0 cm / 0 deg (wrR) -> 0.8 (typ 1.1) | 2.2/2.4 -> 1.5/1.5 | 0 | 0 | -1.5 | -12.7 |
| aa_right_cover_sneak | gait | 0-34 / 35 (dup last) | 48 | 1.133 | 1.11 | 1.26 m, x0.26-0.59 | 0 cm / 0 deg (wrR) -> 0.7 (typ 1.1) | 2.2/2.6 -> 1.5/1.6 | 0 | 0 | -1.3 | -12.7 |
| aa_stand_to_cover | timed | 0-32 / 35 | 44 | 1.067 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.8 | -19.8 |
| aa_stand_to_cover_2 | timed | 0-33 / 38 | 45 | 1.1 | - | - | - | 0/0 -> 0/0 | 1.7 | 0 | -1.5 | -41.1 |
| aa_cover_to_stand | timed | 0-45 / 46 | 61 | 1.5 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.5 | -39.7 |
| aa_cover_to_stand_2 | timed | 0-34 / 35 | 46 | 1.133 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.4 | -18.5 |
| aa_idle | loop | 0-116 / 117 | 77 | 3.867 | 0 | - | 0.2 cm / 1.1 deg (wrR) -> 0.1 (typ 0.5) | 0/0 -> 0/0 | 0 | 0 | -1.3 | -9.5 |
| aa_idle_2 | loop | 0-300 / 301 (dup last) | 200 | 10 | 0 | - | 0 cm / 0 deg () -> 0 (typ 0) | 0/0 -> 0/0 | 0 | 0 | -1.2 | -6.8 |
| aa_idle_3 | loop | 0-98 / 99 (dup last) | 65 | 3.267 | 0 | - | 0 cm / 0 deg (chest) -> 0.1 (typ 0.4) | 1.1/1.6 -> 0.1/1.3 | 0 | 0 | -1.5 | -7.9 |
| aa_idle_4 | loop | 0-77 / 78 (dup last) | 51 | 2.567 | 0 | - | 0 cm / 0 deg (knL) -> 0 (typ 0) | 0/0 -> 0/0 | 0 | 0 | -1.1 | -39.3 |
| aa_idle_5 | loop | 0-68 / 69 (dup last) | 45 | 2.267 | 0 | - | 0 cm / 0 deg (knR) -> 0 (typ 0) | 0/0 -> 0/0 | 0 | 0 | -1.3 | -9 |
| aa_jumping_up | timed | 0-7 / 8 | 16 | 0.233 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -2.6 | -8.2 |
| aa_walking | gait | 0-31 / 32 (dup last) | 48 | 1.033 | 1.67 | 1.73 m, x0.67-0.83 | 0 cm / 0 deg (hipR) -> 1.1 (typ 1.9) | 1.2/1.3 -> 1.5/2 | 0 | 0 | -2.2 | -9 |
| aa_running | gait | 0-21 / 22 (dup last) | 48 | 0.7 | 4.45 | 3.12 m, x0.81-0.83 | 0 cm / 0 deg (knR) -> 3.5 (typ 3.7) | 1.5/1.6 -> 0.9/1.1 | 0.5 | 0 | -2.6 | -9.2 |
| aa_left_turn | timed | 0-31 / 32 (dup last) | 42 | 1.033 | - | - | - | 0/0 -> 0/0 | 0.3 | 0 | -1.3 | -6.8 |
| aa_right_turn | timed | 0-30 / 31 | 41 | 1 | - | - | - | 29.4/29.4 -> 0.5/0.6 | 0 | 0 | -1.4 | -6.9 |
| aa_run_to_stop | timed | 0-27 / 28 | 37 | 0.9 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.9 | -26.8 |
| aa_crouched_sneaking_left | gait | 0-38 / 39 (dup last) | 48 | 1.267 | 0.99 | 1.26 m, x0.26-0.59 | 0 cm / 0 deg (elR) -> 0.8 (typ 1.1) | 0.9/1.3 -> 2.2/2.9 | 0 | 0 | -1.1 | -27.5 |
| aa_crouched_sneaking_right | gait | 0-32 / 33 | 48 | 1.067 | 1.06 | 1.13 m, x0.29-0.66 | 0.2 cm / 13.1 deg (toeL) -> 0.9 (typ 1.1) | 4.2/4.7 -> 3.1/3.7 | 0 | 0 | -1.5 | -28.3 |
| crouch_look_around_corner | loop | 0-90 / 91 (dup last) | 60 | 3 | 0 | - | 0 cm / 0 deg (toeL) -> 0 (typ 0.1) | 0/0 -> 0/0 | 0 | 0 | -1.1 | -39.6 |
| looking_around | loop | 0-190 / 191 (dup last) | 127 | 6.333 | 0 | - | 0 cm / 0 deg (shL) -> 0 (typ 0.3) | 0/0 -> 0/0 | 0 | 0 | -1.4 | -8.3 |
| cover_idle | loop | 0-68 / 69 (dup last) | 45 | 2.267 | 0 | - | 0 cm / 0 deg (anR) -> 0 (typ 0) | 0/0 -> 0/0 | 0 | 0 | -1.3 | -9 |
| stand_cover_to_look | timed | 3-48 / 83 (dup last) | 60 | 1.483 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.3 | -11.3 |
| taking_cover_idle | loop | 0-68 / 69 (dup last) | 45 | 2.267 | 0 | - | 0 cm / 0 deg (knL) -> 0 (typ 0) | 0/0 -> 0/0 | 0 | 0 | -1.1 | -7.5 |

### Notes and limits

- `crouched_walking` (crouched sneak (MOCAP_CROUCH_WALK if it measures as well, A8)): in place no (A4 travel 189.4 cm); last frame vs first 0.15 deg / 0 cm; duty 0.302, half 0.133, capture lift 18.91 cm; trunk turned -38.91 deg onto its travel (I4 `turn`).
- `carry_body_walking` (body carry walk (J19 hand-off)): in place no (A4 travel 264 cm); last frame vs first 0 deg / 0 cm; duty 0.354, half 0.074, capture lift 19.02 cm.
- `crawling_prone` (crawl under a shutter (Campaign hand-off)): in place no (A4 travel 54.1 cm); last frame vs first 0 deg / 0 cm; travel z -> z (heading -1.5 deg, 1.5 off the axis, arc 73.5 deg; FLAGGED arc); duty 0.052, half 0.171, capture lift 5.69 cm; limits: lies flat on the floor: the keyed format poses the pelvis, trunk, head and arms; the legs are the foot planner IK legs under that low pelvis (no leg channel from a capture), so they fold instead of lying straight, and the dragging toes read as contacts (see the slide and reach columns).
- `standing_idle` (Wren's standing idle (KEYED_IDLE, I1)): in place yes (A4 travel 0 cm); last frame vs first 0.07 deg / 0 cm; arms in 11 deg (I4 `armIn`).
- `carry_body_idle` (standing with a carried body (J19 hand-off)): in place yes (A4 travel 0 cm); last frame vs first 0 deg / 0 cm.
- `crouch_to_stand` (stand-up from a crouch (I3, min 0.3 s)): in place no (A4 travel 27.9 cm); last frame vs first 97.76 deg / 46.27 cm; limits: starts crouched with the take's own depth (lowest pelvis column), not the game crouch height.
- `stand_to_crouch` (crouch-down from standing (I3, min 0.25 s)): in place no (A4 travel 8.6 cm); last frame vs first 134.83 deg / 54.42 cm; limits: ends crouched with the take's own depth (lowest pelvis column), not the game crouch height.
- `elbow_strike` (knock-out strike (J19 S1 hand-off)): in place yes (A4 travel 0.1 cm); moving span 0-1.667 s of 1.667 s (threshold 0.1 m/s, peak 1.25); last frame vs first 0.27 deg / 0.02 cm.
- `cross_punch` (palm / knock-out strike alternative (J19 hand-off)): in place yes (A4 travel 0 cm); moving span 0-0.867 s of 0.867 s (threshold 0.1 m/s, peak 1.075); last frame vs first 0 deg / 0 cm.
- `kneel_down` (laying a body down (J19 R11 hand-off)): in place yes (A4 travel 0.9 cm); moving span 0.275-2.392 s of 2.767 s (threshold 0.1 m/s, peak 0.438); last frame vs first 123.32 deg / 55.78 cm; limits: the knees on the floor are not carried (planner IK legs, no leg channel): the trunk lowers over standing feet and reads as a deep squat.
- `kneeling_pull_up` (team pull, the hauler (Campaign / Marlow hand-off)): in place yes (A4 travel 0 cm); moving span 0.058-4.542 s of 4.733 s (threshold 0.1 m/s, peak 0.699); last frame vs first 0.06 deg / 0 cm; limits: kneels throughout: the knees on the floor are not carried (planner IK legs), so the hauling trunk and arms play over a deep squat.
- `pulling_up_to_a_ledge` (team pull, the climber's side (Campaign / Marlow hand-off)): in place no (A4 travel 36.1 cm); moving span 0.008-3.833 s of 3.833 s (threshold 0.123 m/s, peak 1.541); last frame vs first 134.22 deg / 158.51 cm; limits: climbs about 1.75 m up onto a ledge: the clip has no ledge or game root path (the hips rise in pel), so on flat Studio ground Wren rises into the air; the game wiring (hand-off) must move the root as attachController does for the climb-up.
- `lifting_heavy_object` (shutter lift and hold (Campaign / Marlow hand-off)): in place yes (A4 travel 0 cm); moving span 0.2-9.817 s of 11.5 s (threshold 0.1 m/s, peak 1.2); last frame vs first 0 deg / 0 cm; limits: a long squat-lift-hold take kept whole (its moving span is almost all of it); the hands follow the take, no object anchors.
- `walking` (Wren's walk (I6, the CMU walk slot)): in place no (A4 travel 174.2 cm); last frame vs first 0.01 deg / 0 cm; game slot `walk`; duty 0.354, half 0.101, capture lift 17.57 cm.
- `jogging` (Wren's jog (I6, the CMU jog slot)): in place no (A4 travel 478.9 cm); last frame vs first 0 deg / 0 cm; the first of 3 cycles in the take; game slot `jog`; duty 0.208, half 0.037, capture lift 22.28 cm.
- `running` (Wren's run (I6, the CMU run slot)): in place no (A4 travel 353.8 cm); last frame vs first 0 deg / 0 cm; game slot `run`; duty 0.104, half 0.073, capture lift 70.79 cm.
- `fast_run` (Wren's sprint (I6, the CMU sprint slot; the run band, as the CMU sprint)): in place no (A4 travel 284.8 cm); last frame vs first 0 deg / 0 cm; game slot `sprint`; duty 0.177, half 0.009, capture lift 48.81 cm.
- `start_walking` (start from standing (I6, the CMU start slot: played by progress over MOCAP_START_SECONDS)): in place no (A4 travel 80 cm); moving span 0.083-1.467 s of 1.467 s (threshold 0.1 m/s, peak 1.069); last frame vs first 63.59 deg / 4.12 cm; game slot `start`.
- `stop_walking` (stop to standing (I6, the CMU stop slot: played by progress over MOCAP_STOP_SECONDS)): in place no (A4 travel 149.8 cm); moving span 0-2.258 s of 2.667 s (threshold 0.1 m/s, peak 1.106); last frame vs first 63.62 deg / 4.11 cm; game slot `stop`.
- `run_to_stop` (stop from a run (I6: a Studio row; the game has one stop slot, Stop Walking takes it)): in place no (A4 travel 77.7 cm); moving span 0-0.9 s of 0.9 s (threshold 0.353 m/s, peak 4.418); last frame vs first 175.85 deg / 0.17 cm.
- `right_turn` (turn on the spot (I6, the CMU turnInPlace slot: 90 deg right, the left plays it mirrored; by the yaw turned)): in place no (A4 travel 1.4 cm); moving span 0-0.933 s of 0.933 s (threshold 0.1 m/s, peak 0.821); last frame vs first 0.42 deg / 0.01 cm; game slot `turnInPlace`; turned 90 deg (recipe 90) over 0.767 s of take.
- `left_turn` (turn on the spot to the left (I6: a Studio row; the game's one spot slot plays the right turn mirrored)): in place no (A4 travel 1 cm); moving span 0-0.933 s of 0.933 s (threshold 0.1 m/s, peak 0.782); last frame vs first 0 deg / 0 cm; turned -90 deg (recipe -90) over 0.767 s of take.
- `walking_left_turn` (90 deg turn left while walking (I6, the CMU turnMoveL slot; by the yaw turned)): in place no (A4 travel 158.6 cm); moving span 0-1.2 s of 1.2 s (threshold 0.148 m/s, peak 1.845); last frame vs first 4.14 deg / 0.04 cm; game slot `turnMoveL`; turned -34.43 deg (recipe -90) over 1.1 s of take.
- `walking_left_turn_mirror` (90 deg turn right while walking (I6, the CMU turnMoveR slot; Mixamo's mirrored left turn; by the yaw turned)): in place no (A4 travel 158.6 cm); moving span 0-1.2 s of 1.2 s (threshold 0.148 m/s, peak 1.845); last frame vs first 4.12 deg / 0.02 cm; game slot `turnMoveR`; turned 34.19 deg (recipe 90) over 1.083 s of take.
- `left_strafe_walking` (strafe left (I6, the CMU strafeL slot: the aimed strafe's sideways cycle)): in place no (A4 travel 168.9 cm); last frame vs first 0.02 deg / 0 cm; game slot `strafeL`; faced: travel heading -90.8 deg, the take's facing -90.8 deg off the travel root (faceTake); duty 0.5, half 0.024, capture lift 16.56 cm.
- `right_strafe_walking` (strafe right (I6, the CMU strafeR slot: the aimed strafe's sideways cycle)): in place no (A4 travel 168.9 cm); last frame vs first 0 deg / 0 cm; game slot `strafeR`; faced: travel heading 89.2 deg, the take's facing 89.2 deg off the travel root (faceTake); duty 0.5, half 0.028, capture lift 16.61 cm.
- `crouched_sneaking_left` (crouched side-step left (I6: a Studio row; the game has no crouched sideways slot)): in place no (A4 travel 126.7 cm); last frame vs first 0.03 deg / 0 cm; faced: travel heading -90.8 deg, the take's facing -90.8 deg off the travel root (faceTake); duty 0.625, half 0.027, capture lift 17.61 cm.
- `crouched_sneaking_right` (crouched side-step right (I6: a Studio row; the game has no crouched sideways slot)): in place no (A4 travel 116.9 cm); last frame vs first 0.02 deg / 0 cm; faced: travel heading 89.2 deg, the take's facing 89.2 deg off the travel root (faceTake); duty 0.281, half 0.007, capture lift 12.46 cm.
- `walking_backwards` (walking backwards (I6: a Studio row; the game has no backwards slot)): in place yes (A4 travel 127.1 cm); last frame vs first 0 deg / 0 cm; limits: emitted in place as a loop (the keyed format's cycles travel forward or sideways only): the Studio shows the trunk and arms over the planner's standing feet.
- `run_backwards` (running backwards (I6: a Studio row; the game has no backwards slot)): in place yes (A4 travel 126.9 cm); last frame vs first 90.19 deg / 37.27 cm; limits: emitted in place as a loop (the keyed format's cycles travel forward or sideways only): the Studio shows the trunk and arms over the planner's standing feet.
- `pistol_idle` (drawn still (ready stance), pistol (I10)): in place yes (A4 travel 0 cm); last frame vs first 0 deg / 0 cm.
- `pistol_walk` (drawn walk band + aimed glide forward, pistol (I10)): in place no (A4 travel 202.2 cm); last frame vs first 0 deg / 0 cm; duty 0.323, half 0.104, capture lift 17.79 cm.
- `pistol_run` (drawn jog + run bands, pistol (I10)): in place no (A4 travel 235 cm); last frame vs first 0.3 deg / 0 cm; duty 0.146, half 0.05, capture lift 38.33 cm.
- `pistol_walk_backward` (aimed glide back, pistol (I10)): in place no (A4 travel 143.6 cm); last frame vs first 0 deg / 0 cm; faced: travel heading 179.2 deg, the take's facing 179.2 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `pistol_strafe` (aimed strafe, side by measured travel, pistol (I10)): in place no (A4 travel 120.7 cm); last frame vs first 0 deg / 0 cm; travel auto -> -x (heading -90.8 deg, 0.8 off the axis, arc -9.1 deg); faced: travel heading -90.8 deg, the take's facing -90.8 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `pistol_strafe_2` (aimed strafe, the other side, pistol (I10)): in place no (A4 travel 143.5 cm); last frame vs first 0 deg / 0 cm; travel auto -> +x (heading 89.2 deg, 0.8 off the axis, arc 3.8 deg); faced: travel heading 89.2 deg, the take's facing 89.2 deg off the travel root (faceTake); duty 0.385, half 0.222, capture lift 13.13 cm.
- `pistol_run_backward` (Anim Studio only (the aimed glide is walk pace)): in place no (A4 travel 174.2 cm); last frame vs first 0.01 deg / 0 cm; Anim Studio only; faced: travel heading 179.2 deg, the take's facing 179.2 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `pistol_walk_arc` (Anim Studio only (curved travel; the planner turns the body)): in place no (A4 travel 180.9 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; travel auto -> z (heading 11.1 deg, 11.1 off the axis, arc 19.1 deg); duty 0.208, half 0.131, capture lift 16.27 cm.
- `pistol_walk_arc_2` (Anim Studio only (curved travel, other side)): in place no (A4 travel 192.8 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; travel auto -> z (heading -14.5 deg, 14.5 off the axis, arc -11.9 deg); duty 0.219, half 0.069, capture lift 16.89 cm.
- `pistol_run_arc` (Anim Studio only (curved travel)): in place no (A4 travel 202.3 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; travel auto -> z (heading 14.8 deg, 14.8 off the axis, arc 17.6 deg); no gait cycle (mixamo_pistol_run_arc: needs a left strike at 0 and a right strike): emitted as a loop with its travel, no clip feet.
- `pistol_run_arc_2` (Anim Studio only (curved travel, other side)): in place no (A4 travel 203.4 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; travel auto -> z (heading -20.1 deg, 20.1 off the axis, arc -19.5 deg); duty 0.104, half 0, capture lift 19.83 cm.
- `pistol_walk_backward_arc` (Anim Studio only (curved travel)): in place no (A4 travel 104.2 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; travel auto -> -z (heading -178 deg, 2 off the axis, arc 6.2 deg); faced: travel heading -178 deg, the take's facing -178 deg off the travel root (faceTake); duty 0.365, half 0.077, capture lift 5.16 cm.
- `pistol_walk_backward_arc_2` (Anim Studio only (curved travel, other side)): in place no (A4 travel 104.1 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; travel auto -> -z (heading 156.1 deg, 23.9 off the axis, arc -21.9 deg; FLAGGED diagonal, arc); faced: travel heading 156.1 deg, the take's facing 156.1 deg off the travel root (faceTake); duty 0.188, half 0.02, capture lift 7.54 cm.
- `pistol_run_backward_arc` (Anim Studio only (curved travel)): in place no (A4 travel 124.3 cm); last frame vs first 0.05 deg / 0 cm; Anim Studio only; travel auto -> -z (heading -179.4 deg, 0.6 off the axis, arc 15.3 deg); faced: travel heading -179.4 deg, the take's facing -179.4 deg off the travel root (faceTake); no gait cycle (mixamo_pistol_run_backward_arc: needs a left strike at 0 and a right strike): emitted as a loop with its travel, no clip feet.
- `pistol_run_backward_arc_2` (Anim Studio only (curved travel, other side)): in place no (A4 travel 133.2 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; travel auto -> -z (heading 170.6 deg, 9.4 off the axis, arc -18.3 deg); faced: travel heading 170.6 deg, the take's facing 170.6 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `pistol_kneeling_idle` (Anim Studio only (a knee on the floor needs a leg channel)): in place yes (A4 travel 0 cm); last frame vs first 0 deg / 0 cm; Anim Studio only.
- `pistol_stand_to_kneel` (Anim Studio only (a knee on the floor needs a leg channel)): in place no (A4 travel 7.1 cm); moving span 0-0.817 s of 0.967 s (threshold 0.1 m/s, peak 1.002); last frame vs first 105.57 deg / 41.84 cm; Anim Studio only.
- `pistol_kneel_to_stand` (Anim Studio only (a knee on the floor needs a leg channel)): in place no (A4 travel 7.2 cm); moving span 0-0.858 s of 1.333 s (threshold 0.1 m/s, peak 1.023); last frame vs first 105.87 deg / 41.9 cm; Anim Studio only.
- `pistol_jump` (Anim Studio only (no jump in the game)): in place yes (A4 travel 0 cm); moving span 0-2 s of 2 s (threshold 0.218 m/s, peak 2.729); last frame vs first 0 deg / 0 cm; Anim Studio only.
- `pistol_jump_2` (Anim Studio only (no jump in the game)): in place no (A4 travel 272.6 cm); moving span 0-0.8 s of 0.8 s (threshold 0.39 m/s, peak 4.871); last frame vs first 0 deg / 0 cm; Anim Studio only.
- `rifle_idle` (drawn still (ready stance), rifle (I10)): in place yes (A4 travel 0 cm); last frame vs first 0.73 deg / 0.01 cm.
- `rifle_idle_aiming` (drawn aimed still, rifle (I10)): in place yes (A4 travel 0 cm); last frame vs first 0.03 deg / 0 cm.
- `rifle_walk_forward` (drawn walk band + aimed glide forward, rifle (I10)): in place no (A4 travel 182.7 cm); last frame vs first 2.9 deg / 0 cm; duty 0.479, half 0.123, capture lift 12.36 cm.
- `rifle_run_forward` (drawn jog band, rifle (I10)): in place no (A4 travel 228.3 cm); last frame vs first 0.01 deg / 0 cm; duty 0.26, half 0.065, capture lift 23.55 cm.
- `rifle_sprint_forward` (drawn run band, rifle (I10)): in place no (A4 travel 342.5 cm); last frame vs first 0.01 deg / 0 cm; duty 0.135, half 0.077, capture lift 36.71 cm.
- `rifle_walk_backward` (aimed glide back, rifle (I10)): in place no (A4 travel 177.1 cm); last frame vs first 13.56 deg / 0.75 cm; faced: travel heading 179.2 deg, the take's facing 179.2 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `rifle_walk_left` (aimed strafe left, rifle (I10)): in place no (A4 travel 182.7 cm); last frame vs first 0.07 deg / 0 cm; faced: travel heading -90.8 deg, the take's facing -90.8 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `rifle_walk_right` (aimed strafe right, rifle (I10)): in place no (A4 travel 182.7 cm); last frame vs first 0.05 deg / 0 cm; faced: travel heading 89.2 deg, the take's facing 89.2 deg off the travel root (faceTake); duty 0.438, half 0.071, capture lift 15.95 cm.
- `rifle_walk_crouching_forward` (drawn crouched move (sneak band), rifle (I10)): in place no (A4 travel 193.9 cm); last frame vs first 0.01 deg / 0 cm; duty 0.323, half 0.105, capture lift 10.52 cm.
- `rifle_turn_90_left` (drawn turn in place, rifle (I10 optional)): in place no (A4 travel 0.2 cm); moving span 0-1 s of 1 s (threshold 0.1 m/s, peak 0.96); last frame vs first 0 deg / 0 cm; turned -88.57 deg (recipe -90) over 0.983 s of take.
- `rifle_turn_90_right` (drawn turn in place, rifle (I10 optional)): in place no (A4 travel 0.2 cm); moving span 0-1 s of 1 s (threshold 0.1 m/s, peak 1.122); last frame vs first 0 deg / 0 cm; turned 88.13 deg (recipe 90) over 0.933 s of take.
- `rifle_crouching_turn_90_left` (drawn crouched turn, rifle (I10 optional)): in place no (A4 travel 2.3 cm); moving span 0-1.267 s of 1.267 s (threshold 0.1 m/s, peak 1.065); last frame vs first 0 deg / 0 cm; turned -90 deg (recipe -90) over 1 s of take.
- `rifle_crouching_turn_90_right` (drawn crouched turn, rifle (I10 optional)): in place no (A4 travel 2.3 cm); moving span 0-1.25 s of 1.267 s (threshold 0.14 m/s, peak 1.753); last frame vs first 0 deg / 0 cm; turned 88.39 deg (recipe 90) over 1.2 s of take.
- `rifle_idle_crouching` (Anim Studio only (the drawn crouched still is the procedural kneel)): in place yes (A4 travel 0 cm); last frame vs first 0.35 deg / 0 cm; Anim Studio only.
- `rifle_idle_crouching_aiming` (Anim Studio only): in place yes (A4 travel 0 cm); last frame vs first 0.02 deg / 0 cm; Anim Studio only.
- `rifle_walk_forward_left` (Anim Studio only (diagonal; the glide blends forward + side)): in place no (A4 travel 182.7 cm); last frame vs first 0.94 deg / 0 cm; Anim Studio only; travel auto -> -x (heading -45.8 deg, 44.2 off the axis, arc 4.8 deg; FLAGGED diagonal); faced: travel heading -45.8 deg, the take's facing -45.8 deg off the travel root (faceTake); duty 0.5, half 0.055, capture lift 13.15 cm.
- `rifle_walk_forward_right` (Anim Studio only (diagonal)): in place no (A4 travel 182.7 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; travel auto -> z (heading 44.2 deg, 44.2 off the axis, arc 4.2 deg; FLAGGED diagonal); duty 0.417, half 0.083, capture lift 11.76 cm.
- `rifle_walk_backward_left` (Anim Studio only (diagonal)): in place no (A4 travel 182.7 cm); last frame vs first 4.15 deg / 0 cm; Anim Studio only; travel auto -> -z (heading -135.8 deg, 44.2 off the axis, arc -6 deg; FLAGGED diagonal); faced: travel heading -135.8 deg, the take's facing -135.8 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `rifle_walk_backward_right` (Anim Studio only (diagonal)): in place no (A4 travel 182.7 cm); last frame vs first 0.94 deg / 0 cm; Anim Studio only; travel auto -> +x (heading 134.2 deg, 44.2 off the axis, arc -4.7 deg; FLAGGED diagonal); faced: travel heading 134.2 deg, the take's facing 134.2 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `rifle_walk_crouching_backward` (Anim Studio only (the crouched drawn legs are forward cycles)): in place no (A4 travel 193.9 cm); last frame vs first 0.01 deg / 0 cm; Anim Studio only; faced: travel heading 179.2 deg, the take's facing 179.2 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `rifle_walk_crouching_left` (Anim Studio only): in place no (A4 travel 193.9 cm); last frame vs first 0.01 deg / 0 cm; Anim Studio only; faced: travel heading -90.8 deg, the take's facing -90.8 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `rifle_walk_crouching_right` (Anim Studio only): in place no (A4 travel 193.9 cm); last frame vs first 0.04 deg / 0 cm; Anim Studio only; faced: travel heading 89.2 deg, the take's facing 89.2 deg off the travel root (faceTake); duty 0.406, half 0.007, capture lift 16.08 cm.
- `rifle_walk_crouching_forward_left` (Anim Studio only (diagonal)): in place no (A4 travel 193.9 cm); last frame vs first 0.07 deg / 0 cm; Anim Studio only; travel auto -> -x (heading -45.8 deg, 44.2 off the axis, arc -0.4 deg; FLAGGED diagonal); faced: travel heading -45.8 deg, the take's facing -45.8 deg off the travel root (faceTake); duty 0.385, half 0.078, capture lift 10.5 cm.
- `rifle_walk_crouching_forward_right` (Anim Studio only (diagonal)): in place no (A4 travel 193.9 cm); last frame vs first 0.01 deg / 0 cm; Anim Studio only; travel auto -> z (heading 44.2 deg, 44.2 off the axis, arc -0.1 deg; FLAGGED diagonal); duty 0.188, half 0.101, capture lift 9.44 cm.
- `rifle_walk_crouching_backward_left` (Anim Studio only (diagonal)): in place no (A4 travel 193.9 cm); last frame vs first 0.02 deg / 0 cm; Anim Studio only; travel auto -> -z (heading -135.8 deg, 44.2 off the axis, arc 0.2 deg; FLAGGED diagonal); faced: travel heading -135.8 deg, the take's facing -135.8 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `rifle_walk_crouching_backward_right` (Anim Studio only (diagonal)): in place no (A4 travel 193.9 cm); last frame vs first 0.34 deg / 0 cm; Anim Studio only; travel auto -> +x (heading 134.2 deg, 44.2 off the axis, arc 0.4 deg; FLAGGED diagonal); faced: travel heading 134.2 deg, the take's facing 134.2 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `rifle_run_forward_left` (Anim Studio only (diagonal; low ready runs face travel)): in place no (A4 travel 228.3 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; travel auto -> -x (heading -45.8 deg, 44.2 off the axis, arc 1.4 deg; FLAGGED diagonal); faced: travel heading -45.8 deg, the take's facing -45.8 deg off the travel root (faceTake); duty 0.188, half 0.059, capture lift 36.86 cm.
- `rifle_run_forward_right` (Anim Studio only (diagonal)): in place no (A4 travel 228.3 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; travel auto -> z (heading 44.2 deg, 44.2 off the axis, arc 0.5 deg; FLAGGED diagonal); duty 0.188, half 0.047, capture lift 30.42 cm.
- `rifle_run_left` (Anim Studio only): in place no (A4 travel 228.3 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; faced: travel heading -90.8 deg, the take's facing -90.8 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `rifle_run_right` (Anim Studio only): in place no (A4 travel 228.3 cm); last frame vs first 9.45 deg / 0.02 cm; Anim Studio only; faced: travel heading 89.2 deg, the take's facing 89.2 deg off the travel root (faceTake); duty 0.208, half 0.007, capture lift 40.18 cm.
- `rifle_run_backward` (Anim Studio only): in place no (A4 travel 228.3 cm); last frame vs first 0.06 deg / 0 cm; Anim Studio only; faced: travel heading 179.2 deg, the take's facing 179.2 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `rifle_run_backward_left` (Anim Studio only (diagonal)): in place no (A4 travel 228.3 cm); last frame vs first 0.06 deg / 0 cm; Anim Studio only; travel auto -> -z (heading -135.8 deg, 44.2 off the axis, arc 0.5 deg; FLAGGED diagonal); faced: travel heading -135.8 deg, the take's facing -135.8 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `rifle_run_backward_right` (Anim Studio only (diagonal)): in place no (A4 travel 228.3 cm); last frame vs first 0.02 deg / 0 cm; Anim Studio only; travel auto -> +x (heading 134.2 deg, 44.2 off the axis, arc 0 deg; FLAGGED diagonal); faced: travel heading 134.2 deg, the take's facing 134.2 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `rifle_sprint_forward_left` (Anim Studio only (diagonal)): in place no (A4 travel 342.5 cm); last frame vs first 0.01 deg / 0 cm; Anim Studio only; travel auto -> -x (heading -45.8 deg, 44.2 off the axis, arc -0.4 deg; FLAGGED diagonal); faced: travel heading -45.8 deg, the take's facing -45.8 deg off the travel root (faceTake); duty 0.115, half 0.02, capture lift 40.45 cm.
- `rifle_sprint_forward_right` (Anim Studio only (diagonal)): in place no (A4 travel 342.5 cm); last frame vs first 7.45 deg / 0.02 cm; Anim Studio only; travel auto -> z (heading 44.2 deg, 44.2 off the axis, arc 0.1 deg; FLAGGED diagonal); duty 0.125, half 0.061, capture lift 42.75 cm.
- `rifle_sprint_left` (Anim Studio only): in place no (A4 travel 342.5 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; faced: travel heading -90.8 deg, the take's facing -90.8 deg off the travel root (faceTake); duty 0.156, half 0.046, capture lift 35.98 cm.
- `rifle_sprint_right` (Anim Studio only): in place no (A4 travel 342.5 cm); last frame vs first 0.05 deg / 0 cm; Anim Studio only; faced: travel heading 89.2 deg, the take's facing 89.2 deg off the travel root (faceTake); duty 0.125, half 0.084, capture lift 38.2 cm.
- `rifle_sprint_backward` (Anim Studio only): in place no (A4 travel 342.5 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; faced: travel heading 179.2 deg, the take's facing 179.2 deg off the travel root (faceTake); no gait cycle (mixamo_rifle_sprint_backward: needs a left strike at 0 and a right strike): emitted as a loop with its travel, no clip feet.
- `rifle_sprint_backward_left` (Anim Studio only (diagonal)): in place no (A4 travel 342.5 cm); last frame vs first 0.01 deg / 0 cm; Anim Studio only; travel auto -> -z (heading -135.8 deg, 44.2 off the axis, arc -3.1 deg; FLAGGED diagonal); faced: travel heading -135.8 deg, the take's facing -135.8 deg off the travel root (faceTake); no gait cycle (mixamo_rifle_sprint_backward_left: needs a left strike at 0 and a right strike): emitted as a loop with its travel, no clip feet.
- `rifle_sprint_backward_right` (Anim Studio only (diagonal)): in place no (A4 travel 342.5 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; travel auto -> +x (heading 134.2 deg, 44.2 off the axis, arc 0.1 deg; FLAGGED diagonal); faced: travel heading 134.2 deg, the take's facing 134.2 deg off the travel root (faceTake); no gait cycle (mixamo_rifle_sprint_backward_right: needs a left strike at 0 and a right strike): emitted as a loop with its travel, no clip feet.
- `rifle_jump_up` (Anim Studio only (no jump in the game)): in place yes (A4 travel 1.2 cm); moving span 0-0.533 s of 0.533 s (threshold 0.331 m/s, peak 4.143); last frame vs first 81.72 deg / 2.01 cm; Anim Studio only.
- `rifle_jump_loop` (Anim Studio only (no jump in the game)): in place yes (A4 travel 0 cm); last frame vs first 2.23 deg / 0.02 cm; Anim Studio only.
- `rifle_jump_down` (Anim Studio only (no jump in the game)): in place yes (A4 travel 1.2 cm); moving span 0-0.667 s of 0.667 s (threshold 0.113 m/s, peak 1.41); last frame vs first 81.72 deg / 2.01 cm; Anim Studio only.
- `rifle_death_from_the_front` (Anim Studio only (guard deaths are the ragdoll; Guard AI note)): in place no (A4 travel 98.7 cm); moving span 0-2.658 s of 3.333 s (threshold 0.135 m/s, peak 1.69); last frame vs first 107.06 deg / 67.36 cm; Anim Studio only.
- `rifle_death_from_the_back` (Anim Studio only (guard deaths are the ragdoll)): in place no (A4 travel 107.1 cm); moving span 0-2.875 s of 2.967 s (threshold 0.163 m/s, peak 2.039); last frame vs first 107.01 deg / 66.95 cm; Anim Studio only.
- `rifle_death_from_right` (Anim Studio only (guard deaths are the ragdoll)): in place no (A4 travel 79.7 cm); moving span 0-2.542 s of 3.3 s (threshold 0.134 m/s, peak 1.673); last frame vs first 141.28 deg / 69.08 cm; Anim Studio only.
- `rifle_death_from_front_headshot` (Anim Studio only (guard deaths are the ragdoll)): in place no (A4 travel 33.6 cm); moving span 0-2.708 s of 2.833 s (threshold 0.116 m/s, peak 1.456); last frame vs first 179.02 deg / 74.94 cm; Anim Studio only.
- `rifle_death_from_back_headshot` (Anim Studio only (guard deaths are the ragdoll)): in place no (A4 travel 88.9 cm); moving span 0-3.35 s of 3.7 s (threshold 0.16 m/s, peak 1.999); last frame vs first 179.09 deg / 68.12 cm; Anim Studio only.
- `rifle_death_crouching_headshot_front` (Anim Studio only (guard deaths are the ragdoll)): in place no (A4 travel 88.4 cm); moving span 0-1.842 s of 1.9 s (threshold 0.157 m/s, peak 1.964); last frame vs first 179.24 deg / 26.11 cm; Anim Studio only.
- `shooter_walking` (Anim Studio only (the rifle pack fills the drawn slots)): in place no (A4 travel 128.9 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; duty 0.479, half 0.096, capture lift 16.05 cm.
- `shooter_rifle_run` (Anim Studio only): in place no (A4 travel 219 cm); last frame vs first 9.57 deg / 0.2 cm; Anim Studio only; duty 0.292, half 0.046, capture lift 19.96 cm.
- `shooter_rifle_aiming_idle` (Anim Studio only): in place yes (A4 travel 0 cm); last frame vs first 0.53 deg / 0.02 cm; Anim Studio only.
- `shooter_walking_backwards` (Anim Studio only): in place no (A4 travel 142.7 cm); last frame vs first 8.06 deg / 0.33 cm; Anim Studio only; faced: travel heading 179.2 deg, the take's facing 179.2 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `shooter_run_backwards` (Anim Studio only): in place no (A4 travel 130.5 cm); last frame vs first 11.09 deg / 0.16 cm; Anim Studio only; faced: travel heading 179 deg, the take's facing 179 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `shooter_strafe` (Anim Studio only): in place no (A4 travel 208.3 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; travel auto -> +x (heading 89.2 deg, 0.8 off the axis, arc -2.9 deg); faced: travel heading 89.2 deg, the take's facing 89.2 deg off the travel root (faceTake); duty 0.24, half 0.025, capture lift 17.82 cm.
- `shooter_strafe_2` (Anim Studio only): in place no (A4 travel 142.2 cm); last frame vs first 0 deg / 0 cm; Anim Studio only; travel auto -> -x (heading -90.8 deg, 0.8 off the axis, arc -2.6 deg); faced: travel heading -90.8 deg, the take's facing -90.8 deg off the travel root (faceTake); no gait cycle (no pinned ankle window (duty 0)): emitted as a loop with its travel, no clip feet.
- `shooter_start_walking` (Anim Studio only (the drawn set has no start / stop slot)): in place no (A4 travel 75.2 cm); moving span 0.058-1.4 s of 1.4 s (threshold 0.1 m/s, peak 0.959); last frame vs first 72.45 deg / 4.87 cm; Anim Studio only.
- `shooter_stop_walking` (Anim Studio only): in place no (A4 travel 150 cm); moving span 0-2.467 s of 2.467 s (threshold 0.1 m/s, peak 1.105); last frame vs first 63.44 deg / 3.97 cm; Anim Studio only.
- `shooter_start_walking_backwards` (Anim Studio only): in place no (A4 travel 167.9 cm); moving span 0.017-2.033 s of 2.033 s (threshold 0.114 m/s, peak 1.428); last frame vs first 36.95 deg / 0.31 cm; Anim Studio only.
- `shooter_walk_backwards_stop` (Anim Studio only): in place no (A4 travel 85.6 cm); moving span 0-1.267 s of 1.267 s (threshold 0.107 m/s, peak 1.331); last frame vs first 35.49 deg / 0.71 cm; Anim Studio only.
- `shooter_firing_rifle` (Anim Studio only (recoil is procedural)): in place yes (A4 travel 0 cm); moving span 0-1.133 s of 1.133 s (threshold 0.1 m/s, peak 0.073); last frame vs first 0.17 deg / 0 cm; Anim Studio only.
- `shooter_jump_forward` (Anim Studio only (no jump in the game)): in place no (A4 travel 286.8 cm); moving span 0-0.9 s of 0.9 s (threshold 0.396 m/s, peak 4.954); last frame vs first 0.03 deg / 0 cm; Anim Studio only.
- `shooter_jump_backward` (Anim Studio only (no jump in the game)): in place no (A4 travel 169.4 cm); moving span 0-0.9 s of 0.9 s (threshold 0.194 m/s, peak 2.429); last frame vs first 0 deg / 0 cm; Anim Studio only.
- `shooter_walking_to_dying` (Anim Studio only): in place no (A4 travel 155.3 cm); moving span 0-2.533 s of 3.067 s (threshold 0.133 m/s, peak 1.661); last frame vs first 66.99 deg / 58.92 cm; Anim Studio only.
- `aa_left_cover_sneak` (wall slide left, standing, holstered (I13; facing measured)): in place no (A4 travel 126.7 cm); last frame vs first 0.01 deg / 0 cm; faced: travel heading -90.8 deg, the take's facing -90.8 deg off the travel root (faceTake); duty 0.552, half 0.06, capture lift 17.98 cm.
- `aa_right_cover_sneak` (wall slide right, standing, holstered (I13)): in place no (A4 travel 126.7 cm); last frame vs first 0.03 deg / 0 cm; faced: travel heading 89.2 deg, the take's facing -270.8 deg off the travel root (faceTake); duty 0.552, half 0.06, capture lift 17.49 cm.
- `aa_stand_to_cover` (Anim Studio only (the wall entry is a 0.1 s blend)): in place no (A4 travel 113.3 cm); moving span 0-1.075 s of 1.133 s (threshold 0.257 m/s, peak 3.212); last frame vs first 122.43 deg / 2.02 cm; Anim Studio only.
- `aa_stand_to_cover_2` (Anim Studio only): in place no (A4 travel 116.9 cm); moving span 0-1.1 s of 1.233 s (threshold 0.268 m/s, peak 3.354); last frame vs first 73.34 deg / 32.78 cm; Anim Studio only.
- `aa_cover_to_stand` (Anim Studio only): in place no (A4 travel 95.1 cm); moving span 0-1.5 s of 1.5 s (threshold 0.145 m/s, peak 1.812); last frame vs first 75.59 deg / 32.77 cm; Anim Studio only.
- `aa_cover_to_stand_2` (Anim Studio only): in place no (A4 travel 94.2 cm); moving span 0-1.133 s of 1.133 s (threshold 0.145 m/s, peak 1.818); last frame vs first 105.71 deg / 1.06 cm; Anim Studio only.
- `aa_idle` (Anim Studio only (idle choice for Michael)): in place yes (A4 travel 0.2 cm); last frame vs first 4.55 deg / 0.02 cm; Anim Studio only.
- `aa_idle_2` (Anim Studio only (idle choice for Michael)): in place yes (A4 travel 0 cm); last frame vs first 0 deg / 0 cm; Anim Studio only.
- `aa_idle_3` (Anim Studio only (idle choice for Michael)): in place yes (A4 travel 0 cm); last frame vs first 0.16 deg / 0 cm; Anim Studio only.
- `aa_idle_4` (Anim Studio only (idle choice for Michael)): in place yes (A4 travel 0 cm); last frame vs first 0.03 deg / 0 cm; Anim Studio only.
- `aa_idle_5` (Anim Studio only (idle choice for Michael)): in place yes (A4 travel 0 cm); last frame vs first 0.06 deg / 0 cm; Anim Studio only.
- `aa_jumping_up` (Anim Studio only (no jump in the game)): in place no (A4 travel 6.8 cm); moving span 0-0.233 s of 0.233 s (threshold 0.351 m/s, peak 4.393); last frame vs first 135.58 deg / 0.03 cm; Anim Studio only.
- `aa_walking` (Anim Studio only (near the root Walking take; not within the 1 cm duplicate rule)): in place no (A4 travel 174.2 cm); last frame vs first 0.01 deg / 0 cm; Anim Studio only; duty 0.344, half 0.102, capture lift 17.78 cm.
- `aa_running` (Anim Studio only (another take than the root Running)): in place no (A4 travel 313.8 cm); last frame vs first 0.01 deg / 0 cm; Anim Studio only; duty 0.146, half 0.057, capture lift 44.44 cm.
- `aa_left_turn` (Anim Studio only (another take than the root turn: its hips do not turn, so a one-shot by progress)): in place yes (A4 travel 0 cm); moving span 0-1.033 s of 1.033 s (threshold 0.1 m/s, peak 0.622); last frame vs first 1.27 deg / 0.01 cm; Anim Studio only.
- `aa_right_turn` (Anim Studio only (another take than the root turn: its hips do not turn, so a one-shot by progress)): in place yes (A4 travel 0.3 cm); moving span 0-1 s of 1 s (threshold 0.1 m/s, peak 0.701); last frame vs first 2.89 deg / 0.06 cm; Anim Studio only.
- `aa_run_to_stop` (Anim Studio only (near the root Run To Stop; not within the 1 cm duplicate rule)): in place no (A4 travel 77.7 cm); moving span 0-0.9 s of 0.9 s (threshold 0.353 m/s, peak 4.418); last frame vs first 175.85 deg / 0.17 cm; Anim Studio only.
- `aa_crouched_sneaking_left` (Anim Studio only (near the root take; not within the 1 cm duplicate rule)): in place no (A4 travel 126.7 cm); last frame vs first 0.03 deg / 0 cm; Anim Studio only; faced: travel heading -90.8 deg, the take's facing -90.8 deg off the travel root (faceTake); duty 0.625, half 0.026, capture lift 17.58 cm.
- `aa_crouched_sneaking_right` (Anim Studio only (another take than the root one)): in place no (A4 travel 113.8 cm); last frame vs first 14.46 deg / 0.22 cm; Anim Studio only; faced: travel heading 89.3 deg, the take's facing -270.7 deg off the travel root (faceTake); duty 0.594, half -0.017, capture lift 13.21 cm.
- `crouch_look_around_corner` (wall crouched peek (I13; mirrored for the other edge)): in place yes (A4 travel 0 cm); last frame vs first 0.03 deg / 0 cm.
- `looking_around` (Anim Studio only (guard search candidate: Guard AI)): in place yes (A4 travel 0 cm); last frame vs first 0.04 deg / 0 cm; Anim Studio only.
- `cover_idle` (wall standing idle, holstered (I13)): in place yes (A4 travel 0 cm); last frame vs first 0.05 deg / 0 cm.
- `stand_cover_to_look` (wall standing peek, by the peek amount (I13)): in place yes (A4 travel 0 cm); moving span 0.092-1.583 s of 2.733 s (threshold 0.1 m/s, peak 0.214); last frame vs first 0.04 deg / 0 cm.
- `taking_cover_idle` (Anim Studio only (a drawn weapon at a wall keeps the procedural pose)): in place yes (A4 travel 0 cm); last frame vs first 0 deg / 0 cm; Anim Studio only.

Leg scale (Wren / take) per pack: (root files) 0.99329; pack-pistol 0.99329; pack-rifle 0.99329; pack-shooter 0.99329; pack-action-adventure 0.99329.

Not emitted in this slice (open items, M3-REPORT.md): the optional `clav`, `fing` and `fore` channels (A7); the
keyed format has no leg channel from a capture (`leg` / `legd` are not written), so the legs are the foot planner's IK
legs under the captured pelvis: a kneel, a crawl or a lie-down shows its trunk and arms, not its knees on the floor.
<!-- /mocap:mixamo-keyed -->
