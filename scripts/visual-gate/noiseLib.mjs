// visual-gate VG7: the pure noise / proof library (docs/visual-gate/briefs/VG7.md, PLAN sections 2, 4, 5; BRIEF A13,
// A24, A30). Imports only metrics.mjs and gate.mjs: no node:, no fs, no git. noise.mjs reads the result.json files and
// writes tolerances.mjs; this module turns parsed runs into the run-to-run spread, the per-key tolerances (4 sd, above
// the floors), the same-build self-compare, the noisy findings for VG8, the tolerances.mjs text and the proof rows.
import { FLOORS, compare, emd } from './metrics.mjs';
import { MIN_REGION_PX, tolFor, stripThin } from './gate.mjs';

/** @typedef {import('./metrics.mjs').ShotMetrics} ShotMetrics */
/** @typedef {import('./metrics.mjs').RegionMetrics} RegionMetrics */
/** @typedef {import('./metrics.mjs').Flag} Flag */
/** @typedef {import('./metrics.mjs').Tolerances} Tolerances */
/** @typedef {import('./gate.mjs').ShotRecord} ShotRecord */
/** @typedef {import('./gate.mjs').ParityRow} ParityRow */
/**
 * A parsed result.json (VG5 shape: the RunRecord fields + summary, warnings, runErrors, notRun, ...).
 * @typedef {{ sha: string, version: string, renderer: string, shots: ShotRecord[], rigs: ShotRecord[],
 *   parity: ParityRow[], summary?: Record<string, any>, notRun?: string[], runErrors?: string[] }} Run
 */
/** @typedef {{ n: number, mean: number, sd: number, min: number, max: number }} Cell */
/**
 * @typedef {{ n: number, keys: Record<string, Record<string, Cell>>, emd: Record<string, Record<string, number>>,
 *   parity: Record<string, Cell & { what: 'card-luma' | 'meter-d' }>, missing: string[] }} Spread
 */
/** @typedef {{ key: string, metric: string, bad: 'high' | 'low', note?: string }} ProofTarget */
/**
 * @typedef {{ key: string, metric: string, bad: number | null, fixed: number | null, delta: number | null,
 *   sd: number | null, sep: number | null, dirOk: boolean | null, separates: boolean | null, mid: number | null,
 *   drift: boolean | null, rule: string | null, ruleBad: 'red' | 'green' | null, ruleFixed: 'red' | 'green' | null,
 *   note: string | null }} ProofRow
 */

/** The per-region numbers whose run-to-run spread is measured. */
export const STATS = Object.freeze(['mean', 'p5', 'p50', 'p95', 'nearBlack', 'veil', 'contrast', 'blotch', 'arc']);
/** Tolerance = K_SIGMA x the sd (A13, A24). */
export const K_SIGMA = 4;
/** The rig leak rules (VG3, viewpoints RIGS) and the parity pads noisy() compares 4 sd with. */
const LEAK_RULES = Object.freeze({ mean: 0.004, p95: 0.02 });
const PARITY_NOISE = 0.02;
/** Ratio fields: the floor and the value are compared as `x - 1`. */
const RATIO_FIELDS = new Set(['blotchRatio', 'arcRatio']);
/** The field order inside one TOLERANCES entry. */
const FIELDS = Object.keys(FLOORS);

/**
 * Sample standard deviation (n - 1); 0 for fewer than 2 values.
 * @param {number[]} xs
 */
export function sd(xs) {
  const n = xs.length;
  if (n < 2) return 0;
  // shifted by the first value: equal values give exactly 0 (no float residue from the mean)
  const x0 = /** @type {number} */ (xs[0]);
  let s = 0;
  for (const x of xs) s += x - x0;
  const m = s / n;
  let q = 0;
  for (const x of xs) q += (x - x0 - m) * (x - x0 - m);
  return Math.sqrt(q / (n - 1));
}

/** @param {number[]} xs @returns {Cell} */
function cell(xs) {
  let s = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const x of xs) {
    s += x;
    if (x < min) min = x;
    if (x > max) max = x;
  }
  return { n: xs.length, mean: xs.length ? s / xs.length : 0, sd: sd(xs), min, max };
}

