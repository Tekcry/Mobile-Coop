# Character shadows count in the light (part 2, dark)
kind: minor
- Light: with `?charlight=1` (flag `charShadowLight`) every player, guard, dog and body now fills the shared shadow
  shapes each step, so the light meter and the picture's round shadows darken from the same characters by the same
  amount. Off by default until the guards' cue lands and Michael walks it.
- Tests: the fill (players, guards, bodies, slot order) and the picture feed allocate nothing per call.
