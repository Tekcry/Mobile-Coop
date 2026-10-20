# G8 walk, round 2: matched camera and pose targets (2026-10-20)

Michael (10:55) on the walk proof: the after is narrower with more swing but still looks like the before. CT's walk is
heavier: the torso pitched a little forward, the knees softly bent all the way through, the shoulders and arms hanging
forward and a little bent, a lower and heavier centre. Ours is upright and light. His choice: "Tight pose matching, also
consider the camera angle being used in the CT videos also is different. Try to match the camera angle also to ensure it
matches". IP: the CT points below are a handful of joints placed by eye on gridded frames to measure angles; our clip is
keyed by hand to hit those numbers. Nothing is traced or tracked.

## 1. The camera

### CT's camera in the walk clips
Method: CT frames are 2420 x 1668 (1.45 wide); vertical FOV 55.7 deg (the camera audit's 75 deg across); the hero ~1.8 m;
the explore camera looks at a pivot at the head top (AUDIT-CAMERA row 6: the head top sits at y 0.42-0.51 at every
pitch) with the pitch 12 deg down (row 4, the vanishing point at y 0.30). The distance then follows from where the feet
sit: the feet at y = 0.5 + tan(a) / (2 tan 27.85) below the pivot's line, so tan(a + pitch) = (1.8 + D sin 12) / (D cos 12).

| clip | view | head top y | feet y | hero x | distance D (1.8 m hero) | azimuth round the hero (0 = in front, + his right) | pitch |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 105949 @ 12.13-12.37 | side-high | 0.50 | 0.94-0.95 | 0.50-0.52 | 3.3 m | +95 to +110 deg (his right, a little behind; he turns away after 12.4) | 12 deg |
| 105509 @ 33.0-34.1 | front | 0.50 | 0.99 | 0.50 | 3.0 m | 0 to +5 deg | 12 deg |

Ours matched (`scripts/anim-sheet.mjs` view `cam`, new): the same FOV, pitch and azimuth, the distance and pivot scaled by
Wren's height (1.68 / 1.8 = 0.933: D 3.08 / 2.80 m, pivot 1.68 m), the frame 1160 x 800 (1.45). In the matched renders
Wren's head top sits at y 0.51 and her feet at 0.97 (side), 0.515 / 1.0 (front): within 0.02 of CT's.

The old sheets (`anim-sheet` side / front: 3 m, the camera 1.05 m high, level) were not CT's angle: a level camera at hip
height shows a walk upright and long-legged; CT's camera is 2.3-2.4 m up looking down 12 deg at the head, which shows the
back, the forward carry and the bent knees.

### Our gameplay camera against these clips (not changed in this step)
| item | CT (these clips) | ours (`src/config/camera.ts`) | difference |
| --- | --- | --- | --- |
| vertical FOV | 55.7 deg | `fov` 86 across at 16:9 = 55.3 deg | 0.4 deg: matches |
| pitch | 12 deg down | `startPitch` 0.21 rad = 12 deg | matches |
| pivot | the head top | `pivotStand` 1.68 m (Wren's head top) | matches |
| lateral | the hero at x 0.50-0.52 | `shoulderHip` 0.15 m (x ~0.46-0.48 at the open boom) | ~0.03 of the width: matches within the clips' spread |
| distance (open) | 3.0-3.3 m for a 1.8 m hero = 2.80-3.08 m for Wren | `boomOpen` 2.8 m | 0 to 9 % close (matches 105509, 105949 is 0.28 m further) |
So the gameplay camera is CT's within the spread of these two clips; the mismatch Michael saw was the comparison sheets'
camera, now fixed. Optional: `boomOpen` 2.8 -> 2.95 splits the two clips (not done: a gameplay change).

## 2. CT's key poses (105949, the side-high camera)
CT's walk here is our gear 3 pace: a step every ~0.32 s (passing at 12.133 and again ~12.45; ~3.1 steps a second) with
~0.65 m steps, so ~2.0 m/s (CT's walk gear, AUDIT-LOCOMOTION row 14). Our gear 3 is 2.1 m/s at 2.9 steps a second. The
keyed walk now covers gears 1-3 (it stopped at gear 2 before; CT's walk was being compared with our procedural brisk).

Phases (one step): passing 12.133 (feet together), up 12.200 (the front foot set ahead, the rear heel up), contact 12.300
(both feet down, widest), down 12.367 (the body over the front foot, the rear foot far back). Our phases for them (left
heel strike = 0, a 0.64 s cycle): contact 0, down 0.1, passing 0.75, up 0.85.

Measured in the image at the matched camera (so ours is measured the same way; angles are the picture's, not 3D):
torso pitch = the pelvis -> neck line from vertical (+ forward); heights in % of the head-top-to-sole height on screen;
arm hang = the upper arm from vertical (+ forward, the near arm); elbow / knee = the bend at the joint (0 straight);
thigh = from vertical (+ forward); ankle = the foot against the shin (0 square, + toes up); hand forward = the wrist
ahead of the pelvis in % of the stature. Points +-5 px of a ~330 px figure: heights +-2 %, angles +-5 deg (knees +-8).

Tolerance (stated before keying): torso pitch, upper arm angle and thighs +-5 deg; the front knee at contact and down and
the swing knee at passing +-10 deg; hand height +-5 % of the stature; head bob within 1.5 cm of CT's (~2 cm: the head top
moves 3.5 px of ~340 over the step, the camera following). Not held to CT, with the reason: pelvis height (a character
proportion: CT's hero sits his hips at ~38-41 % of his on-screen height, Wren at 49-51 % standing or walking, her legs are
longer), the elbow bend in the picture (the forearm swings toward the camera and foreshortens: +-20 deg) and the stance knee
at passing (the far leg is hidden behind the near one: not readable).

Per phase: CT / ours before (the procedural walk, gear 3) / ours after (round 2, keyed), the same camera. CT points:
`scripts/anim-keys/ct/walk-105949.json`; ours: the rig joints projected by the sheet (`SHEET_DUMP`); both measured by
`scripts/anim-keys/overlay.mjs` (through `pair.mjs`).

| item | contact | down | passing | up |
| --- | --- | --- | --- | --- |
| torso pitch (deg) | 7.5 / 10 / 10.4 | 7.7 / 10.7 / 10.3 | 10.2 / 10.7 / 10.5 | 9.3 / 10.2 / 10.5 |
| upper arm, near (deg forward) | 45 / 15.6 / 43.3 | 47.5 / 13.1 / 45.1 | 31 / 5.3 / 28.2 | 32 / 12.4 / 30.4 |
| elbow bend in the picture (deg) | 6 / 13 / 32 | 23 / 14 / 32 | 1 / 10 / 25 | 4 / 13 / 26 |
| hand (wrist) height (% stature) | 59.1 / 40.6 / 57.3 | 61.5 / 39.6 / 57.2 | 56.3 / 40.3 / 47.4 | 58.7 / 41.9 / 49.7 |
| hand ahead of the pelvis (% stature) | 22.5 / 20.1 / 32.9 | 19.5 / 19 / 34.3 | 21.4 / 12.9 / 27.6 | 19.9 / 17.8 / 28.5 |
| front knee bend (deg) | 56 / 41 / 45 | 52 / 36 / 59 | swing 65 / 60 / 68 | 46 / 24 / 59 |
| rear knee bend (deg) | 21 / 17 / 14 | 4 / 5 / 5 | stance 9 / 22 / 53 | 2 / 14 / 47 |
| front thigh (deg forward) | 45 / 45 / 47 | 50 / 31 / 43 | 38 / 30 / 21 | 41 / 33 / 49 |
| rear thigh (deg) | -27 / -24 / -27 | -35 / -28 / -36 | -12 / 6 / 24 | -22 / -11 / 4 |
| shoulder drop under the neck (% stature) | 10.2 / 9.1 / 8.8 | 10.8 / 9.1 / 8.9 | 9.3 / 8.2 / 9.3 | 9.4 / 8.4 / 9.0 |
| pelvis height (% stature) | 38 / 51 / 50 | 38 / 50 / 49 | 41 / 50 / 48 | 40 / 51 / 49 |

Head bob (3D, `measure.mjs`): CT ~2 cm; ours before 4.1 cm (gear 2), after 2.9 cm at gear 3 and 0.7 cm at gear 2.

## 3. What the keys do (round 2) and where it stands
Rounds, all at the matched camera (`pc/ct-work/frames/g8/r1` to `r11`):
- r1: the first heavier keys.
- r2: the arms. A hanging arm swings back with the chest's pitch, so its world angle is flex minus the chest pitch: flex
  raised to 52-56.
- r3-r6: the hands. They belong in front of the thighs, not across the body: r5 crossed them 3 cm from the midline, r6 put
  them back at 0.165 m.
- r7: the pelvis carried 6 cm forward bent the front knee to CT's 59 deg, but the head bob went to 6.9 cm (the rear leg's
  reach).
- r8-r10: a 2.5 cm forward carry and a flat low pelvis (-7.0 to -7.6 cm): head bob 2.9 cm at gear 3.
- r11: a smaller arm carry moved the arm angle out of tolerance (-8 deg) for little hand gain. Back to r10, the final keys.

Within tolerance (r10): torso pitch (+0.3 to +2.9 deg), upper arm (-2 to -3), hand height at contact / down (-2 / -4), the
front knee at down (+6), the swing knee at passing (+3), the front thigh at contact (+2), the rear thigh at contact / down
(-1), shoulder drop, head bob (2.9 vs ~2 cm).

Outside it:
- The front knee at contact (45 vs 56, -11): our front foot lands further ahead of the knee. Carrying the pelvis further
  forward fixes it but costs 4 cm of bob (r7).
- The hand height at passing / up (-9): Wren's arm swings back further than CT's near arm there.
- The hand ahead of the pelvis (+6 to +15 %): partly proportion, partly CT's pelvis point on the belt. The upper arm angle
  matches.
- The stance knee at passing / up: ours 47-53 deg, CT's not readable. Michael's "softly bent" is nearer 25-35; the pelvis 7 cm
  low is what keeps the gear 3 bob down.

What changed in code (round 2):
- `scripts/anim-keys/keys/walk.json`: the pelvis 7.0-7.6 cm low and 2.5 cm forward, tilted 8 deg; spine 9, chest 11, neck 9
  deg (the head carried forward); arms flex 38-54 deg in the chest frame (27-43 deg ahead in the world), elbows bent 20-26,
  the forearms turned 18 deg in, the hands in front of the thighs; swing lift 0.06 -> 0.075 m.
- `scripts/anim-keys/py/key_clip.py`: the forearm's `inward` turn.
- `src/anim/animGraph.ts`: the keyed walk covers gears 1-3 (`KEYED_WALK_BAND` from 1.2 -> 2.15 and to 1.8 -> 2.75 effort,
  `full` 2.0: CT's walk is our gear 3). It holds through walking turns: the spin gate now acts only below ~0.7 m/s (letting go
  mid-turn lifted the head 8 cm).
- `scripts/anim-sheet.mjs`: view `cam` (the matched camera), `SHEET_PHASES`, `SHEET_DUMP` (frames and projected joints),
  `SHEET_NOKEY` (the procedural walk for the before row), scenario `walk3` (gear 3, 2.1 m/s).
- New `scripts/anim-keys/overlay.mjs`, `pair.mjs`, `ct/walk-105949.json` (CT points by eye); `measure.mjs` scenario `walk3`.
- Tests:
  - `g1Locomotion`: walk mid-stance knee <= 22 -> 25-55 deg (Michael 10:55: CT's knees stay bent through; the old bound was
    G1's "CT near straight" reading).
  - `keyedWalk`: wrists from 5 cm inside to 9.5 cm outside the shoulder line, elbows ahead of the shoulders, swing 0.08-0.25
    m, counter swing > 5 cm, the pelvis mean under -5 cm and forward, the rig's arm within 3 cm.

Sheets:
- `shots/g8/walk-proof-2/walk-side.jpg` (105949, side-high) and `walk-front.jpg` (105509, front): rows CT / before / after at
  the same camera, 12 frames at 12 fps.
- `overlay-contact.jpg`, `overlay-down.jpg`, `overlay-passing.jpg`, `overlay-up.jpg`: ours (magenta joints, semi-transparent
  body) over CT (green points), each with its numbers.

Not done: jog, run, crouch walk, crouch run, crouch idle, the wall knee hand (after Michael's verdict on this walk).
