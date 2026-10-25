#!/usr/bin/env node
// light-realism L0: a map's light field in lux per space (desktop CPU, no GPU, no browser; replaces s1-grid.mjs).
// Usage (repo root):
//   node scripts/light-realism/lux-grid.mjs --map campusOps --section 1 [--space park] [--step 1] [--cpu-max 90]
//        [--spaces docs/light-realism/spaces/<map>.json] [--out <file.json>] [--svg-dir <dir> | --no-svg] [--ascii]
//        [--lightmap <file.svg>]   (with --space: the sign-off light map, lamps, poles, arms, circuits, dark spots; L1)
//   node scripts/light-realism/lux-grid.mjs --calibrate      (the reference test, calibrate.ts: prints the table)
// Bundles scripts/light-realism/luxGrid.ts with esbuild (Babylon included) into the temp folder, waits while the
// machine's CPU is over --cpu-max (Windows: Win32_Processor LoadPercentage), then bakes and samples. Prints per space:
// plane, mean level and lux, point minimum (open ground: cells more than 0.6 m from a car, pole or other solid; and every
// cell), U0, the band and pass / fail, and the meter-height (floor + 1.0) mean.
// Writes compact JSON (one grid row per line) to docs/light-realism/measure/<map>[-s<N>][-<space>].json and an SVG heat
// map per space into the folder of the same name (the --out file's name without .json). Read-only on src/.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const has = (k) => argv.includes(k);

/** JSON with every array of plain values on one line (grid rows), objects indented. */
export function compactJson(v, ind = '') {
  const next = ind + ' ';
  if (Array.isArray(v)) {
    if (v.every((q) => q === null || typeof q !== 'object')) return `[${v.map((q) => JSON.stringify(q)).join(',')}]`;
    return `[\n${v.map((q) => next + compactJson(q, next)).join(',\n')}\n${ind}]`;
  }
  if (v && typeof v === 'object') {
    const ks = Object.keys(v).filter((k) => v[k] !== undefined);
    if (!ks.length) return '{}';
    return `{\n${ks.map((k) => `${next}${JSON.stringify(k)}: ${compactJson(v[k], next)}`).join(',\n')}\n${ind}}`;
  }
  return JSON.stringify(v);
}

function cpuLoad() {
  if (process.platform !== 'win32') return 0;
  try {
    const s = execFileSync('powershell', ['-NoProfile', '-Command', '(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average'], { encoding: 'utf8', timeout: 30000 });
    return Number(s.trim()) || 0;
  } catch {
    return 0;
  }
}

async function waitCpu(cpuMax) {
  for (let k = 0; k < 120; k++) {
    const c = cpuLoad();
    if (c <= cpuMax) return c;
    console.log(`cpu ${c}% > ${cpuMax}%: waiting 30 s`);
    await new Promise((r) => setTimeout(r, 30000));
  }
  throw new Error('CPU stayed busy for an hour');
}

// (Babylon is bundled too: its deep imports carry no file extension, which node's ESM resolver refuses)
async function bundle(entry, name) {
  const out = join(tmpdir(), `light-realism-${name}-${process.pid}.mjs`);
  await build({ entryPoints: [join(here, entry)], bundle: true, platform: 'node', format: 'esm', target: 'node20', outfile: out, logLevel: 'error', absWorkingDir: root });
  return import(pathToFileURL(out).href);
}

const f3 = (v) => (typeof v === 'number' ? v.toFixed(3) : String(v));
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : String(v));

async function calibrate() {
  const { runCalibration } = await bundle('calibrate.ts', 'calibrate');
  const c = runCalibration();
  console.log(`reference test (calibrate.ts): verdict "${c.verdict}" - ${c.reason}`);
  console.log('engine side, the S1 column (intensity 0.9) on open ground over the night floor:');
  console.log('  d (m)  falloff x cone  level  lux');
  for (const p of c.engine) console.log(`  ${String(p.d).padStart(5)}  ${f3(p.shape).padStart(14)}  ${f3(p.level)}  ${f2(p.lux)}`);
  if (c.fit) {
    const r = c.reference;
    console.log(`reference: ${r.maker} ${r.model}, ${r.lumens} lm, ${r.mountH} m, arm ${r.arm} m (${r.method}; ${r.source}, read ${r.read})`);
    console.log('  d (m)  real lx  real level  engine level  engine lx  err level  err lux %');
    for (const p of c.fit.points) console.log(`  ${String(p.d).padStart(5)}  ${f2(p.realLux).padStart(7)}  ${f3(p.realLevel).padStart(10)}  ${f3(p.engineLevel).padStart(12)}  ${f2(p.engineLux).padStart(9)}  ${f3(p.errLevel).padStart(9)}  ${p.errLuxPct.toFixed(1).padStart(9)}`);
    console.log(`  fitted intensity ${f3(c.fit.intensity)} (${f3(c.fit.intensityPerKlm)} per 1,000 lm), RMS level error ${f3(c.fit.rms)}, worst point ${f3(c.fit.maxAbs)}`);
    console.log(`  free fit (1 lx held at ${c.fit.free.level1}): 10 lx = ${f3(c.fit.free.level10)}, intensity ${f3(c.fit.free.intensity)}, RMS ${f3(c.fit.free.rms)}${c.fit.free.edge ? ' (slope at the search range end: no slope fits)' : ''}`);
  }
}

// ' .:-=+*%#@' from dark to bright; levels on the gameplay scale (0..1); 'X' a solid
const RAMP = ' .:-=+*%#@';
const glyph = (v) => (v === null ? 'X' : RAMP[Math.min(RAMP.length - 1, Math.max(0, Math.floor(v * 10)))]);

