// npm run operators:export [wren|moth] - writes build/operators/<id>/<id>-lab.glb from the built blend files (Lab input).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { findBlender, runBlender } from './blender.mjs';
import { OUT_DIR } from './paths.mjs';

/**
 * Garments built per operator, in build (layer) order: each is drafted over the earlier ones, simulated over the body
 * only, then pushed clear of the earlier layers (layer_push, A11), so the base layer comes first, the gloves and boots
 * before the shirt (its cuffs close over the gloves) and the trousers (their hems seal over the boots), and the trousers
 * after the shirt (its hem tucks in). The last one's blend holds the body,
 * the rig and every earlier garment.
 */
export const GARMENTS = { wren: ['suit', 'gloves', 'boots', 'headwear', 'head_kit', 'armour', 'chest_rig', 'waist_belt', 'leg_kit'], moth: [] };

/**
 * Fitted items (step 06, DECISIONS A18): not cloth-simulated. py/build_fitted.py builds them in one stage (gloves:
 * shrink-fitted panels on the hand; boots: a parametric hard model sized from the foot) and leaves the same files a
 * sewn garment does, so the layers over them (the shirt cuffs, the trouser hems) are drafted over and pushed clear of them.
 * Step 07 (DECISIONS A24): the head items are fitted too - headwear (balaclava and hood, shrink-wrapped knit) and
 * head_kit (harness, battery pod, goggle on its band, cables, earpiece: hard parts and webbing). They come last: the
 * balaclava tucks inside the shirt collar and the hood skirt laps over it.
 * Step 08b (A53): Wren's armour (composite plates, rib segments, harness straps, magnetic buckles, weapon mount) is
 * fitted over the suit after the head items; the suit is pressed in under it.
 * Step 09: Wren's storage, all FITTED over the armour: chest_rig (on the plates; the radio and its cable), waist_belt (the
 * belt and its pouches, pod and medkit), leg_kit (the empty holster, the leg bands, the throwable sleeves, both hangers).
 */
export const FITTED = new Set(['gloves', 'boots', 'headwear', 'head_kit', 'carrier', 'belt', 'armour', 'chest_rig', 'waist_belt', 'leg_kit']);

export function exportGltf(id, blender = findBlender()) {
  const g = (GARMENTS[id] ?? []).flatMap((n) => ['--garment', n]);
  runBlender('export_gltf.py', ['--operator', id, ...g, '--out', path.join(OUT_DIR, id)], { blender });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  for (const id of only.length ? only : ['wren', 'moth']) exportGltf(id);
}
