// visual-gate (docs/visual-gate/PLAN.md): the picture check. VG2 skeleton: `--time` only, the M0 timing run (PLAN
// section 7) - every view, rig (torch on, then off) and, at Epic, a timing-only grey-card render per parity point, on
// every map at Low and Epic in two browsers at once (A7). No metrics, baselines, rules or parity checks yet (VG5).
//   node scripts/e2e-visual.mjs <url> --time [--json <file>] [--png <dir>] [--only id,id] [--maps a,b] [--serial]
// Needs a served dist (scripts/laptop-queue/serve.mjs) and the GPU (E2E_GPU=1, port 4189).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { bootMap, shoot, pin, aim, converge, capture, closeBoot } from './visual-gate/harness.mjs';

const USAGE = 'usage: node scripts/e2e-visual.mjs <url> --time [--json <file>] [--png <dir>] [--only id,id] [--maps a,b] [--serial]';
/** Map order per browser (smallest bake first). */
export const MAP_ORDER = ['warehouse', 'warehouseOps', 'ctcourse', 'campusOps'];

const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

/** Command line (without node and the script) -> options. Throws on an unknown flag or a flag missing its value. */
export function parseArgs(argv) {
  const o = { url: null, time: false, json: null, png: null, only: null, maps: null, serial: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--time') o.time = true;
    else if (a === '--serial') o.serial = true;
    else if (a === '--json') o.json = val();
    else if (a === '--png') o.png = val();
    else if (a === '--only') o.only = list(val());
    else if (a === '--maps') o.maps = list(val());
    else if (a.startsWith('--')) throw new Error(`unknown flag ${a}`);
    else if (o.url === null) o.url = a;
    else throw new Error(`unexpected argument ${a}`);
  }
  o.url ??= 'http://localhost:4173/';
  return o;
}

const now = () => performance.now();
const msg = (e) => String(e?.message ?? e).split('\n')[0];
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const max = (a) => (a.length ? Math.max(...a) : NaN);
const fmt = (v) => (Number.isFinite(v) ? String(Math.round(v)) : '-');

/** One map at one preset in its own browser: boot, every view, every rig on then off, cards at Epic. */
async function runMap(opts, vp, mapId, preset) {
  const want = (id) => !opts.only || opts.only.includes(id);
  const views = vp.VIEWS.filter((v) => v.map === mapId && want(v.id));
  const rigs = vp.RIGS.filter((r) => r.map === mapId && want(r.id));
  const cards = preset === 'epic' ? views.flatMap((v) => (v.parity ?? []).map((at, k) => ({ id: `card-${v.id}-${k + 1}`, at }))) : [];
  const row = { map: mapId, preset, bootMs: null, renderer: null, chrome: null, torchCount: null, wallMs: 0, shots: [], errors: [], consoleErrors: [] };
  if (!views.length && !rigs.length) return row;
  const t0 = now();
  let boot;
  try {
    const cfg = vp.MAPS[mapId];
    boot = await bootMap({ url: opts.url, map: { query: cfg.query, label: cfg.label ?? mapId }, preset });
  } catch (e) {
    row.errors.push(`boot: ${msg(e)}`);
    row.wallMs = Math.round(now() - t0);
    return row;
  }
  Object.assign(row, { bootMs: boot.bootMs, renderer: boot.renderer, chrome: boot.chrome, torchCount: boot.torchCount });
  const page = boot.page;
  const png = (key, buf) => {
    if (opts.png) writeFileSync(join(opts.png, `${key}@${preset}.png`), buf);
  };
  const one = async (item, state) => {
    const key = state ? `${item.id}-${state}` : item.id;
    try {
      const s = await shoot(page, item, state, boot);
      row.shots.push({ id: item.id, kind: state ? 'rig' : 'view', rigState: state, settle: s.settle, pin: s.pin, converge: s.converge, behind: Object.keys(s.regions).filter((k) => s.regions[k].behind), ms: s.ms });
      png(key, s.capture.png);
    } catch (e) {
      row.shots.push({ id: item.id, kind: state ? 'rig' : 'view', rigState: state, error: msg(e) });
      row.errors.push(`${key}: ${msg(e)}`);
    }
  };
  try {
    for (const v of views) await one(v, null);
    for (const r of rigs) {
      await one(r, 'on');
      await one(r, 'off');
    }
    if (cards.length) {
      // the cards render under the pin (the last shot left it; again here in case that shot threw before its pin)
      try {
        await pin(page);
      } catch (e) {
        row.errors.push(`card pin: ${msg(e)}`);
      }
      for (const c of cards) {
        const t = now();
        try {
          const [x, y, z] = c.at;
          await page.evaluate(([x, y, z]) => {
            window.__vgProbe?.dispose();
            window.__vgProbe = window.__app.current.world.addLightProbe(x, y, z, 1, 0, 0);
          }, [x, y, z]);
          // timing only: the camera 0.8 m along +x from the card, looking at it (VG5 searches the real card direction)
          const a = await aim(page, [x + 0.8, y, z], [x, y, z]);
          const conv = await converge(page);
          const cap = await capture(page);
          await page.evaluate(() => {
            window.__vgProbe?.dispose();
            window.__vgProbe = null;
          });
          row.shots.push({ id: c.id, kind: 'card', rigState: null, converge: conv, ms: { aim: a.ms, converge: conv.ms, capture: cap.ms, total: Math.round(now() - t) } });
          png(c.id, cap.png);
        } catch (e) {
          row.shots.push({ id: c.id, kind: 'card', rigState: null, error: msg(e) });
          row.errors.push(`${c.id}: ${msg(e)}`);
        }
      }
    }
  } finally {
    row.consoleErrors = boot.errors.slice(0, 20);
    await closeBoot(boot);
    row.wallMs = Math.round(now() - t0);
  }
  return row;
}

