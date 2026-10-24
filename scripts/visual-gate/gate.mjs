/** @typedef {[number, number, number]} Vec3 */
/** @typedef {import('./metrics.mjs').ShotMetrics} ShotMetrics */
/** @typedef {import('./metrics.mjs').MetricName} MetricName */
/** @typedef {import('./metrics.mjs').Flag} Flag */
/** @typedef {import('./metrics.mjs').Tolerances} Tolerances */
/** @typedef {import('./metrics.mjs').Mask} Mask */
/** @typedef {import('./harness.mjs').Projection} Projection */
/** @typedef {import('./storeLib.mjs').RunRecord} RunRecord */
/** @typedef {import('./storeLib.mjs').BaselinePick} BaselinePick */
/** @typedef {{ stage: unknown, reinforced: number | null }} AlarmState */
/** @typedef {{ before: AlarmState, after: AlarmState, raised: boolean }} AlarmDelta */
/** @typedef {{ region: string, why: 'behind' | 'small' | 'blotch-small' }} RegionSkip */
/**
 * One measured shot: RunRecord.shots (views) / .rigs (rig on / off). Key = storeLib.shotKey(id, preset, rigState).
 * metrics null when the shot threw (error set). Numbers rounded to 5 decimals.
 * @typedef {{ key: string, id: string, map: string, preset: 'low' | 'epic', rigState: 'on' | 'off' | null,
 *   metrics: ShotMetrics | null, skips: RegionSkip[],
 *   settle: { meter: number, field: number, simS: number, guards: number, flickering: number, alarm: AlarmDelta | null } | null,
 *   converged: boolean, aimReady: boolean, error: string | null, ms: number }} ShotRecord
 */
/**
 * One L5 parity row: a grey card (kind 'card', Epic only) or a view's meter vs light field (kind 'meter', every view
 * and preset). id: `card-<view id>-<k>` (k from 1) / `meter-<view id>@<preset>`. ok true when skipped.
 * @typedef {{ kind: 'card' | 'meter', id: string, map: string, view: string, at: Vec3 | null, level: number | null,
 *   luma: number | null, meter: number | null, field: number | null, min: number | null, max: number | null,
 *   ok: boolean, skip: null | 'edge' | 'no-camera' | 'flicker' | 'error', note: string | null }} ParityRow
 */
/**
 * The block's machine line (`<!-- visual-gate-summary <json> -->`, line 2 of the block). VG6 reads only this.
 * flags = non-known flags (drift + rule); parity = misses (ok false); top = up to 3 of `<key> <region>.<metric>` then
 * `<parity id> parity`; base = the newest baseline version among the picks and the approver of an accepted pick of it.
 * @typedef {{ v: 1, verdict: 'clean' | 'flagged' | 'error', sha: string | null, version: string, train: number | null,
 *   renderer: string, shots: number, flags: number, known: number, parity: number, newKeys: number, warnings: number,
 *   errors: number, base: { version: string, approver: string | null } | null, wallS: number, reason: string | null,
 *   top: string[], recorded: boolean, thumbs: string[] }} VisualSummary
 */

// visual-gate VG5: the gate's pure scoring (docs/visual-gate/briefs/VG5.md, PLAN sections 2-5, BRIEF A2, A8, A10,
// A13, A15, A18, A21-A23). No node: imports, no fs, no git, no page: e2e-visual.mjs measures and does the I/O, this
// module turns measured shots, parity rows and baseline picks into flags, a verdict, the summary JSON, the printed
// block and the RunRecord. `--rescore` reuses `scoreRun` on a saved result.
import { FLOORS, checkRules, compare, erode, maskFromPolygon, parityRange } from './metrics.mjs';
import { cmpSemver, validateRun } from './storeLib.mjs';

