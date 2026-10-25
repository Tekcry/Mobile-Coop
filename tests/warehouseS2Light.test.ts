/**
 * Sector Ops section 2 lamp pass (warehouse-s23, Michael M1: "I cant see properly at night"): the real warehouseOps light
 * field, baked in node with the pure bakers as `World.create` + `bakeLevelLight` do (the pattern of
 * `tests/warehouseS1Light.test.ts` and `ctcourseLight.test.ts`). Section 2's routes, objective and key decision points read
 * lit enough to see without night vision; the pockets (the takedown spots off every route, the lane's east half, the charge
 * bay, two rack tops) stay dark; sections 1 and 3 do not change; no 2 m column lists more lamps than the shaders hold.
 * `WH2LIGHT_PRINT=<file>` writes every point's level without the section 2 lamps and with them (the table in
 * `docs/archive/warehouse-s23/LIGHT-S2.md`).
 */
import { writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { S2_LIGHT_PASS } from '../src/world/maps/warehouseS2';
import { WAREHOUSE_SECTORS } from '../src/world/maps/warehouseSectors';
import { dressingOn } from '../src/world/detailPass';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps, LAMP_GRID, LAMP_GRID_SLOTS, LAMP_STRIDE, lampColumnDist, lampPlanReach } from '../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField, type FieldDoor } from '../src/world/lightField';
import { moonLight } from '../src/world/lampMath';
import { LIGHT } from '../src/world/lights';
import { hyp2 } from '../src/core/mathx';

const map = warehouseOps;
const b = new LevelBuilder();
map.build(b, 0);
const reg = b.lights;
let bake: LightBake;
let open: LightField;
let shut: LightField;
let bakeMs = 0;

beforeAll(() => {
  const t0 = performance.now();
  const set = canonicalLightSet(b.boxes, b.cylinders, 'warehouseOps', dressingOn(map));
  reg.ambient = map.theme.lightLevel ?? 0.75;
  const mL = moonLight(map.theme);
  const sky = Math.max(0, reg.ambient - mL);
  const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, set.lo, set.hi);
  const s = map.theme.sunDir;
  const l = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
  const dir: [number, number, number] = [-s[0] / l, -s[1] / l, -s[2] / l];
  const n: [number, number, number] = [0, 1, 2].map((k) => Math.max(1, Math.ceil((set.hi[k]! - set.lo[k]!) / MOON_CELL))) as [number, number, number];
  const m = bakeMoon({ kind: 'moon', id: 0, origin: set.lo, n, shapes: set.shapes, dir });
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
  bake = { lo: set.lo, hi: set.hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon: { origin: set.lo, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: mL, ms: 0 };
  const doors = (o: number): FieldDoor[] => b.anchors.doors.map((anchor) => ({ anchor, open: o }));
  open = new LightField(bake, reg, doors(1));
  shut = new LightField(bake, reg, doors(0));
  bakeMs = performance.now() - t0;
}, 240_000);

const body = (f: LightField, x: number, y: number, z: number): number => f.bodyLevel(x, y, z, 1.7);
/** Registry id of the lamp at (x, y, z), -1 when there is none. */
const lampId = (x: number, y: number, z: number): number =>
  bake.lamps!.baked.ids.find((id) => {
    const l = reg.lights[id]!;
    return Math.abs(l.x - x) < 0.01 && Math.abs(l.y - y) < 0.01 && Math.abs(l.z - z) < 0.01;
  }) ?? -1;

/** The pass: the table in warehouseS2.ts (the sheet's five lamps and the route lamps). */
const NEW_LAMPS: (readonly [number, number, number])[] = S2_LIGHT_PASS.map((p) => [p[0], p[1], p[2]] as const);
const withNewOff = <T,>(fn: () => T): T => {
  const ids = NEW_LAMPS.map(([x, y, z]) => lampId(x, y, z));
  for (const id of ids) reg.setOn(id, false);
  try { return fn(); } finally { for (const id of ids) reg.setOn(id, true); }
};

/** Readable on screen: the summed level where the dark curve (`darkCurve.ts`) turns visible (LIGHT.md of course-ready S2: 0.40). */
const READ = 0.4;
/** A key decision point or objective area: Marlow Yard's route minimum is 0.6, its panel and pad spots 0.45. */
const KEY = 0.45;
/** The dark pockets: no brighter than the open-sky level (the moonlit yard, 0.30). */
const DARK = 0.3;
/** The aisle and lane samples between the route points (not waypoints): readable, still under `LIGHT.lit`. */
const AISLE = 0.4;
const AISLE_MAX = 0.55;

