// npm run operators:build [wren|moth] [--render] - the offline operator pipeline (docs/operators/SPEC.md 6.3).
// 1. Fetch the CC0 MakeHuman base body data once (pinned commit, git-ignored cache; Michael approved, D12).
// 2. Export each operator's corrected joints to build/operators/joints.json.
// 3. Blender stages, headless on the pinned Blender:
//    skeleton check -> base body (shaped, rigged, skinned) -> garments in GARMENTS order, each sewn by cloth simulation
//    over the body, then pushed clear of every earlier garment (layer_push, A11) -> garment detail.
// 4. glTF export for the Operator Lab (<id>-lab.glb).
// --render also renders the garment test views into docs/operators/mockups/tests/ (Cycles on the GPU).
import path from 'node:path';
import { exportJoints } from './export-joints.mjs';
import { fetchBaseBody } from './fetch-base-body.mjs';
import { findBlender, runBlender } from './blender.mjs';
import { exportGltf, GARMENTS } from './export-gltf.mjs';
import { OUT_DIR, ROOT } from './paths.mjs';


const argv = process.argv.slice(2);
const only = argv.filter((a) => !a.startsWith('-'));
const render = argv.includes('--render');
const blender = findBlender();
console.info(`operators: ${blender.version} (${blender.exe})`);

const mpfb = await fetchBaseBody();
console.info(`operators: MPFB2 CC0 data ${mpfb.files} files (${mpfb.fetched} fetched)`);
const joints = exportJoints();
console.info(`operators: joints -> ${path.relative(process.cwd(), joints)}`);

for (const id of only.length ? only : ['wren', 'moth']) {
  const out = path.join(OUT_DIR, id);
  runBlender('build_skeleton.py', ['--joints', joints, '--operator', id, '--out', out], { blender });
  runBlender('build_body.py', ['--joints', joints, '--operator', id, '--mpfb', mpfb.dir, '--out', out], { blender });
  const done = [];   // garments already built: the next one is sewn over them (multi-layer simulation)
  for (const g of GARMENTS[id] ?? []) {
    const a = ['--operator', id, '--garment', g, '--out', out];
    runBlender('build_garment.py', [...a, '--frames', '120', ...(done.length ? ['--under', done.join(',')] : [])], { blender });
    done.push(g);
    runBlender('garment_details.py', a, { blender });
    if (render) {
      runBlender('render_garment_test.py', [...a, '--dest', path.join(ROOT, 'docs', 'operators', 'mockups', 'tests'),
        '--samples', '384'], { blender });
    }
  }
  exportGltf(id, blender);
}
console.info(`operators: done -> ${path.relative(process.cwd(), OUT_DIR)}`);
