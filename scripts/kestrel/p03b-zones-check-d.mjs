// P03B 1d zone check: site, bridge roof, under the yard (level B) and level U; brief row count over sections 3-5.
// Usage: node p03b-zones-check-d.mjs docs/kestrel/03B-block-plan.md docs/kestrel/02-building-brief.md
// Section 5 rows: site zones "| S-", site items "| SI-", level B "| T-", level U "| U-", bridge roof "| L-", open roofs "| RF-".
import { readFileSync } from 'node:fs';
const md = readFileSync(process.argv[2], 'utf8');
const brief = readFileSync(process.argv[3] ?? 'docs/kestrel/02-building-brief.md', 'utf8');
const SITE = [0, 0, 108, 76], A = [4, 30, 40, 60], B = [52, 30, 100, 60], WING = [52, 62, 76, 74], HALLB = [70, 30, 100, 60], GAP = [40, 30, 52, 60];
const cells = (l) => l.split('|').slice(1, -1).map((c) => c.trim());
const body = md.split('\n## Appendix')[0];
const lines = body.split('\n');
const rows5 = lines.filter((l) => /^\| (S|SI|T|U|L|RF)-/.test(l)).map(cells).filter((r) => r[2]?.startsWith('['));
const Z = Object.fromEntries(rows5.map((r) => [r[0], { id: r[0], lv: r[1], rect: JSON.parse(r[2]), rooms: r[3] === '-' ? [] : r[3].split(/,\s*/), src: r[r.length - 1] }]));
const fail = [];
const rule = (ok, msg) => { if (!ok) fail.push(msg); };
const area = ([a, b, c, d]) => (c - a) * (d - b);
const ov = (p, q) => Math.max(0, Math.min(p[2], q[2]) - Math.max(p[0], q[0])) * Math.max(0, Math.min(p[3], q[3]) - Math.max(p[1], q[1]));
const xo = (p, q) => Math.min(p[2], q[2]) - Math.max(p[0], q[0]);
const zo = (p, q) => Math.min(p[3], q[3]) - Math.max(p[1], q[1]);
const edge = (p, q) => ((p[1] === q[3] || p[3] === q[1]) && xo(p, q) > 0 ? xo(p, q) : (p[0] === q[2] || p[2] === q[0]) && zo(p, q) > 0 ? zo(p, q) : 0);
const inside = (p, q) => p[0] >= q[0] && p[1] >= q[1] && p[2] <= q[2] && p[3] <= q[3];
const grid = (r) => r.every((v) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-9);
const R = (id) => Z[id]?.rect ?? [0, 0, 0, 0];
const byRoom = (id) => Object.values(Z).filter((z) => z.rooms.includes(id));
const rr = (id) => byRoom(id)[0]?.rect ?? [0, 0, 0, 0];
const rowRect = (prefix) => { const l = lines.find((x) => x.startsWith(`| ${prefix} `)); return l ? JSON.parse(cells(l)[2]) : [0, 0, 0, 0]; };
for (const z of Object.values(Z)) {
  rule(grid(z.rect), `${z.id} off the 0.5 grid`);
  rule(inside(z.rect, SITE), `${z.id} outside the site`);
  rule(z.src && z.src !== '-', `${z.id} has no source`);
}
// site G: top-level zones plus the three buildings tile the site
const top = Object.values(Z).filter((z) => z.id.startsWith('S-'));
for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) rule(ov(top[i].rect, top[j].rect) === 0, `site overlap ${top[i].id} ${top[j].id}`);
for (const z of top) rule([A, B, WING].every((b) => ov(z.rect, b) === 0), `${z.id} overlaps a building`);
const siteSum = top.reduce((t, z) => t + area(z.rect), 0) + area(A) + area(B) + area(WING);
rule(siteSum === area(SITE), `site zones plus buildings ${siteSum} of ${area(SITE)}`);
// site items sit inside their parent zone
const inZone = (id, room) => byRoom(room).some((z) => z.id.startsWith('S-') && inside(R(id), z.rect));
rule(inZone('SI-GATE', 'X03') && R('SI-GATE')[1] === 8 && R('SI-GATE')[0] <= 2, 'gatehouse X02 inside X03 at the lane fence west end (brief 4)');
rule(inZone('SI-BIN', 'X06') && R('SI-BIN')[2] <= 40 && R('SI-BIN')[3] <= 72.5, 'bin store X11 in the rear yard behind A, 3.5 m path kept along the viaduct (brief 5)');
rule(inZone('SI-APRON', 'X04') && R('SI-APRON')[3] === 30 && R('SI-APRON')[0] <= 64 && R('SI-APRON')[2] >= 70 && area(R('SI-APRON')) === 80, 'apron X12 10 x 8 in front of BG07 (x 64-70) on B front (brief 5, 1c note)');
const RACK = R('SI-RACK');
rule(inside(RACK, GAP) && RACK[0] === 40 && RACK[2] === 52 && RACK[1] >= 44 && RACK[3] <= 48.5 && RACK[3] - RACK[1] === 2, 'pipe rack X13 12 x 2 across the gap, north of the bridge, on AF10 (z 43.5-60) and B west wall clear of the stairs (z < 48.5) (brief 4, 9)');
// level B
const V = rr('TB01'), MH = rr('TB02'), TA = rr('TB03'), TBB = rr('TB04'), BR = rr('BG32');
rule(area(V) >= 48 && V[3] <= 30 && V[1] >= 8 && xo(V, GAP) >= 6, 'vault TB01 8 x 6 under the yard in front of the gap (brief 4)');
rule(area(MH) === 2.25 && MH[3] <= 30 && edge(MH, V) >= 1.5 && xo(MH, GAP) > 0, 'manhole TB02 1.5 x 1.5 in the yard in front of the gap, beside the vault (brief 4)');
const gEast = (() => { const l = lines.find((x) => /^\| G-EAST \|/.test(x)); return l ? JSON.parse(cells(l)[2]) : [0, 0, 0, 0]; })();
const w = (r) => Math.min(r[2] - r[0], r[3] - r[1]);
// 1g-c (Michael, 2026-10-11): vault moved 1.0 east off A; TB03 meets it over x 41-43 (2.0, a 1.7 clear door), not its full width.
rule(w(TA) - 0.3 >= 2.6 && edge(TA, V) >= 2.0 && edge(TA, gEast) >= 2, 'tunnel TB03 2.6 clear, from the vault to AG23 on G-EAST (brief 5)');
rule(w(TBB) - 0.3 >= 2.6 && edge(TBB, V) >= 2.6 && edge(TBB, BR) >= 1.5, 'tunnel TB04 2.6 clear, from the vault to the BG32 riser door (brief 5)');
const car = (() => { const l = lines.find((x) => /^\| B-GHCAR \|/.test(x)); return l ? JSON.parse(cells(l)[2]) : [0, 0, 0, 0]; })();
rule(area(BR) === 4 && inside(BR, car) && inside(BR, [70, 30, 74, 36]), 'riser BG32 2 x 2 under BG31 at the carrier band west end x 70-74 (1d decision)');
const lvB = ['TB01', 'TB03', 'TB04', 'BG32'].map(rr);
for (let i = 0; i < lvB.length; i++) for (let j = i + 1; j < lvB.length; j++) rule(ov(lvB[i], lvB[j]) === 0, `level B overlap ${i} ${j}`);
rule(lvB.every((r) => ov(r, A) === 0), 'level B stays out from under A (AG23 is A\'s shaft)');
// level U
rule(rr('BU01').join() === rowRect('B-GHALL').join(), 'BU01 is the hall zone (brief 5: 25.7 x 14.2)');
rule(rr('BU02').join() === [96, rr('BU01')[1], 100, rr('BU01')[3]].join(), 'BU02 under the cooling gallery, the hall band (brief 5: 3.7 x 14.2)');
// bridge roof
rule(rr('LF02').join() === rowRect('K-BRIDGE').join() && byRoom('LF02')[0]?.lv === 'L', 'LF02 on level L over the bridge (section 2)');
for (const [id, lv, r] of [['RF-A', 'R', A], ['RF-BS', 'R', [52, 30, 70, 60]], ['RF-BH', 'H', HALLB], ['RF-W', 'H', WING]]) rule(Z[id]?.lv === lv && R(id).join() === r.join(), `${id} is the whole roof on ${lv} (section 2)`);
// brief row count: every section 5 id of the brief appears in a rooms cell of sections 3-5
const sec5 = brief.split(/\n## 5\./)[1]?.split(/\n## 6\./)[0] ?? '';
const ids = [...new Set(sec5.split('\n').map((l) => /^\| ([A-Z]{1,2}\d{2}) \|/.exec(l)?.[1]).filter(Boolean))];
const seen = new Set();
for (const l of lines) { const c = cells(l); if (c.length > 3 && c[2]?.startsWith('[')) for (const m of c[3].matchAll(/\b([A-Z]{1,2}\d{2})\b/g)) seen.add(m[1]); }
const missing = ids.filter((i) => !seen.has(i));
const extra = [...seen].filter((i) => !ids.includes(i));
rule(!missing.length, `brief rows in no zone: ${missing.join(', ')}`);
rule(!extra.length, `ids not in the brief: ${extra.join(', ')}`);
for (const f of fail) console.log(`FAIL ${f}`);
console.log(`zones ${Object.keys(Z).length}, rows ${ids.length - missing.length} of ${ids.length}, fails ${fail.length}`);
process.exit(fail.length ? 1 : 0);
