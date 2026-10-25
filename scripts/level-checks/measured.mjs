// level-checks/measured: greybox measurements (V6 `checkMeasured`, v6 8f551e18 `scripts/level-validate.mjs:977-1073`;
// BRIEF A4, A5): the `measured` values `level-measure` writes beside the declared targets, held to the same limits.
//   checkMeasured(graph, metrics, { requireMeasured }) -> { errors, warns, infos }
// Spaces: on encounter spaces (the targets are encounter rules, graph-schema) ERR a measured vantage share below the
// minimum and a LOS break over the limit; the shadow share outside its band is INFO (G329, V1, A4). A measurement apart
// from its declared target WARNs (the design doc is out of date); for the shadow share that drift is INFO too.
// Splits (`meta.measured.splits.<id>`): ERR a measured leg (`a_s`, `b_s`) over `split_max_s` or legs apart by more than
// `split_parity_pct`, ERR a reach over `reach_max_s`. Campaign way backs (`meta.measured.ways_back`, one per co-op
// link, level-design 11.6): ERR a measured way back over `reach_max_s` where the core gate reach judges the link. A
// `null` reach or way back (a move the nav grid does not model) is a WARN to justify in the design doc; the declared
// time is still checked by the core (lead answer L2).
// Presence: an encounter space with no `measured` is INFO "pending V6"; under `--require-measured` (the greybox gate,
// V2, A5) it is an ERR, and so is a declared split with no measured `a_s`, `b_s` and `reach_s` and a campaign co-op
// link with no measured way back.

import {
  COOP_KINDS, EPS, SPLIT_TAG, TWO_WAY_GATES, collector, fmt, fmtS, index, linkName, profileOf,
} from '../level-graph-lib.mjs';

