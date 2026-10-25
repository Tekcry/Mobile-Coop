// npm run weapons:build [rifle|pistolSd|knife ...] [--render] [--no-bake]  (feature/weapons)
// Builds each weapon headless in the pinned Blender (scripts/operators/blender.mjs refuses any other version):
// py/build_weapon.py -> build/weapons/<id>/<id>.glb (PNG textures) + report; then every texture is encoded to KTX2
// (UASTC, the operators' settings: scripts/operators/ktx2.mjs) and the GLB repacked with KHR_texture_basisu, and the
// game copy written to src/weapons/assets/<id>.glb. --render writes the review renders to docs/archive/weapons/renders/.
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBlender } from '../operators/blender.mjs';
import { repackGlb, toktxArgs } from '../operators/ktx2.mjs';
import { SEED } from '../operators/paths.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'build', 'weapons');
const ASSETS = path.join(ROOT, 'src', 'weapons', 'assets');
const RENDERS = path.join(ROOT, 'docs', 'archive', 'weapons', 'renders');
const PY = path.join(ROOT, 'scripts', 'weapons', 'py', 'build_weapon.py');
const KTX_BIN = process.env.KTX_BIN ?? 'C:/Program Files/KTX-Software/bin';
const exe = (n) => path.join(KTX_BIN, process.platform === 'win32' ? `${n}.exe` : n);
export const WEAPON_MESHES = ['rifle', 'pistolSd', 'knife'];

const argv = process.argv.slice(2);
const ids = argv.filter((a) => !a.startsWith('-'));
const render = argv.includes('--render');
const noBake = argv.includes('--no-bake');

function build(id, blender) {
  const t0 = Date.now();
  const args = ['-b', '--factory-startup', '-noaudio', '--python-exit-code', '1', '--python', PY, '--', '--seed', String(SEED), '--weapon', id, '--out', OUT];
  if (render) args.push('--render', RENDERS);
  if (noBake) args.push('--no-bake');
  const r = spawnSync(blender.exe, args, { windowsHide: true, stdio: 'inherit', env: { ...process.env, PYTHONHASHSEED: String(SEED) } });
  if (r.status !== 0) throw new Error(`weapons: Blender build of ${id} failed (exit ${r.status ?? r.signal})`);
  if (noBake) return;
  const dir = path.join(OUT, id);
  const rep = path.join(dir, `${id}-report.json`);
  const report = JSON.parse(readFileSync(rep, 'utf8'));
  const bytes = new Map();
  const ktx = [];
  for (const [kind, file] of Object.entries(report.textures)) {
    const png = path.join(dir, file);
    const out = png.replace(/\.png$/, '.ktx2');
    execFileSync(exe('toktx'), toktxArgs(kind, out, png), { windowsHide: true, stdio: 'pipe' });
    execFileSync(exe('ktx'), ['validate', out], { windowsHide: true, stdio: 'pipe' });
    bytes.set(`${id}-${kind}`, readFileSync(out));
    ktx.push({ kind, bytes: statSync(out).size, pngBytes: statSync(png).size });
  }
  const glb = path.join(dir, `${id}.glb`);
  const packed = repackGlb(readFileSync(glb), (name) => bytes.get(name));
  mkdirSync(ASSETS, { recursive: true });
  writeFileSync(path.join(ASSETS, `${id}.glb`), packed);
  report.ktx2 = { files: ktx, glbBytes: packed.length };
  report.builtSeconds = Math.round((Date.now() - t0) / 1000);
  writeFileSync(rep, JSON.stringify(report, null, 1));
  copyFileSync(rep, path.join(ASSETS, `${id}.json`));
  console.info(`weapons: ${id} ${report.triangles} tris, GLB ${(packed.length / 1024).toFixed(0)} KB, ${report.builtSeconds} s`);
}

const blender = findBlender();
console.info(`weapons: ${blender.version}`);
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
for (const id of ids.length ? ids : WEAPON_MESHES) build(id, blender);
