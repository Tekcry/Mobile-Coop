# Slices B+C brief (playtest 2, 2026-10-19)

Source: `PLAYTEST-2.md` (Michael's notes, verbatim) slices B+C, plus the walking bob left over from slice A
(`A-PLAYTEST2.md`). Prototype pass: playable and clearly closer to CT, no polishing; every number a starting value (G10).
anim-cleanup (PR #12) is merged here: weapon travel, reloads, shoulder swap, traversal grips and hand shapes are its work.
Build on it, do not undo it. Wren is the player body now: the AGENT-PREAMBLE line "Wren lands later ... posture / pose
angles wait for Wren" no longer applies to this slice; pose angles, spine / arm / leg targets and IK goals may change.
Meshes, rig proportions and skinning still do not.

## Michael's notes for this slice
1. "aiming down sights has improved but still doesnt match CT actual aiming down site. can you compare directly between
   them and fine tune. in CT the aiming view doesnt seem to change when crouched either, regardless of weapon"
2. "aiming weapons around seems to tilt at the wrists only which is unnatural, i think the whole upper body should remain
   tight and in position while aiming similar to the CT reference images. arms are too outstretched also"
3. "pistol aiming looks unnatural"
4. "legs when walking and running and turning are not right. i think they should remain in line with the body at all
   times as they currently stick too far away and look weird."
5. "crouching stance hands look weird, use CT reference videos to fix. same problem legs"
6. "bobbing while walking" (slice A: the camera is rigid; the chest bobs about 10 cm peak to peak at speed 3 from
   `pelvisDrop` in `src/player/characterRig.ts`, leg geometry; a pelvis low-pass in animGraph had no effect)

## What done looks like
- ADS: the camera framing (`src/config/camera.ts` `framing`) is the same standing and crouched for every weapon. The aim
  is carried by the chest / spine (yaw and pitch spread over the spine chain), the head, shoulders and arms locked as one
  block with the weapon; wrists stay near neutral. Elbows bent and tucked: the weapon closer to the face (the stock in
  the shoulder for the rifle). Pistol: a two-handed isosceles or weaver hold close to the eye line, arms bent, not
  locked straight out.
- Legs: the feet stay under the hips, inside the body's width, at every speed and through turns (no wide stance, no
  feet trailing far from the body). Check the foot planner's lateral offsets and the turn / pivot foot placement.
- Crouch: hands and legs as in CT's crouch (the CT references below): compact, knees under the chest, hands on the
  weapon close to the body.
- Bob: pelvis / chest vertical motion while walking at speeds 1-3 about 2-3 cm peak to peak, a run at most about 5 cm.
- Co-op: remotes pose from MoveState and the same anim code; no wire change expected. If one is needed, bump
  PROTOCOL_VERSION.

## References
- CT footage measurements: `docs/research/ct-movement/ct-measure-speeds-stops-posture.md`, `ct-measure-camera.md`,
  `ct-footage-catalogue.md`, `ct-locomotion.md`; posture work P1 / P1b / P1c (`P1-POSTURE.md`, `P1B-POSTURE.md`,
  `P1C-POSTURE.md`, `docs/ct-prototype/shots/`); `docs/ct-research/moves-mechanics-digest.md`.
- Code: `src/anim/animGraph.ts` (ready / sight / SIGHT_RAISE / PISTOL_REACH / BREATH / carriage), `src/player/characterRig.ts`
  (aim pocket, weld, solveArm, pelvisDrop), `src/anim/footPlanner.ts`, `src/config/camera.ts`, `src/anim/clips/*`.
- Visual checks: `scripts/anim-sheet.mjs`, `scripts/shot.mjs` (docs/systems/testing-tools.md). Sheets with
  `E2E_GPU=1` run on this PC (Michael's desktop) but only inside the heavy slot.

## Tests
`npm run check`; `tests/animAudit.test.ts` and any unit test on the changed numbers updated, not skipped. e2e (port 4193,
one at a time, heavy slot): smoke, e2e-anim, e2e-move, e2e-weapons-carry, e2e-pad, e2e-ctcourse
(`E2E_SUITE_TIMEOUT=900`). e2e-ctcourse, e2e-coop and e2e-netmove waits are owned by the Character Build co-op test job:
do not edit those three scripts; report their failures instead.
Contact sheets before and after (ADS standing / crouched rifle and pistol, walk / run / turn legs, crouch idle and walk)
into `docs/ct-prototype/shots/bc/`.

## Report
`docs/ct-prototype/BC-ANIM.md`: per note, what changed, numbers, files, before / after sheets, what is still off, what
Michael should try on /ct/.