/** A region with fewer mask pixels on screen is skipped `small` (VG1 polish 3). */
export const MIN_REGION_PX = 1500;
/** `blotch` needs this many pixels left after the 24 px erosion, else it is dropped `blotch-small` (VG1 polish 3). */
export const MIN_BLOTCH_PX = 400;
/** The erosion radius blotch uses (metrics.mjs `blotch`). */
export const BLOTCH_ERODE = 24;
/** meter = field parity: a miss when |meter - field| is over this (A22). */
export const METER_TOL = 0.02;
/** Grey card luma: mean of the centre CARD_PATCH x CARD_PATCH px (e2e-darkness `readLuma`). */
export const CARD_PATCH = 10;
/** Default deadline in seconds (the train step kills at 300 s, A12 / PLAN 6). */
export const DEADLINE_S = 285;
/** Exit codes (A21). */
export const EXIT = Object.freeze({ clean: 0, flagged: 1, usage: 2, error: 3 });
/** Max flag table rows in the block. */
const MAX_ROWS = 40;
const VIEWPORT = Object.freeze({ width: 960, height: 540 });

/** @param {number} x */
export function round5(x) {
  return typeof x === 'number' && Number.isFinite(x) ? Math.round(x * 1e5) / 1e5 : x;
}

/** Every number in a JSON-like value rounded to 5 decimals (a new value; non-finite numbers kept). @param {unknown} v @returns {any} */
function roundDeep(v) {
  if (typeof v === 'number') return round5(v);
  if (Array.isArray(v)) return v.map(roundDeep);
  if (v && typeof v === 'object' && !ArrayBuffer.isView(v)) {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [k, x] of Object.entries(v)) out[k] = roundDeep(x);
    return out;
  }
  return v;
}

/** A ShotMetrics with every number rounded to 5 decimals. @param {ShotMetrics} m @returns {ShotMetrics} */
export function roundMetrics(m) {
  return m ? roundDeep(m) : m;
}

/** @param {Mask} m */
function count(m) {
  let n = 0;
  for (let i = 0; i < m.length; i++) n += m[i];
  return n;
}

/**
 * Masks for the regions worth measuring: a region is skipped `behind` (a corner behind the camera) or `small` (< 1500 px
 * on screen); `blotch` is dropped from a region whose 24 px erosion keeps < 400 px (`blotch-small`, the region's stats and
 * other metrics kept). Never computed and trusted as 0 (VG1 polish 3).
 * @param {Record<string, Projection>} projections
 * @param {Record<string, MetricName[]>} want
 * @param {number} w
 * @param {number} h
 * @returns {{ masks: Record<string, Mask>, want: Record<string, MetricName[]>, skips: RegionSkip[] }}
 */
export function planMasks(projections, want, w, h) {
  /** @type {Record<string, Mask>} */
  const masks = {};
  /** @type {Record<string, MetricName[]>} */
  const outWant = {};
  /** @type {RegionSkip[]} */
  const skips = [];
  for (const [region, p] of Object.entries(projections ?? {})) {
    if (!p || p.behind) {
      skips.push({ region, why: 'behind' });
      continue;
    }
    const mask = maskFromPolygon(w, h, p.pts);
    if (count(mask) < MIN_REGION_PX) {
      skips.push({ region, why: 'small' });
      continue;
    }
    let list = [...(want?.[region] ?? [])];
    if (list.includes('blotch') && count(erode(mask, w, h, BLOTCH_ERODE)) < MIN_BLOTCH_PX) {
      list = list.filter((m) => m !== 'blotch');
      skips.push({ region, why: 'blotch-small' });
    }
    masks[region] = mask;
    outWant[region] = list;
  }
  return { masks, want: outWant, skips };
}

/**
 * Grey card luma: the mean of the centre `size` x `size` px (x0 = floor(w / 2) - size / 2, e2e-darkness `readLuma`
 * clip), 0..1.
 * @param {{ w: number, h: number, luma: Uint8Array }} img
 * @param {number} [size]
 */
export function cardLuma(img, size = CARD_PATCH) {
  const half = Math.floor(size / 2);
  const x0 = Math.max(0, Math.floor(img.w / 2) - half);
  const y0 = Math.max(0, Math.floor(img.h / 2) - half);
  const x1 = Math.min(img.w, x0 + size);
  const y1 = Math.min(img.h, y0 + size);
  let s = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      s += img.luma[y * img.w + x];
      n++;
    }
  }
  return n ? s / n / 255 : 0;
}

/**
 * The tolerances of one shot key: every field max(FLOORS field, override field) (A13: the floor always holds).
 * @param {string} key
 * @param {Record<string, Partial<Tolerances>>} [overrides] VG7's TOLERANCES, keyed by shot key
 * @returns {Tolerances}
 */