async function main() {
  if (has('--calibrate')) return calibrate();
  const map = arg('--map', 'campusOps');
  const section = arg('--section', null);
  const space = arg('--space', null);
  const step = Number(arg('--step', '1'));
  const cpuMax = Number(arg('--cpu-max', '90'));
  const spacesPath = resolve(arg('--spaces', join(root, `docs/light-realism/spaces/${map}.json`)));
  const spacesFile = JSON.parse(readFileSync(spacesPath, 'utf8'));
  if (spacesFile.map !== map) throw new Error(`${spacesPath} is for map ${spacesFile.map}, not ${map}`);
  const base = `${map}${section ? `-s${section}` : ''}${space ? `-${space}` : ''}`;
  const out = resolve(arg('--out', join(root, `docs/light-realism/measure/${base}.json`)));
  // (the SVG folder is named after the JSON it sits beside, so an `--out ...-after.json` run keeps the before SVGs)
  const svgDir = has('--no-svg') ? null : resolve(arg('--svg-dir', out.replace(/\.json$/, '')));

  const lightmap = arg('--lightmap', null);
  if (lightmap && !space) throw new Error('--lightmap needs --space');
  const { run, heatSvg, lightMapSvg } = await bundle('luxGrid.ts', 'luxgrid');
  const cpu = await waitCpu(cpuMax);
  console.log(`cpu ${cpu}%: running ${map}${section ? ` section ${section}` : ''}${space ? ` space ${space}` : ''}`);
  const res = await run({ spacesFile, section: section ? Number(section) : null, space, step, log: (s) => console.log(s) });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, compactJson(res) + '\n');
  if (svgDir) {
    mkdirSync(svgDir, { recursive: true });
    for (const sp of res.spaces) writeFileSync(join(svgDir, `${sp.id}.svg`), heatSvg(sp, 'plane'));
  }
  if (lightmap) {
    mkdirSync(dirname(resolve(lightmap)), { recursive: true });
    writeFileSync(resolve(lightmap), lightMapSvg(res.spaces[0], res.lamps));
  }

  console.log(`\n${res.meta.curve}; dark < ${res.meta.thresholds.shadow} (1 lx), lit >= ${res.meta.thresholds.lit} (10 lx); moon ${res.meta.moonLight}`);
  console.log('space        plane y  n     mean lv  mean lx  min lx  minAll  U0     band (avg / min lx)   result     | meter y  mean lv  dark  mid  lit');
  for (const sp of res.spaces) {
    const p = sp.plane.stats;
    const m = sp.meter.stats;
    const c = sp.plane.check;
    const band = sp.band ? `${sp.band.avg}${sp.band.min !== undefined ? ` / ${sp.band.min}` : ''}${sp.band.u0 !== undefined ? ` U0 ${sp.band.u0}` : ''}${sp.verify ? ' (v)' : ''}` : '-';
    const result = sp.band ? (c.pass ? 'PASS' : `FAIL ${[!c.passMean && 'mean', !c.passMax && 'max', !c.passMin && 'min', !c.passU0 && 'U0'].filter(Boolean).join('+')}`) : 'no band';
    const u0lux = c ? f3(c.u0) : p.meanLux > 0 ? f3(p.minLux / p.meanLux) : '-';
    console.log(`${sp.id.padEnd(12)} ${f2(sp.plane.y).padStart(7)}  ${String(p.n).padEnd(5)} ${f3(p.mean).padStart(7)}  ${f2(p.meanLux).padStart(7)}  ${f2(p.minLux).padStart(6)}  ${f2(p.minLuxAll).padStart(6)}  ${u0lux.padEnd(5)}  ${band.padEnd(20)}  ${result.padEnd(10)} | ${f2(sp.meter.y).padStart(7)}  ${f3(m.mean).padStart(7)}  ${(m.darkShare * 100).toFixed(0).padStart(3)}%  ${(m.midShare * 100).toFixed(0).padStart(3)}%  ${(m.litShare * 100).toFixed(0).padStart(3)}%`);
  }
  console.log('(min lx = open ground, minAll = every cell; lux U0 = open-ground min / mean in lux; (v) = band to verify; meter: share of cells dark / mid / lit at floor + 1.0)');
  for (const sp of res.spaces) {
    if (!sp.cover.n && !sp.dark.length) continue;
    const causes = {};
    for (const d of sp.dark) causes[d[3]] = (causes[d[3]] ?? 0) + 1;
    const list = sp.dark.slice(0, 20).map(([x, z, e, c]) => `(${x}, ${z}) ${e} lx ${c}`).join('; ');
    console.log(`${sp.id}: near cover ${sp.cover.n} cells (car ${sp.cover.byCause.car}, pole ${sp.cover.byCause.pole}, other ${sp.cover.byCause.other}); open ground under the point minimum ${sp.dark.length}${sp.dark.length ? ` (${Object.entries(causes).map(([k, v]) => `${k} ${v}`).join(', ')}): ${list}${sp.dark.length > 20 ? '; ...' : ''}` : ''}`);
  }
  if (has('--ascii')) {
    for (const sp of res.spaces) {
      console.log(`\n${sp.id} at y ${sp.plane.y} (x ${sp.grid.x0} east, z ${sp.grid.z0} north at top; ramp '${RAMP}' per 0.1 level, X solid):`);
      sp.plane.level.forEach((row, j) => console.log(`   ${String(sp.grid.z0 - j * sp.grid.step).padStart(5)} ${row.map(glyph).join('')}`));
    }
  }
  console.log(`\nwrote ${out}${svgDir ? ` and ${res.spaces.length} SVG in ${svgDir}` : ''}${lightmap ? ` and the light map ${lightmap}` : ''} (${res.meta.ms} ms)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(() => process.exit(0), (e) => { console.error(`lux-grid: ${String(e?.stack ?? e)}`); process.exit(2); });
}
