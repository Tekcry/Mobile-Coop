// P03B Part 2d-2a (piece 5): fences and the 16 ring-entry openings for 03B 7.1. Part 2d-2b (piece 6): the 17 openings for 03B 7.2 and gate XG01. Sources per rule in prompts/P03B-2d-2a.md and P03B-2d-2b.md.

// Decision 1: boundary fences, level G, t 0.45, h 2.4 (brief ASK-1 line 402; inner fences 2.4 chain-link, brief line 86).
// [horiz, line, from, to]; horiz = runs along x at z = line. Sources: 03B 1 (lane fence z 8, boundaries x 0 and x 108, compound X09 [76, 60, 100, 76], passage X07).
export const FENCE_H = 2.4;
export const FENCES = [
  [true, 8, 0, 108], // lane fence z 8 (03B 1 Lane X01)
  [false, 0, 8, 76], // west boundary x 0 (03B 1 East and west boundaries)
  [false, 108, 8, 76], // east boundary x 108 (03B 1)
  [false, 100, 60, 76], // compound east x 100 (X09 east edge)
  [false, 76, 60, 62], // compound gate line x 76 (03B 1 X07 passage east end)
  [false, 76, 74, 76], // compound west behind the wing x 76 (wing north z 74 to the rear boundary z 76)
  [false, 52, 60, 62], // passage west gate line x 52 (03B 1 X07 west end)
];

// 0.5 units of the fences not already walled (the gatehouse's south wall on z 8); `covered` holds "G|<unit key>"
export function fenceUnits(covered, ukey) {
  const out = [];
  for (const [horiz, c, a, b] of FENCES) {
    for (let s = a; s < b; s += 0.5) {
      const u = { horiz, c, s, by: [] };
      if (!covered.has(`G|${ukey(u)}`)) out.push({ ...u, level: 'G', kind: 'boundary', h: FENCE_H });
    }
  }
  return out;
}

// [id, level, line axis, line, centre, type, w, h, ringExempt]. Positions from prompts/P03B-2d-2a.md (RA) and P03B-2d-2b.md (RB, XG); Control text from 03B 7.1 and 7.2.
// 2d-2b decision 3: ring exemption texts (brief ASK-2 line 403; 03B 7.2 Exempt column)
const EXIT = (id) => `Exit only, no outside hardware (brief ASK-2; 03B 7.2 ${id})`;
const KEY = (id) => `Key only (brief ASK-2; 03B 7.2 ${id})`;
const DOOR_H = 2.1; // decision 3: scale sheet door 2.0-2.2 (A07)
const T = [
  ['RA01-P', 'G', 'z', 8, 7.5, 'gate', 1.0], // pedestrian gate east of the gatehouse (brief 85)
  ['RA01-V', 'G', 'z', 8, 12.5, 'gate', 6.0], // main sliding vehicle gate, x 9.5-15.5
  ['RA02', 'G', 'z', 8, 104, 'gate', 5.0], // east service gate, 1.5 clear of the x 108 corner
  ['RA03', 'G', 'z', 30, 13, 'double', 1.8],
  ['RA04', 'G', 'z', 30, 33, 'roller', 3.0, 3.0], // brief 5 AG08 roller 3.0 x 3.0
  ['RA05', 'G', 'z', 40, 13, 'door', 1.0],
  ['RA06', 'G', 'z', 40, 34, 'door', 1.0],
  ['RA07', 'G', 'z', 43.5, 16.5, 'door', 1.0], // 3.5 off RA05 across the spine (A10)
  ['RA08', 'F', 'z', 40, 24, 'door', 1.0],
  ['RA09', 'F', 'z', 43.5, 13.5, 'door', 1.0],
  ['RA10', 'F', 'x', 36.5, 52, 'door', 1.0],
  ['RA11', 'F', 'x', 40, 42, 'double', 1.8],
  ['RA12', 'F', 'x', 52, 42, 'double', 1.8],
  ['RA13', 'G', 'x', 4, 56, 'fire-door', 1.0, DOOR_H, 'Fire exit, exit only, no outside hardware (brief ASK-2)'], // decision 4
  ['RA14', 'R', 'z', 54, 5, 'door', 1.0], // Michael, 2026-10-11
  ['RA17', 'B', 'z', 30, 73, 'door', 1.0],
  ['RB01', 'G', 'z', 30, 54.5, 'door', 1.0], // staff door off yard B
  ['RB02', 'G', 'z', 30, 67, 'roller', 3.0, 3.0], // goods roller on BG07 (x 64-70); roller 3.0 x 3.0 as RA04
  ['RB03', 'G', 'x', 57, 33, 'door', 1.0],
  ['RB04', 'G', 'x', 60.5, 36.5, 'door', 1.0],
  ['RB05', 'G', 'z', 56.5, 59.5, 'door', 1.0], // the door the technician wedges
  ['RB06', 'G', 'x', 70, 58, 'door', 1.0],
  ['RB07', 'G', 'z', 60, 64, 'door', 1.0, DOOR_H, EXIT('RB07')],
  ['RB08', 'G', 'z', 62, 60, 'door', 1.0, DOOR_H, KEY('RB08')], // 4 off RB07 across the passage
  ['RB09', 'G', 'x', 76, 68, 'double', 1.8, DOOR_H, KEY('RB09')],
  ['RB10', 'G', 'x', 100, 68, 'gate', 3.0, DOOR_H, KEY('RB10')], // compound gate off the drive (h replaced by the wall's, decision 1)
  ['RB11', 'G', 'x', 76, 61, 'gate', 1.0, DOOR_H, KEY('RB11')], // compound gate from the passage
  ['RB12', 'G', 'z', 50.5, 83, 'door', 1.0],
  ['RB13', 'G', 'x', 70, 39.5, 'double', 1.8, DOOR_H, EXIT('RB13')], // equipment door
  ['RB14', 'G', 'x', 100, 45, 'fire-door', 1.0, DOOR_H, EXIT('RB14')],
  ['RB15', 'G', 'z', 60, 57.5, 'fire-door', 1.0, DOOR_H, EXIT('RB15')], // fire stair B exit; centre 57.5 (Michael, 2026-10-11 fix: stair east wall at x 58.5, door spans 57-58 on the landing)
  ['RB17', 'R', 'x', 58.5, 58, 'door', 1.0],
  ['XG01', 'G', 'x', 52, 61, 'gate', 1.0], // rear yard to passage gate (03B 7.2 notes: X06 to X07)
];

