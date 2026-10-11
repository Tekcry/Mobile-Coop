// P03B Part 2 blocks generator. Piece 1 (2a): meta, levels, Building A zones. Piece 2 (2b): B, wing, bridge, site, level U zones. Piece 3 (2c): stairs, voids, ladders, V-AG23, pipe rack. Piece 4 (2d-1): open roofs, V-LAD3, walls, parapets, open edges. 2d-2a adds fences and 16 openings, 2d-2b the 17 openings of 7.2 and XG01 (p03b-openings.mjs).
// Usage: node scripts/kestrel/p03b-blocks.mjs  -> docs/kestrel/kestrel.campus.blocks.json (planner 2026-10-11: keeps npm test green until B0)
import { readFileSync, writeFileSync } from 'node:fs';
import { standardsCheck, summary } from './standards-check.mjs';
import { fenceUnits, openings } from './p03b-openings.mjs';

const MD = 'docs/kestrel/03B-block-plan.md';
const OUT = 'docs/kestrel/kestrel.campus.blocks.json';
const md = readFileSync(MD, 'utf8');
const cells = (l) => l.split('|').slice(1, -1).map((c) => c.trim());
// table parsing copied from p03b-zones-check.mjs lines 1-20
// widened in 2b to the B-, W-, S-, SI-, L-, T-, U-, RF- prefixes (decision 1); each zones function filters its own rows
const rows = md.split('\n').filter((l) => /^\| (G|F|R|K|B|W|S|SI|L|T|U|RF)-/.test(l)).map(cells).filter((r) => r[2]?.startsWith('['));
const section = (from, to) => { // table rows of one 03B section (4.3 and 5.2 use one row reader: rect in column 3)
  const a = md.indexOf(from), b = md.indexOf(to, a);
  return md.slice(a, b).split('\n').filter((l) => l.startsWith('| ')).map(cells).filter((r) => r[2]?.startsWith('['));
};

const A = [4, 30, 40, 60]; // 03B 1 Building A
const BSTRIP = [52, 30, 70, 60]; // 03B 1 B west strip
const BFULL = [52, 30, 100, 60]; // 03B 1 Building B
const WING = [52, 62, 76, 74]; // 03B 1 generator wing
const BRIDGE = [40, 40, 52, 43.5]; // 03B 2 link bridge (z0 = 40)
const HALL = [70, 30, 100, 60]; // 03B 2 row H hall block

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
    { id: 'B', name: 'Under the yard', floor: -3.6, height: 3.6, footprint: [[41, 24, 49, 30], [40, 30, 43, 47.5], [49, 27, 74, 30], [49, 24, 50.5, 25.5], [72, 30, 74, 32], [38, 45, 40, 47]] }, // 03B 2 B (TB01, TB03, TB04, TB02, BG32, AG23 added in 2c, decision 11)
    { id: 'U', name: 'Underfloor void', floor: -1.6, height: 1.6, footprint: [[70, 36, 100, 50.5]] }, // 03B 2 U (BU01, BU02)
    { id: 'G', name: 'Ground', floor: 0, height: 4.2, footprint: [A, BFULL, WING] }, // 03B 2 G (listed: A, B, wing)
    { id: 'F', name: 'First', floor: 4.2, height: 4.2, footprint: [A, BSTRIP, BRIDGE] }, // 03B 2 F (A, B strip, bridge)
    { id: 'H', name: 'Low roof', floor: 6.6, height: 1.1, footprint: [HALL, WING] }, // 03B 2 H (hall block, wing); parapet 1.1
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

