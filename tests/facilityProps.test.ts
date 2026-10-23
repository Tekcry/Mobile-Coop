/**
 * The props kit (marlow-final M5 / A6): placement maths, the gameplay boxes, rows, the layout check, the built GLB and
 * its report against the props tables (budgets, footprints, the skin rule, winding), and the renderer on a NullEngine.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Matrix, Quaternion, Vector3 } from '../src/core/babylon';
import { parseGlb } from '../src/operators/lab/glb';
import { canonicalLightShapes } from '../src/voxel/lightShapes';
import { LevelBuilder } from '../src/world/levelBuilder';
import {
  FacilityProps,
  PROP_COLLISION,
  PROP_DARK,
  PROP_EMISSIVE_PARTS,
  PROP_FOOTPRINT,
  PROP_HUNG,
  PROP_IDS,
  PROP_LAMP_GAIN,
  PROP_LAMP_TINT,
  PROP_LOOK,
  PROP_MATERIALS,
  PROP_OVERHANG,
  PROP_OWN_SUPPLY,
  PROP_PROUD,
  PROP_SET_BUDGET,
  PROP_TRI_BUDGET,
  TRACK_RAIL_TOP,
  VAULT_HINGE,
  checkPropLayout,
  propCollisionBox,
  propDraws,
  propGlows,
  propMatrix,
  propRow,
  propToWorld,
  propTriangles,
  snapPlacement,
  snapYaw,
  vaultDoorProps,
  type PropMaterial,
  type PropPlacement,
} from '../src/world/props/facilityProps';

const ASSETS = path.resolve(__dirname, '../src/world/props/assets');
const report = JSON.parse(readFileSync(path.join(ASSETS, 'facility-props.json'), 'utf8')) as {
  pieces: Record<string, { meshes: Record<string, number>; triangles: number; bounds: { min: number[]; max: number[] } }>;
  materials: string[];
  triangles: number;
};
const glb = (file: string): ArrayBuffer => {
  const b = readFileSync(file);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

describe('props maths', () => {
  it('snaps x and z to 5 cm, y to 1 cm, the yaw to 90 degrees unless free', () => {
    const p = snapPlacement({ prop: 'serverRack', x: 3.33, y: 0.404, z: -1.02, yaw: Math.PI / 2 - 0.2 });
    expect(p.x).toBeCloseTo(3.35, 9);
    expect(p.y).toBeCloseTo(0.4, 9);
    expect(p.z).toBeCloseTo(-1.0, 9);
    expect(p.yaw).toBeCloseTo(Math.PI / 2, 9);
    expect(snapPlacement({ prop: 'serverRack', x: 0, y: 0, z: 0, yaw: 0.3, free: true }).yaw).toBeCloseTo(0.3, 9);
    expect(snapYaw(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2, 9);
    expect(snapYaw(2 * Math.PI - 0.01)).toBe(0);
  });

  it('writes the same matrix as Babylon (yaw, then position) and as propToWorld', () => {
    const p = { x: 3.2, y: 0.5, z: -7.1, yaw: 0.83 };
    const out = new Float32Array(16);
    propMatrix(p, out, 0);
    const ref = new Matrix();
    Matrix.ComposeToRef(new Vector3(1, 1, 1), Quaternion.RotationYawPitchRoll(p.yaw, 0, 0), new Vector3(p.x, p.y, p.z), ref);
    const r = ref.toArray();
    for (let i = 0; i < 16; i++) expect(out[i]).toBeCloseTo(r[i]!, 5);
    const a = Vector3.TransformCoordinates(new Vector3(0.4, 1.1, -0.25), ref);
    const b = propToWorld(p, 0.4, 1.1, -0.25);
    expect(b[0]).toBeCloseTo(a.x, 5);
    expect(b[1]).toBeCloseTo(a.y, 5);
    expect(b[2]).toBeCloseTo(a.z, 5);
  });
});

describe('props placement (the gameplay boxes)', () => {
  it('turns each collision box into the world with the prop and writes it as a LevelBuilder box', () => {
    const p: PropPlacement = { prop: 'bankCounter', x: 10, y: 0, z: 4, yaw: Math.PI / 2 };
    const [w] = propCollisionBox(p)!;
    // local x runs along world -z at yaw 90 degrees: the 2.38 m counter lies along z, its front (+z local) faces +x
    expect(w!.yaw).toBeCloseTo(Math.PI / 2, 9);
    expect(w!.s[0]).toBeCloseTo(2.38, 9);
    expect(w!.c[0]).toBeCloseTo(10 - 0.01, 9);
    expect(w!.c[2]).toBeCloseTo(4, 9);
    expect(w!.visible).toBe(true);
    const b = new LevelBuilder();
    const props = new FacilityProps();
    props.add('bankCounter', 10, 4, Math.PI / 2);
    props.add('palletRackBay', 0, 0, 0);
    props.add('vaultLeaf', 5, 5, 0);
    props.write(b);
    expect(b.boxes.length).toBe(2);
    expect(b.boxes[0]).toMatchObject({ c: w!.c, s: w!.s, yaw: w!.yaw, collide: true, visible: true });
    expect(b.boxes[0]!.noLedge).toBeFalsy();
    // open racking: collision-only, no ledge, and out of the light shapes (light passes, as the kit's glass)
    expect(b.boxes[1]).toMatchObject({ collide: true, visible: false, noLedge: true });
    expect(canonicalLightShapes(b.boxes, b.cylinders, 'props-test', false).length).toBe(1);
    expect(propCollisionBox({ prop: 'vaultLeaf', x: 0, y: 0, z: 0, yaw: 0 })).toBeNull();
  });

  it('every solid box sits inside its prop (1 cm under the skin) and the skin stands at most 5 cm off the hull', () => {
    for (const id of PROP_IDS) {
      const boxes = PROP_COLLISION[id];
      const r = report.pieces[id]!;
      if (!boxes) continue;
      const lo = [Infinity, Infinity, Infinity];
      const hi = [-Infinity, -Infinity, -Infinity];
      for (const b of boxes) {
        for (let k = 0; k < 3; k++) {
          expect(b.hi[k]!, `${id} box`).toBeGreaterThan(b.lo[k]!);
          lo[k] = Math.min(lo[k]!, b.lo[k]!);
          hi[k] = Math.max(hi[k]!, b.hi[k]!);
          // a solid box never pokes out of the drawn prop (it would show as greybox)
          if (!b.see) {
            expect(b.lo[k]!, `${id} solid box inside`).toBeGreaterThanOrEqual(r.bounds.min[k]! - 1e-3);
            expect(b.hi[k]!, `${id} solid box inside`).toBeLessThanOrEqual(r.bounds.max[k]! + 1e-3);
          }
        }
      }
      const allow = Math.max(PROP_PROUD, PROP_OVERHANG[id]?.by ?? 0) + 1e-3;
      for (let k = 0; k < 3; k++) {
        expect(lo[k]! - r.bounds.min[k]!, `${id} axis ${k} min`).toBeLessThanOrEqual(allow);
        expect(r.bounds.max[k]! - hi[k]!, `${id} axis ${k} max`).toBeLessThanOrEqual(allow);
      }
    }
  });

  it('a row tiles whole modules centred on the line; racking gets its closing frame at the far end', () => {
    const racks = propRow('serverRack', 0, 0, 6.1, 0);
    expect(racks.length).toBe(10);
    expect(racks[0]!.x).toBeCloseTo(0.35, 6);
    expect(racks[9]!.x).toBeCloseTo(5.75, 6);
    expect(racks.every((p) => p.yaw === 0 && p.z === 0)).toBe(true);
    for (const flip of [false, true]) {
      const row = propRow('palletRackBay', 0, 2, 8.1, 2, { flip });
      const bays = row.filter((p) => p.prop === 'palletRackBay');
      const ends = row.filter((p) => p.prop === 'palletRackEnd');
      expect(bays.length).toBe(3);
      expect(ends.length).toBe(1);
      // every bay's frame end and the closing frame: 4 frames at 0, 2.7, 5.4, 8.1
      const frames = [...bays.map((b) => propToWorld(b, -1.35, 0, 0)[0]), ends[0]!.x].sort((a, b) => a - b);
      expect(frames.map((x) => Math.round(x * 100) / 100 + 0)).toEqual([0, 2.7, 5.4, 8.1]);
      expect(checkPropLayout(row, { x0: -0.1, z0: 0, x1: 8.2, z1: 4 })).toEqual([]);
    }
    // the fronts face left of the walk (+z for a walk along +x), right when flipped
    const [a] = propRow('bankCounter', 0, 0, 2.4, 0);
    const [b] = propRow('bankCounter', 0, 0, 2.4, 0, { flip: true });
    expect(propToWorld(a!, 0, 0, 1)[2]).toBeGreaterThan(0);
    expect(propToWorld(b!, 0, 0, 1)[2]).toBeLessThan(0);
  });

  it('the layout check flags props outside the set, overlapping boxes, and a set over budget', () => {
    const props = new FacilityProps();
    props.add('serverRack', 1, 1, 0);
    props.add('serverRack', 1.3, 1, 0);
    props.add('beamTower', 9.9, 1, 0);
    const out = props.check({ x0: 0, z0: 0, x1: 10, z1: 10 });
    expect(out.some((s) => s.includes('overlaps'))).toBe(true);
    expect(out.some((s) => s.startsWith('beamTower') && s.includes('outside'))).toBe(true);
    // a rack on a mezzanine over a counter does not overlap it (heights apart)
    const stacked = checkPropLayout([{ prop: 'bankCounter', x: 0, y: 0, z: 0, yaw: 0 }, { prop: 'serverRack', x: 0, y: 1.3, z: 0, yaw: 0 }], { x0: -5, z0: -5, x1: 5, z1: 5 });
    expect(stacked).toEqual([]);
    // budgets from the report
    const many = propRow('boxVan', 0, 0, 700, 0);
    expect(propTriangles(many, report)).toBeGreaterThan(PROP_SET_BUDGET.tris);
    expect(checkPropLayout(many, { x0: -1, z0: -5, x1: 701, z1: 5 }, report).some((s) => s.includes('triangles'))).toBe(true);
    expect(propDraws(many, report)).toBe(Object.keys(report.pieces.boxVan!.meshes).length);
  });

  it('the strongroom door: the leaf on the hinge, the Door anchor on the opening, swinging out to the +z face', () => {
    const v = vaultDoorProps(20, 10, Math.PI / 2);
    expect(v.frame.yaw).toBeCloseTo(Math.PI / 2, 9);
    const hinge = propToWorld(v.frame, VAULT_HINGE.x, 0, VAULT_HINGE.z);
    expect(v.leaf.x).toBeCloseTo(hinge[0], 9);
    expect(v.leaf.z).toBeCloseTo(hinge[2], 9);
    // Doors: the shut leaf from the hinge along (sin yaw, cos yaw) spans the opening (frame-local x -0.7 .. 0.7)
    const far = [v.anchor.hx + Math.sin(v.anchor.yaw) * v.anchor.width, v.anchor.hz + Math.cos(v.anchor.yaw) * v.anchor.width];
    const want = propToWorld(v.frame, 0.7, 0, 0);
    expect(far[0]).toBeCloseTo(want[0], 6);
    expect(far[1]).toBeCloseTo(want[2], 6);
    // a negative turn moves the frame's +x towards its +z face
    const turned = propToWorld({ ...v.leaf, yaw: v.leaf.yaw - 1.2 }, 1.0, 0, 0);
    const shut = propToWorld(v.leaf, 1.0, 0, 0);
    const n = propToWorld(v.frame, 0, 0, 1);
    const nz = [n[0] - v.frame.x, n[2] - v.frame.z];
    expect((turned[0] - shut[0]) * nz[0]! + (turned[2] - shut[2]) * nz[1]!).toBeGreaterThan(0);
    expect(v.anchor.swing).toBe(-1);
  });
});

describe('props build (facility-props.glb and its report)', () => {
  it('has every prop within its triangle budget and footprint, and only the props materials', () => {
    expect(Object.keys(report.pieces).sort()).toEqual([...PROP_IDS].sort());
    expect(report.materials).toEqual([...PROP_MATERIALS]);
    expect(Object.keys(PROP_LOOK).sort()).toEqual([...PROP_MATERIALS].sort());
    for (const id of PROP_IDS) {
      const r = report.pieces[id]!;
      expect(r.triangles, id).toBeLessThanOrEqual(PROP_TRI_BUDGET[id]);
      for (const m of Object.keys(r.meshes)) expect(PROP_MATERIALS as readonly string[]).toContain(m);
      const f = PROP_FOOTPRINT[id];
      expect(r.bounds.min[0]!, `${id} x0`).toBeGreaterThanOrEqual(f[0] - 0.01);
      expect(r.bounds.min[2]!, `${id} z0`).toBeGreaterThanOrEqual(f[1] - 0.01);
      expect(r.bounds.max[0]!, `${id} x1`).toBeLessThanOrEqual(f[2] + 0.01);
      expect(r.bounds.max[2]!, `${id} z1`).toBeLessThanOrEqual(f[3] + 0.01);
      // free-standing props stand on the floor
      expect(r.bounds.min[1]!, `${id} floor`).toBeGreaterThanOrEqual(0);
      expect(r.bounds.min[1]!, `${id} floor`).toBeLessThanOrEqual(0.03);
    }
    // the video wall hangs on its wall: nothing behind the face
    expect(report.pieces.monitorWall!.bounds.min[2]).toBeGreaterThanOrEqual(0);
  });

  it('batch 2: hung props sit on their mounting face, the van stands on the track rail, sets stay in their draw budget', () => {
    // (the cable tray hangs from the ceiling, centred on its run)
    for (const id of PROP_HUNG.filter((h) => h !== 'cableTray')) expect(report.pieces[id]!.bounds.min[2], `${id} back on the wall`).toBeGreaterThanOrEqual(0);
    expect(report.pieces.trackPanel!.bounds.max[1]).toBeCloseTo(TRACK_RAIL_TOP, 4);
    // every prop draws at most 6 materials, so a set of a few kinds stays near the 12-draw budget
    for (const id of PROP_IDS) expect(Object.keys(report.pieces[id]!.meshes).length, id).toBeLessThanOrEqual(6);
    // a dressed office range (A3): desks, chairs, cabinets, a trolley
    const office = new FacilityProps();
    office.row('officeDesk', 0, 0, 6.4, 0);
    for (let i = 0; i < 4; i++) office.add('officeChair', 0.8 + i * 1.6, 0.9, Math.PI);
    office.row('filingCabinet', 0, 4, 1.9, 4, { flip: true });
    office.add('cleanerTrolley', 5, 3, 0);
    expect(office.check({ x0: -0.5, z0: -1, x1: 7, z1: 4.5 }, report)).toEqual([]);
  });

  it('reads with the game GLB reader: one mesh per (prop, material), the same winding as the weapon meshes', () => {
    const model = parseGlb(glb(path.join(ASSETS, 'facility-props.glb')));
    const names = model.meshes.map((m) => m.name).sort();
    const want = Object.entries(report.pieces).flatMap(([p, r]) => Object.keys(r.meshes).map((m) => `${p}.${m}`)).sort();
    expect(names).toEqual(want);
    const share = (ms: typeof model.meshes): number => {
      let pos = 0;
      let all = 0;
      for (const m of ms) {
        const P = m.positions;
        const N = m.normals;
        const I = m.indices;
        for (let t = 0; t < I.length; t += 3) {
          const a = I[t]! * 3;
          const b = I[t + 1]! * 3;
          const c = I[t + 2]! * 3;
          const ux = P[b]! - P[a]!, uy = P[b + 1]! - P[a + 1]!, uz = P[b + 2]! - P[a + 2]!;
          const vx = P[c]! - P[a]!, vy = P[c + 1]! - P[a + 1]!, vz = P[c + 2]! - P[a + 2]!;
          const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
          const d = cx * (N[a]! + N[b]! + N[c]!) + cy * (N[a + 1]! + N[b + 1]! + N[c + 1]!) + cz * (N[a + 2]! + N[b + 2]! + N[c + 2]!);
          if (Math.abs(d) < 1e-12) continue;
          all++;
          if (d > 0) pos++;
        }
      }
      return pos / all;
    };
    const props = share(model.meshes);
    const rifle = share(parseGlb(glb(path.resolve(__dirname, '../src/weapons/assets/rifle.glb'))).meshes);
    expect(Math.abs(rifle - 0.5)).toBeGreaterThan(0.45);
    expect(props).toBeCloseTo(rifle > 0.5 ? 1 : 0, 2);
  });

  it('draws the static opaque props baked per material, the rest one thin-instanced mesh per (prop, material); lamps tint per instance; the vault leaf follows its door', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { Doors } = await import('../src/world/doors');
    const { PropRender } = await import('../src/world/props/propRender');
    const b = new LevelBuilder();
    const props = new FacilityProps();
    props.row('serverRack', 0, 0, 3, 0);
    const tower = props.add('beamTower', 6, 3, 0);
    const v = props.vault(10, 0, 0);
    const door = b.door(v.anchor.hx, v.anchor.hy, v.anchor.hz, v.anchor.width, v.anchor.yaw, { height: v.anchor.height, swing: v.anchor.swing, leaf: 'slide' });
    props.placements[v.leaf]!.door = door.id;
    props.write(b);
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const doors = new Doors(scene, b.anchors);
    const model = parseGlb(glb(path.join(ASSETS, 'facility-props.glb')));
    const r = PropRender.fromModel(scene, model, props.placements, doors.list);
    const placed = new Set(props.placements.map((p) => p.prop));
    // (S9 perf) static (the leaf follows a door), opaque, one colour: baked into `prop-static.<material>`
    const baked = (p: string, m: string): boolean => p !== 'vaultLeaf' && !PROP_LOOK[m as PropMaterial].emissive && PROP_LOOK[m as PropMaterial].alpha === undefined;
    const pairs = Object.entries(report.pieces)
      .filter(([p]) => placed.has(p as never))
      .flatMap(([p, rp]) => Object.keys(rp.meshes).map((m) => [p, m] as const));
    const want = [...pairs.filter(([p, m]) => !baked(p, m)).map(([p, m]) => `prop-${p}.${m}`), ...new Set(pairs.filter(([p, m]) => baked(p, m)).map(([, m]) => `prop-static.${m}`))].sort();
    expect(r.meshes.map((m) => m.name).sort()).toEqual(want);
    const mesh = (n: string) => r.meshes.find((m) => m.name === `prop-${n}`)!;
    // five racks' steelDark (and the other placed props' steelDark) in one baked mesh
    const byName = new Map(model.meshes.map((g) => [g.name, g]));
    const verts = pairs.filter(([p, m]) => m === 'steelDark' && baked(p, m)).reduce((s, [p]) => s + (byName.get(`${p}.steelDark`)!.positions.length / 3) * props.placements.filter((q) => q.prop === p).length, 0);
    expect(props.placements.filter((q) => q.prop === 'serverRack').length).toBe(5);
    expect(mesh('static.steelDark').getTotalVertices()).toBe(verts);
    expect((mesh('static.steelDark').material!.metadata as { drawFirst?: boolean }).drawFirst).toBe(true);
    expect(mesh('serverRack.mesh').material!.backFaceCulling).toBe(true);
    // lamps: green by default on the racks, red on the tower; a device state repaints one instance
    const lamps = r.colorsOf('prop-serverRack.lamp')!;
    expect(lamps[1]!).toBeGreaterThan(lamps[0]!);
    const red = r.colorsOf('prop-beamTower.lamp')!;
    expect(red[0]!).toBeGreaterThan(red[1]!);
    r.setTint(tower, undefined, [0, 0, 0]);
    expect(r.colorsOf('prop-beamTower.lamp')![0]).toBe(0);
    // the leaf turns about its hinge as the door opens, outward
    const leaf = 'prop-vaultLeaf.iron';
    const at = () => {
      const m = r.matricesOf(leaf)!;
      return [m[0]!, m[2]!];
    };
    expect(at()[0]).toBeCloseTo(1, 6);
    const ds = doors.list.find((d) => d.anchor.id === door.id)!;
    ds.open = 1;
    ds.target = 1;
    r.frame();
    const [c, ms] = at();
    // local +x turned towards the frame's +z (world +z at yaw 0): Babylon's m[2] = -sin(yaw) > 0 for a negative turn
    expect(c!).toBeLessThan(0.5);
    expect(ms!).toBeGreaterThan(0.5);
    r.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('(S3-7 S1) emissive props follow their light circuit and device: dim while no lamp of the group is on, back on a switch, dark while a device is off; the emissive pieces stay thin-instanced and the static opaque ones stay merged', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PropRender } = await import('../src/world/props/propRender');
    const { LightRegistry } = await import('../src/world/lights');
    const reg = new LightRegistry();
    const lamp = reg.add({ x: 0, y: 3, z: 0, group: 70 });
    reg.add({ x: 4, y: 3, z: 0, group: 71 });
    const props = new FacilityProps();
    props.add('serverRack', 0, 0, 0, { group: 70 });
    props.add('serverRack', 2, 0, 0, { group: 71 });
    props.add('serverRack', 4, 0, 0);
    props.add('serverRack', 6, 0, 0, { group: 99 });
    const tower = props.add('beamTower', 9, 3, 0, { device: 'laser-x' });
    props.add('monitorWall', 14, 3, 0, { group: 70 });
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const model = parseGlb(glb(path.join(ASSETS, 'facility-props.glb')));
    const r = PropRender.fromModel(scene, model, props.placements, [], reg);
    const racks = (): Float32Array => r.colorsOf('prop-serverRack.lamp')!;
    const lit = [racks()[1]!, racks()[5]!, racks()[9]!];
    // on at the start: the groups with a lamp on and the ungrouped rack are lit; the group with no lamp at all (99) is dark
    expect(lit.every((v) => v > 0.3)).toBe(true);
    expect(racks()[13]!).toBeCloseTo(lit[0]! * PROP_DARK, 6);
    const full = lit[0]!;
    // cut circuit 70: its rack and the video wall's screens dim, 71 and the ungrouped rack stay lit (a registry change repaints on the frame)
    const wall = (): Float32Array => r.colorsOf('prop-monitorWall.screen')!;
    const wallLit = wall()[0]!;
    expect(wallLit).toBeGreaterThan(0.1);
    reg.setGroup(70, false);
    r.frame();
    expect(racks()[1]!).toBeCloseTo(full * PROP_DARK, 6);
    expect(racks()[5]!).toBeCloseTo(full, 6);
    expect(racks()[9]!).toBeCloseTo(full, 6);
    expect(wall()[0]!).toBeCloseTo(wallLit * PROP_DARK, 6);
    expect(r.colorsOf('prop-monitorWall.lamp')![1]!).toBeLessThan(0.1);
    // back on: lit again; a shot-out lamp is dark too
    reg.setGroup(70, true);
    r.frame();
    expect(racks()[1]!).toBeCloseTo(full, 6);
    reg.destroy(lamp.id);
    r.frame();
    expect(racks()[1]!).toBeCloseTo(full * PROP_DARK, 6);
    // a device: the tower's lens is lit until its device is off
    const red = (): Float32Array => r.colorsOf('prop-beamTower.lamp')!;
    const redLit = red()[0]!;
    expect(redLit).toBeGreaterThan(0.5);
    r.setDevice('laser-x', false);
    expect(red()[0]!).toBeCloseTo(redLit * PROP_DARK, 6);
    r.setDevice('laser-x', true);
    expect(red()[0]!).toBeCloseTo(redLit, 6);
    // an explicit tint still wins its colour (the device state), scaled by the circuit
    r.setTint(tower, undefined, [0, 0, 0]);
    expect(red()[0]!).toBe(0);
    // the emissive meshes are the thin-instanced ones (one per prop and material), the opaque statics stay merged
    const names = r.meshes.map((m) => m.name);
    expect(names).toContain('prop-serverRack.lamp');
    expect(names).toContain('prop-monitorWall.screen');
    expect(names.some((n) => n.startsWith('prop-static.'))).toBe(true);
    expect(names.some((n) => n === 'prop-serverRack.steelDark')).toBe(false);
    r.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('(S3-7 S1) without a registry the groups are ignored (every emissive lit), as before', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PropRender } = await import('../src/world/props/propRender');
    const props = new FacilityProps();
    props.add('serverRack', 0, 0, 0, { group: 70 });
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const r = PropRender.fromModel(scene, parseGlb(glb(path.join(ASSETS, 'facility-props.glb'))), props.placements);
    expect(r.colorsOf('prop-serverRack.lamp')![1]!).toBeGreaterThan(0.3);
    r.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('(P3-1) a status lamp with lampOff: green while its device is on, its off colour lit at full gain (not PROP_DARK) while off, still dimmed by its circuit; a plain device lamp still dims', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PropRender } = await import('../src/world/props/propRender');
    const { LightRegistry } = await import('../src/world/lights');
    const reg = new LightRegistry();
    reg.add({ x: 0, y: 3, z: 0, group: 72 });
    const green = PROP_LAMP_TINT.default;
    const red: [number, number, number] = [1.0, 0.12, 0.08];
    const props = new FacilityProps();
    props.add('pushStation', 0, 0, 0, { y: 1.41, device: 'lamp-a', flag: 'f-a', lamp: green, lampOff: red });
    props.add('pushStation', 2, 0, 0, { y: 1.41, device: 'plain' });
    props.add('pushStation', 4, 0, 0, { y: 1.41, device: 'lamp-b', lamp: green, lampOff: red, group: 72 });
    expect(props.placements[0]!.flag).toBe('f-a');
    expect(props.placements[0]!.lampOff).toEqual(red);
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const r = PropRender.fromModel(scene, parseGlb(glb(path.join(ASSETS, 'facility-props.glb'))), props.placements, [], reg);
    const c = (): Float32Array => r.colorsOf('prop-pushStation.lamp')!;
    const rgb = (n: number): number[] => [c()[n * 4]!, c()[n * 4 + 1]!, c()[n * 4 + 2]!];
    const near = (a: number[], b: readonly number[], k: number): void => a.forEach((v, i) => expect(v).toBeCloseTo(b[i]! * k, 6));
    // at the start every device is on: green at full gain
    near(rgb(0), green, PROP_LAMP_GAIN);
    near(rgb(2), green, PROP_LAMP_GAIN);
    const plainLit = rgb(1);
    // off: the status lamp shows red, lit (not PROP_DARK); the plain device lamp dims as before (bites)
    r.setDevice('lamp-a', false);
    near(rgb(0), red, PROP_LAMP_GAIN);
    expect(rgb(0)[0]!).toBeGreaterThan(green[0]! * PROP_LAMP_GAIN * PROP_DARK * 10);
    r.setDevice('plain', false);
    near(rgb(1), plainLit, PROP_DARK);
    // on again: green
    r.setDevice('lamp-a', true);
    near(rgb(0), green, PROP_LAMP_GAIN);
    // red follows its circuit as the green does: dim while the group is cut
    r.setDevice('lamp-b', false);
    near(rgb(2), red, PROP_LAMP_GAIN);
    reg.setGroup(72, false);
    r.frame();
    near(rgb(2), red, PROP_LAMP_GAIN * PROP_DARK);
    r.dispose();
    scene.dispose();
    engine.dispose();
  });
});

describe('props emissive circuits (S3-7 S1)', () => {
  it('PROP_EMISSIVE_PARTS lists exactly the props whose GLB has a screen or lamp mesh, with the parts it has', () => {
    const model = parseGlb(glb(path.join(ASSETS, 'facility-props.glb')));
    const real: Record<string, string[]> = {};
    for (const g of model.meshes) {
      const dot = g.name.indexOf('.');
      const mat = g.name.slice(dot + 1);
      if (mat === 'screen' || mat === 'lamp') (real[g.name.slice(0, dot)] ??= []).push(mat);
    }
    const listed = Object.fromEntries(Object.entries(PROP_EMISSIVE_PARTS).map(([k, v]) => [k, [...v!].sort()]));
    const want = Object.fromEntries(Object.entries(real).map(([k, v]) => [k, v.sort()]));
    expect(listed).toEqual(want);
    expect(PROP_IDS.length).toBeGreaterThan(Object.keys(listed).length);
    for (const id of PROP_OWN_SUPPLY) expect(PROP_EMISSIVE_PARTS[id]).toBeDefined();
  });

  it('propGlows: a lamp part always glows unless its colour is black; a screen glows unless dark; props with no emissive part never', () => {
    expect(propGlows({ prop: 'serverRack' })).toBe(true);
    expect(propGlows({ prop: 'serverRack', lamp: [0, 0, 0] })).toBe(false);
    expect(propGlows({ prop: 'officeDesk' })).toBe(true);
    expect(propGlows({ prop: 'officeDesk', tint: [0, 0, 0] })).toBe(false);
    expect(propGlows({ prop: 'securityDesk', tint: [0, 0, 0] })).toBe(true);
    expect(propGlows({ prop: 'palletRackBay' })).toBe(false);
  });

  it('add and row carry the group, and add the device; a snapped placement keeps them', () => {
    const p = new FacilityProps();
    const i = p.add('beamTower', 1.01, 2.02, 0.1, { device: 'laser-a5', group: 51 });
    expect(p.placements[i]!.device).toBe('laser-a5');
    expect(p.placements[i]!.group).toBe(51);
    const first = p.row('serverRack', 0, 0, 3, 0, { group: 70 });
    expect(p.placements.slice(first).every((q) => q.group === 70)).toBe(true);
    expect(snapPlacement({ prop: 'signPlate', x: 0, y: 0, z: 0, yaw: 0, group: 34 }).group).toBe(34);
    expect(p.add('bollard', 0, 0, 0)).toBeGreaterThan(i);
    expect(p.placements[p.placements.length - 1]!.group).toBeUndefined();
  });
});
