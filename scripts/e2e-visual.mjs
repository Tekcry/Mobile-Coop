// visual-gate (docs/visual-gate/PLAN.md, briefs/VG5.md): the picture check. Gate mode (the default): every view, rig
// (torch on, then off) and, at Epic, the L5 grey cards, on every map at Low and Epic in two browsers at once (A7); each
// shot measured (VG1), checked against its absolute rules and its release baseline (VG4), the meter = field and card
// parity rows; one VISUAL-GATE block on stdout, a RunRecord in scratch (and on `visual-baselines` when recording), exit
// 0 clean / 1 flagged / 2 usage / 3 error. `--time` is the VG2 M0 timing run, unchanged. `--rescore` scores a saved
// result.json again (no browser, no record).
//   node scripts/e2e-visual.mjs <url> [--json f] [--png d] [--only id,id] [--maps a,b] [--serial] [--extra <params>]
//     [--record | --no-record] [--rules-only] [--cards n] [--version x.y.z] [--deadline s] [--scratch d] [--rescore <result.json>]
//   node scripts/e2e-visual.mjs <url> --time [--json <file>] [--png <dir>] [--only id,id] [--maps a,b] [--serial]
// Needs a served dist (scripts/laptop-queue/serve.mjs) and the GPU (E2E_GPU=1, port 4189). Env: VG_RECORD=1 (record),
// VG_TRAIN=<n>, VG_SHA, VG_BRANCH, VG_DEADLINE_S, VG_SCRATCH.
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { bootMap, shoot, settle, pin, aim, converge, capture, closeBoot, thumb, cardSpot, card } from './visual-gate/harness.mjs';
import { lumaFromRgba, measure, leak } from './visual-gate/metrics.mjs';
import { pickBaseline, shotKey } from './visual-gate/storeLib.mjs';
import { fetchStore, readRecords, isAncestorFn, recordRun } from './visual-gate/store.mjs';
import { DEADLINE_S, EXIT, planMasks, cardLuma, cardCheck, meterCheck, baselineCutoff, scoreRun, summarize, renderBlock,
  runRecord, shouldRecord, thumbsToPush, roundMetrics, round5, recheckParity } from './visual-gate/gate.mjs';

const USAGE = 'usage: node scripts/e2e-visual.mjs <url> [--json f] [--png d] [--only id,id] [--maps a,b] [--serial] [--extra <params>] [--record | --no-record] [--rules-only] [--cards n] [--version x.y.z] [--deadline s] [--scratch d] [--rescore <result.json>]\n       node scripts/e2e-visual.mjs <url> --time [--json <file>] [--png <dir>] [--only id,id] [--maps a,b] [--serial]';
/** Map order per browser (smallest bake first). */
export const MAP_ORDER = ['warehouse', 'warehouseOps', 'ctcourse', 'campusOps'];

const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

