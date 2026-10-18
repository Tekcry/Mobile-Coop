# Weapons job - polish list (after Michael's playtest)

Cosmetic notes from the build and the independent check. Nothing here blocks the prototype.

- Wren's thigh holster shell (leg_kit.py, Wren's carry fit job): its mouth is a flat cut that slices the grip and the
  trigger guard, the closed retention hood cuts the slide's rear, and it narrows about 25-30 mm too high for a real
  trigger guard (16.6 mm into the shell at its own frame). Rebuild it round the real pistol (pistolSd.json `holster`).
- The knife verb: hide Wren's sheathed knife handle while the knife is drawn (her mesh has it as a rigid part, `_RIGID`).
- Finger grips are one shape per hand: a left-handed hold (the open-side hand switch) uses the support grip on the
  trigger hand; a per-weapon grip (pistol vs rifle support) could follow.
- The trigger finger rests crooked at the trigger: a straight index along the frame until firing.
- Guards carry the old primitive rifle (A6); give them their own guns.
- The support hand cups under the trigger hand on the pistol; a closer thumb-over-thumb grip.
- Back carry: no visible sling; a short bungee or a lanyard from the stock to the plate would read even better.
- The rifle's launcher has no leaf sight; the red dot has no lit reticle.
- The weapon meshes are not in the offline cache warm-up (the PWA caches them on first load like other assets).
