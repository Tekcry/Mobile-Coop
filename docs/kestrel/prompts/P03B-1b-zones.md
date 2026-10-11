Stage P03B Part 1b - Building A zones, all levels (G, F, R); sets the bridge z0.
Model: Opus, medium effort.
Decisions: 18 (6 fixed blocks stacked through the floors, 7 ground zones, 4 first-floor zones, 1 roof zone; the rest follow from them)

## Rules for this session
- One deliverable: section 3 "Building A" of docs/kestrel/03B-block-plan.md, at most 90 lines, plus the check script below. Nothing else.
- Zones only (Michael, 2026-10-11): zones, corridors, cores, risers and the bridge line. No room rectangles, doors or objects inside zones; P04 places rooms. Appendix A is a sketch: do not read it, do not copy it.
- Candidate-first (RULES 7): the candidate below is precomputed. Write it to the file in your first reply, run the check, then fix failures one at a time, rerunning after each fix and committing after each improvement. If a failure cannot be fixed, write it as ASK with options (recommended first) and stop.
- Budget about 25 tool calls. Commit and push after each table.

## 0. Start
1. Run: git checkout feature/kestrel && git pull && git branch --show-current
   If the branch is not feature/kestrel, stop and report.
2. Preconditions: 03B-block-plan.md has sections 1 and 2 and a section 3 placeholder; 02-building-brief.md has row AF20 and no row AG07. If not, stop and report.
3. Read docs/kestrel/RULES.md sections 5, 6, 7 ("Task size" and "Reading and checking"), 8 and 9 only.

## 1. Read only these
- docs/kestrel/03B-block-plan.md sections 1 and 2 (lines 1-57).
- docs/kestrel/02-building-brief.md (grep -n '^#' first): the Building A table and its sums line in section 5, section 7, section 8, and tension d in section 12. Line ranges only.

## 2. Feasibility sums (planner, 2026-10-11, from brief 5 rect areas = clear + 0.3 each way)
Tight blocks are what the brief fixes: corridors, stair and lift cores, shafts, risers, the bridge vestibule. They are listed, not held to 85%. A zone passes when its other rooms fill at most 85% of (zone area - its tight blocks).

| Floor | All rooms | Tight blocks | Other rooms | Needed: tight + others / 0.85 | Floor area | Spare |
| --- | --- | --- | --- | --- | --- | --- |
| G | 683 (AG07 moved to AF20) | 181.75: AG10 105, AG18-20 core 47, AG21 22.75, AG23 4, AG25 3 | 501.25 | 181.75 + 589.7 = 771.5 | 864 | 92.5 |
| F | 640.25 | 247.25: AF01 105, AF10 56, AF12-14 core 47, AF15 22.75, AF17 10.5, AF16 3, AF19 3 | 393 | 247.25 + 462.4 = 709.6 | 864 | 154.4 |
| R | 112.75: AR02 72, AR03 18, AR04 22.75 | AR04 | 90 | 22.75 + 105.9 = 128.6 | 864 | 735 |