/** Command line (without node and the script) -> options. Throws on an unknown flag or a flag missing its value. */
export function parseArgs(argv) {
  const o = { url: null, time: false, json: null, png: null, only: null, maps: null, serial: false, extra: '', record: false, noRecord: false, rulesOnly: false, cards: null, version: null, deadline: null, scratch: null, rescore: null };
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
    else if (a === '--extra') o.extra = val();
    else if (a === '--record') o.record = true;
    else if (a === '--no-record') o.noRecord = true;
    else if (a === '--rules-only') o.rulesOnly = true;
    else if (a === '--cards') {
      const v = val();
      if (!/^\d+$/.test(v)) throw new Error(`--cards wants a whole number >= 0, got ${v}`);
      o.cards = Number(v);
    } else if (a === '--version') {
      const v = val();
      if (!/^\d+\.\d+\.\d+$/.test(v)) throw new Error(`--version wants x.y.z, got ${v}`);
      o.version = v;
    } else if (a === '--deadline') {
      const v = val();
      const n = Number(v);
      if (!/^\d+(\.\d+)?$/.test(v) || !(n > 0)) throw new Error(`--deadline wants seconds > 0, got ${v}`);
      o.deadline = n;
    } else if (a === '--scratch') o.scratch = val();
    else if (a === '--rescore') o.rescore = val();
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
      row.shots.push({ id: item.id, kind: state ? 'rig' : 'view', rigState: state, settle: s.settle, pin: s.pin, aimReady: s.aimReady, converge: s.converge, behind: Object.keys(s.regions).filter((k) => s.regions[k].behind), ms: s.ms });
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

/** The VG2 M0 timing run (`--time`), unchanged. */
async function timeMain(opts, vp, maps) {
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

// ---------- the gate (VG5) ----------

/** (vg5t, vg5-check polish 4) End gate / rescore mode by `process.exitCode`, not `process.exit`: the block printed just
 * before reaches a POSIX pipe in full (an async write `exit` would cut). A backstop exit after `ms` (unref'd, so it never
 * holds the process) still ends a run that a stray handle keeps alive, well before the train step's 300 s kill. */
export function finish(code, proc = process, timer = setTimeout, ms = 5000) {
  proc.exitCode = code;
  const t = timer(() => proc.exit(code), ms);
  t?.unref?.();
  return code;
}

const SHA40 = /^[0-9a-f]{40}$/;
/** Renderer strings compared trimmed with inner whitespace collapsed. */
const normR = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');

/** git stdout, '' on any failure. */
function gitOut(args, timeout = 5000) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', timeout, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

/** sha (VG_SHA, else git HEAD), version (package.json in cwd), train (VG_TRAIN), branch (VG_BRANCH, else train/<n>). */
export function runInfo(env = process.env) {
  const sha = env.VG_SHA || gitOut(['rev-parse', 'HEAD']) || null;
  let version = '0.0.0';
  try {
    version = String(JSON.parse(readFileSync('package.json', 'utf8')).version ?? version);
  } catch {
    /* no package.json in cwd */
  }
  const t = env.VG_TRAIN;
  const train = t && /^\d+$/.test(t.trim()) ? Number(t.trim()) : null;
  const branch = env.VG_BRANCH || (train !== null ? `train/${train}` : '');
  return { sha, version, train, branch };
}

/** `--scratch`, VG_SCRATCH, else C:/NightShift/scratch/visual-gate on win32, else <tmpdir>/visual-gate (A11). */
function scratchRoot(opts) {
  return opts.scratch ?? process.env.VG_SCRATCH ?? (process.platform === 'win32' ? 'C:/NightShift/scratch/visual-gate' : join(tmpdir(), 'visual-gate'));
}

/** Remove `<root>/<40 hex>/` run dirs older than 60 days; nothing else (m0/, proofs/ stay). */
function pruneScratch(root, days = 60) {
  const cutoff = Date.now() - days * 86400e3;
  let names = [];
  try {
    names = readdirSync(root);
  } catch {
    return 0;
  }
  let n = 0;
  for (const name of names) {
    if (!SHA40.test(name)) continue;
    const p = join(root, name);
    try {
      const st = statSync(p);
      if (st.isDirectory() && st.mtimeMs < cutoff) {
        rmSync(p, { recursive: true, force: true });
        n++;
      }
    } catch {
      /* raced or locked: next run */
    }
  }
  return n;
}

/** VG7's per-key tolerances (`tolerances.mjs` TOLERANCES) when the file exists, else {} (the floors, C0 P8). */
async function loadTolerances(warnings) {
  const url = new URL('./visual-gate/tolerances.mjs', import.meta.url);
  if (!existsSync(fileURLToPath(url))) return {};
  try {
    const m = await import(url.href);
    return m.TOLERANCES ?? {};
  } catch (e) {
    warnings.push(`tolerances.mjs did not load (${msg(e)}): floors used`);
    return {};
  }
}

/** The baseline picks (A8, A18): origin/master fetched for the ancestor test (soft), the data branch fetched and read. */
function loadPicks(renderer, cutoff) {
  gitOut(['fetch', '-q', 'origin', '+refs/heads/master:refs/remotes/origin/master'], 60000);
  fetchStore();
  return pickBaseline(readRecords(), { isAncestor: isAncestorFn(), renderer, version: cutoff });
}

/** View and rig items by id. */
const itemsOf = (vp) => Object.fromEntries([...vp.VIEWS, ...vp.RIGS].map((i) => [i.id, i]));

/** @param {Record<string, unknown>} o every number rounded to 5 decimals (one level) */
const round1 = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? round5(v) : v]));

/** The meter = field row of a view (A22). The note: d, flickering lights reaching the body of the map's (vg5t), and the
 * player's drift from the view's feet when over 5 cm (meter and field are both read where the player stands). */
