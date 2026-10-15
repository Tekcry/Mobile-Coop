// npm run operators:build - the offline operator pipeline (docs/operators/SPEC.md 6.3).
// 1. Export each operator's corrected joints to build/operators/joints.json.
// 2. Run each Blender stage headless on the pinned Blender. Stages are added as the run builds them
//    (base body, garments, kit, bake, LODs, glTF export); today: the skeleton check.
import path from 'node:path';
import { exportJoints } from './export-joints.mjs';
import { findBlender, runBlender } from './blender.mjs';
import { OUT_DIR } from './paths.mjs';

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const blender = findBlender();
console.info(`operators: ${blender.version} (${blender.exe})`);

const joints = exportJoints();
console.info(`operators: joints -> ${path.relative(process.cwd(), joints)}`);

for (const id of only.length ? only : ['wren', 'moth']) {
  runBlender('build_skeleton.py', ['--joints', joints, '--operator', id, '--out', path.join(OUT_DIR, id)], { blender });
}
console.info(`operators: done -> ${path.relative(process.cwd(), OUT_DIR)}`);