/** @param {unknown} v @returns {v is number} */
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Shots and rig shots of a run, by key. @param {Run} run @returns {Map<string, ShotRecord>} */
function recordsOf(run) {
  /** @type {Map<string, ShotRecord>} */
  const out = new Map();
  for (const r of [...(run?.shots ?? []), ...(run?.rigs ?? [])]) if (r && typeof r.key === 'string') out.set(r.key, r);
  return out;
}

/** @param {Iterable<string>} xs */
const sorted = (xs) => [...new Set(xs)].sort();

/**
 * The run-to-run spread of a set of runs of one build (A24): per shot key the sd of every STATS field per region
 * (`whole` and the regions of >= MIN_REGION_PX px in every run), rig leak, the RMS pairwise emd per region / sqrt 2, and
 * the parity rows (card luma, meter - field). Anything not measured in every run is listed in `missing` with why.
 * @param {Run[]} runs
 * @returns {Spread}
 */
export function spreadOf(runs) {
  const recs = runs.map(recordsOf);
  /** @type {Spread} */
  const out = { n: runs.length, keys: {}, emd: {}, parity: {}, missing: [] };
  for (const key of sorted(recs.flatMap((m) => [...m.keys()]))) {
    /** @type {ShotMetrics[]} */
    const ms = [];
    let why = '';
    recs.forEach((m, i) => {
      if (why) return;
      const r = m.get(key);
      if (!r) why = `not in run ${i + 1}`;
      else if (r.error || !r.metrics) why = `error in run ${i + 1}: ${r.error ?? 'no metrics'}`;
      else ms.push(r.metrics);
    });
    if (why) {
      out.missing.push(`${key}: ${why}`);
      continue;
    }
    /** @type {Record<string, RegionMetrics[]>} */
    const regions = { whole: ms.map((m) => m.whole) };
    for (const name of sorted(ms.flatMap((m) => Object.keys(m.regions ?? {})))) {
      const rs = ms.map((m) => m.regions?.[name]);
      if (rs.every((r) => r && isNum(r.n) && r.n >= MIN_REGION_PX)) regions[name] = /** @type {RegionMetrics[]} */ (rs);
      else out.missing.push(`${key} ${name}: thin`);
    }
    /** @type {Record<string, Cell>} */
    const cells = {};
    /** @type {Record<string, number>} */
    const emds = {};
    for (const [name, rs] of Object.entries(regions)) {
      if (!rs.every(Boolean)) continue;
      for (const stat of STATS) {
        const xs = rs.map((r) => /** @type {Record<string, unknown>} */ (r)[stat]);
        if (xs.every(isNum)) cells[`${name}.${stat}`] = cell(/** @type {number[]} */ (xs));
      }
      const hs = rs.map((r) => r.hist);
      if (hs.every((h) => Array.isArray(h) && h.length === hs[0]?.length)) {
        let q = 0;
        let pairs = 0;
        for (let i = 0; i < hs.length; i++) {
          for (let j = i + 1; j < hs.length; j++) {
            const e = emd(/** @type {number[]} */ (hs[i]), /** @type {number[]} */ (hs[j]));
            q += e * e;
            pairs++;
          }
        }
        emds[name] = pairs ? Math.sqrt(q / pairs) / Math.SQRT2 : 0;
      }
    }
    for (const stat of ['mean', 'p95']) {
      const xs = ms.map((m) => /** @type {Record<string, unknown> | undefined} */ (m.leak)?.[stat]);
      if (xs.every(isNum)) cells[`leak.${stat}`] = cell(/** @type {number[]} */ (xs));
    }
    out.keys[key] = cells;
    out.emd[key] = emds;
  }
  /** @type {Map<string, ParityRow>[]} */
  const rows = runs.map((r) => new Map((r?.parity ?? []).map((p) => [p.id, p])));
  for (const id of sorted(rows.flatMap((m) => [...m.keys()]))) {
    /** @type {number[]} */
    const xs = [];
    /** @type {'card-luma' | 'meter-d' | null} */
    let what = null;
    let why = '';
    rows.forEach((m, i) => {
      if (why) return;
      const p = m.get(id);
      if (!p) { why = `not in run ${i + 1}`; return; }
      if (p.skip != null) { why = `skipped (${String(p.skip)}) in run ${i + 1}`; return; }
      if (p.kind === 'card' && isNum(p.luma)) { what = 'card-luma'; xs.push(p.luma); return; }
      if (p.kind === 'meter' && isNum(p.meter) && isNum(p.field)) { what = 'meter-d'; xs.push(p.meter - p.field); return; }
      why = `no value in run ${i + 1}`;
    });
    if (why || !what) out.missing.push(`${id}: ${why || 'no value'}`);
    else out.parity[id] = { ...cell(xs), what };
  }
  return out;
}