export function meterRow(v, preset, st) {
  const m = meterCheck(st.meter, st.field, st.flickering);
  const notes = [m.skip === 'error' ? `meter ${st.meter} field ${st.field} not finite` : `d ${round5(m.d)}`];
  if (st.flickering || st.flickeringAll) notes.push(`${st.flickering ?? 0} of ${st.flickeringAll ?? st.flickering} flickering near`);
  if (typeof st.drift === 'number' && st.drift > 0.05) notes.push(`drift ${round5(st.drift)} m`);
  return { kind: 'meter', id: `meter-${v.id}@${preset}`, map: v.map, view: v.id, at: v.feet, level: null, luma: null, meter: round5(st.meter), field: round5(st.field), min: null, max: null, ok: m.ok, skip: m.skip, note: notes.join(', ') };
}

function cardRow(c, o) {
  return {
    kind: 'card', id: c.id, map: c.view.map, view: c.view.id, at: c.at,
    level: o.level ?? null, luma: o.luma ?? null, meter: null, field: null, min: o.min ?? null, max: o.max ?? null,
    ok: o.ok ?? true, skip: o.skip ?? null, note: o.note ?? null,
  };
}

/** One view or rig state: shoot, measure (planMasks), thumb, ShotRecord. Returns the luma image for a rig state (the
 * leak needs on and off) and the on shot's leak mask; a view's image is dropped at once. */
async function shotOne(g, page, boot, item, preset, state, out) {
  const key = shotKey(item.id, preset, state);
  const t = now();
  const rec = { key, id: item.id, map: item.map, preset, rigState: state, metrics: null, skips: [], settle: null, converged: false, noisy: false, aimReady: false, error: null, ms: 0 };
  let img = null;
  let leakMask = null;
  try {
    const s = await shoot(page, item, state, boot);
    img = lumaFromRgba(s.capture.rgba, s.capture.w, s.capture.h);
    s.capture.rgba = null; // freed once measured
    const pm = planMasks(s.regions, item.metrics ?? {}, img.w, img.h);
    rec.metrics = roundMetrics(measure(img, pm.masks, pm.want));
    rec.skips = pm.skips;
    const st = s.settle;
    rec.settle = { meter: round5(st.meter), field: round5(st.field), simS: round5(st.simS), guards: st.guards, flickering: st.flickering ?? 0, alarm: st.alarm ?? null,
      drift: round5(st.drift ?? 0), fieldFeet: round5(st.fieldFeet ?? st.field), flickeringAll: st.flickeringAll ?? st.flickering ?? 0 };
    rec.converged = !!s.converge?.ok;
    rec.noisy = !!s.converge?.noisy;
    rec.aimReady = s.aimReady !== false;
    if (state === 'on') leakMask = pm.masks.leak ?? null;
    try {
      const tb = await thumb(page, s.capture.png);
      if (tb) out.thumbs.set(key, tb);
      else g.warnOnce('thumb', 'thumbs: the browser made no image/webp blob; no thumbs this run');
    } catch (e) {
      g.warnOnce('thumb-error', `thumb ${key}: ${msg(e)}`);
    }
    if (g.opts.png) writeFileSync(join(g.opts.png, `${key}.png`), s.capture.png);
  } catch (e) {
    rec.error = msg(e);
    img = null;
  }
  rec.ms = Math.round(now() - t);
  (state ? out.rigs : out.shots).push(rec);
  return { rec, img: state ? img : null, leakMask };
}

