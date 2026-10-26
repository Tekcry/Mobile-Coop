// (level-validator V6c, docs/level-validator/V6-PLAN.md) Greybox measurement CLI: measures on the built level what a map
// graph only declares (floor shadow %, vantage visibility %, LOS-break time, partner revive reach, link traversal
// times) and writes it back beside the targets as `measured`. Headless node, no browser, no GPU: Vite's SSR loader runs
// the TypeScript (`scripts/lamp-audit.mjs` pattern), the map is built with `map.build(new LevelBuilder(), 0)`, the guards'
// nav grid is `tests/helpers/runtimeNav.ts`, the light field is `nodeLightField`, and the measuring is `measureGraph`
// (`src/world/levelMeasure.ts`). Every number it holds a graph to comes from `docs/design/metrics.json` `rules`.
//   node scripts/level-measure.mjs <graph.json> [more.json ...] [--write] [--check] [--doors shut]
//                                  [--map <id>] [--metrics <file>] [--points <out.json>] [--flags <key>=<v>[,<v>]]...
//   (npm run level-measure -- <graph.json> ...)
//   (none)         print a declared / measured table per space, split and link; change nothing.
//   --write        write `measured` on every measured space and link and `meta.measured` (with `ways_back` on a campaign
//                  graph) back into the graph files (numbers to 2 decimals, stable key order; the rest of a file is left
//                  byte-identical: only the `measured` members are replaced or appended). The files of one map are merged
//                  (`mergeGraphs`, file order), measured once, and each file gets only its own spaces and links.
//   --check        exit 1 when a measured value crosses a target (on encounter spaces: shadow band, vantage minimum,
//                  LOS-break maximum; on splits: partner reach maximum) or has drifted from the stored `measured` by more
//                  than 0.05 (fractions) / 1.5 s (seconds), or the measure step reported an ERR. A space with no stored `measured` is noted, not failed (`level-validate.mjs
//                  --require-measured` is the presence gate).
//   --doors shut   bake the light with every door shut (default: open, as the nav grid has no door bodies). The numbers
//                  are the shut-door ones: use it to see whether a space that fails open passes shut; `--write` stores them.
//   --points <f>   write `resolvePoints` for the merged graphs (validator-port PLAN section 8: per space and per merged
//                  link index) to <f>; touches no graph file; combines with --check, not with --write; one map only.
//   --flags k=v    set a key of `flags` (src/core/flags.ts) before the map builds, typed by the key's current type
//                  (boolean, number, or a comma list of numbers: --flags k=1,2,3); repeatable; an unknown key exits 2.
//   --map <id>     measure on this map of `MAPS` instead of the graph's `meta.map` (a graph whose map is not built yet).
//   --metrics <f>  the metrics file (default docs/design/metrics.json).
// A space with no `area` is "no area (skipped)". Several files that share a map build and bake it once. Exit codes: 0
// ok, 1 a --check failure, 2 bad usage / unreadable file / unknown map. The Vite server is closed on exit, also on error.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import { mergeGraphs } from './level-validate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Tooling tolerances, not level numbers: a stored value this far from a re-measure has drifted (`--check`); fractions
 *  and seconds as the campus drift test. */
const DRIFT_FRAC = 0.05;
const DRIFT_S = 1.5;
/** V6-PLAN "Area mapping": a space with fewer floor cells than this is a wrong area, an ERR line in the report. */
const MIN_CELLS = 20;
const EPS = 1e-9;
const USAGE = 'usage: node scripts/level-measure.mjs <graph.json> [more.json ...] [--write] [--check] [--doors shut] [--map <id>] [--metrics <file>] [--points <out.json>] [--flags <key>=<value>[,<value>]]...';
const log = (s) => process.stderr.write(s + '\n');
const out = (s) => process.stdout.write(s + '\n');

// ---- args --------------------------------------------------------------------------------------------------------

