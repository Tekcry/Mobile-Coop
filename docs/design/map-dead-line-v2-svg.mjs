// Dead Line v2, Area 1: draws dead-line-v2-area1.svg from map-dead-line-v2.json (plan, routes as the tools walk them, guard loops,
// lamps with their lit pools, hides, vantages, encounters, the tunnel) and a long section along the lane.
// Run: node docs/design/map-dead-line-v2-svg.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIGHT } from './map-dead-line-core.mjs';
import { makeCtx } from './map-dead-line-sim.mjs';
import { lampTerm, LAMP_LEVEL_GAIN, LAMP_CONE_COS, LAMP_EXP } from './map-dead-line-engine.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const D = JSON.parse(fs.readFileSync(path.join(here, 'map-dead-line-v2.json'), 'utf8'));
const ctx = makeCtx(D);
const ZTOP = 56, XMAX = 206;
const X = (x) => +(60 + 10 * x).toFixed(1);
const Y = (z) => +(70 + 10 * (ZTOP - z)).toFixed(1);
const PLAN_B = Y(0);
const W = 60 + 10 * XMAX + 40;
const SEC0 = PLAN_B + 70;
const H = SEC0 + 230 + 210;
const esc = (s) => String(s).replace(/&/g, 'and').replace(/</g, '(').replace(/>/g, ')');
const o = [];
const rect = (r, fill, extra = '') => o.push(`<rect x="${X(r[0])}" y="${Y(r[3])}" width="${+(10 * (r[2] - r[0])).toFixed(1)}" height="${+(10 * (r[3] - r[1])).toFixed(1)}" fill="${fill}" ${extra}/>`);
const text = (x, y, s, extra = '') => o.push(`<text x="${x}" y="${y}" ${extra}>${esc(s)}</text>`);
const inPlan = (z) => z >= 0 && z <= ZTOP;

o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial, Helvetica, sans-serif" font-size="12">`);
o.push(`<defs><pattern id="g6" x="60" y="${Y(0) % 60}" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#e6e6e6"/></pattern>
<pattern id="brick" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#d8c3ad"/><path d="M0 8 L8 0" stroke="#c3aa90"/></pattern>
<pattern id="spk" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#ffcdd2"/><path d="M0 6 L6 0" stroke="#c62828"/></pattern>
<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#c62828"/></marker></defs>`);
o.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
text(60, 30, 'Dead Line v2 - Area 1 Approach: Cable Lane (plan) - D1 revision', 'font-size="22" font-weight="bold"');
text(60, 50, `Generated from map-dead-line-v2.json by map-dead-line-v2-svg.mjs. 1 m = 10 px, grid 6 m, north up; x east, z north (m). Routes are drawn as the analysis walks them. Checks: map-dead-line-v2-validation.md.`, 'font-size="13" fill="#555"');
rect([0, 0, XMAX, ZTOP], 'url(#g6)');

