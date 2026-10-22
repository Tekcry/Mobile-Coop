# mocap-trial-2 - crouch walk (implementer report, slug crouch)

2026-10-23, implementer (Opus), branch feature/mt2-crouch from feature/mocap-trial-2 20515978. Brief: COMMON.md + the
crouch task (BRIEF M2 / M3). Decision logged as BRIEF A5.

## Result
Done, with three small ON-only open items (below). With the "Mocap locomotion" switch ON the holstered crouched sneak
band plays the CMU crouch walk 136_09 (R-strike cycle 4.233-5.508 s) as Wren's body over the planner's feet. Steady
0.5-0.9 m/s: no slide (0.01 cm), bone steps equal to OFF's (8.7 / 12.1 / 13.1 deg). Starts / stops after a stand of 0.8 s
or more and turns at 1-3 rad/s: every bone step at or under OFF's. The pelvis moves at most 1.32 cm in a frame beyond
pace x dt. Switch OFF is unchanged: the identity tests pass, and every change is gated on `LOCO.mocap`,
`LOCO.set.crouchWalk` or a filled turn-in-place slot.

## What changed and why
- `src/anim/clips/mocap/crouch_walk.ts` (new): `MOCAP_CROUCH_WALK`, emitted by `scripts/mocap/m3.mjs` and copied
  unchanged from `build/mocap/clips/m3/`. 48 frames, Wren 0.83 m/s, stride 1.07 m, cycle 1.283 s, the capture's own
  track half 0.057.
- `src/anim/mocap.ts`: `LocoClipSet.crouchWalk: KeyedClip | null` (one field). It is null in `HAND_KEYED_SET` and
  `MOCAP_CROUCH_WALK` in `MOCAP_SET`. The header comment notes the exception.
- `src/anim/animGraph.ts`, the crouch blend:
  1. `crouchSet(ph, es, idleShare, out, mc)`. With `mc` (switch ON: `LOCO.set.crouchWalk`), the sneak band samples the
     capture in place of `KEYED_SNEAK`. It uses the sneak's amplitude-by-pace rule and the set's layer scales
     (MOCAP_LAYERS: the tuner's arm swing, twist and lean are off on it). The capture gets no KEYED_CROUCH_POSE lean or
     drop (as captured, M1). Its pelvis sway is centred on the track: the clip's root sits under the pelvis at phase 0,
     3.7 cm off its mean; centred over planner feet, this moved the 0.5 m/s x 3 rad/s slide from 3.2 to 2.8 cm. The
     crouch walk and crouch run bands stay hand-keyed, cross-faded into over the hand-keyed set's own sneak -> crouch walk
     blend (effort 0.7-1.1, about 1.07-1.46 m/s). The capture never covers the 1.8 / 2.6 m/s bands: no crouched take
     runs faster than about 1 m/s (TAKES "M3 takes").
  2. The planner's steps under the capture are the hand-keyed sneak's: duty 0.66, lift 0.045, track `half x halfK`,
     knee pole. The clip's `feet`, `duty` and `liftH` are not read. With the capture's own values (duty 0.604, lift
     0.075, half 0.057, knee pole -0.055), the shins popped 34-35 deg in 0.5 m/s turns (OFF 16-22) and the 0.5 x 3 rad/s
     slide rose to 5.1 / 5.7 cm.
  3. Crouched spins: `loco = moveW x bandK x (1 - (turnInPlace ? spin x crouchK : spin))`. The mocap set's filled
     turn-in-place slot kept the keyed set on through a spin, but crouched the crouched set replaces the slot's pose. The
     crouched keyed pose stayed on, and the planted feet slid 4.1 / 4.6 cm in a 0.5 m/s x 3 rad/s spin even without this
     clip (base ON; OFF 2.2 / 1.3). Now a crouched spin cuts the keyed set as the hand-keyed set does, so base ON crouched
     equals OFF. Standing (crouchK 0) is unchanged.
  4. The drawn set's crouched legs stay hand-keyed (`kCrD`, sampled only with the switch ON, drawn and crouched).
     Weapons are not part of the trial, as the drawn speed set.
  5. `mcK`, the capture's share of the keyed pose, joins `keyMocap` only in `bodyMotion`. The MOCAP_LAYERS scales take
     N2's trunk counter-rotation, sway and head follow / nod off the capture, as on the standing mocap gait. It is not
     added to `keyMocap`: that would make the standing walk's clip feet valid while crouched (the clip-duty block, not
     mine).
