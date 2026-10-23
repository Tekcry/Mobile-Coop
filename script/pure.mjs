// LR16-8 showcase sheets: the pure pieces of sheets.mjs (no browser): the map / unit table, the lamp-audit parser, the
// darkest-spot pick, the L5 display band and the seeded hash. Unit-checked with `node pure-check.mjs`.

/** Saltmarsh Park sector rooms (campusS1.ts / campusS2.ts room ids; S3-S5 rooms carry an `s<N>-` prefix). */
export const CAMPUS_S1 = ['verge', 'gatehouse', 'lane', 'park', 'bins', 'bikes', 'smoke', 'dyard', 'forecourt', 'plantroof', 'c1'];
export const CAMPUS_S2 = ['post', 'mail', 'lift', 'store', 'foyer', 'hall', 'hallne', 'plant', 'l1sw', 'l1kitchen', 'l1north', 'l1fac', 'l1wing', 'l2sw', 'l2north', 'l2wing', 'roof'];

/**
 * The run's maps in order, each one browser. A unit is a "sector" of the request: 10 shots each, 11 units = 110 shots.
 * `rooms` (ids) / `prefix` (id prefix) / `all` (the whole map) say which part of the map the unit is. `mode` is the co-op
 * lobby mode for shot 10. campusOps has no Workshop room: the Workshop unit is the Sector Ops Workshop on warehouseOps
 * (room `workshop`, the 4.78 wall-arc room).
 */
export const MAPS = [
  {
    id: 'campusOps', mode: 'sector', q: 'autostart=campusOps&mode=sector&sectorGuards=0', capMin: 55,
    units: [
      { name: 's1', rooms: CAMPUS_S1 },
      { name: 's2', rooms: CAMPUS_S2 },
      { name: 's3', prefix: 's3-' },
      { name: 's4', prefix: 's4-' },
      { name: 's5', prefix: 's5-' },
    ],
  },
  {
    id: 'warehouseOps', mode: 'sector', q: 'autostart=warehouseOps&mode=sector&sectorGuards=0', capMin: 30,
    units: [
      { name: 'workshop', rooms: ['workshop'], note: 'campusOps has no Workshop room: this is the Sector Ops Workshop on warehouseOps (room `workshop`, the 4.78 wall-arc room)' },
      { name: 'all', all: true },
    ],
  },
  { id: 'ctcourse', mode: 'course', q: 'autostart=ctcourse&mode=course', capMin: 20, units: [{ name: 'all', all: true }] },
  // (sandbox builds no nav grid and no EnemyManager, gameState.ts:667: warehouse and proving boot in a mode that does, the
  // queries of e2e-stealth-ai.mjs:12 (warehouse Hunter `clear`) and e2e-tactics.mjs:52 (proving Mission); Mission is no
  // co-op NetMode (protocol.ts:36), so proving's pair is `clear` (e2e-clear.mjs:214). Kestrel declares only sandbox
  // (kestrel.ts:195) and no repo script boots it otherwise: `noNav` marks its shots not possible, its bake still runs.)
  { id: 'warehouse', mode: 'clear', q: 'autostart=warehouse&mode=clear', capMin: 20, units: [{ name: 'all', all: true }] },
  { id: 'kestrel', mode: 'sandbox', q: 'autostart=kestrel&mode=sandbox', noNav: 'kestrel only boots in sandbox (no nav grid)', capMin: 20, units: [{ name: 'all', all: true }] },
  { id: 'proving', mode: 'clear', q: 'autostart=proving&mode=mission', capMin: 20, units: [{ name: 'all', all: true }] },
];

/**
 * The LR16-2 framing tables of `docs/sector-redesign/checks/lr16-lamp-audit.md`: map id -> rows. A row: the room
 * (`id` null for the "(outside rooms...)" rows), its view count, the mean lit / dim / dark shares (0..1), and the
 * flagged views it lists (feet x, y, z, yaw in degrees, flag `pool` = no pool, `dark` = no dark, `pool+dark`).
 */
