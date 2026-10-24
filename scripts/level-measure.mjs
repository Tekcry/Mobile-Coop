// (level-validator V6c, docs/level-validator/V6-PLAN.md) Greybox measurement CLI: measures on the built level what a map
// graph only declares (floor shadow %, vantage visibility %, LOS-break time, partner revive reach, link traversal
// times) and writes it back beside the targets as `measured`. Headless node, no browser, no GPU: Vite's SSR loader runs
// the TypeScript (`scripts/lamp-audit.mjs` pattern), the map is built with `map.build(new LevelBuilder(), 0)`, the guards'
// nav grid is `tests/helpers/runtimeNav.ts`, the light field is `nodeLightField`, and the measuring is `measureGraph`
// (`src/world/levelMeasure.ts`). Every number it holds a graph to comes from `docs/design/metrics.json` `rules`.
//   node scripts/level-measure.mjs <graph.json> [more.json ...] [--write] [--check] [--doors shut]
//                                  [--map <id>] [--metrics <file>]
//   (npm run level-measure -- <graph.json> ...)
//   (none)         print a declared / measured table per space, split and link; change nothing.
//   --write        write `measured` on every measured space and link and `meta.measured` back into the graph file
//                  (numbers to 2 decimals, stable key order; the rest of the file is left byte-identical: only the
//                  `measured` members are replaced or appended).
//   --check        exit 1 when a measured value crosses a target (shadow band, vantage minimum, LOS-break maximum,
//                  partner reach maximum) or has drifted more than 0.05 from the stored `measured`, or the measure
//                  step reported an ERR. A space with no stored `measured` is noted, not failed (`level-validate.mjs
//                  --require-measured` is the presence gate).
//   --doors shut   bake the light with every door shut (default: open, as the nav grid has no door bodies). The numbers
//                  are the shut-door ones: use it to see whether a space that fails open passes shut; `--write` stores them.
//   --map <id>     measure on this map of `MAPS` instead of the graph's `meta.map` (a graph whose map is not built yet).
//   --metrics <f>  the metrics file (default docs/design/metrics.json).
// A space with no `area` is "no area (skipped)". Several files that share a map build and bake it once. Exit codes: 0
// ok, 1 a --check failure, 2 bad usage / unreadable file / unknown map. The Vite server is closed on exit, also on error.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Tooling tolerance, not a level number: a stored value this far from a re-measure has drifted (`--check`). */
const DRIFT_TOL = 0.05;
/** V6-PLAN "Area mapping": a space with fewer floor cells than this is a wrong area, an ERR line in the report. */
const MIN_CELLS = 20;
const EPS = 1e-9;
const USAGE = 'usage: node scripts/level-measure.mjs <graph.json> [more.json ...] [--write] [--check] [--doors shut] [--map <id>] [--metrics <file>]';
const log = (s) => process.stderr.write(s + '\n');
const out = (s) => process.stdout.write(s + '\n');

// ---- args --------------------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const o = { files: [], write: false, check: false, doors: 'open', map: null, metrics: resolve(root, 'docs/design/metrics.json') };
  const val = (a, i, name) => {
    const eq = a.indexOf('=');
    if (eq >= 0) return [a.slice(eq + 1), i];
    if (i + 1 >= argv.length) throw new Error(`${name} needs a value`);
    return [argv[i + 1], i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--write') o.write = true;
    else if (a === '--check') o.check = true;
    else if (a === '--doors' || a.startsWith('--doors=')) {
      let v;
      [v, i] = val(a, i, '--doors');
      if (v !== 'shut' && v !== 'open') throw new Error(`--doors takes 'shut' or 'open', not '${v}'`);
      o.doors = v;
    } else if (a === '--map' || a.startsWith('--map=')) [o.map, i] = val(a, i, '--map');
    else if (a === '--metrics' || a.startsWith('--metrics=')) {
      let v;
      [v, i] = val(a, i, '--metrics');
      o.metrics = resolve(v);
    } else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else o.files.push(resolve(a));
  }
  if (!o.files.length) throw new Error('no graph file given');
  return o;
}

// ---- formatting --------------------------------------------------------------------------------------------------

const r2 = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : v);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v === null || v === undefined ? '-' : String(v));
const pair = (decl, meas) => `${f2(decl)} / ${f2(meas)}`;

function table(headers, rows) {
  const w = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (r) => r.map((c, i) => String(c).padEnd(w[i])).join('  ').trimEnd();
  return [line(headers), line(w.map((n) => '-'.repeat(n))), ...rows.map(line)].join('\n');
}