/** One map at one preset in its own browser: views (+ meter rows), rigs on then off (+ leak), Epic cards. */
async function gateMap(g, mapId, preset, out) {
  const { opts, vp } = g;
  const want = (id) => !opts.only || opts.only.includes(id);
  const views = vp.VIEWS.filter((v) => v.map === mapId && want(v.id));
  const rigs = vp.RIGS.filter((r) => r.map === mapId && want(r.id));
  let cards = [];
  if (preset === 'epic') {
    for (const v of views) (v.parity ?? []).forEach((at, k) => cards.push({ id: `card-${v.id}-${k + 1}`, view: v, at }));
    if (opts.cards !== null) cards = cards.slice(0, opts.cards);
  }
  const keys = [...views.map((v) => shotKey(v.id, preset)), ...rigs.flatMap((r) => [shotKey(r.id, preset, 'on'), shotKey(r.id, preset, 'off')]), ...cards.map((c) => c.id)];
  if (!keys.length) return;
  if (g.past()) {
    out.notRun.push(...keys);
    return;
  }
  let boot;
  try {
    const cfg = vp.MAPS[mapId];
    boot = await bootMap({ url: opts.url, map: { query: cfg.query, label: cfg.label ?? mapId }, preset, extra: opts.extra });
  } catch (e) {
    out.errors.push(`boot ${mapId}@${preset}: ${msg(e)}`);
    return;
  }
  out.renderers.push(normR(boot.renderer));
  out.chrome ||= boot.chrome;
  const page = boot.page;
  try {
    for (const v of views) {
      if (g.past()) {
        out.notRun.push(shotKey(v.id, preset));
        continue;
      }
      const r = await shotOne(g, page, boot, v, preset, null, out);
      if (r.rec.settle) out.parity.push(meterRow(v, preset, r.rec.settle));
    }
    for (const rig of rigs) {
      if (g.past()) {
        out.notRun.push(shotKey(rig.id, preset, 'on'), shotKey(rig.id, preset, 'off'));
        continue;
      }
      const on = await shotOne(g, page, boot, rig, preset, 'on', out);
      if (g.past()) {
        out.notRun.push(shotKey(rig.id, preset, 'off'));
        continue;
      }
      const off = await shotOne(g, page, boot, rig, preset, 'off', out);
      // same camera both states: the leak over the on shot's projected `leak` mask
      if (on.img && off.img && on.leakMask && on.rec.metrics) on.rec.metrics.leak = round1(leak(on.img, off.img, on.leakMask));
    }
    // the cards: per view a fresh settle at its feet and a pin (VG2 polish 4), then each point
    let atView = null;
    let viewErr = null;
    for (const c of cards) {
      if (g.past()) {
        out.notRun.push(c.id);
        continue;
      }
      if (c.view !== atView) {
        atView = c.view;
        viewErr = null;
        try {
          await settle(page, { feet: c.view.feet, rig: null });
          await pin(page);
        } catch (e) {
          viewErr = `settle / pin at ${c.view.id}: ${msg(e)}`;
        }
      }
      if (viewErr) {
        out.parity.push(cardRow(c, { skip: 'error', note: viewErr }));
        continue;
      }
      try {
        const spot = await cardSpot(page, c.at);
        if (!spot) {
          out.parity.push(cardRow(c, { skip: 'no-camera', note: 'no camera spot (8 directions refused)' }));
          continue;
        }
        const res = await card(page, c.at, spot);
        const luma = cardLuma(lumaFromRgba(res.capture.rgba, res.capture.w, res.capture.h));
        const cc = cardCheck(res.level, luma);
        const notes = [spot.light, ...(res.converge.ok ? [] : ['unsteady']), ...(res.converge.noisy ? ['noisy'] : []), ...(res.aimReady ? [] : ['scene not ready']), ...(cc.skip === 'error' ? [`level ${res.level} luma ${luma} not finite`] : [])];
        out.parity.push(cardRow(c, { level: round5(res.level), luma: round5(luma), min: cc.min, max: cc.max, ok: cc.ok, skip: cc.skip, note: notes.join(', ') }));
        if (opts.png) writeFileSync(join(opts.png, `${c.id}.png`), res.capture.png);
      } catch (e) {
        out.parity.push(cardRow(c, { skip: 'error', note: msg(e) }));
      }
    }
  } finally {
    out.consoleErrors.push(...boot.errors.slice(0, 20).map((e) => `${mapId}@${preset}: ${e}`));
    await closeBoot(boot);
  }
}

/** One browser's gate run: every map in order at one preset. */
async function gatePreset(g, maps, preset) {
  const t0 = now();
  const out = { preset, shots: [], rigs: [], parity: [], errors: [], notRun: [], renderers: [], chrome: '', thumbs: new Map(), consoleErrors: [], wallMs: 0 };
  for (const m of maps) {
    const t = now();
    const n0 = out.shots.length + out.rigs.length + out.parity.length;
    await gateMap(g, m, preset, out);
    console.log(`  ${m}@${preset}: ${out.shots.length + out.rigs.length + out.parity.length - n0} rows, ${((now() - t) / 1000).toFixed(1)} s`);
  }
  out.wallMs = Math.round(now() - t0);
  return out;
}

/** The scratch thumb of a baseline run, or null. */
function readThumb(root, sha, key) {
  try {
    return readFileSync(join(root, sha, 'thumbs', `${key}.webp`));
  } catch {
    return null;
  }
}

