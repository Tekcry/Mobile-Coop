# Chaos Theory movement: research, comparison and change plan (M19)

For Michael, after play test 2 (PLAY-NOTES P1-P16). Written 2026-10-17 from the five research files in
`docs/locomotion/research/`. Nothing here is decided until Michael answers Section 3; then DECISIONS.md and the
step files are rewritten to match.

How to read the citations:
- **L** = `research/ct-locomotion.md`, **W** = `ct-walls-doors.md`, **T** = `ct-traversal-combat.md`,
  **F** = `thermal-flir.md`, **C** = `current-code.md` (our code today). The key after it is that file's source id.
- **Source** = a manual, review or developer write-up says it. **Inference** = a reading of the sources, not stated.
  **Unverified** = memory of the game, no source. **SC1** = from the original Splinter Cell (2002) code. CT was built
  by the same studio on the same engine, so SC1 numbers are a starting point, not CT's real values.
- No source gives any CT timing in seconds. Every CT number below is either SC1 or Inference.
- Jargon: **IK** = the game places a foot or hand on a target and bends the leg or arm to reach it. **Capsule** =
  the invisible shape that really moves and collides; the body is drawn on top of it. **Boom** = camera distance
  behind the player. **MoveState** = the pose summary sent to co-op partners.

## 1. Summary

The five biggest differences:
1. **Stops.** CT freezes the hero mid-stride, drops the swinging foot and lets the hips settle with a small bounce. That
   frozen pose is the idle. We slide to a stop and blend to a stock idle (P1). Night Shift 3.2.0 had the freeze;
   step 22 removed it.
2. **Posture.** We hunch about 33 deg forward when standing and about 62 deg when crouched. Sources describe CT
   only as "knees slightly bent", with nothing about leaning forward (P1, P4).
3. **Turns.** CT turns the body smoothly, slower at speed, banks into turns and steps round on the spot. We snap the
   heading from rest, turn at 720 deg/s and twist the legs against planted feet (P3).
4. **Walls.** CT is a plain back-to-wall for hiding. It has no shooting from the wall and no SWAT turn. We built a
   flat-back pose with a lean-out aim, and it clips, bends the head the wrong way and stands fully up over low cover
   (P6-P9).
5. **Aim camera and shoulder swap.** CT aims from a tight over-the-shoulder view, and the shoulder button moves the
   gun to the other hand. Our aim boom is 1.5 m and the swap moves only the camera (P15, P16).

**Recommended direction:** keep our speeds, gears and verbs. Change the body: the CT frozen-stride stop, an upright
posture, smooth stepping turns, a sideways shoulder-to-wall stance, a close aim camera and a real weapon-hand swap.
Then fix doors, the strike, thermal and remapping. A new body step goes before 22b, a wall rework replaces the pose
parts of 21w and 27, and step 24 (camera) takes P15 and P16.

## 2. Comparison by area

### 2.1 Locomotion

