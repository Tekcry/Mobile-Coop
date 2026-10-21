# anim-natural N3 - parked work in progress (2026-10-22 ~09:40)

Paused for usage pacing (orchestrator: one agent at a time, N0 first). UNVERIFIED: the implementer was stopped
mid-slice (its last note: "Order there is wrong; swap the two lines"). Built so far: `src/anim/drawMotion.ts` and
`src/weapons/drawTune.ts` (new: the draw phases and their tuner values), edits in `src/weapons/{drawState,
playerWeapons, weaponModel, backDiag}.ts`, `src/player/{characterRig, weaponStance}.ts`, and in track B's
`src/anim/animGraph.ts` and `src/anim/tuneBakeTable.ts` (route through the orchestrator before shipping), test helpers
`tests/helpers/draw{Harness, Scenarios}.ts` and tests `tests/n3*.test.ts` (n3Dbg / n3Trace / n3Capture look like
debugging scaffolds: keep the real tests, delete the scaffolds before the PR). The cause of the mid-draw stop is not
yet recorded here: on resume, read the diff and the n3Trace test, or resume the implementer.