export function parseAudit(md) {
  const out = {};
  let cur = null;
  for (const ln of md.split(/\r?\n/)) {
    const h = /^### (\S+) \(/.exec(ln);
    if (h) {
      cur = out[h[1]] = [];
      continue;
    }
    if (/^##? /.test(ln)) {
      cur = null;
      continue;
    }
    if (!cur || !ln.startsWith('| ') || ln.startsWith('| Room ') || ln.startsWith('|---')) continue;
    const cells = ln.split('|').slice(1, -1).map((s) => s.trim());
    if (cells.length < 8) continue;
    const name = cells[0];
    const idm = /\(`([^`]+)`\)\s*$/.exec(name);
    const num = (s) => Number(String(s).replace('%', ''));
    const list = [...cells[7].matchAll(/\((-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)\) (\d+)(?: (pool\+dark|pool|dark))?/g)]
      .map((m) => ({ x: +m[1], y: +m[2], z: +m[3], yaw: +m[4], flag: m[5] ?? '' }));
    cur.push({ name, id: idm ? idm[1] : null, outside: !idm, sky: /open sky/.test(name), views: num(cells[1]), lit: num(cells[2]) / 100, dim: num(cells[3]) / 100, dark: num(cells[4]) / 100, noPool: num(cells[5]), noDark: num(cells[6]), list });
  }
  return out;
}

/** Does audit row `r` belong to unit `u`? */
export function rowInUnit(r, u) {
  if (u.all) return true;
  if (!r.id) return false;
  if (u.rooms) return u.rooms.includes(r.id);
  if (u.prefix) return r.id.startsWith(u.prefix);
  return false;
}

/**
 * The unit's darkest place by the audit file: the room row with the highest mean dark share (open-sky rows only when
 * nothing else is there; ties: more views, then name), and in it the first listed view flagged "no pool" (a view the
 * audit saw as dark-dominant). `view` null: the page picks the darkest walkable point of that room (or of the unit when
 * the row is an "(outside rooms)" row).
 */
export function pickDark(rows, u) {
  if (!rows?.length) return { source: 'none', why: 'map not in the audit file', room: null, view: null };
  let cand = rows.filter((r) => rowInUnit(r, u));
  const covered = cand.filter((r) => !r.sky);
  if (covered.length) cand = covered;
  if (!cand.length) return { source: 'none', why: 'no audit room row in this unit', room: null, view: null };
  cand = [...cand].sort((a, b) => b.dark - a.dark || b.views - a.views || a.name.localeCompare(b.name));
  const r = cand[0];
  // (the lowest storey first: a room's listed views include standing spots on its roof)
  const pools = r.list.filter((x) => x.flag === 'pool');
  const v = pools.length ? pools.reduce((a, b) => (b.y < a.y ? b : a)) : null;
  return { source: v ? 'audit view' : 'audit room', room: r.id, roomName: r.name, darkShare: r.dark, views: r.views, view: v ? { x: v.x, y: v.y, z: v.z, yaw: v.yaw } : null };
}

/** Bible L5 display targets (e2e-darkness TARGETS): field level -> Rec. 709 display luma band. */
const L5 = [
  [0.12, 0, 0.04],
  [0.27, 0, 0.09],
  [0.4, 0.12, 0.35],
  [0.7, 0.45, 1],
];
/** The L5 band at a field level (linear between the targets, clamped at the ends), widened by `margin`. */
export function lumaBand(level, margin = 0.03) {
  let lo;
  let hi;
  if (level <= L5[0][0]) [, lo, hi] = L5[0];
  else if (level >= L5[L5.length - 1][0]) [, lo, hi] = L5[L5.length - 1];
  else {
    for (let i = 0; i < L5.length - 1; i++) {
      const [a, alo, ahi] = L5[i];
      const [b, blo, bhi] = L5[i + 1];
      if (level < a || level > b) continue;
      const t = (level - a) / (b - a);
      lo = alo + (blo - alo) * t;
      hi = ahi + (bhi - ahi) * t;
      break;
    }
  }
  return [Math.max(0, lo - margin), Math.min(1, hi + margin)];
}

/** FNV-1a 32-bit (the probe's per-map seed). */
export function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Percentile of a numeric array (null when empty). */
export function pct(a, p) {
  const s = a.filter(Number.isFinite).sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null;
}