export function parseArgs(argv) {
  const o = { files: [], write: false, check: false, doors: 'open', map: null, metrics: resolve(root, 'docs/design/metrics.json'), points: null, flags: [] };
  const val = (a, i, name) => {
    const eq = a.indexOf('=');
    if (eq >= 0) return [a.slice(eq + 1), i];
    if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) throw new Error(`${name} needs a value`);
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
    } else if (a === '--points' || a.startsWith('--points=')) {
      let v;
      [v, i] = val(a, i, '--points');
      o.points = resolve(v);
    } else if (a === '--flags' || a.startsWith('--flags=')) {
      let v;
      [v, i] = val(a, i, '--flags');
      const eq = v.indexOf('=');
      if (eq < 1 || eq === v.length - 1) throw new Error(`--flags takes <key>=<value>[,<value>], not '${v}'`);
      o.flags.push({ key: v.slice(0, eq), values: v.slice(eq + 1).split(',') });
    } else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else o.files.push(resolve(a));
  }
  if (!o.files.length) throw new Error('no graph file given');
  if (o.points && o.write) throw new Error('--points writes no graph file: it combines with --check, not with --write');
  return o;
}

/** The text of one --flags value for a key whose current value is `cur` (boolean, number, number list), else an error. */
function flagValue(key, cur, values) {
  const num = (s) => {
    const n = s.trim() === '' ? NaN : Number(s);
    if (!Number.isFinite(n)) throw new Error(`--flags ${key}: '${s}' is not a number`);
    return n;
  };
  if (typeof cur === 'boolean') {
    if (values.length !== 1 || !['1', 'true', 'on', '0', 'false', 'off'].includes(values[0])) throw new Error(`--flags ${key}: takes 1/0, true/false or on/off, not '${values.join(',')}'`);
    return ['1', 'true', 'on'].includes(values[0]);
  }
  if (typeof cur === 'number') {
    if (values.length !== 1) throw new Error(`--flags ${key}: takes one number, not '${values.join(',')}'`);
    return num(values[0]);
  }
  if (Array.isArray(cur)) return values.map(num);
  if (typeof cur === 'string') return values.join(',');
  // null: no type to follow; a lone number or true/false is read as such, a list as numbers, anything else as text
  if (cur === null && values.length === 1 && ['true', 'false'].includes(values[0])) return values[0] === 'true';
  if (cur === null && values.every((s) => s.trim() !== '' && Number.isFinite(Number(s)))) return values.length === 1 ? Number(values[0]) : values.map(Number);
  if (cur === null) return values.join(',');
  throw new Error(`--flags ${key}: cannot be set from the command line (it holds an object)`);
}

/** Set each `{ key, values }` of --flags on `target` (the `flags` object) by the key's current type; returns [key, value]
 *  pairs. An unknown key throws (exit 2): a made-up key is never added. */
