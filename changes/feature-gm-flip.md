# Realistic guard models on by default
kind: minor
- Guards are now drawn with the baked realistic models by default (three builds, faces, outfits, gear, helmet knock-off:
  see the Guard models entry). `?guardmodels=0` turns them off and returns the merged body. The model files (about
  29 MB) load on demand, never precached, and stay in the service worker's own `guards` cache for offline play.
- Guard look fixes (G10a, a fresh bake of every guard file): uniforms baked at the tint's neutral (the faction colour,
  no longer near-black), the lightest skin tones keep their hue instead of washing out, no face showing through the
  heavy's and enforcer's balaclava (only the eye slot), smooth hair-cap hairlines (no saw teeth, a clean receding
  temple); the variety sheet draws guards with the game's rig (no goggle glow), and a colour change in
  the kit now costs a sheet run, not a full bake.
- Guard bake check: a garment's seam gap before the weld only warns (the weld closes it); a seam the weld has to move
  more than 60 mm fails.
- Guard render cost cut so the models fit the frame budget (render only; gameplay reads none of it):
  - Frozen guard materials: the operator material and the enforcer shield's materials skip the per-mesh define
    preparation and rebind every frame.
  - Lazy pose: a guard's figure is posed only when the camera or a shadow, lamp or torch pass actually draws it.
  - Merged meshes: guard armour (4 parts) and the enforcer shield and visor are one mesh each, like the merged gun.
- Measured on a laptop RTX 4090 (1080p epic, 24 guards, frame p95): sectorops patrol 6.5 ms (6.5 with the models off),
  away 4.6 (4.7), alert 7.2 (7.4); campusops patrol 9.0 (9.7), away 4.5 (4.8), alert 9.2 (10.0); at 12 guards campusops
  is +0.4 to +0.6 ms. The gate was within +0.5 ms of the models-off path: passed.
- No two guards in a section share a look seed (up to 128): Marlow Yard squad sets, Infiltration rooms, Sector Ops
  slots, response teams and reinforcements (several lone reinforcements at one entry point no longer all look alike).
- An authored guard keeps his look after a section restart and on every load, whatever the spawn order; runtime spawns
  move on to the next free seed. Host-side only: no wire change.
- Enforcers anywhere on a map, at any facing, now share one merged shield (the merge key comes from the parts' local
  places, not their world matrices, whose float error far from the origin built a new shield source per enforcer).
- The merged shield and the merged armour receive shadows like the guard's body, instead of copying the part base's
  setting at build time.
- Light rig: the G8 shadow-caster cull (disabled meshes left out of the lamp / torch shadow lists, a refill on every
  caster enable change) now runs only with guard models on; with the flag off a render-freeze
  toggle costs no refill and a thawed guard casts his torch-pool shadow at once, as before G8.
- Guard figures: a guard thawed from the render freeze, or killed while frozen, shows his current pose on the first
  frame (the figure poses at once instead of at the skeleton's next compute, which could be a frame late; the death
  frame showed the pose at the freeze).
- Guard cloth fixes (gm-look, a fresh LOD bake): no skin showing through the lean guards' work-jacket elbows and no
  jagged hem shards at the jacket hem and hips; garment LODs come from the sewn cloth shell and sit clear of the body.
  Known and left for Michael's look: dark patches at the chest / thigh pockets on the new bake (fix in the bake script,
  rebake later).
- Guard models are on everywhere, including the live game (Michael 2026-10-26 "Just switch them on").
