// npm run operators:export [wren|moth] - writes build/operators/<id>/<id>-lab.glb from the built blend files (Lab input).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { findBlender, runBlender } from './blender.mjs';
import { encodeKtx2 } from './ktx2.mjs';
import { OUT_DIR, ROOT } from './paths.mjs';

/**
 * Garments built per operator, in build (layer) order: each is drafted over the earlier ones, simulated over the body
 * only, then pushed clear of the earlier layers (layer_push, A11), so the base layer comes first, the gloves and boots
 * before the shirt (its cuffs close over the gloves) and the trousers (their hems seal over the boots), and the trousers
 * after the shirt (its hem tucks in). The last one's blend holds the body,
 * the rig and every earlier garment.
 */
export const GARMENTS = { wren: ['suit', 'gloves', 'approach_boots', 'headwear', 'head_kit', 'armour', 'chest_rig', 'waist_belt', 'leg_kit'], moth: [] };

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
 * Step 09b (A67): Wren's approach_boots (an approach-shoe last, sticky rand, edging sole; kit id `boots`) replace the step 06
 * boots, which stay for Moth.
 */
export const FITTED = new Set(['gloves', 'boots', 'approach_boots', 'headwear', 'head_kit', 'carrier', 'belt', 'armour', 'chest_rig', 'waist_belt', 'leg_kit']);

export function exportGltf(id, blender = findBlender()) {
  const g = (GARMENTS[id] ?? []).flatMap((n) => ['--garment', n]);
  runBlender('export_gltf.py', ['--operator', id, ...g, '--out', path.join(OUT_DIR, id)], { blender });
}

/**
 * Step 10 (SPEC 6.3-6.4, A69-A71): baked texture sets, hero / LOD0-2 glTF (desktop only, D29: no phone LOD) with the integration anchors, the
 * export report and README under build/operators/<id>/export/, the Lab copies <id>-lab-<lod>.glb. `render` adds the
 * hero / LOD side-by-side renders (Cycles, OptiX) into docs/operators/mockups/tests/. `scale` shrinks every texture
 * (iteration only). About 15-25 min for Wren on the RTX 4090. Step 11: ends with ktx2.mjs (KTX2 textures in the GLBs).
 */
export function exportLods(id, { render = false, scale = 1, blender = findBlender() } = {}) {
  const g = (GARMENTS[id] ?? []).flatMap((n) => ['--garment', n]);
  if (!g.length) return;
  const dest = path.join(ROOT, 'docs', 'operators', 'mockups', 'tests');
  runBlender('bake_lods.py', ['--operator', id, ...g, '--out', path.join(OUT_DIR, id), '--scale', String(scale),
    ...(render ? ['--render', '--dest', dest] : [])], { blender });
  encodeKtx2(id); // step 11 (D26): KTX2 textures and KHR_texture_basisu GLBs
}

// npm run operators:export [wren|moth]            the Lab source glb (unbaked, every build triangle)
// npm run operators:lods [wren] [--render] [--scale 0.25]   step 10's baked LODs (needs the built blends)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const si = argv.indexOf('--scale');
  const scale = si >= 0 ? Number(argv[si + 1]) : 1;
  const only = argv.filter((a, i) => !a.startsWith('-') && (si < 0 || i !== si + 1));
  for (const id of only.length ? only : ['wren', 'moth']) {
    if (argv.includes('--lods')) exportLods(id, { render: argv.includes('--render'), scale });
    else exportGltf(id);
  }
}
