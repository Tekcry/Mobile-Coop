# mocap-trial-2 - check 3 (fresh checker, Opus, on feature/mocap-trial-2 da86e8e7)

2026-10-23. Verdict: **FIX**. CHECK-2 required 1-3 are fixed (by the verdict lines), the new clips are integrated and
credited, switch OFF is byte-identical and allocation passes. But driven the way the game drives the rig for a CT player
(pace through CT's springs, `quickStop` 0.12 always, the stop hold's `holdSpeed`, flicks at CT's 7.85 rad/s turn rate,
the 0.22 s eased crouch), switch ON still pops, slides and drops the pelvis in common player moves. Most of these are
older than this batch (present on aff84c5a, the master merge, or on #159 f4b5b7c1) and this batch improved many; they
fail now because M4 turns mocap on by default after this check. None show in the agents' sweeps: driveRig sends
`quickStop` 0, no hold, one-frame or linear pace changes and turns of 4 rad/s at most.

Columns: ON vs OFF (the hand-keyed set, same plan). For origin: aff84c5a (master merged into mocap-trial-2 plus #159's
merge review, before any mt2 agent) and f4b5b7c1 (#159). Pelvis = the hips' move in a frame beyond pace x dt.
Reproduce: `C:/NightShift/scratch/mt2/c3out/repro/` (zzplayer: `GROUP=A..G`, `QS=0` drops the CT stop inputs; zztrace:
`CASE=accelTurn|start14|start28|spin6|flick90`; zzslide), outputs in `c3out/`.

## Required
1. **Speeding up through the bands while turning: the pelvis drops 46 cm in 4 frames.** The plan: 1.4 -> 5.0 m/s
   through CT's start spring while turning 3 rad/s. Worst frame 13.85 cm beyond pace (OFF 2.36), hips 81 -> 35 cm. Also
   on aff84c5a (12.73); f4b5b7c1 5.77.
   - Trace (t 5.37-5.50): clip feet come on mid-acceleration (the faster gait's turnMax rises above 3 rad/s). The
     gait duty is still easing down from the walk's 0.52 at 0.5 x dPh a frame (animGraph.ts ~2500-2511, `mDutyGait`),
     while the pose is already a run (mPace 3.6-4.5).
   - The clip pins the planted left foot for a walk-length stance at 4.4 m/s (`clipFoot` "planted under the clip:
     pinned", footPlanner.ts ~1438). Its reach need goes 2 -> 11 -> 23 -> 43 cm in 4 frames, and it lifts only at t 5.52.
   - Fix: with clip feet on, a planted foot whose reach need (`reachNeedL/R`, pop1) passes ~3 cm toes off to the planner
     at any time. Today only `CLIP_TAKE_BEHIND` does that, and only in a start (footPlanner.ts ~1428). Or keep `CF.on`
     false until the gait duty is within ~0.05 of the clip's (animGraph.ts ~2481).
   - Same family, probably the same cause: pace swings through the spring every 1.1 s. 1.4 <-> 5.0: pelvis 7.84 cm
     (OFF 2.30), planted slide 2.38 cm (OFF 0.01). 1.0 <-> 4.0: pelvis 4.11 (OFF 2.54), slide 4.53 cm. Both are
     pre-existing (aff84c5a 6.73 / 4.10). The 1.2 s and 0.55 s ladders through every band pass (pelvis 1.0, bone 17-22).
   - Add both plans to a test.
2. **CT start after a short stand: a foot skims along unplanted.** Through CT's stop (hold, `quickStop` 0.12) and start
   springs:
   - **1.4 m/s after a 0.3 s stand** (1 of 5 stop phases): knee-ankle 41.4 deg, pelvis 6.66 cm, slide 1.24 (OFF 17.2 /
     1.55 / 0.01). This is new in this batch (aff84c5a 17.2 / 1.75).
   - **2.8 m/s after a 0.3 s stand** (3 of 5 phases): knee-ankle 34-48 deg (OFF 30-31, arms), planted slide 5.6-6.6 cm
     (OFF 0.01), pelvis 6.7-7.6 cm (OFF 4.7-5.4). Pre-existing (aff84c5a 46-52 deg, slide up to 8.2).
   - **4.0 m/s after a 2 s stand** (1 phase): slide 3.14 cm (OFF 0.01; aff84c5a 2.99).
   - With `QS=0` (driveRig's plain stop) none of these appear, which is why zzstarts and mocapShortStart pass.
   - Trace at 1.4 (t 3.43-3.62):
     - The planner's start toe-off lifts the left foot on the first moving frame. pop3's `clipIdle` mark
       (`moveT < dt * 1.5 && !f.contact && !f.clipOwn`, footPlanner.ts ~1352) takes it for the stop's leftover idle
       step and shortens its stepDur.
     - The stance-window in-air branch (footPlanner.ts ~1002-1003) then takes it from 0.88 to 1.00 without landing:
       it lands only if the swing was already >= 0.9 at the start of the frame.
     - The next frame the clock's swing window takes it over with `swBase` 1.00 (~928; `sp = swBase + (1 - swBase) x s`
       stays 1). The ankle jumps 40 cm in a frame, then the foot rides along with the root unplanted for the whole
       window, and the pelvis drops 8 + 3 cm.
     - At 2.8 m/s the same toe-off hangs near the ground at 0.88 for 0.3 s, then the clock restarts it at 0.03.
   - Fix (all gated on `i.clipFeet`):
     - mark `clipIdle` only for a swing that was in the air before the move began;
     - in the in-air branch, land when the new progress reaches 0.9;
     - a takeover with `swBase` >= 0.9 lands instead of carrying on.
   - Add CT-driven starts (quickStop / holdSpeed, spring pace) to mocapShortStart.
3. **Walking flick turns at CT's turn rate: a 2.8-3.0 cm pelvis lurch as the flick ends.** The plan: 90 / 180 deg at
   7.85 rad/s, with CT's pace dip (0.55 x angle / pi).
   - Pelvis: walk 1.4 / 2.0 and jog 2.8 (the 180's dip takes it into the walk band): 2.79-2.96 cm (OFF 0.2-1.4).
   - Ankle-toe: 2.0 x 90 25.2 (OFF 15.4); 2.0 x 180 31.7 / 36.1 (OFF 29.2 / 30.5).
   - Pre-existing since #159 (f4b5b7c1 identical). The sweeps stop at 4 rad/s; the CT player turns at 7.85.
   - Trace (1.4 x 90, t 4.18-4.22): the hips move 5.1 cm in the frame the yaw rate drops from 7.85 to 0 (2.3 normally).
     That is the frame the turn-on-the-move slot is cut (`ay < turnRate * 0.5` -> `turnT = -1`, mocap.ts ~347), after
     which it eases out by tau 0.06.
   - Fix: ease the turn slot out over >= 0.15 s when a turn ends abruptly, or rate-limit the slot's pelvis x / z as
     `KEY_PEL_RATE` limits y. Add 7.85 rad/s 90 / 180 flicks at 1.4 / 2.0 / 2.8 m/s to the mocapSwitch sweep.
4. **Spot turns: an anchored (ball-pivot) planted foot slides 2-2.6 cm** (e2e `plantSlide`): a 180 flick at 7.85 rad/s
   2.06 cm, a held 6 rad/s spin 1.7-2.56 cm (OFF 0.01). It appears between f4b5b7c1 (0.01) and aff84c5a (1.87 / 2.02),
   from the master merge, not the review hunks (those are gated on clip feet). fix2's `easeFrom` makes the spin's later
   passes worse (1.25-1.37 -> 2.25-2.56; measured with `easeFrom` set to ~0). Fix: find which merged master hunk moves
   the anchored ball under the turn-in-place slot (characterRig / footPlanner merge hunks of aff84c5a). Ease the wrap
   from the pose for the upper body only, not over a planted pivot.
5. **The switch toggled mid-move** (Settings or the tuner; co-op does not pause; toggled ON -> OFF -> ON every 1.3 s):
   - jog 2.8: pelvis 12.4 cm, knee-ankle 41-47 deg;
   - run 4.0: pelvis 7.2-14.5 cm, ankle-toe 60.8 deg, slide 5.4 cm;
   - sprint 5.0: elbow-wrist / shoulder 59-62 deg;
   - walk 1.4: 31-41 deg;
   - sneak 0.8: pelvis 3.2-3.7 cm;
   - all switch OFF: 0.03-1.7 cm / 9-23 deg.

   The worst is ON -> OFF, but both directions pop. Walk / jog / run are as on f4b5b7c1; the sprint and sneak slots are
   new. The set swap is instant (`LOCO.set`), and the duty snaps on the way off (MT2-FIX2 Open). Fix: after a toggle,
   cross-fade from the last pose over ~0.25 s (scratch pose plus a fade timer) and ease the duty both ways. A rig never
   toggled stays byte-identical. (It is a one-off snap at a deliberate setting change: the lead may move it to Decide.)
6. **Smaller, each just past a line:**
   - (a) Crouching while jogging 2.8 m/s (0.22 s eased crouch, pace to 2.6): knee-ankle 25.4 deg at the ramp's end
     (OFF 17.0). MT2-CROUCHPOP covered walks only.
   - (b) Sprint 5.0 x 180 flick: planted slide 2.09 cm (OFF 0.01; aff84c5a 0.00).
   - (c) Crouched sneak 1.0 x 90 flick: slide 2.06 cm (OFF 1.23); the other offset ankle-toe 28.3 (OFF 25.9).
   - (d) CT stop from 5.0 m/s: elbow-wrist 30.2-30.8 deg in the hold's fade (OFF 28.0; `holding` tau 0.05,
     animGraph.ts ~1033).
   - (e) Drawing at 4.0 m/s: knee-ankle 24.2 (OFF 20.8).

## Checks from the brief
1. CHECK-2 required 1 (zzsweep2, 78 plans): pelvis ON max 1.75 cm (2.0 x 4 offsets 0 / 0.37 / 0.71: 1.73 / 1.69 / 1.75;
   ramped ends 1.71 / 1.75). Pre-fix: 2.51. Under the 2 cm line. The brief's "ON <= OFF + ~0.5" is not met (OFF 0.14 on
   these plans; pop1: the rest is the turn slot's pelvis pose): a note by the verdict rules. Bone steps ON <= 23.1;
   planner slide 0.
2. Required 2 (zzstops, 150 stops, ankle-toe added to the print): ON worst ankle-toe 17.0-17.2 vs OFF 16.8-27.4. At 1.0
   / 1.4 m/s ON 17.2 vs OFF 16.8 / 16.9 is the mocap walk's own steady step (frame 32, the first start), within OFF + 2
   and under 24. Bone ON 17.2-22.1 vs OFF 29.2-38.0. Pass.
3. Required 3 (zzstarts, 450 starts): ON worst 17.2 / 18.8 / 22.1 deg at 1.0 / 1.4 / 2.0 m/s, 0 / 450 over 24. Pass
   (driveRig stops; see required 2 for CT stops).
4. New clips:
   - 136_09 (crouch walk) and 127_07 (sprint): SOURCES.md:39-40, TAKES.md:320-321 / 576-577, art-credits.md:27.
   - Statically imported `clips/mocap/*.ts`, no fetch; `.mocap-cache` gitignored.
   - Sprint: steady 4.0-5.0 slide 0.00, stride ratio 0.93-1.01 (MT2-SPRINT). mocapSprint passes, including its 5.0 x
     2-4 rad/s turns. Probes: steady, ladders and 90 flicks pass. Fails: 180 flick slide (6b), toggle (5), acceleration
     while turning (1).
   - Crouch: body only over the planner's feet. Sneak starts / stops (stands 0.3 / 1.5, 0.5-1.0 m/s, 18 cases), the
     spot 180 and the crouched ladder 0.6-2.6 pass. Fails: 6a, 6c.
5. Allocation (zzalloc, min of the windows, the stricter reading; medians noisy):
   - walk / turns / stops: ON 12.1 / 7.96 kB vs OFF 15.2 / 10.3 kB a frame;
   - zzalloc2, adding sprint, crouched sneak, spin and stops: ON 11.3 / 8.4 vs OFF 16.6 / 11.4.

   ON <= OFF. Code read: no new allocation in the hot paths (scalars, scratch poses, ternaries for `clamp` /
   `mocapLayerK`). mocapSwitch's allocation assert passes.
6. Switch OFF: repro/dump.test.ts on this tree and on `git archive f4b5b7c1` (scratch/mt2/check3-base): both
   31,065,812 B, md5 9ce3f3d1c70c299dca072d3a4f15f9ea. Code read: every new branch is gated on `LOCO.mocap`, `i.clipFeet`,
   `i.mocap`, a clip flag, `liftW` (0 without clip feet) or a null set slot. `clipFootOff` keeps `clipPlant` only after
   a switch-off, and `pin.mocap` is read only with the switch on.
7. tsc and eslint (src/anim, src/player/characterRig.ts) are clean; tsc's only errors are in my zz copies. Run alone, all
   pass:
   - mocapSwitch 13/13, mocapFix2 11/11, mocapStopPitch 1/1, mocapShortStart 1/1, mocapRunTurn 4/4;
   - mocapCrouch 6/6, mocapCrouchShift 2/2, mocapSprint 10/10, mocapQuickStop 7/7, footPlanner 12/12;
   - animSkeletonIdentity and animSkeletonGuardIdentity (1 + 1 skipped each).

   GPU suites: not run (the lead sends them to the laptop).

## Notes (as captured, M1; not fails)
- Crouch capture (MT2-CROUCH): hips 68.6 cm at a sneak (hand-keyed 57.1), a 15 cm crouch drop (hand-keyed 27.5), trunk
  43 deg forward (hand-keyed 21), pelvis sway 8.4 cm p2p.
- Walk 2.0 x 4 turn pelvis 1.7 cm vs OFF 0.14 (above).
- A one-frame stop from 2.0 m/s (driveRig only; CT stops are springs): pelvis 4.0 cm vs OFF 2.4. OFF is over 2 too.
- A CT start from rest to 5.0 m/s: pelvis 7.1 cm ON vs 11.8 cm OFF.
- A spot 90 flick, then walking off at 1.4: ankle-toe 73 deg ON = OFF (the planner's).
- The game passes the motion driver's phase (`rp.phase`), velocity and acceleration; driveRig and these probes use the
  rig's own clock. The remaining gap to in-game.

## Ran
- Dump OFF on head and f4b5b7c1.
- The 12 repo Vitest files, tsc, eslint.
- zzsweep2, zzstops (with ankle-toe), zzstarts, zzalloc, zzalloc2.
- zzplayer: 188 CT-driven plans x OFF / ON. Groups:
  - A: starts / stops at 1.4-5.0 m/s, stands 0.3 / 2 s, 5 phases;
  - B: 90 / 180 flicks at 1.4-5.0 m/s, 3 offsets;
  - C: on the spot;
  - D: pace ladders and swings;
  - E: crouch / draw / both while moving at 1.0-4.0 m/s;
  - F: the sneak: starts, stops, flicks, crouched ladder;
  - G: the switch toggled mid-move, 8 moves x 3 offsets.

  Also on f4b5b7c1 and aff84c5a, and with `QS=0`. 135 of 188 pass.
- zztrace on the worst cases; zzslide (per-plant slide) with a two-way bisect of mocap.ts (restored).
- No e2e, no full vitest.
