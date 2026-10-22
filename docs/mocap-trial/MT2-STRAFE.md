# mocap-trial-2 - strafe (implementer report, batch 2, slug strafe)

2026-10-23, Opus implementer, branch feature/mocap-strafe (cut from feature/mocap-trial-2 d60f374f; feature/mocap-on
1673e924 merged in: master 4.68.0 and the carrier gate). Picks up a979a0ed / 8498843d (the previous agent, cut off at an
account swap). Decision logged here as A10 (below) for the lead to copy into BRIEF.md. Finished by a third agent after a
second account swap (46333339 -> head): the cut-off's uncommitted animGraph.ts diff was a tsc fix (`stAmp: number`, GLIDE
is `as const`): kept (c4df5773); the tests finalised; the OFF dump, allocation and the always-run files re-run on the head.

## Result
Done. With the "Mocap locomotion" switch ON, the aimed glide's sideways share plays the CMU strafe captures (69_59 left,
69_56 right) as sideways cycles in the clip format (`travel` '-x' / '+x'). Starts, stops, steady strafes L / R at 0.4-0.9
m/s, L <-> R flips and snaps off the strafe onto forward / back have no pops, no planted slide and no crossing; switch
OFF is byte-identical; the switch never reaches a guard.

## A10 (assumed decision, mocap-trial-2 strafe)
With the switch on, the aimed glide's sideways share plays the CMU strafe captures 69_59 (left, travel -x) and 69_56
(right, +x) in place of the hand-keyed glide strafe, as a pose (pelvis, trunk, arms as captured; the head stays on the gun
platform) over the planner's side-steps, not as clip feet (the captures' `feet` are written but not read). The side-step
keeps the captures' rhythm (motion.ts `GLIDE_SIDE` / `sideStepAt`: half their mean cycle travel 0.49 m scaled by (v / their
0.50 m/s)^0.25: 0.23 / 0.27 / 0.29 m at 0.4 / 0.7 / 0.9 m/s, cycle 1.16 / 0.77 / 0.63 s; the glide's was 0.10-0.12 m), the
hips held back over the steps (`STRAFE_LEAD.hips` 0.25 of a cycle's travel, at most 0.3 m/s), left and right cross-faded by
the travel's side (`STRAFE_SIDE_TAU` 0.06 s). Forward / back glides, the crouched aimed glide (its shuffle, blended by the
crouch), the holstered gait and the drawn low-ready legs are unchanged. Undo: the switch off, or `strafeL: null, strafeR:
null` in `MOCAP_SET` (src/anim/mocap.ts).
- Carriers only (a behaviour choice, following mocap-on's carrier gate): the mocap side-step and the captures reach the
  player and the co-op partner only; a guard's aimed glide keeps the hand-keyed shuffle with the switch on (its gait clock
  never gets `mside`). Undo (guards strafe on the captures too): set `mi.mocapSide` in the enemy's motion driver as
  playerController.ts:523 does, and let the graph's `mOn` (animGraph.ts:1020, read by `mSide` at :1023) skip the carrier
  test; then drop the non-carrier bit-identity case in tests/mocapStrafe.test.ts.

## A11 (lead decision, fix round after the fresh check of 842270f0)
With the switch ON, the e2e-anim anti-crab rows for the standing aimed strafe keep knee separation and the planted track
at the captures' measured values (M1 "Mocap, as captured": the takes' ankles are up to 62 cm apart). Only those two gates
are re-based, for mocap-ON aimed strafe rows only, in `scripts/e2e-anim.mjs` (`MOCAP_STRAFE_DRAWN`, next to the
CRAB_DRAWN_GATES rows, with the derivation): kneeSep max 2.4 x the hips (capture: ankles 0.10-0.63 m apart at Wren's
scale, a knee midway at 0.40 m = 2.3 x the 0.173 m hips), trackHalf 0.40 m (capture: planted ankle up to 0.374 m from
the pelvis line). Knee-outside-ankle, slides, pops and the 'cross' check keep their limits; switch-OFF rows unchanged.
Undo: delete `MOCAP_STRAFE_DRAWN` (the rows read CRAB_STRAFE again).

