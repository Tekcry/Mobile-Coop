// P03B 1e check: vertical circulation (stairs, lifts, risers, shafts, roof ladders) and the per-building fire stair check.
// Reads every table row whose third cell is a rect: zones (3.3, 4.3, 5.2), fixed blocks (K-, KB-) and section 6.1 rows (V-).
// V rows: | Id | Levels | Rect | Kind | Rooms | Opens to | Fit | Source |. Clear size = rect - 0.3 each way (brief 5 convention).
import { readFileSync } from 'node:fs';
const md = readFileSync(process.argv[2], 'utf8');
const cells = (l) => l.split('|').slice(1, -1).map((c) => c.trim());
const R = {}, V = {};
for (const l of md.split('\n')) {
  if (!l.startsWith('| ')) continue;
  const c = cells(l);
  if (!c[2]?.startsWith('[')) continue;
  let rect; try { rect = JSON.parse(c[2]); } catch { continue; }
  R[c[0]] = rect;
  if (c[0].startsWith('V-')) V[c[0]] = { lv: c[1], rect, kind: c[3], rooms: c[4], opens: c[5], fit: c[6], src: c[7] };
}
const fail = [], info = [];
const rule = (ok, msg) => { if (!ok) fail.push(msg); };
const r = (id) => R[id] ?? [0, 0, 0, 0];
const xo = (p, q) => Math.min(p[2], q[2]) - Math.max(p[0], q[0]);
const zo = (p, q) => Math.min(p[3], q[3]) - Math.max(p[1], q[1]);
const edge = (p, q) => ((p[1] === q[3] || p[3] === q[1]) && xo(p, q) > 0 ? xo(p, q) : (p[0] === q[2] || p[2] === q[0]) && zo(p, q) > 0 ? zo(p, q) : 0);
const inside = (p, q) => p[0] >= q[0] && p[1] >= q[1] && p[2] <= q[2] && p[3] <= q[3];
const ov = (p, q) => xo(p, q) > 0 && zo(p, q) > 0;
const same = (p, q) => p.every((v, i) => v === q[i]);
const grid = (p) => p.every((v) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-9);
const EXPECT = { 'V-ASTAIR': 'K-STAIR', 'V-ALIFT': 'K-LIFT', 'V-AFS': 'K-FS', 'V-ARISER': 'K-RISER', 'V-APIPE': 'K-PIPE',
  'V-BSTAIR': 'KB-STAIR', 'V-BLIFT': 'KB-LIFT', 'V-BFS': 'KB-FS', 'V-BRISER': 'KB-RISER', 'V-GAL': 'KB-WELL',
  'V-BG32': 'T-RISER', 'V-TB02': 'T-MH', 'V-AG23': null, 'V-BR05': null, 'V-LAD1': null, 'V-LAD2': null, 'V-LAD3': null };