export function tolFor(key, overrides = {}) {
  /** @type {Record<string, number>} */
  const out = { ...FLOORS };
  const o = overrides?.[key];
  if (o) {
    for (const [f, v] of Object.entries(o)) {
      if (f in out && typeof v === 'number' && Number.isFinite(v)) out[f] = Math.max(/** @type {number} */ (out[f]), v);
    }
  }
  return /** @type {Tolerances} */ (/** @type {unknown} */ (out));
}

/**
 * A ShotMetrics without the regions of fewer than MIN_REGION_PX pixels (no `hist` emd against an empty region, VG1
 * polish 4). `whole` and `leak` are kept.
 * @param {ShotMetrics} m
 * @returns {ShotMetrics}
 */
export function stripThin(m) {
  if (!m) return m;
  /** @type {ShotMetrics['regions']} */
  const regions = {};
  for (const [k, r] of Object.entries(m.regions ?? {})) if (r && r.n >= MIN_REGION_PX) regions[k] = r;
  return { ...m, regions };
}

/** `x.y.z` -> `x.y.(z+1)`. @param {string} v */
export function nextPatch(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v));
  if (!m) throw new Error(`malformed version ${v}`);
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}

/**
 * The `pickBaseline` version cutoff (A18): `--version` when given; on a train run (`VG_TRAIN`) package.json's version
 * (releases before this train); else the next patch of it (a PR or proof run compares with its own base release too).
 * @param {string} pkgVersion
 * @param {{ train?: number | null, override?: string | null }} [o]
 */
export function baselineCutoff(pkgVersion, { train = null, override = null } = {}) {
  if (override) return override;
  if (train !== null && train !== undefined) return pkgVersion;
  return nextPatch(pkgVersion);
}

/**
 * A rule with a bound that applies at `preset`.
 * @param {import('./metrics.mjs').Rule | null | undefined} rule
 * @param {string} [preset]
 */
function calibrated(rule, preset) {
  if (!rule || (rule.min == null && rule.max == null)) return false;
  if (preset && Array.isArray(rule.presets) && !rule.presets.includes(/** @type {'low' | 'epic'} */ (preset))) return false;
  return true;
}

/**
 * The value a rule key reads (metrics.mjs `checkRules`): region `whole`, `leak` or a region name.
 * @param {ShotMetrics} m @param {string} region @param {string} metric
 */
function ruleValue(m, region, metric) {
  /** @type {Record<string, unknown> | undefined} */
  const src = region === 'whole' ? m.whole : region === 'leak' ? m.leak : m.regions?.[region];
  const v = src?.[metric];
  return typeof v === 'number' ? v : null;
}

/** @param {string} rk */
function splitRule(rk) {
  const dot = rk.lastIndexOf('.');
  return dot > 0 ? { region: rk.slice(0, dot), metric: rk.slice(dot + 1) } : null;
}

/**
 * Calibrated rules (a bound set, preset listed or no `presets`) that could not be evaluated on a shot, as
 * `<key> <rule> (<why>)`: why = behind / small / blotch-small from the shot's region skips, `leak region missing` for a
 * rig's leak, else `missing`. Never for a rig's `off` shot (no rules there) or a shot that threw (metrics null).
 * @param {string} key
 * @param {{ rules?: Record<string, import('./metrics.mjs').Rule> }} item
 * @param {ShotMetrics | null} metrics
 * @param {'low' | 'epic'} preset
 * @param {'on' | 'off' | null} rigState
 * @param {RegionSkip[]} [skips]
 * @returns {string[]}
 */
export function skippedRules(key, item, metrics, preset, rigState, skips = []) {
  if (!metrics || rigState === 'off') return [];
  /** @type {string[]} */
  const out = [];
  for (const [rk, rule] of Object.entries(item?.rules ?? {})) {
    if (!calibrated(rule, preset)) continue;
    const p = splitRule(rk);
    if (!p) continue;
    if (ruleValue(metrics, p.region, p.metric) !== null) continue;
    const regionSkip = skips.find((s) => s.region === p.region && s.why !== 'blotch-small');
    const blotchSkip = p.metric === 'blotch' ? skips.find((s) => s.region === p.region && s.why === 'blotch-small') : undefined;
    let why = 'missing';
    if (p.region === 'leak') why = regionSkip ? `leak region missing, ${regionSkip.why}` : 'leak region missing';
    else if (regionSkip) why = regionSkip.why;
    else if (blotchSkip) why = 'blotch-small';
    out.push(`${key} ${rk} (${why})`);
  }
  return out;
}