// ground spaces
for (const s of D.spaces.filter((q) => q.level === 'G')) {
  const r = [s.rect[0], Math.max(0, s.rect[1]), Math.min(XMAX, s.rect[2]), Math.min(ZTOP, s.rect[3])];
  rect(r, s.kind === 'outdoor' ? (s.id === 'road' ? '#d9d9d9' : '#d0d0d0') : '#eceff1', s.kind === 'outdoor' ? '' : 'stroke="#37474f" stroke-width="2"');
}
// slabs drawn as outlines (the bridge)
const br = D.meta.slabs.find((s) => s.id === 'BRIDGE');
rect(br.rect, 'none', 'stroke="#555" stroke-width="2" stroke-dasharray="6 4"');
text(X(0.6), Y(br.rect[3]) + 16, 'railway bridge over (deck +6.5)', 'font-size="11"');
// blocks
const blockFill = (b) => {
  const l = b.label;
  if (b.level === 'U') return /spikes/i.test(l) ? 'url(#spk)' : '#e3f2fd';
  if (/viaduct|arch a17|pier/i.test(l)) return 'url(#brick)';
  if (/^Lean-to/i.test(l)) return '#a9bdd1';
  if (/car|van/i.test(l) && !/repairs/i.test(l)) return '#5f7383';
  if (/skip/i.test(l)) return '#c9a227';
  if (/feeder pillar/i.test(l)) return '#2e7d32';
  if (/compound/i.test(l)) return 'none';
  if (/transformer/i.test(l)) return '#cfd8dc';
  if (/bearers/i.test(l)) return 'none';
  if (/boundary wall/i.test(l)) return '#8d6e63';
  if (/sand bay|pallet|dock/i.test(l)) return '#bcaaa4';
  if (/A block/i.test(l)) return 'none';
  return '#e8dccb';
};
for (const b of D.blocks.filter((q) => q.level === 'G')) {
  if (b.rect[3] < 0 || b.rect[1] > ZTOP || b.rect[0] > XMAX) continue;
  const r = [Math.max(0, b.rect[0]), Math.max(0, b.rect[1]), Math.min(XMAX, b.rect[2]), Math.min(ZTOP, b.rect[3])];
  const f = blockFill(b);
  if (f === 'none') { if (/compound/i.test(b.label)) rect(r, '#f5f5f5', 'stroke="#263238" stroke-width="3" stroke-dasharray="2 2"'); continue; }
  rect(r, f, /viaduct|pier|arch/i.test(b.label) ? 'stroke="#8a6d52"' : 'stroke="#8d6e63" stroke-width="0.6"');
}
// arch numbers and tenants
const tenants = { 1: 'railway compound', 2: 'tyre shop', 3: 'scrap dealer', 4: 'cabinet maker', 5: 'lock-up', 6: 'car repairs (open)', 7: 'car repairs', 8: 'van hire', 9: 'lock-up', 10: 'printers store', 11: 'lock-up', 12: 'lock-up', 13: 'builders merchant (open)', 14: 'brewery', 15: 'brewery', 16: 'brewery', 17: 'bricked', 18: 'substation', 19: 'telco (Area 2)' };
for (let n = 1; n <= 19; n++) { const cx = X(12 + 10 * (n - 1) + 5); text(cx, Y(33), `A${n}`, 'text-anchor="middle" font-weight="bold" fill="#5d4037" font-size="13"'); text(cx, Y(31), tenants[n], 'text-anchor="middle" fill="#5d4037" font-size="9"'); }
text(X(40), Y(36.5), 'RAILWAY VIADUCT - brick arches, deck +7.0', 'font-weight="bold" fill="#5d4037" font-size="14"');
// roofs (U level) and their blocks
for (const s of D.spaces.filter((q) => q.level === 'U')) rect(s.rect, 'none', `stroke="#1565c0" stroke-width="1" stroke-dasharray="1 2"`);
for (const b of D.blocks.filter((q) => q.level === 'U')) rect(b.rect, blockFill(b), /spikes/i.test(b.label) ? 'stroke="#c62828"' : 'stroke="#1e88e5" stroke-dasharray="3 2"');
text(X(42.5), Y(24.2), 'roof lights', 'font-size="9" fill="#0d47a1"');
text(X(82.5), Y(24.2), 'roof lights', 'font-size="9" fill="#0d47a1"');
text(X(166.6), Y(24.2), 'spikes', 'font-size="9" fill="#b71c1c"');
// openings
for (const op of D.openings.filter((q) => q.level === 'G' && ['gate', 'door1', 'door2', 'window'].includes(q.type))) {
  const [a, b] = op.axis === 'z' ? [[op.c - op.w / 2, op.at], [op.c + op.w / 2, op.at]] : [[op.at, op.c - op.w / 2], [op.at, op.c + op.w / 2]];
  o.push(`<path d="M${X(a[0])} ${Y(a[1])} L${X(b[0])} ${Y(b[1])}" stroke="${op.type === 'window' ? '#1e88e5' : '#ffffff'}" stroke-width="4"/>`);
  text(X(op.axis === 'z' ? op.c : op.at) + 4, Y(op.axis === 'z' ? op.at : op.c) - 4, op.id, 'font-size="9" font-weight="bold"');
}
// tunnel (B) outlines
for (const s of D.spaces.filter((q) => q.level === 'B')) rect(s.rect, 'none', 'stroke="#6a1b9a" stroke-width="2" stroke-dasharray="7 4"');
const tunEnd = Math.max(...D.spaces.filter((q) => q.level === 'B').map((s) => s.rect[2]));
rect([tunEnd, 14.5, tunEnd + 1.5, 18.4], '#9e9e9e', 'stroke="#424242"');
text(X(tunEnd) - 10, Y(13.4), 'duct bank 1962 (solid): the tunnel ends', 'font-size="9" fill="#424242"');
text(X(30), Y(14.3), 'cable tunnel below (floor -4.4)', 'font-size="10" fill="#6a1b9a"');
for (const id of ['M1', 'M2']) { const l = D.links.find((q) => q.id === id); o.push(`<circle cx="${X(l.a[1])}" cy="${Y(l.a[2])}" r="6" fill="#6a1b9a"/>`); text(X(l.a[1]) - 8, Y(l.a[2]) - 9, id, 'font-weight="bold" fill="#6a1b9a" font-size="11"'); }
for (const a of D.acoustic) { const [, x, z] = a.emit; rect([x - 0.5, z - 0.3, x + 0.5, z + 0.3], '#ffffff', 'stroke="#6a1b9a" stroke-width="1.5"'); text(X(x) - 6, Y(z) - 7, a.id, 'font-size="9" font-weight="bold" fill="#6a1b9a"'); }
// downpipes
for (const l of D.links.filter((q) => q.kind === 'pipe')) o.push(`<circle cx="${X(l.a[1])}" cy="${Y(21.15)}" r="3" fill="#212121"/>`);
// lamps: lit pool radius on the floor (light 0.28 at 1 m above the ground, no occlusion)
const litR = (l) => { let r = 0; for (let d = 0; d < 20; d += 0.25) { const v = (D.spaces.find((s) => s.id === l.space)?.amb ?? 0.1) + LAMP_LEVEL_GAIN * (l.i ?? 1) * lampTerm(d, 1 - l.h, 0, l.r, 0, -1, 0, LAMP_CONE_COS, LAMP_EXP); if (v >= LIGHT.shadow) r = d; } return r; };
for (const l of D.lamps) {
  const r = litR(l);
  o.push(`<circle cx="${X(l.x)}" cy="${Y(l.z)}" r="${(r * 10).toFixed(0)}" fill="#ffd54f" fill-opacity="0.28" stroke="${l.shoot ? '#e0a800' : '#e65100'}" ${l.shoot ? '' : 'stroke-dasharray="6 3"'} stroke-width="1.5"/>`);
  o.push(`<circle cx="${X(l.x)}" cy="${Y(l.z)}" r="5" fill="#ff8f00" stroke="#5d4037"/>`);
  text(X(l.x) + 7, Y(l.z) + 14, l.id + (l.shoot ? '' : ' (caged)'), 'font-size="10" font-weight="bold" fill="#8d5a00"');
}
// routes as walked
const ROUTE_STYLE = { M: ['#1565c0', ''], UP: ['#ef6c00', 'stroke-dasharray="12 5"'], UPQ: ['#f9a825', 'stroke-dasharray="4 4"'], BELOW: ['#6a1b9a', 'stroke-dasharray="2 5"'] };
for (const [id, [col, dash]] of Object.entries(ROUTE_STYLE)) {
  const rt = ctx.routes[id];
  const pts = [];
  for (const s of rt.segs) { if (s.hold) continue; if (s.link) { pts.push(null); continue; } pts.push([s.a[0], s.a[1]]); pts.push([s.b[0], s.b[1]]); }
  let d = '', pen = false;
  for (const p of pts) { if (!p) { pen = false; continue; } const z = Math.min(ZTOP, p[1]); d += `${pen ? 'L' : 'M'}${X(p[0])} ${Y(z)} `; pen = true; }
  o.push(`<path d="${d}" fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round" ${dash}/>`);
}
// guards: loops and stops with facings
for (const g of ctx.guards) {
  const tl = ctx.TL[g.id];
  if (g.level !== 'G') continue;
  for (const s of tl.segs) if (s.kind === 'move') o.push(`<path d="M${s.poly.map((p) => `${X(p[0])} ${Y(p[1])}`).join(' L')}" fill="none" stroke="#c62828" stroke-width="2.5"/>`);
  for (const w of g.wps) {
    o.push(`<circle cx="${X(w.x)}" cy="${Y(w.z)}" r="6" fill="#c62828"/>`);
    const fl = Math.hypot(w.face[0], w.face[1]) || 1;
    o.push(`<path d="M${X(w.x)} ${Y(w.z)} L${X(w.x + (w.face[0] / fl) * 2.6)} ${Y(w.z + (w.face[1] / fl) * 2.6)}" stroke="#c62828" stroke-width="2.5" marker-end="url(#arr)"/>`);
  }
  text(X(g.wps[0].x) + 8, Y(g.wps[0].z) - 8, g.id, 'font-weight="bold" fill="#b71c1c" font-size="12"');
}
// hides, vantages, encounters, checkpoints
for (const h of D.hides) { rect(h.rect, '#2e7d32'); text(X(h.rect[2]) + 2, Y(h.rect[1]) - 2, h.id, 'font-size="9" fill="#1b5e20" font-weight="bold"'); }
for (const v of D.vantage) { const x = X(v.x), y = Y(v.z); o.push(`<polygon points="${x},${y - 8} ${x - 7},${y + 6} ${x + 7},${y + 6}" fill="#0d47a1"/>`); text(x + 9, y + 4, v.id, 'font-size="11" font-weight="bold" fill="#0d47a1"'); }
for (const e of D.encounters) text(X(e.x) - 14, Y(e.z) + 4, e.id, 'font-size="14" font-weight="bold" fill="#d50000"');
for (const k of D.checkpoints) if (inPlan(k.z)) text(X(k.x) + 6, Y(k.z) + 16, k.id, 'font-size="11" font-weight="bold"');
o.push(`<circle cx="${X(6)}" cy="${Y(53)}" r="8" fill="none" stroke="#000" stroke-width="2"/>`);
text(X(0.5), Y(53) - 12, 'van drop-off (beyond the bridge)', 'font-size="10"');
// north arrow and scale
o.push(`<g transform="translate(${W - 50} 100)"><path d="M0 30 L0 -10" stroke="#000" stroke-width="2"/><path d="M-7 0 L0 -14 L7 0 z"/><text x="-5" y="-18" font-weight="bold">N</text></g>`);
o.push(`<g transform="translate(60 ${PLAN_B + 18})"><rect width="300" height="6"/><rect x="60" width="60" height="6" fill="#fff"/><rect x="180" width="60" height="6" fill="#fff"/><text x="0" y="20" font-size="11">0</text><text x="290" y="20" font-size="11">30 m</text></g>`);

