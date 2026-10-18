// P03B Part 1f check: ring entries (section 7 of 03B-block-plan.md).
// Usage: node scripts/kestrel/p03b-ring-check-f.mjs docs/kestrel/03B-block-plan.md
import { readFileSync } from 'node:fs';

const md = readFileSync(process.argv[2], 'utf8');
const lines = md.split(/\r?\n/);

// Access levels from brief 02 section 6 (2g-1: 0 Perimeter, the lane included; 1-5 card levels).
const RING = {};
const put = (ring, ids) => { for (const id of ids) RING[id] = ring; };
const range = (p, a, b) => Array.from({ length: b - a + 1 }, (_, i) => p + String(a + i).padStart(2, '0'));
put(0, range('X', 1, 13));
put(1, ['AG01', 'AG02', 'AG03', 'AG08', 'AG09', 'BG01', 'BG07', 'BG08']);
put(2, ['AG04', 'AG05', 'AG06', 'AG10', ...range('AG', 14, 22), 'AG24', 'AG25', 'AG26']);
put(3, ['AG11', 'AG12', 'AG13']);
put(2, [...range('AF', 1, 21), ...range('AR', 1, 4), 'LF01', 'LF02', ...range('BF', 1, 6), ...range('BF', 11, 15), ...range('BR', 1, 4)]);
put(3, [...range('AF', 2, 6), 'AF10', 'AF11', 'AF19', 'BF07', 'BG10', 'BG28']);
put(4, [...range('BF', 8, 10), 'BG13', 'BG20', ...range('BG', 23, 27), 'BU01', 'BU02', 'BR05', 'BG29', ...range('TB', 1, 4), 'AG23']);
put(5, ['BG21', 'BG22', ...range('BG', 30, 33)]);
put(2, [...range('BG', 2, 6), 'BG09', 'BG11', 'BG12', ...range('BG', 14, 16), ...range('BG', 40, 43), 'BR06']);

const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const RECT = /\[(-?[\d.]+), (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)\]/;
const ROOM = /\b(?:[A-Z]{2}\d{2}|X\d{2})\b/g;

// Collect rects and rooms from every table before section 7 and Appendix A.
const rects = {};
let header = null, ring = [], late = false;
for (const l of lines) {
  if (/^## (7\.|Appendix)/.test(l)) { header = null; late = true; continue; }
  if (!l.startsWith('|')) { header = null; continue; }
  const c = cells(l);
  if (!header) { header = c; continue; }
  if (/^-+$/.test(c[0])) continue;
  if (/^R[AB]\d{2}$/.test(c[0])) { ring.push(Object.fromEntries(header.map((h, i) => [h, c[i] ?? '']))); continue; }
  const ri = header.findIndex((h) => h.startsWith('Rect'));
  const mi = header.findIndex((h) => h === 'Rooms' || h === 'Rooms by level');
  const m = ri >= 0 ? RECT.exec(c[ri] ?? '') : null;
  if (late || !m || mi < 0 || rects[c[0]]) continue;
  rects[c[0]] = { r: m.slice(1, 5).map(Number), rooms: (c[mi] ?? '').match(ROOM) ?? [] };
}
// Section 7 rows are read with their own header (the loop above resets header per table).

let fails = 0, info = 0;
const fail = (id, s) => { fails++; console.log(`FAIL ${id}: ${s}`); };
const note = (id, s) => { info++; console.log(`INFO ${id}: ${s}`); };
const ringOf = (s) => { const m = /\((\d(?:\.5|\+)?)\)/.exec(s); return m ? (m[1].endsWith('+') ? Number(m[1][0]) + 0.5 : Number(m[1])) : NaN; };
const eps = 1e-6, onB = (v, a) => Math.abs(v - a) < eps;

for (const row of ring) {
  const id = row.Id;
  const [a, b] = (row.Between ?? '').split(' / ').map((s) => s.trim());
  const A = rects[a], B = rects[b];
  if (!A || !B) { fail(id, `unknown rect id ${!A ? a : b}`); continue; }
  const from = (row['From (level)'].match(ROOM) ?? []), to = (row['To (level)'].match(ROOM) ?? []);
  if (!from[0] || !A.rooms.includes(from[0])) fail(id, `${from[0]} not in ${a} rooms (${A.rooms.join(' ')})`);
  for (const t of to) if (!B.rooms.includes(t)) fail(id, `${t} not in ${b} rooms (${B.rooms.join(' ')})`);
  const rf = ringOf(row['From (level)']), rt = ringOf(row['To (level)']);
  if (RING[from[0]] !== rf) fail(id, `${from[0]} level written ${rf}, brief 6 ${RING[from[0]]}`);
  for (const t of to) if (RING[t] !== rt) fail(id, `${t} level written ${rt}, brief 6 ${RING[t]}`);
  const exempt = /^yes/i.test(row.Exempt ?? '');
  if (!exempt && !(rt - rf >= 0 && rt - rf <= 1)) fail(id, `level ${rf} to ${rt} skips or goes outward, not marked exempt`);
  const seg = (row.Segment ?? '').trim();
  if (seg === 'plan') {
    const [x0, z0, x1, z1] = B.r, [X0, Z0, X1, Z1] = A.r;
    if (!(x0 >= X0 - eps && z0 >= Z0 - eps && x1 <= X1 + eps && z1 <= Z1 + eps)) fail(id, `${b} not inside ${a}`);
  } else {
    const m = /^(x|z) (-?[\d.]+), (x|z) (-?[\d.]+)-(-?[\d.]+)$/.exec(seg);
    if (!m || m[1] === m[3]) { fail(id, `segment "${seg}" not "x c, z a-b", "z c, x a-b" or "plan"`); continue; }
    const c = Number(m[2]), s0 = Number(m[4]), s1 = Number(m[5]);
    if (s1 - s0 < 1.0 - eps) fail(id, `segment ${s1 - s0} long, under 1.0`);
    const along = (R) => (m[1] === 'x' ? [R[1], R[3]] : [R[0], R[2]]);
    const across = (R) => (m[1] === 'x' ? [R[0], R[2]] : [R[1], R[3]]);
    const [aa0, aa1] = across(A.r), [al0, al1] = along(A.r), [ba0, ba1] = across(B.r), [bl0, bl1] = along(B.r);
    if (!(onB(c, aa0) || onB(c, aa1)) || s0 < al0 - eps || s1 > al1 + eps) fail(id, `segment not on an edge of ${a} ${JSON.stringify(A.r)}`);
    if (c < ba0 - eps || c > ba1 + eps || s0 < bl0 - eps || s1 > bl1 + eps) fail(id, `segment not within ${b} ${JSON.stringify(B.r)}`);
    else if (!(onB(c, ba0) || onB(c, ba1))) note(id, `segment on ${a}'s edge inside ${b} (bulkhead or island)`);
  }
  if (!row.Source || row.Source === '-') fail(id, 'no source');
}
const n = (p) => ring.filter((r) => r.Id.startsWith(p)).length;
console.log(`ring ${ring.length} (RA ${n('RA')}, RB ${n('RB')}), rects ${Object.keys(rects).length}, fails ${fails}, info ${info}`);
process.exit(fails ? 1 : 0);
