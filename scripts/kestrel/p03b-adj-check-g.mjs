// P03B Part 1g-b / 1g-c check: brief 7 adjacency at zone level (section 9 of 03B-block-plan.md).
// Usage: node scripts/kestrel/p03b-adj-check-g.mjs docs/kestrel/03B-block-plan.md
// Rows J01.. with columns Id | Item | Rooms | Zones | Relation | Result | P04 | Source.
// Relation: same (one zone holds all rooms), face (plan edges share >= 1.0), above (plans overlap, different levels),
// line (rects in a row east to east, the first's z band inside each), gap <n> (plan gap n, judged by the session).
// Result starts with the measured metres (face length, overlap m2, gap) for face, above and gap.
// Part 1g-c: rows N01.. (items U01-U08, must not touch) with relations none (plan gap > 0; Result starts with the gap),
// apart (no plan overlap, a shared face allowed because the walls run to the slab; Result starts with the face length),
// door (a shared face allowed, P04 puts no door in it; Result starts with the face length), level (the two zones are on
// different levels, known from the zone id prefix; Result not measured) and gap <n> (a known gap, as in 9.1).
import { readFileSync } from 'node:fs';

const lines = readFileSync(process.argv[2], 'utf8').split(/\r?\n/);
const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const RECT = /\[(-?[\d.]+), (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)\]/;
const ROOM = /\b(?:[A-Z]{2}\d{2}|X\d{2})\b/g;
const ITEMS = Array.from({ length: 14 }, (_, i) => 'T' + String(i + 1).padStart(2, '0'));
const NITEMS = Array.from({ length: 8 }, (_, i) => 'U' + String(i + 1).padStart(2, '0'));
const LEVEL = [[/^(G-|W-|B-G)/, 'G'], [/^(F-|B-F)/, 'F'], [/^(R-|RF-|B-R|B-H)/, 'R'], [/^(S|SI)-/, 'site'], [/^T-/, 'B'], [/^U-/, 'U']];
const levelOf = (z) => (LEVEL.find(([re]) => re.test(z)) ?? [null, null])[1];