const GAP = 0.1; // decision 2: probe distance either side of the centre

// md: text of 03B-block-plan.md; cells: its table cell splitter
export function openings(md, cells, walls, rooms) {
  const ctl = new Map();
  const a = md.indexOf('### 7.1 '), b = md.indexOf('### 7.2 ');
  for (const [from, to, pre] of [[a, md.indexOf('\nSelf-check', a), '| RA'], [b, md.indexOf('\nInside zones', b), '| RB']]) { // 7.1 and 7.2 tables
    for (const l of md.slice(from, to).split('\n')) {
      if (!l.startsWith(pre)) continue;
      const c = cells(l);
      ctl.set(c[0], c[4]); // Id, Control
    }
  }
  ctl.set('XG01', 'Chain-link gate, push-bar on the passage side'); // 2d-2b decision 2: no 7.2 row
  const roomAt = (level, x, z) => rooms.find((r) => r.level === level && x > r.rect[0] && x < r.rect[2] && z > r.rect[1] && z < r.rect[3])?.id;
  return T.map(([id, level, axis, line, centre, type, w, h0 = DOOR_H, ringExempt]) => {
    const horiz = axis === 'z';
    const lo = centre - w / 2, hi = centre + w / 2;
    const wall = walls.find((m) => m.level === level && (horiz ? m.a[1] === line && m.b[1] === line && m.a[0] <= lo && m.b[0] >= hi : m.a[0] === line && m.b[0] === line && m.a[1] <= lo && m.b[1] >= hi)); // decision 2: the wall containing the whole opening
    if (!wall) throw new Error(`no wall for ${id}`);
    const h = type === 'gate' ? wall.h : h0; // 2d-2b decision 1: a gate takes its wall's full height (brief 85-86; gates are not in DOOR_TYPES, check.mjs 40)
    const at = centre - (horiz ? wall.a[0] : wall.a[1]);
    if (at % 0.5) throw new Error(`${id} at ${at} is off the 0.5 grid (A02)`);
    const probe = (d) => (horiz ? roomAt(level, centre, line + d) : roomAt(level, line + d, centre));
    const control = ctl.get(id.split('-')[0]);
    const reason = id === 'XG01' ? `${control} (03B 7.2 notes: X06 to X07 gate, escape way from RB15)` : `${control} (03B 7.${id.startsWith('RA') ? 1 : 2} ${id})`; // 2d-2b decision 2
    return {
      id, wall: wall.id, at, w, h, sill: 0, type,
      between: [probe(-GAP), probe(GAP)], // -x or -z side first
      locked: true, key: control, reason, // 2d-2a decision 2: night, locked
      ...(ringExempt ? { ringExempt } : {}),
    };
  });
}
