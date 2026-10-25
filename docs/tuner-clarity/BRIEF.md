# Tuner clarity: motion capture or hand-made, made plain

Owner: Night Shift | Player Build. Branch `feature/tuner-clarity` from origin/master (f24ebbf6a). ROADMAP Now row 0c
(orchestrator, 2026-10-25 ~15:30): runs ahead of the row 6 sign-off by Michael's own instruction. Tool only: no game
animation value changes.

## Michael said (verbatim)
- 2026-10-25 15:30: "Please update the anim tool with these changes, I can't tell if my changes are working between
  motion capture or keyed. Must be clear"
- Earlier 2026-10-25: "I can't twist the ankle, only roll and pitch which don't fix it. How do I make it twist?"
- "Ankle/shin can't be changed in the key full body tab. Also why is it in the full body tab?"
- "I fixed it in hands and feet, but why did I need to go there? Why couldn't I just use those options in the keyed
  section?"
- "Does the anim dev change the mocap animation?"

Context (orchestrator relay): he walked the walk in the tuner and a knee flew out on one key. Keys-tab edits change only
the hand-keyed clips (`src/anim/clips/*`), not the motion-capture set (`src/anim/clips/mocap/*`), which is what plays by
default (G264, G298). His fix worked only through Hands & feet foot turn. Many Body sliders do nothing on the mocap
share because their `MOCAP_LAYERS` weight is 0 (`src/anim/mocap.ts:98-101`). He is not technical: labels in plain words.

## Michael picked
Nothing yet (no multiple-choice question asked for this job).

## Goal (the orchestrator's scope)
1. Every tab, part and slider shows plainly what it changes: "motion capture", "hand-made" or "both", and "nothing on
   what is playing now" where that is true.
2. A live "Now playing: motion-capture walk" / "hand-made crouch walk" line in the tuner panel header and in the Anim
   Studio.
3. When he edits a setting that does not change what is playing, a clear one-line warning that names where the setting
   that would work lives.
4. Keys tab: legs in their own Legs part (not under Full body), with per-key foot / ankle twist and shin twist rows.
5. Unclear points are assumed and logged below.

## Assumed decisions (Assume and log, RULES Intake step 2)
- A1. The Keys tab does not edit the motion-capture clips in this job. A plain note on the Keys tab says so: "Keys change
  the hand-made moves only. Motion-capture moves are changed with Hands & feet and the motion-capture Body sliders."
  Undo: a later job adds per-key offsets on the mocap clips (needs its own plan; the clips are converted CMU takes).
- A2. Wording: "Motion capture", "Hand-made", "Both", "Not playing now". Colour plus words (never colour alone). Undo:
  change the strings in one table.
- A3. "What is playing" is read live from the animation graph each frame the panel is open (which clip set drives the
  body now, and which move), not guessed from settings. Undo: none needed (display only).
- A4. The warning is a one-line strip under the edited row and in the panel header, shown for about 5 s after an edit
  that changes nothing on screen; no modal, no sound. Undo: switch it off in the panel options.
- A5. Body sliders whose motion-capture weight is 0 are labelled "Hand-made only" rather than hidden, so the panel layout
  he knows stays put. Undo: hide them on mocap.
- A6. No change to any animation value, clip, default or the game's look; no look video (tool change). The PR carries
  panel screenshots instead. Undo: revert the PR.
- A7. The tuner's phone layout (G232: touch is allowed in the tuner) gets the same labels and the Now playing line.

## Gates
Opus PLAN.md, a fresh Opus plan checker, then build; Opus builds and checks animation code; e2e `e2e-studio` and
`e2e-tuner-phone` on the laptop queue. Message the orchestrator at PR open / train-ready / blocked.
