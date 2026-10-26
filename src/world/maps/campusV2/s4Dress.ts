// (campus-greybox, v2 lane S4) Copied from `campusS4Dress.ts` at P0; the S4 lane's greybox. Built only when `flags.campusV2` names 4.
/**
 * Section 4 art dressing (sector-redesign ART-S4, `docs/sector-redesign/briefs/ART-S4.md`, built on the ART-KIT API per
 * `docs/sector-redesign/checks/art-kit-build.md`): the data hall. `S4_ART_TAGS` (every room of `S4_ROOMS`), `HERO_S4` (the
 * hero set H4, `hero-s4.glb`, built by `scripts/campus-props/hero_s4.py`) and `dressS4`: the skins of the greybox (pod
 * racks, containment panels and roofs, cable baskets, spare rack, CRAC units, battery racks, UPS cabinets, chillers, generator,
 * fuel tank, dock crates, cage faces), the hero placements (NOC video wall and desks, the security room desk, the
 * suppression banks, the pod PDUs, the raised-floor grid) and then `d.base()` last.
 *
 * Hero placements are searched, not hard-coded: each has a preferred point (the brief's) and the nearest candidate that
 * passes the keepouts, the greybox overlap check and the earlier heroes wins (`S4_HERO_LOG` says where each landed, or that
 * it was omitted). The gameplay is the greybox's: the skins write no box, the heroes only where their class says.
 */
import heroReport from '../../campusArt/assets/hero-s4.json';
import type { ArtTag } from '../../campusArt/artTags';
import { writesBoxes, type ArtPlacement, type PropCatalogue, type V3 } from '../../campusArt/catalogue';
import { CAMPUS_LOOK } from '../../campusArt/campusKit';
import type { CampusDresser } from '../../campusArt/dresser';
import { boxAt, boxesIn, rectsOverlap } from '../../campusArt/geometry';
import { blocked, overlapsGreybox, placementMount, shapesOf } from '../../campusArt/keepouts';
import { PROP_LOOK } from '../../props/facilityProps';
import { S4_BASKET, S4_BOX, S4_DECK, S4_GROUPS, S4_NOC, S4_PODS } from './s4';

/** Every room of `S4_ROOMS` -> its tag (brief section 1). */
export const S4_ART_TAGS: Record<string, ArtTag> = {
  's4-dock': 'dock',
  's4-sc': 'corridor',
  's4-lobby': 'lobby',
  's4-lobby-b': 'lobby',
  's4-lobby-c': 'lobby',
  's4-mantrap': 'mantrap',
  's4-batt': 'battery',
  's4-cc': 'corridor',
  's4-ups': 'ups',
  's4-hall': 'data-hall',
  's4-hall-w': 'data-hall',
  's4-hall-e': 'data-hall',
  's4-hall-n': 'data-hall',
  's4-cage': 'cage',
  's4-sec': 'security',
  's4-noc': 'noc',
  's4-nc': 'corridor',
  's4-riser': 'riser',
  's4-yard': 'ext-compound',
  's4-deck': 'roof-plant',
};

// ------------------------------------------------------------------------------------------------------ the catalogue

interface Bounds {
  lo: V3;
  hi: V3;
}
const report = (heroReport as unknown as { pieces: Record<string, { bounds: { min: number[]; max: number[] } }> }).pieces;
const bounds: Record<string, Bounds> = Object.fromEntries(
  Object.entries(report).map(([id, p]) => [id, { lo: [p.bounds.min[0]!, p.bounds.min[1]!, p.bounds.min[2]!] as const, hi: [p.bounds.max[0]!, p.bounds.max[1]!, p.bounds.max[2]!] as const }]),
);

const IDS = ['containPanel', 'podRoof', 'basketRun', 'cracUnit', 'upsCabinet', 'batteryString', 'chiller', 'genset', 'fuelTank', 'crateStack', 'cagePanel', 'suppressionBank'] as const;

const footprintOf = (id: string): readonly [number, number, number, number] => {
  const b = bounds[id]!;
  return [b.lo[0], b.lo[2], b.hi[0], b.hi[2]];
};