/**
 * VG1 polish 2: an F1 / F8 item whose `upper.veil` has a bound while `upper.contrast` has none. Lines without the
 * `WARN ` prefix (the block adds it).
 * @param {Array<{ id: string, targets?: string[], rules?: Record<string, import('./metrics.mjs').Rule> }>} items
 * @returns {string[]}
 */
export function lintRules(items) {
  /** @type {string[]} */
  const out = [];
  for (const it of items ?? []) {
    if (!(it.targets ?? []).some((t) => t === 'F1' || t === 'F8')) continue;
    if (calibrated(it.rules?.['upper.veil']) && !calibrated(it.rules?.['upper.contrast'])) {
      out.push(`${it.id}: F1/F8 rule on veil alone; veil (p5) misses partial beams, add upper.contrast`);
    }
  }
  return out;
}

/**
 * One shot: absolute rules (never on a rig's `off` shot) and drift against its baseline metrics (`base` null: no
 * compare), both sides stripped of thin regions first. `evaluated` = calibrated rules that had a value (KNOWN PASSES).
 * @param {{ key: string, item: { rules?: Record<string, import('./metrics.mjs').Rule>, known?: string | null },
 *   preset: 'low' | 'epic', rigState: 'on' | 'off' | null, metrics: ShotMetrics | null, base: ShotMetrics | null,
 *   tol: Tolerances, skips?: RegionSkip[] }} o
 * @returns {{ flags: Flag[], skipped: string[], evaluated: number }}
 */
export function scoreShot({ key, item, preset, rigState, metrics, base, tol, skips = [] }) {
  if (!metrics) return { flags: [], skipped: [], evaluated: 0 };
  /** @type {Flag[]} */
  const flags = [];
  let evaluated = 0;
  if (rigState !== 'off' && item) {
    flags.push(...checkRules(key, { rules: item.rules ?? {}, known: item.known ?? null }, metrics, preset));
    for (const [rk, rule] of Object.entries(item.rules ?? {})) {
      const p = splitRule(rk);
      if (p && calibrated(rule, preset) && ruleValue(metrics, p.region, p.metric) !== null) evaluated++;
    }
  }
  if (base) flags.push(...compare(key, stripThin(base), stripThin(metrics), tol ?? FLOORS));
  return { flags, skipped: item ? skippedRules(key, item, metrics, preset, rigState, skips) : [], evaluated };
}

/**
 * A grey card at gameplay `level` with display `luma` (A15): `skip: 'edge'` near a band edge (ok), else ok when
 * luma is inside parityRange's min..max.
 * @param {number} level @param {number} luma
 * @returns {{ min: number, max: number, ok: boolean, skip: null | 'edge' }}
 */
export function cardCheck(level, luma) {
  const r = parityRange(level);
  if (r.skip) return { min: r.min, max: r.max, ok: true, skip: 'edge' };
  return { min: r.min, max: r.max, ok: luma >= r.min && luma <= r.max, skip: null };
}

/**
 * meter = field (A22): a miss when |meter - field| > METER_TOL; with flickering lights in the settle a miss is
 * `skip: 'flicker'` (ok, a WARN), not a miss.
 * @param {number} meter @param {number} field @param {number} flickering
 * @returns {{ d: number, ok: boolean, skip: null | 'flicker' }}
 */
export function meterCheck(meter, field, flickering) {
  const d = Math.abs(meter - field);
  if (!(d > METER_TOL + 1e-12)) return { d, ok: true, skip: null };
  if (flickering > 0) return { d, ok: true, skip: 'flicker' };
  return { d, ok: false, skip: null };
}

/** @param {number | null | undefined} v */
const f4 = (v) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(4) : '-');

/**
 * The item id of a shot key (`<id>@<preset>`, a rig `<id>-on@<preset>` / `<id>-off@<preset>`).
 * @param {string} key @param {Set<string>} ids
 */
function idOfKey(key, ids) {
  const at = key.lastIndexOf('@');
  const base = at >= 0 ? key.slice(0, at) : key;
  if (ids.has(base)) return base;
  return base.replace(/-(on|off)$/, '');
}