| Topic | CT | Night Shift now (C) | Gap | Note |
| --- | --- | --- | --- | --- |
| Speed control | Pad: stick depth sets speed. PC: mouse wheel steps it. Five speeds standing and five crouched. No sprint key (Source, L S1 S7 S9). | 6 gears standing and crouched, rocker or wheel, sprint = gear 6. Analog stick snaps to gears (C 1). | We add a sprint gear. Otherwise the same model. | P2 "speeds are good" |
| Top speeds | SC1: run 4.2, walk 1.2, crouch run 3.0, crouch walk 0.6 m/s (SC1, L S2). | Standing 0.65-4.15, crouched 0.42-2.3 m/s (C 1). | Close at the top. Our crouch is slower. | P2 good, no change |
| Start | SC1: acceleration 20 m/s2, so about 0.2 s to full run (SC1, L S2). CT resumes the gait from the held stop frame (Source, L S4). | Spring: 95% speed in 0.3 s (C 1). The gait restarts from the idle. | The start time is fine. The resume-from-frozen-frame is missing. | P1 |
| Stop | Freeze the cycle on its current frame (slowed at a rate set by momentum). IK-drop the swinging foot. Settle the hips with a slight overshoot "in non-duress situations". Crouch: frozen frame plus breathing (Source, L S4 S5). | Stick latched 0.15 s, then a slide (about 0.36 m from a sprint), a closing step, and a blend to idle (C 1). | This is the "mid animation" Michael misses. | P1 "stop mid animation when walking / crouching, not sprinting" |
| Turns, moving | SC1: about 440 deg/s, damped, dropping to 75% at a full run. Velocity turns with the body, so momentum carries round. Body banks up to about 11 deg (SC1, L S2). CT locks the feet during the weight shift (Source, L S4). | 720 deg/s (accel 240 rad/s2). Turn inertia only above 0.4 m/s. Reversal pivot above 1.2 m/s (C 1, 2). | Twice as fast, no bank, no foot lock. | P3 "snap", "reverse at run works" |
| Turns, in place | SC1: a looping step-turn clip when the body yaws faster than about 55 deg/s, mirrored for left (SC1, L S2). | Standing: the body holds facing while the camera orbits. From rest, the heading snaps to the stick. Aiming: the hips turn 360 deg/s while the feet stay planted, about 122 deg of twist per step (C 2). | Snap from rest. Leg twist ("bendy legs"). No step-turn. | P3 "legs go bendy and confused" |
| Posture | Legs slightly bent (Source, L S4). No source describes the torso. An upright spine is Inference. | HUNCH carriage: spine +28.6 deg, so the chest is about 33 deg forward standing, 62 deg crouched, 38 deg at a sprint (C 3). | We are far more bent over. | P1, P4 "stand up straight" |
| Lean | SC1 banks into turns. No CT source on an acceleration lean (L S2). | Acceleration lean capped at 0.09 rad: "barely visible" (C 3). | Weight in CT comes from the pose (stop settle, bank, foot lock), not from a lean (Inference, L S4). | P1 "can't tell there's a lean" |
| Arms | Weapon drawn on demand (Source, L S1 S3), so arms are free while walking. "Slowly moves his hand to his knife" near enemies (snippet only, L). | M14 relaxed arms, swing 0.06 m per m/s, cap 0.15 m (C 3). | Arms match CT. They look wrong because of the hunch. | P1, P4 "arms work" |
| Crouch | Toggle. "Slower, but quieter, less visible" (Source, L S1). SC1: one transition clip, 1.2x rate (SC1). | Toggle. Crouched gears 0.42-2.3 m/s. | Same. Our crouch pose has a 62 deg chest. | P1 |
| Roll | Hold crouch while running. SC1: 3.5 m/s, little steering, ends in a crouched jog (Source L S1, SC1 L S2). | Crouch tap at gear 5-6: 0.7 s, 3 m, 2 m noise (T 1). | Input differs (hold vs tap). Same move. | - |
| Jump | Free jump (in place = straight up, moving = forward with a lead-foot clip), low air control (Source L S1, SC1). | Y is contextual. No free jump (T 1). | A deliberate difference (bible 5.3). | - |
| Landing | SC1: crouch held = quiet landing; hard landing from about 2.9 m; damage from about 8 m (SC1, L S2). | Soft / roll / heavy bands with noise (bible 5.3). | Same in kind. | - |

### 2.2 Camera

| Topic | CT | Night Shift now (C 7) | Gap | Note |
| --- | --- | --- | --- | --- |
| Explore | Third person, "slightly over your shoulder", the hero near the screen centre. It swings side to side automatically toward where you look (Source, L S11 S12 S15). FOV 75 Hor+ (snippet, L S17). | Boom 2.2 m, shoulder 0.62 m, FOV 75 Hor+, no bob. Auto shoulder swap planned in step 24 only when one side is blocked (A12). | We sit wider (bible 5.3: whole body in frame). There is no automatic side swing by look direction. | Bob "works well" |
| Aim | A separate, tighter over-the-shoulder mode. SC1 turns at half speed while aiming and strafes at walk speed. The sniper scope is first person (Source L S11 S23, SC1 L S2). Exact offsets are unsourced. | ADS boom 1.5 m, shoulder 0.58 m, FOV x0.75. | Far wider than CT. | P15 "from shoulder, much closer" |
| Shoulder swap | A button, **only while aiming**. "[The hero] can move the gun to the other side of his body", changing hands (Source, L S1 S6 S13). Separate from the exploration side swing. | Moves the camera only. The weapon stays right-handed, except at left wall edges (D9) (C 7). | The weapon does not change hand. | P16 "should be a realistic change" |
| Wall peek | The camera swings out past the corner (Unverified, W 2). | The pivot swings 0.6 m to the edge and turns up to 25 deg over 0.45 s (C 4). | Michael "can't see around the corner". | P7 |

