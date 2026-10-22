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

## Confirmed cause (2026-10-22, implementer resume; NullEngine frame trace of the pre-N3 code, `tests/helpers/drawHarness.ts`)
The incoming draw travel ended at `SWAP_HOLD` 0.8 of the swap clip, and for the clip's last 20 % its own pocket keys (a
level pocket, its weapon-pitch channel, the support hand off) held the gun at full overlay weight: the rifle's X draw
arrived level (+6 deg) and crept at 0.1-0.25 m/s for 5 frames (0.08 s), the pistol's at -7 deg for 10 frames (0.17 s).
Only when the swap clock ended did the overlay fade out (`SWAP_FADE`, 8 frames) and the low ready take over, so the gun
moved a second time, pitching down 34 deg (rifle) / 53 deg (pistol) at 3-3.8 m/s at the muzzle: the "random stop".
Before it, the catch (`CATCH_DIST`) held the rifle in its slot until the wrist was within 13 cm, then ran the rest of
the travel in about 0.13 s (muzzle -59 -> +83 deg in a frame). The trace found three more: the swap press switched the
pose weight to the incoming gun's (`PlayerWeapons.weaponWeight` -> the graph's pistol pocket), jumping the outgoing rifle
28 cm in one frame; the swap's travel end at 0.8 handed over to the hold with an 11 cm one-frame jump (AUDIT rank 10);
and a draw measured the aim pocket's sight weld with the last held gun's span (`gunSpan` was set only at the hold), so the
pistol's LT draw sat 7 cm low and jumped at its end.

## Resolved (2026-10-22)
All of the above is fixed and covered by `tests/n3DrawMotion.test.ts` (every scenario: no 3-frame stop between the start
and the settle, no one-frame grip / wrist jump over 3.5 cm, nothing moving after the end, final poses as on master).
The times are DRAW-TIMES.md's. The scaffolds (n3Dbg / n3Trace / n3Capture / n3Hol) are deleted; the trace lives in the
real test. Open: the GPU proving run (`scripts/anim-natural/audit.mjs`, rows `draw-*`, `swap-drawn`, `holster-*`,
`ready-to-aim`) and the full e2e, both on the job lead's desktop lock.