/** Rounded UP to 4 decimals (a 1e-6 slack in 1e-4 units absorbs float noise: 4 x 0.02 stays 0.08). @param {number} x */
const ceil4 = (x) => Math.ceil(x * 1e4 - 1e-6) / 1e4;
/** @param {number} x */
const round5 = (x) => Math.round(x * 1e5) / 1e5;

/**
 * The per-key tolerance overrides (A13, A24): per field k x the largest sd over the key's regions (ratio fields from
 * sd / run mean with guards), rounded up to 4 decimals, written only when strictly above the floor. Leak and parity never
 * make tolerances.
 * @param {Spread} spread
 * @param {Tolerances} [floors]
 * @param {number} [k]
 * @returns {Record<string, Partial<Tolerances>>}
 */
export function tolerancesFrom(spread, floors = FLOORS, k = K_SIGMA) {
  /** @type {Record<string, Partial<Tolerances>>} */
  const out = {};
  for (const key of Object.keys(spread?.keys ?? {}).sort()) {
    const cells = spread.keys[key] ?? {};
    /** @type {Set<string>} */
    const regions = new Set();
    for (const addr of Object.keys(cells)) {
      const dot = addr.lastIndexOf('.');
      if (dot > 0 && addr.slice(0, dot) !== 'leak') regions.add(addr.slice(0, dot));
    }
    /** max over regions of sd(metric); null when no region has it */
    const maxSd = (/** @type {string} */ metric) => {
      let best = null;
      for (const r of regions) {
        const c = cells[`${r}.${metric}`];
        if (c && (best === null || c.sd > best)) best = c.sd;
      }
      return best;
    };
    /** max over regions of sd / mean where mean >= guard */
    const maxRel = (/** @type {string} */ metric, /** @type {number} */ guard) => {
      let best = null;
      for (const r of regions) {
        const c = cells[`${r}.${metric}`];
        if (c && c.mean >= guard && (best === null || c.sd / c.mean > best)) best = c.sd / c.mean;
      }
      return best;
    };
    let maxEmd = null;
    for (const [r, e] of Object.entries(spread.emd?.[key] ?? {})) if (r !== 'leak' && (maxEmd === null || e > maxEmd)) maxEmd = e;
    /** @type {Record<string, number | null>} */
    const raw = {
      meanAbs: nk(maxSd('mean'), k),
      meanRel: nk(maxRel('mean', 0.05), k),
      nearBlack: nk(maxSd('nearBlack'), k),
      emd: nk(maxEmd, k),
      veil: nk(maxSd('veil'), k),
      contrastDrop: (() => { const v = nk(maxRel('contrast', 0.05), k); return v === null ? null : Math.min(0.9, v); })(),
      blotchRatio: (() => { const v = nk(maxRel('blotch', 0.01), k); return v === null ? null : 1 + v; })(),
      blotchAbs: nk(maxSd('blotch'), k),
      arcRatio: (() => { const v = nk(maxRel('arc', 0.002), k); return v === null ? null : 1 + v; })(),
      arcAbs: nk(maxSd('arc'), k),
    };
    /** @type {Record<string, number>} */
    const fields = {};
    for (const f of FIELDS) {
      const v = raw[f];
      if (v === null || v === undefined || !Number.isFinite(v)) continue;
      const r = ceil4(v);
      if (r > /** @type {Record<string, number>} */ (floors)[f]) fields[f] = r;
    }
    if (Object.keys(fields).length) out[key] = /** @type {Partial<Tolerances>} */ (fields);
  }
  return out;
}

