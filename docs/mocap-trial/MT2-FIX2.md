# mocap-trial-2, fix 2: review items 3 / 4 / 5 / 8 checked, allocation regression fixed

Branch `feature/mt2-fix2` (from feature/mocap-trial-2 20515978, which holds the WIP e0298f90). Opus implementer, 2026-10-23.
Files: `src/anim/animGraph.ts` (clip duty block, `clipFeet()`), `src/anim/mocap.ts` (`MocapSlots`, `MOCAP_SLOT.easeFrom`),
`src/player/characterRig.ts` (`clipFootOff`), `tests/mocapFix2.test.ts`.

## 1. Allocation regression (mocapSwitch "no allocation per frame")
Cause: the clip duty block's two `clamp()` calls (rigMath's `Math.max(lo, Math.min(hi, v))` arrow). `AnimGraph`'s update
is far past V8's inlining budget, so each call boxed its double arguments and its result. Replaced by ternaries (the same
values for every input, NaN and -0 included). The fields seeded as small integers (`mDutyGait = -1`, `mPh = 0`) were not the
cause: the numbers are back to f4b5b7c1's with them unchanged.
A later +16 B in this round (task 2's ease-from pose made `MocapSlots.mix` too big to inline into `apply`) went the same
way: that code is in its own method, `easeFrom`.

| mocapSwitch, whole file (B / frame) | off | on | filled | toggled |
| --- | --- | --- | --- | --- |
| f4b5b7c1 (#159 head) | 2372.4 | 2372.4 | 2445.5 | 2406.1 |
| e0298f90 tree (before) | 2371.4 | 2372.4 | **2524.9 (fail, limit ~2499.4)** | 2399.6 |
| final, run 1 / 2 / 3 | 2371.5 / 2371.4 / 2371.9 | 2372.3 | 2445.5 / 2445.5 / 2444.3 | 2391.9 / 2391.8 / 2391.3 |

Alone (`-t alloc`): filled 1550.0 -> 1502.0 (f4b5b7c1 1502.0). zzalloc (repro2, rig.animate, min of the windows):
final OFF 15243.5 / 10263.6, ON 11392.5 / 7886.7 B (ON <= OFF in both pairs). f4b5b7c1: OFF 15241.8 / 10263.6, ON
11412.9 / 7887.5.

## 2. The four items, checked
Item 3 (no start unless from standing): correct. `seeded` on the first update after a reset is the same as seeding
`still = false` (a rig at rest that frame sets it back to true on the next line). Partner rig: see Open.

Item 5 (clip duty): the rate limit held only while clip feet stayed on hand. Fixed:
- **The switch on mid-jog**: the first clip feet frame took the clip's 0.21 straight from the planner's 0.44 (every swing's
  progress jumped about 20 % in a frame). Now it starts from last frame's duty: step 0.04, which is the keyed set swap
  upstream.
- **Clip feet gone with the switch on** (a quick crouch, a draw or a wall taking the mocap share to 0 before the duty had
  eased into the clamp): the duty snapped 0.18 (crouch in 0.3 s at a 2.8 m/s jog) to 0.30 (a snapped crouch), and a
  foot in its swing window fell back into its stance window. Now the duty keeps easing back at the same rate
  (`mCarry`) until it meets the planner's. Result: 0 swing -> stance events and 0.0000 past half the clock at every edge.
- **A stepped clock**: a gait phase set back read as almost a whole cycle and allowed a 0.5 move. Steps over a quarter
  cycle a frame (the graph's own threshold) now hold the duty.
- Crouch / draw / aim / turn / start-stop sweeps at a jog and a run (rig): no foot in the air put back in its stance window.

Item 4 (a spin on the spot plays on):
- **A spin reversed on the spot**: one frame was cut off, then the other side started at progress 0. That gave a 15.8 deg
  joint step a frame and a dip to weight 0.49. Now the other side starts the same frame at held weight and eases in over
  0.2 s (`MOCAP_SLOT.easeFrom`) from the pose it left: 3.25 deg, which is the clip's own. Any turn that starts while the
  last one still shows eases in the same way. The wrap's ease from the end pose moved from 10 % of progress to the same
  0.2 s.
- **A slow spin (0.5-1 rad/s)** faded to weight 0.06 before each wrap, because holdOut needed more than `turnRate`. It
  now holds while the turn goes on: 1.000.
- **A spin that walks off the spot** replayed the turn-in-place clip at full weight for good while walking. Now it wraps
  only on the spot. After walking off, the pass ends and a turn on the move takes over (4.19 deg, the same as the move
  turn alone).

Item 8 (switch off mid-game): clearing `clipPlant` broke the switch off mid-stop. A foot planted toe up on the clip's
heel strike stayed tilted at idle for good (1.4 m/s stop, off 12 frames in: -0.112 rad, 6.4 deg). With the switch off,
the stop's flatten is the only thing the flag does. Now a planted toe-up foot keeps `clipPlant` until it lifts. All 6
mid-stop cases (1.4 / 2.0 m/s, off 6 / 12 / 18 frames in) end flat. Everything else is cleared as before.

## 3. Switch OFF byte-identical
Dump repro (repro/dump.test.ts, 14 scenarios x 420 frames x 21 nodes), on the final tree and on `git archive f4b5b7c1`
(C:/NightShift/scratch/mt2/off-base, node_modules junction): both 31,065,812 B, md5 `9ce3f3d1c70c299dca072d3a4f15f9ea`.
OFF-path writes added: none beyond the existing `mDutyGait = -1` branch (now also `mPh = -1`, `mCarry = false`; private
fields read only with the switch on).

## Tests
`tests/mocapFix2.test.ts` 11 / 11. Item 8's test is adapted (a planted plant flag is kept until it lifts). New tests:
- spin reversed;
- slow spin;
- spin walking off the spot;
- clip duty edges (switch on mid-jog, quick crouch out and back);
- switch off mid-stop.

The first four new ones listed in the commit (all but the slow spin, added later) fail on e0298f90's code (15.8 deg;
turnSpot kept; 0.23 step; -0.08 rad left).

Before the final commit: mocapSwitch 13 / 13 three times running, footPlanner 12 / 12, animSkeletonIdentity and
animSkeletonGuardIdentity pass, `tsc --noEmit` and eslint on the four files are clean.

## Open
- Partner rig, item 3: `RemoteAvatar` eases its speed up from 0 (x min(1, dt x 10) a frame). At 60 Hz a partner first seen
  walking at 0.3 m/s or more is past `restSpeed` on its first frame, so it plays no start. A partner first seen creeping
  slower (or under about 1.2 m/s at 240 Hz) seeds as standing and plays a start. The fix belongs in `remoteAvatar.ts`
  (seed `speed` from the state on `placed`), outside this area.
- The switch turned OFF mid-jog: the duty goes from the clip's 0.21 to the planner's 0.44 in a frame. That is the OFF path
  (it cannot be gated on the switch). It is a settings toggle, with 0 swing -> stance events in the case run.

## Changelog (for the lead)
- Mocap switch ON: a spin on the spot that reverses, slows or walks off plays on smoothly; the clip's short jog / run
  stance eases in and out at every clip-feet edge (switch on mid-jog, crouch / draw); the switch off mid-stop no longer
  leaves a foot toe up. Per-frame allocation back to #159's (mocapSwitch passes).
