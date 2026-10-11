// P03B zone check: tiling, fill, brief coverage, fixed blocks, door access, brief 7 and 8 rules for Building A (36 x 30).
import { readFileSync } from 'node:fs';
const md = readFileSync(process.argv[2], 'utf8');
const A = [4, 30, 40, 60];
const FLOOR = 1080;
// brief 02 section 5 rect areas (clear + 0.3 each way); AF20 was AG07 (Michael 2026-10-11)
const ROOMS = {
  G: { AG01: 90, AG02: 30, AG03: 6.25, AG04: 20, AG05: 30, AG06: 48, AG08: 80, AG09: 12, AG10: 105, AG11: 30, AG12: 20, AG13: 12, AG14: 40, AG15: 20, AG16: 5, AG17: 3, AG18: 32, AG19: 6.25, AG20: 8.75, AG21: 22.75, AG22: 20, AG23: 4, AG24: 35, AG25: 3, AG26: 105 },
  F: { AF01: 105, AF02: 96, AF03: 12, AF04: 30, AF05: 30, AF06: 20, AF07: 30, AF08: 42, AF09: 30, AF10: 56, AF11: 35, AF12: 32, AF13: 6.25, AF14: 8.75, AF15: 22.75, AF16: 3, AF17: 10.5, AF18: 20, AF19: 3, AF20: 48, AF21: 105 },
  R: { AR02: 72, AR03: 18, AR04: 22.75 },
};
// rect sides of the non-tight rooms (brief 5 clear + 0.3)
const DIMS = { AG01: [9, 10], AG02: [6, 5], AG03: [2.5, 2.5], AG04: [5, 4], AG05: [6, 5], AG06: [8, 6], AG08: [10, 8], AG09: [4, 3], AG11: [6, 5], AG12: [5, 4], AG13: [3, 4], AG14: [8, 5], AG15: [5, 4], AG16: [2.5, 2], AG17: [2, 1.5], AG22: [5, 4], AG24: [7, 5],
  AF02: [12, 8], AF03: [4, 3], AF04: [6, 5], AF05: [6, 5], AF06: [5, 4], AF07: [6, 5], AF08: [7, 6], AF09: [6, 5], AF11: [7, 5], AF18: [5, 4], AF20: [8, 6] };