// Rects with rooms from every table in sections 1-6; J rows from section 9.
const rects = {}, rows = [];
let header = null, sec = 0;
for (const l of lines) {
  const h = /^## (\d+)\./.exec(l);
  if (h) { sec = Number(h[1]); header = null; continue; }
  if (/^## Appendix/.test(l)) { sec = 99; header = null; continue; }
  if (!l.startsWith('|')) { header = null; continue; }
  const c = cells(l);
  if (!header) { header = c; continue; }
  if (/^-+$/.test(c[0])) continue;
  if (sec === 9 && /^[JN]\d{2}$/.test(c[0])) { rows.push(Object.fromEntries(header.map((k, i) => [k, c[i] ?? '']))); continue; }
  if (sec >= 7) continue;
  const ri = header.findIndex((k) => k.startsWith('Rect'));
  const mi = header.findIndex((k) => k === 'Rooms' || k === 'Rooms by level');
  const m = ri >= 0 ? RECT.exec(c[ri] ?? '') : null;
  if (!m || mi < 0 || rects[c[0]]) continue;
  rects[c[0]] = { r: m.slice(1, 5).map(Number), rooms: (c[mi] ?? '').match(ROOM) ?? [] };
}

const eps = 1e-6, near = (a, b) => Math.abs(a - b) < eps;
const face = (A, B) => {
  if (near(A[2], B[0]) || near(B[2], A[0])) return Math.max(0, Math.min(A[3], B[3]) - Math.max(A[1], B[1]));
  if (near(A[3], B[1]) || near(B[3], A[1])) return Math.max(0, Math.min(A[2], B[2]) - Math.max(A[0], B[0]));
  return 0;
};
const overlap = (A, B) => Math.max(0, Math.min(A[2], B[2]) - Math.max(A[0], B[0])) * Math.max(0, Math.min(A[3], B[3]) - Math.max(A[1], B[1]));
const gap = (A, B) => {
  const dx = Math.max(0, B[0] - A[2], A[0] - B[2]), dz = Math.max(0, B[1] - A[3], A[1] - B[3]);
  return Math.sqrt(dx * dx + dz * dz);
};

let fails = 0;
const fail = (id, s) => { fails++; console.log(`FAIL ${id}: ${s}`); };
const seen = new Set(), nseen = new Set();
for (const row of rows) {
  const id = row.Id;
  const item = (row.Item ?? '').trim();
  const must = id.startsWith('J');
  if (must && !ITEMS.includes(item)) fail(id, `item "${item}" not T01-T14`); else if (must) seen.add(item);
  if (!must && !NITEMS.includes(item)) fail(id, `item "${item}" not U01-U08`); else if (!must) nseen.add(item);
  const zs = (row.Zones ?? '').split(' / ').map((s) => s.trim());
  const rs = (row.Rooms ?? '').split(' / ').map((s) => s.match(ROOM) ?? []);
  if (zs.length !== rs.length) { fail(id, `${zs.length} zones for ${rs.length} room groups`); continue; }
  const R = zs.map((z) => rects[z]);
  let bad = false;
  zs.forEach((z, i) => {
    if (!R[i]) { fail(id, `unknown rect id ${z}`); bad = true; return; }
    if (!rs[i].length) { fail(id, `no room listed for ${z}`); bad = true; }
    for (const room of rs[i]) if (!R[i].rooms.includes(room)) { fail(id, `${room} not in ${z} (${R[i].rooms.join(' ')})`); bad = true; }
  });
  if (bad) continue;
  const rel = (row.Relation ?? '').trim();
  const num = Number((/^(-?[\d.]+)/.exec(row.Result ?? '') ?? [])[1]);
  const measured = (v, what) => { if (!(Math.abs(num - v) < 0.05)) fail(id, `Result starts ${num}, ${what} is ${+v.toFixed(2)}`); };
  const gm = /^gap ([\d.]+)$/.exec(rel);
  if (!must && ['same', 'face', 'above', 'line'].includes(rel)) fail(id, `must-not-touch row cannot use ${rel}`);
  else if (!must && rel === 'level') {
    const [la, lb] = zs.map(levelOf);
    if (zs.length !== 2 || !la || !lb || la === lb) fail(id, `level needs two zones on known different levels (${zs.join(' / ')}: ${la} / ${lb})`);
  } else if (!must && zs.length !== 2) {
    fail(id, ` needs two zones`);
  } else if (!must && rel === 'none') {
    const v = gap(R[0].r, R[1].r);
    if (v < 0.05) fail(id, `zones touch (gap ${+v.toFixed(2)}, face ${+face(R[0].r, R[1].r).toFixed(2)})`);
    measured(v, 'gap');
  } else if (!must && rel === 'apart') {
    if (overlap(R[0].r, R[1].r) > eps) fail(id, 'plans overlap');
    measured(face(R[0].r, R[1].r), 'shared face');
  } else if (!must && rel === 'door') {
    measured(face(R[0].r, R[1].r), 'shared face');
  } else if (rel === 'same') {
    if (zs.length !== 1) fail(id, 'same needs one zone');
  } else if (rel === 'line') {
    if (zs.length < 3) fail(id, 'line needs three or more rects');
    for (let i = 1; i < R.length; i++) {
      const a = R[i - 1].r, b = R[i].r;
      if (!near(a[2], b[0])) fail(id, `${zs[i - 1]} east edge ${a[2]} is not ${zs[i]} west edge ${b[0]}`);
      if (R[0].r[1] < b[1] - eps || R[0].r[3] > b[3] + eps) fail(id, `${zs[0]} z band not inside ${zs[i]}`);
    }
  } else if (zs.length !== 2) {
    fail(id, `${rel} needs two zones`);
  } else if (rel === 'face') {
    const v = face(R[0].r, R[1].r);
    if (v < 1.0 - eps) fail(id, `shared face ${+v.toFixed(2)}, under 1.0`);
    measured(v, 'shared face');
  } else if (rel === 'above') {
    const v = overlap(R[0].r, R[1].r);
    if (v <= eps) fail(id, 'plans do not overlap');
    measured(v, 'overlap');
  } else if (gm) {
    const v = gap(R[0].r, R[1].r);
    if (Math.abs(v - Number(gm[1])) >= 0.05) fail(id, `gap written ${gm[1]}, measured ${+v.toFixed(2)}`);
    measured(v, 'gap');
  } else fail(id, `relation "${rel}" not same, face, above, line or gap <n>`);
  if (!row.Source || row.Source === '-') fail(id, 'no source');
}
for (const t of ITEMS) if (!seen.has(t)) fail(t, 'brief 7 item has no row');
const nrows = rows.filter((r) => r.Id.startsWith('N')).length;
if (nrows) for (const t of NITEMS) if (!nseen.has(t)) fail(t, 'brief 7 must-not-touch item has no row');
console.log(`adjacency rows ${rows.length - nrows}, items ${seen.size} of ${ITEMS.length}, apart rows ${nrows}, items ${nseen.size} of ${NITEMS.length}, rects ${Object.keys(rects).length}, fails ${fails}`);
process.exit(fails ? 1 : 0);
