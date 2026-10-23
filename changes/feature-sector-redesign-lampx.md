# Lamp door slots and exact torch light (LR15)
kind: minor
- With Realistic lamp falloff on (prototype, default off), a lamp now stops at up to 8 shut doors instead of 4, so light
  no longer leaks past a long row of doors, and a guard's flashlight that has no shadow map lights you exactly as the
  light meter and the guards read it, cut where its beam meets a wall. Classic falloff is unchanged.

# Realistic lamps light large maps again (lr-tex3d)
kind: patch
- With Realistic lamp falloff on, the lamps on large maps (Saltmarsh Park) no longer go dark on screen: their light data
  was too big for the graphics card and failed to load, so the picture showed only the fittings while the light meter
  and the guards still saw the light. The data now packs to fit the card's limit. Classic falloff is unchanged.
