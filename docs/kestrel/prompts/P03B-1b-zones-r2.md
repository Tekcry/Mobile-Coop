Stage P03B Part 1b (r2) - Building A zones at 36 x 30, all levels (G, F, R); bridge z0 = 40.
Model: Opus, medium effort.
Decisions: 20 (5 fixed-block choices stacked through the floors: corridor ring, main core, fire stair, cable riser, plant gallery with pipe riser; 7 ground zones, 6 first-floor zones, 2 roof zones; corridor and core zones follow from them)

## Rules for this session
- One deliverable: section 3 "Building A" of docs/kestrel/03B-block-plan.md, at most 110 lines, plus the check script below. Nothing else.
- Zones only (Michael, 2026-10-11): zones, corridors, cores, risers and the bridge line. No room rectangles, doors or objects inside zones; P04 places rooms. Do not read Appendix A or copy it.
- Candidate-first (RULES 7): the candidate below is precomputed. Write it to the file in your first reply, run the check, then fix failures one at a time, rerunning after each fix and committing after each improvement. If a failure cannot be fixed, write it as ASK with options (recommended first, RULES 9 4a) and stop.
- Realism first (Michael, 2026-10-11): if you change the candidate, the north row stays 5-6.5 m deep and every change must be what a real architect would draw. Resize zones within A yourself if a sum fails; do not ask Michael about sizes.
- Budget about 25 tool calls. Commit and push after each table.
- Supersedes prompts/P03B-1b-zones.md (A 36 x 24). Do not open it.

## 0. Start
1. Run: git checkout feature/kestrel && git pull && git branch --show-current
   If the branch is not feature/kestrel, stop and report.
2. Preconditions: progress.md shows P02 "APPROVED (revision A 36 x 30)"; 03B-block-plan.md section 1 has Building A [4, 30, 40, 60] and section 3 is a placeholder; 02-building-brief.md has rows AG26, AF21 and AF20 and no row AG07. If not, stop and report.
3. Read docs/kestrel/RULES.md sections 5, 6, 7 ("Task size" and "Reading and checking"), 8 and 9 only.

## 1. Read only these
- docs/kestrel/03B-block-plan.md sections 1 and 2 (lines 1-57).
- docs/kestrel/02-building-brief.md (grep -n '^#' first): section 2 (A plan form), the Building A table and its sums line in section 5, section 7, section 8, and tensions d and i in section 12. Line ranges only.

## 2. Plan form and why (planner, 2026-10-11)
Bands, south to north (z, wall centrelines): south row 30-40 (10 deep), spine 40-43.5 (fixed by bridge z0 = 40), core band 43.5-50.5 (7), north corridor 50.5-54 (3.5; its north wall on grid line z 54), north row 54-60 (6). 10 + 3.5 + 7 + 3.5 + 6 = 30.
- North row 6 m deep (about 5.6 clear): real cellular office depth, inside Michael's 5-6.5 m. Every north-row brief room (5-6 m on its short side) fits it.
- Main core stays turned (8 along x, 4 deep, lift on its east side): a 4 x 8 core standing north-south needs an 8 m band, which leaves a 5 m north row and pushes AF08 (7 x 6) out of it. Stairs parallel to the corridor, entered off the spine at the floor landing, are normal office core practice (general knowledge). Write this in 3.3 against tension d's "6.5 x 8.0 together".
- Corridor ring (brief 12i, "joined at both ends"): spine and north corridor joined by two 3.5 m links through the band: west link at the west wall, east link beside the core. Patrols get a loop and every band room has two corridor faces.
- Fire stair at the north-west corner, off the north corridor's west end; exit on the west wall from the bottom landing (brief 8). The west wall at band level is the west link, so the stair cannot sit there.
- Plant gallery AF10 runs north-south along the east wall (z 43.5-60), so the chilled-water pipes leave A north of the bridge (X13). Its reader door is off AF21's east end; AF11 sits in the north row against it; pipe riser AF19 sits against its west side.
- AG22 comms room stays in the band at the east end, across the spine from goods (1b-G ASK-4, Michael). The south row cannot take it: G south needs 306.25 / 0.85 + 4 = 364 m2 of 360 with AG22, 340 without.

## 3. Feasibility sums (planner, 2026-10-11; brief 5 rect areas = clear + 0.3 each way)
Tight blocks (corridors, links, cores, stairs, shafts, risers, AF17, AF10) are listed, not held to 85%. A zone passes when its other rooms fill at most 85% of (zone area - its tight blocks).

