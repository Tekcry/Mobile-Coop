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
| crouched_walking | gait | 0-34 / 35 (dup last) | 48 | 1.133 | 1.66 | 1.88 m, x0.62-0.77 | 0 cm / 0.1 deg (knL) -> 0.9 (typ 1.5) | 0.7/0.7 -> 1.2/1.7 | 0 | 0 | -1.8 | -24.2 |
| carry_body_walking | gait | 0-86 / 87 (dup last) | 48 | 2.867 | 0.91 | 2.62 m, x0.44-0.55 | 0 cm / 0 deg (shR) -> 0.7 (typ 0.9) | 1.2/1.6 -> 1.2/1.4 | 0.1 | 0 | -1.5 | -8.4 |
| crawling_prone | gait | 0-70 / 71 (dup last) | 48 | 2.333 | 0.23 | 0.54 m, x2.16-2.68 | 0 cm / 0 deg (wrR) -> 0.6 (typ 0.5) | 9.2/13.2 -> 9.2/20.7 | 9.9 | 0 | -9.6 | -85.6 |
| standing_idle | loop | 0-180 / 181 (dup last) | 120 | 6 | 0 | - | 0 cm / 0.1 deg (neck) -> 0 (typ 0) | 0/0 -> 0/0 | 0 | 0 | -1.5 | -1.2 |
| carry_body_idle | loop | 0-300 / 301 (dup last) | 200 | 10 | 0 | - | 0 cm / 0 deg () -> 0 (typ 0) | 0/0 -> 0/0 | 0 | 0 | -1.4 | -5.8 |
| crouch_to_stand | timed | 4-70 / 78 | 88 | 2.167 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -2.4 | -47.2 |
| stand_to_crouch | timed | 10-88 / 123 | 104 | 2.583 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -2.8 | -53.9 |
| elbow_strike | timed | 0-50 / 51 (dup last) | 68 | 1.667 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.7 | -12.3 |
| cross_punch | timed | 0-26 / 27 (dup last) | 36 | 0.867 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1 | -13.2 |
| kneel_down | timed | 8-72 / 84 | 86 | 2.117 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -1.5 | -57.6 |
| kneeling_pull_up | timed | 2-136 / 143 (dup last) | 180 | 4.483 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -10.4 | -58.8 |
| pulling_up_to_a_ledge | timed | 0-115 / 116 | 154 | 3.817 | - | - | - | 0/0 -> 0/0 | 0 | 0 | -11.2 | -0.7 |
| lifting_heavy_object | timed | 6-295 / 346 (dup last) | 386 | 9.617 | - | - | - | 3.5/4 -> 6.3/9.3 | 0 | 0 | -3.1 | -50.9 |

### Notes and limits

- `crouched_walking` (crouched sneak (MOCAP_CROUCH_WALK if it measures as well, A8)): in place no (A4 travel 189.4 cm); last frame vs first 0.15 deg / 0 cm; duty 0.302, half 0.114, capture lift 18.91 cm.
- `carry_body_walking` (body carry walk (J19 hand-off)): in place no (A4 travel 264 cm); last frame vs first 0 deg / 0 cm; duty 0.354, half 0.074, capture lift 19.02 cm.
- `crawling_prone` (crawl under a shutter (Campaign hand-off)): in place no (A4 travel 54.1 cm); last frame vs first 0 deg / 0 cm; duty 0.052, half 0.171, capture lift 5.69 cm; limits: lies flat on the floor: the keyed format poses the pelvis, trunk, head and arms; the legs are the foot planner IK legs under that low pelvis (no leg channel from a capture), so they fold instead of lying straight, and the dragging toes read as contacts (see the slide and reach columns).
- `standing_idle` (Wren's standing idle (KEYED_IDLE, I1)): in place yes (A4 travel 0 cm); last frame vs first 0.07 deg / 0 cm.
- `carry_body_idle` (standing with a carried body (J19 hand-off)): in place yes (A4 travel 0 cm); last frame vs first 0 deg / 0 cm.
- `crouch_to_stand` (stand-up from a crouch (I3, min 0.3 s)): in place no (A4 travel 27.9 cm); moving span 0.142-2.317 s of 2.567 s (threshold 0.1 m/s, peak 0.514); last frame vs first 97.76 deg / 46.27 cm; limits: starts crouched with the take's own depth (lowest pelvis column), not the game crouch height.
- `stand_to_crouch` (crouch-down from standing (I3, min 0.25 s)): in place no (A4 travel 8.6 cm); moving span 0.333-2.925 s of 4.067 s (threshold 0.1 m/s, peak 0.755); last frame vs first 134.83 deg / 54.42 cm; limits: ends crouched with the take's own depth (lowest pelvis column), not the game crouch height.
- `elbow_strike` (knock-out strike (J19 S1 hand-off)): in place yes (A4 travel 0.1 cm); moving span 0-1.667 s of 1.667 s (threshold 0.1 m/s, peak 1.25); last frame vs first 0.27 deg / 0.02 cm.
- `cross_punch` (palm / knock-out strike alternative (J19 hand-off)): in place yes (A4 travel 0 cm); moving span 0-0.867 s of 0.867 s (threshold 0.1 m/s, peak 1.075); last frame vs first 0 deg / 0 cm.
- `kneel_down` (laying a body down (J19 R11 hand-off)): in place yes (A4 travel 0.9 cm); moving span 0.275-2.392 s of 2.767 s (threshold 0.1 m/s, peak 0.441); last frame vs first 123.32 deg / 55.78 cm; limits: the knees on the floor are not carried (planner IK legs, no leg channel): the trunk lowers over standing feet and reads as a deep squat.
- `kneeling_pull_up` (team pull, the hauler (Campaign / Marlow hand-off)): in place yes (A4 travel 0 cm); moving span 0.058-4.542 s of 4.733 s (threshold 0.1 m/s, peak 0.699); last frame vs first 0.06 deg / 0 cm; limits: kneels throughout: the knees on the floor are not carried (planner IK legs), so the hauling trunk and arms play over a deep squat.
- `pulling_up_to_a_ledge` (team pull, the climber's side (Campaign / Marlow hand-off)): in place no (A4 travel 36.1 cm); moving span 0.008-3.833 s of 3.833 s (threshold 0.123 m/s, peak 1.541); last frame vs first 134.22 deg / 158.51 cm; limits: climbs about 1.75 m up onto a ledge: the clip has no ledge or game root path (the hips rise in pel), so on flat Studio ground Wren rises into the air; the game wiring (hand-off) must move the root as attachController does for the climb-up.
- `lifting_heavy_object` (shutter lift and hold (Campaign / Marlow hand-off)): in place yes (A4 travel 0 cm); moving span 0.2-9.817 s of 11.5 s (threshold 0.1 m/s, peak 1.198); last frame vs first 0 deg / 0 cm; limits: a long squat-lift-hold take kept whole (its moving span is almost all of it); the hands follow the take, no object anchors.

Not emitted in this slice (open items, M3-REPORT.md): the optional `clav`, `fing` and `fore` channels (A7); the
keyed format has no leg channel from a capture (`leg` / `legd` are not written), so the legs are the foot planner's IK
legs under the captured pelvis: a kneel, a crawl or a lie-down shows its trunk and arms, not its knees on the floor.
<!-- /mocap:mixamo-keyed -->