### 2.3 Walls and corners

| Topic | CT | Night Shift now (C 4) | Gap | Note |
| --- | --- | --- | --- | --- |
| Entry | Click the stick or press Q, standing or crouched. Purpose: less visible (Source, W M-CT). | Context press only (A83), 0.9 m / 100 deg cone. | Same. | P6 "cover works" |
| Stance | Literally back to the wall (Source, W M-CT). Flat back with the head on the wall is Unverified. Real operators stand bladed 30-60 deg and do not hug walls (Source, W 7). | Flat back within 3 cm of the face, chest pitch about -0.02. | Michael and real practice both want a sideways stance. | P6 "sideways ... back / shoulder on the wall" |
| Slide | Speed by stick or wheel. SC1 back-to-wall 1.3 / 0.75 m/s (SC1, L S2). | 0.9 / 0.6 m/s shuffle (M14). | Fine. P7 notes "an awkward lean when moving". | P7 |
| Peek at an edge | Head and shoulder toward the opening (Source, W M-SC1 M-PT). The head never turns away from it (Inference). | Head 0.25 m, rig lean 0.45. The head bends the wrong way depending on the look. | Head clamp missing. | P7 "head bends the wrong way" |
| Shoot from the wall | **Removed in CT.** "The ability to shoot around corners has been removed", replaced by switch shoulder off the wall (Source, W W-CT TE-R). | Lean-out aim, 85 deg arc, body 0.35 m past the edge, D9 open-side hands. | We have a PT feature CT cut. | P9 "clipping, doesn't lean out enough" |
| SWAT turn | **Not in CT** (PT only) (Source, W GS-R). | Built (step 12, A24). | We have a PT feature CT cut. | - |
| Low cover | Crouched back-to-wall. Aiming crouched means aiming crouched; no auto stand (Inference, W 3). Real: one knee down, rise only enough for eyes and muzzle (Source, W 7). | Aiming mid-wall stands FULLY up (capsule 1.15 to 1.75 m). The end lean is crouched with the head capped. | Far too tall. | P8 "only just lean over" |
| Crouch on a high wall | CT has a crouched back-to-wall (Source, W M-CT). | Works (21w). | The pose is awkward. | P8 |

### 2.4 Doors

| Topic | CT | Night Shift now | Gap | Note |
| --- | --- | --- | --- | --- |
| Stealth open | "You can make [the hero] open / close the door as fast as you want by playing with the left thumbstick" (Source, W M-CT). SC1 peek: forward goes through, back closes (Source, W M-SC1). | Crack 12% over 0.6 s. Stick in = opens fully. Stick back 0.2 s = closes (C 5). | The door angle does not follow the stick. | P10 "push the door open slowly ... walk backwards to slowly close" |
| Bash | Kicks through. Knocks out a guard behind (Source, T S4 S6, W GS-R). | Bash at a sprint 0.22 s. No knockout (T 2). | A missing knockout. | - |
| Guards | Notice "doors being left open" (Source, W W-CT). | A cracked door counts as closed (A25). | No open-door awareness. | - |
| Lockpick, optic cable | Stick lockpick. Optic cable under doors (Source, W 5). | Not in this run (gadgets). | Out of scope. | - |

### 2.5 Close combat

| Topic | CT | Night Shift now (T 2, C 6) | Gap | Note |
| --- | --- | --- | --- | --- |
| Strike | Offered "when near an enemy". A palm or knee strike, "immediate KO", any side, any awareness. You can rush in (Source, T S2 S3 S5 S7 S9 S13). Speed "instant" (Source); about 0.2-0.3 s to contact (Inference). | Elbow: 0.15 s wind-up, contact at 0.5 s, 0.9 s total, reach 1.2 m. Starts with no target (a whiff). An aware guard facing you is only staggered (bible 5.4). | Slower, whiffs allowed, a stagger table. | P5 "too slow, shouldn't work unless in range" |
| Lethal | Knife on the other trigger, "instantly fatal" (Source, T S5). | Hold on a contextual takedown. The knife is Phase 6. | Covered differently. | - |
| Grab, shield, carry | Grab, shield, interrogate, carry, throw over a ledge (Source, T S1 S2 S3). | Grab, shield, carry. No ledge throw. No interrogation (Phase 6). | Ledge throw missing. | - |