| Floor | Corridor blocks (spine + north + links) | Other tight | Other rooms | Needed: tight + others / 0.85 | Floor | Spare |
| --- | --- | --- | --- | --- | --- | --- |
| G | 126 + 126 + 49 = 301 | 76.75: core 47, AG21 22.75, AG23 4, AG25 3 | 501.25 | 377.75 + 589.7 = 967.5 | 1080 | 112.5 |
| F | 113.75 + 113.75 + 49 = 276.5 | 145.75: AF10 block 57.75, AF17 block 12.25, core 47, AF15 22.75, AF16 3, AF19 3 | 393 | 422.25 + 462.4 = 884.6 | 1080 | 195.4 |
| R | - | AR04 22.75 | 90 (AR02, AR03) | 22.75 + 105.9 = 128.6 | 1080 | 951 |

Bands: G south 360 needs 286.25 / 0.85 = 336.8; G band 252 needs 103 + 90 / 0.85 = 208.9; G north 216 needs 22.75 + 125 / 0.85 = 169.8. F south 360 needs 266 / 0.85 = 312.9; F north row (x 4-36.5) 195 needs 22.75 + 137 / 0.85 = 183.9.

Door frontage (Michael's note: every room with a corridor door, against both corridors and the links). Front = the room's short side if its long side fits the zone depth D, else its long side. Rooms entered through a host room need none unless their short side is over D - 3 (nothing fits in front of them: AG08, AF02, AF11 count). Available = the zone's edges on corridor blocks less the edges fixed blocks inside it use.

| Zone | D | Rooms and fronts (m) | Need | Available |
| --- | --- | --- | --- | --- |
| G-FRONT | 10 | AG01 9, AG04 4 (AG02, AG03 off AG01) | 13 | 18 (spine) |
| G-SOFF | 10 | AG06 6 | 6 | 6.5 |
| G-GOODS | 10 | AG08 8 (counts), AG09 3 | 11 | 11.5 |
| G-SEC | 7 | AG11 5, AG12 4, AG13 3, all on the spine (brief 7) | 12 | 12 on the spine; 27.5 all edges less the riser |
| G-CORE | 7 | AG16 2, AG17 1.5 (off AG26 behind the stair) | 3.5 | 16 |
| G-EAST | 5.5 | AG22 4 (AG23 off AG22) | 4 | 18 |
| G-NW | 6 | AG05 5, AG15 4 | 9 | 9.5 (16 less the fire stair 6.5) |
| G-NE | 6 | AG14 8, AG24 7 | 15 | 20 |
| F-SW | 10 | AF20 6 | 6 | 7 |
| F-OPS | 10 | AF02 12 (counts), AF03 3, AF05 5, AF06 4 | 24 | 25.5 |
| F-BW | 7 | AF04 5, AF18 4 | 9 | 27.5 |
| F-NW | 6 | AF07 5, AF09 5 | 10 | 10.5 |
| F-NE | 6 | AF08 7, AF11 7 (counts) | 14 | 15.5 |

Totals: G 73.5 m needed against 127 available; F 63 against 86 (the old single spine gave 60 against 68.5).

## 4. Candidate to verify (sources on each row; correct any row that breaks the brief and say why)
Fixed blocks (same rect on every level listed):

| K-id | Levels | Rect [x0, z0, x1, z1] | Rooms by level | Size | Source |
| --- | --- | --- | --- | --- | --- |
| K-SPINE-G | G | [4, 40, 40, 43.5] | G AG10 | 36 x 3.5 | brief 5 AG10, 12i; window at both ends |
| K-SPINE-F | F | [4, 40, 36.5, 43.5] | F AF01 | 32.5 x 3.5 | brief 5 AF01; ends at AF17 |
| K-NCOR-G | G | [4, 50.5, 40, 54] | G AG26 | 36 x 3.5 | brief 5 AG26, 12i |
| K-NCOR-F | F | [4, 50.5, 36.5, 54] | F AF21 | 32.5 x 3.5 | brief 5 AF21, 12i; ends at AF10 |
| K-WLINK | G, F | [4, 43.5, 7.5, 50.5] | G -; F - | 3.5 x 7 | brief 12i (joined at both ends) |
| K-ELINK | G, F | [31, 43.5, 34.5, 50.5] | G -; F - | 3.5 x 7 | brief 12i |
| K-FS | G, F, R | [4, 54, 10.5, 57.5] | G AG21; F AF15; R AR04 | 6.5 x 3.5 | brief 8 (west end, exit on the west wall); section 2 above |
| K-RISER | G, F | [7.5, 49, 9.5, 50.5] | G AG25; F AF16 | 2 x 1.5 | brief 8 (west third, beside no stair); door off the west link |
| K-STAIR | G, F | [19.5, 43.5, 27.5, 47.5] | G AG18; F AF12 | 8 x 4 (turned) | brief 8 (north of the spine, east of centre: centre x 23.5 > 22) |
| K-LOBBY | G, F | [27.5, 43.5, 31, 46] | G AG20; F AF14 | 3.5 x 2.5 | brief 5, 8 |
| K-LIFT | G, F | [27.5, 46, 30, 48.5] | G AG19; F AF13 | 2.5 x 2.5 | brief 8 (east side, shares the core wall) |
| K-AF17 | F | [36.5, 40, 40, 43.5] | F AF17 | 3.5 x 3.5 (clear 3.2 x 3.2, brief 3.2 x 2.7) | brief 7 (in line with LF01, BF01) |
| K-BRIDGE | F, L | [40, 40, 52, 43.5] | F LF01; L LF02 | 12 x 3.5 | section 2; bridge z0 = 40 |
| K-AF10 | F | [36.5, 43.5, 40, 60] | F AF10 | 3.5 x 16.5 (brief 16; runs to the north wall) | brief 5, 7 (north-east, X13) |
| K-PIPE | F, R | [34.5, 43.5, 36.5, 45] | F AF19; R - | 2 x 1.5 | brief 8 (off AF10, hatch by the chillers) |

Zones (G and F tile A [4, 30, 40, 60] exactly; R lists only plant zones, the rest is open roof AR01):

| Zone | Level | Rect [x0, z0, x1, z1] | Rooms | Area | Fill | Note | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| G-FRONT | G | [4, 30, 22, 40] | AG01, AG02, AG03, AG04 | 180 | 81.3% | zone 2, main door to X03; AG04 hatch to AG01 | brief 5, 7 |
| G-SOFF | G | [22, 30, 28.5, 40] | AG06 | 65 | 73.8% | south window (brief 5) | brief 5 |
| G-GOODS | G | [28.5, 30, 40, 40] | AG08, AG09 | 115 | 80.0% | zone 2, south-east, roller door | brief 5, 7 |
| G-SPINE | G | [4, 40, 40, 43.5] | AG10 | 126 | tight | spine | brief 5, 12i |
| G-WLINK | G | [4, 43.5, 7.5, 50.5] | - | 24.5 | tight | west link | brief 12i |
| G-SEC | G | [7.5, 43.5, 19.5, 50.5] | AG11, AG12, AG13, AG25 | 84 | 76.5% | 3+, all three on the spine, no contact with zone 2 | brief 6, 7 |
| G-CORE | G | [19.5, 43.5, 31, 50.5] | AG18, AG19, AG20, AG16, AG17 | 80.5 | 23.9% | main core; cleaner's store behind it off AG26 | brief 8 |
| G-ELINK | G | [31, 43.5, 34.5, 50.5] | - | 24.5 | tight | east link | brief 12i |
| G-EAST | G | [34.5, 43.5, 40, 50.5] | AG22, AG23 | 38.5 | 58.0% | across the spine from goods (1b-G ASK-4, Michael) | brief 7 |
| G-NCOR | G | [4, 50.5, 40, 54] | AG26 | 126 | tight | north corridor | brief 5, 12i |
| G-NW | G | [4, 54, 20, 60] | AG21, AG05, AG15 | 96 | 68.3% | fire stair; AG05 north window | brief 5, 8 |
| G-NE | G | [20, 54, 40, 60] | AG14, AG24 | 120 | 62.5% | locker room, LV switchroom | brief 5 |
| F-SW | F | [4, 30, 11, 40] | AF20 | 70 | 68.6% | office, south window | brief 5 |
| F-OPS | F | [11, 30, 40, 40] | AF02, AF03, AF05, AF06 | 290 | 54.5% | counter at the ops door beside tape and media | brief 7 |
| F-SPINE | F | [4, 40, 36.5, 43.5] | AF01 | 113.75 | tight | spine | brief 5 |
| F-VEST | F | [36.5, 40, 40, 43.5] | AF17 | 12.25 | tight | bridge vestibule | brief 7 |
| F-WLINK | F | [4, 43.5, 7.5, 50.5] | - | 24.5 | tight | west link | brief 12i |
| F-BW | F | [7.5, 43.5, 19.5, 50.5] | AF04, AF18, AF16 | 84 | 61.7% | records (walls to slab), staff WC | brief 5 |
| F-CORE | F | [19.5, 43.5, 31, 50.5] | AF12, AF13, AF14 | 80.5 | tight | main core | brief 8 |
| F-ELINK | F | [31, 43.5, 34.5, 50.5] | - | 24.5 | tight | east link | brief 12i |
| F-E | F | [34.5, 43.5, 36.5, 50.5] | AF19 | 14 | tight | pipe riser against AF10 | brief 8 |
| F-PLANT | F | [36.5, 43.5, 40, 60] | AF10 | 57.75 | tight | plant gallery on the east wall, X13 leaves north of the bridge | brief 7, 9 |
| F-NCOR | F | [4, 50.5, 36.5, 54] | AF21 | 113.75 | tight | north corridor | brief 5, 12i |
| F-NW | F | [4, 54, 21, 60] | AF15, AF07, AF09 | 102 | 75.7% | fire stair; offices, north windows | brief 5, 8 |
| F-NE | F | [21, 54, 36.5, 60] | AF08, AF11 | 93 | 82.8% | kitchen with windows; pump room against AF10 | brief 5, 7 |
| R-BULK | R | [4, 54, 10.5, 57.5] | AR04 | 22.75 | tight | over the fire stair | brief 8 |
| R-PLANT | R | [28, 43.5, 40, 54.5] | AR02, AR03 | 132 | 68.2% | chillers over AF19's hatch; AHU beside the spine; east roof edge at z 40-43.5 kept clear for the LF02 ladder | brief 9, 10 |

## 5. Check script
Save as scripts/kestrel/p03b-zones-check.mjs (exactly this; 1c reuses it with its own rooms). Run: `timeout 60 node scripts/kestrel/p03b-zones-check.mjs docs/kestrel/03B-block-plan.md`

```js
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
```

Planner test run on the candidate tables in this file (2026-10-11): `zones 27, fixed 15, fails 0, info 0`. Never write that it passed unless you ran it on 03B-block-plan.md.

## 6. Write section 3
Replace the placeholder paragraph under "## 3. Building A" with:
- 3.1 "Plan form": section 2 above in at most 8 lines (bands and depths, why the core stays turned, the ring, fire stair corner, AF10 on the east wall).
- 3.2 "Fixed blocks": the K table (verified).
- 3.3 "Zones": the zone table (verified) with a "Doors (need of available)" column filled from the script, and the script's summary line under it.
- 3.4 "Deviations": the turned main core (against tension d); corridors longer than the brief's 30 (spine and north corridor 36 on G, 32.5 on F) and the two links (49 m2 per floor), which the ring in brief 12i needs but section 5 does not list; AF17 3.5 x 3.5; AF10 16.5 long to the north wall; door targets: brief rows that say AG10 or AF01 open off the ring instead: AG16, AG17 (AG26), AG21 and AF15 (north corridor west end; brief 8 "west end of the spine"), AG25 and AF16 (west link), AF10 (AF21); anything else you changed.
- 3.5 "Notes for P04, 1c and P03R": AG06 is 8 deep in a 10 m zone (P04: full depth or a door lobby, keep the south window); AF02 takes 12 m of spine wall with AF03 beside it (nothing fits in front); AG24 and AG23 off the lift; bridge z0 = 40, so BF01 in 1c takes B's west wall at z 40-43.5; X13 leaves AF10's east wall north of the bridge (z 43.5-60), so BF13 sits at B's north-west; level L footprint [40, 40, 52, 43.5]; the LF02 ladder lands on A's roof at the east edge, z 40-43.5; for P03R: grid line z 42 runs down the middle of the spine and z 48 through the band, so columns stand in corridors and rooms (recommend A's z column lines on the corridor walls: 30, 40, 43.5, 50.5, 54, 60), and brief 5 door targets and section 8's fire stair line need the ring wording.
- 3.6 "ASKs" only if needed (options, recommended first, RULES 9 4a).
Line 2 of the file: "Status: DRAFT (Part 1b done: A zones; Part 1c next)". Update section 2's F and L rows to read bridge [40, 40, 52, 43.5] (z0 = 40).

## 7. Self-check (all from a command; paste the summary line)
- The script above: 0 fails.
- Universal checks (RULES 7): every rect and number has a source (script); every brief room of A's G, F and R is in exactly one zone (script); every room reaches a corridor or its host room by a door (script door-access rule, host rule, security-on-spine rule); every brief 7 and 8 rule for A is a script rule or listed in 3.5 for P04.
- Realism: north row 5-6.5 deep (script); say in the report whether any zone would look wrong to an architect.

## 8. End (RULES 9)
- progress.md: P03B row "DRAFT (parts 1a, 1b)", date; one log line (at most 6 lines). One line in lessons.md.
- git add only 03B-block-plan.md, scripts/kestrel/p03b-zones-check.mjs, progress.md and lessons.md. Commit "kestrel P03B 1b: Building A zones (36 x 30)". Push.
- Report in at most 8 lines, then the Next step block: "Next step:" 1. Type /clear. 2. Stay on Opus, medium. 3. Send the prompt below: `Planner: next` (alone in a fenced code block).
- STOP.