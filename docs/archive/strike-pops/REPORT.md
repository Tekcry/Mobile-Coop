# strike-pops - report (spare job #5, CT Core Build, 2026-10-23)

Branch `feature/strike-pops` (from master 4.68.0, 3950f3f8). Row: spare-jobs #5 "Hand-swap and strike pops: n4c 1 (dip
speed flip), n4c 9 (wrist 31 cm jump), n4d 1 (follow-through survives a bay restart)". Resumed from the previous agent's
WIP (563b87f7 + uncommitted): kept all of it (the strike body's pace limit, `TakedownController.endTail` from
`StrikeController.reset`), retuned the rate, dropped its dump test (`tests/_dumpStrike.test.ts`, it no longer compiled).

## What and why, per item (60 Hz, Wren rig, NullEngine; numbers from `tests/strikePops.test.ts`)

### n4c polish 9 - the strike's wrist step, and the trunk's one-frame reversal (DONE)
Why: the strike plays the arc 0 -> contact in ~4 frames (`strikeWarp`, anim-n4c M1). The strike body layer
(`strikeBody.ts`) followed the arc directly, so the trunk's load (one frame) and drive (two frames) landed on top of the
arm's fastest frames. The trunk loaded right and drove left on the next frame at full speed, then turned 18.9 deg in one
frame. The lead's note for "n4c 1" (the strike's pelvis / trunk reversing within one frame) is this reversal; it is fixed
here.
Fix: the layer's phase follows the arc at most `STRIKE_BODY_RATE` (6.25 / s; `strikeBodyPhase`, pure, no allocation; the
rig keeps one number, `sbPh`). It is never ahead of the arc, a rewind follows at once, and it starts from rest. The kill
blows (~0.82 / s) and the recovery (~0.75 / s) never reach the limit.

| Per frame | Before | After |
| --- | --- | --- |
| Right wrist, largest step | 31.4 cm (24.2 / 31.4 / 26.6 / 13.1 / 14.9 / 14.5) | 27.0 cm (24.8 / 22.3 / 27.0 / 19.2 / 13.3 / 12.6 / 5.8) |
| Shoulder line, largest step | 18.9 deg | 13.3 deg (drive over 2 frames: 13.3, 12.1) |
| Shoulder line, reversal (smaller speed either side) | 12.1 deg/frame (+12.6 -> -12.1) | 0.4 deg/frame (+9.2 -> -0.4 -> -13.3) |
| Hips, reversal | 1.4 deg/frame | 2.4 deg/frame (a 2.4 deg load; under the 3 deg bound) |
| Pelvis position, largest step | 2.9 cm | 2.0 cm |
| Wrist after contact (recovery, release) | max 4.5 cm, step change 2.3 cm | same (the graph's recovery, untouched) |
| Hit (gameplay) | step at 83 ms (`STRIKE.hitAt` 0.08) | unchanged |
| Hand across (within 1 cm of furthest) | 100 ms | 100 ms |

Rate sweep: 7 / s (the WIP) left a 10.6 -> -4.6 deg reversal and 15.5 deg in one frame; 6.5 gave 14.1 deg; 6 / s put the
hand's arrival a frame late (117 ms, which fails animN4cStrike's contact assert); 5.5 put the shoulders through after the
hit. 6.25 is the only rate that passes every existing assert and the new ones. Its margin on animN4cStrike's contact
metric is small (hand 2.9 cm vs a 3.0 cm cut-off at 100 ms; master 2.1).
A wrist bound of "~3 cm a frame" does not fit the drive: the hand covers ~125 cm in 6 frames to land at 80 ms, so the arm's
joint limits alone give ~22 cm a frame. The test encodes: wrist under 28 cm a frame in the drive, and after contact under
5 cm a frame with no frame-to-frame change over 3 cm. The pelvis is held under 2.5 cm a frame everywhere.

