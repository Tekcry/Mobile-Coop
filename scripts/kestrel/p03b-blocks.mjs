// P03B Part 2 blocks generator. Piece 1 (2a): meta, levels, Building A zones. Later pieces add functions (2b-2d).
// Usage: node scripts/kestrel/p03b-blocks.mjs  -> docs/kestrel/kestrel.campus.blocks.json (planner 2026-10-11: keeps npm test green until B0)
import { readFileSync, writeFileSync } from 'node:fs';
import { standardsCheck, summary } from './standards-check.mjs';

const MD = 'docs/kestrel/03B-block-plan.md';
const OUT = 'docs/kestrel/kestrel.campus.blocks.json';
const md = readFileSync(MD, 'utf8');
const cells = (l) => l.split('|').slice(1, -1).map((c) => c.trim());
// table parsing copied from p03b-zones-check.mjs lines 1-20
const rows = md.split('\n').filter((l) => /^\| (G|F|R|K)-/.test(l)).map(cells).filter((r) => r[2]?.startsWith('['));

const A = [4, 30, 40, 60]; // 03B 1 Building A
const BSTRIP = [52, 30, 70, 60]; // 03B 1 B west strip
const BFULL = [52, 30, 100, 60]; // 03B 1 Building B
const WING = [52, 62, 76, 74]; // 03B 1 generator wing
const BRIDGE = [40, 40, 52, 43.5]; // 03B 2 link bridge (z0 = 40)

function meta() {
  return {
    id: 'kestrel', // decision 2
    version: 2, // schema 2
    grid: 0.5, // RULES 6
    objectGrid: 0.1, // RULES 6
    entry: [84, 4], // 03B 8.1 P01 "S-LANE 84,4"
    bay: [6, 6], // 03B 1 (bay 6.0 x 6.0)
    site: [0, 0, 108, 76], // 03B 1 Site
    buildings: [ // 03B 1; the wing is not a building (03B 2 row G)
      { id: 'A', name: 'Building A', footprint: A },
      { id: 'B', name: 'Building B', footprint: BFULL },
    ],
    stage: 'P03B Part 2: campus zones and corridors only', // 03B line 3
  };
}

// 03B 2 table (id, name, floor, height, footprint). Heights: open roofs take the parapet height (03B 2 rows H, R).
function levels() {
  return [
    { id: 'B', name: 'Under the yard', floor: -3.6, height: 3.6, footprint: [[41, 24, 49, 30], [40, 30, 43, 47.5], [49, 27, 74, 30], [49, 24, 50.5, 25.5], [72, 30, 74, 32]] }, // 03B 2 B (TB01, TB03, TB04, TB02, BG32)
    { id: 'U', name: 'Underfloor void', floor: -1.6, height: 1.6, footprint: [[70, 36, 100, 50.5]] }, // 03B 2 U (BU01, BU02)
    { id: 'G', name: 'Ground', floor: 0, height: 4.2, footprint: [A, BFULL, WING] }, // 03B 2 G (listed: A, B, wing)
    { id: 'F', name: 'First', floor: 4.2, height: 4.2, footprint: [A, BSTRIP, BRIDGE] }, // 03B 2 F (A, B strip, bridge)
    { id: 'H', name: 'Low roof', floor: 6.6, height: 1.1, footprint: [[70, 30, 100, 60], WING] }, // 03B 2 H (hall block, wing); parapet 1.1
    // Michael 2026-10-11: bridge roof has no parapet, only a 0.3 m edge upstand (enclosed glazed link bridge)
    { id: 'L', name: 'Bridge roof', floor: 7.8, height: 0.3, source: 'Michael 2026-10-11', footprint: [BRIDGE] }, // 03B 2 L
    { id: 'R', name: 'Roof', floor: 8.4, height: 1.1, footprint: [A, BSTRIP] }, // 03B 2 R; parapet 1.1
  ];
}

const CORRIDORS = new Set(['G-SPINE', 'G-NCOR', 'G-WLINK', 'G-ELINK', 'F-SPINE', 'F-NCOR', 'F-WLINK', 'F-ELINK']); // decision 9 (03B 3.2 K-SPINE, K-NCOR, K-WLINK, K-ELINK)
const RING = { 'G-FRONT': 2, 'G-GOODS': 2, 'G-SEC': '3+' }; // decision 10 (brief 6 S2-S4 lines 260-262); all others 3
const CEILING = { 'G-SPINE': 2.4, 'G-NCOR': 2.4, 'F-SPINE': 2.4, 'F-NCOR': 2.4 }; // decision 11: 2.4 + 1.5 void + 0.3 slab = 4.2; P04 sets the rest

// 03B 3.3 rows: cols Zone, Level, Rect, Rooms, ...
function zonesA() {
  return rows.filter((r) => /^(G|F|R)-/.test(r[0])).map((r) => {
    const rect = JSON.parse(r[2]);
    const holds = r[3] === '-' ? '' : ` (${r[3]})`; // decision 15: check.mjs and schema do not read holds, so the rooms go in name
    return {
      id: r[0],
      level: r[1],
      name: r[0] + holds,
      kind: CORRIDORS.has(r[0]) ? 'corridor' : 'zone', // decision 9
      rect,
      ceiling: CEILING[r[0]] ?? 0, // decision 11
      finish: '', // decision 13 (P04)
      minShort: Math.min(3.0, Math.min(rect[2] - rect[0], rect[3] - rect[1]) - 0.3), // decision 12 (scale-sheet l.37; RULES 6)
      open: [],
      ring: RING[r[0]] ?? 3, // decision 10
      building: 'A', // decision 14
    };
  });
}

const out = {
  meta: meta(),
  levels: levels(),
  rooms: zonesA(),
  walls: [], openings: [], stairs: [], ladders: [], voids: [], objects: [], exterior: [], services: [], // later pieces 2b-2d
};
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${OUT}: rooms ${out.rooms.length}, levels ${out.levels.length}`);
const res = standardsCheck(out);
for (const f of res.fails) console.log('FAIL', f);
console.log(summary(res));
process.exit(res.fails.length ? 1 : 0);
