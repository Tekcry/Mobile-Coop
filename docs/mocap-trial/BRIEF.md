# mocap-trial - brief (CT Core, top priority from 2026-10-22 ~20:50)

## Ask (Michael, 2026-10-22 ~20:45, on 4.58.0, relayed by the orchestrator)
Walk / jog / run, turns and starts / stops, and weapons look broken; everything else "doesn't look convincing".
Offered free mocap instead of hand-keyed clips: "Are there free mocap animations available? I don't want to record
anything, and I don't want to impact releasing game in future commercially". He chose: "Trial and cmu animations
first. I want to be able to roll back if they aren't good."

## Goal
A quick first cut (G4) for Michael to judge, behind a switch, default off:
1. Source: the CMU Graphics Lab Motion Capture Database only (mocap.cs.cmu.edu). Every take used, the URL and the
   licence text in SOURCES.md. Raw data stays out of git (`.mocap-cache/`, gitignored); only converted Wren clips are
   committed.
2. Retarget headless (Blender -b) onto Wren's rig: walk, jog, run (one speed blend), turn in place, turn on the move,
   starts and stops. Clean foot slide, trimmed loops, strides scaled to our speeds. Neutral (unarmed) takes.
3. Rollback: one switch, a Settings / tuner toggle "Mocap locomotion" plus `?mocap=0/1`, default OFF until Michael
   approves. Off = bit-identical (identity fixture proof). The procedural layers (foot IK, lean, N1 turn rules, N2 body
   motion) keep running on top; anything disabled for mocap clips is listed in REPORT.
4. Proof: a side-by-side GPU contact sheet / video (current vs mocap) of walk / jog / run, a 90 / 180 turn, a start and
   a stop, and the menu path to the toggle on /preview/ after the merge.
Weapons stay hand-keyed; usable CMU aim / carry takes are listed for a later step.

## Hard-rule exception
CLAUDE.md "No external art" allows CC0 textures and the CC0 base body only. Michael's choice above (relayed by the
orchestrator, 2026-10-22 ~20:50) is an exception for CMU mocap data only, converted into Wren's own clips. Confirmed
with Michael in the CT Core session before any download (see STATE).

## Licence (mocap.cs.cmu.edu home page, read 2026-10-22)
"This data is free for use in research projects. You may include this data in commercially-sold products, but you may
not resell this data directly, even in converted form." The site asks not to be crawled: only the named takes are
fetched, one at a time.

