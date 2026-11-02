# Mixamo characters, slice b: guns on the Mixamo body, rifle and pistol moves
- Test Chamber (Mixamo body on): the move set follows the gun in the hands with a short crossfade: unarmed, rifle (Pro
  Rifle Pack: idle, aimed idle, walk / run / sprint, back, strafes, crouched idle / aimed / walk / back / strafes) and
  pistol (Pistol Pack: idle, walk, back, run, strafes, kneeling idle); crouched sidesteps added to the unarmed set. Aiming
  (LT) turns the idles into the aimed idles.
- The hand-built rig's hips, thigh, chest and head nodes now follow the Mixamo bones, so the slung rifle, the holster
  and the pouches ride on the Mixamo body; a gun held in the hands sits in the Mixamo right hand (per-class hold frame
  measured from the packs, provisional).
- The packer removes the pack clips' ground travel (in place). `scripts/e2e-mixamo.mjs` checks the chest follow, the
  draw (rifle set), aim and the swap (pistol set, gun at the hand).
- Known gaps: the draw / holster travel still uses the old rig's hand path (the gun floats for ~2 s on a draw); no
  aim pitch on the Mixamo spine yet; guards and the co-op partner are next.