/** One browser's run: every map in order at one preset. */
async function runPreset(opts, vp, maps, preset) {
  const t0 = now();
  const rows = [];
  for (const m of maps) {
    const row = await runMap(opts, vp, m, preset);
    rows.push(row);
    console.log(`  ${m}@${preset}: ${row.shots.length} shots, ${row.errors.length} errors, ${(row.wallMs / 1000).toFixed(1)} s`);
  }
  return { preset, rows, wallMs: Math.round(now() - t0) };
}

/** The markdown timing table: one line per map x preset, then per-browser totals and the wall time. */
export function timingTable(browsers, wallMs) {
  const out = [
    '| map | preset | boot ms | views | rig shots | cards | settle mean / max ms | converge mean ms | capture mean ms | converge fails | errors | wall s |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const b of browsers) {
    for (const r of b.rows) {
      const ok = r.shots.filter((s) => !s.error);
      const n = (k) => `${ok.filter((s) => s.kind === k).length}/${r.shots.filter((s) => s.kind === k).length}`;
      const settles = ok.filter((s) => s.ms.settle !== undefined).map((s) => s.ms.settle);
      out.push(`| ${r.map} | ${r.preset} | ${fmt(r.bootMs ?? NaN)} | ${n('view')} | ${n('rig')} | ${n('card')} | ${fmt(mean(settles))} / ${fmt(max(settles))} | ${fmt(mean(ok.map((s) => s.ms.converge)))} | ${fmt(mean(ok.map((s) => s.ms.capture)))} | ${ok.filter((s) => !s.converge.ok).length} | ${r.errors.length} | ${(r.wallMs / 1000).toFixed(1)} |`);
    }
  }
  out.push('');
  for (const b of browsers) {
    const shots = b.rows.flatMap((r) => r.shots);
    out.push(`- ${b.preset} browser: ${shots.length} renders, boots ${(b.rows.reduce((s, r) => s + (r.bootMs ?? 0), 0) / 1000).toFixed(1)} s, wall ${(b.wallMs / 1000).toFixed(1)} s`);
  }
  out.push(`- wall time: ${(wallMs / 1000).toFixed(1)} s`);
  return out.join('\n');
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`e2e-visual: ${msg(e)}\n${USAGE}`);
    process.exit(2);
  }
  if (!opts.time) {
    console.error(`e2e-visual: only --time is built (the VG2 skeleton; VG5 grows the gate)\n${USAGE}`);
    process.exit(2);
  }
  let vp;
  try {
    vp = await import('./visual-gate/viewpoints.mjs');
  } catch (e) {
    console.error(`e2e-visual: cannot load scripts/visual-gate/viewpoints.mjs (VG3): ${msg(e)}`);
    process.exit(2);
  }
  const unknown = (opts.maps ?? []).filter((m) => !vp.MAPS[m]);
  if (unknown.length) {
    console.error(`e2e-visual: unknown map(s) ${unknown.join(', ')} (known: ${Object.keys(vp.MAPS).join(', ')})`);
    process.exit(2);
  }
  const maps = MAP_ORDER.filter((m) => vp.MAPS[m] && (!opts.maps || opts.maps.includes(m)));
  if (opts.png) mkdirSync(opts.png, { recursive: true });
  console.log(`e2e-visual --time: ${maps.join(', ')} x ${vp.PRESETS.join(', ')}${opts.serial ? ' (serial)' : ' (one browser per preset, at once)'}${opts.only ? `, only ${opts.only.join(', ')}` : ''}`);
  const t0 = now();
  const browsers = [];
  if (opts.serial) for (const p of vp.PRESETS) browsers.push(await runPreset(opts, vp, maps, p));
  else browsers.push(...(await Promise.all(vp.PRESETS.map((p) => runPreset(opts, vp, maps, p)))));
  const wallMs = Math.round(now() - t0);
  const rows = browsers.flatMap((b) => b.rows);
  const errors = rows.flatMap((r) => r.errors.map((e) => `${r.map}@${r.preset} ${e}`));
  console.log(`\n${timingTable(browsers, wallMs)}`);
  if (errors.length) console.log(`\nerrors (${errors.length}):\n${errors.map((e) => `- ${e}`).join('\n')}`);
  if (opts.json) {
    let sha = process.env.VG_SHA;
    if (!sha) {
      try {
        sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', timeout: 5000, windowsHide: true }).trim();
      } catch {
        sha = undefined;
      }
    }
    const uniq = (k) => [...new Set(rows.map((r) => r[k]).filter(Boolean))].join(' | ');
    mkdirSync(dirname(opts.json), { recursive: true });
    writeFileSync(opts.json, `${JSON.stringify({ sha, renderer: uniq('renderer'), chrome: uniq('chrome'), wallMs, browsers: browsers.map((b) => ({ preset: b.preset, wallMs: b.wallMs })), rows }, null, 1)}\n`);
    console.log(`json: ${opts.json}`);
  }
  process.exit(errors.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`e2e-visual: ${e?.stack ?? e}`);
    process.exit(1);
  });
}