/** Gate mode: shoot, measure, score, scratch, record, print the block, prune, exit by verdict. */
async function gateMain(opts, vp, maps) {
  const T0 = now();
  const envS = Number(process.env.VG_DEADLINE_S);
  const deadlineS = opts.deadline ?? (envS > 0 ? envS : DEADLINE_S);
  const warnings = [];
  const warned = new Set();
  const g = {
    opts,
    vp,
    past: () => now() - T0 > deadlineS * 1000,
    warnOnce: (k, text) => {
      if (warned.has(k)) return;
      warned.add(k);
      warnings.push(text);
    },
  };
  if (opts.png) mkdirSync(opts.png, { recursive: true });
  console.log(`e2e-visual: ${maps.join(', ')} x ${vp.PRESETS.join(', ')}${opts.serial ? ' (serial)' : ' (one browser per preset, at once)'}${opts.only ? `, only ${opts.only.join(', ')}` : ''}${opts.rulesOnly ? ', rules only' : ''}, deadline ${deadlineS} s`);
  const outs = [];
  if (opts.serial) for (const p of vp.PRESETS) outs.push(await gatePreset(g, maps, p));
  else outs.push(...(await Promise.all(vp.PRESETS.map((p) => gatePreset(g, maps, p)))));
  const wallMs = Math.round(now() - T0);
  const shots = outs.flatMap((o) => o.shots);
  const rigs = outs.flatMap((o) => o.rigs);
  const parity = outs.flatMap((o) => o.parity);
  const errors = outs.flatMap((o) => o.errors);
  const notRun = outs.flatMap((o) => o.notRun);
  const renderers = [...new Set(outs.flatMap((o) => o.renderers).filter(Boolean))];
  const renderer = renderers[0] ?? '';
  const chrome = outs.map((o) => o.chrome).find(Boolean) ?? '';
  const thumbs = new Map(outs.flatMap((o) => [...o.thumbs]));
  const info = runInfo();
  let picks = {};
  if (!opts.rulesOnly && renderer) {
    try {
      picks = loadPicks(renderer, baselineCutoff(info.version, { train: info.train, override: opts.version }));
    } catch (e) {
      errors.push(`baseline: ${msg(e)}`);
    }
  }
  const tolerances = await loadTolerances(warnings);
  const browsers = outs.map((o) => ({ preset: o.preset, wallMs: o.wallMs }));
  const raw = { shots, rigs, parity, errors, renderers, notRun, wallMs, browsers, warnings };
  const score = scoreRun(raw, { items: itemsOf(vp), picks, rulesOnly: opts.rulesOnly, tolerances });
  // scratch: every shot's thumb (A11)
  const root = scratchRoot(opts);
  const runDir = join(root, info.sha && SHA40.test(info.sha) ? info.sha : 'unknown-sha');
  try {
    mkdirSync(join(runDir, 'thumbs'), { recursive: true });
    for (const [k, b] of thumbs) writeFileSync(join(runDir, 'thumbs', `${k}.webp`), b);
  } catch (e) {
    score.warnings.push(`scratch thumbs: ${msg(e)}`);
  }
  const rec = runRecord({ sha: info.sha, version: info.version, train: info.train, branch: info.branch, at: new Date().toISOString(), renderer, chrome, verdict: score.verdict, shots, rigs, parity, flags: score.flags, ms: wallMs });
  // record (A8, A11, A23): a failed record is a WARN, never a verdict change
  const asked = opts.record || process.env.VG_RECORD === '1';
  const rs = shouldRecord({ record: asked, noRecord: opts.noRecord, only: opts.only, maps: opts.maps, extra: opts.extra, sha: info.sha, measured: score.measured });
  let recorded = false;
  let pushed = [];
  if (rs.ok) {
    try {
      const tp = thumbsToPush(score.flags, picks, (k) => thumbs.get(k) ?? null, (sha, k) => readThumb(root, sha, k));
      recordRun(rec, tp);
      recorded = true;
      pushed = Object.keys(tp);
    } catch (e) {
      score.warnings.push(`record failed: ${msg(e)}`);
    }
  } else if (asked && !opts.noRecord) score.warnings.push(`not recorded: ${rs.why}`);
  const summary = summarize({ score, sha: info.sha, version: info.version, train: info.train, renderer, picks, wallMs, recorded, thumbs: pushed });
  const result = { ...rec, summary, warnings: score.warnings, runErrors: errors, notRun, renderers, browsers, consoleErrors: outs.flatMap((o) => o.consoleErrors) };
  const text = `${JSON.stringify(result, null, 1)}\n`;
  try {
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, 'result.json'), text);
  } catch (e) {
    console.error(`e2e-visual: scratch result.json: ${msg(e)}`);
  }
  if (opts.json) {
    mkdirSync(dirname(opts.json), { recursive: true });
    writeFileSync(opts.json, text);
  }
  console.log(`\n${renderBlock(summary, score, { browsers, rulesOnly: opts.rulesOnly })}`);
  pruneScratch(root);
  finish(EXIT[summary.verdict]);
}

