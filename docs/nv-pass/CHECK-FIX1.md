# nv-pass fix round 1 - checker, 2026-10-20

## Verdict: PASS (with polish)

Diff 653fdad8..4a6cd99f (fix-round files only), sheets `s12b` vs `before` (master) and `s12`. Luma per view measured
from the single PNGs (centre box 30-70%, frame mean, % of pixels > 224); numbers below are centre means.

## Fix items
1. **Shot guards: done.** nv-shots exits 2 on a busy port, a dead own server and a served `index.html` != `dist`;
   nv-gpu.sh `rm -rf dist`, fails on build and shot exit codes, deletes `*-before-*` first, `.before-verified` set.
   Before sheets now show master (round lens, pale tint, blown floors) in every view; s12b differs in every NV view.
2. **Auto-gain: done, one target short.**
   - wh-yard Epic NV: 30% -> 0% of pixels > 224, centre 234 -> 107, wall readable. Medium/min not clipped.
   - Lit rooms unchanged (s12 -> s12b, Epic): yard-s1-bay 90.3 -> 90.3, s3-camera 91.1 -> 89.2, s5 51.5 -> 51.5,
     s7 68.5 -> 68.5, wh-corridor 83.3 -> 83.1, wh-goods-in 57.1 -> 57.2. Within 3%, well inside +-15%.
   - yard-look NV: 13.0 -> 18.7 centre (Epic and Medium), frame mean 12.7 -> 19.8. Below the >= 30 target, but the
     right wall, rail and floor edge are visible. Not a block (see polish 1).
   - wh-workshop: GPU reads 24.2 -> 29.0 (Epic), 28.1 -> 29.0 (Medium), not the model's 70. Not too bright: fine.
3. **e2e-darkness probe prints NV rgb: done.** Target (13.7% vs 20-45%) is with the orchestrator.
4. **min NV >= off: done in all 9 views.** Lowest margins: yard-look 1.5 -> 11.0, s5-backroom 38.5 -> 59.7,
   s3-camera 40.1 -> 56.5. min vs Medium lit room: yard-s1-bay 81.5 vs 91.3 = 89% (the FIX1 68% was the CPU model;
   resolved). s3-camera 56.5 vs 88.6 = 64%.

## Rules
- Light parity: clean. Gain is in `CinematicPost` / `NightBloom` only; no gameplay, meter or perception reads it
  (the `exposure` hits in `src/ai`, `gameState` are the unrelated body-exposure fraction).
- Hot path: clean. `runExposure`, `pass`, `onApply` allocate nothing per frame (shared band tuples, targets made once).
- Nothing broken: check 2043 PASS, smoke PASS, served build verified (given).

## Polish
1. yard-look 18.7 < 30 and e2e deep fill 13.7%: the CPU model over-predicted the lift. Raise `NV_EXPOSURE.hdr.lo`
   (0.06 -> ~0.1) or `max` (3 -> 4) and re-shoot; keep lit rooms in band.
2. min floors (s1-bay, s3-camera, s5-backroom): `postLift` 3 clips the floor texture's light cells to white, a noisy
   checker; wh-corridor min lit walls 8% > 224. Consider a softer shoulder on min instead of a flat lift.
3. min measure follows the frame (k = 1) from a sparse sample (16 scene pixels per measure texel): watch for flicker
   when panning on `?gfx=min`.
4. nv-shots does not print per-view off -> NV centre means or flag NV < off (fix 4 asked); measured here by hand.
5. wh-yard Epic NV is a flat bright wall (texture faint); fine for now.
