# anim-natural N3 - parked work in progress (2026-10-22 ~09:40)

Paused for usage pacing (orchestrator: one agent at a time, N0 first). UNVERIFIED: the implementer was stopped
mid-slice (its last note: "Order there is wrong; swap the two lines"). Built so far: `src/anim/drawMotion.ts` and
`src/weapons/drawTune.ts` (new: the draw phases and their tuner values), edits in `src/weapons/{drawState,
playerWeapons, weaponModel, backDiag}.ts`, `src/player/{characterRig, weaponStance}.ts`, and in track B's
`src/anim/animGraph.ts` and `src/anim/tuneBakeTable.ts` (route through the orchestrator before shipping), test helpers
`tests/helpers/draw{Harness, Scenarios}.ts` and tests `tests/n3*.test.ts` (n3Dbg / n3Trace / n3Capture look like
debugging scaffolds: keep the real tests, delete the scaffolds before the PR). The cause of the mid-draw stop is not
yet recorded here: on resume, read the diff and the n3Trace test, or resume the implementer.

Routing (orchestrator, 2026-10-22): the edits in `src/anim/animGraph.ts` (the draw hand-off) and
`src/anim/tuneBakeTable.ts` (the draw sliders' bake rows) are approved: keep them minimal and additive, name the lines
in the PR body, and send them to CT Core (N1 / N2 work near those files) before the PR. Record the mid-draw stop's cause
here as soon as the trace finds it.

N0's finding on the stop (2026-10-22, AUDIT.md rank 2-3): the X draw flicks the rifle off the back (muzzle -52 -> +87
-> 0 deg in 3 frames, 10-11 m/s), holds it level at the shoulder ~0.15 s, then drops it to low ready; the pistol holds
~0.18 s. Likely cause: the swap clip's pocket keys hold before the low ready takes over (`travelKeys` backPocket
0.65-1.0; pistol 0.8-1.0). Confirm with tests/n3Trace.test.ts. Also rank 10: a 12 cm one-frame jump at the swap
hand-off. Open for Michael: draw times (rifle 0.3 s, pistol 0.5 s, G2) are below the bible's 0.75 / 0.6 s raise
minimums.