/** @param {number | null} x @param {number} k */
function nk(x, k) {
  return x === null ? null : k * x;
}

/**
 * Same-build false flags: every ordered pair i != j of runs and every key measured in both, compared with the floors
 * alone and with the floors raised by `tolerances` (VG7's 4-sigma guarantee: the second list should be empty).
 * @param {Run[]} runs
 * @param {Record<string, Partial<Tolerances>>} tolerances
 * @returns {{ pairs: number, floors: Flag[], tol: Flag[] }}
 */
export function selfCompare(runs, tolerances) {
  const recs = runs.map(recordsOf);
  /** @type {Flag[]} */
  const floors = [];
  /** @type {Flag[]} */
  const tol = [];
  let pairs = 0;
  for (let i = 0; i < recs.length; i++) {
    for (let j = 0; j < recs.length; j++) {
      if (i === j) continue;
      pairs++;
      const a = /** @type {Map<string, ShotRecord>} */ (recs[i]);
      const b = /** @type {Map<string, ShotRecord>} */ (recs[j]);
      for (const key of [...a.keys()].sort()) {
        const ra = a.get(key);
        const rb = b.get(key);
        if (!ra?.metrics || !rb?.metrics || ra.error || rb.error) continue;
        const base = stripThin(ra.metrics);
        const cur = stripThin(rb.metrics);
        floors.push(...compare(key, base, cur, tolFor(key, {})));
        tol.push(...compare(key, base, cur, tolFor(key, tolerances ?? {})));
      }
    }
  }
  return { pairs, floors, tol };
}

/** @param {number} x */
const f4 = (x) => x.toFixed(4);

/**
 * Findings for VG8 (not errors): every written tolerance field over 2 x its floor (ratio fields compare `value - 1`
 * with `floor - 1`), every rig leak whose 4 sd is over its rule, every parity row whose 4 sd is over 0.02.
 * @param {Spread} spread
 * @param {Record<string, Partial<Tolerances>>} tolerances
 * @param {Tolerances} [floors]
 * @returns {string[]}
 */
export function noisy(spread, tolerances, floors = FLOORS) {
  /** @type {string[]} */
  const out = [];
  for (const key of Object.keys(tolerances ?? {}).sort()) {
    const t = /** @type {Record<string, number>} */ (tolerances[key] ?? {});
    for (const f of FIELDS) {
      const v = t[f];
      if (!isNum(v)) continue;
      const fl = /** @type {Record<string, number>} */ (floors)[f] ?? 0;
      const ratio = RATIO_FIELDS.has(f) ? (v - 1) / (fl - 1) : v / fl;
      if (ratio > 2) out.push(`${key} ${f} ${v} (floor ${fl}, x${ratio.toFixed(1)})`);
    }
  }
  for (const key of Object.keys(spread?.keys ?? {}).sort()) {
    for (const [stat, rule] of Object.entries(LEAK_RULES)) {
      const c = spread.keys[key]?.[`leak.${stat}`];
      if (c && K_SIGMA * c.sd > rule) out.push(`${key} leak.${stat} 4sd ${f4(K_SIGMA * c.sd)} > rule ${rule}`);
    }
  }
  for (const id of Object.keys(spread?.parity ?? {}).sort()) {
    const p = spread.parity[id];
    if (!p || !(K_SIGMA * p.sd > PARITY_NOISE)) continue;
    out.push(`${id} 4sd ${f4(K_SIGMA * p.sd)} > ${PARITY_NOISE} (${p.what === 'card-luma' ? 'A15 pad' : 'METER_TOL'})`);
  }
  return out;
}

/** A single-quoted JS string literal. @param {string} s */
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

/**
 * The whole `scripts/visual-gate/tolerances.mjs` text (deterministic: keys sorted, numbers as written). SPREAD keeps
 * every sd (5 decimals), not only the noisy ones: VG8 reads it for its 4-sigma test.
 * @param {{ spread: Spread, tolerances: Record<string, Partial<Tolerances>>,
 *   source: { sha: string, version: string, renderer: string, runs: number, at: string } }} o
 * @returns {string}
 */
