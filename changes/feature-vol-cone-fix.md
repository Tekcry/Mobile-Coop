# Volumetric cones under fixed spots
kind: patch
- Fix (render only): the Sector Ops LED strips and bulkheads with a beam optic no longer draw full ceiling-to-floor
  white fog cones at High / Ultra / Epic. In the volumetric pass only a torch (`kind: 'flashlight'`) draws a long
  beam; every fixed light, spots and floods included, scatters under its shade like a lamp (march at most 3.2 m, no
  wider than the lamp cone, gain 1), along its own beam direction. Also covers the base Warehouse's facade floods and
  the parked maps' floods. The floor light, the meter and the guards (`LightField`) are unchanged.
  `src/vfx/volLights.ts` (pure, `tests/volLights.test.ts`); shots and notes in `docs/vol-cone-fix/`.
