// (anim-guard) A contact sheet of a baked keyed clip (side row over front row), rendered headless in Blender from the
// .blend the bake saved (run scripts/anim-keys/build.mjs <clip> first). Unlike the bake's --preview it keeps the keyed
// pelvis height (bodies on the floor show as they are) and takes any frames, so it suits one-shot clips.
//   node --import ./scripts/operators/ts-resolve.mjs scripts/anim-keys/sheet.mjs <clip> [--frames 0,6,12] [--out <png>]
// Frames are in the bake's 48-frame units (a cycle: phase * 48; a one-shot: frame i of 48 at i * duration / 47 s).
// Default: 8 even phases for a cycle, 12 frames over a one-shot. Output default: build/anim-keys/<clip>-sheet.png.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from '../operators/paths.mjs';
import { runBlender } from '../operators/blender.mjs';

const [name, ...rest] = process.argv.slice(2);
if (!name) throw new Error('usage: sheet.mjs <clip> [--frames a,b,c] [--out file.png]');
const opt = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : undefined; };
const OUT = path.join(ROOT, 'build', 'anim-keys');
const blend = path.join(OUT, `${name}.blend`);
if (!existsSync(blend)) throw new Error(`${blend} missing: bake the clip first (scripts/anim-keys/build.mjs ${name})`);
const keys = JSON.parse(readFileSync(path.join(ROOT, 'scripts', 'anim-keys', 'keys', `${name}.json`), 'utf8'));
const oneShot = !!keys.oneShot;
const frames = (opt('--frames') ?? (oneShot
  ? Array.from({ length: 12 }, (_, i) => Math.round((i * 47) / 11)).join(',')
  : Array.from({ length: 8 }, (_, i) => i * 6).join(','))).split(',').map(Number);
const label = (f) => (oneShot ? `t ${((f * keys.duration) / 47).toFixed(2)} s` : `ph ${(f / 48).toFixed(3)}`);
const dir = path.join(OUT, 'sheet', name);
mkdirSync(dir, { recursive: true });
runBlender(path.join('..', '..', 'anim-keys', 'py', 'sheet_clip.py'), ['--blend', blend, '--frames', frames.join(','), '--out', dir, '--name', name]);

const FF = process.env.FFMPEG ?? 'C:/Users/Micha/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe';
const out = path.resolve(opt('--out') ?? path.join(OUT, `${name}-sheet.png`));
mkdirSync(path.dirname(out), { recursive: true });
const n = frames.length;
const inputs = [];
for (const view of ['side', 'front']) for (let i = 0; i < n; i++) inputs.push('-i', path.join(dir, `${name}-${view}-${i}.png`));
const font = "fontfile='C\\:/Windows/Fonts/consola.ttf'";
const lab = [];
for (let v = 0; v < 2; v++) {
  for (let i = 0; i < n; i++) {
    const k = v * n + i;
    const txt = `${['side', 'front'][v]} ${label(frames[i])}`;
    lab.push(`[${k}]drawtext=${font}:text='${txt}':x=4:y=4:fontsize=13:fontcolor=white:box=1:boxcolor=black@0.5[t${k}]`);
  }
}
const rows = [0, 1].map((v) => `${Array.from({ length: n }, (_, i) => `[t${v * n + i}]`).join('')}hstack=inputs=${n}[r${v}]`);
const filter = `${lab.join(';')};${rows.join(';')};[r0][r1]vstack=inputs=2`;
const res = spawnSync(FF, ['-v', 'error', '-y', ...inputs, '-filter_complex', filter, out], { windowsHide: true, encoding: 'utf8' });
if (res.status !== 0) throw new Error(`ffmpeg failed: ${res.stderr}`);
console.log(`anim-keys sheet: ${name} -> ${path.relative(ROOT, out)}`);
