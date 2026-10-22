# Volumetric cones under fixed spots
kind: patch
- Fix (render only): the Sector Ops LED strips and bulkheads with a beam optic no longer draw full ceiling-to-floor
  white fog cones at High / Ultra / Epic. In the volumetric pass the LED fittings (strips, panels, bulkheads) scatter under their shade like a lamp
  (march at most 3.2 m, no wider than the lamp cone, gain 1), along their own beam direction; torches and the floods with a
  plain housing (base Warehouse, parked maps) keep their beams. The floor light, the meter and the guards (`LightField`) are unchanged.
  `src/vfx/volLights.ts` (pure, `tests/volLights.test.ts`); shots and notes in `docs/vol-cone-fix/`.