- `tests/helpers/mocapMeasure.ts`: `PlanStep.crouch?` (absent: standing, as before).
- `tests/mocapSwitch.test.ts`: `placeholders()` also sets `crouchWalk: null` (one line). The placeholder identity proof
  failed with the capture in the set.
- Docs: BRIEF A5, SOURCES.md (136_09 now under "Used"; 136_10 stays downloaded, not used), CLIP-FORMAT.md (the file
  row: played as a body only), art-credits.md (subject 136, the crouched sneak).

## Clip feet or planner feet (A3): planner, by measurement
I tried clip feet temporarily. The crouch clip's ankles went to the planner the way the standing walk's do, with
`keyMocap` taking the capture's share. Against planner feet, same build (deg = largest bone step a frame):

| Plan | Clip feet | Planner feet (shipped) | OFF |
| --- | --- | --- | --- |
| steady 0.5 / 0.7 / 0.8 m/s | 33.4 (shin) / 22.9 / 17.7 | 8.7 / 11.1 / 12.1 | 8.7 / 11.1 / 12.1 |
| start / stop, stand 0.8-1.5 s, 0.5-0.9 m/s | 34.4-36.0 (shin, every case) | 15.6-45.5 (at or under OFF) | 15.6-47.3 |
| turns 0.5 m/s x 1-2 rad/s | 33.3-42.4 | 15.0-37.0 | 16.4-43.5 |
| turns 0.8 / 0.9 m/s | 17.7-38.5 | 36-57 (as OFF) | 43-57 |

Clip feet was smoother only in faster sneak turns, where OFF's planner flips the ankle 57 deg. It popped the shins at a
slow sneak and at every start and stop (the stride scale at 0.5 m/s is 0.75, and the clip and the planner trade steps
at the 0.3 m/s cut). Fixing that is footPlanner / clip-duty work other agents own.

## Numbers (headless rig, 60 Hz, crouch 1; slide = e2e-anim's `plantSlide`, rule = pelvis beyond pace x dt)
| Plan | OFF step / slide / rule | ON step / slide / rule | Note |
| --- | --- | --- | --- |
| steady 0.5 | 8.7 / 0.01 / 0.02 | 8.7 / 0.01 / 0.20 | |
| steady 0.8 | 12.1 / 0.01 / 0.03 | 12.1 / 0.01 / 0.32 | |
| steady 0.9 | 13.1 / 0.00 / 0.04 | 13.1 / 0.00 / 0.35 | |
| steady 1.3 (blend) | 14.8 / 0.01 / 0.04 | 14.8 / 0.01 / 0.22 | 1.5 m/s and up: ON = OFF exactly |
| start / stop stand 0.8, 0.5 / 0.8 / 0.9 | 15.6 / 33.6 / 47.3 | 15.6 / 28.3 / 45.5 | rule ON <= 1.03 (OFF 0.44) |
| start / stop stand 1.5, 0.5 / 0.8 / 0.9 | 15.9 / 25.1 / 24.1 | 15.9 / 21.1 / 21.7 | rule ON <= 1.07 |
| start / stop stand 0.3, 0.5 / 0.8 / 0.9 | 23.9 / 26.2 / 27.3 (forearm) | 26.4 / 28.9 / 30.4 (forearm) | open 2 |
| turns 0.5-0.9 x 1-3 rad/s, 2 offsets (24 plans) | 16.4-57.3 | 15.0-57.3, each <= OFF | slide 0.01 except below |
| turn 0.5 x 3, offset 0 / 0.37 | slide 2.24 / 1.29 | slide 2.88 / 1.28 | open 1; before this pass (base ON) 4.14 / 4.59 |
| pace ramp 0.3 s, 0.5<->1.3 / 0.8<->1.8 / 0.8<->2.6 | 17.7 / 16.7 / 21.8 | 17.7 / 16.7 / 21.8 | slide 0.01, rule <= 1.36 |

