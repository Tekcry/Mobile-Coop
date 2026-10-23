/** LR16g scratch probe (NOT committed): per-point, per-lamp decomposition of the warehouseOps S1-S3 light-test points. */
import { writeFileSync } from 'node:fs';
import { beforeAll, describe, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { S1_LIGHT_PASS } from '../src/world/maps/warehouseS1';
import { S2_LIGHT_PASS } from '../src/world/maps/warehouseS2';
import { S3_LIGHT_PASS } from '../src/world/maps/warehouseS3';
import { WAREHOUSE_SECTORS } from '../src/world/maps/warehouseSectors';
import { dressingOn } from '../src/world/detailPass';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps } from '../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField, type FieldDoor } from '../src/world/lightField';
import { moonLight } from '../src/world/lampMath';
import { hyp2 } from '../src/core/mathx';

const map = warehouseOps;
const b = new LevelBuilder();
map.build(b, 0);
const reg = b.lights;
let bake: LightBake;
let open: LightField;
let shut: LightField;

beforeAll(() => {
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
}, 240_000);

interface P { sec: number; kind: 'spot' | 'pocket' | 'cross'; name: string; x: number; y: number; z: number; min: number; max: number; shut?: boolean }
const PTS: P[] = [];
const READ = 0.4, KEY = 0.45, DARK = 0.3, CAP = 0.55, WORK = 0.8, MOON = 0.28, ROOF_Y = 5.9, AISLE = 0.4, AISLE_MAX = 0.55, HANG = 2.0;