### 2.6 Traversal

| Topic | CT | Night Shift now (T 1) | Gap |
| --- | --- | --- | --- |
| Ledges, pipes, ladders, ziplines, ducts, rappel | All present (Source, T S1 S2 F3). | All present, plus fences and windows. | None in kind. We meet or beat CT. |
| Split jump | Look at the wall and hold jump (Source, T F1). | World prompt + Y. | Input only. |
| Half-split jump | One leg bent, for narrow gaps (snippet, T F2). | Missing. | Small, later. |
| Wall jump | Jump-then-jump timing, can land on furniture (Inference, T F11 S18). | Prompt, always ends in a hang. | Input only. |

### 2.7 Co-op

| Topic | CT | Night Shift now (T 3) | Gap |
| --- | --- | --- | --- |
| Team moves | Two spies, one button, "signal, partner finishes" (Source, T S6 S8). Boost, human ladder, hang over teammate, tomoe nage throw, dual rappel, back-to-back, heal (Source, T S11). | Brace, boost, human ladder, dual takedown. 2-4 players. | Hang over teammate, tomoe nage and dual rappel missing. These are Phase 5 (PLAN H4), not this run. |
| Body feel | - | D8: remotes pose from MoveState plus velocity. | Every body change in Section 4 must also run on remotes. |

### 2.8 Vision and thermal

| Topic | CT | Night Shift now (F 6) | Real FLIR (F 1-3) | Note |
| --- | --- | --- | --- | --- |
| Look | Colour ramp, purple to red (snippet, F 4). No source says it sees through walls. | Blue-grey to white. Fed from the **lit** image, so lamplight reads as heat. | Heat only. Light and shadow do not exist. White Hot greyscale is the military look. | P11 |
| Blur | - | About 1 px sigma at 1080p. | About 2 sensor px of optical blur. Softer than ours. | "much more blurry" |
| Range | - | No falloff. Far walls are crisp. | Rooms go flat and grey (low contrast plus gain). Bodies stay readable. Air does not matter indoors. | "difficult to see very far ahead" |
| Glass | - | Transparent: shows warm bodies behind it. | Glass is opaque to thermal. | A26 must hold |

### 2.9 Controls

| Topic | CT (Source, L S1, W W-CTRL) | Night Shift now | Gap | Note |
| --- | --- | --- | --- | --- |
| PC layout | W/A/S/D, wheel = speed, C crouch (hold while running = roll), Shift jump, Q back to wall / switch shoulder, E use / equip. | Pad first (D1). Rocker / wheel sets the gear. Sprint held. Context button for the wall. Y contextual. | CT shares one button for wall and shoulder swap. We could do the same. | - |
| Remap | - | A71: a shared binding warns and saves; both verbs fire. | P12 wants it blocked, with a prompt to rebind the other verb. | P12 |
| CT flaw | Diagonal keys run "one notch faster" (Source, L S8). | Normalised. | Do not copy. | - |

## 3. Conflicts with earlier decisions: questions for Michael

**Q1. Corner shooting and the SWAT turn (D9, D10, A24, steps 12 / 12b, bible 5.3).** CT removed both. You shoot a corner
by stepping off the wall, aiming and swapping shoulder.
- (a) Keep both, rework the lean pose (Q3). (b) Keep the lean-out aim, remove the SWAT turn. (c) CT-pure: remove both
  and rely on the shoulder swap (P16).
- **Recommend (a).** Both are built and tested, your P8 / P9 notes ask for a better lean, not none, and bible 5.3 lists
  them. The bladed stance fixes most of the clipping.