// Tooling tolerances, not level sizes (as V6): how far a measurement may sit from its declared target before the target
// is called out of date (fractions for the shares, seconds for the times).
const DRIFT_FRAC = 0.10;
const DRIFT_S = 1.5;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Measured checks over one merged graph. */
export function checkMeasured(graph, metrics, { requireMeasured = false } = {}) {
  const c = collector(metrics);
  const { spaces, links, meta } = index(graph);
  /** A finite number at `o[key]`; ERR (naming `name`) for any other non-null value. */
  const numAt = (o, key, name) => {
    const v = o[key];
    if (v === undefined || v === null) return undefined;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    c.err(`${name}: measured ${key} must be a number`);
    return undefined;
  };
  const drift = (say, name, what, measured, declared, tol, unit) => {
    if (typeof declared !== 'number' || Math.abs(measured - declared) <= tol + EPS) return;
    say(`${name}: measured ${what} ${fmt(measured)}${unit} vs declared ${fmt(declared)}${unit} (apart by more than ${fmt(tol)}${unit}; update the declared target)`);
  };

  for (const s of spaces) {
    const m = s.measured;
    if (!isObj(m)) {
      if (s.type !== 'encounter') continue;
      if (requireMeasured) c.err(`${s.id}: no measured values (--require-measured)`);
      else c.info(`${s.id}: pending V6 (no measured values)`);
      continue;
    }
    const target = s.type === 'encounter';
    // Shadow share: information only (G329 "Real-world levels": the light band is the target; V1, A4).
    const shadow = numAt(m, 'shadow_pct', s.id);
    if (shadow !== undefined && target) {
      const lo = c.num('rules.shadow_min_frac', 'the measured shadow share report', 'info');
      const hi = c.num('rules.shadow_max_frac', 'the measured shadow share report', 'info');
      if (lo !== undefined && hi !== undefined && (shadow < lo - EPS || shadow > hi + EPS)) {
        const decl = typeof s.shadow_pct === 'number' ? `, declared ${fmt(s.shadow_pct)}` : '';
        c.info(`${s.id}: measured shadow_pct ${fmt(shadow)} outside ${fmt(lo)}-${fmt(hi)}${decl} (information; the light band is the target)`);
      }
    }
    if (shadow !== undefined) drift(c.info, s.id, 'shadow_pct', shadow, s.shadow_pct, DRIFT_FRAC, '');
    const sees = numAt(m, 'sees_pct', s.id);
    if (sees !== undefined && target) {
      const min = c.num('rules.vantage_min_frac', 'the measured vantage check');
      const decl = typeof s.vantage?.sees_pct === 'number' ? ` (declared ${fmt(s.vantage.sees_pct)})` : '';
      if (min !== undefined && sees < min - EPS) c.err(`${s.id}: measured sees_pct ${fmt(sees)} below ${fmt(min)}${decl}`);
    }
    if (sees !== undefined) drift(c.warn, s.id, 'sees_pct', sees, s.vantage?.sees_pct, DRIFT_FRAC, '');
    const los = numAt(m, 'los_break_s', s.id);
    if (los !== undefined && target) {
      const max = c.num('rules.los_break_max_s', 'the measured line-of-sight check');
      const decl = typeof s.los_break_s === 'number' ? ` (declared ${fmt(s.los_break_s)} s)` : '';
      if (max !== undefined && los > max + EPS) c.err(`${s.id}: measured los_break_s ${fmt(los)} s above ${fmt(max)} s${decl}`);
    }
    if (los !== undefined) drift(c.warn, s.id, 'los_break_s', los, s.los_break_s, DRIFT_S, ' s');
  }

  // Link times: only the drift against the declared `time_s` (split legs and reach read `measured.path_m` through
  // `linkTime` in the core, A6).
  for (const l of links) {
    if (!isObj(l.measured)) continue;
    const t = numAt(l.measured, 'time_s', linkName(l));
    if (t !== undefined) drift(c.warn, linkName(l), 'time_s', t, l.time_s, DRIFT_S, ' s');
  }

  const mm = isObj(meta.measured) ? meta.measured : {};

  // Splits: measured legs and partner reach (meta.measured.splits.<id>).
  const splits = isObj(mm.splits) ? mm.splits : {};
  const ids = new Set(spaces.flatMap((s) => (Array.isArray(s.tags) ? s.tags : [])
    .map((t) => SPLIT_TAG.exec(t)?.[1]).filter((x) => x !== undefined)));
  for (const id of Object.keys(splits)) {
    if (!ids.has(id)) c.warn(`meta.measured.splits.${id}: names no split`);
  }
  for (const id of ids) {
    const m = Object.hasOwn(splits, id) && isObj(splits[id]) ? splits[id] : undefined;
    if (!m) {
      if (requireMeasured) c.err(`split ${id}: no measured legs and reach (meta.measured.splits.${id}; --require-measured)`);
      continue;
    }
    const name = `split ${id}`;
    const legs = {};
    for (const key of ['a_s', 'b_s']) {
      legs[key] = numAt(m, key, name);
      if (legs[key] === undefined && requireMeasured) c.err(`${name}: no measured ${key} (--require-measured)`);
    }
    const splitMax = c.num('rules.split_max_s', 'the measured split leg limit');
    for (const key of ['a_s', 'b_s']) {
      if (splitMax !== undefined && legs[key] !== undefined && legs[key] > splitMax + EPS) {
        c.err(`${name}: measured ${key} ${fmtS(legs[key])} s over the ${fmt(splitMax)} s limit`);
      }
    }
    const parityPct = c.num('rules.split_parity_pct', 'the measured split parity check');
    if (parityPct !== undefined && legs.a_s !== undefined && legs.b_s !== undefined) {
      const longer = Math.max(legs.a_s, legs.b_s);
      const diff = longer > 0 ? (Math.abs(legs.a_s - legs.b_s) / longer) * 100 : 0;
      if (diff > parityPct + EPS) {
        c.err(`${name}: measured legs ${fmtS(legs.a_s)} s vs ${fmtS(legs.b_s)} s differ by ${Math.round(diff)}% (max ${fmt(parityPct)}%)`);
      }
    }
    if (m.reach_s === null) {
      c.warn(`${name}: measured reach_s is null (legs joined only by moves the nav grid does not model); the declared reach is checked (justify it in the design doc)`);
      continue;
    }
    const reach = numAt(m, 'reach_s', name);
    if (reach === undefined) {
      if (requireMeasured) c.err(`${name}: no measured reach_s (--require-measured)`);
      continue;
    }
    const max = c.num('rules.reach_max_s', 'the measured partner reach check');
    if (max !== undefined && reach > max + EPS) c.err(`${name}: measured reach_s ${fmtS(reach)} s above ${fmt(max)} s`);
  }

  // Way backs (campaign, the profile's gate reach; level-design 11.6): one per co-op link, matched by from / to / kind
  // in graph order.
  if (profileOf(meta)?.gateReach) {
    if (mm.ways_back !== undefined && !Array.isArray(mm.ways_back)) c.err('meta.measured.ways_back must be a list');
    const queue = new Map();
    const key = (x) => `${x.from}\u0000${x.to}\u0000${x.kind}`;
    for (const [i, w] of (Array.isArray(mm.ways_back) ? mm.ways_back : []).entries()) {
      if (!isObj(w)) {
        c.err(`meta.measured.ways_back[${i}] must be an object`);
        continue;
      }
      if (!queue.has(key(w))) queue.set(key(w), []);
      queue.get(key(w)).push(w);
    }
    for (const l of links) {
      if (!COOP_KINDS.has(l.kind)) continue;
      const name = linkName(l);
      const w = queue.get(key(l))?.shift();
      if (!w) {
        if (requireMeasured) c.err(`${name}: no measured way back (meta.measured.ways_back; --require-measured)`);
        continue;
      }
      if (w.back_s === null) {
        const why = typeof w.why === 'string' && w.why ? ` (${w.why})` : '';
        c.warn(`${name}: measured way back is null${why}; the declared way back is checked (justify it in the design doc)`);
        continue;
      }
      const back = numAt(w, 'back_s', `${name} way back`);
      if (back === undefined) {
        if (requireMeasured) c.err(`${name}: no measured way back time (--require-measured)`);
        continue;
      }
      // A passed two-way gate stays open, so it is its own way back (the core gate reach skips it too).
      if (TWO_WAY_GATES.has(l.kind)) continue;
      const max = c.num('rules.reach_max_s', 'the measured way back check');
      if (max !== undefined && back > max + EPS) {
        c.err(`${name}: measured way back from ${l.to} to ${l.from} ${fmtS(back)} s, over the ${fmt(max)} s revive reach`);
      }
    }
    for (const rest of queue.values()) {
      for (const w of rest) c.warn(`meta.measured.ways_back: ${w.from} -> ${w.to} (${w.kind}) names no co-op link`);
    }
  }
  return c.r;
}
