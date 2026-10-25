# MT2 fix F - clip-planted feet hold their contact (BRIEF A9, orchestrator option a)

Base: feature/mocap-trial-2 4ae1afd2 (mocap default OFF). Branch feature/mt2-fixF. Follows MT2-FIXE.md.

## Cause (MT2-FIXE.md, confirmed)
A clip-planted foot (`clipPlant`, clip feet on hand) pinned its ankle while the clip's stance pitch rolled it heel to toe,
so the rendered heel / ball slid (straight jog 1.2 / 2.6 cm), and it skipped N1's anchor, ball pivot and cap anchor, so in
a turn it scrubbed about the ankle and lifted at the twist cap (30.9 deg). Holding the contact (fixE variant B) fixed the
turns but regressed four things, each traced here to a frame:
1. Walk flicks (mocapPlayer 3: 2 m/s flick 90 slide 7.4 cm, pelvis 3.2 cm): the planner's raised heel (`heelP`, pivotFeet)
   was dropped the frame the clip's per-frame pitch (clipFoot) went toe up: 0.35 -> -0.09 rad in a frame. The rig's
   MOCAP_FEET.pitchRate cap posed 0.05, the ankle was placed for -0.09, and the held ball moved 7.4 cm for that frame.
2. A clip landing's pitch snap (start/stop 2.8 m/s, go 1.99: 2.06 cm): the swing's eased pitch -0.04 landed on the clip's
   -0.56; the rig capped it over two frames, the anchor had been placed for the uncapped pitch, the heel moved 2.1 cm.
3. crouchShift (walk 1.4, 0.3 s ramp: 2.02 cm): the clip's heel rising through the crouch hand-over moved the planted
   ankle 2 cm up in a frame; the rig's hip / knee rate limit lagged the leg and the held ball slid 2.0 cm.
4. mocapSwitch "starts and stops" joint jerk 12.9 vs <= 9.5 cm/frame2 (OFF 9.04 + 0.5): not a slide. With the planted
   ankle rolling forward the passing swing knee met the planted one a frame earlier; the knee-gap bow flicked it 6 cm out
   and back, and the no-crossing push then took the swing foot 4 cm out in one frame as it entered the window. Base has
   the same pattern one frame shorter (8.7).

## Change (all ON-only: `clipPlant && i.clipFeet`, `clipOwn`, `pin.clipFeet`, or the rig's `LOCO.mocap` pitch-cap branch)
- footPlanner `pivotFeet` / `anchorFeet` / `twistCap`: the three clip-plant skips removed (fixE variant B): clip plants
  get N1's anchor (heel while toe up, ball once the heel rises; the ankle travels with the roll), ball pivot and cap anchor.
- footPlanner `pivotFeet` (reconcile): on a clip plant the pitch is max(clip pitch, heelP), toe up or not, so the
  planner's raise fades out at HEEL_RISE instead of snapping; `toeUp` then follows the posed pitch. clipFoot's lift keeps
  the raised heel's offset (fades over CLIP_PITCH_SWING) instead of zeroing it.
- footPlanner `holdPitch(f)` (new, public) + characterRig: after the rig caps the feet's pitch (switch on), an anchored
  planted foot whose pitch the cap changed has its ankle re-placed round the held contact for the posed pitch.
- characterRig: a clip-planted, anchored, planted leg (clip feet on hand) skips the hip / knee rate limit (as the landing
  frame already did under poleM); its target moves smoothly with the held contact.
- footPlanner `uncrossIn`: a clip swing (clipOwn) passing a planted foot is eased out over UNCROSS_RAMP (0.12 m) front to
  back before the no-crossing window instead of pushed 4 cm in one frame as it enters.
- `turnOver` still gives a clip plant no pivot budget (unchanged; the turn rows pass without it).

