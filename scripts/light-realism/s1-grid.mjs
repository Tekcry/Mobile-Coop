#!/usr/bin/env node
// light-realism: the S1 staff car park's light field on a 1 m grid (desktop, no GPU, no browser).
// Usage (repo root):  node scripts/light-realism/s1-grid.mjs [--out <file.json>] [--step 1] [--cpu-max 90]
// Bundles scripts/light-realism/s1Grid.ts with esbuild (Babylon included) into the temp folder, waits while the
// machine's CPU is over --cpu-max (Windows: Win32_Processor LoadPercentage), then bakes and samples. Prints min / mean /
// max / uniformity and an ASCII heat map per height; writes the full grid as JSON. Read-only: changes nothing in src/.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const out = resolve(arg('--out', join(root, 'docs/light-realism/measure/s1-grid.json')));
const step = Number(arg('--step', '1'));
const cpuMax = Number(arg('--cpu-max', '90'));

function cpuLoad() {
  if (process.platform !== 'win32') return 0;
  try {
    const s = execFileSync('powershell', ['-NoProfile', '-Command', '(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average'], { encoding: 'utf8', timeout: 30000 });
    return Number(s.trim()) || 0;
  } catch {
    return 0;
  }
}

async function waitCpu() {
  for (let k = 0; k < 120; k++) {
    const c = cpuLoad();
    if (c <= cpuMax) return c;
    console.log(`cpu ${c}% > ${cpuMax}%: waiting 30 s`);
    await new Promise((r) => setTimeout(r, 30000));
  }
  throw new Error('CPU stayed busy for an hour');
}

// ' .:-=+*#%@' from dark to bright; levels on the gameplay scale (0..1); 'X' a solid (car, column)
const RAMP = ' .:-=+*%#@';
const glyph = (v) => (v === null ? 'X' : RAMP[Math.min(RAMP.length - 1, Math.max(0, Math.floor(v * 10)))]);

// (Babylon is bundled too: its deep imports carry no file extension, which node's ESM resolver refuses)
const bundle = join(tmpdir(), `light-realism-s1grid-${process.pid}.mjs`);
await build({
  entryPoints: [join(here, 's1Grid.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: bundle,
  logLevel: 'error',
  absWorkingDir: root,
});
const cpu = await waitCpu();
console.log(`cpu ${cpu}%: running`);
const { run } = await import(pathToFileURL(bundle).href);
const res = run({ step, log: (s) => console.log(s) });
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(res, null, 1));

console.log(`\nmoon level ${res.meta.moonLight}, zone fill ${res.meta.zoneFill}, thresholds dark < ${res.meta.thresholds.shadow}, lit >= ${res.meta.thresholds.lit}`);
for (const [y, h] of Object.entries(res.heights)) {
  const s = h.stats;
  console.log(`\n== y ${y}: n ${s.n}  min ${s.min}  mean ${s.mean}  max ${s.max}  U0 (min/mean) ${s.u0}  Ud (min/max) ${s.ud}`);
  console.log(`   bands: dark ${(s.darkShare * 100).toFixed(0)}%  mid ${(s.midShare * 100).toFixed(0)}%  lit ${(s.litShare * 100).toFixed(0)}%   lamps only: min ${s.lampOnlyMin} mean ${s.lampOnlyMean} max ${s.lampOnlyMax} U0 ${s.lampOnlyU0}`);
  console.log(`   render weight of the darkness curve at the mean: ${s.renderWeightAtMean} (1 = unchanged; 0.3 = the floor)`);
  console.log(`   heat map (x ${-36}..${6} left to right, z north at top; ramp '${RAMP}' per 0.1 level, X solid):`);
  for (const row of h.rows) console.log(`   ${String(row.z).padStart(4)} ${row.v.map(glyph).join('')}`);
}
console.log('\nnamed points (y, paper = all 14 columns without visibility, field = the meter\'s level):');
for (const p of res.points) console.log(`   ${p.name.padEnd(42)} y ${p.y}  paper ${p.paperColumnsNoVis}  field ${p.field} (lamps ${p.fieldLamps} + fill ${p.ambient} + moon ${p.moon} + bounce ${p.bounce})  ${p.band}  curve w ${p.renderWeight}`);
console.log('\ndarkness curve (level, weight, render level x LEVEL_TO_RENDER):');
console.log('   ' + res.curve.map((c) => c.join(' / ')).join('   '));
console.log(`\nwrote ${out} (${res.meta.ms} ms)`);
