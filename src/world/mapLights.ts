// (piano SO2) A map's light set, built in the one order the game and the prebake share: the map's own build, its
// flicker (`applyMapFlicker`), then the sway pendants (`applyMapSway`, before the build: the hangers it claims never
// mesh). `World.create` and the prebake (`scripts/prebake/plan.ts` `buildMap`) both call it, so the prebake's lamp key is
// always the game's. No Babylon: the prebake runs it in Node.
import type { LevelBuilder } from './levelBuilder';
import type { MapDef, MapLayout } from './mapDef';
import { applyMapFlicker } from './lampFlicker';
import { applyMapSway } from './lampSway';

/** Build `map` into `b` and add its light passes in the game's order; returns the map's layout. */
export function buildMapLights(b: LevelBuilder, map: MapDef, seed: number): MapLayout {
  const layout = map.build(b, seed);
  // (LR16-5) the map's flicker seed and its stutter tube (fires enrolled themselves)
  applyMapFlicker(b.lights, map.id, seed);
  // (LR16-5b) Marlow Yard's swinging pendants
  applyMapSway(b, map.id);
  return layout;
}