/** @param {Record<string, any> | any[]} items @returns {any[]} */
const itemList = (items) => (Array.isArray(items) ? items : Object.values(items ?? {}));

/**
 * KNOWN lines (A10): one per flag with `known` set, `KNOWN <key> <region>.<metric> <now> vs <tol> (<known>)`; then
 * `KNOWN PASSES <id>: <known> - remove \`known\` (A10)` for every item with `known` that had at least one calibrated
 * rule evaluated (`evaluated[id]` > 0; without `evaluated`, any calibrated rule counts) and no known flag.
 * @param {Record<string, any> | any[]} items
 * @param {Flag[]} flags
 * @param {Record<string, number>} [evaluated]
 * @returns {string[]}
 */
export function knownLines(items, flags, evaluated) {
  const list = itemList(items);
  const ids = new Set(list.map((i) => i.id));
  /** @type {string[]} */
  const out = [];
  const flaggedIds = new Set();
  for (const f of flags ?? []) {
    if (!f.known) continue;
    out.push(`KNOWN ${f.key} ${f.region}.${f.metric} ${f4(f.cur)} vs ${f4(f.tol)} (${f.known})`);
    flaggedIds.add(idOfKey(f.key, ids));
  }
  for (const it of list) {
    if (!it.known || flaggedIds.has(it.id)) continue;
    const ran = evaluated ? (evaluated[it.id] ?? 0) > 0 : Object.values(it.rules ?? {}).some((r) => calibrated(/** @type {any} */ (r)));
    if (ran) out.push(`KNOWN PASSES ${it.id}: ${it.known} - remove \`known\` (A10)`);
  }
  return out;
}

/** @param {string} s */
const normRenderer = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');

/**
 * The verdict (A21), first match: error (a renderer mismatch; a shot, card or boot threw; the deadline stopped shots;
 * no baseline pick at all for the renderer, not under rulesOnly), flagged (a non-known flag or a parity miss), clean.
 * Error keeps the flags listed (the caller keeps them).
 * @param {{ errors?: string[], flags?: Flag[], parity?: Array<{ ok: boolean }>, picks?: Record<string, unknown> | number,
 *   rulesOnly?: boolean, renderers?: string[], notRun?: number | string[] }} o
 * @returns {{ verdict: 'clean' | 'flagged' | 'error', reason: string | null }}
 */
export function decide({ errors = [], flags = [], parity = [], picks = 0, rulesOnly = false, renderers = [], notRun = 0 }) {
  const rs = [...new Set(renderers.map(normRenderer).filter(Boolean))];
  if (rs.length > 1) return { verdict: 'error', reason: `renderer mismatch: ${rs.join(' | ')}` };
  if (errors.length) return { verdict: 'error', reason: errors.length > 1 ? `${errors[0]} (+${errors.length - 1} more)` : String(errors[0]) };
  const nr = Array.isArray(notRun) ? notRun.length : Number(notRun) || 0;
  if (nr > 0) return { verdict: 'error', reason: `over budget: ${nr} shots not run` };
  const np = typeof picks === 'number' ? picks : Object.keys(picks ?? {}).length;
  if (!rulesOnly && np === 0) return { verdict: 'error', reason: `no baseline for renderer ${rs[0] ?? '(none)'}` };
  const nf = flags.filter((f) => !f.known).length;
  const nm = parity.filter((p) => p.ok === false).length;
  if (nf || nm) {
    const parts = [];
    if (nf) parts.push(`${nf} flag${nf === 1 ? '' : 's'}`);
    if (nm) parts.push(`${nm} parity miss${nm === 1 ? '' : 'es'}`);
    return { verdict: 'flagged', reason: parts.join(', ') };
  }
  return { verdict: 'clean', reason: null };
}

/**
 * Up to `n` of `<key> <region>.<metric>` (non-known flags) then `<parity id> parity` (misses).
 * @param {Flag[]} flags @param {ParityRow[]} parity @param {number} [n]
 */
export function topFlags(flags, parity, n = 3) {
  return [
    ...(flags ?? []).filter((f) => !f.known).map((f) => `${f.key} ${f.region}.${f.metric}`),
    ...(parity ?? []).filter((p) => p.ok === false).map((p) => `${p.id} parity`),
  ].slice(0, n);
}

