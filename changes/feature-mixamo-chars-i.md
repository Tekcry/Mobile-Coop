# Mixamo characters, slice i: the remaining moves, the gun on its way, our own downed body
- The remaining traversal moves on the Mixamo body (provisional stand-ins, tune by eye): up a vertical pipe the rope
  climb; legs up or inverted on a pipe the hang, the whole body turned over with the rig's tumble (the slung gun does not turn with it yet); the wall kick
  "Jump From Wall" pinned to its progress (its rise held flat: the game carries the jump); on a rappel rope the rope haul;
  braced in a split the falling pose; a brace with no team move the lift's crouched offer.
- A gun being drawn or holstered sits in the Mixamo right hand on its way (it floated beside the body for ~2 s on a
  rifle draw, carried by the hidden rig's hand).
- Our own player down: the Mixamo body lies (`downed_lie`), as the partner's already did.
- Fix: a timed move at its very end showed its first frame again (the clips loop); it now stops just short.
- Checks: `scripts/e2e-mixamo.mjs` (the gun mid-draw at the hand), `scripts/e2e-mixamo-actions.mjs` (the six moves, our
  own downed body, the climb-up's last frame).
