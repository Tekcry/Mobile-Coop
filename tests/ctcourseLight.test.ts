/**
 * Marlow Yard light pass (course-ready S2, `docs/course-ready/LIGHT.md` 4a): the real ctcourse light field, baked in node
 * with the pure bakers as `World.create` + `bakeLevelLight` do. Every must-see spot reads lit enough to see on screen,
 * the dark between the yard's pools stays dark, the airlock lamps stay inside their airlocks with the doors shut, the
 * station 3 camera bay is untouched and no 2 m column lists more lamps than the shaders hold.
 * (marlow-bunker) The bunker's ceilings, lids and fittings keep those levels: no moon, the 0.30 floor is all fill, and every
 * point stays within 0.08 of the course-ready tuning (`ctcourseLight.tuned.json`, `docs/marlow-bunker/LIGHT.md`).
 * `CTLIGHT_PRINT=1` prints every point's level (the table in LIGHT.md section 3).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { AIRLOCK_LAMP_Y, ANNEX_LAMP_Y, bayX, ctcourse, CT_BAY, CT_OBST, HIGH_LAMP_Y, S3_CAMERA, S3_HALL, S3_HARD_LAMP_X, S3_PANEL_X, S5_PANEL } from '../src/world/maps/ctcourse';
import { cameraRate, newMeter, stepCamMeter } from '../src/security/camera';
import { CAMERA } from '../src/config/security';
import { GEARS } from '../src/config/movement';
import { dressingOn } from '../src/world/detailPass';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps, LAMP_GRID, LAMP_GRID_SLOTS, LAMP_STRIDE } from '../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField, type FieldDoor } from '../src/world/lightField';
import { moonLight } from '../src/world/lampMath';
import { LIGHT } from '../src/world/lights';
import tuned from './ctcourseLight.tuned.json';

const b = new LevelBuilder();
ctcourse.build(b, 0);
const reg = b.lights;
let bake: LightBake;
let open: LightField;
let shut: LightField;
let bakeMs = 0;

beforeAll(() => {
  const t0 = performance.now();
  const set = canonicalLightSet(b.boxes, b.cylinders, 'ctcourse', dressingOn(ctcourse));
  reg.ambient = ctcourse.theme.lightLevel ?? 0.75;
  const mL = moonLight(ctcourse.theme);
  const sky = Math.max(0, reg.ambient - mL);
  const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, set.lo, set.hi);
  const s = ctcourse.theme.sunDir;
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
}, 120_000);

const body = (f: LightField, x: number, y: number, z: number): number => f.bodyLevel(x, y, z, 1.7);
/** Bake index of the lamp at (x, y, z), -1 when there is none. */
const lampIdx = (x: number, y: number, z: number): number =>
  bake.lamps!.baked.ids.findIndex((id) => {
    const l = reg.lights[id]!;
    return Math.abs(l.x - x) < 0.01 && Math.abs(l.y - y) < 0.01 && Math.abs(l.z - z) < 0.01;
  });
/** Registry id of the lamp at (x, y, z). */
const lampId = (x: number, y: number, z: number): number => bake.lamps!.baked.ids[lampIdx(x, y, z)] ?? -1;

const MID = 7;
/** The airlock lamps (L1-L7), the station 5 medkit lamp (L10), the station 7 and station 2 wall-top lamps (L11, L12). */
const AIRLOCK_LAMPS = Array.from({ length: 7 }, (_, i) => [bayX(i) + CT_BAY + 3, AIRLOCK_LAMP_Y, MID] as const);
const S5_MEDKIT_LAMP = [bayX(4) + 14.6, ANNEX_LAMP_Y, 11.5] as const;
const S7_TOP_LAMP = [bayX(6) + CT_OBST, HIGH_LAMP_Y, MID] as const;
const S2_TOP_LAMP = [bayX(1) + CT_OBST + 0.9, HIGH_LAMP_Y, 5.0] as const;
const NEW_LAMPS = [...AIRLOCK_LAMPS, S5_MEDKIT_LAMP, S7_TOP_LAMP, S2_TOP_LAMP];

