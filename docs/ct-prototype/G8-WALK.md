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

## 4. Round 3 (Michael 12:20: "Closer, fix arms + knees")
Orchestrator's read of round 2: the posture and the forward pitch are right, but the arms reach forward like a zombie, and
the bent stance knee with the 7 cm low pelvis reads as a crouched walk. Same method (matched camera, the same CT points,
our own keys).

### Arms: fixed
The hands came back to CT's place in front of the hips. Each arm is carried forward 32-45 deg in the chest frame (21-34 deg in
the world). The elbows are bent 12-16 deg (CT's elbow in the picture is 1-22). The forearms are turned 10 deg in. In 3D:
- wrists 0.206 m from the midline, beside the thighs (round 2 had them 0.165 in front);
- elbows 1.9 cm out of the shoulder line.

| item | contact | down | passing | up |
| --- | --- | --- | --- | --- |
| hand ahead of the pelvis, CT / r2 / r3 (% stature) | 22.5 / 32.9 / 29.6 | 19.5 / 34.3 / 30.6 | 21.4 / 27.6 / 23.3 | 19.9 / 28.5 / 24.6 |
| upper arm, CT / r2 / r3 (deg forward) | 45 / 43 / 35 | 47.5 / 45 / 36 | 31 / 28 / 22 | 32 / 30 / 24 |
| elbow in the picture, CT / r2 / r3 | 6 / 32 / 18 | 23 / 32 / 18 | 1 / 25 / 15 | 4 / 26 / 16 |

Three rows to read with the numbers:
- **Hand forward** is in tolerance at passing and up (+2 / +5). At contact and down it is +7 / +11. The CT pelvis point sits
  on the belt, so this reading carries a bias.
- **The upper arm angle** is now 10 deg under CT's reading. I chose the hand's position over the arm's angle: the angle
  depends on where the shoulder joint is placed under CT's large shoulder pad, and matching it is what gave the zombie reach.
- **The elbow bend** is within CT's spread.

### Knees and bob: a trade-off, not within tolerance together
The pelvis offset and the planner's stance share (duty) are the two levers. Measured in game at gear 3 (2.1 m/s):

| round | pelvis (cm) | duty | stance knee (3D, deg) | head bob (cm) | both feet off the floor | front knee at contact (picture, CT 56) |
| --- | --- | --- | --- | --- | --- | --- |
| r10 (round 2) | -7.0 to -7.6 | 0.54 | 46 | 2.9 | 0 % | 45 |
| r16 | -3.2 to -3.8 | 0.53 | 36 | 5.4 | 0 % | 43 |
| **r17 (round 3)** | **-4.8 to -5.4** | **0.54** | **40 (gear 2: 34)** | **4.3 (gear 2: 1.5)** | **0 %** | **40** |
| r15 | -2.4 to -3.0 | 0.46 | 32 | 3.1 | 8 % (a run's flight) | 38 |
| r7 | -7.0 to -8.0, 6 cm forward | 0.54 | - | 6.9 | - | 59 |

- **The bob comes from the foot planner.** At double support the legs must reach world-locked feet about 0.69 m apart, so the
  hips drop. A higher pelvis (a softer knee) lets that drop show as bob.
- **The timing lever fails.** An earlier toe-off (duty under 0.54) takes the bob away, but it lifts both feet at once (8 %
  of the time at 0.46, 4 % at 0.5), which is a run, not a walk.
- **The front knee at contact moves with the bob.** It bends to CT's 56 deg only with the pelvis carried forward, and that
  costs 4 cm more bob (r7).
- **The camera pivot was not touched** (G29: no camera bob).
- **Round 3 takes the middle:** the stance knee 40 deg at gear 3 and 34 at gear 2 (down from 46), the bob 4.3 cm at gear 3 and
  1.5 at gear 2 (CT about 2; the procedural walk was 4.1 at gear 2), the front knee at contact 40 deg.

The next step that would get all three is not a key: it is the stride. CT steps about 0.65-0.67 m at about 3.1 steps a
second; our gear 3 steps 0.72 m (contact split 0.69) at 2.9. Shorter steps at gear 3 shrink the double-support drop, so the
pelvis can sit higher (soft knees) without the bob, and the front foot lands nearer the knee (a bent knee at contact). That
lives in the motion driver's step length (`stepLength`, procedural: every gait). It is not changed here; it needs a gate to
the keyed walk or Michael's go-ahead.

### Changes (round 3)
- `scripts/anim-keys/keys/walk.json`: pelvis -4.8 to -5.4 cm (was -7.0 to -7.6) and 1.5 cm forward (was 2.5); arms flex 32-45 (was 38-54),
  elbows 12-16 (was 20-26), forearms turned 10 deg in (was 18), abduction 4.
- `scripts/anim-keys/measure.mjs`: `flight`, the share of time with neither foot planted.
- `tests/keyedWalk.test.ts`: the pelvis mean between -7 and -3 cm (round 2: under -5).

Sheets, `shots/g8/walk-proof-3/`:
- `walk-side.jpg` and `walk-front.jpg`: rows CT, round 2, round 3, at the matched camera;
- `overlay-contact.jpg`, `overlay-down.jpg`, `overlay-passing.jpg`, `overlay-up.jpg` (round 3).

Checks: tsc and eslint clean; 13 vitest files (156 tests, G7 holds and door-peek parity included) pass; e2e-anim, e2e-move,
e2e-clip, e2e-wall, e2e-traverse and e2e-takedown pass on the round 3 build (port 4195, serial).

## 5. Round 3b: CT's stride (A4, footage wins)
Coordinator (after round 3): shorten the step at walk speeds only, toward CT's ~0.66 m at gear 3, so the cadence rises toward
CT's ~3.1 steps a second; the jog, run and sprint strides stay. Then re-key the knees and keep the bob ~2 cm.

### The stride
- `src/anim/motion.ts` `WALK_STEP` (k 0.17, to 2.1 m/s, blend 3.0 m/s). The player's standing step is `stepLen0 + 0.17 v`
  up to 2.1 m/s, then blended back to `0.3 + 0.2 v` by 3.0 m/s, so the jog at gear 4 and the run are unchanged.
- Gear 3 (2.1 m/s): 0.72 -> 0.657 m, 2.9 -> 3.2 steps a second (CT ~3.1 at ~2 m/s). Gear 2 (1.4): 0.58 -> 0.54. Gear 1
  (0.75): 0.45 -> 0.43.
- Standing only: the stance's crouch blend fades it out, so crouched steps keep 0.3 + 0.2 v until their own clips.
- Guards (ENEMY_MOTION) are unchanged.
- A pure function of speed and stance, so owner and remote count the same clock with no wire change:
  - the owner's driver gets the crouch blend through `MotionInput.crouch` (`playerController.ts`, the rig's `crouchBlend`);
  - the graph (a remote's clock, and the planner's cycle time) passes its own `i.crouch`.

### Re-keyed (final keys r19)
Pelvis -4.2 to -4.8 cm (round 3: -4.8 to -5.4) and 1.6-2.2 cm forward; duty 0.54. Arms as round 3.

| item (gear 3 unless named) | CT | round 2 | round 3 | **round 3b** | tolerance | in? |
| --- | --- | --- | --- | --- | --- | --- |
| head bob (3D, cm) | ~2 | 2.9 | 4.3 | **3.2** (gear 2: 1.0) | +-1.5 | yes |
| stance knee (3D, deg) | soft | 46 | 40 | **36** (gear 2: 32) | - | softer |
| front knee at contact (picture, deg) | 56 | 45 | 40 | **33** | +-10 | **no** |
| front knee at down | 52 | 59 | 53 | **48** | +-10 | yes |
| swing knee at passing | 65 | 68 | 63 | **64** | +-10 | yes |
| knee at up | 46 | 59 | 50 | **51** | +-10 | yes |
| torso pitch | 7.5-10.2 | 10.3-10.5 | 10.3-10.5 | **10.3-10.5** | +-5 | yes |
| hand height contact / down (% stature) | 59 / 62 | 57 / 57 | 50 / 50 | **51 / 50** | +-5 | **no** (-8, -12) |
| hand ahead of the pelvis contact / passing | 22.5 / 21.4 | 33 / 28 | 30 / 23 | **29 / 23** | (bias) | passing yes |
| upper arm contact / passing (deg) | 45 / 31 | 43 / 28 | 35 / 22 | **34 / 22** | +-5 | no (-11, -9) |
| both feet off the floor | 0 | 0 | 0 | **0 %** | 0 | yes |
| cadence at gear 3 (steps a second) | ~3.1 | 2.9 | 2.9 | **3.2** | +-0.3 | yes |

Not within tolerance:
- **The front knee at contact** (33 vs 56): the shorter step lands the front foot sooner, its leg still reaching. It bends
  only with the hips carried further forward over it, and every 1.5 cm of that carry cost ~0.8 cm of bob (NullEngine sweep).
- **The hand height and the upper arm angle**: the round 3 trade (the hand placed in front of the hips, no zombie reach)
  kept on purpose.

Everything else is within tolerance, and the head bob dropped from round 3's 4.3 cm to 3.2.

Tests (A4):
- `g1Locomotion`: `stepLength(2)` 0.7 -> 0.64; new checks that gear 3 is 0.657 m at 3.0-3.3 steps a second, and that
  crouched steps and gear 4 keep 0.3 + 0.2 v; the crouched cycle-time check passes the crouch.
- `motion.test` (walk step 0.5-0.65 m), `turnFollow`, `footPlanner` pass unchanged (they use the function).
- No e2e asserts a step length or cadence.

Checks: tsc and eslint clean; 15 vitest files, 202 tests pass; e2e-anim (walk foot lock), e2e-move, e2e-clip, e2e-wall,
e2e-traverse, e2e-takedown and e2e-netmove pass (port 4195, serial, the heavy lock taken only when free).

Sheets, `shots/g8/walk-proof-3b/`:
- `walk-side.jpg`, `walk-front.jpg`: rows CT, round 3 (0.72 m steps), round 3b (0.66 m), at the matched camera;
- `overlay-contact.jpg`, `overlay-down.jpg`, `overlay-passing.jpg`, `overlay-up.jpg` (round 3b).
