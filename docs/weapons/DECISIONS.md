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
- **A4. The jammer emitter is built into the pistol frame's nose** (a deeper dust cover with the emitter window and the
  red / green aim light), not a separate under-rail module, so it fits the existing holster. Undo: a rail module needs
  a deeper holster.
- **A5. The knife shows only in the hand.** Wren's leg kit already carries the knife sheathed on the left thigh (its
  handle is part of her mesh). The new knife model matches that handle and is shown in the right hand when drawn; the
  game has no knife verb yet (research 1.11: not in the prototype). Undo: n/a; when the knife verb lands, hide the
  sheathed handle while drawn (POLISH.md).
- **A6. Guards keep their primitive guns.** Only the players' weapons (local, partner, menu preview) load the meshes;
  the CT co-op guards carry their own rifles, not the player kit. Undo: pass `mesh: true` in `enemyRig.ts`.
- **A7. Player guns render as the mesh, never as voxels.** Wren is a smooth PBR mesh, so the voxel weapon path is not
  used for the player kit once the mesh is in (the primitives stay as the loading fallback). Undo: drop the mesh option.

Michael's words during the run (chat, 2026-10-19):
- "Don't stop until all of them are ready to merge. Show screenshots at the end for me to review" (replaces the 09:00
  stop in the brief).
- "You are on the laptop also, so you can run the screenshots as needed" (in-game GPU screenshots on this laptop with
  `E2E_GPU=1`, `npm run weapons:shots`).
- "You can fix finger pose alignment, I'd rather the character holds the gun properly. Make sure they line up and are
  believable at minimum. Stance must look believable also." (hand-pose fine tuning comes into scope: fingers wrap the
  grips, the hands line up with the gun, a believable aiming stance.)
