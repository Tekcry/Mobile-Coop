// P03B 1c zone check: Building B (strip, hall block) and the generator wing. Tiling, fill, brief coverage, fixed blocks, door access, brief 7 and 8 rules.
// Rows: zones start "| B-" or "| W-", fixed blocks "| KB-". A's K-BRIDGE row is read for the bridge landing.
import { readFileSync } from 'node:fs';
const md = readFileSync(process.argv[2], 'utf8');
const B = [52, 30, 100, 60], STRIP = [52, 30, 70, 60], HALLB = [70, 30, 100, 60], WING = [52, 62, 76, 74];
// brief 02 section 5 rect areas (clear + 0.3 each way); cages and catwalks sit inside BG20 / BG40 (area 0); BR03, BR06, BR01 are open roof
const ROOMS = {
  G: { BG01: 30, BG02: 32, BG03: 6.25, BG04: 8.75, BG05: 91, BG06: 40, BG07: 42, BG08: 14, BG09: 42, BG10: 50.75, BG11: 35, BG12: 22.75, BG13: 27, BG14: 30, BG15: 3, BG16: 6.25,
    BG20: 377, BG21: 0, BG22: 0, BG23: 120, BG24: 91, BG25: 48, BG26: 36, BG27: 42, BG28: 30, BG29: 24, BG30: 54, BG31: 24, BG33: 54, BG40: 216, BG41: 0, BG42: 36, BG43: 36 },
  F: { BF01: 63, BF02: 32, BF03: 6.25, BF04: 8.75, BF05: 49, BF06: 14, BF07: 18, BF08: 42, BF09: 16.5, BF10: 27, BF11: 22.75, BF12: 3, BF13: 42, BF14: 20, BF15: 30 },
  H: { BR04: 24, BR05: 4 },
  R: { BR02: 22.75 },
};
const DIMS = { BG01: [6, 5], BG06: [8, 5], BG07: [7, 6], BG08: [4, 3.5], BG09: [7, 6], BG11: [7, 5], BG14: [6, 5], BG16: [2.5, 2.5], BF06: [4, 3.5], BF13: [7, 6], BF14: [5, 4], BF15: [6, 5] };
const HOST = { BG08: 'BG07', BG11: 'BG10' }; // entered through a host (brief 5 Doors to)
const LOOSE = new Set(['BG01', 'BG06', 'BG07', 'BG08', 'BG09', 'BG11', 'BG14', 'BG16', 'BF01', 'BF06', 'BF13', 'BF14', 'BF15', 'BR04', 'BR05']); // all others are tight
const CIRC = new Set(['KB-COR-G', 'KB-COR-F', 'KB-COR-F2']);
const cells = (l) => l.split('|').slice(1, -1).map((c) => c.trim());
const rows = md.split('\n').filter((l) => /^\| (B-|W-|KB-)/.test(l)).map(cells).filter((r) => r[2]?.startsWith('['));
const zones = rows.filter((r) => !r[0].startsWith('KB-')).map((r) => ({ id: r[0], lv: r[1], rect: JSON.parse(r[2]), rooms: r[3] === '-' ? [] : r[3].split(/,\s*/), src: r[r.length - 1] }));
const ks = Object.fromEntries(rows.filter((r) => r[0].startsWith('KB-')).map((r) => [r[0], { rect: JSON.parse(r[2]), parts: r[3].split(/;\s*/).map((p) => p.split(' ')), src: r[r.length - 1] }]));
const bridgeRow = md.split('\n').find((l) => l.startsWith('| K-BRIDGE '));
const BRIDGE = bridgeRow ? JSON.parse(cells(bridgeRow)[2]) : [0, 0, 0, 0];
const fail = [];
const rule = (ok, msg) => { if (!ok) fail.push(msg); };
const area = ([a, b, c, d]) => (c - a) * (d - b);
const ov = (p, q) => Math.max(0, Math.min(p[2], q[2]) - Math.max(p[0], q[0])) * Math.max(0, Math.min(p[3], q[3]) - Math.max(p[1], q[1]));
const xo = (p, q) => Math.min(p[2], q[2]) - Math.max(p[0], q[0]);
const zo = (p, q) => Math.min(p[3], q[3]) - Math.max(p[1], q[1]);
const horiz = (p, q) => (p[1] === q[3] || p[3] === q[1]) && xo(p, q) > 0;
const edge = (p, q) => (horiz(p, q) ? xo(p, q) : (p[0] === q[2] || p[2] === q[0]) && zo(p, q) > 0 ? zo(p, q) : 0);
const inside = (p, q) => p[0] >= q[0] && p[1] >= q[1] && p[2] <= q[2] && p[3] <= q[3];
const grid = (r) => r.every((v) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-9);
const front = (id, D) => { const [a, b] = [...DIMS[id]].sort((x, y) => x - y); return b <= D ? a : a <= D ? b : Infinity; };
for (const z of zones) {
  rule(grid(z.rect), `${z.id} off the 0.5 grid`);
  rule(inside(z.rect, B) || inside(z.rect, WING), `${z.id} outside B and the wing`);
  rule(z.src && z.src !== '-', `${z.id} has no source`);
  const lv = ROOMS[z.lv] ?? {};
  z.t = 0; z.n = 0;
  for (const id of z.rooms) {
    if (!(id in lv)) { fail.push(`${z.id} unknown room ${id} on ${z.lv}`); continue; }
    if (LOOSE.has(id)) z.n += lv[id]; else z.t += lv[id];
  }
  const room = area(z.rect) - z.t;
  z.fill = z.n ? z.n / room : 0;
  z.door = '-';
  rule(z.fill <= 0.85 + 1e-9, `${z.id} fill ${(z.fill * 100).toFixed(1)}% over 85%`);
}
const COVER = { G: area(B) + area(WING), F: area(STRIP) };
for (const lv of ['G', 'F', 'H', 'R']) {
  const zs = zones.filter((z) => z.lv === lv);
  for (let i = 0; i < zs.length; i++) for (let j = i + 1; j < zs.length; j++) rule(ov(zs[i].rect, zs[j].rect) === 0, `${lv} overlap ${zs[i].id} ${zs[j].id}`);
  if (COVER[lv]) { const s = zs.reduce((t, z) => t + area(z.rect), 0); rule(s === COVER[lv], `${lv} zones cover ${s} of ${COVER[lv]}`); }
  if (lv === 'F') rule(zs.every((z) => inside(z.rect, STRIP)), 'F zones inside the strip (brief 12h)');
  const seen = zs.flatMap((z) => z.rooms);
  for (const id of Object.keys(ROOMS[lv])) { const c = seen.filter((s) => s === id).length; rule(c === 1, `${lv} room ${id} in ${c} zones`); }
}
const zoneOf = (lv, id) => zones.find((z) => z.lv === lv && z.rooms.includes(id));
const zr = (lv, id) => zoneOf(lv, id)?.rect ?? [0, 0, 0, 0];
for (const [k, v] of Object.entries(ks)) {
  rule(grid(v.rect), `${k} off the 0.5 grid`);
  rule(v.src && v.src !== '-', `${k} has no source`);
  for (const [lv, id] of v.parts) {
    const z = id === '-' ? zones.find((q) => q.lv === lv && inside(v.rect, q.rect)) : zoneOf(lv, id);
    rule(z && inside(v.rect, z.rect), `${k} ${lv} ${id} not inside its zone`);
  }
}
const K = (id) => ks[id]?.rect ?? [0, 0, 0, 0];
const onLv = (k, lv) => ks[k]?.parts.some(([l]) => l === lv);
// door access: rooms with a corridor door need wall on circulation (corridor blocks, and on F the BF01 lobby zone)
for (const lv of ['G', 'F']) {
  const circ = Object.keys(ks).filter((k) => CIRC.has(k) && onLv(k, lv)).map(K);
  if (lv === 'F' && zoneOf('F', 'BF01')) circ.push(zr('F', 'BF01'));
  const fixed = Object.keys(ks).filter((k) => !CIRC.has(k) && onLv(k, lv)).map(K);
  for (const z of zones.filter((q) => q.lv === lv)) {
    const rs = z.rooms.filter((id) => id in DIMS && id !== 'BF01');
    if (!rs.length || circ.some((c) => inside(c, z.rect)) || z.rooms.includes('BF01')) continue;
    let best = null, avail = 0;
    for (const c of circ) { const e = edge(z.rect, c); avail += e; if (e > 0 && (!best || e > best.e)) best = { e, c }; }
    for (const f of fixed.filter((f) => inside(f, z.rect))) for (const c of circ) avail -= edge(f, c);
    const need = rs.reduce((s, id) => s + (HOST[id] ? 0 : best ? front(id, horiz(z.rect, best.c) ? z.rect[3] - z.rect[1] : z.rect[2] - z.rect[0]) : Infinity), 0);
    z.door = `${need} of ${avail}`;
    rule(best && need <= avail + 1e-9, `${z.id} doors need ${need} m of circulation wall, has ${avail}`);
  }
}
const hall = zr('G', 'BG20');
rule(edge(BRIDGE, zr('F', 'BF01')) >= 3.5 && BRIDGE[2] === 52, 'bridge lands on B west wall into the BF01 zone (brief 7)');
rule(edge(K('KB-STAIR'), zr('F', 'BF01')) >= 1, 'main stair lands on the BF01 zone (BF02 doors BF01)');
rule(edge(K('KB-LIFT'), K('KB-STAIR')) >= 1 && K('KB-LIFT')[3] === K('KB-STAIR')[1], 'lift beside the core on its south side (brief 8)');
rule(edge(K('KB-LIFT'), K('KB-COR-G')) >= 2 && inside(K('KB-LIFT'), zr('F', 'BF01')), 'lift opens to BG05 (G) and lands in the BF01 zone (F)');
rule([zr('F', 'BF07'), hall, zr('G', 'BG30'), zr('G', 'BG24'), zr('G', 'BG23')].every((r) => edge(K('KB-LIFT'), r) === 0 && ov(K('KB-LIFT'), r) === 0), 'lift touches no zone 4 or 5 zone (brief 7)');
const FS = K('KB-FS');
rule(FS[0] === 52 && FS[3] === 60, 'fire stair at the north-west corner, exit on the west wall (brief 8)');
rule(edge(FS, K('KB-BG10')) >= 1 && (edge(FS, K('KB-COR-F')) >= 1 || edge(FS, K('KB-COR-F2')) >= 1), 'fire stair doors on BG10 (G) and BF05 (F)');
const P = K('KB-BG10');
rule(P[2] === 70 && P[3] === 60 && edge(P, K('KB-COR-G')) >= 1 && edge(P, zr('G', 'BG28')) >= 3 && edge(P, zr('G', 'BG11')) >= 1, 'BG10 on the north wall (X07), reader off BG05, to BG28 and BG11 (brief 5, 7)');
rule(K('KB-WELL')[2] === 70 && edge(K('KB-WELL'), hall) >= 6, 'gallery stair foot BG13 opens on the hall west wall');
rule(K('KB-GALLERY')[2] === 70 && edge(K('KB-GALLERY'), hall) >= 5 && edge(K('KB-GALLERY'), K('KB-WELL')) >= 1, 'gallery looks over the hall, stair well beside it (brief 7, 12a)');
rule(zr('G', 'BG07')[1] === 30 && edge(zr('G', 'BG09'), hall) >= 6 && zoneOf('G', 'BG07') === zoneOf('G', 'BG09'), 'staging on the yard, build room on the hall wall, one zone (brief 7)');
rule(edge(hall, K('KB-COR-G')) === 0 && hall[1] > 30 && hall[3] < 60 && hall[2] < 100, 'hall touches neither BG05 nor the yard (brief 7)');
rule(edge(zr('G', 'BG23'), hall) >= 10 && zr('G', 'BG23')[2] === 100, 'cooling gallery along the hall east side');
rule(edge(zr('G', 'BG24'), hall) >= 10 && zr('G', 'BG24')[1] >= hall[3], 'inner plant corridor along the hall north side');
rule(['BG29', 'BG30', 'BG31', 'BG33'].every((id) => zoneOf('G', id) === zoneOf('G', 'BG29')) && edge(zr('G', 'BG29'), hall) >= 10, 'carrier rooms in one zone off the hall');
const R = K('KB-RISER');
rule(Object.keys(ks).filter((k) => CIRC.has(k)).some((k) => edge(R, K(k)) >= 1) && edge(R, K('KB-STAIR')) === 0 && edge(R, FS) === 0, 'cable riser off a corridor, beside no stair (brief 8)');
rule(edge(zr('F', 'BF06'), zr('F', 'BF01')) >= 1 || zoneOf('F', 'BF06') === zoneOf('F', 'BF01'), 'mantrap zone within sight of BF01 (brief 7)');
rule(['BF07', 'BF08', 'BF09', 'BF10'].every((id) => zoneOf('F', id) === zoneOf('F', 'BF06')), 'mantrap, secure corridor, gallery, well in one zone');
rule(zones.some((z) => z.lv === 'G' && z.rooms.includes('BG40') && z.rect.join() === WING.join()), 'wing zone is the whole wing');
rule(ov(zr('H', 'BR05'), hall) > 0, 'supply shaft zone over the hall (brief 9)');
for (const f of fail) console.log(`FAIL ${f}`);
for (const z of zones) console.log(`${z.id} fill ${(z.fill * 100).toFixed(1)}% doors ${z.door}`);
console.log(`zones ${zones.length}, fixed ${Object.keys(ks).length}, fails ${fail.length}`);
process.exit(fail.length ? 1 : 0);
