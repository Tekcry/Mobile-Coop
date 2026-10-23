/**
 * Section 2 art dressing (sector-redesign ART-S2, briefs/ART-S2.md; ART-KIT API in `src/world/campusArt`). `S2_ART_TAGS`
 * tags every room of `S2_ROOMS`; `dressS2` skins the greybox objects (desks and chairs, counters, tables, cages,
 * switchgear, shelving, lift doors, the CR2 planter), places the heroes, then `d.base()` last. A skin or hero that
 * fails its rule is logged (`S2_DRESS_LOG`, read by the section's test and the build report), never thrown: a build
 * must not break the game.
 */
import type { ArtTag } from '../campusArt/artTags';
import { hullObb, type ArtBox, type ArtPlacement, type PropCatalogue, type V3 } from '../campusArt/catalogue';
import type { CampusDresser } from '../campusArt/dresser';
import { boxAt, boxesIn, pointSegDist } from '../campusArt/geometry';
import { overlapsGreybox } from '../campusArt/keepouts';
import heroReport from '../campusArt/assets/hero-s2.json';
import { CAMPUS_LOOK } from '../campusArt/campusKit';
import { PROP_LOOK } from '../props/facilityProps';
import { S2_GROUPS } from './campusS2';

export const S2_ART_TAGS: Record<string, ArtTag> = {
  post: 'mailroom',
  mail: 'mailroom',
  lift: 'lobby',
  store: 'store',
  foyer: 'reception',
  hall: 'atrium',
  hallne: 'lobby',
  plant: 'plant',
  roof: 'roof',
  l1sw: 'office-open',
  l1kitchen: 'kitchen',
  l1north: 'office-open',
  l1fac: 'office-cell',
  l1wing: 'office-open',
  l2sw: 'office-open',
  l2north: 'office-cell',
  l2wing: 'office-open',
};

/** The H2 piece ids (hero_s2.py, `BUILDERS` order). */
const H2_IDS = ['receptionCounter', 'speedGate', 'cafeCounter', 'mailCage', 'switchBoard', 'sortingTable', 'stockShelf', 'bmsDesk', 'liftDoor', 'balconyPlanter', 'logoWall', 'lowTable', 'kitchenCounter'] as const;

const report = heroReport as unknown as { materials: string[]; pieces: Record<string, { bounds: { min: number[]; max: number[] } }> };
const bounds: Record<string, { lo: V3; hi: V3 }> = Object.fromEntries(
  Object.entries(report.pieces).map(([id, p]) => [id, { lo: [p.bounds.min[0]!, p.bounds.min[1]!, p.bounds.min[2]!] as const, hi: [p.bounds.max[0]!, p.bounds.max[1]!, p.bounds.max[2]!] as const }]),
);
const rec = <T>(v: Record<string, T>): Readonly<Record<string, T>> => v;
const LOW_TABLE_BOX: ArtBox = { lo: [-0.59, 0, -0.29], hi: [0.59, 0.39, 0.29] };

/**
 * Section 2's hero set H2 (briefs/ART-S2.md section 3, `hero-s2.glb`): skins of the greybox's counters, desks, cages and
 * doors, the foyer logo wall (visual, flush) and the visitors' low table (solid). Hulls are the greybox size + 1 cm a side
 * (the balcony planter exactly), so the skin rule holds with no scale where the module matches.
 */
