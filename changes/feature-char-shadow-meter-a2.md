# Character shadows count in the light (part 2, dark)
kind: minor
- Light: with `?charlight=1` (flag `charShadowLight`) the players and the live guards (dogs as guards) now fill the
  shared shadow shapes each step, so the light meter and the picture's round shadows darken from the same characters
  by the same amount. Bodies and a co-op client's partners come in later parts. Off by default until the guards' cue
  lands and Michael walks it.
- Tests: the fill (players, guards, slot order) and the picture feed allocate nothing per call.