/** The most a stealth route point, decision point or takedown spot may read: under `LIGHT.lit` (0.6, full guard visibility) with a margin. */
const CAP = 0.55;
/** An objective or a work area guards staff (the DVR, the case, the issue and security desks) may read brighter. */
const WORK = 0.8;
/** Rounding and bake slack on every band edge. */
const TOL = 0.02;
interface Spot { name: string; x: number; y: number; z: number; min: number; max: number; shut?: boolean }
const spot = (name: string, x: number, y: number, z: number, min = READ, isShut = false, max = CAP): Spot => ({ name, x, y, z, min, max, shut: isShut });
const read = (p: { x: number; y: number; z: number; shut?: boolean }): number => body(p.shut ? shut : open, p.x, p.y, p.z);

const SEC = WAREHOUSE_SECTORS[1]!;
/** The feet of a body hanging from a pipe hang this far under the grip (arms up). */
const HANG = 2.0;

/** Plan distance from (x, z) to the ground legs (both ends at y 0) of the section's three routes. */
const toRoutes = (x: number, z: number): number => {
  let best = Infinity;
  for (const r of SEC.routes)
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = r.pts[i]!;
      const c = r.pts[i + 1]!;
      if ((a[2] ?? 0) > 0.5 || (c[2] ?? 0) > 0.5) continue;
      const dx = c[0] - a[0];
      const dz = c[1] - a[1];
      const l2 = dx * dx + dz * dz;
      const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)) : 0;
      best = Math.min(best, hyp2(x - (a[0] + dx * t), z - (a[1] + dz * t)));
    }
  return best;
};

/** The dark pockets (feet positions): the takedown spots no route passes within 2 m of, and the named corners. */
const POCKETS: { name: string; x: number; y: number; z: number }[] = [
  ...SEC.guards.map((g, i) => ({ name: `takedown ${i + 1} ${g.kind}`, x: g.takedownSpot[0], y: 0, z: g.takedownSpot[1] })).filter((p) => toRoutes(p.x, p.z) > 2),
  { name: 'lane east half', x: -9.3, y: 0, z: -5.2 },
  { name: 'rack top R3S (dark side)', x: -9.35, y: 4, z: -0.5 },
  { name: 'rack top W0S (dark side)', x: -23.45, y: 4, z: -0.5 },
];
const nearPocket = (x: number, z: number, y: number): boolean => POCKETS.some((p) => Math.abs(p.y - y) < 1 && hyp2(p.x - x, p.z - z) < 0.5);

