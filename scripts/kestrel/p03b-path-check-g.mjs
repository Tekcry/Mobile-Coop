// P03B Part 1g-a check: critical path (section 8.1 of 03B-block-plan.md) and traversal coverage (routes.md).
// Usage: node scripts/kestrel/p03b-path-check-g.mjs docs/kestrel/03B-block-plan.md [docs/kestrel/routes.md]
import { readFileSync } from 'node:fs';

const md = readFileSync(process.argv[2], 'utf8');
const routesMd = readFileSync(process.argv[3] ?? 'docs/kestrel/routes.md', 'utf8');
const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const RECT = /\[(-?[\d.]+), (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)\]/;
const eps = 1e-6;
let fails = 0;
const fail = (id, s) => { fails++; console.log(`FAIL ${id}: ${s}`); };

// Zone and shaft rects from every table before section 7 (same rule as the ring check); legs from section 8.
const rects = {}, legs = [];
let header = null, late = false;
for (const l of md.split(/\r?\n/)) {
  if (/^## (7\.|8\.|Appendix)/.test(l)) { late = true; header = null; continue; }
  if (!l.startsWith('|')) { header = null; continue; }
  const c = cells(l);
  if (!header) { header = c; continue; }
  if (/^-+$/.test(c[0])) continue;
  if (/^P\d{2}$/.test(c[0])) { legs.push(Object.fromEntries(header.map((h, i) => [h, c[i] ?? '']))); continue; }
  const ri = header.findIndex((h) => h.startsWith('Rect'));
  const m = ri >= 0 ? RECT.exec(c[ri] ?? '') : null;
  if (late || !m || rects[c[0]]) continue;
  rects[c[0]] = m.slice(1, 5).map(Number);
}

// Critical path: waypoints "ZONE x,z > ZONE x,z", each inside its zone; legs chain; Length = planar + Vertical.
const ORDER = ['1', 'TA1', 'TA2', 'TA3', 'TA4', 'TB1', '5', '6', '7'];
let total = 0, prev = null;
const seen = [];
for (const leg of legs) {
  const id = leg.Leg;
  const pts = (leg.Waypoints ?? '').split('>').map((s) => s.trim()).map((s) => {
    const m = /^(\S+) (-?[\d.]+),(-?[\d.]+)$/.exec(s);
    if (!m) { fail(id, `waypoint "${s}" not "ZONE x,z"`); return null; }
    return { zone: m[1], x: Number(m[2]), z: Number(m[3]) };
  }).filter(Boolean);
  for (const p of pts) {
    const r = rects[p.zone];
    if (!r) { fail(id, `unknown zone ${p.zone}`); continue; }
    if (p.x < r[0] - eps || p.x > r[2] + eps || p.z < r[1] - eps || p.z > r[3] + eps) fail(id, `${p.x},${p.z} outside ${p.zone} [${r.join(', ')}]`);
  }
  if (prev && pts[0] && (Math.abs(prev.x - pts[0].x) > eps || Math.abs(prev.z - pts[0].z) > eps)) fail(id, `starts at ${pts[0].x},${pts[0].z}, previous leg ended at ${prev.x},${prev.z}`);
  let planar = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x, dz = pts[i].z - pts[i - 1].z;
    planar += Math.sqrt(dx * dx + dz * dz);
  }
  const vert = Number(/^(-?[\d.]+)/.exec(leg.Vertical ?? '')?.[1] ?? NaN);
  const len = Number(leg.Length);
  if (!Number.isFinite(vert) || !Number.isFinite(len)) fail(id, 'Vertical or Length not a number');
  else if (Math.abs(planar + vert - len) > 0.1) fail(id, `Length ${len}, planar ${planar.toFixed(2)} + vertical ${vert} = ${(planar + vert).toFixed(2)}`);
  if (!(leg.Source ?? '').trim()) fail(id, 'no source');
  for (const o of (leg.Objective ?? '').split(',').map((s) => s.trim())) if (o) seen.push(o);
  total += Number.isFinite(len) ? len : 0;
  prev = pts[pts.length - 1] ?? prev;
}
let k = 0;
for (const o of seen) if (o === ORDER[k]) k++;
if (k < ORDER.length) fail('order', `objectives not visited in order; missing from ${ORDER[k]} (seen ${seen.join(' ')})`);
if (total < 450 - eps || total > 650 + eps) fail('total', `${total.toFixed(1)} outside 450-650 (RULES 2)`);
console.log(`path legs ${legs.length}, total ${total.toFixed(1)}`);

// Coverage (Michael, 2026-10-11): every routes.md section 2 move is on a route, "not yet placed" (counted) or excluded;
// every engine name is a quoted kind or mode, or a field, in the engine files.
const src = ['src/world/anchors.ts', 'src/player/moveState.ts', 'src/player/attach.ts', 'src/game/teamController.ts']
  .map((f) => readFileSync(f, 'utf8')).join('\n');
const known = (n) => src.includes(`'${n}'`) || new RegExp(`\\b${n}\\??:`).test(src);
const routeIds = new Set(), moves = [];
let sec = 0; header = null;
for (const l of routesMd.split(/\r?\n/)) {
  const h = /^## (\d)\./.exec(l);
  if (h) { sec = Number(h[1]); header = null; continue; }
  if (!l.startsWith('|')) { header = null; continue; }
  const c = cells(l);
  if (!header) { header = c; continue; }
  if (/^-+$/.test(c[0])) continue;
  if (sec === 1) { const m = /^(R\d{2}[a-z]?|CP)\b/.exec(c[0]); if (m) routeIds.add(m[1]); }
  if (sec === 2) moves.push({ move: c[0], engine: c[1] ?? '', routes: c[2] ?? '' });
}
let placed = 0, open = 0;
for (const mv of moves) {
  for (const n of [...mv.engine.matchAll(/`([A-Za-z]+)`/g)].map((m) => m[1])) if (!known(n)) fail(mv.move, `engine name ${n} not found in the engine files`);
  if (/^not yet placed/i.test(mv.routes)) { open++; continue; }
  if (/^excluded/i.test(mv.routes)) continue;
  const ids = mv.routes.match(/\b(R\d{2}[a-z]?|CP)\b/g) ?? [];
  if (!ids.length) fail(mv.move, `routes "${mv.routes}" name no route`);
  for (const r of ids) if (!routeIds.has(r)) fail(mv.move, `route ${r} not in section 1`);
  placed++;
}
console.log(`coverage moves ${moves.length}, placed ${placed}, open ${open}`);
console.log(`fails ${fails}`);
process.exit(fails ? 1 : 0);