## Numbers (headless, tests/helpers/mocapPlayer turnFeet / straightFeet: e2e-anim's contactSlide on the rendered heel /
ball; jog 2.93, run 4.2 m/s; turn rows worst of 8 offsets x 2 sides)
| Row | Base ON | Fix F ON | OFF |
| --- | --- | --- | --- |
| jog 90 | 9.34 cm, lift 30.9 deg | 0.01 cm, 14.3 deg | 0.37 cm, 14.3 deg |
| jog 180 | 10.25 cm, 30.9 deg | 0.01, 14.3 | 4.30, 14.3 |
| run 90 | 3.26 cm, 30.9 deg | 0.01, 14.3 | 2.25, 14.3 |
| run 180 | 6.25 cm, 30.9 deg | 0.01, 14.3 | 4.02, 22.9 |
| straight walk 1.4 / 2.0 | 5.12 / 4.30 cm | 0.01 / 0.00 | 0.01 / 0.00 |
| straight jog 2.93 / run 4.2 / sprint 5.0 | 2.55 / 1.74 / 1.59 cm | 0.00 / 0.01 / 0.00 | 0.00 / 0.01 / 0.00 |
| mocapPlayer flicks (CHECK-3 3), contact | 8.5-11.2 cm (ankle read: 0.00) | <= 0.01 cm | 0.01-13.9 cm |
| mocapSwitch starts and stops jerk | 8.70 cm/frame2 | 7.03 | 9.04 |

(OFF's jog / run 180 rows are the switch-off path at headless CT turn rates, unchanged by this round.)

Pops (mocapPlayer, 39 plans, ON fix F vs ON base): pelvis at most +0.8 cm (start/stop 1.4, go 1.73: 0.55 -> 1.35, OFF
3.74), bone at most +2.3 deg (flick 180 at 1.4, offset 0.83: 16.7 -> 19.0, OFF 33.3), ankle-toe never higher. All within
the rules (bone / ankle-toe <= OFF + 2 or <= 24; pelvis <= max(2 cm, OFF)).

OFF: the switch-off dump (scratch/mt-check/repro/dump.test.ts) is byte-identical: md5 9ce3f3d1c70c299dca072d3a4f15f9ea,
31,065,812 B. mocapSwitch "no allocation per frame" passes (graph only; this round adds no allocation: `holdPitch` and
the ramp are scalar).

## Measure changes (limits unchanged)
A clip plant's ankle now travels with the clip's heel-to-toe roll by design (6 cm in a walk stance), as N1's planner feet
do, so the slide is read where the foot touches the floor, as e2e-anim reads it:
- tests/helpers/mocapMeasure `gaitNumbers` (mocapSwitch "walk / jog / run: feet locked", < 1 cm): was every plant's ankle
  (`plantedSlide`); now `footSlide` as e2e-anim's foot locking: anchored plants at the heel / ball, others at the ankle.
  Base read 0.00 ON (pinned ankle) while the contact slid 5.1 cm; fix F reads 0.01 (ankle travel 6.2 cm, not slide).
- `plantSlide` (mocapSwitch hand-offs, mocapPlayer, mocapCrouch, mocapCrouchShift, mocapQuickStop, mocapRunTurn,
  mocapShortStart, mocapSprint, mocapStopPitch): code unchanged; it already reads anchored plants at the contact and
  others at the ankle. Clip plants are anchored now, so these tests read them at the contact (doc comment updated).
- New: mocapPlayer "fix F: straight walk / jog / run / sprint" (contactSlide < 1 cm, ON); the two fixE cases un-gated.

## Tests (single files, desktop)
mocapPlayer 10 passed / 1 skipped (item 5, A8), mocapSwitch 13 (incl. allocation), mocapFix2 11, mocapStopPitch 1,
mocapShortStart 1, mocapRunTurn 4, mocapCrouch 6, mocapCrouchShift 2, mocapSprint 10, mocapQuickStop 7, footPlanner 12,
animSkeletonIdentity 1 (+1 skipped), animSkeletonGuardIdentity 1 (+1 skipped). tsc and eslint clean. No e2e run (the
lead runs e2e-anim with mocap on).

## Files
src/anim/footPlanner.ts, src/player/characterRig.ts, tests/helpers/mocapPlayer.ts (`straightFeet`),
tests/helpers/mocapMeasure.ts (`gaitNumbers` slide), tests/mocapPlayer.test.ts, tests/mocapSwitch.test.ts (comments).

## Open
- The OFF jog / run 180 headless rows (4.0-4.3 cm) are the switch-off path's, outside this round.
- e2e-anim with mocap on not run here (lead).

## Changelog line (lead)
- mocap-trial-2 fix F: with the mocap switch on, clip-planted feet hold their heel / ball like the foot planner's (N1's
  anchor, ball pivot and twist-cap anchor), the planner's heel raise sits on top of the clip's pitch, and the rig keeps the
  contact at its capped pitch: jog / run 90 / 180 turns 3-10 cm -> 0.01 cm contact slide, twist at lift 30.9 -> 14.3 deg;
  straight gaits 1.6-5.1 -> 0.01 cm.