/** A must-see point: a standing body (feet at y) or a surface point, its minimum, and whether the doors are shut. */
interface Spot { name: string; kind: 'body' | 'surf'; x: number; y: number; z: number; min: number; shut?: boolean }
const spot = (name: string, kind: Spot['kind'], x: number, y: number, z: number, min: number, isShut = false): Spot => ({ name, kind, x, y, z, min, shut: isShut });
const readSpot = (p: Spot): number => {
  const f = p.shut ? shut : open;
  return p.kind === 'body' ? body(f, p.x, p.y, p.z) : f.levelAt(p.x, p.y, p.z);
};

/** (marlow-jammer) Station 3's route is its camera hallway along the south wall (the camera's line, z 1.6); its panel
 *  is in the entry lobby. The S3 levels in the tuned table were re-taken for the hallway (REPORT.md). */
const routeZ = (i: number): number => (i === 2 ? S3_CAMERA.z : MID);
const SPOTS: Spot[] = [];
for (let i = 0; i < 8; i++) {
  const x0 = bayX(i);
  const n = i + 1;
  const px = i === 2 ? S3_PANEL_X : x0 + 3.5;
  for (const dx of [0.6, 4, 7, 9.8, 12.5, 15.4]) SPOTS.push(spot(`S${n} route x0+${dx}`, 'body', x0 + dx, 0, routeZ(i), 0.6));
  SPOTS.push(spot(`S${n} route x0+8.4`, 'body', x0 + 8.4, 0, routeZ(i), 0.55));
  SPOTS.push(spot(`S${n} panel reader`, 'body', px, 0, 12.8, 0.45));
  SPOTS.push(spot(`S${n} panel face`, 'surf', px, 1.4, 13.55, 0.4));
  if (i < 7) {
    SPOTS.push(spot(`A${n} centre (shut)`, 'body', x0 + 19, 0, MID, 0.55, true));
    SPOTS.push(spot(`A${n} pad (shut)`, 'surf', x0 + 19, 0.3, MID, 0.45, true));
    SPOTS.push(spot(`A${n} corner (shut)`, 'body', x0 + 16.6, 0, 4.6, 0.38, true));
    SPOTS.push(spot(`A${n} far door (shut)`, 'body', x0 + 21.6, 0, MID, 0.42, true));
  }
}
SPOTS.push(
  // station 2: the leg-up square (S1 moved it to x0 + 8, z 3.5), the wall top where the boosted player arrives and stands
  // (assumed decision A3), the far-side drop and the bolt at the door
  spot('S2 leg-up square', 'body', 30, 0, 3.5, 0.5),
  spot('S2 leg-up square floor', 'surf', 30, 0.05, 3.5, 0.4),
  spot('S2 wall top z 3.5', 'body', 31, 4.4, 3.5, 0.45),
  spot('S2 wall top z 7', 'body', 31, 4.4, MID, 0.45),
  spot('S2 wall top surface z 4', 'surf', 31, 4.45, 4, 0.4),
  spot('S2 far drop (32, 3.5)', 'body', 32, 0, 3.5, 0.5),
  spot('S2 far door side (32, 6.4)', 'body', 32, 0, 6.4, 0.6),
  spot('S2 far door side (33, 8)', 'body', 33, 0, 8, 0.6),
  spot('S2 bolt', 'surf', 31.9, 1.2, MID, 0.6),
  spot('S4 release reader', 'body', 78, 0, 12.8, 0.45),
  spot('S4 release face', 'surf', 78, 1.3, 13.55, 0.4),
  spot('S5 leg-up square', 'body', 96, 0, 3.5, 0.5),
  spot('S5 leg-up square floor', 'surf', 96, 0.05, 3.5, 0.4),
  spot('S5 plate A body', 'body', 99, 4.45, 3.6, 0.55),
  spot('S5 plate B body', 'body', 99, 4.45, 10.4, 0.55),
  spot('S5 plate A surface', 'surf', 99, 4.7, 3.6, 0.6),
  spot('S5 hatch holder', 'body', 102.4, 4.45, 2.3, 0.45),
  spot('S5 hatch frame', 'surf', 102.4, 4.7, 1.8, 0.45),
  spot('S5 roof lip', 'body', 97.5, 4.45, MID, 0.6),
  spot('S5 hack panel', 'surf', S5_PANEL.x, 1.4, 0.45, 0.55),
  spot('S5 hanging head', 'surf', 102.4, 2.3, 1.3, 0.55),
  spot('S5 medkit user', 'body', 103, 0, 12.8, 0.6),
  spot('S5 medkit face', 'surf', 103, 1.2, 13.5, 0.5),
  spot('S5 back room centre', 'body', 102.3, 0, MID, 0.45),
  spot('S6 scanner A user', 'body', 115, 0, 1.0, 0.5),
  spot('S6 scanner B user', 'body', 115, 0, 13.0, 0.45),
  spot('S7 leg-up square', 'body', 140, 0, 3.5, 0.5),
  spot('S7 leg-up square floor', 'surf', 140, 0.05, 3.5, 0.4),
  spot('S7 rope holder', 'body', 141, 4.45, MID, 0.75),
  spot('S7 strip', 'surf', 141, 4.7, MID, 0.7),
  spot('S7 stair step 1 (top)', 'body', 142, 3.3, 1.0, 0.33),
  spot('S7 stair step 2', 'body', 143, 2.2, 1.0, 0.4),
  spot('S7 stair step 3', 'body', 144, 1.1, 1.0, 0.45),
  spot('S8 exit centre', 'body', 167.5, 0, MID, 0.9),
  spot('S8 exit corner SE', 'body', 169.4, 0, 3.1, 0.55),
  spot('S8 exit corner NW', 'body', 165.6, 0, 10.9, 0.55),
);

