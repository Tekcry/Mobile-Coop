# Guard models: merge-check polish
kind: patch
- Light rig: the G8 shadow-caster cull (disabled meshes left out of the lamp / torch shadow lists, a refill on every
  caster enable change) now runs only with guard models on (`?guardmodels=1`); with the flag off a render-freeze
  toggle costs no refill and a thawed guard casts his torch-pool shadow at once, as before G8.
- Guard figures: a guard thawed from the render freeze, or killed while frozen, shows his current pose on the first
  frame (the figure poses at once instead of at the skeleton's next compute, which could be a frame late; the death
  frame showed the pose at the freeze).