// Piece 2 (2b). Cut parent into bands at the kids' z edges, then each band at the x edges of the kids crossing it;
// keep the uncovered pieces, south to north, west to east (2b "remainder"; 2d reuses it for the open roofs).
function remainder(parent, kids) {
  const zs = [...new Set([parent[1], parent[3], ...kids.flatMap((k) => [k[1], k[3]])])].filter((z) => z >= parent[1] && z <= parent[3]).sort((a, b) => a - b);
  const pieces = [];
  for (let i = 0; i + 1 < zs.length; i++) {
    const z0 = zs[i], z1 = zs[i + 1];
    const cross = kids.filter((k) => k[1] < z1 && k[3] > z0).sort((a, b) => a[0] - b[0]);
    let x = parent[0];
    for (const k of cross) { if (k[0] > x) pieces.push([x, z0, k[0], z1]); x = Math.max(x, k[2]); }
    if (x < parent[2]) pieces.push([x, z0, parent[2], z1]);
  }
  return pieces;
}

const FOOT = { A, B: BFULL }; // meta.buildings footprints
const within = (r, f) => r[0] >= f[0] && r[1] >= f[1] && r[2] <= f[2] && r[3] <= f[3];
const buildingOf = (r) => Object.keys(FOOT).find((id) => within(r, FOOT[id])); // decision 10 (schema rooms[].building, A31)
function zone(id, level, name, kind, rect, ring) { // decisions 11, 12: ceiling 0 (P04 sets it), finish "", open []
  const z = { id, level, name, kind, rect, ceiling: 0, finish: '', minShort: Math.min(3.0, Math.min(rect[2] - rect[0], rect[3] - rect[1]) - 0.3), open: [], ring };
  const b = buildingOf(rect);
  if (b) z.building = b;
  return z;
}
const holdsOf = (r) => (r[3] === '-' ? r[0] : `${r[0]} (${r[3]})`); // decision 12: id plus the Rooms column

// Rings (brief 6 lines 259-267; mixed zones take the ring of the larger brief-5 area, decision 9 table)
const RING_B = { 'B-GGOODS': 2, 'B-GHCAR': 5, 'B-GHALL': 4, 'B-GHPLANT': 4, 'B-FSEC': 4, 'B-GHCOOL': 4 }; // all other B zones: 3
const KIND_B = { 'B-GCOR': 'corridor', 'B-FCOR': 'corridor', 'L-ROOF': 'roof', 'T-MH': 'shaft', 'T-RISER': 'shaft' }; // decision 8
const RING_S = { 'U-HALL': 4, 'U-COOL': 4, 'T-VAULT': 4, 'T-MH': 4, 'T-TUNA': 4, 'T-TUNB': 4, 'T-RISER': 5, 'S-COMP': 3, 'L-ROOF': 3 }; // decisions 9, 14; all other S- and SI- zones: 1
const YARD_KIDS = { 'S-YARDA': 'SI-GATE', 'S-YARDB': 'SI-APRON', 'S-REAR': 'SI-BIN' }; // decision 7 (check.mjs A04: no two rooms on a level overlap)

// 03B 4.3 rows (19): level from the Level column (decision 1)
function zonesB() {
  return section('### 4.3 Zones', '\nCheck (').filter((r) => /^(B|W)-/.test(r[0])).map((r) =>
    zone(r[0], r[1], holdsOf(r), KIND_B[r[0]] ?? 'zone', JSON.parse(r[2]), RING_B[r[0]] ?? 3)); // kinds decision 8
}

// 03B 5.2 rows (decisions 3-8) plus K-BRIDGE (decision 2: 03B 3.2 K-BRIDGE, 03B 2 row F)
function zonesSite() {
  const sec = section('### 5.2 Zones', '\nSelf-check');
  const get = (id) => sec.find((r) => r[0] === id);
  const out = [zone('K-BRIDGE', 'F', 'K-BRIDGE (LF01)', 'corridor', BRIDGE, 3)];
  for (const r of sec) {
    if (r[0] === 'SI-RACK' || r[0].startsWith('RF-')) continue; // decisions 4, 5: rack is a vertical item (2c), open roofs are 2d
    const rect = JSON.parse(r[2]);
    const level = r[1].split(' ')[0]; // "B to G" -> B (decision 6)
    const kind = r[0] === 'S-LANE' ? 'lane' : /^(S-|SI-APRON)/.test(r[0]) ? 'yard' : KIND_B[r[0]] ?? 'zone'; // 2b decision 8 (Michael, 2026-10-11): SI-GATE and SI-BIN are enclosed (zone), SI-APRON a yard
    const ring = RING_S[r[0]] ?? 1;
    const kid = YARD_KIDS[r[0]];
    if (kid) { // decision 7: pieces <parent>-<n>, the kid stays its own zone
      remainder(rect, [JSON.parse(get(kid)[2])]).forEach((p, n) => out.push(zone(`${r[0]}-${n + 1}`, level, `${r[0]} (${r[3]}) part ${n + 1}`, 'yard', p, ring)));
    } else out.push(zone(r[0], level, holdsOf(r), kind, rect, ring));
  }
  return out;
}