/**
 * @typedef {{ shots: ShotRecord[], rigs: ShotRecord[], parity: ParityRow[], errors: string[], renderers: string[],
 *   notRun: string[], wallMs: number, browsers: { preset: string, wallMs: number }[], warnings?: string[] }} RawRun
 * @typedef {{ items: Record<string, any>, picks: Record<string, BaselinePick>, rulesOnly: boolean,
 *   tolerances?: Record<string, Partial<Tolerances>> }} ScoreCtx
 * @typedef {{ flags: Flag[], skipped: string[], known: string[], newKeys: string[], warnings: string[], errors: string[],
 *   parity: ParityRow[], notRun: string[], shots: number, measured: number, verdict: 'clean' | 'flagged' | 'error',
 *   reason: string | null }} Score
 */

/**
 * The whole scoring from measured shots (main and `--rescore`): rules and drift per shot (the preset from each record),
 * KNOWN lines, new keys (no pick, not under rulesOnly), warnings (lint, unsteady, scene not ready, alarm raised, meter
 * flicker, card without a camera spot, then raw.warnings), errors (raw.errors, then every thrown shot and card), verdict.
 * @param {RawRun} raw @param {ScoreCtx} ctx @returns {Score}
 */
export function scoreRun(raw, ctx) {
  const items = ctx.items ?? {};
  const picks = ctx.picks ?? {};
  /** @type {Flag[]} */
  const flags = [];
  /** @type {string[]} */
  const skipped = [];
  /** @type {string[]} */
  const newKeys = [];
  /** @type {string[]} */
  const warnings = [...lintRules(itemList(items))];
  /** @type {string[]} */
  const errors = [...(raw.errors ?? [])];
  /** @type {Record<string, number>} */
  const evaluated = {};
  const records = [...(raw.shots ?? []), ...(raw.rigs ?? [])];
  let measured = 0;
  for (const rec of records) {
    if (rec.error || !rec.metrics) {
      errors.push(`${rec.key}: ${rec.error ?? 'no metrics'}`);
      continue;
    }
    measured++;
    const item = items[rec.id];
    const pick = ctx.rulesOnly ? null : picks[rec.key];
    const baseMetrics = /** @type {ShotMetrics | null} */ (pick?.shot?.metrics ?? null);
    if (!ctx.rulesOnly && !baseMetrics) newKeys.push(rec.key);
    if (!item) warnings.push(`${rec.key}: no viewpoint item ${rec.id} (rules not checked)`);
    const s = scoreShot({ key: rec.key, item, preset: rec.preset, rigState: rec.rigState, metrics: rec.metrics, base: baseMetrics, tol: tolFor(rec.key, ctx.tolerances), skips: rec.skips ?? [] });
    flags.push(...s.flags);
    skipped.push(...s.skipped);
    if (item) evaluated[item.id] = (evaluated[item.id] ?? 0) + s.evaluated;
    if (rec.converged === false) warnings.push(`${rec.key}: unsteady (converge not settled)`);
    if (rec.aimReady === false) warnings.push(`${rec.key}: scene not ready`);
    const al = rec.settle?.alarm;
    if (al?.raised) warnings.push(`${rec.key}: alarm raised in the settle (stage ${String(al.before.stage)} -> ${String(al.after.stage)}, reinforced ${String(al.before.reinforced)} -> ${String(al.after.reinforced)})`);
  }
  const parity = raw.parity ?? [];
  for (const p of parity) {
    if (p.skip === 'flicker') warnings.push(`${p.id}: meter ${f4(p.meter)} vs field ${f4(p.field)} with flickering lights (not counted)`);
    else if (p.skip === 'no-camera') warnings.push(`${p.id}: no camera spot at ${JSON.stringify(p.at)} (card not checked)`);
    else if (p.skip === 'error') errors.push(`${p.id}: ${p.note ?? 'error'}`);
  }
  warnings.push(...(raw.warnings ?? []));
  const notRun = raw.notRun ?? [];
  const { verdict, reason } = decide({ errors, flags, parity, picks, rulesOnly: ctx.rulesOnly, renderers: raw.renderers ?? [], notRun });
  return { flags, skipped, known: knownLines(items, flags, evaluated), newKeys, warnings, errors, parity, notRun, shots: records.length, measured, verdict, reason };
}

