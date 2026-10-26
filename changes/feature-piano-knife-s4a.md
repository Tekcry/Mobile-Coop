# Empty pistol slide
kind: patch
- (piano-knife S4a) The pistol's slide (with its sights and extractor) is a mesh of its own in `pistolSd.glb`, and
  `WeaponModel.slideLock(on)` locks it back 2 cm for an empty gun. Nothing calls it yet (the piano intro, S4b); with the
  slide forward the pistol looks as before.