export function renderTolerances({ spread, tolerances, source }) {
  const sha = String(source?.sha ?? '');
  const L = [
    '// GENERATED by `node scripts/visual-gate/noise.mjs spread` (visual-gate VG7): regenerate, never hand-edit.',
    `// From shots/visual-gate-vg7/${sha.slice(0, 8)}/run1..${source?.runs ?? 3} (master ${sha}, ${source?.version ?? ''}), ${source?.at ?? ''}.`,
    `// Renderer: ${String(source?.renderer ?? '').replace(/\n/g, ' ')}.`,
    `// Rule (BRIEF A13, A24): each field = ${K_SIGMA} x the largest run-to-run sd over the key's regions (ratio fields from sd /`,
    '// run mean with guards), rounded up to 4 decimals, written only above its FLOORS value (gate.mjs tolFor keeps',
    '// max(floor, value)). VG8 reads SPREAD for its 4-sigma test.',
    '',
    `export const SOURCE = { sha: ${q(sha)}, version: ${q(source?.version ?? '')}, renderer: ${q(source?.renderer ?? '')}, runs: ${Number(source?.runs ?? 0)}, at: ${q(source?.at ?? '')} };`,
    '',
    'export const TOLERANCES = {',
  ];
  for (const key of Object.keys(tolerances ?? {}).sort()) {
    const t = /** @type {Record<string, number>} */ (tolerances[key] ?? {});
    const parts = FIELDS.filter((f) => isNum(t[f])).map((f) => `${f}: ${t[f]}`);
    if (parts.length) L.push(`  ${q(key)}: { ${parts.join(', ')} },`);
  }
  L.push('};', '', 'export const SPREAD = {', '  keys: {');
  for (const key of Object.keys(spread?.keys ?? {}).sort()) {
    const cells = spread.keys[key] ?? {};
    const parts = Object.keys(cells).sort().map((a) => `${q(a)}: ${round5(/** @type {Cell} */ (cells[a]).sd)}`);
    L.push(`    ${q(key)}: { ${parts.join(', ')} },`);
  }
  L.push('  },', '  emd: {');
  for (const key of Object.keys(spread?.emd ?? {}).sort()) {
    const e = spread.emd[key] ?? {};
    const parts = Object.keys(e).sort().map((r) => `${q(r)}: ${round5(/** @type {number} */ (e[r]))}`);
    L.push(`    ${q(key)}: { ${parts.join(', ')} },`);
  }
  L.push('  },', '  parity: {');
  for (const id of Object.keys(spread?.parity ?? {}).sort()) {
    L.push(`    ${q(id)}: ${round5(/** @type {Cell} */ (spread.parity[id]).sd)},`);
  }
  L.push('  },', '};', '');
  return L.join('\n');
}

/** @param {string[]} keys @param {string} metric @param {'high' | 'low'} bad @param {string} [note] @returns {ProofTarget[]} */
const tg = (keys, metric, bad, note) => keys.map((key) => (note ? { key, metric, bad, note } : { key, metric, bad }));
/** @param {string[]} keys @param {[string, 'high' | 'low'][]} ms @param {string} [note] @returns {ProofTarget[]} */
const many = (keys, ms, note) => keys.flatMap((key) => ms.flatMap(([m, b]) => tg([key], m, b, note)));

/**
 * The proof targets per finding (PLAN section 2): `bad` = the side the bad build sits on. A key with `*` (F6's `m-*`) is
 * expanded against the viewpoint items at call time (`expandTargets`), never a literal view list.
 * @type {Readonly<Record<string, readonly ProofTarget[]>>}
 */