// Piece 3 (2c). Rows are literals from prompts/P03B-2c.md tables (source 03B 6.1 unless noted).
const RISERS = 25; // decision 1: round(4.2 / 0.165) (schema stairs[].risers; check.mjs A11 stair.riserHeight)
function stairs() { // decisions 3-7: [id, kind, from, to, rect, up, width, layout]; main and fire dogleg, V-GAL straight 2 flights
  const T = [
    ['V-ASTAIR', 'main', 'G', 'F', [19.5, 43.5, 27.5, 47.5], 'W', 1.85],
    ['V-AFS-GF', 'fire', 'G', 'F', [4, 54, 10.5, 57.5], 'E', 1.45],
    ['V-AFS-FR', 'fire', 'F', 'R', [4, 54, 10.5, 57.5], 'E', 1.45],
    ['V-BSTAIR', 'main', 'G', 'F', [52, 48.5, 57, 56.5], 'N', 1.85],
    ['V-BFS-GF', 'fire', 'G', 'F', [52, 56.5, 58.5, 60], 'W', 1.45],
    ['V-BFS-FR', 'fire', 'F', 'R', [52, 56.5, 58.5, 60], 'W', 1.45],
    ['V-GAL', 'feature', 'G', 'F', [67, 43, 70, 52], 'S', 2.4],
  ];
  return T.map(([id, kind, from, to, rect, up, width]) => ({ id, kind, from, to, rect, up, width, risers: RISERS, ...(id === 'V-GAL' ? { flights: 2 } : { layout: 'dogleg' }) }));
}

function voids() { // decision 9: [id, level, rect, kind, reason]
  const T = [
    ['VF-ASTAIR', 'F', [19.5, 43.5, 27.5, 47.5], 'stairwell', 'Main stair A well (V-ASTAIR)'],
    ['VF-ALIFT', 'F', [27.5, 46, 30, 48.5], 'liftshaft', 'Passenger lift A shaft, locked off at night (V-ALIFT)'],
    ['VF-AFS', 'F', [4, 54, 10.5, 57.5], 'stairwell', 'Fire stair A well (V-AFS)'],
    ['VR-AFS', 'R', [4, 54, 10.5, 57.5], 'stairwell', 'Fire stair A up to the roof bulkhead AR04 (V-AFS)'],
    ['VF-ARISER', 'F', [7.5, 49, 9.5, 50.5], 'riser', 'Cable riser A (V-ARISER)'],
    ['VR-APIPE', 'R', [34.5, 43.5, 36.5, 45], 'hatch', 'Pipe riser roof hatch into R-PLANT (V-APIPE)'],
    ['VF-BSTAIR', 'F', [52, 48.5, 57, 56.5], 'stairwell', 'Main stair B well (V-BSTAIR)'],
    ['VF-BLIFT', 'F', [54.5, 46, 57, 48.5], 'liftshaft', 'Passenger lift B shaft, locked off at night (V-BLIFT)'],
    ['VF-BFS', 'F', [52, 56.5, 58.5, 60], 'stairwell', 'Fire stair B well (V-BFS)'],
    ['VR-BFS', 'R', [52, 56.5, 58.5, 60], 'stairwell', 'Fire stair B up to the roof bulkhead BR02 (V-BFS)'],
    ['VF-BRISER', 'F', [55, 44.5, 57, 46], 'riser', 'Cable riser B (V-BRISER)'],
    ['VF-GAL', 'F', [67, 43, 70, 52], 'stairwell', 'Gallery stair down into the hall (V-GAL)'],
    ['VG-AG23', 'G', [38, 45, 40, 47], 'hatch', 'Floor hatch in AG22 over the tunnel shaft (V-AG23)'],
    ['VG-BG32', 'G', [72, 30, 74, 32], 'hatch', 'Floor hatch in BG31 over the carrier riser (V-BG32)'],
    ['VG-TB02', 'G', [49, 24, 50.5, 25.5], 'hatch', 'Manhole lid in the yard over the carrier manhole (V-TB02)'],
    ['VH-BR05', 'H', [80, 48, 82, 50], 'riser', 'Cooling supply shaft from the roof AHU into the hall, bolted alarmed grille (V-BR05)'],
  ];
  return T.map(([id, level, rect, kind, reason]) => ({ id, level, rect, kind, reason }));
}

