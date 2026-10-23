/**
 * Light measurement probe (sector-redesign lightrev, walk 4.72). Read-only: builds maps in node, bakes like the light
 * tests, prints numbers. `@src` is aliased to the tree under test (PROBE_TREE).
 */
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { LevelBuilder } from '@src/world/levelBuilder';
import { MAPS } from '@src/world/maps/index';
import { dressingOn } from '@src/world/detailPass';
import { canonicalLightSet } from '@src/voxel/lightShapes';
import { bakeLamps } from '@src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '@src/voxel/skyBake';
import { bakedLights, type LightBake } from '@src/world/lightBake';
import { buildAmbientGrid } from '@src/world/ambientGrid';
import { LightField, type FieldDoor } from '@src/world/lightField';
import { moonLight, LAMP_LEVEL_GAIN, LAMP_CONE_COS } from '@src/world/lampMath';
import { darkCurve, DARK_DESKTOP } from '@src/world/darkCurve';
import type { MapDef } from '@src/world/mapDef';
import type { LightDef } from '@src/world/lights';

const OUT = process.env.PROBE_OUT ?? 'probe-out.json';
const out: Record<string, unknown> = {};

type Box = LevelBuilder['boxes'][number];
const inBox = (bx: Box, x: number, z: number, pad = 0): boolean => {
  const c = Math.cos(-bx.yaw), s = Math.sin(-bx.yaw);
  const dx = x - bx.c[0], dz = z - bx.c[2];
  const lx = dx * c + dz * s, lz = -dx * s + dz * c;
  return Math.abs(lx) <= bx.s[0] / 2 + pad && Math.abs(lz) <= bx.s[2] / 2 + pad;
};
const floorBelow = (boxes: Box[], x: number, y: number, z: number): number => {
  let top = -1e9;
  for (const bx of boxes) {
    if (!bx.collide || bx.pitch) continue;
    const t = bx.c[1] + bx.s[1] / 2;
    if (t < y - 0.3 && t > top && inBox(bx, x, z)) top = t;
  }
  return top < -1e8 ? 0 : top;
};
const fixed = (l: LightDef): boolean => l.kind !== 'flashlight' && l.intensity > 0 && l.radius > 0;
const med = (a: number[]): number => { const s = [...a].sort((p, q) => p - q); return s.length ? s[Math.floor(s.length / 2)]! : NaN; };
const r3 = (v: number): number => Math.round(v * 1000) / 1000;

function scanMap(map: MapDef, build: (b: LevelBuilder) => void) {
  const b = new LevelBuilder();
  build(b);
  const lights = b.lights.lights.filter(fixed);
  const rows = lights.map((l) => {
    const h = l.y - floorBelow(b.boxes, l.x, l.y, l.z);
    const fF = Math.max(0, 1 - h / l.radius);
    const fC = Math.max(0, 1 - Math.max(0, h - 1.2) / l.radius);
    return { h, r: l.radius, i: l.intensity, fF, fC, chest: LAMP_LEVEL_GAIN * l.intensity * fC };
  });
  // straddles: a thin wall-like box through the fixture footprint at the lamp's height
  const straddle: unknown[] = [];
  for (const l of lights) {
    const f = l.fixture;
    const hx = f ? f.sx / 2 : 0.1, hz = f ? f.sz / 2 : 0.1;
    for (const bx of b.boxes) {
      if (!bx.collide && bx.visible === false) continue;
      const thin = Math.min(bx.s[0], bx.s[2]);
      if (thin > 0.6 || Math.max(bx.s[0], bx.s[2]) < 1) continue;
      const y0 = bx.c[1] - bx.s[1] / 2, y1 = bx.c[1] + bx.s[1] / 2;
      if (y0 > l.y || y1 < l.y - 0.4) continue;
      // centre within the half-footprint + 0.15 of the wall (the bake's occupancy pads walls by 0.1)
      if (!inBox(bx, l.x, l.z, Math.max(hx, hz) + 0.15)) continue;
      if (inBox(bx, l.x, l.z, -0.001) && y1 >= l.y) { straddle.push({ x: l.x, y: l.y, z: l.z, r: l.radius, i: l.intensity, inside: true, wall: [bx.c, bx.s, bx.yaw] }); continue; }
      straddle.push({ x: l.x, y: l.y, z: l.z, r: l.radius, i: l.intensity, inside: false, wall: [bx.c.map(r3), bx.s.map(r3), r3(bx.yaw)] });
    }
  }
  return {
    lamps: rows.length,
    medH: r3(med(rows.map((r) => r.h))),
    medR: r3(med(rows.map((r) => r.r))),
    medRoverH: r3(med(rows.map((r) => r.r / Math.max(0.5, r.h)))),
    medI: r3(med(rows.map((r) => r.i))),
    floorZero: rows.filter((r) => r.fF <= 0).length,
    floorUnder25: rows.filter((r) => r.fF < 0.25).length,
    medFloorFalloff: r3(med(rows.map((r) => r.fF))),
    medChestLevelOwnLamp: r3(med(rows.map((r) => r.chest))),
    chestUnder028: rows.filter((r) => r.chest < 0.28).length,
    straddles: straddle.length,
    straddleList: straddle.slice(0, 40),
  };
}

