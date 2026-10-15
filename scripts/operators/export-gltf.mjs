// npm run operators:export [wren|moth] - writes build/operators/<id>/<id>-lab.glb from the built blend files (Lab input).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { findBlender, runBlender } from './blender.mjs';
import { OUT_DIR } from './paths.mjs';

/** Garments built per operator so far; the last one's blend holds the body, rig and every earlier garment. */
export const GARMENTS = { wren: ['combat_shirt'], moth: [] };

export function exportGltf(id, blender = findBlender()) {
  const g = (GARMENTS[id] ?? []).flatMap((n) => ['--garment', n]);
  runBlender('export_gltf.py', ['--operator', id, ...g, '--out', path.join(OUT_DIR, id)], { blender });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  for (const id of only.length ? only : ['wren', 'moth']) exportGltf(id);
}
