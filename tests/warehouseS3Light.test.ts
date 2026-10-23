/**
 * Sector Ops section 3 lamp pass (warehouse-s23, Michael M1: "I cant see properly at night"): the real warehouseOps light
 * field, baked in node as in `tests/warehouseS2Light.test.ts`. Section 3's routes, objective and key decision points read
 * lit enough to see without night vision; the staffed work areas read brighter; the pockets (the supervisor's store, the loader's
 * west staging, the crane operator, the stores officer's corner, the east bay, the deck's west end) stay dark; sections 1 and 2 do
 * not change; no 2 m column lists more lamps than the shaders hold.
 * `WH3LIGHT_PRINT=<file>` writes every point's level without the section 3 lamps and with them (the table in
 * `docs/warehouse-s23/LIGHT-S3.md`).
 */
import { writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { S3_LIGHT_PASS } from '../src/world/maps/warehouseS3';
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

/** The pass: the table in warehouseS3.ts (BUILD-S3.md 3.7). */
const NEW_LAMPS: (readonly [number, number, number])[] = S3_LIGHT_PASS.map((p) => [p[0], p[1], p[2]] as const);
const withNewOff = <T,>(fn: () => T): T => {
  const ids = NEW_LAMPS.map(([x, y, z]) => lampId(x, y, z));
  for (const id of ids) reg.setOn(id, false);
  try { return fn(); } finally { for (const id of ids) reg.setOn(id, true); }
};

/** Readable on screen: the summed level where the dark curve (`darkCurve.ts`) turns visible (0.40). */
const READ = 0.4;
/** A key decision point or objective area (Marlow Yard's panel and pad spots 0.45). */
const KEY = 0.45;
/** The dark pockets: no brighter than the open-sky level (the moonlit yard, 0.30). */
const DARK = 0.3;
/** The most a stealth route point, decision point or takedown spot may read: under `LIGHT.lit` (0.6, full guard visibility) with a margin. */
const CAP = 0.55;
/** An objective or a staffed work area may read brighter. */
const WORK = 0.8;
/** Rounding and bake slack on every band edge. */
const TOL = 0.02;
interface Spot { name: string; x: number; y: number; z: number; min: number; max: number; shut?: boolean }
const spot = (name: string, x: number, y: number, z: number, min = READ, max = CAP, isShut = false): Spot => ({ name, x, y, z, min, max, shut: isShut });
const read = (p: { x: number; y: number; z: number; shut?: boolean }): number => body(p.shut ? shut : open, p.x, p.y, p.z);

const SEC = WAREHOUSE_SECTORS[2]!;
/** The feet of a body hanging from a pipe hang this far under the grip (arms up). */
const HANG = 2.0;

/** The dark pockets (feet positions, at their own floor). */
const POCKETS: { name: string; x: number; y: number; z: number }[] = [
  { name: "supervisor's spot (the parts store)", x: 12.0, y: 0, z: 15.0 },
  { name: "loader's spot (the deck, west staging)", x: 3.0, y: 3.3, z: 13.2 },
  { name: "crane operator's spot (under the walkway)", x: 7.3, y: 0, z: -7.5 },
  { name: "stores officer's spot (the cage corner)", x: 0.6, y: 0, z: -7.6 },
  { name: 'the east bay by the plant room', x: 21.0, y: 0, z: 1.5 },
  { name: "the deck's west end", x: -2.0, y: 3.3, z: 15.5 },
];
const nearPocket = (x: number, z: number, y: number): boolean => POCKETS.some((p) => Math.abs(p.y - y) < 1 && hyp2(p.x - x, p.z - z) < 0.5);

const SPOTS: Spot[] = [];
// every waypoint of the three routes (read from the data); a pipe grip (y 4.5 or more) reads its feet 2.0 lower
SEC.routes.forEach((r, ri) => {
  r.pts.forEach((p, i) => {
    const y = p[2] ?? 0;
    if (nearPocket(p[0], p[1], y)) return;
    // (over the deck, z 11.85 and north, a grip at the main's north end would put the feet inside the slab: read them on the deck, 3.3)
    const feet = y >= 4.5 ? (p[1] > 11.85 ? Math.max(3.3, y - HANG) : y - HANG) : y;
    SPOTS.push(spot(`R${ri + 1}[${i}] (${p[0]}, ${p[1]}${p[2] === undefined ? '' : ', ' + p[2]})`, p[0], feet, p[1], i === r.obj ? KEY : READ, i === r.obj ? WORK : CAP));
  });
});
SPOTS.push(
  // the connector, the entry, the named decision points
  spot('connector: C3 checkpoint', SEC.start.x, 0, SEC.start.z, KEY),
  spot('connector: C3 far doorway outside', -0.95, 0, 11.2, KEY),
  spot('walkway ladder foot', -3.4, 0, -6.9, KEY),
  spot('plant room west door, outside', 15.2, 0, -3.3, KEY),
  spot('plant room west door, inside', 16.9, 0, -3.3, KEY),
  spot('the grate', 22.4, 0, -1.8, KEY),
  spot('the grille', 23.65, 3.3, 15.3, KEY),
  spot('the window, outside', 19.6, 3.3, 13.9, KEY),
  spot('the lobby', 17.8, 0, -6.6, KEY),
  spot('the extract centre', 22.55, 0, -7.2, KEY),
  spot('the hatch edge (lobby roof)', 21.7, 3.2, -7.2, KEY),
  spot("the main's middle", 17.0, 3.0, 6.0),
  // the staffed areas: brighter
  spot('the fitter (the press)', 7.6, 0, 1.0, 0.55, WORK),
  spot('the packing end', 8.0, 0, 9.7, 0.55, WORK),
  spot('the cage counter', 4.7, 0, -5.0, 0.55, WORK),
  spot("the engineer's panel", 19.4, 0, -3.0, 0.55, WORK),
  spot('the clerk', 18.6, 3.3, 17.1, 0.55, WORK),
  spot('the terminal', 22.4, 3.3, 17.3, 0.55, WORK),
  // the takedown spots on a route
  spot("the porter's spot", SEC.guards[0]!.takedownSpot[0], 0, SEC.guards[0]!.takedownSpot[1]),
  spot("the tour guard's spot (the lobby)", SEC.guards[3]!.takedownSpot[0], 0, SEC.guards[3]!.takedownSpot[1]),
);

describe('Sector Ops section 3 lamp pass (warehouse-s23)', () => {
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

  it('sections 1 and 2 read the same with the new lamps off and on (but beside the C3 near doorway)', () => {
    const pts: [number, number, number][] = [];
    for (let x = -23; x <= -6; x += 4) for (const z of [-5, -1, 3, 7, 11, 14, 17]) if (hyp2(x + 4, z - 14.55) > 6) pts.push([x, 0, z]);
    for (let x = -23; x <= 23; x += 4) for (const z of [-24, -20, -16, -12, -10]) pts.push([x, 0, z]);
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

  it.runIf(!!process.env.WH3LIGHT_PRINT)('prints the levels', () => {
    const all = [...SPOTS.map((p) => ({ ...p })), ...POCKETS.map((p) => ({ ...p, min: -1, max: DARK }))];
    const before = withNewOff(() => all.map((p) => read(p)));
    const rows = all.map((p, k) => `${p.name}\t${before[k]!.toFixed(2)}\t${read(p).toFixed(2)}\t${p.min < 0 ? 'dark<=' + DARK : p.min + '-' + p.max}`);
    writeFileSync(process.env.WH3LIGHT_PRINT!, `bake ${(bakeMs / 1000).toFixed(1)} s, ${bake.lamps!.baked.ids.length} lamps\n${rows.join('\n')}`);
  });
});