/** The dark between the pools: each bay's yard corners and fence-line points (station 5's back room excepted). */
const CORNERS: [string, number, number][] = [];
for (let i = 0; i < 8; i++) {
  const x0 = bayX(i);
  // (marlow-jammer) station 3: the hallway (z 0.6) is lit on purpose and x0 + 8.3 / 9.8 at z 13.4 are sealed void; its
  // corners are the two lobbies' far corners
  const dxs = i === 4 ? [0.6, 8.3] : [0.6, 8.3, 9.8, 15.4];
  for (const dx of dxs) for (const z of [0.6, 13.4]) if (i !== 2 || ((dx === 0.6 || dx === 15.4) && z === 13.4)) CORNERS.push([`S${i + 1} corner x0+${dx} z${z}`, x0 + dx, z]);
}

describe('Marlow Yard light pass (course-ready S2)', () => {
  it('bakes in node fast enough for the unit run', () => {
    expect(bakeMs).toBeLessThan(60_000);
  });

  it('every new lamp is in the bake', () => {
    for (const [x, y, z] of NEW_LAMPS) expect(lampIdx(x, y, z), `lamp at ${x}, ${y}, ${z}`).toBeGreaterThanOrEqual(0);
  });

  it('every must-see spot reads lit enough to see', () => {
    const low: string[] = [];
    for (const p of SPOTS) {
      const v = readSpot(p);
      if (!(v >= p.min)) low.push(`${p.name}: ${v.toFixed(2)} < ${p.min}`);
    }
    expect(low).toEqual([]);
  });

  it('the dark between the pools stays: the new lamps add nothing at the yard corners, and no corner is a lit pool', () => {
    const ids = NEW_LAMPS.map(([x, y, z]) => lampId(x, y, z));
    const on = CORNERS.map(([, x, z]) => body(open, x, 0, z));
    for (const id of ids) reg.setOn(id, false);
    const off = CORNERS.map(([, x, z]) => body(open, x, 0, z));
    for (const id of ids) reg.setOn(id, true);
    CORNERS.forEach(([name], k) => {
      expect(Math.abs(on[k]! - off[k]!), name).toBeLessThanOrEqual(0.02);
      expect(on[k]!, name).toBeLessThan(LIGHT.lit + 0.05);
    });
  });

  it('the airlock lamps stay inside their airlock with the doors shut; the wall-top lamps light no ground', () => {
    for (let i = 0; i < 7; i++) {
      const x0 = bayX(i);
      const k = lampIdx(...AIRLOCK_LAMPS[i]!);
      for (const [x, z] of [[x0 + 15.4, MID], [x0 + 22.6, MID], [x0 + 15.4, 4.6], [x0 + 22.6, 9.4]] as const) {
        for (const y of [1.0, 1.6]) expect(shut.lampAt(k, x, y, z), `A${i + 1} lamp at ${x}, ${y}, ${z}`).toBe(0);
      }
    }
    const s7 = lampIdx(...S7_TOP_LAMP);
    expect(shut.lampAt(s7, 139.5, 1.6, MID)).toBe(0);
    expect(shut.lampAt(s7, 142.5, 1.6, MID)).toBe(0);
    // station 2: the wall-top lamp adds (almost) nothing on the near-side approach (the wall top shades it)
    const s2 = lampIdx(...S2_TOP_LAMP);
    for (const [x, z] of [[29.4, MID], [28, 3.5], [30, 3.5], [29.4, 10]] as const) {
      for (const y of [1.02, 1.6]) expect(open.lampAt(s2, x, y, z), `S2 lamp near side ${x}, ${y}, ${z}`).toBeLessThanOrEqual(0.05);
    }
  });

  it('the station 3 camera bay reads the same with the new lamps off and on', () => {
    const ids = NEW_LAMPS.map(([x, y, z]) => lampId(x, y, z));
    const x0 = bayX(2);
    // (marlow-jammer) the camera hallway along the south wall, and the two lobbies
    const pts: [number, number][] = [];
    for (let x = x0 + 0.6; x <= x0 + 15.4; x += 0.8) pts.push([x, S3_CAMERA.z]);
    for (const [dx, z] of [[0.6, 13.4], [1.6, MID], [15.4, 13.4], [14.8, MID]] as const) pts.push([x0 + dx, z]);
    for (const f of [open, shut]) {
      const on = pts.map(([x, z]) => body(f, x, 0, z));
      for (const id of ids) reg.setOn(id, false);
      const off = pts.map(([x, z]) => body(f, x, 0, z));
      for (const id of ids) reg.setOn(id, true);
      // the camera sees through `visibilityFromLight`, which saturates at LIGHT.lit: compare what it sees
      pts.forEach(([x, z], k) => expect(Math.abs(Math.min(on[k]!, LIGHT.lit) - Math.min(off[k]!, LIGHT.lit)), `S3 ${x.toFixed(1)}, ${z}`).toBeLessThanOrEqual(0.005));
    }
  });

  it('no 2 m column has more lamps in reach than the shaders list', () => {
    const L = bake.lamps!.baked.lights;
    const n = L.length / LAMP_STRIDE;
    const cols = Math.ceil((bake.hi[0] - bake.lo[0]) / LAMP_GRID);
    const rows = Math.ceil((bake.hi[2] - bake.lo[2]) / LAMP_GRID);
    let worst = 0;
    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        const cx0 = bake.lo[0] + q * LAMP_GRID;
        const cz0 = bake.lo[2] + r * LAMP_GRID;
        let c = 0;
        for (let i = 0; i < n; i++) {
          const o = i * LAMP_STRIDE;
          const dx = Math.max(cx0 - L[o]!, 0, L[o]! - (cx0 + LAMP_GRID));
          const dz = Math.max(cz0 - L[o + 2]!, 0, L[o + 2]! - (cz0 + LAMP_GRID));
          if (Math.sqrt(dx * dx + dz * dz) < L[o + 3]!) c++;
        }
        worst = Math.max(worst, c);
      }
    }
    expect(worst).toBeLessThanOrEqual(LAMP_GRID_SLOTS);
  });

  it('keeps every lamp under the bake box top', () => {
    for (const l of reg.lights) if (l.kind !== 'flashlight') expect(l.y + 0.2).toBeLessThanOrEqual(bake.hi[1]);
  });

  it('(marlow-bunker) underground: no moon, and the open floor still reads 0.30 (Michael kept it): all fill now', () => {
    expect(moonLight(ctcourse.theme)).toBe(0);
    expect(bake.moonLight).toBe(0);
    const ids = bake.lamps!.baked.ids;
    for (const id of ids) reg.setOn(id, false);
    const pts: [number, number][] = [];
    for (let i = 0; i < 8; i++) for (const [dx, z] of [[0.6, 0.6], [4, MID], [8.3, 13.4], [12.5, 3], [15.4, 13.4]] as const) pts.push([bayX(i) + dx, z]);
    const lv = pts.map(([x, z]) => body(open, x, 0, z));
    for (const id of ids) reg.setOn(id, true);
    pts.forEach(([x, z], k) => expect(lv[k]!, `fill at ${x}, ${z}`).toBeCloseTo(0.3, 2));
  });

  it('(marlow-bunker) the levels the course was tuned on hold: every spot within 0.08, no band change but at its edge', () => {
    const before = tuned.levels as Record<string, number>;
    const now = new Map<string, number>([...SPOTS.map((p) => [p.name, readSpot(p)] as const), ...CORNERS.map(([name, x, z]) => [name, body(open, x, 0, z)] as const)]);
    expect(now.size).toBe(Object.keys(before).length);
    const band = (v: number): number => (v < LIGHT.shadow ? 0 : v < LIGHT.lit ? 1 : 2);
    const nearEdge = (v: number): boolean => Math.min(Math.abs(v - LIGHT.shadow), Math.abs(v - LIGHT.lit)) <= 0.05;
    const bad: string[] = [];
    for (const [name, v] of now) {
      const was = before[name];
      if (was === undefined) bad.push(`${name}: not in the tuned table`);
      else if (Math.abs(v - was) > 0.08) bad.push(`${name}: ${was} -> ${v.toFixed(2)}`);
      // a band change only where both levels sit at the band's edge (the former moon shadows lift 0.25 -> 0.30)
      else if (band(v) !== band(was) && !(nearEdge(v) && nearEdge(was))) bad.push(`${name}: band ${was} -> ${v.toFixed(2)}`);
    }
    expect(bad).toEqual([]);
  });

  it('(marlow-jammer fix round 2) every darkenable station 3 lamp out: an unjammed runner is still caught in the hallway', () => {
    const x0 = bayX(2);
    const s3 = reg.lights.filter((l) => l.x > x0 - 0.5 && l.x < x0 + CT_BAY + 0.5 && l.kind !== 'flashlight');
    const hard = s3.filter((l) => Math.abs(l.x - (x0 + S3_HARD_LAMP_X)) < 0.01);
    expect(hard.length).toBe(1);
    expect(hard[0]!.electric || hard[0]!.destructible).toBe(false);
    // out: every lamp a jam, an EMP or a shot can put out
    const out = s3.filter((l) => l.electric || l.destructible);
    expect(out.length).toBe(s3.length - 1);
    for (const l of out) reg.setOn(l.id, false);
    const blind = (S3_CAMERA.y - 1.7) / Math.tan(CAMERA.vFov / 2);
    const caughtAt = (speed: number, crouched: boolean): number => {
      const m = newMeter();
      const dt = 1 / 30;
      for (let x = S3_HALL.x0; x < x0 + 13.8; x += speed * dt) {
        const dist = Math.hypot(S3_CAMERA.x - x, S3_CAMERA.y - (crouched ? 1.05 : 1.6));
        const rate = S3_CAMERA.x - x > blind ? cameraRate(dist, body(open, x, 0, S3_CAMERA.z), crouched, speed) : 0;
        stepCamMeter(m, rate, dt);
        if (m.stage === 2) return x - x0;
      }
      return -1;
    };
    const run = caughtAt(GEARS.stand[4], false);
    const crouch = caughtAt(0.8, true);
    for (const l of out) reg.setOn(l.id, true);
    expect(run).toBeGreaterThan(0);
    expect(run).toBeLessThan(13.8);
    expect(crouch).toBeGreaterThan(0);
  });

  it.runIf(process.env.CTLIGHT_PRINT === '1')('prints the levels', () => {
    const rows = [...SPOTS.map((p) => `${p.name}\t${readSpot(p).toFixed(2)}`), ...CORNERS.map(([name, x, z]) => `${name}\t${body(open, x, 0, z).toFixed(2)}`)];
    console.info(`bake ${(bakeMs / 1000).toFixed(1)} s, ${bake.lamps!.baked.ids.length} lamps\n${rows.join('\n')}`);
  });
});