// ---- JSON text patching (the file stays byte-identical but for the `measured` members) ---------------------------

/** Parse JSON text into a span tree: objects {t:'o', s, e, m:[{key, ks, vs, ve, node}]}, arrays {t:'a', i:[node]}, scalars {t:'p'}. */
function spans(text) {
  let p = 0;
  const ws = () => {
    while (p < text.length && ' \t\r\n'.includes(text[p])) p++;
  };
  const str = () => {
    const s = p++;
    while (text[p] !== '"') p += text[p] === '\\' ? 2 : 1;
    p++;
    return JSON.parse(text.slice(s, p));
  };
  const value = () => {
    ws();
    const s = p;
    const c = text[p];
    if (c === '{') {
      p++;
      const m = [];
      ws();
      if (text[p] === '}') p++;
      else {
        for (;;) {
          ws();
          const ks = p;
          const key = str();
          ws();
          if (text[p++] !== ':') throw new Error(`bad JSON at ${p}`);
          ws();
          const vs = p;
          const node = value();
          m.push({ key, ks, vs, ve: p, node });
          ws();
          if (text[p] === ',') p++;
          else if (text[p] === '}') {
            p++;
            break;
          } else throw new Error(`bad JSON at ${p}`);
        }
      }
      return { t: 'o', s, e: p, m };
    }
    if (c === '[') {
      p++;
      const i = [];
      ws();
      if (text[p] === ']') p++;
      else {
        for (;;) {
          i.push(value());
          ws();
          if (text[p] === ',') p++;
          else if (text[p] === ']') {
            p++;
            break;
          } else throw new Error(`bad JSON at ${p}`);
        }
      }
      return { t: 'a', s, e: p, i };
    }
    if (c === '"') {
      str();
      return { t: 'p', s, e: p };
    }
    while (p < text.length && !',]} \t\r\n'.includes(text[p])) p++;
    return { t: 'p', s, e: p };
  };
  const node = value();
  ws();
  if (p !== text.length) throw new Error(`trailing text after the JSON value at ${p}`);
  return node;
}