export const HERO_S2: PropCatalogue | null = {
  id: 'H2',
  glb: 'hero-s2.glb',
  ids: H2_IDS,
  materials: report.materials,
  looks: { ...PROP_LOOK, ...CAMPUS_LOOK },
  collision: rec(Object.fromEntries(H2_IDS.map((id) => [id, id === 'lowTable' ? [LOW_TABLE_BOX] : null]))),
  footprint: rec(Object.fromEntries(H2_IDS.map((id) => [id, [bounds[id]!.lo[0], bounds[id]!.lo[2], bounds[id]!.hi[0], bounds[id]!.hi[2]] as [number, number, number, number]]))),
  triBudget: { receptionCounter: 350, speedGate: 160, cafeCounter: 350, mailCage: 300, switchBoard: 200, sortingTable: 150, stockShelf: 150, bmsDesk: 450, liftDoor: 80, balconyPlanter: 200, logoWall: 60, lowTable: 60, kitchenCounter: 150 },
  hung: [],
  fit: ['receptionCounter', 'speedGate', 'cafeCounter', 'mailCage', 'switchBoard', 'sortingTable', 'stockShelf', 'bmsDesk', 'liftDoor', 'balconyPlanter', 'kitchenCounter'],
  overhang: {
    receptionCounter: { by: 0.2, what: 'the two staff monitors on the worktop behind the transaction top' },
    cafeCounter: { by: 0.4, what: 'the coffee machine and the cake cabinet on the quartz top' },
    sortingTable: { by: 0.2, what: 'the sorting trays on the bench' },
    bmsDesk: { by: 0.5, what: 'the three monitors and the plotter roll holder on the desk' },
  },
  emissive: { speedGate: ['lamp'], receptionCounter: ['screen'], bmsDesk: ['screen'] },
  pitch: { receptionCounter: 3.0, speedGate: 1.0, cafeCounter: 3.0, mailCage: 2.2, switchBoard: 2.2, sortingTable: 3.0, stockShelf: 1.2, bmsDesk: 3.0, liftDoor: 1.2, balconyPlanter: 2.0, logoWall: 4.0, lowTable: 1.2, kitchenCounter: 1.2 },
  bounds,
  classOf: { receptionCounter: 'skin', speedGate: 'skin', cafeCounter: 'skin', mailCage: 'skin', switchBoard: 'skin', sortingTable: 'skin', stockShelf: 'skin', bmsDesk: 'skin', liftDoor: 'skin', balconyPlanter: 'skin', logoWall: 'visual', lowTable: 'solid', kitchenCounter: 'skin' },
};

/** What the last `dressS2` run skipped (a skin or hero that failed its rule), one line each. */
export const S2_DRESS_LOG: string[] = [];

const PI = Math.PI;

/** Runs one dressing step; a throw is logged with its label and the step is dropped. */
function attempt(label: string, fn: () => void): boolean {
  try {
    fn();
    return true;
  } catch (e) {
    S2_DRESS_LOG.push(`${label}: ${(e as Error).message}`);
    return false;
  }
}

/** The distance from a plan point to the nearest route leg of the section (the K1 legs the chairs keep off). */
function routeDist(d: CampusDresser, x: number, z: number): number {
  let best = Infinity;
  for (const r of d.ctx.sector.routes) {
    for (let i = 1; i < r.pts.length; i++) {
      const a = r.pts[i - 1]!;
      const b = r.pts[i]!;
      best = Math.min(best, pointSegDist(x, z, a[0], a[1], b[0], b[1]));
    }
  }
  return best;
}

/** The L1 and L2 desks (`furn` loops: 1.6 x 0.75 x 0.8 blocks at floor + 0.375). */
const L1_DESKS: readonly (readonly [number, number])[] = [[-31.5, -4.5], [-31.5, 0.5], [-12, 3], [-12, 5]];
const L2_DESKS: readonly (readonly [number, number])[] = [[-34, 3], [-36, 1], [-16, 3.5], [-12, 3.5], [-33, -25.5]];

/** One chair at a desk (on the `side` of it), logged and dropped when a keepout or a greybox box refuses it. */
function chairAt(d: CampusDresser, x: number, floor: number, z: number, side: 1 | -1): boolean {
  const n0 = d.placements.length;
  const ok = attempt(`chair ${x},${z},${floor} side ${side}`, () => {
    d.add('F:officeChair', x, floor, z + side * 0.7, side > 0 ? PI : 0, { cls: 'see', why: 'chair at the desk' });
    const i = overlapsGreybox(d.keepouts, d.ctx.boxes, d.cats.F!, d.placements[n0]!);
    if (i >= 0) throw new Error(`B: overlaps greybox box ${i}`);
  });
  if (!ok && d.placements.length > n0) {
    d.placements.pop();
    d.report.placed['F:officeChair'] = (d.report.placed['F:officeChair'] ?? 1) - 1;
  }
  return ok;
}

/** An office desk skin and its chair: the user's side is the one away from the nearest route leg whose chair clears every
 *  keepout; a desk with no chair spot keeps the side away from the route. */
