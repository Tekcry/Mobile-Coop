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

### Notes and limits

- `crouched_walking` (crouched sneak (MOCAP_CROUCH_WALK if it measures as well, A8)): in place no (A4 travel 189.4 cm); last frame vs first 0.15 deg / 0 cm; duty 0.302, half 0.133, capture lift 18.91 cm; trunk turned -38.91 deg onto its travel (I4 `turn`).
- `carry_body_walking` (body carry walk (J19 hand-off)): in place no (A4 travel 264 cm); last frame vs first 0 deg / 0 cm; duty 0.354, half 0.074, capture lift 19.02 cm.
- `crawling_prone` (crawl under a shutter (Campaign hand-off)): in place no (A4 travel 54.1 cm); last frame vs first 0 deg / 0 cm; duty 0.052, half 0.171, capture lift 5.69 cm; limits: lies flat on the floor: the keyed format poses the pelvis, trunk, head and arms; the legs are the foot planner IK legs under that low pelvis (no leg channel from a capture), so they fold instead of lying straight, and the dragging toes read as contacts (see the slide and reach columns).
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
- `left_strafe_walking` (strafe left (I6, the CMU strafeL slot: the aimed strafe's sideways cycle)): in place no (A4 travel 168.9 cm); last frame vs first 0.02 deg / 0 cm; game slot `strafeL`; sideways: travel heading -90.8 deg, the take's facing -90.8 deg off the travel root (faceTake); duty 0.5, half 0.024, capture lift 16.56 cm.
- `right_strafe_walking` (strafe right (I6, the CMU strafeR slot: the aimed strafe's sideways cycle)): in place no (A4 travel 168.9 cm); last frame vs first 0 deg / 0 cm; game slot `strafeR`; sideways: travel heading 89.2 deg, the take's facing 89.2 deg off the travel root (faceTake); duty 0.5, half 0.028, capture lift 16.61 cm.
- `crouched_sneaking_left` (crouched side-step left (I6: a Studio row; the game has no crouched sideways slot)): in place no (A4 travel 126.7 cm); last frame vs first 0.03 deg / 0 cm; sideways: travel heading -90.8 deg, the take's facing -90.8 deg off the travel root (faceTake); duty 0.625, half 0.027, capture lift 17.61 cm.
- `crouched_sneaking_right` (crouched side-step right (I6: a Studio row; the game has no crouched sideways slot)): in place no (A4 travel 116.9 cm); last frame vs first 0.02 deg / 0 cm; sideways: travel heading 89.2 deg, the take's facing 89.2 deg off the travel root (faceTake); duty 0.281, half 0.007, capture lift 12.46 cm.
- `walking_backwards` (walking backwards (I6: a Studio row; the game has no backwards slot)): in place yes (A4 travel 127.1 cm); last frame vs first 0 deg / 0 cm; limits: emitted in place as a loop (the keyed format's cycles travel forward or sideways only): the Studio shows the trunk and arms over the planner's standing feet.
- `run_backwards` (running backwards (I6: a Studio row; the game has no backwards slot)): in place yes (A4 travel 126.9 cm); last frame vs first 90.19 deg / 37.27 cm; limits: emitted in place as a loop (the keyed format's cycles travel forward or sideways only): the Studio shows the trunk and arms over the planner's standing feet.

Not emitted in this slice (open items, M3-REPORT.md): the optional `clav`, `fing` and `fore` channels (A7); the
keyed format has no leg channel from a capture (`leg` / `legd` are not written), so the legs are the foot planner's IK
legs under the captured pelvis: a kneel, a crawl or a lie-down shows its trunk and arms, not its knees on the floor.
<!-- /mocap:mixamo-keyed -->