/** H4 triangle budgets (the dress test holds the report under them; the brief's table was a guide: 5 k for the set). */
const TRIS: Record<(typeof IDS)[number], number> = {
  containPanel: 80,
  podRoof: 90,
  basketRun: 230,
  cracUnit: 160,
  upsCabinet: 110,
  batteryString: 180,
  chiller: 270,
  genset: 500,
  fuelTank: 200,
  crateStack: 80,
  cagePanel: 200,
  suppressionBank: 250,
};

/**
 * The hero set H4 (id 'H4'). Row pieces model local x along the row (the pitch) and local z as their depth (front +z). Every
 * skin class except the suppression bank (a `see` rack: collision only, light passes the cylinders). `basketRun`'s hull
 * runs 3.0 m (the trapeze hanger rods to the slab, 2 cm each) and the genset's 3.6 (the exhaust stack): their `overhang`
 * entries let the skin stand that far off its greybox box, nothing else does.
 */
export const HERO_S4: PropCatalogue | null = {
  id: 'H4',
  glb: 'hero-s4.glb',
  ids: IDS,
  materials: ['steel', 'steelDark', 'galv', 'plastic', 'white', 'red', 'concrete', 'brass', 'screen', 'lamp'],
  looks: { ...PROP_LOOK, ...CAMPUS_LOOK },
  collision: {
    containPanel: null,
    podRoof: null,
    basketRun: null,
    cracUnit: null,
    upsCabinet: null,
    batteryString: null,
    chiller: null,
    genset: null,
    fuelTank: null,
    crateStack: null,
    cagePanel: null,
    suppressionBank: [{ lo: [-0.6, 0, 0], hi: [0.6, 1.7, 0.35], see: true, noLedge: true }],
  },
  footprint: Object.fromEntries(IDS.map((id) => [id, footprintOf(id)])),
  triBudget: TRIS,
  hung: [],
  fit: ['containPanel', 'podRoof', 'basketRun', 'cracUnit', 'upsCabinet', 'batteryString', 'chiller', 'genset', 'fuelTank', 'crateStack', 'cagePanel'],
  overhang: {
    // (artpol, polish2 2) the two rods per module as hero-s4.glb's steel mesh has them: 2 cm square at local x 0, z +-0.48,
    // from the basket's top rail (0.4) to the hull top (3.0); radius 0.015 covers the square's half diagonal
    basketRun: {
      by: 2.7,
      what: 'the trapeze hanger rods (2 cm) up to the slab, 2.6 m over the basket',
      parts: [
        { a: [0, 0.4, -0.48], b: [0, 3.0, -0.48], r: 0.015 },
        { a: [0, 0.4, 0.48], b: [0, 3.0, 0.48], r: 0.015 },
      ],
    },
    // (artnext B9) the exhaust stack as hero-s4.glb's steelDark / steel meshes have it (hero_s4.py genset()): a 0.3 dia stack
    // from the container roof (2.6) to the hull top (3.6) at local (-1.0, -2.4), and its 0.5 dia flange (2.6 .. 2.8)
    genset: {
      by: 1.05,
      what: 'the exhaust stack (0.3 dia) above the container roof',
      parts: [
        { a: [-1.0, 2.6, -2.4], b: [-1.0, 3.6, -2.4], r: 0.15 },
        { a: [-1.0, 2.6, -2.4], b: [-1.0, 2.8, -2.4], r: 0.25 },
      ],
    },
  },
  emissive: { cracUnit: ['screen'], upsCabinet: ['lamp'] },
  pitch: { containPanel: 1.2, podRoof: 1.2, basketRun: 1.0, cracUnit: 2.0, upsCabinet: 0.8, batteryString: 2.0, chiller: 4.0, genset: 3.0, fuelTank: 3.0, crateStack: 1.2, cagePanel: 1.5, suppressionBank: 1.2 },
  bounds,
  classOf: {
    containPanel: 'skin',
    podRoof: 'skin',
    basketRun: 'skin',
    cracUnit: 'skin',
    upsCabinet: 'skin',
    batteryString: 'skin',
    chiller: 'skin',
    genset: 'skin',
    fuelTank: 'skin',
    crateStack: 'skin',
    cagePanel: 'skin',
    suppressionBank: 'see',
  },
};