export const PROOF_TARGETS = Object.freeze({
  F1: many(['so-s1-goods-in@epic', 'so-s1-girder@epic'], [['upper.veil', 'high'], ['upper.contrast', 'low'], ['whole.mean', 'high']]),
  F2: many(['so-s1-goods-in@epic', 'so-s1-goods-in@low'], [['floor.nearBlack', 'high'], ['floor.mean', 'low']]),
  F4: many(['so-s1-workshop@epic', 'so-s1-workshop@low'], [['wall.arc', 'high']]),
  F5: many(['so-door-on@low', 'so-door-on@epic', 'cp-door-on@low', 'cp-door-on@epic'], [['leak.mean', 'high'], ['leak.p95', 'high']]),
  F5b: [
    ...many(['so-corner-on@epic', 'so-corner-on@low'], [['leak.mean', 'high'], ['leak.p95', 'high']]),
    ...many(['so-door-on@epic', 'so-door-on@low'], [['leak.mean', 'high'], ['leak.p95', 'high']], 'control: expected green'),
  ],
  F6: many(['m-*@epic', 'm-*@low'], [['whole.mean', 'low'], ['whole.nearBlack', 'high']]),
  F7: [
    ...many(['m-a3-lobby@low'], [['wall.blotch', 'high'], ['wall.arc', 'high']]),
    ...many(['m-a3-lobby@epic'], [['wall.blotch', 'high'], ['wall.arc', 'high']], 'reference'),
  ],
  F8: many(['cp-s2-b@epic', 'cp-s2-d@epic', 'cp-s3-a@epic'], [['upper.veil', 'high'], ['upper.contrast', 'low'], ['whole.mean', 'high']]),
});

/** @param {Record<string, any> | any[] | undefined} items @returns {any[]} */
const itemList = (items) => (Array.isArray(items) ? items : Object.values(items ?? {}));

/** Views only (a rig has `door` / `guard`). @param {any} it */
const isView = (it) => it && !('guard' in it);

/**
 * The targets of `fn` with every `<prefix>*@<preset>` key expanded to the matching view ids (sorted), in target order.
 * @param {string} fn
 * @param {Record<string, any> | any[]} items viewpoints VIEWS + RIGS (array or record by id)
 * @returns {ProofTarget[]}
 */
export function expandTargets(fn, items) {
  const list = PROOF_TARGETS[fn];
  if (!list) throw new Error(`unknown proof target ${fn} (one of ${Object.keys(PROOF_TARGETS).join(', ')})`);
  const views = itemList(items).filter(isView).map((i) => String(i.id)).sort();
  /** @type {ProofTarget[]} */
  const out = [];
  for (const t of list) {
    const star = t.key.indexOf('*');
    if (star < 0) { out.push({ ...t }); continue; }
    const prefix = t.key.slice(0, star);
    const preset = t.key.slice(t.key.lastIndexOf('@'));
    for (const id of views) if (id.startsWith(prefix)) out.push({ ...t, key: `${id}${preset}` });
  }
  return out;
}

/** The item id of a shot key (`<id>@<preset>`, a rig `<id>-on@<preset>`). @param {string} key */
export function idOfKey(key) {
  const at = key.lastIndexOf('@');
  return (at >= 0 ? key.slice(0, at) : key).replace(/-(on|off)$/, '');
}

/** @param {ShotMetrics} m @param {string} region @param {string} metric @returns {number | null} */
function valueAt(m, region, metric) {
  /** @type {Record<string, unknown> | undefined} */
  const src = region === 'whole' ? m.whole : region === 'leak' ? m.leak : m.regions?.[region];
  const v = src?.[metric];
  return isNum(v) ? v : null;
}

/**
 * One side's value and, when missing, why.
 * @param {Run | null} run @param {string} key @param {string} region @param {string} metric
 * @returns {{ v: number | null, rec: ShotRecord | null, why: string | null }}
 */
function readSide(run, key, region, metric) {
  const rec = recordsOf(/** @type {Run} */ (run)).get(key) ?? null;
  if (!rec) return { v: null, rec: null, why: 'not in run' };
  if (rec.error || !rec.metrics) return { v: null, rec, why: `error: ${rec.error ?? 'no metrics'}` };
  const v = valueAt(rec.metrics, region, metric);
  if (v !== null) return { v, rec, why: null };
  const skip = (rec.skips ?? []).find((s) => s.region === region && (metric === 'blotch' || s.why !== 'blotch-small'));
  if (skip) return { v: null, rec, why: `region skipped: ${skip.why}` };
  return { v: null, rec, why: region === 'leak' || region === 'whole' || rec.metrics.regions?.[region] ? `no ${region}.${metric}` : 'not in run' };
}

