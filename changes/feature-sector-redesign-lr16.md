# One light model (LR16)
kind: minor
- One light model (Michael: "Disable returning to original lighting system, focus on only the one new system"): every
  lamp now runs the realistic (photometric) falloff and the shadow-accuracy fixes are always on. Settings > Gameplay >
  Lamp falloff and `?falloff=photo` are gone (an old saved choice is ignored); Character shadows Auto / On / Off stay.
  Co-op no longer sends the lamp falloff with a match start (wire change: `start.lf` and the rejoin record's `lf`
  removed; the protocol number is set at the merge).