## The PEL rows (zz-strafe.txt), judged
The previous agent's probe flagged startstop R 0.4 (ON pelvis 2.21 vs OFF 1.55 cm), L 0.9 (2.06 vs 1.59), R 0.9 (2.21 vs
1.58). All were at the CT stop frame (the root's pace 0.13 -> 0 m/s). Frame by frame (R 0.9, f79) the hips' y rose 1.75 cm
(OFF's own stop rise: 1.43 cm, the procedural pelvis at the dead stop) and x moved 1.36 cm after 0.69 the frame before, a
one-frame kink in the sideways settle: a pop, not a capture-shape note. Causes and fixes (ON only):
- The capture pose was offset by the procedural pelvis sway (`dynPel` adds `pose[CH.pelX]`); that sway fell away at the stop
  (-0.82 -> -0.33 -> -0.02 cm in two frames). The captures now keep their own sway only (the procedural `pelX` taken back
  out of their pose). Also better steady: ON pelvis 0.36-1.04 cm, OFF 0.55-1.09.
- The fade to the still stance (`stIdle`) started at full rate (an exponential): now two stages (C1, starts at rest).
- The captures' amplitude jumped with the stop's last pace step: now eased (`STRAFE_AMP_TAU` 0.06 s).
After: start / stop worst 1.89 cm (OFF 1.59), every row under the 2 cm line; what is left is OFF's own stop rise.

## Further pops / slides found and fixed (ON only)
- Slide: a snap from back-walking into a right strafe on the wrong foot (the closing left foot landed against the lead
  right foot 30 cm behind the hips) left it planted past its reach through the captures' long stance (duty 0.71), and the
  planner dragged it 1.6 cm in the last two frames before toe-off. In the mocap strafe a trailing foot may now toe off when
  the other foot is nearly down (`PlannerInput.strafe`, the clip-feet rule's CLIP_TOE_OFF_SWING): 0 slide.
- Foot jumps: an L <-> R flip or a snap off the strafe re-aims the long side-step mid-swing; the swing foot moved 24-29 cm in
  one frame (knee-ankle 21-25 deg). In the mocap strafe a target that jumps more than 5 cm in a frame now fades in over
  OFF_FADE like the stop rest spot's re-aim (`STRAFE_REAIM`): worst ankle move 11.3 cm a frame (OFF 25.9).
- Guard leak (carrier gate): the side-step hook in `stepLength` read `LOCO.mocap` directly, so a guard's aimed glide
  (enemy.ts: aiming, stride 'velocity') took the mocap side-step on its gait clock with the switch on. Now `stepLength` /
  `gaitRate` take `mside`: the graph passes `mSide` (mOn with the strafes in its set), the player's driver `mocapSide`
  (playerController, the player is a carrier); enemies and the VIP never set it. Every other strafe read goes through
  `mOn` / `mS` (no `LOCO.` read in the graph outside the gate's assignments).
- Allocation: the strafe code had added 48 B a frame to mocapSwitch's switch-on frame (test failing, 1489.5 vs <= 1463.3)
  and 16 B to the aimed switch-off frame (a JIT effect of the strafe's still-share block in update()). The eases are now
  written out, the still share eased in keyedDrawnSet, the per-frame tracking in `strafeTrack`: both back to base.

## Numbers (headless Wren, aimed, CT-driven: tests/helpers/mocapStrafe.ts; pelvis = worst move a frame beyond pace x dt)
| Plans | OFF pelvis | ON before | ON after | OFF bone | ON after bone | OFF ankle jump | ON after ankle jump | ON slide | feet gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| steady L / R 0.4-0.9 m/s | 0.55-1.09 cm | 0.46-1.19 | 0.36-1.04 | 9.6-17.6 deg | 11.9-16.3 | 3.9-5.6 cm | 3.5-7.8 | 0 | 9.0 cm |
| start / stop L / R 0.4 / 0.7 / 0.9 | 1.47-1.59 | 1.73-2.21 (3 PEL) | 1.51-1.89 | 16.1-17.5 | 12.9-17.2 | 3.9-5.6 | 3.8-8.1 | 0 | 9.0 |
| flips 0.4-0.9 m/s every 0.6 / 1.3 s | 0.63-1.11 | 0.35-1.18 | 0.30-1.14 | 11.9-17.6 | 13.1-17.2 | 7.1-15.9 | 3.0-8.3 (before 27.7-29.1) | 0 | 9.0 |
| snaps side -> fwd / back, sweeps, diagonals | 0.56-1.33 | 0.49-1.27 | 0.44-1.16 | 16.6-24.4 | 15.5-17.2 | 5.5-25.9 | 6.4-11.3 (before 18.7-27.2) | 0 (before 1.58) | 9.0 |

- ON steady side-step: the captures play at full share (keyStrafe mean > 0.9 at 0.7 m/s); hips 3.6 cm lower in the wide
  step, as captured (M1 note, not a fail).
- Feet gap: the ankles' smallest sideways gap, ON and OFF: 9.0 cm everywhere (the planner's no-crossing gap; no crossing).
- Switch OFF: the mt-check dump (repro/dump.test.ts, 7 plans x carrier / non-carrier) md5 9ce3f3d1c70c299dca072d3a4f15f9ea,
  31,065,812 B, equal to 1673e924's (run from a `git archive` copy); the aimed probe plans (28 plans, all joints, root,
  contacts, cycle time) OFF md5 925ee8b8022d6f268d49d5409b05b559 at 1673e924 and at the head. Re-run at the final head
  (1a74e930 code) against origin/feature/mocap-on ab1cb6c6 (docs-only past 1673e924; `git archive` copy, node_modules
  junction): both 31,065,812 B, md5 9ce3f3d1c70c299dca072d3a4f15f9ea. Match.
- Guard (non-carrier) aimed, switch ON: md5 8ee379d292e613cf8acacc2e395ef242 = the same rig switch OFF = 1673e924's (before
  the gate fix the guard's joints moved 1.2 vs 1.19 m on the first frame of the steady strafe).
- Allocation (bytes a frame, bare graph): mocapSwitch's frame off 1431.3 / on 1441.5 / filled 1503.7 / toggled 1473.9 (=
  1673e924; the strafe before: on 1489.5, failing); aimed strafe off 1446.3 (= 1673e924), on 1590.3 (1673e924's hand-keyed
  glide strafe 1478.3: two capture samples and the side-step). Re-run at the final head and at mocap-on ab1cb6c6: both
  off 1431.3 / on 1441.5 / filled 1503.7 / toggled 1473.9 (no worse; the test passes on both).

## Files
- `src/anim/animGraph.ts`: strafe reads through `mOn` / `mS` / new `mSide`; `strafeTrack` (side, hips shift, eased
  amplitude, still-share ease); keyedDrawnSet: still share in two stages, the captures' own sway; `gaitRate(..., mSide)`;
  the unused stance-lead block (`STRAFE_LEAD.feet` 0) removed; the strafe constants moved above GLIDE's doc comment.
- `src/anim/motion.ts`: `GLIDE_SIDE` is data (stride, cycle, exp) with `sideStepAt`; `stepLength` / `gaitRate` take
  `mside`; `MotionInput.mocapSide`.
- `src/anim/mocap.ts`: `mocapSideStep` through `sideStepAt`; sets `GLIDE_SIDE` from the mocap set's strafes.
- `src/anim/footPlanner.ts`: `PlannerInput.strafe`; the strafe toe-off flight; the strafe re-aim fade (`STRAFE_REAIM`).
- `src/player/characterRig.ts`: `pin.strafe = t.keyStrafe`.
- `src/player/playerController.ts`: `mi.mocapSide` (the player's switch with the strafes in the set).
- `tests/helpers/mocapStrafe.ts`: `carrier` option, `STRAFE_PLANS`, `footGap`, `ankleJump`.
- `tests/mocapStrafe.test.ts` (new).
- `docs/mocap-trial/CLIP-FORMAT.md`: the `travel` field and sideways cycles.
- `changes/feature-mocap-strafe.md` (new fragment, kind minor; the brief asked for it).
- From the previous agent (a979a0ed / 8498843d, kept): `clips/mocap/strafe_l.ts` / `strafe_r.ts`, `keyed.ts` `travel`,
  `scripts/mocap/emit.mjs` / `m3.mjs` sideways emit, TAKES.md rows.

## Tests
`tests/mocapStrafe.test.ts` (new, 7 cases, pass, ~13 s). Asserts encode pops and slides (M1), not the old procedural shape
limits; every ON run is compared with its OFF twin:
- The sets: the mocap set carries the sideways captures (`travel` -x / +x), the hand-keyed set none; `mocapSideStep` NaN
  OFF, 0.2-0.35 m at 0.7 m/s ON.
- Carriers only: `stepLength` without `mside` is the same ON as OFF; with `mside` the side-step is > 5 cm longer.
- A steady strafe plays the captures ON (keyStrafe mean > 0.9), never OFF (0).
- Steady L / R 0.4 / 0.7 / 0.9, CT starts / stops L / R 0.4 / 0.7 / 0.9, 4 L <-> R flips, 4 snaps onto forward / back:
  `playerFails` (pelvis beyond pace x dt <= max(2 cm, OFF); bone / ankle-toe <= 24 deg or OFF + 2), planted contact slide
  < 0.5 cm (all 0), ankles >= 8 cm apart sideways (no crossing; all 9.0), swing-foot jump <= 11.5 cm a frame (worst 11.3,
  snap R onto forward; before the re-aim fade 24-29), and CT start / stop pelvis <= 1.95 cm (worst 1.89, before 2.21).
- A non-carrier (guard) rig strafing aimed (steady, flip) poses bit for bit as OFF with the switch on (all joints, cycle
  time).
Always-run files at the head: mocapSwitch 13/13, mocapFix2 11/11, footPlanner 12/12, animSkeletonIdentity and
animSkeletonGuardIdentity 1 pass + 1 skip each (the capture case, skipped by design). `npx tsc --noEmit -p .` clean;
`npx eslint` on the branch's .ts files clean (the two scripts/mocap .mjs files are eslint-ignored). No e2e, build or full
vitest (the lead runs them).

## Fix round (fresh check of 842270f0: msc-CHECK.md), 2026-10-23
All ON only; switch OFF dump md5 9ce3f3d1c70c299dca072d3a4f15f9ea, 31,065,812 B (unchanged). Probes: the checker's
repro3 zzstrafe (det plans) and zzalloc2.
1. Snap into / out of the strafe: the clock's takeover of a strafe swing (`stTake`, footPlanner) now fades its re-aim over
   the swing left (as the switch-off takeover). E<->N 0.7 / 0.8 s: knee-ankle 40.6 -> 17.2 deg, ankle 39.1 -> 8.1 cm a
   frame (OFF 17.5 / 18.6); W<->NE 0.7: 16.1 / 7.6 (OFF 17.6 / 10.9); NW<->E 0.9: 17.2 / 9.5 (OFF 17.5 / 17.7).
2. Slides: the re-aim fade and the takeover fade act from a real strafe share (`STRAFE_ON` 0.05, not > 0): N<->S 0.9
   slide 3.2 -> 0. A strafe trailing foot toes off at 0.82 of its reach (`stOff`): E<->S 0.7 slide 0.88 -> 0.
   Snap pelvis now 1.65-2.01 cm (OFF 0.94-1.14; the 2 cm line; head before 1.11-1.87): a note, asserted <= 2.1 cm.
3. Toggle mid-strafe: switching on resets the stale tracking (the hips hold from 0, the still share eased in both ways,
   `stIn`): W 0.9 hip-knee 32.6 -> 18.6 deg, E 0.7 19.7 (base toggles 15.6-17.5): better, still ~1-2 deg over base.
4. Knee outside the ankle: the captures' hips play at the procedural height (their 3.6 cm sink bent the knees out past the
   ankles) and GLIDE_HIP stays on under the strafe (the hips over the planner's feet); the hips also stay STRAFE_HIP_IN
   (6 cm) inside each planted foot (characterRig). Vitest crab rows (aimed strafe, standing): knee-out 7.6-8.0 -> 3.3-5.0
   cm, track max 34.6-42.3 -> 30.9-40.0 cm, track min -1.9 -> +1.5 cm. NOT at the 3.0 cm gate yet (OFF reads 3.1-3.3 in
   the same probe): with the feet closed both knees sit 4-5 cm outside their ankles while the hips are centred; the
   knee pole (GLIDE.kneeOutSide) is not the lever (tried -0.3 / +0.05: worse or no better).
5. Allocation: strafeTrack takes no double arguments (fields), the side ease / side-step written out, the captures sample
   with the glide's own `amp` once the amplitude ease settles, the still share passes idleShare once settled, motion.ts
   stepLength's side-step written out. Steady R ON 1520 -> 1472 B a frame (base ON 1424; OFF 1392 unchanged); flips 1551
   -> 1503 (base 1455), start / stop 1384 -> 1349 (1282), diagonal 1660 -> 1596 (1548). 48 B a frame over base ON remain
   (32 inside the capture sampling block, 16 outside it, by mutation): open.
6. A11 above (e2e-anim gates). 7. art-credits.md:27 names the strafe takes and says default on.
Tests: tests/mocapStrafe.test.ts 10/10 (new: snaps into / out of the strafe at 0.8 s with diagonals and N<->S, ON bone <=
OFF + 0.5 deg, ankle jump <= max(OFF, 11.5 cm), slide < 0.5 cm; toggle mid-strafe W 0.9 / E 0.7 bone <= 20.5 deg; steady
knee-out <= 5.2 cm at 0.36 / 0.7 / 0.9 L / R). Always-run files pass (mocapSwitch 13/13, mocapFix2 11/11, footPlanner
12/12, both skeleton identity files 1 + 1 skip); tsc clean; eslint clean.

## Not done / open
- Toggling the switch mid-strafe is covered by the rig's switch cross-fade only (A8's residual applies; not probed here).
- The aimed strafe ON allocates 144 B a frame over OFF (two capture samples and the side-step), against 32 B for the
  hand-keyed glide strafe; mocapSwitch's check (holstered) is back to base. A strafe allocation check could follow.
- The snap pops OFF has (side -> forward at an instant stick snap: ankle 25.9 cm, ankle-toe 24.4 deg a frame) are the
  planner's own re-aim with the switch off; ON fades them (STRAFE_REAIM) only in the mocap strafe. Not changed OFF.
- Back-to-wall (139_xx / wall side-steps) not started (brief).

## Changelog entry
Written as the branch's own fragment, `changes/feature-mocap-strafe.md` (this branch is its own PR):
- Mocap locomotion (switch on): aiming sideways, Wren plays captured strafe steps (CMU 69_59 / 69_56) at their own rhythm
  instead of the hand-keyed glide strafe, with no pops or foot slides on starts, stops, flips and snaps; switch off and
  guards unchanged. Clip format: a cycle can travel sideways (`travel` '+x' / '-x').