const SPOTS: Spot[] = [];
// every waypoint of the three routes (read from the data), but the pockets they pass through
SEC.routes.forEach((r, ri) => {
  r.pts.forEach((p, i) => {
    const y = p[2] ?? 0;
    if (nearPocket(p[0], p[1], y)) return;
    // a point on a sprinkler main (y 5.0) is a grip: the body hangs from it, its feet 2.0 m lower
    const feet = y >= 4.5 ? y - HANG : y;
    SPOTS.push(spot(`R${ri + 1}[${i}] (${p[0]}, ${p[1]}${p[2] === undefined ? '' : ', ' + p[2]})`, p[0], feet, p[1], i === r.obj ? KEY : READ, false, i === r.obj ? WORK : CAP));
  });
});
// the takedown spots on a route (the others are dark pockets): readable, but not lit to a guard; the cage officer's desk is a work area
SEC.guards.forEach((g, i) => {
  if (POCKETS.some((p) => p.name.startsWith(`takedown ${i + 1} `))) return;
  SPOTS.push(spot(`takedown ${i + 1} ${g.kind}`, g.takedownSpot[0], 0, g.takedownSpot[1], READ, false, g.kind === 'officer' && g.takedownSpot[1] > 16 ? WORK : CAP));
});
// (the C3 far doorway, the checkpoint and the routes' ends at (-1, 15) read in the key band 0.45-0.55 now: section 3's C3 lamps replaced the old strips that lit them to 0.85-0.90)
SPOTS.push(
  spot('objective: the case', SEC.objective.x, SEC.objective.y, SEC.objective.z, 0.55, false, WORK),
  spot('objective: the e2e stand point', SEC.objective.x + 0.9, 0, SEC.objective.z, KEY, false, WORK),
  spot('connector: C3 near door', SEC.connector!.nearAt![0] + 0.4, 0, SEC.connector!.nearAt![1], KEY),
  spot('connector: C3 far door', SEC.connector!.farAt![0] + 0.4, 0, SEC.connector!.farAt![1], KEY),
  spot('connector: C3 checkpoint', SEC.connector!.checkpoint.x, 0, SEC.connector!.checkpoint.z, KEY),
  spot('entry: the C2 far door (from the lobby)', -14.5, 0, -5.4, KEY),
  spot('lane: the west end', -21.6, 0, -4.6, AISLE, false, AISLE_MAX),
  spot('lane: the middle', -16.5, 0, -4.6, AISLE, false, AISLE_MAX),
  spot('A1: the south mouth', -21.4, 0, -2.5, AISLE, false, AISLE_MAX),
  spot('A1: the middle', -21.4, 0, 3.0, AISLE, false, AISLE_MAX),
  spot('A1: the north end', -21.4, 0, 9.0, AISLE, false, AISLE_MAX),
  spot('cross aisle: west', -21.0, 0, 5.5, AISLE, false, AISLE_MAX),
  spot('cross aisle: middle', -17.0, 0, 5.5, AISLE, false, AISLE_MAX),
  spot('cross aisle: east', -12.0, 0, 5.5, AISLE, false, AISLE_MAX),
  spot('A2: the south mouth', -16.7, 0, -3.0, AISLE, false, AISLE_MAX),
  spot('A2: the middle', -16.7, 0, 5.5, AISLE, false, AISLE_MAX),
  spot('A2: the north half', -16.7, 0, 10.0, AISLE, false, AISLE_MAX),
  spot('A2: the ladder foot', -17.1, 0, 13.4, KEY),
  spot('A3: the middle', -12.0, 0, 0.5, AISLE, false, AISLE_MAX),
  spot('A3: the north half', -12.0, 0, 11.0, AISLE, false, AISLE_MAX),
  spot('ladder foot: R2N (cross aisle)', -14.65, 0, 6.4, KEY),
  spot('ladder foot: the cage stock ladder', -23.45, 0, 12.6, KEY),
  spot('east gangway: the ammo', -4.7, 0, 9.0, AISLE, false, AISLE_MAX),
  spot('east gangway: the middle', -6.0, 0, 5.5, AISLE, false, AISLE_MAX),
  spot('north gangway: the middle', -9.0, 0, 15.5, AISLE, false, AISLE_MAX),
  spot('the cage: the floor', -21.4, 0, 14.0, KEY, false, WORK),
  spot('the cage: the issue gate', -20.6, 0, 16.5, KEY),
  spot('the cage: the south gate', -21.4, 0, 12.6, READ),
  spot('the issue desk front', -17.0, 0, 16.3, KEY, false, WORK),
  spot('rack top: R2N south end (the ladder top)', -14.65, 4, 7.4, READ),
  spot('rack top: R1N (the cage side)', -18.75, 4, 12.5, READ),
  spot('rack top: W0N (the cage stock ladder)', -23.45, 4, 11.4, READ),
);