/**
 * The summary JSON (VG6 reads only this).
 * @param {{ score: Score, sha: string | null, version: string, train: number | null, renderer: string,
 *   picks: Record<string, BaselinePick>, wallMs: number, recorded: boolean, thumbs: string[] }} o
 * @returns {VisualSummary}
 */
export function summarize({ score, sha, version, train, renderer, picks, wallMs, recorded, thumbs }) {
  /** @type {{ version: string, approver: string | null } | null} */
  let base = null;
  const list = Object.values(picks ?? {});
  for (const p of list) {
    try {
      if (!base || cmpSemver(p.version, base.version) > 0) base = { version: p.version, approver: null };
    } catch {
      /* a malformed version never becomes the base */
    }
  }
  if (base) {
    const acc = list.find((p) => p.version === base?.version && p.source === 'accepted' && p.approver);
    base.approver = acc?.approver ?? null;
  }
  return {
    v: 1,
    verdict: score.verdict,
    sha: sha ?? null,
    version,
    train: train ?? null,
    renderer: normRenderer(renderer),
    shots: score.shots,
    flags: score.flags.filter((f) => !f.known).length,
    known: score.flags.filter((f) => f.known).length,
    parity: score.parity.filter((p) => p.ok === false).length,
    newKeys: score.newKeys.length,
    warnings: score.warnings.length + score.skipped.length,
    errors: score.errors.length,
    base,
    wallS: Math.round((wallMs ?? 0) / 100) / 10,
    reason: score.reason,
    top: topFlags(score.flags, score.parity),
    recorded: !!recorded,
    thumbs: [...(thumbs ?? [])],
  };
}

/**
 * The printed block, `VISUAL-GATE BEGIN` to `VISUAL-GATE END` inclusive (briefs/VG5.md "Block format").
 * @param {VisualSummary} summary
 * @param {Score} score
 * @param {{ browsers?: { preset: string, wallMs: number }[], rulesOnly?: boolean }} [details]
 */
export function renderBlock(summary, score, details = {}) {
  const s = summary;
  const lines = ['VISUAL-GATE BEGIN', `<!-- visual-gate-summary ${JSON.stringify(s)} -->`];
  const n = s.flags + s.parity;
  const head = s.verdict === 'clean' ? 'clean' : s.verdict === 'error' ? `error: ${s.reason ?? 'unknown'}` : `${n} flag${n === 1 ? '' : 's'}`;
  lines.push(`### visual-gate: ${head} on ${s.sha ? s.sha.slice(0, 8) : 'unknown'} (${s.version}${s.train !== null ? `, train ${s.train}` : ''})`);
  const baseText = s.base ? `baseline ${s.base.version} (${s.base.approver ? `approved by ${s.base.approver}` : 'green release'})` : details.rulesOnly ? 'baseline none (--rules-only)' : 'baseline none';
  const per = (details.browsers ?? []).map((b) => `${b.preset} ${(b.wallMs / 1000).toFixed(1)} s`).join(', ');
  lines.push(`${baseText}, renderer ${s.renderer || '-'}, ${s.shots} shots, wall ${s.wallS.toFixed(1)} s${per ? ` (${per})` : ''}`);
  const open = score.flags.filter((f) => !f.known);
  if (open.length) {
    lines.push('| key | region | metric | base | now | tol | kind |', '| --- | --- | --- | --- | --- | --- | --- |');
    for (const f of open.slice(0, MAX_ROWS)) lines.push(`| ${f.key} | ${f.region} | ${f.metric} | ${f4(f.base)} | ${f4(f.cur)} | ${f4(f.tol)} | ${f.kind} |`);
    if (open.length > MAX_ROWS) lines.push(`... ${open.length - MAX_ROWS} more`);
  }
  lines.push(...score.known);
  for (const p of score.parity) {
    if (p.ok !== false) continue;
    if (p.kind === 'card') lines.push(`PARITY ${p.id} level ${f4(p.level)} luma ${f4(p.luma)} range ${f4(p.min)}-${f4(p.max)}`);
    else lines.push(`PARITY ${p.id} meter ${f4(p.meter)} field ${f4(p.field)}`);
  }
  if (score.newKeys.length) lines.push(`NEW ${score.newKeys.length} key(s) without a baseline: ${score.newKeys.slice(0, 10).join(', ')}${score.newKeys.length > 10 ? ', ...' : ''}`);
  for (const k of score.skipped) lines.push(`SKIPPED ${k}`);
  for (const w of score.warnings) lines.push(`WARN ${w}`);
  for (const e of score.errors) lines.push(`ERROR ${e}`);
  if (score.notRun.length) lines.push(`ERROR not run (${score.notRun.length}): ${score.notRun.slice(0, 10).join(', ')}${score.notRun.length > 10 ? ', ...' : ''}`);
  lines.push('VISUAL-GATE END');
  return lines.join('\n');
}

