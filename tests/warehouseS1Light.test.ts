/**
 * Sector Ops section 1 lamp pass (warehouse-s23, Michael M1: "I cant see properly at night"): the real warehouseOps light
 * field, baked in node with the pure bakers as `World.create` + `bakeLevelLight` do (the pattern of
 * `tests/ctcourseLight.test.ts`). Section 1's routes, objective and key decision points read lit enough to see without
 * night vision; the dark pockets (spawn corner, trailer lane, shelter, skip, charger corner, east corridor end) stay
 * dark; sections 2 and 3 do not change; no 2 m column lists more lamps than the shaders hold.
 * `WH1LIGHT_PRINT=<file>` writes every point's level without the new lamps and with them (the table in
 * `docs/archive/warehouse-s23/LIGHT-S1.md`).
 */
import { writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { S1_LIGHT_PASS } from '../src/world/maps/warehouseS1';
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

/** The pass: the pass rooms of `S1_LAMPS` in warehouseS1.ts (the yard floodlight over shutter W, the crawl, included). */
const NEW_LAMPS: (readonly [number, number, number])[] = S1_LIGHT_PASS.map((p) => [p[0], p[1], p[2]] as const);
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
/**
 * The roof (y 6) reads by the moon alone (sector-fixes L, Michael 2026-10-22: "Theres random lights on the roof": the roof
 * lamps are gone): the open-sky level 0.30 less bake slack. Its points keep the route maximum.
 */
const MOON = 0.28;
const ROOF_Y = 5.9;
/** The band floor of a point: the moon on the roof, else the given one. */
const atLeast = (y: number, min: number): number => (y >= ROOF_Y ? MOON : min);

/** The most a stealth route point, decision point or takedown spot may read: under `LIGHT.lit` (0.6, full guard visibility) with a margin. */
const CAP = 0.55;
/** An objective or a work area guards staff (the DVR, the case, the issue and security desks) may read brighter. */
const WORK = 0.8;
/** Rounding and bake slack on every band edge. */
const TOL = 0.02;
interface Spot { name: string; x: number; y: number; z: number; min: number; max: number; shut?: boolean }
const spot = (name: string, x: number, y: number, z: number, min = READ, isShut = false, max = CAP): Spot => ({ name, x, y, z, min: atLeast(y, min), max, shut: isShut });
const read = (p: { x: number; y: number; z: number; shut?: boolean }): number => body(p.shut ? shut : open, p.x, p.y, p.z);

const SEC = WAREHOUSE_SECTORS[0]!;
/** The dark pockets (feet positions): they must stay dark. */
const POCKETS: { name: string; x: number; y: number; z: number }[] = [
  { name: 'spawn corner', x: -20, y: 0, z: -24.6 },
  { name: 'spawn corner W', x: -21.2, y: 0, z: -24.6 },
  { name: 'spawn corner E', x: -18.8, y: 0, z: -24.6 },
  { name: 'trailer lane W', x: -12.5, y: 0, z: -25.3 },
  { name: 'trailer lane E', x: 2.8, y: 0, z: -25.3 },
  { name: 'hide spot behind the skip', x: -21.3, y: 0, z: -21.5 },
  { name: 'hide spot at the charger', x: -6.0, y: 0, z: -7.2 },
  { name: 'takedown 6 smoker shelter', x: SEC.guards[5]!.takedownSpot![0], y: 0, z: SEC.guards[5]!.takedownSpot![1] },
  { name: 'takedown 7 clerk corner', x: SEC.guards[6]!.takedownSpot![0], y: 0, z: SEC.guards[6]!.takedownSpot![1] },
  { name: 'takedown 8 east corridor end', x: SEC.guards[7]!.takedownSpot![0], y: 0, z: SEC.guards[7]!.takedownSpot![1] },
];
const nearPocket = (x: number, z: number, y: number): boolean => y < 1 && POCKETS.some((p) => hyp2(p.x - x, p.z - z) < 0.5);

const SPOTS: Spot[] = [];
// every waypoint of the three routes (read from the data), but the pockets they start in or pass through
SEC.routes.forEach((r, ri) => {
  r.pts.forEach((p, i) => {
    const y = p[2] ?? 0;
    if (nearPocket(p[0], p[1], y)) return;
    SPOTS.push(spot(`R${ri + 1}[${i}] (${p[0]}, ${p[1]}${p[2] === undefined ? '' : ', ' + p[2]})`, p[0], y, p[1], i === r.obj ? KEY : READ, false, i === r.obj ? WORK : CAP));
  });
});
// the takedown spots that are not dark pockets (1 to 5): readable, but not lit to a guard
SEC.guards.slice(0, 5).forEach((g, i) => SPOTS.push(spot(`takedown ${i + 1} ${g.kind}`, g.takedownSpot![0], 0, g.takedownSpot![1], READ, false, CAP)));
SPOTS.push(
  spot('objective: the DVR', SEC.objective.x, SEC.objective.y, SEC.objective.z, 0.55, false, WORK),
  spot('objective: the DVR desk front', 4.4, 0, -15.6, KEY, false, WORK),
  spot('connector: C2 near door', SEC.connector!.nearAt![0], 0, SEC.connector!.nearAt![1] + 0.4, KEY),
  spot('connector: C2 far door', SEC.connector!.farAt![0], 0, SEC.connector!.farAt![1] - 0.4, KEY),
  spot('connector: C2 checkpoint', SEC.connector!.checkpoint.x, 0, SEC.connector!.checkpoint.z, KEY),
  spot('entry: shutter W crawl gap', -19, 0, -18.4, KEY),
  spot('entry: the entrance door', -5.6, 0, -18.9, KEY),
  spot('entry: the workshop door', 10.4, 0, -18.9, KEY),
  spot('bay: the wrapper', -16, 0, -13.3, READ),
  spot('bay: the east lane', -11.4, 0, -12.6, READ),
  spot('reception: the counter', -5, 0, -14.4, KEY, false, WORK),
  spot('corridor: west end (door shut)', -7, 0, -12.3, READ, true),
  spot('corridor: middle', 0, 0, -12.3, READ),
  spot('security office door', 4.5, 0, -13.4, KEY, false, WORK),
  spot('drainpipe base', -22.4, 0, -18.75, READ),
  spot('roof: the hatch', 5, 6, -13.5, KEY),
  spot('roof: the pipe top', -22, 6, -17.2, READ),
  spot('plant deck: the middle', 5, 3.3, -14.9, KEY),
  spot('workshop: the bench', 12.5, 0, -13.2, READ),
  spot('workshop: the lathe', 17, 0, -10.8, READ),
  spot('crane walkway: east end', 22.6, 3, -9.55, KEY),
  spot('crane walkway: middle', 15.6, 3, -9.55, READ),
  spot('crane walkway: west end', 8.6, 3, -9.55, KEY),
  spot('void: opening over the corridor (h1)', -5.6, 3, -12.3, KEY),
  spot('void: opening over the mess (h2)', 2.6, 3, -10.0, KEY),
  spot('void: the catwalk opening', 7.6, 3, -9.6, KEY),
  spot('mess: under the hatch', 2.6, 0, -10.3, KEY),
  spot('lobby roof: the storage', -20, 3.2, -7.4, READ),
  spot('lobby roof: the vent', -15.5, 3.2, -8.4, READ),
);

describe('Sector Ops section 1 lamp pass (warehouse-s23)', () => {
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

  it('no lamp lights the roof: its points read the moon alone (no lamp adds over 0.02)', () => {
    const roof = SPOTS.filter((p) => p.y >= ROOF_Y);
    expect(roof.length).toBeGreaterThan(3);
    for (const l of reg.lights) if (l.kind !== 'flashlight') expect(l.y, `light ${l.id}`).toBeLessThan(ROOF_Y);
    const off = (() => {
      const ids = reg.lights.filter((l) => l.kind !== 'flashlight' && l.on).map((l) => l.id);
      for (const id of ids) reg.setOn(id, false);
      try { return roof.map((p) => read(p)); } finally { for (const id of ids) reg.setOn(id, true); }
    })();
    roof.forEach((p, k) => expect(read(p) - off[k]!, p.name).toBeLessThanOrEqual(0.02));
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

  it('sections 2 and 3 read the same with the new lamps off and on', () => {
    const pts: [number, number, number][] = [];
    for (let x = -23; x <= 23; x += 2) for (const z of [-5, -3, 0, 4, 8, 12, 16]) { if (!(x === -15 && z === -5)) pts.push([x, 0, z]); }
    // (not the C2 far doorway's threshold (-14.5, -5.2) nor (-15, -5), inside the door's 1.2 m span: the fire lobby panel lights it through the open door, as it should)
    for (const [x, z] of [[-14.5, -4], [-20.5, -3.6]] as const) pts.push([x, 0, z]);
    for (const [x, z] of [[-20.5, -3.6], [-20.5, 11], [12, 14.1], [15, 14]] as const) pts.push([x, 2.8, z]);
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

  it.runIf(!!process.env.WH1LIGHT_PRINT)('prints the levels', () => {
    const all = [...SPOTS.map((p) => ({ ...p })), ...POCKETS.map((p) => ({ ...p, min: -1, max: DARK }))];
    const before = withNewOff(() => all.map((p) => read(p)));
    const rows = all.map((p, k) => `${p.name}\t${before[k]!.toFixed(2)}\t${read(p).toFixed(2)}\t${p.min < 0 ? 'dark<=' + DARK : p.min + '-' + p.max}`);
    writeFileSync(process.env.WH1LIGHT_PRINT!, `bake ${(bakeMs / 1000).toFixed(1)} s, ${bake.lamps!.baked.ids.length} lamps\n${rows.join('\n')}`);
  });
});