function ladders() { // decisions 12-14: [id, room, at, from, to, facing, reason]; V-LAD3 added in 2d-1, riser ladders are P06
  const T = [
    ['LD-AG23', 'V-AG23', [38.5, 46], 'B', 'G', 'W', "Fixed ladder in the tunnel shaft up to AG22's hatch; the TB03 door is in the east wall"],
    ['LD-BG32', 'T-RISER', [73, 31.5], 'B', 'G', 'N', "Fixed ladder in the carrier riser up to BG31's hatch; the TB04 door is in the south wall"],
    ['LD-TB02', 'T-MH', [50, 25], 'B', 'G', 'E', 'Fixed ladder in the carrier manhole up to the yard lid; the TB01 door is in the west wall'],
    ['V-LAD1', 'L-ROOF', [40.5, 41.5], 'L', 'R', 'W', "Hooped access ladder from the bridge roof up A's east parapet (0.6)"],
    ['V-LAD2', 'L-ROOF', [51.5, 41.5], 'L', 'R', 'E', "Hooped access ladder from the bridge roof up B's west parapet (0.6)"],
    ['V-LAD3', 'RF-BH-3', [70.5, 57.5], 'H', 'R', 'W', "Access ladder from the hall roof up the B strip's east parapet (1.8)"], // 2d-1 decision 4: 03B 6.1 V-LAD3 [69.5, 57, 70, 58.5], foot on the H side
  ];
  return T.map(([id, room, at, from, to, facing, reason]) => ({ id, room, at, from, to, facing, reason }));
}

function services() { // decision 15: 03B 5.2 SI-RACK [40, 44.5, 52, 46.5] at 5.0-6.5 (centre 5.75, size 1.5); brief 5 X13
  return [{ id: 'SI-RACK', kind: 'water', path: [[40, 5.75, 45.5], [52, 5.75, 45.5]], size: [2.0, 1.5], reason: "Chilled-water flow and return and a cable tray from AF10 to B's first floor, on two steel portal frames over the gap (X13)" }];
}

// decision 10: V-AG23 shaft room on level B, building A from the footprint (03B 6.1; brief 5 AG23 ring 4)
const agShaft = () => zone('V-AG23', 'B', 'V-AG23 (AG23)', 'shaft', [38, 45, 40, 47], 4);