/** `value` as JSON text: a flat object (scalars and arrays of scalars) on one line, a nested one over lines. */
function fmt(value, indent) {
  if (Array.isArray(value)) return `[${value.map((v) => JSON.stringify(r2(v))).join(', ')}]`;
  if (value === null || typeof value !== 'object') return JSON.stringify(r2(value));
  const entries = Object.entries(value);
  if (!entries.length) return '{}';
  const flat = entries.every(([, v]) => v === null || typeof v !== 'object' || Array.isArray(v));
  if (flat) return `{ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${fmt(v, indent)}`).join(', ')} }`;
  const pad = ' '.repeat(indent + 2);
  return `{\n${entries.map(([k, v]) => `${pad}${JSON.stringify(k)}: ${fmt(v, indent + 2)}`).join(',\n')}\n${' '.repeat(indent)}}`;
}

const lineIndent = (text, pos) => {
  const ls = text.lastIndexOf('\n', pos - 1) + 1;
  return /^[ \t]*/.exec(text.slice(ls, pos))[0].length;
};

/** The edit that sets `measured` on an object node: replace the member's value, or append a member after the last one. */
function setMeasured(text, obj, value, eol) {
  const hit = obj.m.find((x) => x.key === 'measured');
  const base = lineIndent(text, obj.s);
  if (hit) return { start: hit.vs, end: hit.ve, text: fmt(value, lineIndent(text, hit.ks)).replace(/\n/g, eol) };
  if (!obj.m.length) return { start: obj.s + 1, end: obj.s + 1, text: ` "measured": ${fmt(value, base)} ` };
  const last = obj.m[obj.m.length - 1];
  const sameLine = text.lastIndexOf('\n', last.ks) < obj.s;
  const indent = sameLine ? base + 2 : lineIndent(text, last.ks);
  return { start: last.ve, end: last.ve, text: `,${eol}${' '.repeat(indent)}"measured": ${fmt(value, indent)}`.replace(/\n/g, eol) };
}

/** The graph text with `edits` applied: `spaces[i]`, `links[i]` and `meta` each get their `measured` value. */
function patchGraph(text, edits) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const tree = spans(text);
  const member = (o, key) => o.m.find((x) => x.key === key)?.node;
  const ops = [];
  const arrays = { spaces: member(tree, 'spaces'), links: member(tree, 'links') };
  for (const e of edits) {
    const obj = e.kind === 'meta' ? member(tree, 'meta') : arrays[e.kind]?.i[e.index];
    if (!obj || obj.t !== 'o') throw new Error(`cannot place measured on ${e.kind}${e.index ?? ''}`);
    ops.push(setMeasured(text, obj, e.value, eol));
  }
  ops.sort((a, b) => b.start - a.start);
  let o = text;
  for (const op of ops) o = o.slice(0, op.start) + op.text + o.slice(op.end);
  return o;
}

// ---- the run -----------------------------------------------------------------------------------------------------

const metricsRule = (rules, key) => {
  if (typeof rules[key] !== 'number') throw new Error(`metrics.rules.${key} missing or not a number`);
  return rules[key];
};

/** Measure one graph file against a prepared level; returns what to print, write and check. */
function measureFile(file, text, graph, ctx, mod, rules) {
  const { built } = ctx;
  const res = mod.measureGraph(graph, {
    builder: built.b,
    field: built.field,
    nav: built.nav,
    sight: built.sight,
    guards: built.guards,
    metrics: ctx.metrics,
    rooms: built.rooms,
    map: built.map,
  });
  const lim = {
    shadowMin: metricsRule(rules, 'shadow_min_frac'),
    shadowMax: metricsRule(rules, 'shadow_max_frac'),
    sees: metricsRule(rules, 'vantage_min_frac'),
    los: metricsRule(rules, 'los_break_max_s'),
    reach: metricsRule(rules, 'reach_max_s'),
    split: metricsRule(rules, 'split_max_s'),
  };
  const errors = [...res.errors];
  const fails = [];
  const drifts = [];
  const notes = [];
  const rel = relative(root, file).replace(/\\/g, '/');

  // spaces
  const spaceRows = [];
  let unstored = 0;
  for (const s of graph.spaces) {
    const m = res.spaces[s.id];
    if (!m) {
      spaceRows.push([s.id, s.type ?? '', s.area === undefined ? 'no area (skipped)' : 'not measured (see ERR)', '', '', '', '']);
      continue;
    }
    const bad = [];
    if (m.shadow_pct !== null && (m.shadow_pct < lim.shadowMin - EPS || m.shadow_pct > lim.shadowMax + EPS)) bad.push(`shadow_pct ${f2(m.shadow_pct)} outside ${f2(lim.shadowMin)}-${f2(lim.shadowMax)}`);
    if (m.sees_pct !== null && m.sees_pct < lim.sees - EPS) bad.push(`sees_pct ${f2(m.sees_pct)} below ${f2(lim.sees)}`);
    if (m.los_break_s !== null && m.los_break_s > lim.los + EPS) bad.push(`los_break_s ${f2(m.los_break_s)} above ${f2(lim.los)}`);
    for (const b of bad) fails.push(`${rel}: ${s.id}: ${b}`);
    if (m.cells > 0 && m.cells < MIN_CELLS) errors.push(`ERR ${s.id}: only ${m.cells} floor cells (< ${MIN_CELLS}): is the area right?`);
    const st = s.measured;
    if (st && typeof st === 'object') {
      for (const k of ['shadow_pct', 'sees_pct', 'los_break_s']) driftOf(drifts, `${rel}: ${s.id}: ${k}`, st[k], m[k]);
      if (typeof st.geom === 'string' && st.geom !== m.geom) notes.push(`${rel}: ${s.id}: stored geom ${st.geom} is stale (now ${m.geom})`);
    } else if (m.cells > 0) unstored++;
    spaceRows.push([s.id, s.type ?? '', m.cells, pair(s.shadow_pct, m.shadow_pct), pair(s.vantage?.sees_pct, m.sees_pct), pair(s.los_break_s, m.los_break_s), m.cells === 0 ? 'no floor' : bad.length ? `FAIL ${bad.length}` : 'ok']);
  }

  // splits
  const splitRows = [];
  const storedSplits = graph.meta.measured?.splits ?? {};
  for (const [id, sp] of Object.entries(res.meta.splits)) {
    const bad = [];
    if (sp.reach_s !== null && sp.reach_s > lim.reach + EPS) bad.push(`reach_s ${f2(sp.reach_s)} above ${f2(lim.reach)}`);
    for (const k of ['a_s', 'b_s']) if (sp[k] !== null && sp[k] > lim.split + EPS) notes.push(`${rel}: split ${id}: ${k} ${f2(sp[k])} above ${f2(lim.split)} (the validator's leg limit)`);
    for (const b of bad) fails.push(`${rel}: split ${id}: ${b}`);
    const st = storedSplits[id];
    if (st && typeof st === 'object') for (const k of ['a_s', 'b_s', 'reach_s']) driftOf(drifts, `${rel}: split ${id}: ${k}`, st[k], sp[k]);
    splitRows.push([id, f2(sp.a_s), f2(sp.b_s), pair(lim.reach, sp.reach_s), bad.length ? 'FAIL' : 'ok']);
  }

  // links (both ends with an area)
  const linkRows = [];
  const edits = [];
  let skippedLinks = 0;
  const hasArea = new Set(graph.spaces.filter((s) => s.area !== undefined).map((s) => s.id));
  graph.links.forEach((l, k) => {
    if (!hasArea.has(l.from) || !hasArea.has(l.to)) {
      skippedLinks++;
      return;
    }
    const lm = res.links[k];
    if (l.measured && typeof l.measured === 'object') driftOf(drifts, `${rel}: link ${l.from} -> ${l.to} (${l.kind})`, l.measured.time_s, lm.time_s);
    linkRows.push([`${l.from} -> ${l.to}`, l.kind, pair(l.time_s, lm.time_s), pair(l.length, lm.path_m), lm.time_s === null ? lm.why : '']);
    edits.push({ kind: 'links', index: k, value: lm.time_s === null ? { time_s: null, why: lm.why } : { time_s: lm.time_s, path_m: lm.path_m } });
  });

  // what --write stores
  for (const [i, s] of graph.spaces.entries()) {
    const m = res.spaces[s.id];
    if (m && m.cells > 0) edits.push({ kind: 'spaces', index: i, value: { shadow_pct: m.shadow_pct, sees_pct: m.sees_pct, vantage_at: m.vantage_at, los_break_s: m.los_break_s, cells: m.cells, geom: m.geom } });
  }
  const measuredAny = Object.keys(res.spaces).length > 0;
  if (measuredAny) edits.push({ kind: 'meta', value: { tool: res.meta.tool, date: res.meta.date, geom: res.meta.geom, splits: res.meta.splits } });
  else edits.length = 0;

  const o = [];
  o.push(`== ${rel}  (map ${built.map.id}, doors ${ctx.doors}${ctx.mapOverride ? `, --map ${ctx.mapOverride}` : ''})  geom ${res.meta.geom}`);
  o.push('');
  o.push('spaces (declared / measured; vantage at = the measured feet point)');
  o.push(table(['space', 'type', 'cells', 'shadow', 'sees', 'LOS break s', 'verdict'], spaceRows));
  if (splitRows.length) {
    o.push('', 'splits (leg times s; reach s limit / measured)');
    o.push(table(['split', 'leg a s', 'leg b s', 'reach', 'verdict'], splitRows));
  }
  if (linkRows.length) {
    o.push('', `links (declared / measured${skippedLinks ? `; ${skippedLinks} more skipped: an end has no area` : ''})`);
    o.push(table(['link', 'kind', 'time s', 'length m / path m', 'why not measured'], linkRows));
  } else if (skippedLinks) o.push('', `links: ${skippedLinks} skipped (an end has no area)`);
  for (const e of errors) o.push(e);
  for (const n of notes) o.push(`note: ${n}`);
  if (unstored) o.push(`note: ${unstored} measured space(s) have no stored measured (run with --write)`);

  let newText = text;
  if (edits.length) newText = patchGraph(text, edits);
  return { report: o.join('\n'), errors, fails, drifts, notes, newText, measured: measuredAny };
}