/**
 * The RunRecord stored on `visual-baselines` (and in scratch): verdict clean -> 'green'; every number rounded to 5
 * decimals. Passes `validateRun` for a 40-hex sha and an x.y.z version (the caller checks `shouldRecord` first).
 * @param {{ sha: string, version: string, train: number | null, branch: string, at: string, renderer: string,
 *   chrome: string, verdict: 'clean' | 'flagged' | 'error', shots: ShotRecord[], rigs: ShotRecord[], parity: ParityRow[],
 *   flags: Flag[], ms: number }} o
 * @returns {RunRecord}
 */
export function runRecord({ sha, version, train, branch, at, renderer, chrome, verdict, shots, rigs, parity, flags, ms }) {
  return {
    sha: String(sha ?? ''),
    version: String(version ?? ''),
    train: train ?? null,
    branch: branch ?? '',
    at,
    renderer: normRenderer(renderer),
    chrome: chrome ?? '',
    viewport: { ...VIEWPORT },
    verdict: verdict === 'clean' ? 'green' : verdict,
    shots: roundDeep(shots ?? []),
    rigs: roundDeep(rigs ?? []),
    parity: roundDeep(parity ?? []),
    flags: roundDeep(flags ?? []),
    ms: Math.round(ms ?? 0),
  };
}

/** `validateRun` re-exported for the runner (one import). */
export { validateRun };

/**
 * Whether this run is recorded (A11, A23): asked (`--record` / VG_RECORD=1) and not `--no-record`, a 40-hex sha, no
 * `--only` / `--maps` / `--extra` (a partial or proof run never becomes a baseline), at least one shot measured.
 * @param {{ record: boolean, noRecord: boolean, only: string[] | null, maps: string[] | null, extra: string, sha: string | null, measured: number }} o
 * @returns {{ ok: boolean, why: string }}
 */
export function shouldRecord({ record, noRecord, only, maps, extra, sha, measured }) {
  if (noRecord) return { ok: false, why: '--no-record' };
  if (!record) return { ok: false, why: 'record off (--record or VG_RECORD=1)' };
  if (only && only.length) return { ok: false, why: '--only: a partial run is never recorded' };
  if (maps && maps.length) return { ok: false, why: '--maps: a partial run is never recorded' };
  if (extra) return { ok: false, why: '--extra: a proof run is never recorded' };
  if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/.test(sha)) return { ok: false, why: `sha is not 40 hex: ${String(sha)}` };
  if (!(measured > 0)) return { ok: false, why: 'nothing measured' };
  return { ok: true, why: 'ok' };
}

/**
 * Thumbs to push with a recorded run (A11, A23): for every non-known flagged key its webp as `<key>` and, when the
 * baseline run's scratch thumb exists, `<key>.base`.
 * @param {Flag[]} flags
 * @param {Record<string, BaselinePick>} picks
 * @param {(key: string) => Uint8Array | null} cur
 * @param {(sha: string, key: string) => Uint8Array | null} base
 * @returns {Record<string, Uint8Array>}
 */
export function thumbsToPush(flags, picks, cur, base) {
  /** @type {Record<string, Uint8Array>} */
  const out = {};
  const keys = [...new Set((flags ?? []).filter((f) => !f.known).map((f) => f.key))];
  for (const key of keys) {
    const t = cur(key);
    if (t) out[key] = t;
    const pick = picks?.[key];
    if (!pick) continue;
    const b = base(pick.sha, key);
    if (b) out[`${key}.base`] = b;
  }
  return out;
}