function bake(map: MapDef, b: LevelBuilder): { field: LightField; shut: LightField; bake: LightBake } {
  const reg = b.lights;
  const set = canonicalLightSet(b.boxes, b.cylinders, map.id, dressingOn(map));
  reg.ambient = map.theme.lightLevel ?? 0.75;
  const mL = moonLight(map.theme);
  const sky = Math.max(0, reg.ambient - mL);
  const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, set.lo, set.hi);
  const s = map.theme.sunDir;
  const l = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
  const dir: [number, number, number] = [-s[0] / l, -s[1] / l, -s[2] / l];
  const n = [0, 1, 2].map((k) => Math.max(1, Math.ceil((set.hi[k]! - set.lo[k]!) / MOON_CELL))) as [number, number, number];
  const m = bakeMoon({ kind: 'moon', id: 0, origin: set.lo, n, shapes: set.shapes, dir });
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
  const bk: LightBake = { lo: set.lo, hi: set.hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon: { origin: set.lo, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: mL, ms: 0 };
  const doors = (o: number): FieldDoor[] => b.anchors.doors.map((anchor) => ({ anchor, open: o }));
  return { field: new LightField(bk, reg, doors(1)), shut: new LightField(bk, reg, doors(0)), bake: bk };
}

/** Candidate falloffs (no visibility: open floor). d distance, r the lamp's radius. */
const FALL = {
  linear: (d: number, r: number) => (d >= r ? 0 : 1 - d / r),
  // inverse square referenced at 3 m (the level a lamp gives on axis at 3 m = the old intensity), windowed at 2 r
  invSq3: (d: number, r: number) => { const R = 2 * r; if (d >= R) return 0; const w = 1 - (d / R) ** 4; return Math.min(1, 9 / Math.max(d * d, 0.25)) * w * w; },
};

function realLux(lumens: number, halfAngle: number | null, d: number, cosA: number): number {
  // a cos^e distribution cut at the half angle; e = 2 with a beam, 1 for the lamp hemisphere
  const e = halfAngle ? 2 : 1;
  const cut = halfAngle ? Math.cos(halfAngle) : LAMP_CONE_COS;
  if (cosA < cut) return 0;
  const flux = (2 * Math.PI * (1 - cut ** (e + 1))) / (e + 1); // integral of cos^e over the cone, per unit I0
  const I0 = lumens / flux;
  // illuminance on a horizontal surface: I(theta) cos(theta) / d^2
  return (I0 * cosA ** e * cosA) / (d * d);
}

it('scan every map', () => {
  for (const map of MAPS) {
    try { out[`scan:${map.id}`] = scanMap(map, (b) => map.build(b, 0)); } catch (e) { out[`scan:${map.id}`] = String(e); }
  }
}, 600_000);