Bands (spine z 40-43.5): G south 360 m2 needs 294.25 / 0.85 = 346.2 (13.8 spare); G north 378 needs 73.75 + 207 / 0.85 = 317.3 (60.7 spare); F south 360 needs 266 / 0.85 = 312.9; F north 378 needs 128.75 + 127 / 0.85 = 278.2. Spine bands hold only tight blocks.
Lengths and widths:
- F spine band is 36 long: riser end 2.5 + AF01 30 + AF17 3.5 = 36. So fire stair A cannot sit in the band; it sits north of it at the west end (both floors, stacked).
- AF10 is 16 x 3.5 and must reach the east wall at the north-east (brief 7, X13). Along the north wall it needs x 24-40, z 50.5-54. A main core 8 deep north of the spine (43.5 + 8 = 51.5) east of centre (x > 22) would cut it. So the main stair core is turned: 8 along x, 4 deep, with the lift on its east side and the lobby in front of the lift, 11.5 x 5 in all (still 4.0 x 8.0 and lift 2.5 x 2.5 per brief 8; write this in Deviations against tension d's "6.5 x 8.0 together").
- G security row: AG11 6 + AG12 5 + AG13 3 = 14 of 14.5 along the spine.
- Frontage (P04, for information): A ground needs about 68.5 m of corridor door frontage with AG07 moved; the spine gives 60 m. P04 adds branch corridors inside the zones' spare (Michael, 2026-10-11).

## 3. Candidate to verify (sources on each row; correct any row that breaks the brief and say why)
Fixed blocks (stacked; same rect on every level listed):

| K-id | Levels | Rect [x0, z0, x1, z1] | Rooms by level | Size | Source |
| --- | --- | --- | --- | --- | --- |
| K-SPINE | G, F | [6.5, 40, 36.5, 43.5] | G AG10; F AF01 | 30 x 3.5 | brief 5 AG10, AF01; brief 8 |
| K-RISER | G, F | [4.5, 40, 6.5, 41.5] | G AG25; F AF16 | 2 x 1.5 | brief 8 (west third, on the spine, beside no stair) |
| K-FS | G, F, R | [4, 43.5, 7.5, 50] | G AG21; F AF15; R AR04 | 3.5 x 6.5 | brief 8 (west end, exit on the west wall) |
| K-STAIR | G, F | [22, 43.5, 30, 47.5] | G AG18; F AF12 | 8 x 4 (turned) | brief 8 (north of spine, east of centre); section 2 above |
| K-LOBBY | G, F | [30, 43.5, 33.5, 46] | G AG20; F AF14 | 3.5 x 2.5 | brief 5, 8 |
| K-LIFT | G, F | [30, 46, 32.5, 48.5] | G AG19; F AF13 | 2.5 x 2.5 | brief 8 (east side, shares the core wall) |
| K-AF17 | F | [36.5, 40, 40, 43.5] | F AF17 | 3.5 x 3.5 (clear 3.2 x 3.2, brief 3.2 x 2.7) | brief 7 (in line with LF01, BF01) |
| K-BRIDGE | F, L | [40, 40, 52, 43.5] | F LF01; L LF02 | 12 x 3.5 | section 2; bridge z0 = 40 |
| K-AF10 | F | [24, 50.5, 40, 54] | F AF10 | 16 x 3.5 | brief 5, 7 (north-east, X13) |
| K-PIPE | F, R | [33.5, 48.5, 35, 50.5] | F AF19; R - | 1.5 x 2 | brief 8 (off AF10, hatch by the chillers) |

Zones (each floor's zones tile A [4, 30, 40, 54] exactly; R lists only plant zones, the rest is open roof AR01):

| Zone | Level | Rect [x0, z0, x1, z1] | Rooms | Area | Fill | Note | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| G-FRONT | G | [4, 30, 19, 40] | AG01, AG02, AG03 | 150 | 84.2% | zone 2, main door to X03 | brief 5, 7 |
| G-SOFF | G | [19, 30, 28, 40] | AG04, AG06, AG16, AG17 | 90 | 84.4% | AG04 hatch to AG01; AG06 south window | brief 5, 7 |
| G-GOODS | G | [28, 30, 40, 40] | AG08, AG09 | 120 | 76.7% | zone 2, south-east, roller door | brief 5, 7 |
| G-SPINE | G | [4, 40, 40, 43.5] | AG10, AG25 | 126 | tight | spine band | brief 5, 8 |
| G-FS | G | [4, 43.5, 7.5, 54] | AG21 | 36.75 | tight | fire stair column | brief 8 |
| G-SEC | G | [7.5, 43.5, 22, 49] | AG11, AG12, AG13 | 79.75 | 77.7% | 3+, no contact with zone 2 | brief 6, 7 |
| G-NW | G | [7.5, 49, 22, 54] | AG14, AG15 | 72.5 | 82.8% | north wall | brief 5 |
| G-CORE | G | [22, 43.5, 33.5, 48.5] | AG18, AG19, AG20 | 57.5 | tight | main core | brief 8 |
| G-NE | G | [22, 48.5, 40, 54] | AG05, AG24 | 99 | 65.7% | AG05 north window; keep AG24 off the lift's north wall (P04) | brief 5, 7 |
| G-EAST | G | [33.5, 43.5, 40, 48.5] | AG22, AG23 | 32.5 | 70.2% | across the spine from goods (1b-G ASK-4, Michael) | brief 7 |
| F-SPINE | F | [4, 40, 40, 43.5] | AF01, AF16, AF17 | 126 | tight | spine and bridge vestibule | brief 5, 7 |
| F-FS | F | [4, 43.5, 7.5, 54] | AF15 | 36.75 | tight | fire stair column | brief 8 |
| F-SW | F | [4, 30, 21, 40] | AF07, AF09, AF20 | 170 | 63.5% | offices, south windows | brief 5 |
| F-OPS | F | [21, 30, 40, 40] | AF02, AF03, AF05, AF06 | 190 | 83.2% | counter at the ops door beside tape and media | brief 7 |
| F-NW | F | [7.5, 43.5, 22, 54] | AF04, AF08, AF18 | 152.25 | 60.4% | spare holds AF10's link to AF01 (P04) | brief 5 |
| F-CORE | F | [22, 43.5, 33.5, 50.5] | AF12, AF13, AF14 | 80.5 | tight | main core | brief 8 |
| F-NE | F | [33.5, 43.5, 40, 50.5] | AF11, AF19 | 45.5 | 82.4% | pump room off AF10 | brief 7 |
| F-PLANT | F | [22, 50.5, 40, 54] | AF10 | 63 | tight | plant gallery, pipes out east to X13 | brief 7, 9 |
| R-BULK | R | [4, 43.5, 7.5, 50] | AR04 | 22.75 | tight | over the fire stair | brief 8 |
| R-PLANT | R | [28, 43.5, 40, 54] | AR02, AR03 | 126 | 71.4% | chillers over AF19's hatch; AHU beside the spine line | brief 9, 10 |

## 4. Check script
Save as scripts/kestrel/p03b-zones-check.mjs (exactly this; 1c reuses it with its own rooms). Run: `timeout 60 node scripts/kestrel/p03b-zones-check.mjs docs/kestrel/03B-block-plan.md`

```js
// P03B zone check: tiling, fill, brief coverage, fixed blocks, brief 7 and 8 rules for Building A.
import { readFileSync } from 'node:fs';
const md = readFileSync(process.argv[2], 'utf8');
const A = [4, 30, 40, 54];
// brief 02 section 5 rect areas (clear + 0.3 each way); AF20 was AG07 (Michael 2026-10-11)
const ROOMS = {
  G: { AG01: 90, AG02: 30, AG03: 6.25, AG04: 20, AG05: 30, AG06: 48, AG08: 80, AG09: 12, AG10: 105, AG11: 30, AG12: 20, AG13: 12, AG14: 40, AG15: 20, AG16: 5, AG17: 3, AG18: 32, AG19: 6.25, AG20: 8.75, AG21: 22.75, AG22: 20, AG23: 4, AG24: 35, AG25: 3 },
  F: { AF01: 105, AF02: 96, AF03: 12, AF04: 30, AF05: 30, AF06: 20, AF07: 30, AF08: 42, AF09: 30, AF10: 56, AF11: 35, AF12: 32, AF13: 6.25, AF14: 8.75, AF15: 22.75, AF16: 3, AF17: 10.5, AF18: 20, AF19: 3, AF20: 48 },
  R: { AR02: 72, AR03: 18, AR04: 22.75 },
};
const TIGHT = new Set(['AG10', 'AG18', 'AG19', 'AG20', 'AG21', 'AG23', 'AG25', 'AF01', 'AF10', 'AF12', 'AF13', 'AF14', 'AF15', 'AF16', 'AF17', 'AF19', 'AR04']);
const cells = (l) => l.split('|').slice(1, -1).map((c) => c.trim());
const rows = md.split('\n').filter((l) => /^\| (G|F|R|K)-/.test(l)).map(cells);
const zones = rows.filter((r) => !r[0].startsWith('K-')).map((r) => ({ id: r[0], lv: r[1], rect: JSON.parse(r[2]), rooms: r[3] === '-' ? [] : r[3].split(/,\s*/), src: r[r.length - 1] }));
const ks = Object.fromEntries(rows.filter((r) => r[0].startsWith('K-')).map((r) => [r[0], { rect: JSON.parse(r[2]), rooms: r[3], src: r[r.length - 1] }]));
const fail = [], info = [];
const rule = (ok, msg) => { if (!ok) fail.push(msg); };
const area = ([a, b, c, d]) => (c - a) * (d - b);
const ov = (p, q) => Math.max(0, Math.min(p[2], q[2]) - Math.max(p[0], q[0])) * Math.max(0, Math.min(p[3], q[3]) - Math.max(p[1], q[1]));
const edge = (p, q) => {
  const xo = Math.min(p[2], q[2]) - Math.max(p[0], q[0]), zo = Math.min(p[3], q[3]) - Math.max(p[1], q[1]);
  if ((p[1] === q[3] || p[3] === q[1]) && xo > 0) return xo;
  if ((p[0] === q[2] || p[2] === q[0]) && zo > 0) return zo;
  return 0;
};
const inside = (p, q) => p[0] >= q[0] && p[1] >= q[1] && p[2] <= q[2] && p[3] <= q[3];
const grid = (r) => r.every((v) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-9);
const outside = (r) => r[0] === A[0] || r[1] === A[1] || r[2] === A[2] || r[3] === A[3];
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
  rule(z.fill <= 0.85 + 1e-9, `${z.id} fill ${(z.fill * 100).toFixed(1)}% over 85%`);
}
for (const lv of ['G', 'F', 'R']) {
  const zs = zones.filter((z) => z.lv === lv);
  for (let i = 0; i < zs.length; i++) for (let j = i + 1; j < zs.length; j++) rule(ov(zs[i].rect, zs[j].rect) === 0, `${lv} overlap ${zs[i].id} ${zs[j].id}`);
  const sum = zs.reduce((s, z) => s + area(z.rect), 0);
  if (lv !== 'R') rule(sum === 864, `${lv} zones cover ${sum} of 864`);
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
rule(K('K-BRIDGE')[0] === 40 && K('K-BRIDGE')[2] === 52 && K('K-BRIDGE')[1] === K('K-SPINE')[1] && area(K('K-BRIDGE')) === 42, 'bridge [40, z0, 52, z0 + 3.5], z0 = spine z0');
rule(edge(K('K-AF17'), K('K-SPINE')) >= 1 && edge(K('K-AF17'), K('K-BRIDGE')) >= 1, 'AF17 between the spine and the bridge');
rule(K('K-FS')[0] === 4 && edge(K('K-FS'), K('K-SPINE')) >= 1, 'fire stair on the west wall, touching the spine');
rule((K('K-STAIR')[0] + K('K-STAIR')[2]) / 2 > 22 && K('K-STAIR')[1] >= 43.5 && edge(K('K-STAIR'), K('K-SPINE')) >= 1, 'main stair north of the spine, east of centre');
rule(K('K-LIFT')[0] >= K('K-STAIR')[2] && edge(K('K-LIFT'), K('K-STAIR')) >= 1 && edge(K('K-LIFT'), K('K-LOBBY')) >= 1 && edge(K('K-LOBBY'), K('K-SPINE')) >= 1, 'lift east of the stair on its wall, landing on a lobby off the spine');
rule(K('K-RISER')[2] <= 16 && edge(K('K-RISER'), K('K-SPINE')) >= 1 && edge(K('K-RISER'), K('K-FS')) === 0 && edge(K('K-RISER'), K('K-STAIR')) === 0, 'cable riser in the west third, on the spine, beside no stair');
rule(K('K-AF10')[2] === 40 && K('K-AF10')[1] >= 43.5 && edge(K('K-PIPE'), K('K-AF10')) >= 1, 'plant gallery at the north-east, pipe riser off it');
rule(zr('G', 'AG01')[1] === 30 && zr('G', 'AG08')[1] === 30 && zr('G', 'AG08')[2] === 40, 'reception and goods on the south wall, goods at the east end');
rule(['AG01', 'AG02', 'AG03', 'AG08', 'AG09'].every((id) => edge(zr('G', id), zr('G', 'AG11')) === 0 && ov(zr('G', id), zr('G', 'AG11')) === 0), 'security zone touches no zone 2 zone');
rule(zr('G', 'AG22')[2] === 40, 'comms room zone at the east end');
rule(['AF03', 'AF05', 'AF06'].every((id) => zoneOf('F', id) === zoneOf('F', 'AF02')), 'ops room, counter, tape and media in one zone');
rule(zr('F', 'AF11')[2] === 40 && zr('F', 'AF11')[1] >= 43.5, 'pump room zone at the north-east');
rule(zr('G', 'AG06')[1] === 30, 'AG06 zone on the south wall');
for (const [lv, id] of [['G', 'AG05'], ['F', 'AF20'], ['F', 'AF07'], ['F', 'AF09'], ['F', 'AF02']]) rule(outside(zr(lv, id)), `${id} zone on an outside wall`);
rule(ov(zr('R', 'AR02'), K('K-PIPE')) > 0, 'chiller zone over the pipe riser hatch');
for (const z of zones.filter((q) => q.lv !== 'R' && !q.rooms.some((id) => TIGHT.has(id)) && edge(q.rect, K('K-SPINE')) < 1)) info.push(`${z.id} does not touch the spine: P04 corridor in its spare (${z.spare.toFixed(1)} m2)`);
if (edge(K('K-AF10'), K('K-SPINE')) < 1) info.push('AF10 does not touch AF01: P04 link corridor (F-NW spare)');
for (const f of fail) console.log(`FAIL ${f}`);
for (const i of info) console.log(`INFO ${i}`);
for (const z of zones) console.log(`${z.id} fill ${(z.fill * 100).toFixed(1)}% spare ${z.spare.toFixed(1)}`);
console.log(`zones ${zones.length}, fixed ${Object.keys(ks).length}, fails ${fail.length}, info ${info.length}`);
process.exit(fail.length ? 1 : 0);
```

The planner traced the candidate through these rules by hand (expected: 0 fails; INFO for G-NW, G-NE and AF10). Never write that it passed unless you ran it.

## 5. Write section 3
Replace the placeholder paragraph under "## 3. Building A" with:
- 3.1 "Fixed blocks": the K table (verified).
- 3.2 "Zones": the zone table (verified), with the script's summary line pasted under it.
- 3.3 "Deviations": the turned main core (reason: section 2 above); the bridge vestibule 3.5 x 3.5 (bigger than brief, to fill the spine band); anything else you changed.
- 3.4 "Notes for P04 and 1c": the INFO lines (frontage, AF10 link); AG24 and AG23 off the lift's north wall; bridge z0 = 40, so BF01 in 1c must take B's west wall at z 40-43.5; X13 leaves AF10's east end at z 50.5-54, so BF13 sits at B's north-west; level L footprint is [40, 40, 52, 43.5].
- 3.5 "ASKs" only if needed (options, recommended first, RULES 9 4a).
Line 2 of the file: "Status: DRAFT (Part 1b done: A zones; Part 1c next)". Update section 2's F and L rows to read bridge [40, 40, 52, 43.5] (z0 = 40).

## 6. Self-check (all from a command; paste the summary line)
- The script above: 0 fails.
- Universal checks (RULES 7): every rect and number has a source (script); every brief room of A's G, F and R is in exactly one zone (script); every room reaches a corridor: at zone level, the INFO lines name the zones that need a P04 corridor in their spare; no other room is left without a route.
- Brief 7 and 8 rules for A (script rules); any rule the script cannot test, list in 3.4 for P04.

## 7. End (RULES 9)
- progress.md: P03B row "DRAFT (parts 1a, 1b)", date; one log line (at most 6 lines). One line in lessons.md.
- git add only 03B-block-plan.md, scripts/kestrel/p03b-zones-check.mjs, progress.md and lessons.md. Commit "kestrel P03B 1b: Building A zones". Push.
- Report in at most 8 lines, then the Next step block: 1. Type /clear. 2. Stay on Opus, medium. 3. Send the prompt below: `Planner: next` (alone in a fenced code block).
- STOP.
