# Weapons job - decisions

Michael's words: the overnight brief (BRIEF.md). Assumed decisions (A1 onward), each with how to undo it.

- **A1. Branched from master with PR #6 still open.** The brief says the goal PR #6 is merged; at the start it was open
  (docs only, CLAUDE.md "Current goal"). Its text was read from `origin/docs/prototype-goal` and followed. Undo: none
  needed; merging #6 does not conflict with this branch.
- **A2. Conventional carbine layout, not a bullpup.** The game's hand points, carry slots and aim pocket are tuned to a
  pistol grip behind the magazine and a stock behind the grip. The rifle is an original short-stroke carbine around
  those points (trigger hand on the grip, support hand on the launcher tube). Undo: a bullpup needs new `grip` /
  `foregrip` / extents and a carry re-check.
- **A3. The pistol keeps its length and its slide-frame frame.** Wren's thigh holster (leg_kit.py) was built around the
  current pistol extents (the extents centre 0.25 m below the hip, the slide and frame in a 57 mm cavity, open at the
  muzzle). The suppressor is a compact 135 mm can so the gun stays seated. Undo: a longer can moves the gun out of the
  holster (Wren's carry fit job).
- **A4. The jammer emitter is built into the pistol frame's nose** (the emitter window and the red / green aim light in
  the dust cover's front, heat-sink grooves, an activation paddle), not a separate under-rail module, so it fits the
  existing holster. Undo: a rail module needs a deeper holster.
- **A5. The knife shows only in the hand.** Wren's leg kit already carries the knife sheathed on the left thigh (its
  handle is part of her mesh). The new knife model matches that handle and is shown in the right hand when drawn; the
  game has no knife verb yet (research 1.11: not in the prototype). Undo: n/a; when the knife verb lands, hide the
  sheathed handle while drawn (POLISH.md).
- **A6. Guards keep their primitive guns.** Only the players' weapons (local, partner, menu preview) load the meshes;
  the CT co-op guards carry their own rifles, not the player kit. Undo: pass `mesh: true` in `enemyRig.ts`.
- **A7. Player guns render as the mesh, never as voxels.** Wren is a smooth PBR mesh, so the voxel weapon path is not
  used for the player kit once the mesh is in (the primitives stay as the loading fallback). Undo: drop the mesh option.

- **A8. Finger grips are morph targets on Wren's game files** (`gripR` trigger hand, `gripL` support hand), made from the
  hero rig's finger bones by `scripts/operators/py/grip_morphs.py` and blended by the rig's `handGrip`. The LODs have no
  finger bones. Re-running needs the exported files (the script refuses a patched one). Undo: `git checkout` the four GLBs.
- **A9. Hand holds solved from Wren's own hand frame** (`src/operators/handFrame.ts`, `src/player/handHold.ts`): the
  palm on the grip, the knuckles round it (trigger / tube / cup holds); guards keep the rig's old constants. Undo:
  `rig.setHands(null)`.
- **A10. Shoulder protraction** (`PROTRACT_MAX` 7 cm, characterRig.ts): a hand on the weapon out of reach brings its
  shoulder forward (the rig has no collarbone; the support hand was 6 cm out of reach with the elbow locked up).
- **A11. Pistol reach** (`PISTOL_REACH`, animGraph.ts): a raised sidearm goes 22 cm further out, centred, arms out (CT
  pistol aim, Michael's reference shots), instead of the rifle's cheek weld at the nose.
- **A12. The pistol sits in Wren's built holster frame** (`WREN_HOLSTER`, the leg kit's `pistolHolster` anchor), not the
  generic thigh slot that cut the slide 20 mm into the shell. Undo: `rig.thighMount = null`.
- **A13. The rifle hangs from Wren's back plate receiver bar** (`WREN_BACK_MOUNT`, the armour's `weaponMount` sockets) by
  a keyhole stud on its left side (weapons.json `backStud`): flat against the plate, muzzle up, the pistol grip to her
  right hand; the draw still reaches over the right shoulder to its upper half. Replaces the generic back slot that
  stood the gun out from the back on its optic ("it's just floating"). Undo: `rig.backMount = null`.
- **A14. The rifle's support point moved back to z 0.24** (the launcher sleeve's rear) so Wren's arm reaches it.

Michael's words during the run (chat, 2026-10-19):
- "Don't stop until all of them are ready to merge. Show screenshots at the end for me to review" (replaces the 09:00
  stop in the brief).
- "You are on the laptop also, so you can run the screenshots as needed" (in-game GPU screenshots on this laptop with
  `E2E_GPU=1`, `npm run weapons:shots`).
- "You can fix finger pose alignment, I'd rather the character holds the gun properly. Make sure they line up and are
  believable at minimum. Stance must look believable also." (hand-pose fine tuning comes into scope: fingers wrap the
  grips, the hands line up with the gun, a believable aiming stance.)
- "Can you use the warehouse under a light fitting for any staging? Training map has bad lighting", then "You can use
  training map to stage so you can see clearer" (staging: the training map Proving by default, `STAGE=warehouse` too).
- Four in-game aiming reference shots of the original (tight over-the-shoulder aim, rifle shouldered with a cheek weld,
  support hand forward on the launcher; pistol two-handed with the arms out): "This will be replicated". Not committed
  (they carry the reference game's names, G6).
- "Can you also adjust how the rifle is holstered so it makes logical sense how the character can equip it quickly and
  holster quickly, it's just floating" (A13).
- "I would consider these things game breaking, and would prefer to spend a little time cleaning them up so it's more
  believable. Holding weapons and holstering should at least look believable but only prototype quick run".

- **Merged on Michael's word (2026-10-19).** Michael: "Approval to merge", then "Confirming you can merge pr7" (his
  standing rule is that he merges; this is his explicit exception, as for PR #5). Merged as a merge commit, like PR #5.
  His answers moved into docs/DECISIONS.md as G177 (holds) and G178 (carry).