const MIN = { lift: [2.2, 2.2], shaft: [1.7, 1.7], manhole: [1.2, 1.2], riser: [1.7, 1.2] };
const RISE = 4.2 / 26;
for (const [id, k] of Object.entries(EXPECT)) {
  const v = V[id];
  if (!v) { fail.push(`${id} missing`); continue; }
  rule(grid(v.rect), `${id} off the 0.5 grid`);
  rule(v.src && v.src !== '-', `${id} has no source`);
  if (k) rule(same(v.rect, r(k)), `${id} rect differs from ${k} ${JSON.stringify(r(k))}`);
  const w = v.rect[2] - v.rect[0] - 0.3, d = v.rect[3] - v.rect[1] - 0.3;
  const [s, L] = [Math.min(w, d), Math.max(w, d)].map((x) => Math.round(x * 100) / 100);
  if (MIN[v.kind]) { const [a, b] = MIN[v.kind]; rule(s >= b - 1e-9 && L >= a - 1e-9, `${id} clear ${s} x ${L} under ${a} x ${b}`); }
  if (['dogleg', 'fire', 'straight'].includes(v.kind)) {
    const g = Number(/going ([\d.]+)/.exec(v.fit)?.[1]);
    rule(g >= 0.25 && g <= 0.4, `${id} going ${g} outside 0.25-0.40`);
    const sum = 2 * RISE + g;
    rule(sum >= 0.55 && sum <= 0.7, `${id} 2R+G ${sum.toFixed(3)} outside 0.55-0.70`);
    if (v.kind === 'dogleg') {
      rule(L >= 12 * g + 4.0 - 1e-9, `${id} flights 12 x ${g} + 2 x 2.0 landings = ${(12 * g + 4).toFixed(2)} over ${L}`);
      rule(s >= 3.7 - 1e-9, `${id} width ${s} under 2 x 1.85`);
    } else if (v.kind === 'fire') {
      const fw = (s - 0.3) / 2, land = (L - 12 * g) / 2;
      rule(land >= 1.2, `${id} landings ${land.toFixed(2)} under 1.2`);
      if (land < fw - 1e-9) info.push(`${id} landings ${land.toFixed(2)} shorter than flight width ${fw.toFixed(2)} (Part K, general knowledge)`);
    } else {
      const land = Number(/landing ([\d.]+)/.exec(v.fit)?.[1]);
      rule(L >= 24 * g + land - 1e-9, `${id} flights 24 x ${g} + landing ${land} = ${(24 * g + land).toFixed(2)} over ${L}`);
      rule(land >= 2.4 - 1e-9 && s >= 2.4, `${id} landing ${land} or width ${s} under the 2.4 stair width`);
    }
  }
}
const A = [4, 30, 40, 60], STRIP = [52, 30, 70, 60];
// access: stairs and lifts open onto circulation
rule(edge(r('V-ASTAIR'), r('K-SPINE-G')) >= 1 && edge(r('V-ASTAIR'), r('K-SPINE-F')) >= 1, 'A main stair opens onto the spine on G and F (brief 8)');
rule(edge(r('V-ALIFT'), r('K-LOBBY')) >= 2 && edge(r('K-LOBBY'), r('K-SPINE-G')) >= 2, 'A lift opens to its lobby, lobby onto the spine');
rule(edge(r('V-BSTAIR'), r('KB-COR-G')) >= 1, 'B main stair opens onto BG05 on G (brief 5 BG02)');
rule(edge(r('V-BSTAIR'), r('B-FLOBBY')) >= 1 || edge(r('V-BSTAIR'), r('KB-COR-F')) >= 1, 'B main stair opens onto BF01 or BF05 on F');
rule(edge(r('V-BLIFT'), r('KB-COR-G')) >= 2, 'B lift opens to BG05 (BG04 bay)');
rule(edge(r('V-ALIFT'), r('G-SEC')) === 0 && edge(r('V-ALIFT'), r('G-EAST')) === 0, 'A lift touches no slab-wall zone (brief 7)');
// risers and shafts beside no stair (brief 8)
const stairs = ['V-ASTAIR', 'V-AFS', 'V-BSTAIR', 'V-BFS', 'V-GAL'];
for (const id of ['V-ARISER', 'V-APIPE', 'V-BRISER', 'V-AG23', 'V-BG32', 'V-TB02', 'V-BR05']) rule(stairs.every((s) => edge(r(id), r(s)) === 0 && !ov(r(id), r(s))), `${id} beside a stair`);
// shafts
const ag = r('V-AG23');
rule(inside(ag, r('G-EAST')) && ag[2] === 40 && ag[1] >= 43.5 && ag[3] <= 47.5, 'AG23 in G-EAST on the east wall within z 43.5-47.5 (5.4)');
rule(edge(ag, r('T-TUNA')) >= 1.5, 'AG23 meets TB03 by a door in its west wall');
rule(inside(r('V-BG32'), [70, 30, 74, 36]), 'BG32 under BG31 (x 70-74, 5.4)');
rule(edge(r('V-TB02'), r('T-VAULT')) >= 1.5, 'TB02 on the vault wall');
const br = r('V-BR05');
rule(inside(br, r('B-HSUPPLY')) && inside(br, r('B-GHALL')), 'BR05 inside B-HSUPPLY and over the hall');
// roof ladders
const l1 = r('V-LAD1'), l2 = r('V-LAD2'), l3 = r('V-LAD3');
rule(inside(l1, r('RF-A')) && l1[2] === 40 && zo(l1, r('L-ROOF')) >= 1, 'LAD1 on A roof east edge over LF02');
rule(inside(l2, r('RF-BS')) && l2[0] === 52 && zo(l2, r('L-ROOF')) >= 1, 'LAD2 on B strip roof west edge over LF02');
rule(inside(l3, r('RF-BS')) && l3[2] === 70 && zo(l3, r('B-HSUPPLY')) <= 0 && !ov(l3, r('B-RBULK')), 'LAD3 on B strip roof east edge, lands clear of the AHU zone');
// fire stair per building (A30 cannot tell buildings apart; brief 8)
const afs = r('V-AFS'), bfs = r('V-BFS');
rule(inside(afs, A) && afs[0] === A[0] && V['V-AFS']?.lv.includes('R'), 'A fire stair in A, exit on the west wall, to the roof');
rule(edge(afs, r('K-NCOR-G')) >= 1 && edge(afs, r('K-NCOR-F')) >= 1 && same(afs, r('R-BULK')), 'A fire stair off the north corridor on G and F, bulkhead above');
rule(inside(bfs, STRIP) && bfs[3] === STRIP[3] && edge(bfs, r('S-PASS')) >= 1 && V['V-BFS']?.lv.includes('R'), 'B fire stair in the strip, exit on the north wall into X07 (6.3, Michael 2026-10-11), to the roof');
rule(edge(bfs, r('KB-BG10')) >= 1 && edge(bfs, r('KB-COR-F2')) >= 1 && same(bfs, r('B-RBULK')), 'B fire stair off BG10 (G) and BF05 end bay (F), bulkhead above');
for (const f of fail) console.log('FAIL', f);
for (const i of info) console.log('INFO', i);
console.log(`vert ${Object.keys(V).length}, fails ${fail.length}, info ${info.length}`);
process.exit(fail.length ? 1 : 0);