### n4c polish 1 - the hand swap's dip speed flip (DONE)
The audit's item 1 (docs/anim-natural/n4c/STATE.md) is the hand swap, not the strike: "A mid-swap reversal flips the dip's
vertical speed in one frame". A reversal rewinds the swap progress (s -> 1 - s). The dip (`handSwapK`, sin^2) keeps its
value but its rate flips sign, and so does the graph's tuck bump (sin).
Fix: the rig gives the graph and the dip the progress read back from the hand blend (`handSwapPh`, the inverse
smoothstep, in `handSwapPath.ts`). The blend keeps its velocity through a reversal (the rig's Hermite), so the dip and
the tuck do too. A plain swap gets exactly its own progress back, so the shape is unchanged (animN4cHandSwap passes as
before). `characterRig.ts`: 2 lines plus the import, in the hand-swap block (not strike-gated; this is the row's
"Hand-swap" half). The mocap paths and `animGraph.ts` are untouched.

| Aimed rifle, grip height per frame | Before | After |
| --- | --- | --- |
| Reversed on the way down (s 0.27) | -8.19 -> +3.01 cm/frame (flips at 3.0) | -8.18 -> -6.73 -> -4.05 -> -2.02 -> -0.49 (eases, flips at 0.6) |
| Reversed on the way up (s 0.73) | +10.15 -> -5.00 cm/frame (flips at 5.0) | +10.15 -> 9.42 -> 5.74 -> 2.24 -> -0.13 (flips at 0.3) |

### n4d polish 1 - follow-through after a bay restart (DONE)
Why: the course's and the sector's restart sites (courseMode.ts:641, sectorMode.ts:283) reset a takedown only while it
runs. A kill's follow-through (`tailU`, up to 0.31 s) was not ended. The respawn's `StrikeController.reset` did not touch
it either. A kill within the respawn delay (or a 0 s respawn) carried the arm's swing onto the respawned player.
Fix: `StrikeController.reset` (the respawn's, GameState) now ends the tail (`TakedownController.endTail`, also used by
`TakedownController.reset`). The co-op client's `revive` event, which brings an alive partner back to the checkpoint on a
bay or section restart, now also calls `g.strike.reset()` (`coopClient.ts`, 1 line). courseMode.ts and sectorMode.ts are
untouched (marlow-final slice 0 files; not needed). In the rig, the trunk layer drops to rest the frame `melee` goes to -1,
and a new strike starts from rest.
Before / after: a reset inside the tail left `tailU` 1.02 and the arc posed on the next steps; now `tailU` -1 and
`melee` -1 on every later step (test).

### n4c polish 7 - the co-op accept rewind (already done on master)
anim-n4d fixed it before this job: `StrikeController.lead` and `LEAD_CATCH` keep the posed phase from stepping back.
It is tested in `tests/animN4dKill.test.ts` ("a client accept keeps the posed strike moving on"). No change here.

## Files
- `src/anim/strikeBody.ts`: `STRIKE_BODY_RATE` 6.25, `strikeBodyPhase` (pure).
- `src/player/characterRig.ts`: `sbPh` and the strike layer through `strikeBodyPhase` (strike-gated); `i.handSwap` from
  `handSwapPh(handBlend)` and the dip from it (hand-swap block).
- `src/anim/handSwapPath.ts`: `handSwapPh`.
- `src/game/strikeController.ts`: `reset` ends the kill tail.
- `src/game/takedownController.ts`: `endTail` (from `reset`'s old inline code).
- `src/net/coopClient.ts`: `revive` resets the strike.
- `tests/strikePops.test.ts` (new, 7 tests).

## Tests (one at a time)
- tests/strikePops.test.ts: 7 / 7 pass. Its pop asserts fail on the old code (checked: rate unlimited, the old
  `i.handSwap`, no `endTail`): pelvis 2.9 cm, reversal 12.1 deg, swap flips 3.0 / 5.0 cm, tail still posed.
- tests/animN4cStrike 6 / 6, animN4dKill 11 / 11, elbowStrike 5 / 5, takedown 18 / 18, animN4cHandSwap 7 / 7: pass, no
  assert changed.
- tests/animSkeletonIdentity 1 pass, 1 skipped (the fixture capture, skipped by design); tests/mocapSwitch 13 / 13.
- `npx tsc --noEmit -p .` clean; eslint on the changed files clean.
- Not run (per the brief): full vitest, `npm run check`, build, e2e. Suggested for the PR: e2e-anim, e2e-takedown,
  e2e-coop (`coopClient.ts`), e2e-ctcourse.

## Open items
- The graph's strike recovery moves the wrist up to 4.5 cm a frame (2.2 -> 4.5 at ~380 ms), on master too. That is the
  graph's melee hand weight blending out (`animGraph.ts`, a mocap file, kept out). Not a pop by the test's 3 cm
  step-change bound.
- The strike's first frame moves the wrist 24.8 cm from rest (the graph's arc and the arm's limits), unchanged.
- At the end of a reversed hand swap the gun rises ~3 cm above its rest and settles (the graph's tuck and the
  inertializer). This is on master too and not changed here.
- 30 Hz was not re-measured (the WIP's note: wrist 41.1 -> 38.2 cm at 7 / s).
- GPU sheet look (elbow-strike-guard, hand-swap-shoulder rows): pending a PC run.

## Changelog line
- Strike and hand-swap pops: the elbow strike's trunk no longer reverses at full speed (wrist 31.4 -> 27.0 cm, pelvis
  2.9 -> 2.0 cm a frame, hit timing unchanged), a reversed hand swap keeps the dip's direction, and a bay or section
  restart ends a strike or a kill's follow-through (`changes/feature-strike-pops.md`).