// ---------- S1 (copied from tests/warehouseS1Light.test.ts)
{
  const atLeast = (y: number, min: number): number => (y >= ROOF_Y ? MOON : min);
  const spot = (name: string, x: number, y: number, z: number, min = READ, isShut = false, max = CAP): P => ({ sec: 1, kind: 'spot', name, x, y, z, min: atLeast(y, min), max, shut: isShut });
  const SEC = WAREHOUSE_SECTORS[0]!;
  const POCKETS = [
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
  SEC.routes.forEach((r, ri) => {
    r.pts.forEach((p, i) => {
      const y = p[2] ?? 0;
      if (nearPocket(p[0], p[1], y)) return;
      PTS.push(spot(`R${ri + 1}[${i}] (${p[0]}, ${p[1]}${p[2] === undefined ? '' : ', ' + p[2]})`, p[0], y, p[1], i === r.obj ? KEY : READ, false, i === r.obj ? WORK : CAP));
    });
  });
  SEC.guards.slice(0, 5).forEach((g, i) => PTS.push(spot(`takedown ${i + 1} ${g.kind}`, g.takedownSpot![0], 0, g.takedownSpot![1], READ, false, CAP)));
  PTS.push(
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
  for (const p of POCKETS) PTS.push({ sec: 1, kind: 'pocket', ...p, min: -1, max: DARK });
  // cross-section points (S2 / S3 must not move with S1's lamps)
  for (let x = -23; x <= 23; x += 2) for (const z of [-5, -3, 0, 4, 8, 12, 16]) { if (!(x === -15 && z === -5)) PTS.push({ sec: 1, kind: 'cross', name: `x1 ${x},0,${z}`, x, y: 0, z, min: -1, max: 9 }); }
  for (const [x, z] of [[-14.5, -4], [-20.5, -3.6]] as const) PTS.push({ sec: 1, kind: 'cross', name: `x1 ${x},0,${z}`, x, y: 0, z, min: -1, max: 9 });
  for (const [x, z] of [[-20.5, -3.6], [-20.5, 11], [12, 14.1], [15, 14]] as const) PTS.push({ sec: 1, kind: 'cross', name: `x1 ${x},2.8,${z}`, x, y: 2.8, z, min: -1, max: 9 });
}

// ---------- S2 (copied from tests/warehouseS2Light.test.ts)
{
  const spot = (name: string, x: number, y: number, z: number, min = READ, isShut = false, max = CAP): P => ({ sec: 2, kind: 'spot', name, x, y, z, min, max, shut: isShut });
  const SEC = WAREHOUSE_SECTORS[1]!;
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
  const POCKETS = [
    ...SEC.guards.map((g, i) => ({ name: `takedown ${i + 1} ${g.kind}`, x: g.takedownSpot[0], y: 0, z: g.takedownSpot[1] })).filter((p) => toRoutes(p.x, p.z) > 2),
    { name: 'lane east half', x: -9.3, y: 0, z: -5.2 },
    { name: 'rack top R3S (dark side)', x: -9.35, y: 4, z: -0.5 },
    { name: 'rack top W0S (dark side)', x: -23.45, y: 4, z: -0.5 },
  ];
  const nearPocket = (x: number, z: number, y: number): boolean => POCKETS.some((p) => Math.abs(p.y - y) < 1 && hyp2(p.x - x, p.z - z) < 0.5);
  SEC.routes.forEach((r, ri) => {
    r.pts.forEach((p, i) => {
      const y = p[2] ?? 0;
      if (nearPocket(p[0], p[1], y)) return;
      const feet = y >= 4.5 ? y - HANG : y;
      PTS.push(spot(`R${ri + 1}[${i}] (${p[0]}, ${p[1]}${p[2] === undefined ? '' : ', ' + p[2]})`, p[0], feet, p[1], i === r.obj ? KEY : READ, false, i === r.obj ? WORK : CAP));
    });
  });
  SEC.guards.forEach((g, i) => {
    if (POCKETS.some((p) => p.name.startsWith(`takedown ${i + 1} `))) return;
    PTS.push(spot(`takedown ${i + 1} ${g.kind}`, g.takedownSpot[0], 0, g.takedownSpot[1], READ, false, g.kind === 'officer' && g.takedownSpot[1] > 16 ? WORK : CAP));
  });
  PTS.push(
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
  for (const p of POCKETS) PTS.push({ sec: 2, kind: 'pocket', ...p, min: -1, max: DARK });
  for (let x = -23; x <= 23; x += 4) for (const z of [-24, -20, -16, -12, -10]) PTS.push({ sec: 2, kind: 'cross', name: `x2 ${x},0,${z}`, x, y: 0, z, min: -1, max: 9 });
  for (const x of [0, 4, 8, 12, 16, 20]) for (const z of [-6, -2, 3, 8, 11, 15]) if (hyp2(x + 4, z - 14.55) > 6) PTS.push({ sec: 2, kind: 'cross', name: `x2 ${x},0,${z}`, x, y: 0, z, min: -1, max: 9 });
  for (const [x, y, z] of [[12, 3.3, 14.1], [15, 3.3, 14]] as const) PTS.push({ sec: 2, kind: 'cross', name: `x2 ${x},${y},${z}`, x, y, z, min: -1, max: 9 });
}

// ---------- S3 (copied from tests/warehouseS3Light.test.ts)
{
  const spot = (name: string, x: number, y: number, z: number, min = READ, max = CAP, isShut = false): P => ({ sec: 3, kind: 'spot', name, x, y, z, min, max, shut: isShut });
  const SEC = WAREHOUSE_SECTORS[2]!;
  const POCKETS = [
    { name: "supervisor's spot (the parts store)", x: 12.0, y: 0, z: 15.0 },
    { name: "loader's spot (the deck, west staging)", x: 3.0, y: 3.3, z: 13.2 },
    { name: "crane operator's spot (under the walkway)", x: 8.0, y: 0, z: -6.8 },
    { name: "stores officer's spot (the cage corner)", x: 0.6, y: 0, z: -7.6 },
    { name: 'the east bay by the plant room', x: 21.0, y: 0, z: 1.5 },
    { name: "the deck's west end", x: -2.0, y: 3.3, z: 15.5 },
  ];
  const nearPocket = (x: number, z: number, y: number): boolean => POCKETS.some((p) => Math.abs(p.y - y) < 1 && hyp2(p.x - x, p.z - z) < 0.5);
  SEC.routes.forEach((r, ri) => {
    r.pts.forEach((p, i) => {
      const y = p[2] ?? 0;
      if (nearPocket(p[0], p[1], y)) return;
      const feet = y >= 4.5 ? (p[1] > 11.85 ? Math.max(3.3, y - HANG) : y - HANG) : y;
      PTS.push(spot(`R${ri + 1}[${i}] (${p[0]}, ${p[1]}${p[2] === undefined ? '' : ', ' + p[2]})`, p[0], feet, p[1], i === r.obj ? KEY : READ, i === r.obj ? WORK : CAP));
    });
  });
  PTS.push(
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
    spot('the fitter (the press)', 7.6, 0, 1.0, 0.55, WORK),
    spot('the packing end', 8.0, 0, 9.7, 0.55, WORK),
    spot('the cage counter', 4.7, 0, -5.0, 0.55, WORK),
    spot("the engineer's panel", 19.4, 0, -3.0, 0.55, WORK),
    spot('the clerk', 18.6, 3.3, 17.1, 0.55, WORK),
    spot('the terminal', 22.4, 3.3, 17.3, 0.55, WORK),
    spot("the porter's spot", SEC.guards[0]!.takedownSpot[0], 0, SEC.guards[0]!.takedownSpot[1]),
    spot("the tour guard's spot (the lobby)", SEC.guards[3]!.takedownSpot[0], 0, SEC.guards[3]!.takedownSpot[1]),
  );
  for (const p of POCKETS) PTS.push({ sec: 3, kind: 'pocket', ...p, min: -1, max: DARK });
  for (let x = -23; x <= -6; x += 4) for (const z of [-5, -1, 3, 7, 11, 14, 17]) if (hyp2(x + 4, z - 14.55) > 6) PTS.push({ sec: 3, kind: 'cross', name: `x3 ${x},0,${z}`, x, y: 0, z, min: -1, max: 9 });
  for (let x = -23; x <= 23; x += 4) for (const z of [-24, -20, -16, -12, -10]) PTS.push({ sec: 3, kind: 'cross', name: `x3 ${x},0,${z}`, x, y: 0, z, min: -1, max: 9 });
}

const lampKey = (x: number, y: number, z: number): number =>
  bake.lamps!.baked.ids.find((id) => { const l = reg.lights[id]!; return Math.abs(l.x - x) < 0.01 && Math.abs(l.y - y) < 0.01 && Math.abs(l.z - z) < 0.01; }) ?? -1;

describe('lr16g probe', () => {
  it('decomposes', () => {
    const ids = bake.lamps!.baked.ids;
    const pass = [S1_LIGHT_PASS, S2_LIGHT_PASS, S3_LIGHT_PASS].map((t) => t.map((p) => lampKey(p[0], p[1], p[2])));
    const fieldOf = (p: P): LightField => (p.shut ? shut : open);
    // the two body samples
    const samples = PTS.map((p) => [[p.x, p.y + 1.7 * 0.6, p.z], [p.x, p.y + 1.7 * 0.95, p.z]] as const);
    const base = PTS.map((p) => fieldOf(p).bodyLevel(p.x, p.y, p.z, 1.7));
    const bounceAll = PTS.map((p, k) => samples[k]!.map(([x, y, z]) => fieldOf(p).bounceAt(x, y, z)));
    // all lamps off: ambient + moon
    const inten = ids.map((id) => reg.lights[id]!.intensity);
    for (const id of ids) reg.lights[id]!.intensity = 0;
    reg.version++;
    const amb = PTS.map((p, k) => samples[k]!.map(([x, y, z]) => fieldOf(p).levelAt(x, y, z)));
    ids.forEach((id, i) => { reg.lights[id]!.intensity = inten[i]!; });
    reg.version++;
    // per lamp: direct (lampAt) + bounce (toggle)
    const contrib: Record<number, [number, number, number, number]>[] = PTS.map(() => ({}));
    ids.forEach((id, i) => {
      if (inten[i]! <= 0) return;
      reg.lights[id]!.intensity = 0;
      reg.version++;
      PTS.forEach((p, k) => {
        const f = fieldOf(p);
        const s = samples[k]!;
        const bc = f.bounceAt(s[0][0], s[0][1], s[0][2]);
        const bh = f.bounceAt(s[1][0], s[1][1], s[1][2]);
        const db0 = bounceAll[k]![0]! - bc;
        const db1 = bounceAll[k]![1]! - bh;
        reg.lights[id]!.intensity = inten[i]!;
        const d0 = f.lampAt(i, s[0][0], s[0][1], s[0][2]);
        const d1 = f.lampAt(i, s[1][0], s[1][1], s[1][2]);
        reg.lights[id]!.intensity = 0;
        if (d0 + d1 + db0 + db1 > 0.002) contrib[k]![id] = [d0, d1, db0, db1];
      });
      reg.lights[id]!.intensity = inten[i]!;
      reg.version++;
    });
    const lamps = ids.map((id, i) => { const l = reg.lights[id]!; return { id, i, x: l.x, y: l.y, z: l.z, r: l.radius, intensity: inten[i], group: l.group, kind: l.kind }; });
    writeFileSync(process.env.PROBE_OUT!, JSON.stringify({ lamps, pass, pts: PTS.map((p, k) => ({ ...p, base: base[k], amb: amb[k], bounce: bounceAll[k], c: contrib[k] })) }));
  }, 600_000);
});