// rooms entered through another room, not a corridor (brief 5 Doors to)
const HOST = { AG02: 'AG01', AG03: 'AG01', AG08: 'AG09', AG23: 'AG22', AF02: 'AF03', AF11: 'AF10' };
const TIGHT = new Set(['AG10', 'AG18', 'AG19', 'AG20', 'AG21', 'AG23', 'AG25', 'AG26', 'AF01', 'AF10', 'AF12', 'AF13', 'AF14', 'AF15', 'AF16', 'AF17', 'AF19', 'AF21', 'AR04']);
const CORR = new Set(['K-SPINE-G', 'K-SPINE-F', 'K-NCOR-G', 'K-NCOR-F', 'K-WLINK', 'K-ELINK']);
const cells = (l) => l.split('|').slice(1, -1).map((c) => c.trim());
const rows = md.split('\n').filter((l) => /^\| (G|F|R|K)-/.test(l)).map(cells).filter((r) => r[2]?.startsWith('['));
const zones = rows.filter((r) => !r[0].startsWith('K-')).map((r) => ({ id: r[0], lv: r[1], rect: JSON.parse(r[2]), rooms: r[3] === '-' ? [] : r[3].split(/,\s*/), src: r[r.length - 1] }));
const ks = Object.fromEntries(rows.filter((r) => r[0].startsWith('K-')).map((r) => [r[0], { rect: JSON.parse(r[2]), rooms: r[3], lvs: r[3].split(/;\s*/).map((p) => p.split(' ')[0]), src: r[r.length - 1] }]));
const fail = [], info = [];
const rule = (ok, msg) => { if (!ok) fail.push(msg); };
const area = ([a, b, c, d]) => (c - a) * (d - b);
const ov = (p, q) => Math.max(0, Math.min(p[2], q[2]) - Math.max(p[0], q[0])) * Math.max(0, Math.min(p[3], q[3]) - Math.max(p[1], q[1]));
const xo = (p, q) => Math.min(p[2], q[2]) - Math.max(p[0], q[0]);
const zo = (p, q) => Math.min(p[3], q[3]) - Math.max(p[1], q[1]);
const horiz = (p, q) => (p[1] === q[3] || p[3] === q[1]) && xo(p, q) > 0;
const edge = (p, q) => (horiz(p, q) ? xo(p, q) : (p[0] === q[2] || p[2] === q[0]) && zo(p, q) > 0 ? zo(p, q) : 0);
const inside = (p, q) => p[0] >= q[0] && p[1] >= q[1] && p[2] <= q[2] && p[3] <= q[3];
const grid = (r) => r.every((v) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-9);
const outside = (r) => r[0] === A[0] || r[1] === A[1] || r[2] === A[2] || r[3] === A[3];
const front = (id, D) => { const [a, b] = [...DIMS[id]].sort((x, y) => x - y); return b <= D ? a : a <= D ? b : Infinity; };
for (const z of zones) {
  rule(grid(z.rect), `${z.id} off the 0.5 grid`);
  rule(inside(z.rect, A), `${z.id} outside A`);
  rule(z.src && z.src !== '-', `${z.id} has no source`);
  const lv = ROOMS[z.lv] ?? {};
  z.t = 0; z.n = 0;
  for (const id of z.rooms) {
    if (!(id in lv)) { fail.push(`${z.id} unknown room ${id}`); continue; }
    if (TIGHT.has(id)) z.t += lv[id]; else z.n += lv[id];
  }
  const room = area(z.rect) - z.t;
  z.fill = room > 0 ? z.n / room : 0;
  z.spare = room - z.n;
  z.door = '-';
  rule(z.fill <= 0.85 + 1e-9, `${z.id} fill ${(z.fill * 100).toFixed(1)}% over 85%`);
}
for (const lv of ['G', 'F', 'R']) {
  const zs = zones.filter((z) => z.lv === lv);
  for (let i = 0; i < zs.length; i++) for (let j = i + 1; j < zs.length; j++) rule(ov(zs[i].rect, zs[j].rect) === 0, `${lv} overlap ${zs[i].id} ${zs[j].id}`);
  const sum = zs.reduce((s, z) => s + area(z.rect), 0);
  if (lv !== 'R') rule(sum === FLOOR, `${lv} zones cover ${sum} of ${FLOOR}`);
  const seen = zs.flatMap((z) => z.rooms);
  for (const id of Object.keys(ROOMS[lv])) { const c = seen.filter((s) => s === id).length; rule(c === 1, `${lv} room ${id} in ${c} zones`); }
}
const zoneOf = (lv, id) => zones.find((z) => z.lv === lv && z.rooms.includes(id));
const zr = (lv, id) => zoneOf(lv, id)?.rect ?? [0, 0, 0, 0];
for (const [k, v] of Object.entries(ks)) {
  rule(grid(v.rect), `${k} off the 0.5 grid`);
  rule(v.src && v.src !== '-', `${k} has no source`);
  if (k === 'K-BRIDGE') continue;
  for (const part of v.rooms.split(/;\s*/)) {
    const [lv, id] = part.split(' ');
    const z = id === '-' ? zones.find((q) => q.lv === lv && inside(v.rect, q.rect)) : zoneOf(lv, id);
    rule(z && inside(v.rect, z.rect), `${k} ${lv} ${id} not inside its zone`);
  }
}
const K = (id) => ks[id]?.rect ?? [0, 0, 0, 0];
// door access (Michael 2026-10-11): rooms with a corridor door need wall on a corridor block in their zone
for (const lv of ['G', 'F']) {
  const cor = Object.entries(ks).filter(([k, v]) => CORR.has(k) && v.lvs.includes(lv)).map(([, v]) => v.rect);
  const fixed = Object.entries(ks).filter(([k, v]) => !CORR.has(k) && k !== 'K-BRIDGE' && v.lvs.includes(lv)).map(([, v]) => v.rect);
  for (const z of zones.filter((q) => q.lv === lv)) {
    if (cor.some((c) => inside(c, z.rect))) continue;
    const rs = z.rooms.filter((id) => id in DIMS);
    if (!rs.length) continue;
    let best = null, avail = 0;
    for (const c of cor) { const e = edge(z.rect, c); avail += e; if (e > 0 && (!best || e > best.e)) best = { e, c }; }
    for (const f of fixed.filter((f) => inside(f, z.rect))) for (const c of cor) avail -= edge(f, c);
    if (!best) { fail.push(`${z.id} touches no corridor`); continue; }
    const D = horiz(z.rect, best.c) ? z.rect[3] - z.rect[1] : z.rect[2] - z.rect[0];
    let need = 0;
    for (const id of rs) {
      const a = Math.min(...DIMS[id]);
      if (HOST[id] && a <= D - 3) continue;
      need += front(id, D);
    }
    z.door = `${need} of ${avail}`;
    rule(need <= avail + 1e-9, `${z.id} doors need ${need} m of corridor wall, has ${avail}`);
  }
}
for (const lv of ['G', 'F']) for (const [id, h] of Object.entries(HOST)) {
  if (!(id in ROOMS[lv])) continue;
  const hk = Object.values(ks).find((v) => v.rooms.split(/;\s*/).includes(`${lv} ${h}`));
  rule(hk ? edge(zr(lv, id), hk.rect) >= 1 || inside(hk.rect, zr(lv, id)) : zoneOf(lv, id) === zoneOf(lv, h), `${id} beside its host ${h}`);
}
const sec = zoneOf('G', 'AG11');
rule(sec && ['AG12', 'AG13'].every((id) => zoneOf('G', id) === sec), 'AG11, AG12, AG13 in one zone');
if (sec) rule(['AG11', 'AG12', 'AG13'].reduce((s, id) => s + front(id, sec.rect[3] - sec.rect[1]), 0) <= edge(sec.rect, K('K-SPINE-G')), 'AG11, AG12, AG13 all open to AG10 (brief 7)');
for (const lv of ['G', 'F']) for (const l of ['K-WLINK', 'K-ELINK']) rule(edge(K(`K-SPINE-${lv}`), K(l)) >= 3 && edge(K(`K-NCOR-${lv}`), K(l)) >= 3, `${lv} ${l} joins the spine and the north corridor (brief 12i)`);
for (const z of zones.filter((q) => q.lv !== 'R' && q.rect[3] === 60 && q.rooms.some((id) => !TIGHT.has(id)))) { const d = 60 - z.rect[1]; rule(d >= 5 && d <= 6.5, `${z.id} north row depth ${d}, not 5-6.5 (Michael)`); }
rule(K('K-BRIDGE')[0] === 40 && K('K-BRIDGE')[2] === 52 && K('K-BRIDGE')[1] === K('K-SPINE-F')[1] && area(K('K-BRIDGE')) === 42, 'bridge [40, z0, 52, z0 + 3.5], z0 = spine z0');
rule(edge(K('K-AF17'), K('K-SPINE-F')) >= 1 && edge(K('K-AF17'), K('K-BRIDGE')) >= 1, 'AF17 between the spine and the bridge');
rule(K('K-FS')[0] === 4 && edge(K('K-FS'), K('K-NCOR-G')) >= 3 && edge(K('K-FS'), K('K-NCOR-F')) >= 3, 'fire stair on the west wall, fire door on the corridor ring');
rule((K('K-STAIR')[0] + K('K-STAIR')[2]) / 2 > 22 && K('K-STAIR')[1] >= 43.5 && edge(K('K-STAIR'), K('K-SPINE-G')) >= 1, 'main stair north of the spine, east of centre');
rule(K('K-LIFT')[0] >= K('K-STAIR')[2] && edge(K('K-LIFT'), K('K-STAIR')) >= 1 && edge(K('K-LIFT'), K('K-LOBBY')) >= 1 && edge(K('K-LOBBY'), K('K-SPINE-G')) >= 1, 'lift east of the stair on its wall, landing on a lobby off the spine');
rule(K('K-RISER')[2] <= 16 && ['K-SPINE-G', 'K-NCOR-G', 'K-WLINK'].some((c) => edge(K('K-RISER'), K(c)) >= 1) && edge(K('K-RISER'), K('K-FS')) === 0 && edge(K('K-RISER'), K('K-STAIR')) === 0, 'cable riser in the west third, on the ring, beside no stair');
rule(K('K-AF10')[2] === 40 && K('K-AF10')[1] >= 43.5 && edge(K('K-PIPE'), K('K-AF10')) >= 1 && edge(K('K-AF10'), K('K-NCOR-F')) >= 1.5, 'plant gallery on the east wall north of the bridge, pipe riser off it, door on AF21');
rule(zr('G', 'AG01')[1] === 30 && zr('G', 'AG08')[1] === 30 && zr('G', 'AG08')[2] === 40, 'reception and goods on the south wall, goods at the east end');
rule(['AG01', 'AG02', 'AG03', 'AG08', 'AG09'].every((id) => edge(zr('G', id), zr('G', 'AG11')) === 0 && ov(zr('G', id), zr('G', 'AG11')) === 0), 'security zone touches no zone 2 zone');
rule(zr('G', 'AG22')[2] === 40, 'comms room zone at the east end');
rule(edge(zr('G', 'AG23'), K('K-LIFT')) === 0 && ov(zr('G', 'AG23'), K('K-LIFT')) === 0, 'lift shaft touches no zone 4 zone');
rule(['AF03', 'AF05', 'AF06'].every((id) => zoneOf('F', id) === zoneOf('F', 'AF02')), 'ops room, counter, tape and media in one zone');
rule(edge(zr('F', 'AF11'), K('K-AF10')) >= 1 && zr('F', 'AF11')[1] >= 43.5, 'pump room zone against the plant gallery at the north-east');
rule(zr('G', 'AG06')[1] === 30, 'AG06 zone on the south wall');
for (const [lv, id] of [['G', 'AG05'], ['F', 'AF20'], ['F', 'AF07'], ['F', 'AF09'], ['F', 'AF02'], ['F', 'AF08']]) rule(outside(zr(lv, id)), `${id} zone on an outside wall`);
rule(ov(zr('R', 'AR02'), K('K-PIPE')) > 0, 'chiller zone over the pipe riser hatch');
for (const f of fail) console.log(`FAIL ${f}`);
for (const i of info) console.log(`INFO ${i}`);
for (const z of zones) console.log(`${z.id} fill ${(z.fill * 100).toFixed(1)}% spare ${z.spare.toFixed(1)} doors ${z.door}`);
console.log(`zones ${zones.length}, fixed ${Object.keys(ks).length}, fails ${fail.length}, info ${info.length}`);
process.exit(fail.length ? 1 : 0);