/** `--rescore <result.json>`: score a saved result (shots, rigs, parity rows) against the current viewpoints rules and
 * the baseline (or `--rules-only`); no browser, no record; print the block, exit by verdict (VG8 calibrates with it). */
async function rescoreMain(opts, vp) {
  let j;
  try {
    j = JSON.parse(readFileSync(opts.rescore, 'utf8'));
  } catch (e) {
    console.error(`e2e-visual: --rescore ${opts.rescore}: ${msg(e)}`);
    finish(EXIT.usage);
    return;
  }
  const renderer = normR(j.renderer);
  const renderers = Array.isArray(j.renderers) ? j.renderers.map(normR) : renderer ? [renderer] : [];
  const errors = [...(Array.isArray(j.runErrors) ? j.runErrors : [])];
  const warnings = [];
  let picks = {};
  if (!opts.rulesOnly) {
    try {
      picks = loadPicks(renderer, baselineCutoff(j.version, { train: j.train ?? null, override: opts.version }));
    } catch (e) {
      errors.push(`baseline: ${msg(e)}`);
    }
  }
  const tolerances = await loadTolerances(warnings);
  const browsers = Array.isArray(j.browsers) ? j.browsers : [];
  const raw = { shots: j.shots ?? [], rigs: j.rigs ?? [], parity: recheckParity(j.parity ?? [], [...(j.shots ?? []), ...(j.rigs ?? [])]), errors, renderers, notRun: j.notRun ?? [], wallMs: j.ms ?? 0, browsers, warnings };
  const score = scoreRun(raw, { items: itemsOf(vp), picks, rulesOnly: opts.rulesOnly, tolerances });
  const summary = summarize({ score, sha: j.sha ?? null, version: String(j.version ?? '0.0.0'), train: j.train ?? null, renderer, picks, wallMs: raw.wallMs, recorded: false, thumbs: [] });
  if (opts.json) {
    mkdirSync(dirname(opts.json), { recursive: true });
    writeFileSync(opts.json, `${JSON.stringify({ rescoreOf: opts.rescore, summary, flags: score.flags, warnings: score.warnings, errors: score.errors }, null, 1)}\n`);
  }
  console.log(renderBlock(summary, score, { browsers, rulesOnly: opts.rulesOnly }));
  finish(EXIT[summary.verdict]);
}

/** An error block for a crash in gate or rescore mode (VG6 still reads a verdict). */
function crashBlock(e) {
  const info = runInfo();
  const score = scoreRun({ shots: [], rigs: [], parity: [], errors: [`crash: ${msg(e)}`], renderers: [], notRun: [], wallMs: 0, browsers: [] }, { items: {}, picks: {}, rulesOnly: true });
  const summary = summarize({ score, sha: info.sha, version: info.version, train: info.train, renderer: '', picks: {}, wallMs: 0, recorded: false, thumbs: [] });
  return renderBlock(summary, score, {});
}

let gateMode = false;

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`e2e-visual: ${msg(e)}\n${USAGE}`);
    process.exit(EXIT.usage);
  }
  gateMode = !opts.time;
  let vp;
  try {
    vp = await import('./visual-gate/viewpoints.mjs');
  } catch (e) {
    console.error(`e2e-visual: cannot load scripts/visual-gate/viewpoints.mjs (VG3): ${msg(e)}`);
    process.exit(EXIT.usage);
  }
  if (opts.rescore) return rescoreMain(opts, vp);
  const unknown = (opts.maps ?? []).filter((m) => !vp.MAPS[m]);
  if (unknown.length) {
    console.error(`e2e-visual: unknown map(s) ${unknown.join(', ')} (known: ${Object.keys(vp.MAPS).join(', ')})`);
    process.exit(EXIT.usage);
  }
  const maps = MAP_ORDER.filter((m) => vp.MAPS[m] && (!opts.maps || opts.maps.includes(m)));
  if (opts.time) return timeMain(opts, vp, maps);
  return gateMain(opts, vp, maps);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`e2e-visual: ${e?.stack ?? e}`);
    if (gateMode) {
      console.log(`\n${crashBlock(e)}`);
      finish(EXIT.error);
      return;
    }
    process.exit(1);
  });
}