**Q2. Stops (P1 vs M14 / M17's 0.25 s eased stop for every gear).**
- (a) Gears 1-4 (all crouched and walking speeds): the capsule stops in about 0.1 s and the body freezes mid-stride,
  CT style. Gears 5-6: keep a short braking stop (0.25-0.3 s, at most 0.6 m) that ends in a held pose, not a stock
  idle. Starts keep the 0.3 s ramp and resume the gait from the held frame. (b) Freeze the pose but keep the 0.25 s
  capsule stop at all gears (the feet would slide). (c) Freeze at every gear.
- **Recommend (a).** It is CT's documented method, it is what you asked for ("just not when sprinting"), and it
  is what bible 5.12.1 said before M14.

**Q3. Wall stance (left open by M19).**
- (a) Sideways shoulder-to-wall, standing and crouched: bladed 30-60 deg, the wall-side shoulder and upper back on
  the wall, knees soft, head toward travel or the edge. (b) CT-literal flat back, polished. (c) Flat back while
  sliding, turning sideways only at edges.
- **Recommend (a).** You asked for it (P6). Real practice backs it. It fixes P7 and P9 at the source: the body
  already faces the edge, so the head and gun lead the right way. Gameplay does not change, because stealth reads
  light and collision, not the pose.

**Q4. The strike (P5 vs bible 5.4).**
- (a) In range only and faster (contact about 0.25 s, about 0.6 s in all, acquire 1.6-2.0 m with a closing step),
  but keep the stagger on an aware guard facing you. (b) Full CT: also a one-hit knockout from any side at any
  awareness. (c) As (b), but heavies still only stagger.
- **Recommend (c).** CT is one hit. With no whiffs, the stagger is the strike's only risk left, and heavies keep a
  reason to sneak. Also: should it become a **palm strike** (CT's move) rather than an elbow? Recommend yes; it is
  only an animation change.

**Q5. Thermal at range (F 5.3).** A guard in open view keeps at least (a) 25% contrast, a dim smudge at 40 m, or
(b) 10%, so bodies past about 30 m nearly vanish.
- **Recommend (a).** Thermal is the mode for finding people. The falloff should hide rooms, not guards. Also
  confirm: White Hot greyscale instead of today's blue tint, and a thin dark halo round hot bodies (this reverses
  PC-PASS row 46 "no halo").

**Q6. Remap (P12 vs A71 / A30).**
- (a) Block a binding that is already used, and open a prompt at once to rebind the other verb. Rows that share an
  input by design (Y, context, X tap / hold, fire / strike) stay one row each, so they never conflict. (b) Keep
  A71: warn and save.
- **Recommend (a)**, as you asked.

**Q7. Turn rate (720 vs about 440 deg/s, D5 "control stays instant").**
- (a) SC1 model: about 440 deg/s, smoothed, down to 75% at a run. Velocity follows the body, so sharp turns curve. A
  bank of up to about 10 deg at a run. A stepping turn on the spot. Keep today's reversal pivot. (b) Keep 720 deg/s
  and fix only the leg twist.
- **Recommend (a).** The snap is half of P3. 440 deg/s is still quick, and bible 5.12.1 already wants anything
  over 360 deg/s shown as a step.

**Q8. Sprint and gears (bible 5.3 locks 6 gears plus sprint; CT has 5 and no sprint).**
- (a) Keep 6 gears and sprint. (b) Drop sprint to match CT.
- **Recommend (a).** You said the speeds are good. Sprint is the only gear that keeps a braking stop (Q2).

**Q9. Posture (D5.6 "trained posture" and the HUNCH carriage vs P4).**
- (a) Upright spine, level head, soft knees. A small forward lean only while accelerating or at a sprint. Crouched:
  a low crouch with a straight back, not a fold. (b) Keep a reduced hunch only while the weapon is drawn.
- **Recommend (a) for holstered and (b) for aiming.** A forward weight over the gun is real shooting stance.
  Walking about hunched is not.

**Q10. Doors (P10 vs A25 "a cracked door counts as closed").** If the door angle follows the stick, does a
part-open door let light, sound and guard sight through?
- (a) Yes, by angle: past about 15% open, it is open for light and sight. Guards notice a door left open, like CT.
  (b) No: any angle short of full counts as closed.
- **Recommend (a).** It is the CT rule, and it gives the slow push real risk. It needs host-owned door angles in
  co-op.

**Q11. Exploration camera side swing.** CT swings the camera to the side you look automatically.
- (a) Add a gentle automatic swing on the exploring camera only. The aim camera keeps a manual swap. (b) Keep it
  manual, plus A12's swap when one side is blocked.
- **Recommend (a)**, but small and slow. Tune it by eye on the CT clips (Section 5).

**Q12. Play test timing.** Pause for play test 3 after the body and wall steps (Section 4: after 24w), or also once
after 22c?
- **Recommend one pause after 24w**, as M15 preferred. Add an early one after 22c only if you want to check the
  frozen stop before the rest is built on it.

## 4. Ranked change plan

Ranked by impact on "feels like CT". Size: S = under a day of agent work, M = one step, L = a big step. Every item
also runs on remotes (D8) and passes the anim-audit, netmove and perf budgets.

| # | Change | Answers | Size | Step | Depends on |
| --- | --- | --- | --- | --- | --- |
| 1 | **CT frozen-stride stop.** Gears 1-4: the capsule stops in about 0.1 s while the cycle slows to its current frame and holds. IK drops the swinging foot where it is. The hips settle with one small overshoot (not when alert). Breathing only. The next start resumes from that frame. Gears 5-6: a braking step, then a hold. Remotes freeze their own gait clock. | P1, P2, P14 | M | **new 22c** | Q2 |
| 2 | **Upright posture.** Remove the HUNCH carriage when holstered. Chest about 5-8 deg forward standing (game value), crouch with a straight back. The lean grows only with acceleration and sprint. The arms then hang naturally from the existing M14 swing. | P1, P4 | S-M | **22c** | Q9 |
| 3 | **Smooth turns.** About 440 deg/s, smoothed, slower at speed. Velocity follows the body. A bank in turns. A looping step-turn on the spot, mirrored for left, that replaces the snap from rest and the aiming leg twist. Hip-to-foot twist capped (about 45 deg, game value), and feet locked during the weight shift. Keep the reversal pivot. | P3, P2 | M-L | **22b (revised)**: turns plus the old 22b items (quick 180, stride warping, breathing, carried rows) | 22c, Q7 |
| 4 | **Sideways wall stance**, standing and crouched. Bladed 30-60 deg, wall-side shoulder on the wall, a 10-15 cm body gap (no clipping), and the slide lean removed. | P6, P9 | L | **new 24w** (replaces 21w's leftovers and 27's wall-pose part) | Q3. Tune with Wren proxy volumes (pack on the back), recheck when Wren lands (M18) |
| 5 | **Corner peek and lean fix.** The head yaws and leans only toward the opening, never back over the wall shoulder. The lean pivots on the outer foot and goes far enough for the eye and muzzle to clear the edge. The peek camera slides past the edge onto the edge-side shoulder. | P7, P9 | M | **24w** | 24 (camera solver), Q1 |
| 6 | **Low cover.** Aiming over the top = a half rise (high kneel): the eyes and muzzle just clear the top, the hips stay low, and the capsule grows only that much. The end lean goes further, with the edge-side knee down. | P8 | M | **24w** | D10 text updated |
| 7 | **Close aim camera.** A shoulder framing about 0.9-1.1 m boom (game value, tune against CT clips). Turning while aiming slowed (SC1: half speed). A walk-speed strafe already exists. | P15 | M | **24 camera** | - |
| 8 | **Shoulder swap moves the weapon.** Generalise D9's mirrored grips (left-hand pistol, left-shoulder rifle) from wall edges to all aiming. A real transfer: pistol hand-to-hand with the muzzle on target; rifle pushed off one shoulder and the hands trade places. Camera in 24, hands in 25. Needs an aim-side MoveState bit. | P16 | M | **24** (camera) + **25** (hands) | Wren (M18) for grips. A protocol bump |
| 9 | **Strike.** Starts only with a target in range (the host denies otherwise), faster, a closing step, and the result table per Q4. Bible 5.4 updated. | P5 | S | **new 24q** (quick fixes) | Q4 |
| 10 | **Stick-driven doors.** The door angle follows the stick: forward opens slowly, back closes, release holds. Noise scales with door speed. Light and sight per Q10. The host owns the door angle. Bash knocks out a guard behind (CT). | P10 | M | **new 24d** | Q10 |
| 11 | **Thermal rework** (render only). Heat input instead of lamplight, stronger blur, distance contrast falloff with a heat floor (Q5), sensor-scale grain, column noise and shutter re-seed, a halo, pixel-measured gain on desktop, White Hot, glass opaque. | P11 | M | **new 24v** | Q5. Phone check |
| 12 | **Remap block and prompt.** | P12 | S | **24q** | Q6 |
| 13 | Exploration camera auto side swing. | P14 | S | **24** | Q11 |
| 14 | Later, not this run: ledge throw, half-split jump, whistle (Phase 2), hang over teammate, tomoe nage, dual rappel (Phase 5), knife (Phase 6). | P14 | - | backlog | - |

Not changing: gear speeds (P2 good), the reversal at a run (P3 works), no camera bob (good), relaxed holstered arms
(P4 "arms work"), the wall entry press, the 85 deg lean arc (M16).

### Revised step order for the rest of the run

| Order | Step | Content | Michael's notes |
| --- | --- | --- | --- |
| 1 | **22c ct-body** (new) | Frozen-stride stop, braking stop at 5-6, upright posture | P1, P2, P4 |
| 2 | **22b turns-gait** (revised) | CT turns and step-turn in place, foot lock, bank, plus the old 22b list | P3 |
| 3 | 23 b1-ik | Stairs and slopes IK, look-at (head clamp: SC1 +-60 deg standing, +-45 crouched) | - |
| 4 | **24 camera** (extended) | D5.13 solver, close aim camera, aim-side swap of the camera, peek camera hook, auto side swing | P15, P16, P7 |
| 5 | **24w wall-rework** (new) | Sideways stance, peek, lean, low cover half rise | P6-P9 |
| 6 | **24d doors** (new) | Stick-driven door, open-door rules, bash knockout | P10 |
| 7 | **24q quick-fixes** (new) | Strike in range and faster; remap block and prompt | P5, P12 |
| 8 | **24v thermal** (new) | FLIR spec F 5 | P11 |
| - | **Pause: play test 3** | Laptop: body, turns, walls, aim camera, doors, strike, thermal | - |
| 9 | 25 b2-weapon | Wren check first (M18). Plus the weapon-hand shoulder swap | P16 |
| 10-18 | 26-34 | As planned. 27 drops the wall-pose part (done in 24w) | - |

Block D grows from 12 to 18 steps (cap 26). Doc changes with the first step: DECISIONS (Michael's answers as M20),
bible 5.3 / 5.4 / 5.12.1 proposals in BIBLE-PROPOSALS.md, `docs/level-design.md` Section 12 if the low-cover aim
height or door rules change a map fact.

## 5. Open research: what only footage or Michael can settle

No text source gives CT timings, camera distances or the hero's wall pose. Three short clips settle most of it.

**Suggested method.** Michael records about 3 clips of CT (PC or console, 60 fps, a plain lit room, the camera held
still where possible). An agent or Michael steps through them frame by frame (VLC "E" key, or mpv with "."), and the
numbers go into this file with the frame counts.

| Clip | Do | Measure |
| --- | --- | --- |
| 1. Body (about 60 s) | Walk, release the stick at each speed, standing and crouched. Run and release. Spin the stick in slow and fast circles, standing still and moving. Flick a 180 at a run. Roll. | Stop: frames from release to still, foot drop, hip settle and overshoot. Turn rate in deg per frame. The yaw rate where the step-turn starts. Bank angle. Spine angle standing and crouched (a still frame side on). |
| 2. Walls and doors (about 60 s) | Back to a high wall, slide, peek both edges. Crouch on a low wall, peek both ends, try to aim. Stealth-open a door slowly, then close it. | The hero's wall pose (flat or bladed, head on the wall?). How far the peek camera swings out. Slide speed. Door angle versus stick. |
| 3. Aim and strike (about 45 s) | Aim the pistol and the rifle. Swap shoulder both ways. Scope. Palm strike an unaware guard and an aware one. Press strike with no guard near. | Aim camera distance (the hero's head width on screen against the explore view). Swap duration and hand order. Strike frames to contact. Whether an empty press does anything. |

Other leads:
- The GDC 2005 talk "Concepts & Animating [the hero] in Splinter Cell: Chaos Theory" (Bibeau, Monteil) exists as
  audio on archive.org (L S16). It is the best unread source on the stop, turn and posture system.
- If Michael owns CT on PC, its `.ini` files may hold the camera distances per mode (SC1 keeps them in an ini; L S2).
  Reading them is quicker than measuring footage (Inference).
- Until footage exists, use the SC1 numbers marked above as the baseline, and label every tuned value "game value"
  in the step's log.