// ---------------------------------------------------------------------------------------------------------- the dresser

/** Where each hero landed (or that it was omitted), rewritten by every `dressS4` call: the build report's L-log and the test read it. */
export const S4_HERO_LOG: string[] = [];

const snap = (v: number, step = 0.05): number => Math.round(v / step) * step;
const snapYaw = (yaw: number): number => {
  const q = Math.PI / 2;
  const t = (((Math.round(yaw / q) * q) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.abs(t - 2 * Math.PI) < 1e-9 ? 0 : t;
};

interface Cand {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/** Candidates round a preferred point, nearest first: `ring` m in `step` steps over x / z (or along one axis when the other `ring` is 0). */
function around(c: Cand, rx: number, rz: number, step: number, yaws: readonly number[] = [c.yaw]): Cand[] {
  const out: { d: number; c: Cand }[] = [];
  for (let dx = -rx; dx <= rx + 1e-9; dx += step) {
    for (let dz = -rz; dz <= rz + 1e-9; dz += step) {
      for (const yaw of yaws) out.push({ d: Math.hypot(dx, dz) + (yaw === c.yaw ? 0 : 0.01), c: { x: c.x + dx, y: c.y, z: c.z + dz, yaw } });
    }
  }
  return out.sort((a, b) => a.d - b.d).map((o) => o.c);
}

/**
 * The first candidate whose placement passes the keepouts (`blocked`), the greybox overlap check (a floor mount) and the boxes
 * of the heroes already placed; null (and a log line) when none does. `d.add` then places it exactly.
 */
function place(d: CampusDresser, piece: string, cands: readonly Cand[], o: { cls: ArtPlacement['cls']; why: string; group?: number; label: string; quiet?: boolean }): number | null {
  const i = piece.indexOf(':');
  const cat = d.cats[piece.slice(0, i)]!;
  const prop = piece.slice(i + 1);
  const k = d.keepouts;
  for (const c of cands) {
    const p: ArtPlacement = { cat: cat.id, prop, x: snap(c.x), y: snap(c.y, 0.01), z: snap(c.z), yaw: snapYaw(c.yaw), section: d.ctx.section, cls: o.cls, why: o.why };
    const m = placementMount(k, d.ctx, cat, p);
    if ((m === 'floor-wall' || m === 'floor-free') && overlapsGreybox(k, d.ctx.boxes, cat, p) >= 0) continue;
    if (blocked(k, d.ctx, cat, p, m)) continue;
    if (writesBoxes(p)) {
      const mine = shapesOf(cat, p).filter((s) => s.box);
      const clash = d.placements.some((q) => {
        if (!writesBoxes(q)) return false;
        const qc = d.cats[q.cat]!;
        return shapesOf(qc, q).some((s) => s.box && mine.some((t) => s.y0 + 0.01 < t.y1 && t.y0 < s.y1 - 0.01 && rectsOverlap(t.plan, s.plan, 0.01)));
      });
      if (clash) continue;
    }
    const idx = d.add(piece, c.x, c.y, c.z, c.yaw, { cls: o.cls, why: o.why, group: o.group });
    if (!o.quiet) S4_HERO_LOG.push(`${o.label}: ${piece} at (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}) yaw ${p.yaw.toFixed(2)}`);
    return idx;
  }
  if (!o.quiet) S4_HERO_LOG.push(`${o.label}: ${piece} omitted (no candidate passes the keepouts)`);
  return null;
}

export function dressS4(d: CampusDresser): void {
  S4_HERO_LOG.length = 0;
  const bx = d.ctx.boxes;

  // ---- the pods P1-P5: two rack rows (cold aisles outside: row 1 fronts -x, row 2 fronts +x), containment panels, the roof
  const [pz0, pz1] = S4_BOX.podZ;
  const pzc = (pz0 + pz1) / 2;
  S4_PODS.forEach((x0, n) => {
    const tag = `pod P${n + 1}`;
    d.skinRow('F:serverRack', boxAt(bx, x0 + 0.6, 1.1, pzc), false, -1, { why: `${tag} west rack row, fronts the west cold aisle` });
    d.skinRow('F:serverRack', boxAt(bx, x0 + 3.0, 1.1, pzc), false, 1, { why: `${tag} east rack row, fronts the east cold aisle` });
    d.skinRow('H4:containPanel', boxAt(bx, x0 + 0.05, 2.55, pzc), false, 1, { why: `${tag} hot-aisle containment, west panel` });
    d.skinRow('H4:containPanel', boxAt(bx, x0 + 3.55, 2.55, pzc), false, 1, { why: `${tag} hot-aisle containment, east panel` });
    d.skinRow('H4:podRoof', boxAt(bx, x0 + 1.8, 2.95, pzc), false, 1, { why: `${tag} containment roof (visual skin of the overhead slab)` });
  });

  // ---- the cable baskets (tops 4.4, flush; the CR4 box takes exact-width modules, nothing proud on its east / west faces)
  const basketBox = (q: readonly number[], z0 = q[1]!, z1 = q[3]!): number => boxAt(bx, (q[0]! + q[2]!) / 2, S4_BASKET - 0.2, (z0 + z1) / 2);
  const [b1x0, b1z0, b1x1, b1z1] = S4_BOX.b1;
  const b1 = [b1x0, b1z0, b1x1, b1z1];
  d.skinRow('H4:basketRun', basketBox(b1, b1z0, 32.4), false, 1, { why: 'cable basket B1 (south box), wire mesh full of cables' });
  d.skinRow('H4:basketRun', basketBox(b1, 32.4, 35.6), false, 1, { why: 'cable basket B1 CR4 box (exact width: nothing proud on the lip faces)' });
  d.skinRow('H4:basketRun', basketBox(b1, 35.6, b1z1), false, 1, { why: 'cable basket B1 (north box)' });
  d.skinRow('H4:basketRun', basketBox(S4_BOX.b2), false, 1, { why: 'cable basket B2' });
  d.skinRow('H4:basketRun', basketBox(S4_BOX.b3), false, 1, { why: 'cable basket B3' });
  d.skinRow('H4:basketRun', basketBox(S4_BOX.bN), true, 1, { why: 'cable basket B-N along the hall north wall' });
  d.skinRow('H4:basketRun', basketBox(S4_BOX.bCage), false, 1, { why: 'cable basket B-cage over the cage' });
  S4_HERO_LOG.push('stub basket (x 31.6..32.6, z 41.8..42.15): not skinned, 0.35 m is under one module (a basket module would scale 0.37, under the 0.8 fit limit)');

  // ---- the build-out area's spare rack and the NE plant area's CRAC units
  const [sx0, sz0, sx1, sz1] = S4_BOX.spareRack;
  d.skinRow('F:serverRack', boxAt(bx, (sx0 + sx1) / 2, 1.1, (sz0 + sz1) / 2), true, -1, { why: 'spare rack row in the build-out area' });
  const [cx0, cz0, cx1, cz1] = S4_BOX.crac;
  d.skinRow('H4:cracUnit', boxAt(bx, (cx0 + cx1) / 2, 1.0, (cz0 + cz1) / 2), true, -1, { why: 'CRAC units, fronts to the cage side; the status displays are on the cold-aisle circuit', group: S4_GROUPS.cold1 });

  // ---- the battery room racks and the UPS cabinets
  const batt = S4_BOX.batteryRacks;
  d.skinRow('K:batteryRack', boxAt(bx, (batt[0][0] + batt[0][2]) / 2, 0.6, (batt[0][1] + batt[0][3]) / 2), false, 1, { why: 'battery rack string, west row' });
  d.skinRow('K:batteryRack', boxAt(bx, (batt[1][0] + batt[1][2]) / 2, 0.6, (batt[1][1] + batt[1][3]) / 2), false, -1, { why: 'battery rack string, east row' });
  const [ux0, uz0, ux1, uz1] = S4_BOX.upsCabinets;
  d.skinRow('H4:upsCabinet', boxAt(bx, (ux0 + ux1) / 2, 1.0, (uz0 + uz1) / 2), false, 1, { why: 'UPS cabinet line-up, fronts the room; the mimic LEDs are on the UPS circuit', group: S4_GROUPS.ups });

  // ---- the plant deck chillers, the generator and the fuel tank (the tank is 2.0 high on the parallel branches, 1.6 here: both fit)
  for (const [x0, z0, x1, z1] of S4_BOX.chillers) d.skin('H4:chiller', boxAt(bx, (x0 + x1) / 2, S4_DECK + 1.0, (z0 + z1) / 2), 0, { why: 'air-cooled chiller on the plant deck' });
  const [gx0, gz0, gx1, gz1] = S4_BOX.generator;
  d.skin('H4:genset', boxAt(bx, (gx0 + gx1) / 2, 1.3, (gz0 + gz1) / 2), 0, { why: 'containerised generator, exhaust stack above the roof' });
  const [tx0, tz0, tx1, tz1] = S4_BOX.tanks;
  const tank = bx.findIndex((b) => Math.abs(b.c[0] - (tx0 + tx1) / 2) < 0.05 && Math.abs(b.c[2] - (tz0 + tz1) / 2) < 0.05 && Math.abs(b.s[0] - (tx1 - tx0)) < 0.05 && b.s[1] >= 1.55 && b.s[1] <= 2.05);
  if (tank < 0) throw new Error('campus art S4: the fuel tank box is not found');
  d.skin('H4:fuelTank', tank, 0, { why: 'bunded fuel tank (the compound diesel the handler guards)' });

  // ---- the dock's two crate stacks (1.0 high boxes in the dock)
  for (const i of boxesIn(bx, 14, 16, 34, 22, 0, 2.05)) {
    const b = bx[i]!;
    if (b.s[1] < 0.95 || b.s[1] > 2.05 || Math.max(b.s[0], b.s[2]) > 1.3 || b.c[1] - b.s[1] / 2 > 0.05) continue;
    d.skin('H4:crateStack', i, 0, { why: 'replacement drives in flight cases (the 03:00 courier)' });
  }

  // ---- the cage faces: thin (<= 0.12) boxes >= 2.2 high on the cage perimeter; the gates' doors stay the game's
  const [kx0, kz0, kx1, kz1] = S4_BOX.cage;
  const onPerimeter = (b: (typeof bx)[number]): boolean => Math.abs(b.c[0] - kx0) < 0.06 || Math.abs(b.c[0] - kx1) < 0.06 || Math.abs(b.c[2] - kz0) < 0.06 || Math.abs(b.c[2] - kz1) < 0.06;
  for (const i of boxesIn(bx, kx0 - 0.1, kz0 - 0.1, kx1 + 0.1, kz1 + 0.1, 0, 3.1)) {
    const b = bx[i]!;
    if (b.s[1] < 2.2 || Math.min(b.s[0], b.s[2]) > 0.12 || b.yaw !== 0 || !onPerimeter(b)) continue;
    d.skinRow('H4:cagePanel', i, b.s[0] > b.s[2], 1, { why: 'cage face: welded mesh panels' });
  }

  // ---- heroes (placed before the base pass so it dresses round them)
  heroes(d);

  d.base();
}

/** The hero placements. Preferred points are the brief's; each lands on the nearest candidate that passes, or is omitted and logged. */
function heroes(d: CampusDresser): void {
  const PI = Math.PI;
  const N = S4_NOC;

  // the NOC video wall: the north wall's inner face is over the stair opening (the flight rises along it), so it goes on the
  // east wall's inner face (x 7.9, the security room / corridor partition), facing the operators
  place(d, 'F:monitorWall', around({ x: 7.9, y: N, z: 44.6, yaw: -PI / 2 }, 0, 1.5, 0.1), { cls: 'solid', why: 'the NOC video wall the operators watch', group: S4_GROUPS.noc, label: 'NOC video wall' });
  // the NOC operators' desks: the strip south of the stair rail, outside the guards' takedown spots and the nav seed
  place(d, 'F:securityDesk', around({ x: 0, y: N, z: 46.0, yaw: PI }, 3, 0.6, 0.1, [PI, 0]), { cls: 'solid', why: 'NOC operator desk', group: S4_GROUPS.noc, label: 'NOC desk 1' });
  place(d, 'F:securityDesk', around({ x: 4, y: N, z: 46.0, yaw: PI }, 3, 0.6, 0.1, [PI, 0]), { cls: 'solid', why: 'NOC operator desk', group: S4_GROUPS.noc, label: 'NOC desk 2' });
  // the security room's second desk
  place(d, 'F:securityDesk', around({ x: 2, y: 0, z: 46.2, yaw: PI }, 4, 0.8, 0.1, [PI, 0]), { cls: 'solid', why: 'security room desk', group: S4_GROUPS.sec, label: 'security room desk' });

  // FM-200 banks for the hall: the brief's west wall (x -4, z 25 and 39) is the supervisor's walked wall and two door zones,
  // so they go to the nearest free wall run, the west wall first then the north wall
  const west: Cand[] = [];
  for (const z of [25, 39]) west.push(...around({ x: -3.85, y: 0, z, yaw: PI / 2 }, 0, 6, 0.1).filter((c) => c.z >= 22.7 && c.z <= 41.3));
  const north: Cand[] = [];
  for (const x of [6, 12, 16, 26, 30]) north.push(...around({ x, y: 0, z: 41.85, yaw: PI }, 4, 0, 0.1));
  const east: Cand[] = around({ x: 33.85, y: 0, z: 36, yaw: -PI / 2 }, 0, 4, 0.1);
  for (const [n, pref] of [[1, [...west.filter((c) => Math.abs(c.z - 25) <= 6), ...north.slice(0, 80)]], [2, [...west.filter((c) => Math.abs(c.z - 39) <= 6), ...north.slice(80), ...east]]] as const) {
    place(d, 'H4:suppressionBank', pref, { cls: 'see', why: 'FM-200 cylinders for the hall', label: `suppression bank ${n}` });
  }

  // PDU strips on the pod end faces beside the doors (a wall piece on the rack end, never on a door)
  S4_PODS.forEach((x0, n) => {
    place(d, 'K:pduStrip', [{ x: x0 + 0.3, y: 0, z: S4_BOX.podZ[0], yaw: PI }, { x: x0 + 0.9, y: 0, z: S4_BOX.podZ[0], yaw: PI }], { cls: 'visual', why: `pod P${n + 1} PDU, south end beside the door`, label: `pod P${n + 1} PDU south` });
    place(d, 'K:pduStrip', [{ x: x0 + 3.3, y: 0, z: S4_BOX.podZ[1], yaw: 0 }, { x: x0 + 2.7, y: 0, z: S4_BOX.podZ[1], yaw: 0 }], { cls: 'visual', why: `pod P${n + 1} PDU, north end beside the door`, label: `pod P${n + 1} PDU north` });
  });

  // the raised floor: 3 m tiles over the hall floor (a 1 cm decal), greedy on a 1 m lattice. A decal is exempt from the floor
  // keepouts and the greybox overlap (artnext A6), so the grid now runs under the racks' aisles and the pods' ends alike
  const tiles: Cand[] = [];
  let tried = 0;
  for (let x = -2.5; x <= 32.5 + 1e-9; x += 1) {
    for (let z = 23.5; z <= 40.5 + 1e-9; z += 1) {
      if (tiles.some((t) => Math.abs(t.x - x) < 3 - 1e-6 && Math.abs(t.z - z) < 3 - 1e-6)) continue;
      tried++;
      const c = { x, y: 0.01, z, yaw: 0 };
      if (place(d, 'K:floorTileGrid', [c], { cls: 'visual', why: 'raised-floor tile lines of the data hall', label: 'floor grid', quiet: true }) !== null) tiles.push(c);
    }
  }
  S4_HERO_LOG.push(`floor grid: ${tiles.length} 3 m tiles placed (${tried} lattice points tried)`);
}