// long section along the lane centreline (vertical scale = horizontal)
const SY = (y) => +(SEC0 + 80 - 10 * y).toFixed(1);
text(60, SEC0, 'Section A-A along the lane centreline (vertical scale as plan; y 0 = lane surface)', 'font-size="15" font-weight="bold"');
o.push(`<path d="M${X(0)} ${SY(0)} L${X(192)} ${SY(0)}" stroke="#000" stroke-width="2"/>`);
o.push(`<path d="M${X(12)} ${SY(7)} L${X(XMAX)} ${SY(7)}" stroke="#8a6d52" stroke-dasharray="4 4"/>`);
text(X(150), SY(7) - 5, 'viaduct deck +7.0 (beyond, north)', 'font-size="10" fill="#5d4037"');
for (const s of D.spaces.filter((q) => q.level === 'U')) o.push(`<path d="M${X(s.rect[0])} ${SY(3)} L${X(s.rect[2])} ${SY(3)}" stroke="#4b5d70" stroke-width="2" stroke-dasharray="2 3"/>`);
text(X(22), SY(3) - 5, 'lean-to gutters +3.0 (beyond); gaps at A6 and A13', 'font-size="10"');
for (const s of D.spaces.filter((q) => q.level === 'B')) o.push(`<rect x="${X(s.rect[0])}" y="${SY(-2)}" width="${10 * (s.rect[2] - s.rect[0])}" height="${24}" fill="#efe3f6" stroke="#6a1b9a" stroke-width="2"/>`);
o.push(`<rect x="${X(tunEnd)}" y="${SY(-2)}" width="15" height="24" fill="#9e9e9e" stroke="#424242"/>`);
for (const id of ['M1', 'M2']) { const l = D.links.find((q) => q.id === id); o.push(`<rect x="${X(l.a[1]) - 6}" y="${SY(0)}" width="12" height="20" fill="#efe3f6" stroke="#6a1b9a" stroke-width="2"/>`); text(X(l.a[1]) + 9, SY(0) + 14, `${id} shaft, ladder 4.4 m`, 'font-size="10" fill="#4a148c"'); }
for (const a of D.acoustic) { o.push(`<path d="M${X(a.emit[1])} ${SY(0)} L${X(a.emit[1])} ${SY(-2)}" stroke="#6a1b9a" stroke-width="3" stroke-dasharray="2 2"/>`); text(X(a.emit[1]) + 5, SY(-2) - 4, 'VG vent shaft', 'font-size="10" fill="#4a148c"'); }
text(X(25), SY(-3.6), 'cable tunnel 1934: 2.4 x 2.6, bearers both walls, 1.8 m walkway, unlit', 'font-size="10" fill="#4a148c"');
text(X(tunEnd) + 20, SY(-3.6), 'duct bank (1962 water main): east section beyond reached only from the exchange', 'font-size="10" fill="#424242"');
text(64, SY(-2) + 4, '-2.0', 'font-size="10"'); text(64, SY(-4.4) + 4, '-4.4', 'font-size="10"');