function desk(d: CampusDresser, x: number, z: number, floor: number): void {
  const i = boxAt(d.ctx.boxes, x, floor + 0.375, z);
  const pref = routeDist(d, x, z + 1.2) >= routeDist(d, x, z - 1.2) ? 1 : -1;
  const side = chairAt(d, x, floor, z, pref) ? pref : chairAt(d, x, floor, z, pref > 0 ? -1 : 1) ? (pref > 0 ? -1 : 1) : pref;
  attempt(`desk ${x},${z},${floor}`, () => void d.skin('F:officeDesk', i, side > 0 ? 0 : PI, { why: 'office desk skin' }));
}

/** The four turnstile barrier segments (steel, 1.1 high, 0.3 thick, centred on z -23): found, not indexed. */
function barrierSegments(d: CampusDresser): number[] {
  return boxesIn(d.ctx.boxes, -30, -23.2, -8, -22.8, 0, 1.2).filter((i) => {
    const b = d.ctx.boxes[i]!;
    return Math.abs(b.s[1] - 1.1) < 0.01 && Math.abs(b.s[2] - 0.3) < 0.01 && Math.abs(b.c[1] - 0.55) < 0.01 && Math.abs(b.c[2] + 23) < 0.01;
  });
}

/** One exact hero placement; the first position that clears every keepout wins, the rest are logged (a fallback list). */
function place(d: CampusDresser, label: string, piece: string, spots: readonly (readonly [number, number, number, number])[], cls: ArtPlacement['cls'], why: string): boolean {
  for (const [x, y, z, yaw] of spots) if (attempt(`${label} at ${x},${z}`, () => void d.add(piece, x, y, z, yaw, { cls, why }))) return true;
  S2_DRESS_LOG.push(`${label}: omitted`);
  return false;
}

/** The seating group's spots: the low table (x, z, yaw) and its two lounge seats (at +-1.0 across the table's long axis, facing it). */
const SEATING: readonly (readonly [number, number, number])[] = [
  [-27.4, -19.5, 0],
  [-28, -21.5, 0],
  [-28.5, -20, PI / 2],
];

/** The table and both seats at one spot, all or none (a placement that throws rolls the group back). */
function seatingGroup(d: CampusDresser, [x, z, yaw]: readonly [number, number, number]): boolean {
  const alongX = yaw === 0;
  const seats: readonly (readonly [number, number, number])[] = alongX ? [[x - 1, z, PI / 2], [x + 1, z, -PI / 2]] : [[x, z - 1, 0], [x, z + 1, PI]];
  const n0 = d.placements.length;
  const ok = attempt(`seating group at ${x},${z}`, () => {
    d.add('H2:lowTable', x, 0, z, yaw, { cls: 'solid', why: "visitors' low table" });
    for (const [sx, sz, sy] of seats) d.add('F:loungeSeat', sx, 0, sz, sy, { cls: 'solid', why: "visitors' seating" });
  });
  if (!ok) {
    while (d.placements.length > n0) {
      const p = d.placements.pop()!;
      const key = `${p.cat}:${p.prop}`;
      d.report.placed[key] = (d.report.placed[key] ?? 1) - 1;
    }
  }
  return ok;
}