// Piece 4 (2d-1). Sources per rule are in prompts/P03B-2d-1.md decisions 1-16.
function roofs(base) { // decisions 2, 3: open roofs minus the enclosed or plant zones on them, by remainder()
  const KIDS = { 'RF-A': ['R-BULK', 'R-PLANT'], 'RF-BS': ['B-RBULK'], 'RF-BH': ['B-HSUPPLY'], 'RF-W': [] }; // 03B 5.2 RF- rows; 3.3 R-BULK, R-PLANT; 4.3 B-RBULK, B-HSUPPLY
  const rect = (id) => base.find((r) => r.id === id).rect;
  return section('### 5.2 Zones', '\nSelf-check').filter((r) => r[0].startsWith('RF-')).flatMap((r) => {
    const ps = remainder(JSON.parse(r[2]), KIDS[r[0]].map(rect));
    const many = ps.length > 1;
    return ps.map((p, n) => zone(many ? `${r[0]}-${n + 1}` : r[0], r[1], many ? `${holdsOf(r)} part ${n + 1}` : holdsOf(r), 'roof', p, 3)); // kind roof, ring 3 (brief 5 AR01, BR01, BR03, BR06)
  });
}

const OPEN_ZONES = new Set(['R-PLANT', 'B-HSUPPLY']); // decision 5 (brief 5 AR02, BR04: open plant on the roof)
const enclosed = (r) => !['yard', 'lane', 'roof'].includes(r.kind) && !OPEN_ZONES.has(r.id); // decision 5
const ROOM_H = { 'K-BRIDGE': 3.6, 'SI-GATE': 3.0, 'SI-BIN': 2.4, 'R-BULK': 3.0, 'B-RBULK': 3.0 }; // 2d-1 FIXES 1-3 (bridge walls stop at the roof 7.8); decision 9 (stair bulkhead 3.0)
const edgeUnits = (f) => { // 0.5 units of the four edges W, S, E, N (RULES 6 grid); unit = { horiz, c: line, s: start }
  const run = (a, b, mk) => { const o = []; for (let s = a; s < b; s += 0.5) o.push(mk(s)); return o; };
  return [run(f[1], f[3], (s) => ({ horiz: false, c: f[0], s })), run(f[0], f[2], (s) => ({ horiz: true, c: f[1], s })), run(f[1], f[3], (s) => ({ horiz: false, c: f[2], s })), run(f[0], f[2], (s) => ({ horiz: true, c: f[3], s }))];
};
const ukey = (u) => `${u.horiz ? 'h' : 'v'}|${u.c}|${u.s}`;
const onOutline = (u, f) => (u.horiz ? (u.c === f[1] || u.c === f[3]) && u.s >= f[0] && u.s + 0.5 <= f[2] : (u.c === f[0] || u.c === f[2]) && u.s >= f[1] && u.s + 0.5 <= f[3]);
const inClosed = (u, f) => (u.horiz ? u.c >= f[1] && u.c <= f[3] && u.s >= f[0] && u.s + 0.5 <= f[2] : u.c >= f[0] && u.c <= f[2] && u.s >= f[1] && u.s + 0.5 <= f[3]);