/** @param {any} item @param {string} metric @param {string} preset */
function ruleOf(item, metric, preset) {
  const r = item?.rules?.[metric];
  if (!r || (r.min == null && r.max == null)) return null;
  if (Array.isArray(r.presets) && !r.presets.includes(preset)) return null;
  return /** @type {{ min?: number | null, max?: number | null }} */ (r);
}

/** @param {{ min?: number | null, max?: number | null } | null} r @param {number | null} v @returns {'red' | 'green' | null} */
function ruleColour(r, v) {
  if (!r || v === null) return null;
  return (r.min != null && v < r.min) || (r.max != null && v > r.max) ? 'red' : 'green';
}

/** sd of key / address from SPREAD (numbers) or a spreadOf() result (cells). @param {any} spread @param {string} key @param {string} addr */
function sdOf(spread, key, addr) {
  const c = spread?.keys?.[key]?.[addr];
  if (isNum(c)) return c;
  if (c && isNum(c.sd)) return c.sd;
  return null;
}

/**
 * The proof table rows of one finding (A30): bad vs fixed value per target, the separation in VG7 sd, the drift
 * (would a fixed -> bad change flag against a fixed baseline with VG7's tolerances), the item's calibrated rule.
 * @param {string} fn
 * @param {Run} bad
 * @param {Run | null} fixed null when there is no fixed build (F5b on master)
 * @param {{ spread?: any, tolerances?: Record<string, Partial<Tolerances>>, items: Record<string, any> | any[] }} ctx
 * @returns {ProofRow[]}
 */
export function proofRows(fn, bad, fixed, { spread = null, tolerances = {}, items }) {
  const byId = new Map(itemList(items).map((i) => [i.id, i]));
  /** @type {ProofRow[]} */
  const out = [];
  for (const t of expandTargets(fn, items)) {
    const dot = t.metric.lastIndexOf('.');
    const region = t.metric.slice(0, dot);
    const metric = t.metric.slice(dot + 1);
    const preset = t.key.slice(t.key.lastIndexOf('@') + 1);
    const b = readSide(bad, t.key, region, metric);
    const f = fixed ? readSide(fixed, t.key, region, metric) : { v: null, rec: null, why: null };
    /** @type {string[]} */
    const notes = [];
    if (b.why) notes.push(fixed ? `bad: ${b.why}` : b.why);
    if (f.why) notes.push(`fixed: ${f.why}`);
    const s = sdOf(spread, t.key, t.metric);
    if (s === null) notes.push('no sd');
    if (t.note) notes.push(t.note);
    const delta = b.v !== null && f.v !== null ? b.v - f.v : null;
    const sep = delta !== null && s !== null ? Math.abs(delta) / Math.max(s, 1e-4) : null;
    const dirOk = delta === null ? null : t.bad === 'high' ? delta > 0 : delta < 0;
    const separates = dirOk === null ? null : dirOk === false ? false : sep === null ? null : sep >= K_SIGMA;
    let mid = null;
    if (b.v !== null && f.v !== null) mid = b.v > 0.001 && f.v > 0.001 ? Math.sqrt(b.v * f.v) : (b.v + f.v) / 2;
    let drift = null;
    if (region !== 'leak' && b.rec?.metrics && f.rec?.metrics && !b.rec.error && !f.rec.error) {
      const flags = compare(t.key, stripThin(f.rec.metrics), stripThin(b.rec.metrics), tolFor(t.key, tolerances ?? {}));
      drift = flags.some((x) => x.region === region && x.metric === metric);
    }
    const rule = ruleOf(byId.get(idOfKey(t.key)), t.metric, preset);
    const ruleText = rule ? [rule.min != null ? `min ${rule.min}` : '', rule.max != null ? `max ${rule.max}` : ''].filter(Boolean).join(', ') : null;
    out.push({
      key: t.key,
      metric: t.metric,
      bad: b.v,
      fixed: f.v,
      delta,
      sd: s,
      sep,
      dirOk,
      separates,
      mid,
      drift,
      rule: ruleText,
      ruleBad: ruleColour(rule, b.v),
      ruleFixed: ruleColour(rule, f.v),
      note: notes.length ? notes.join('; ') : null,
    });
  }
  return out;
}