export function dressS2(d: CampusDresser): void {
  S2_DRESS_LOG.length = 0;
  const bx = d.ctx.boxes;
  const [F0, F1, F2] = [0, 4.4, 8.4];
  const at = (x: number, y: number, z: number): number => boxAt(bx, x, y, z);

  // ---- skins: the G floor
  attempt('reception desk', () => void d.skinRow('H2:receptionCounter', at(-20, 0.55, -27.1), true, 1, { why: 'reception counter skin (visitors on the turnstile side)' }));
  attempt('turnstile barriers', () => {
    for (const i of barrierSegments(d)) {
      const ks = d.skinRow('H2:speedGate', i, true, -1, { why: 'speed gate cabinets (the gates stay open gaps)' });
      const box = d.ctx.boxes[i]!;
      const lo = box.c[0] - box.s[0] / 2;
      const hi = box.c[0] + box.s[0] / 2;
      for (const k of ks) {
        const p = d.placements[k]!;
        p.group = S2_GROUPS.atrium;
        p.lamp = [0.1, 1, 0.3];
        // the skin stands 1 cm proud: slide the end modules in so nothing enters the 1.2 gates (or the walls)
        const o = hullObb(d.cats.H2!, p);
        p.x += Math.max(0, lo - (o.cx - o.hx)) - Math.max(0, o.cx + o.hx - hi);
      }
    }
  });
  attempt('cafe counter', () => void d.skinRow('H2:cafeCounter', at(-19, 0.55, -5.6), true, -1, { why: 'cafe counter skin (the cafe side)' }));
  attempt('cafe tables', () => {
    for (const [x, z] of [[-13, -9], [-13, -6.5], [-22.5, -9.5]] as const) d.skin('K:cafeTable', at(x, 0.375, z), 0, { why: 'cafe table skin' });
  });
  attempt('mail cages', () => {
    for (const [x, z] of [[-41.5, -13.5], [-38, -13.5], [-41.5, -18.5]] as const) d.skin('H2:mailCage', at(x, 0.9, z), 0, { why: 'mail cage skin' });
  });
  attempt('plant switchgear', () => {
    for (const z of [-10, -22]) d.skin('H2:switchBoard', at(1.5, 0.9, z), 0, { why: 'switchgear line-up skin (the F panel is 2.3 high and 1.6 deep: no fit, L1)' });
  });
  attempt('NW store block', () => void d.skinRow('H2:stockShelf', at(-42.5, 0.9, 3), false, 1, { why: 'stationery stock bay skin (K shelving is 0.5 deep: no fit, L2)' }));
  attempt('post sorting table', () => void d.skin('H2:sortingTable', at(-35, 0.45, -26), 0, { why: 'post-room sorting table skin' }));
  attempt('lift doors', () => {
    for (const f of [F0, F1, F2]) for (const z of [-10.5, -8, -5.5]) d.skin('H2:liftDoor', at(-40.93, f + 1.05, z), PI / 2, { why: 'lift door skin' });
  });

  // ---- skins: the offices (desks, then one chair each) and L1 / L2 furniture
  for (const [x, z] of L1_DESKS) attempt(`L1 desk ${x},${z}`, () => desk(d, x, z, F1));
  for (const [x, z] of L2_DESKS) attempt(`L2 desk ${x},${z}`, () => desk(d, x, z, F2));
  attempt('L1 kitchen counter', () => void d.skinRow('H2:kitchenCounter', at(-25, 4.95, -29.4), true, 1, { why: 'breakout kitchen run skin (K kitchenRun is 0.9 high, the counter 1.1: L3)' }));
  attempt('L1 BMS desk', () => void d.skin('H2:bmsDesk', at(-6.5, 4.775, 4.3), PI, { why: 'facilities desk skin (operator side south)' }));
  attempt('L2 board table', () => void d.skin('K:boardTable', at(-38, 8.775, 3), 0, { why: 'L2 board table skin' }));
  // the CR2 planter: 0 cm proud on its -x face (the lip's headroom side), planting no higher than the box top
  attempt('CR2 planter', () => void d.skinRow('H2:balconyPlanter', at(-9.0, 4.625, -8), false, 1, { why: 'balcony planter skin, flush with the box (the CR2 lip headroom)' }));

  // ---- heroes: the atrium and reception
  place(d, 'logoWall', 'H2:logoWall', [[-25.5, F0, -29.84, 0]], 'visual', 'the brand wall behind reception');
  // (artnext B3) the planted wall as a flush face skin on the atrium side (+x) of the x -30 west wall's two boxes (rule V no
  // longer applies: a skin writes no box and the greybox face stays the collision); the first centre that passes each box wins
  for (const [label, z, centres] of [['north bay', -12, [-12, -13, -11, -14]], ['south bay', -3.5, [-3.5, -4.5, -2.5, -5.5]]] as const) {
    const i = boxAt(bx, -30, 2, z);
    let done = false;
    for (const c of centres) {
      if (done) break;
      done = attempt(`greenWall ${label} at ${c}`, () => void d.skinFace('F:greenWall', i, 'e', { why: "the atrium's planted wall", at: [c], group: S2_GROUPS.atrium }));
    }
    if (!done) S2_DRESS_LOG.push(`greenWall ${label}: omitted`);
  }
  place(d, 'modelVitrine', 'F:modelVitrine', [[-10.6, F0, -27.4, -PI / 2], [-28.6, F0, -27.4, -PI / 2], [-11, F0, -27.5, -PI / 2], [-11, F0, -24.5, -PI / 2]], 'solid', 'the Tidewater product display');
  // the seating group: the brief's spot first (guard 2's patrol leg crosses it: K2), then two clear spots beside it (L5)
  for (const g of SEATING) if (seatingGroup(d, g)) break;

  d.base();
}