export function applyFlags(target, specs) {
  const done = [];
  for (const { key, values } of specs) {
    if (!Object.prototype.hasOwnProperty.call(target, key)) throw new Error(`--flags: unknown key '${key}' (not in src/core/flags.ts)`);
    const v = flagValue(key, target[key], values);
    target[key] = v;
    done.push([key, v]);
  }
  return done;
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
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function fmt(value, indent) {
  if (Array.isArray(value) && value.some(isObj)) {
    const pad = ' '.repeat(indent + 2);
    return '[\n' + value.map((v) => pad + fmt(v, indent + 2)).join(',\n') + '\n' + ' '.repeat(indent) + ']';
  }
  if (Array.isArray(value)) return `[${value.map((v) => JSON.stringify(r2(v))).join(', ')}]`;
  if (value === null || typeof value !== 'object') return JSON.stringify(r2(value));
  const entries = Object.entries(value);
  if (!entries.length) return '{}';
  const flat = entries.every(([, v]) => !isObj(v) && !(Array.isArray(v) && v.some(isObj)));
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
export function patchGraph(text, edits) {
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

/** The files of one map as one merged graph (`mergeGraphs`, validator file order); each file gets `spaceOff` / `linkOff`,
 *  where it starts in the merged `spaces` / `links`. */
export function mergeMap(files) {
  const merged = mergeGraphs(files.map((f) => f.graph));
  let spaceOff = 0;
  let linkOff = 0;
  for (const f of files) {
    f.spaceOff = spaceOff;
    f.linkOff = linkOff;
    spaceOff += f.graph.spaces.length;
    linkOff += f.graph.links.length;
  }
  return merged;
}

/** The file (index into `files`) that owns merged space / link `i` (`key` 'spaceOff' or 'linkOff'). */
const ownerOf = (files, key, i) => {
  let o = 0;
  files.forEach((f, n) => {
    if (i >= f[key]) o = n;
  });
  return o;
};

const SPLIT_TAG = /^split:(.+):(a|b)$/;
const splitIdsOf = (graph) => new Set(graph.spaces.flatMap((s) => (s.tags ?? []).map((t) => SPLIT_TAG.exec(t)?.[1]).filter(Boolean)));

/** Measure one map's merged graph once; returns what to print and check, and each file's own write-back text. */
function measureMap(files, merged, ctx, mod, rules) {
  const { built } = ctx;
  const res = mod.measureGraph(merged, {
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
  const relOf = files.map((f) => relative(root, f.file).replace(/\\/g, '/'));
  const spaceRel = (i) => relOf[ownerOf(files, 'spaceOff', i)];
  const linkRel = (k) => relOf[ownerOf(files, 'linkOff', k)];
  const edits = files.map(() => []);

  // spaces
  const spaceRows = [];
  let unstored = 0;
  merged.spaces.forEach((s, i) => {
    const rel = spaceRel(i);
    const m = res.spaces[s.id];
    if (!m) {
      spaceRows.push([s.id, s.type ?? '', s.area === undefined ? 'no area (skipped)' : 'not measured (see ERR)', '', '', '', '']);
      return;
    }
    const bad = [];
    // the targets are encounter rules (graph-schema): other spaces are measured and drift-checked, never failed
    const target = s.type === 'encounter';
    if (target && m.shadow_pct !== null && (m.shadow_pct < lim.shadowMin - EPS || m.shadow_pct > lim.shadowMax + EPS)) bad.push(`shadow_pct ${f2(m.shadow_pct)} outside ${f2(lim.shadowMin)}-${f2(lim.shadowMax)}`);
    if (target && m.sees_pct !== null && m.sees_pct < lim.sees - EPS) bad.push(`sees_pct ${f2(m.sees_pct)} below ${f2(lim.sees)}`);
    if (target && m.los_break_s !== null && m.los_break_s > lim.los + EPS) bad.push(`los_break_s ${f2(m.los_break_s)} above ${f2(lim.los)}`);
    for (const b of bad) fails.push(`${rel}: ${s.id}: ${b}`);
    if (m.cells > 0 && m.cells < MIN_CELLS) errors.push(`ERR ${s.id}: only ${m.cells} floor cells (< ${MIN_CELLS}): is the area right?`);
    const st = s.measured;
    if (st && typeof st === 'object') {
      for (const k of ['shadow_pct', 'sees_pct']) driftOf(drifts, `${rel}: ${s.id}: ${k}`, st[k], m[k], DRIFT_FRAC);
      driftOf(drifts, `${rel}: ${s.id}: los_break_s`, st.los_break_s, m.los_break_s, DRIFT_S);
      if (typeof st.geom === 'string' && st.geom !== m.geom) notes.push(`${rel}: ${s.id}: stored geom ${st.geom} is stale (now ${m.geom})`);
    } else if (m.cells > 0) unstored++;
    spaceRows.push([s.id, s.type ?? '', m.cells, pair(s.shadow_pct, m.shadow_pct), pair(s.vantage?.sees_pct, m.sees_pct), pair(s.los_break_s, m.los_break_s), m.cells === 0 ? 'no floor' : bad.length ? `FAIL ${bad.length}` : 'ok']);
    if (m.cells > 0) {
      const n = ownerOf(files, 'spaceOff', i);
      edits[n].push({ kind: 'spaces', index: i - files[n].spaceOff, value: { shadow_pct: m.shadow_pct, sees_pct: m.sees_pct, vantage_at: m.vantage_at, los_break_s: m.los_break_s, cells: m.cells, geom: m.geom } });
    }
  });

  // splits (a split is reported against the first file that holds one of its leg spaces)
  const splitRows = [];
  const storedSplits = Object.assign({}, ...files.map((f) => f.graph.meta.measured?.splits ?? {}));
  for (const [id, sp] of Object.entries(res.meta.splits)) {
    const bad = [];
    if (sp.reach_s !== null && sp.reach_s > lim.reach + EPS) bad.push(`reach_s ${f2(sp.reach_s)} above ${f2(lim.reach)}`);
    const rel = relOf[Math.max(0, files.findIndex((f) => splitIdsOf(f.graph).has(id)))];
    for (const k of ['a_s', 'b_s']) if (sp[k] !== null && sp[k] > lim.split + EPS) notes.push(`${rel}: split ${id}: ${k} ${f2(sp[k])} above ${f2(lim.split)} (the validator's leg limit)`);
    for (const b of bad) fails.push(`${rel}: split ${id}: ${b}`);
    const st = storedSplits[id];
    if (st && typeof st === 'object') for (const k of ['a_s', 'b_s', 'reach_s']) driftOf(drifts, `${rel}: split ${id}: ${k}`, st[k], sp[k], DRIFT_S);
    splitRows.push([id, f2(sp.a_s), f2(sp.b_s), pair(lim.reach, sp.reach_s), bad.length ? 'FAIL' : 'ok']);
  }

  // links (both ends with an area), by merged index: a link between two section files is measured against both
  const linkRows = [];
  let skippedLinks = 0;
  const hasArea = new Set(merged.spaces.filter((s) => s.area !== undefined).map((s) => s.id));
  merged.links.forEach((l, k) => {
    if (!hasArea.has(l.from) || !hasArea.has(l.to)) {
      skippedLinks++;
      return;
    }
    const lm = res.links[k];
    if (l.measured && typeof l.measured === 'object') driftOf(drifts, `${linkRel(k)}: link ${l.from} -> ${l.to} (${l.kind})`, l.measured.time_s, lm.time_s, DRIFT_S);
    linkRows.push([`${l.from} -> ${l.to}`, l.kind, pair(l.time_s, lm.time_s), pair(l.length, lm.path_m), lm.time_s === null ? lm.why : '']);
    const n = ownerOf(files, 'linkOff', k);
    edits[n].push({ kind: 'links', index: k - files[n].linkOff, value: lm.time_s === null ? { time_s: null, why: lm.why } : { time_s: lm.time_s, path_m: lm.path_m } });
  });

  // way backs (campaign): one per co-op link in merged order, stored in the file that owns the link
  const waysBack = files.map(() => []);
  let wk = 0;
  for (const w of res.meta.ways_back ?? []) {
    const same = (l) => l.from === w.from && l.to === w.to && l.kind === w.kind;
    while (wk < merged.links.length && !same(merged.links[wk])) wk++;
    if (wk < merged.links.length) waysBack[ownerOf(files, 'linkOff', wk++)].push(w);
  }

  const measuredAny = Object.keys(res.spaces).length > 0;
  if (measuredAny) {
    files.forEach((f, n) => {
      const mine = splitIdsOf(f.graph);
      const splits = Object.fromEntries(Object.entries(res.meta.splits).filter(([id]) => mine.has(id)));
      const value = { tool: res.meta.tool, date: res.meta.date, geom: res.meta.geom, splits };
      if (res.meta.ways_back) value.ways_back = waysBack[n];
      edits[n].push({ kind: 'meta', value });
    });
  } else edits.forEach((e) => (e.length = 0));

  const o = [];
  o.push(`== ${relOf.join(', ')}  (map ${built.map.id}, doors ${ctx.doors}${ctx.mapOverride ? `, --map ${ctx.mapOverride}` : ''})  geom ${res.meta.geom}`);
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
  if (res.meta.ways_back?.length) {
    o.push('', 'ways back (co-op link: back s over the solo nav)');
    o.push(table(['link', 'kind', 'back s', 'path m', 'why not measured'], res.meta.ways_back.map((w) => [`${w.from} -> ${w.to}`, w.kind, f2(w.back_s), f2(w.path_m), w.back_s === null ? w.why : ''])));
  }
  for (const e of errors) o.push(e);
  for (const n of notes) o.push(`note: ${n}`);
  if (unstored) o.push(`note: ${unstored} measured space(s) have no stored measured (run with --write)`);

  const newTexts = files.map((f, n) => (edits[n].length ? patchGraph(f.text, edits[n]) : f.text));
  return { report: o.join('\n'), errors, fails, drifts, notes, newTexts, measured: measuredAny };
}

/** A stored value that is not within `tol` of the new one (null against a number counts). */
function driftOf(list, name, stored, now, tol) {
  if (stored === undefined) return;
  const a = typeof stored === 'number' ? stored : null;
  const b = typeof now === 'number' ? now : null;
  if (a === null && b === null) return;
  if (a === null || b === null || Math.abs(a - b) > tol + EPS) list.push(`${name} stored ${f2(a)} now ${f2(b)} (> ${tol})`);
}

export async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
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
  // files grouped by map (first-seen order): the files of one map are merged and measured once
  const groups = new Map();
  for (const file of args.files) {
    try {
      const text = readFileSync(file, 'utf8');
      const graph = JSON.parse(text);
      if (!graph || !Array.isArray(graph.spaces) || !Array.isArray(graph.links) || typeof graph.meta?.map !== 'string') throw new Error('not a level graph (needs meta.map, spaces, links)');
      const id = args.map ?? graph.meta.map;
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push({ file, text, graph });
    } catch (e) {
      log(`level-measure: ${relative(root, file)}: ${e.message}`);
      return 2;
    }
  }
  if (args.points && groups.size > 1) {
    log(`level-measure: --points takes the files of one map, not ${groups.size} (${[...groups.keys()].join(', ')})\n${USAGE}`);
    return 2;
  }

  const server = await createServer({ root, configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const load = (p) => server.ssrLoadModule(p);
    // --flags: set before anything else loads, so the map builds with them (one module instance per server)
    if (args.flags.length) {
      const { flags } = await load('/src/core/flags.ts');
      for (const [k, v] of applyFlags(flags, args.flags)) log(`flags: ${k} = ${JSON.stringify(v)}`);
    }
    const { LevelBuilder } = await load('/src/world/levelBuilder.ts');
    const { MAPS } = await load('/src/world/maps/index.ts');
    const { SightWorld } = await load('/src/game/sectorCheck.ts');
    const { runtimeNav } = await load('/tests/helpers/runtimeNav.ts');
    const mod = await load('/src/world/levelMeasure.ts');
    const measuring = !args.points || args.check;

    /** One build, nav and sight world for a map; the light is baked on first use (`--points` alone never needs it). */
    const prepare = (id) => {
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
      let field = null;
      return {
        map,
        b,
        nav,
        get field() {
          if (!field) {
            const t0 = Date.now();
            field = mod.nodeLightField(b, map, { doors: args.doors });
            log(`${id}: light baked, doors ${args.doors} (${Date.now() - t0} ms)`);
          }
          return field;
        },
        sight: new SightWorld(b.boxes, b.cylinders),
        guards: (map.sectors ?? []).flatMap((s) => s.guards).map((g) => ({ x: g.x, z: g.z, y: g.y, route: g.route })),
        rooms: layout.rooms ?? [],
      };
    };

    let failed = 0;
    for (const [id, files] of groups) {
      const t = Date.now();
      const merged = mergeMap(files);
      const names = files.map((f) => relative(root, f.file)).join(', ');
      if (!args.points && !merged.spaces.some((s) => s.area !== undefined)) {
        // nothing to measure: no build, nav or bake (the map must still exist)
        if (!MAPS.some((m) => m.id === id)) throw new Error(`map '${id}' is not in MAPS (${MAPS.map((m) => m.id).join(', ')}); use --map <id> to measure on another`);
        out(`== ${names}  (map ${id})`);
        out(`no space has an area: all ${merged.spaces.length} spaces skipped, nothing built or baked`);
        for (const s of merged.spaces) out(`  ${s.id}  ${s.type ?? ''}  no area (skipped)`);
        if (args.write) out(`not written: no space of ${names} has an area`);
        out('');
        continue;
      }
      const built = prepare(id);
      if (args.points) {
        const pts = mod.resolvePoints(merged, built.nav, { builder: built.b, rooms: built.rooms, map: built.map });
        writeFileSync(args.points, `${JSON.stringify(pts, null, 2)}\n`);
        out(`wrote ${relative(root, args.points)}: ${pts.spaces.length} spaces, ${pts.links.length} links, geom ${pts.geom}`);
        for (const e of pts.errors) out(e);
        if (!measuring) {
          out('');
          continue;
        }
      }
      const r = measureMap(files, merged, { built, metrics, doors: args.doors, mapOverride: args.map }, mod, rules);
      log(`${names}: measured (${Date.now() - t} ms)`);
      out(r.report);
      if (args.write) {
        files.forEach((f, n) => {
          const rel = relative(root, f.file);
          if (!r.measured) out(`not written: no space of ${rel} has an area`);
          else if (r.newTexts[n] !== f.text) {
            writeFileSync(f.file, r.newTexts[n]);
            out(`wrote ${rel}`);
          } else out(`unchanged ${rel}`);
        });
      }
      if (args.check) {
        for (const f of r.fails) out(`FAIL ${f}`);
        for (const d of r.drifts) out(`DRIFT ${d}`);
        const rels = files.map((f) => relative(root, f.file).replace(/\\/g, '/')).join(', ');
        for (const e of r.errors) out(`FAIL ${rels}: ${e}`);
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main();
