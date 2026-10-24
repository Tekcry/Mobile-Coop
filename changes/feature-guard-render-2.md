# Guard rendering phase 2 (24 guards)
kind: minor
- guard-render S9: the moon's cascades draw a moving caster only in the layers its shadow can land in on screen. On top of
  the light-space square test (S6), the caster's view depth +- (radius + moon shadow length x light . view) must overlap
  the layer's split range plus the blend band (`src/world/sunCascadeCull.ts`). The shadow length is 4 m over the moon's
  steepness, capped at 12 m. The split depths are read from the cascaded shadow generator's private fields through one
  accessor, pinned by a unit test. Render only: the light field, the meter and perception are unchanged; `?guardsun=0`
  still turns all of it off.
- guard-render S10: the Sector guard freeze no longer keeps every guard in a shadowing lamp's reach drawn when the
  lamp's sphere is in view. Per lamp it now tests the guard's own shadow volume (the cone his body throws away from the
  lamp, out to where the lamp's shadow map ends; none outside a spot's cone) against the view, and where it is in view,
  camera rays to where the shadow of his head and middle lands decide, as for the moon (`src/game/sectorGuardFreeze.ts`,
  `sectorGuardFreezeView.ts`). Render only; `?guardfreeze=0` still turns the freeze off.
