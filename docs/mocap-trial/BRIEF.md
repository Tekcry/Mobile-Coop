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

## Assumed decisions
- A1: ASF/AMC from the official site (not the third-party BVH conversions); an in-repo Blender-headless importer.
  Undo: use the BVH conversions.
- A2: the mocap clips use the existing keyed-clip format and path (`src/anim/clips/keyed/`, sampled like the hand-keyed
  ones), so the switch only picks which clip set the graph reads. Undo: the switch off.
- A3: the mocap set drives the legs ("clip feet": the capture's leg motion on the gait phase, foot IK for ground contact
  and pinning only), because the hand-keyed clips' legs are preview-only and the foot planner's steps are what Michael
  called broken. Undo: the switch off (the planner places the feet as today).

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