/** A stored value that is not within DRIFT_TOL of the new one (null against a number counts). */
function driftOf(list, name, stored, now) {
  if (stored === undefined) return;
  const a = typeof stored === 'number' ? stored : null;
  const b = typeof now === 'number' ? now : null;
  if (a === null && b === null) return;
  if (a === null || b === null || Math.abs(a - b) > DRIFT_TOL + EPS) list.push(`${name} stored ${f2(a)} now ${f2(b)}`);
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    log(`level-measure: ${e.message}\n${USAGE}`);
    return 2;
  }
  const metrics = JSON.parse(readFileSync(args.metrics, 'utf8'));
  const rules = metrics.rules;
  if (!rules || typeof rules !== 'object') {
    log(`level-measure: ${args.metrics} has no rules object`);
    return 2;
  }
  const graphs = [];
  for (const file of args.files) {
    try {
      const text = readFileSync(file, 'utf8');
      const graph = JSON.parse(text);
      if (!graph || !Array.isArray(graph.spaces) || !Array.isArray(graph.links) || typeof graph.meta?.map !== 'string') throw new Error('not a level graph (needs meta.map, spaces, links)');
      graphs.push({ file, text, graph });
    } catch (e) {
      log(`level-measure: ${relative(root, file)}: ${e.message}`);
      return 2;
    }
  }

  const server = await createServer({ root, configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const load = (p) => server.ssrLoadModule(p);
    const { LevelBuilder } = await load('/src/world/levelBuilder.ts');
    const { MAPS } = await load('/src/world/maps/index.ts');
    const { SightWorld } = await load('/src/game/sectorCheck.ts');
    const { runtimeNav } = await load('/tests/helpers/runtimeNav.ts');
    const mod = await load('/src/world/levelMeasure.ts');

    /** One build, nav, bake, sight world per map id (files of the same map share them). */
    const cache = new Map();
    const prepare = (id) => {
      let c = cache.get(id);
      if (c) return c;
      const map = MAPS.find((m) => m.id === id);
      if (!map) throw new Error(`map '${id}' is not in MAPS (${MAPS.map((m) => m.id).join(', ')}); use --map <id> to measure on another`);
      let t = Date.now();
      const b = new LevelBuilder();
      const layout = map.build(b, 0);
      log(`${id}: built (${Date.now() - t} ms)`);
      t = Date.now();
      const spawn = layout.playerSpawns[0].pos;
      const nav = runtimeNav(b, spawn, map.navLayers ?? 3, layout.navSeeds ?? []);
      log(`${id}: runtime nav (${Date.now() - t} ms)`);
      t = Date.now();
      const field = mod.nodeLightField(b, map, { doors: args.doors });
      log(`${id}: light baked, doors ${args.doors} (${Date.now() - t} ms)`);
      const guards = (map.sectors ?? []).flatMap((s) => s.guards).map((g) => ({ x: g.x, z: g.z, y: g.y, route: g.route }));
      c = { map, b, nav, field, sight: new SightWorld(b.boxes, b.cylinders), guards, rooms: layout.rooms ?? [] };
      cache.set(id, c);
      return c;
    };

    let failed = 0;
    for (const g of graphs) {
      const t = Date.now();
      if (!g.graph.spaces.some((s) => s.area !== undefined)) {
        // nothing to measure: no build, nav or bake (the map must still exist)
        const id = args.map ?? g.graph.meta.map;
        if (!MAPS.some((m) => m.id === id)) throw new Error(`map '${id}' is not in MAPS (${MAPS.map((m) => m.id).join(', ')}); use --map <id> to measure on another`);
        out(`== ${relative(root, g.file)}  (map ${id})`);
        out(`no space has an area: all ${g.graph.spaces.length} spaces skipped, nothing built or baked`);
        for (const s of g.graph.spaces) out(`  ${s.id}  ${s.type ?? ''}  no area (skipped)`);
        if (args.write) out(`not written: no space of ${relative(root, g.file)} has an area`);
        out('');
        continue;
      }
      const built = prepare(args.map ?? g.graph.meta.map);
      const r = measureFile(g.file, g.text, g.graph, { built, metrics, doors: args.doors, mapOverride: args.map }, mod, rules);
      log(`${relative(root, g.file)}: measured (${Date.now() - t} ms)`);
      out(r.report);
      if (args.write) {
        if (!r.measured) out(`not written: no space of ${relative(root, g.file)} has an area`);
        else if (r.newText !== g.text) {
          writeFileSync(g.file, r.newText);
          out(`wrote ${relative(root, g.file)}`);
        } else out(`unchanged ${relative(root, g.file)}`);
      }
      if (args.check) {
        for (const f of r.fails) out(`FAIL ${f}`);
        for (const d of r.drifts) out(`DRIFT ${d} (> ${DRIFT_TOL})`);
        for (const e of r.errors) out(`FAIL ${relative(root, g.file).replace(/\\/g, '/')}: ${e}`);
        failed += r.fails.length + r.drifts.length + r.errors.length;
      }
      out('');
    }
    if (args.check) out(failed ? `check: ${failed} failure(s)` : 'check: ok');
    return failed ? 1 : 0;
  } catch (e) {
    log(`level-measure: ${e.message}`);
    return 2;
  } finally {
    await server.close();
  }
}

process.exitCode = await main();