function walls(rs, lv) { // decisions 6-11; returns the walls and the covered unit keys per level
  const raw = [];
  const covered = new Set();
  const floorH = lv.find((l) => l.id === 'H').floor; // 6.6: the hall block and wing rise to the H floor (03B 2 row G)
  const foot = (id) => lv.find((l) => l.id === id).footprint;
  const BUILD = [A, BFULL, WING]; // decision 7: outlines on G and F (03B 1)
  for (const L of lv) {
    const U = new Map();
    for (const r of rs) if (r.level === L.id && enclosed(r)) for (const u of edgeUnits(r.rect).flat()) (U.get(ukey(u)) ?? U.set(ukey(u), { ...u, by: [] }).get(ukey(u))).by.push(r.id);
    for (const [k, u] of U) {
      let h = Math.max(...u.by.map((id) => ROOM_H[id] ?? L.height)); // decision 9: taller wins
      if (L.id === 'G' && [HALL, WING].some((f) => inClosed(u, f))) h = Math.max(h, floorH); // hall block [70, 30, 100, 60]
      const solo = u.by.length === 1 ? u.by[0] : ''; // decision 7: no enclosed room on the other side
      let kind = 'interior'; // decision 8
      if (L.id === 'R' || ((L.id === 'G' || L.id === 'F') && (BUILD.some((f) => onOutline(u, f)) || ['K-BRIDGE', 'SI-GATE'].includes(solo)))) kind = 'exterior'; // decision 7
      if (solo === 'SI-BIN') kind = 'boundary'; // 2d-1 FIX 3: chain-link enclosure
      raw.push({ ...u, level: L.id, kind, h });
      covered.add(`${L.id}|${k}`);
    }
    if (['H', 'L', 'R'].includes(L.id)) for (const f of foot(L.id)) for (const u of edgeUnits(f).flat()) { // decision 10
      if (covered.has(`${L.id}|${ukey(u)}`)) continue;
      if (L.id !== 'R' && foot('R').some((g) => onOutline(u, g))) continue; // the taller facade stands there
      raw.push({ ...u, level: L.id, kind: 'parapet', h: L.height }); // H 1.1, R 1.1, L 0.3 (Michael)
      covered.add(`${L.id}|${ukey(u)}`);
    }
  }
  raw.push(...fenceUnits(covered, ukey)); // 2d-2a decision 1: fences before the merge, skipping walled units
  const groups = new Map(); // decision 11: merge consecutive units with one kind and h
  for (const u of raw) { const g = `${u.level}|${u.horiz}|${u.c}|${u.kind}|${u.h}`; (groups.get(g) ?? groups.set(g, []).get(g)).push(u); }
  const merged = [];
  for (const us of groups.values()) {
    us.sort((p, q) => p.s - q.s);
    let cur = null;
    for (const u of us) { if (cur && cur.e === u.s) cur.e = u.s + 0.5; else merged.push((cur = { ...u, e: u.s + 0.5 })); }
  }
  const lvOrder = lv.map((l) => l.id);
  merged.sort((p, q) => lvOrder.indexOf(p.level) - lvOrder.indexOf(q.level) || Number(q.horiz) - Number(p.horiz) || p.c - q.c || p.s - q.s);
  const n = {};
  const ws = merged.map((m) => ({ id: `W${m.level}${String((n[m.level] = (n[m.level] ?? 0) + 1)).padStart(3, '0')}`, level: m.level, a: m.horiz ? [m.s, m.c] : [m.c, m.s], b: m.horiz ? [m.e, m.c] : [m.c, m.e], t: m.kind === 'interior' ? 0.3 : 0.45, h: m.h, kind: m.kind })); // schema walls[]; t from A22
  return { walls: ws, covered };
}

function openEdges(rs, covered) { // decision 12: edges of yard, lane, roof and plant rooms not fully covered by walls
  for (const r of rs) if (!enclosed(r)) r.open = ['W', 'S', 'E', 'N'].filter((_, i) => edgeUnits(r.rect)[i].some((u) => !covered.has(`${r.level}|${ukey(u)}`)));
}

const base = [...zonesA(), ...zonesB(), ...zonesSite(), agShaft()];
const rooms = [...base, ...roofs(base)]; // decision 3: 11 roof pieces
for (const r of rooms) if (['yard', 'lane', 'roof'].includes(r.kind)) r.minShort = r.id === 'S-PASS' ? 1.2 : 0; // decision 13 (check.mjs A05; brief 12e)
const lvls = levels();
const { walls: wallList, covered } = walls(rooms, lvls);
openEdges(rooms, covered);
const out = {
  meta: meta(),
  levels: lvls,
  rooms, // zonesA, zonesB, zonesSite, V-AG23, roofs
  walls: wallList, openings: openings(md, cells, wallList, rooms), stairs: stairs(), ladders: ladders(), voids: voids(), objects: [], exterior: [], services: services(), // openings 2d-2a (7.1) and 2d-2b (7.2, XG01)
};
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${OUT}: rooms ${out.rooms.length}, walls ${out.walls.length}, levels ${out.levels.length}`);
const res = standardsCheck(out);
for (const f of res.fails) console.log('FAIL', f);
console.log(summary(res));
process.exit(res.fails.length ? 1 : 0);