it('Sector Ops S1 goods-in bay', () => {
  if (process.env.PROBE_S1 !== '1') return;
  const map = MAPS.find((m) => m.id === 'warehouseOps')!;
  const b = new LevelBuilder();
  map.build(b, 0);
  const { field } = bake(map, b);
  const reg = b.lights;
  const bay = reg.lights.filter((l) => fixed(l) && l.x >= -24 && l.x <= -8 && l.z >= -18 && l.z <= -8.8 && l.y > 5);
  const pts: { x: number; z: number; floor: number; body: number; count: number; alt: Record<string, number>; lux: number }[] = [];
  for (let x = -23.5; x <= -8.5; x += 1) for (let z = -17.5; z <= -9.3; z += 1) {
    const floor = field.levelAt(x, 0.1, z);
    const body = field.bodyLevel(x, 0, z, 1.7);
    let count = 0;
    const alt: Record<string, number> = { linear: 0, invSq3: 0 };
    let lux = 0;
    for (const l of reg.lights) {
      if (!fixed(l)) continue;
      const vx = x - l.x, vy = 1.02 - l.y, vz = z - l.z; // chest
      const d = Math.hypot(vx, vy, vz);
      const c = l.cone;
      const ca = c ? (vx * c.dx + vy * c.dy + vz * c.dz) / d : -vy / d;
      const cut = c ? c.cosOuter : LAMP_CONE_COS;
      if (ca < cut) continue;
      const cone = c ? ca * ca : ca;
      if (d < l.radius) count++;
      for (const k of Object.keys(FALL) as (keyof typeof FALL)[]) alt[k]! += LAMP_LEVEL_GAIN * l.intensity * cone * FALL[k](d, l.radius);
      // the bay strips as 1.2 m LED high-bay battens of 12 000 lm with their 45 degree optic
      if (bay.includes(l)) lux += realLux(12000, Math.PI / 4, d, ca);
    }
    pts.push({ x, z, floor: r3(floor), body: r3(body), count, alt: Object.fromEntries(Object.entries(alt).map(([k, v]) => [k, r3(v)])), lux: Math.round(lux) });
  }
  const ambient = r3(field.levelAt(-16, 0.1, -13) - pts.find((p) => p.x === -15.5 && p.z === -12.5)!.floor + pts.find((p) => p.x === -15.5 && p.z === -12.5)!.floor);
  const stat = (k: (p: (typeof pts)[number]) => number) => {
    const a = pts.map(k);
    return { min: r3(Math.min(...a)), med: r3(med(a)), max: r3(Math.max(...a)), under028: a.filter((v) => v < 0.28).length, over06: a.filter((v) => v >= 0.6).length, n: a.length };
  };
  const screen = (s: number) => r3(darkCurve(s, DARK_DESKTOP));
  out['s1bay'] = {
    lamps: bay.map((l) => [l.x, l.y, l.z, l.radius, l.intensity, l.cone ? r3(Math.acos(l.cone.cosOuter)) : null]),
    zoneFill: r3(reg.zoneAt(-16, 1, -13)),
    body: stat((p) => p.body),
    floor: stat((p) => p.floor),
    lampsInReachAtChest: stat((p) => p.count),
    altNoVis: { linear: stat((p) => p.alt.linear!), invSq3: stat((p) => p.alt.invSq3!) },
    realLux12k: stat((p) => p.lux),
    screenOfMedianBody: screen(med(pts.map((p) => p.body))),
    curve: [0.12, 0.2, 0.28, 0.33, 0.37, 0.4, 0.45, 0.6, 0.8].map((s) => [s, screen(s)]),
    ambient,
    pts,
  };
}, 600_000);

it('Marlow S2 wall-top lamp (M5)', () => {
  if (process.env.PROBE_M5 !== '1') return;
  const map = MAPS.find((m) => m.id === 'ctcourse')!;
  const b = new LevelBuilder();
  map.build(b, 0);
  const t0 = performance.now();
  const { field, bake: bk } = bake(map, b);
  const ms = Math.round(performance.now() - t0);
  const reg = b.lights;
  const ids = bk.lamps!.baked.ids;
  const top = ids.findIndex((id) => { const l = reg.lights[id]!; return Math.abs(l.x - 31.9) < 0.01 && Math.abs(l.z - 5) < 0.01; });
  const L = reg.lights[ids[top]!]!;
  const rows: unknown[] = [];
  for (const x of [22, 24, 26, 28, 29, 30, 32, 33, 34, 36, 38]) for (const z of [5, 9]) {
    rows.push({ x, z, floorTop: r3(field.lampAt(top, x, 0.1, z)), bodyTop: r3(Math.max(field.lampAt(top, x, 1.02, z), field.lampAt(top, x, 1.6, z))), floor: r3(field.levelAt(x, 0.1, z)), body: r3(field.bodyLevel(x, 0, z, 1.7)) });
  }
  out['m5'] = { ms, lamp: [L.x, L.y, L.z, L.radius, L.intensity], wallTop: r3(field.lampAt(top, 31, 4.5, 5)), rows };
}, 600_000);

it('S1 bake time', () => {
  if (process.env.PROBE_S1 !== '1') return;
  const map = MAPS.find((m) => m.id === 'warehouseOps')!;
  const b = new LevelBuilder();
  map.build(b, 0);
  const t0 = performance.now();
  const { bake: bk } = bake(map, b);
  out['warehouseOpsBakeMs'] = Math.round(performance.now() - t0);
  out['warehouseOpsVisBytes'] = bk.lamps!.r.vis.length;
}, 600_000);

it('write', () => {
  writeFileSync(OUT, JSON.stringify(out, null, 1));
});