## Michael's answers
- M1 (2026-10-22 ~22:55, after the side-by-side sheets and videos on 82f43716, feature/mocap-sheets-real 04598e9a;
  relayed by the orchestrator): "Mocap, as captured". The capture stays as recorded and is not bent to the old limits
  (walk pelvis bob 5.5-6.6 vs bible D2 4 cm, knee-out 3.5 cm, run wrist swing 24 vs his 85 cm tune): those are notes,
  not fails (ROADMAP Decided; replaces A4's "until Michael decides"). Pops (walk-turn pelvis, start toe) and any foot
  slide are still fixed. The bible D2 line is updated at the merge.

- M2 (2026-10-23 ~00:10, relayed by the orchestrator): "i dont need sheets for mocap. you can audit them and add to the
  game when ready." Overnight: more mocap clips behind the same toggle (crouch walk, sprint, strafe, back-to-wall), each
  batch OFF byte-identical, a fresh checker (pops / slides fail, old limits are notes), GPU suites, a PR into the next
  train. No sheets.
- M3 (2026-10-23 ~00:20, asked in the CT Core session, native question): "Yes, download them" - named CMU takes for
  crouch walk / sneak, sprint, strafe and back-to-wall moves from mocap.cs.cmu.edu, ASF/AMC, one at a time, ~20 takes /
  under 40 MB, `.mocap-cache/` (gitignored), each in SOURCES.md, converted clips bundled offline, no runtime fetch.

- M4 (2026-10-23 ~01:25, relayed by the orchestrator): mocap "On by default" once mocap-trial-2 and the new clips pass
  their fresh checker; the hand-keyed set stays behind the switch. The Settings default (and its settings / e2e asserts
  and label) flips in mocap-trial-2's last step, after the checker passes; the PR body says so.

## Assumed decisions
- A1: ASF/AMC from the official site (not the third-party BVH conversions); an in-repo Blender-headless importer.
  Undo: use the BVH conversions.
- A2: the mocap clips use the existing keyed-clip format and path (`src/anim/clips/keyed/`, sampled like the hand-keyed
  ones), so the switch only picks which clip set the graph reads. Undo: the switch off.
- A3: the mocap set drives the legs ("clip feet": the capture's leg motion on the gait phase, foot IK for ground contact
  and pinning only), because the hand-keyed clips' legs are preview-only and the foot planner's steps are what Michael
  called broken. Undo: the switch off (the planner places the feet as today).

- A7 (CT Core, 2026-10-23 ~04:30): the strafe and back-to-wall takes (69_56 / 69_59, 139_14 / 139_15, 139_01 / 139_04) need a
  sideways cycle the clip format does not have (CLIP-FORMAT cycles travel along +z): they go in a batch-2 PR
  (mocap-trial-3); this PR ships the pop fixes, the crouch walk and the sprint, and (M4) the ON-by-default flip once its
  checker and GPU suites pass. Undo: hold the flip until batch 2.

- A8 (orchestrator 2026-10-23 ~06:05, accepted): switching the mocap setting off mid-run / mid-sprint leaves a residual
  pelvis step of 2.1-2.6 cm and ~33 deg bone steps for 0.5-0.7 s (the switch-off gait inherits the mocap stride; fixB's
  0.25 s cross-fade covers the walk / jog). A deliberate Settings toggle: polish list, not fixed (needs a one-cycle stride
  hand-over); in the PR body with the numbers. tests/mocapPlayer item 5 stays it.skip for it.

- A9 (orchestrator 2026-10-23 ~06:10): M4's ON default waits for a follow-up PR. Turned on, e2e-anim's turn feet rows
  fail (jog 90: planted contact 2.7 cm, twist at lift 30.9 deg): clip-planted feet pin the ankle while the clip's stance
  pitch rolls heel to toe, so the rendered heel / ball slide, and they skip N1's anchor / pivot (MT2-FIXE.md). Batch 1
  ships with the default OFF (the flip b597053c reverted in 260f93eb); round F pins the contact like N1 and the flip
  follows. Undo: none needed (the setting is opt-in).

- A11 (orchestrator 2026-10-23 ~08:30): the Anim Studio stage Wren and the menu preview Wren are not carriers, so with
  the mocap switch on they keep the hand-keyed set (the tuner bakes the hand-keyed set). Undo: `carrier = true` on the
  Studio stage rig (studioStage.ts:629 / :673).

## Polish list
- Switch toggle at run / sprint (A8): one-cycle stride hand-over after a toggle.

## Approval log
- 2026-10-22 ~21:00: download approved in the CT Core session ("Yes, download"): the named takes in SOURCES.md only.
- 2026-10-22 ~21:45: standing OK for further named CMU takes for this trial (Michael "Yes, CMU only" ~21:40, relayed by
  the orchestrator; confirmed in the CT Core session "Yes, CMU only"): standing jog / run starts, full run turns,
  on-the-spot turns. Same rules: official mocap.cs.cmu.edu, ASF/AMC, `.mocap-cache/` (gitignored), every take in
  SOURCES.md. First cut and side-by-side first, then the gaps.
- A4 (orchestrator ~22:40): the capture is not bent to the old procedural limits (bible D2 4 cm walk bob, the 3.5 cm
  knee-out line, Michael's 85 cm run arm swing: tuned for the hand-keyed clips Michael calls broken). They are logged as
  "capture vs old limit" in the side-by-side notes for Michael to judge by eye. Checkers block only on broken things
  (clipping, foot slide, pops, wrong speed). Suites pass with the switch off; with it on, an assert encoding an old limit
  is a note until Michael decides.
- A5 (mocap-trial-2, crouch implementer 2026-10-23; M2 / M3): with the switch on, the holstered crouched sneak band plays
  the CMU crouch walk 136_09 (one R-strike cycle 4.23-5.51 s, `clips/mocap/crouch_walk.ts`, `LocoClipSet.crouchWalk`)
  in place of the hand-keyed sneak, as a body only (pelvis, trunk, arms, head, as captured: hips about 11 cm higher than
  the hand-keyed sneak, a 15 cm crouch drop from Wren's mocap walk, the trunk about 43 deg over); the faster bands stay
  hand-keyed (crouch walk 1.8 / crouch run 2.6 m/s: no crouched capture is faster than about 1 m/s), cross-faded into
  over the hand-keyed set's own sneak -> crouch walk blend (about 1.07-1.46 m/s), the crouched idle (squat) as before.
  The feet stay the planner's (the hand-keyed sneak's duty, lift, track and knee pole), not clip feet (A3), by
  measurement: clip feet popped the shins 33-36 deg at a 0.5-0.7 m/s sneak and every start / stop (planner 9-13 deg
  steady, starts / stops at or under OFF's), and handing a crouched step between clip and planner needs the clip-duty /
  footPlanner work other agents own. Crouched, a spin cuts the keyed set by the crouch as the hand-keyed set does (the
  filled turn-in-place slot kept it on; planted feet slid 4-5 cm in a 0.5 m/s x 3 rad/s spin); MOCAP_LAYERS also scale
  N2's body motion on the capture's share; the drawn set's crouched legs stay hand-keyed. Numbers: MT2-CROUCH.md.
  Undo: the switch off, or `crouchWalk: null` in MOCAP_SET (src/anim/mocap.ts).
- A6 (mocap-trial-2, sprint implementer 2026-10-23; M2 / M3): with the switch on, the holstered standing gait crosses the run into
  the CMU sprint 127_07 (one R-strike cycle 0.33-1.01 s, `clips/mocap/sprint.ts`, `LocoClipSet.sprint`) in the effort-pace
  band `KEYED_GAITS.runTo` 4.2 -> `sprintFrom` 5.0 (animGraph `speedSet`, a fourth smoothstep stage after the run; effort pace
  equals the real pace above the 4.0 m/s top gear, so the sprint is fully in at the game's sprint pace 5.0 m/s). The run stays
  alone from its own 3.8 to 4.2. Feet stay the planner's / the clip-feet path as for the run (A3); the sprint clip's travel
  (4.0 m/s at Wren) is scaled to the pace like the others (stride ratio 0.93-1.01). The drawn set and the hand-keyed set
  have no sprint slot (null): the path is unchanged. Gate (ON no worse than OFF): ankle-toe and any-bone step at most OFF + 2
  deg or both under 24 deg, planted slide under 1 cm, pelvis within 2 cm beyond pace x dt, over steady 4.0 / 4.5 / 5.0 m/s,
  3 <-> 5 ramps over 0.5 s, 5 m/s x 2 / 3 / 4 rad/s turns and a braked stop (tests/mocapSprint.test.ts). Numbers: MT2-SPRINT.md.
  Undo: the switch off, or `sprint: null` in MOCAP_SET (src/anim/mocap.ts).
