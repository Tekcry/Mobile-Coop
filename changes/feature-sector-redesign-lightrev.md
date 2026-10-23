# Lamp output review and the lamp falloff setting (walk 4.72)
kind: minor
- Lighting review of the walk 4.72 S1 / M5 notes: measured lamp reach on every map (Sector Ops S1 goods-in floor median
  0.186, real fittings 213-781 lux), proposal LR13 (photometric lamp falloff) for Michael in
  `docs/lighting-review/PROPOSAL.md`.
- New setting, Settings > Gameplay > Lamp falloff: Classic (the default, the game as before) or Realistic (test): lamps
  fall off with the inverse square like real fittings and reach further. The light meter, the guards and the picture
  switch together; it takes effect when a map loads. In co-op the host's choice applies to both players (co-op
  protocol 38). `?falloff=photo` forces Realistic for a page (dev).