As captured (M1, notes, not fails): hips 68.6 cm at a sneak (hand-keyed sneak 57.1). The crouch drop is 15 cm from
Wren's mocap walk (83.6 cm at 0.8 m/s; the take: 14 cm on the performer); the hand-keyed set drops 27.5 cm. Trunk
(hips -> neck) 43 deg forward (hand-keyed 21; the bible's CT crouch about 38). Pelvis sway 8.4 cm p2p (hand-keyed 3.0).
Bob 2.1 cm. Wrist swing 2.9 cm (hand-keyed 7.0). Knee-out 6.7 cm and the track metric at 0.1 cm: the hips swing over the
stance foot as the performer's did. Stride: the planner's, the game's own at every pace (0.92 m at 0.8 m/s). The
capture's 1.07 m at 0.83 m/s is not used (body only). Its upper body plays on the game's gait clock (0.87 cycles/s at
0.8 m/s against the take's 0.78).

## Tests
- New `tests/mocapCrouch.test.ts` (6 cases, ~60 s):
  - the set fields;
  - steady 0.5 / 0.8 / 0.9: slide 2 cm, pops 25 deg, the capture plays (hips over 8 cm higher than OFF, trunk over 35
    deg);
  - starts / stops (stand 0.8 / 1.5 s x 0.5 / 0.8 / 0.9 m/s) and turns (0.5 / 0.8 / 0.9 x 1 / 1.5 / 2 / 3 rad/s x two
    offsets): slide <= 2 cm, pelvis rule <= 2 cm, bone step <= max(25, OFF + 1) deg;
  - 0.5 x 3 rad/s: slide <= OFF + 1 cm (open 1);
  - pace ramps into the crouch walk / run;
  - allocation: the crouched graph ON with the capture against ON with the sneak in its place: no object a frame.
- Results (each file alone):
  - pass: mocapCrouch 6/6, mocapFix2 6/6, footPlanner 12/12, animSkeletonIdentity 1 (+1 skipped),
    animSkeletonGuardIdentity 1 (+1 skipped), keyedCrouch 8/8, crouchEntryRig 1/1;
  - mocapSwitch 12/13: only the known allocation assert fails, 2524.08 / 2523.94 B on this branch against 2524.95 B on
    the base (same run, files swapped back), so no worse;
  - `tsc --noEmit` clean; eslint clean on the changed files.
- Allocation, crouched graph ON: the capture and the sneak read 1787.4 / 1787.3 B a frame in a fresh process. After
  the rig tests in the same file the capture reads 1915 B against 1787 B. That gap is boxed doubles from the mocap
  share's layer path (sampleKeyed with layer scales, N2's MOCAP_LAYERS), which the standing mocap gait pays too. The
  assert allows 8 boxed doubles, as mocapSwitch's "filled" budget.

## Open (ON only)
1. 0.5 m/s x 3 rad/s crouched turn (a 17 cm turning circle): a landing foot's yaw settles about its heel in two frames.
   This is the planner's landing; OFF has it too. Slide ON 2.88 cm against OFF 2.24 (the other offset 1.28 / 1.29).
   With the hand-keyed sneak's pelvis channel ON reads 2.2. The capture's higher hips leave the landing ankle 1.7 cm
   short for one frame (OFF 0.4). It is a footPlanner landing-yaw fix, not this area. Every other turn plan: 0.01 cm.
2. Crouched start after a 0.3 s stand: the knee jumps 8 cm on the first moving frame (the planner, OFF too) while the
   squat's hand still rests on it (kneeRest about 0.66). The forearm turns 26.4 / 28.9 / 30.4 deg ON against 23.9 /
   26.2 / 27.3 OFF at 0.5 / 0.8 / 0.9 m/s. The crouched idle's settle times do not change it (tried 0.06-0.25 s). Stands
   of 0.8 s or more are at or under OFF.
3. Crouching or standing up while walking at 0.8 m/s: ankle-toe 37.6 deg ON against 15.4 OFF (largest bone step 44.3
   ON against 45.4 OFF). Base ON (no crouch clip) already reads 35.2: the standing walk's clip feet hand the steps to
   the planner as the crouch grows (keyMocap x (1 - crouch)). That is the clip-feet hand-off, not this clip; a check
   for the clip-duty / footPlanner agents.
4. Not in the brief's range: an instant 0.8 -> 2.6 m/s jump (one frame) slides a foot 6.1 cm ON against 0.01 OFF. OFF
   also has the 11.7 cm one-frame hip jump there. A 0.3 s pace ramp reads 0.01 cm.
5. The rig's mocap rules keyed on `keyMocap` do not act on the crouched capture: the elbow-out push, the pelvis follow
   scale, the stop settle and the foot pitch-rate cap. The tuner's Body elbow-out still pushes its elbows. This needs
   `keyMocap` split from the clip-feet gate (fix2 area). TAKES.md's generated "Built" column still names
   `clips/m3/crouch_walk.ts` (m3.mjs output).

## Changelog (for the lead)
- Mocap locomotion (switch on): the crouched sneak plays the CMU crouch walk (136_09) as Wren's body over the usual
  steps. The faster crouch walk / run stay hand-keyed and are blended into. Crouched spins no longer hold the keyed
  pose. Switch off unchanged.