// legend
const LG = SEC0 + 230;
const lg = [
  ['#1565c0', '', 'M ground route'], ['#ef6c00', 'stroke-dasharray="12 5"', 'UP roofs (drops at the gaps)'], ['#f9a825', 'stroke-dasharray="4 4"', 'UPQ roofs (downpipes down)'], ['#6a1b9a', 'stroke-dasharray="2 5"', 'BELOW cable tunnel M1 to M2'],
];
text(60, LG, 'Legend', 'font-size="14" font-weight="bold"');
lg.forEach(([c, d, t], k) => { o.push(`<path d="M60 ${LG + 20 + k * 22} L100 ${LG + 20 + k * 22}" stroke="${c}" stroke-width="3" ${d}/>`); text(108, LG + 24 + k * 22, t); });
const notes = [
  'Red: guard loops, stops (dots) and the facing at each stop. GA5 sits in the car; GA7 turns on the spot. GB1 and SN (Area 2) are measured to see no Area 1 cell.',
  'Yellow: lamp and the floor area it lights to 0.28 or more (dashed orange: caged, cannot be switched or shot). CA1 (LA1, LA2, LA9, LA8, LA3, LA5) goes out at FP1 for about 25 s until GA2 resets it.',
  'Green squares: hide spots. Blue triangles: vantages. Purple: tunnel, manholes M1 and M2 (cast-iron covers, 10 m lift noise), vent grating VG. Black dots: downpipes (all climbable).',
  'Blue dashed boxes on the roofs: roof lights (not walkable). Red hatch: anti-climb spikes. Dotted grey box at A1: the railway compound palisade (see-through, no way through).',
];
notes.forEach((t, k) => text(560, LG + 24 + k * 22, t));
o.push('</svg>');
fs.writeFileSync(path.join(here, 'dead-line-v2-area1.svg'), o.join('\n') + '\n');
console.log('svg', W, 'x', H);
