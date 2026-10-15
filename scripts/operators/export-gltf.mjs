// npm run operators:export [wren|moth] - writes build/operators/<id>/<id>-lab.glb from the built blend files (Lab input).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { findBlender, runBlender } from './blender.mjs';
import { OUT_DIR } from './paths.mjs';

/**
 * Garments built per operator, in build (layer) order: each is drafted over the earlier ones, simulated over the body
 * only, then pushed clear of the earlier layers (layer_push, A11), so the base layer comes first and the trousers after
 * the shirt (its hem tucks in). The last one's blend holds the body,
 * the rig and every earlier garment.
 */
export const GARMENTS = { wren: ['base_layer', 'combat_shirt', 'trousers'], moth: [] };

export function exportGltf(id, blender = findBlender()) {
  const g = (GARMENTS[id] ?? []).flatMap((n) => ['--garment', n]);
  runBlender('export_gltf.py', ['--operator', id, ...g, '--out', path.join(OUT_DIR, id)], { blender });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  for (const id of only.length ? only : ['wren', 'moth']) exportGltf(id);
}