/** The parity view prefixes per finding. @param {string} fn */
function parityPrefix(fn) {
  if (fn === 'F6') return 'm-';
  if (fn === 'F1' || fn === 'F2' || fn === 'F4') return 'so-s1-';
  return null;
}

/**
 * The run's parity rows of the finding's views (F6: every `m-*` view, F1 / F2 / F4: the `so-s1-*` views, else none).
 * @param {string} fn
 * @param {Run | null} run
 * @param {Record<string, any> | any[]} [items] the view ids come from here when given
 * @returns {ParityRow[]}
 */
export function parityFor(fn, run, items) {
  const prefix = parityPrefix(fn);
  if (!prefix || !run) return [];
  const list = itemList(items).filter(isView);
  const ids = new Set(list.map((i) => String(i.id)).filter((id) => id.startsWith(prefix)));
  return (run.parity ?? []).filter((p) => (list.length ? ids.has(p.view) : String(p.view ?? '').startsWith(prefix)));
}

/** @param {number | null | undefined} v @param {number} [d] */
const fx = (v, d = 4) => (isNum(v) ? v.toFixed(d) : '-');
/** @param {boolean | null} v @param {string} yes @param {string} no */
const yn = (v, yes, no) => (v === null || v === undefined ? '-' : v ? yes : no);
/** @param {unknown} v */
const cellText = (v) => (v === null || v === undefined || v === '' ? '-' : String(v).replace(/\|/g, '\\|'));

/**
 * The proof report (markdown): a title line, the rows table, the parity rows of both runs, one summary line.
 * @param {ProofRow[]} rows
 * @param {{ bad?: ParityRow[], fixed?: ParityRow[] }} parity
 * @param {{ fn: string, badLabel: string, fixedLabel: string }} o
 * @returns {string}
 */
export function renderProof(rows, parity, { fn, badLabel, fixedLabel }) {
  const L = [`### ${fn} proof: ${badLabel} (bad) vs ${fixedLabel} (fixed)`, ''];
  L.push(`| key | metric | ${badLabel} | ${fixedLabel} | delta | sd | sep | dir | separates | mid | drift | rule | rule bad | rule fixed | note |`);
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) {
    L.push(`| ${r.key} | ${r.metric} | ${fx(r.bad)} | ${fx(r.fixed)} | ${fx(r.delta)} | ${fx(r.sd)} | ${fx(r.sep, 1)} | ${yn(r.dirOk, 'ok', 'wrong')} | ${yn(r.separates, 'yes', 'no')} | ${fx(r.mid)} | ${yn(r.drift, 'yes', 'no')} | ${cellText(r.rule)} | ${cellText(r.ruleBad)} | ${cellText(r.ruleFixed)} | ${cellText(r.note)} |`);
  }
  const pr = [
    ...(parity?.bad ?? []).map((p) => /** @type {[string, ParityRow]} */ ([badLabel, p])),
    ...(parity?.fixed ?? []).map((p) => /** @type {[string, ParityRow]} */ ([fixedLabel, p])),
  ];
  L.push('');
  if (pr.length) {
    L.push('| run | id | level | luma | range | meter | field | ok | skip | note |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const [run, p] of pr) {
      const range = isNum(p.min) && isNum(p.max) ? `${fx(p.min)}-${fx(p.max)}` : '-';
      L.push(`| ${run} | ${p.id} | ${fx(p.level)} | ${fx(p.luma)} | ${range} | ${fx(p.meter)} | ${fx(p.field)} | ${p.ok ? 'yes' : 'no'} | ${cellText(p.skip)} | ${cellText(p.note)} |`);
    }
  } else {
    L.push('No parity rows for this finding.');
  }
  const s = rows.filter((r) => r.separates === true).length;
  const d = rows.filter((r) => r.drift === true).length;
  const rb = rows.filter((r) => r.ruleBad === 'red').length;
  const gf = rows.filter((r) => r.ruleFixed === 'green').length;
  L.push('', `${fn}: ${s}/${rows.length} rows separate, ${d} drift, rule red on bad ${rb}, green on fixed ${gf}`);
  return L.join('\n');
}
