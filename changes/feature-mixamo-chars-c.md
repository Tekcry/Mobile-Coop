# Mixamo characters, slice c: Test Chamber guards are the Mixamo Swat
- Guards in the Test Chamber draw as the Mixamo Swat playing Mixamo moves (the same blend and move sets as the player:
  unarmed, rifle, pistol by the gun in his hands). His rig's hips, chest, thigh and head follow the Swat's bones, so
  his eye (perception) sits on the Swat's head (within 4 cm) and his gear rides on the body. A dying guard hands back
  to the guard figure (the ragdoll and the carry pose the rig); a carried body's fresh rig keeps the figure.
- One helper dresses any rig (`src/characters/rigMixamo.ts`, `dressRig`): the player and the guards use it; the rig's
  new `onAnimate` hook hands each animate's inputs to the Mixamo body.
- Fix: the body's size and the follow's reference come from the idle's first frame, not the bind pose (the Swat's bind
  pose sits its hips on the floor: the guard stood 2.8 m tall and lifted his eye). The packer keeps only rotations and
  the hips' position (scaled per skeleton) when a move made on one Mixamo skeleton plays on another.
- New check `scripts/e2e-mixamo-guards.mjs` (Swat loads, merged body hidden, eye on the head, guard height, a kill
  drops the Mixamo body); `e2e-mixamo` checks the chest offset holds while running.