describe('Sector Ops section 2 lamp pass (warehouse-s23)', () => {
  it('bakes in node fast enough for the unit run', () => {
    expect(bakeMs).toBeLessThan(120_000);
  });

  it('every new lamp is in the bake', () => {
    for (const [x, y, z] of NEW_LAMPS) expect(lampId(x, y, z), `lamp at ${x}, ${y}, ${z}`).toBeGreaterThanOrEqual(0);
  });

  it('every route point, objective and key decision point reads lit enough to see', () => {
    const low: string[] = [];
    for (const p of SPOTS) {
      const v = read(p);
      if (!(v >= p.min - TOL)) low.push(`${p.name}: ${v.toFixed(2)} < ${p.min}`);
    }
    expect(low).toEqual([]);
  });

  it('no stealth route point, decision point or takedown spot reads as lit to a guard (a maximum per class)', () => {
    expect(CAP).toBeLessThan(LIGHT.lit);
    const high: string[] = [];
    for (const p of SPOTS) {
      const v = read(p);
      if (!(v <= p.max + TOL)) high.push(`${p.name}: ${v.toFixed(2)} > ${p.max}`);
    }
    expect(high).toEqual([]);
  });

  it('the lamps took the points up (the pass is what makes them readable)', () => {
    const before = withNewOff(() => SPOTS.map((p) => read(p)));
    const risen = SPOTS.filter((p, k) => read(p) > before[k]! + 0.05).length;
    expect(risen).toBeGreaterThan(SPOTS.length / 2);
  });

  it('the dark pockets stay dark', () => {
    const lit: string[] = [];
    for (const p of POCKETS) {
      const v = body(open, p.x, p.y, p.z);
      if (!(v <= DARK)) lit.push(`${p.name}: ${v.toFixed(2)} > ${DARK}`);
    }
    expect(lit).toEqual([]);
  });

  it('the pockets read hardly brighter than without the lamps (+0.05)', () => {
    const on = POCKETS.map((p) => body(open, p.x, p.y, p.z));
    const off = withNewOff(() => POCKETS.map((p) => body(open, p.x, p.y, p.z)));
    POCKETS.forEach((p, k) => expect(on[k]! - off[k]!, p.name).toBeLessThanOrEqual(0.05));
  });

  it('sections 1 and 3 read the same with the new lamps off and on (but beside the C3 door)', () => {
    const pts: [number, number, number][] = [];
    for (let x = -23; x <= 23; x += 4) for (const z of [-24, -20, -16, -12, -10]) pts.push([x, 0, z]);
    for (const x of [0, 4, 8, 12, 16, 20]) for (const z of [-6, -2, 3, 8, 11, 15]) if (hyp2(x + 4, z - 14.55) > 6) pts.push([x, 0, z]);
    for (const [x, y, z] of [[12, 3.3, 14.1], [15, 3.3, 14]] as const) pts.push([x, y, z]); // (on the deck, section 3's slab top)
    for (const f of [open, shut]) {
      const on = pts.map(([x, y, z]) => body(f, x, y, z));
      const off = withNewOff(() => pts.map(([x, y, z]) => body(f, x, y, z)));
      pts.forEach((p, k) => expect(Math.abs(on[k]! - off[k]!), `(${p.join(', ')})`).toBeLessThanOrEqual(0.02));
    }
  });

  it('no 2 m column has more lamps in reach than the shaders list', () => {
    const L = bake.lamps!.baked.lights;
    const n = L.length / LAMP_STRIDE;
    const cols = Math.ceil((bake.hi[0] - bake.lo[0]) / LAMP_GRID);
    const rows = Math.ceil((bake.hi[2] - bake.lo[2]) / LAMP_GRID);
    let worst = 0;
    const reach = [0, 0, 0, 0, 0];
    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        const cx0 = bake.lo[0] + q * LAMP_GRID;
        const cz0 = bake.lo[2] + r * LAMP_GRID;
        let c = 0;
        for (let i = 0; i < n; i++) {
          // (the plan reach as `lampGrid` reads it: a cone's beam reaches less far than its radius)
          lampPlanReach(L, i, reach);
          if (lampColumnDist(L, i, reach, cx0, cz0, LAMP_GRID) >= 0) c++;
        }
        worst = Math.max(worst, c);
      }
    }
    expect(worst).toBeLessThanOrEqual(LAMP_GRID_SLOTS);
  });

  it('keeps every lamp under the bake box top', () => {
    for (const l of reg.lights) if (l.kind !== 'flashlight') expect(l.y + 0.2).toBeLessThanOrEqual(bake.hi[1]);
  });

  it.runIf(!!process.env.WH2LIGHT_PRINT)('prints the levels', () => {
    const all = [...SPOTS.map((p) => ({ ...p })), ...POCKETS.map((p) => ({ ...p, min: -1, max: DARK }))];
    const before = withNewOff(() => all.map((p) => read(p)));
    const rows = all.map((p, k) => `${p.name}\t${before[k]!.toFixed(2)}\t${read(p).toFixed(2)}\t${p.min < 0 ? 'dark<=' + DARK : p.min + '-' + p.max}`);
    writeFileSync(process.env.WH2LIGHT_PRINT!, `bake ${(bakeMs / 1000).toFixed(1)} s, ${bake.lamps!.baked.ids.length} lamps\n${rows.join('\n')}`);
  });
});
