# Guard torch slots per map (piano SO3)
kind: patch
- Lighting: a map can ask for 8, 12 or 16 guard torch slots (`MapDef.torchSlots`, default 4) and cap how many cast
  shadows (`MapDef.torchShadows`); unshadowed torches stop at their beam's reach in the picture, the meter and guard
  sight alike. Dark: no map sets it yet; other maps are unchanged.
