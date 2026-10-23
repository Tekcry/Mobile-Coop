/**
 * The facility kit (marlow-final M5): placement maths, the gameplay boxes the kit writes, the sliding-door leaf, and
 * the built GLB against the kit's tables (pieces, budgets, module sizes, winding).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Matrix, Quaternion, Vector3 } from '../src/core/babylon';
import { parseGlb } from '../src/operators/lab/glb';
import { canonicalLightShapes } from '../src/voxel/lightShapes';
import { LevelBuilder } from '../src/world/levelBuilder';
import {
  FacilityKit,
  KIT_BOX_COLOR,
  KIT_LOOK,
  KIT_MATERIALS,
  KIT_MODULE,
  KIT_PIECES,
  KIT_TRI_BUDGET,
  LEAF_LIP,
  SLOT_SEGMENT,
  kitMatrix,
  kitToWorld,
  kitTriangles,
  leafPose,
  slideFraction,
  snap,
  snapYaw,
  tileRun,
  type KitInstance,
  type KitMaterial,
} from '../src/world/kit/facilityKit';

const ASSETS = path.resolve(__dirname, '../src/world/kit/assets');
const report = JSON.parse(readFileSync(path.join(ASSETS, 'facility-kit.json'), 'utf8')) as {
  pieces: Record<string, { meshes: Record<string, number>; triangles: number; bounds: { min: number[]; max: number[] } }>;
  materials: string[];
};
const glb = (file: string): ArrayBuffer => {
  const b = readFileSync(file);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) <= eps;

describe('kit maths', () => {
  it('snaps positions to 5 cm and yaws to 90 degrees', () => {
    expect(snap(12.33)).toBeCloseTo(12.35, 9);
    expect(snap(-0.024)).toBeCloseTo(0, 9);
    expect(snapYaw(0.1)).toBe(0);
    expect(snapYaw(Math.PI / 2 - 0.2)).toBeCloseTo(Math.PI / 2, 9);
    expect(snapYaw(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2, 9);
    expect(snapYaw(2 * Math.PI - 0.01)).toBe(0);
  });

  it('tiles a run in whole modules, stretched by at most sqrt 2 once a run is a module long and 1/6 from 3 modules', () => {
    for (let len = 1.2; len < 30; len += 0.037) {
      const r = tileRun(len, 1.2);
      expect(r.n * r.step).toBeCloseTo(len, 9);
      expect(r.scale).toBeGreaterThanOrEqual(1 / Math.SQRT2 - 1e-9);
      expect(r.scale).toBeLessThanOrEqual(Math.SQRT2 + 1e-9);
      if (len >= 3.6) {
        expect(r.scale).toBeGreaterThanOrEqual(6 / 7 - 1e-9);
        expect(r.scale).toBeLessThanOrEqual(7 / 6 + 1e-9);
      }
    }
    expect(tileRun(0.6, 1.2)).toEqual({ n: 1, scale: 0.5, step: 0.6 });
  });

  it('writes the same matrix as Babylon (scale, yaw, position) and as kitToWorld', () => {
    const inst = { x: 3.2, y: 0.5, z: -7.1, yaw: 0.83, sx: 1.3, sy: 0.9, sz: 0.4 };
    const out = new Float32Array(16);
    kitMatrix(inst, out, 0);
    const ref = new Matrix();
    Matrix.ComposeToRef(new Vector3(inst.sx, inst.sy, inst.sz), Quaternion.RotationYawPitchRoll(inst.yaw, 0, 0), new Vector3(inst.x, inst.y, inst.z), ref);
    const r = ref.toArray();
    for (let i = 0; i < 16; i++) expect(out[i]).toBeCloseTo(r[i]!, 5);
    const p = Vector3.TransformCoordinates(new Vector3(0.4, 1.1, -0.25), ref);
    const q = kitToWorld(inst, 0.4, 1.1, -0.25);
    expect(q[0]).toBeCloseTo(p.x, 5);
    expect(q[1]).toBeCloseTo(p.y, 5);
    expect(q[2]).toBeCloseTo(p.z, 5);
  });

  it('slides the leaves smoothly and only while the door state moves', () => {
    expect(slideFraction(0, 0)).toBe(0);
    expect(slideFraction(1, 0)).toBe(1);
    expect(slideFraction(0, 0.12)).toBeGreaterThan(0);
    let last = -1;
    for (let t = 0; t <= 1; t += 0.05) {
      const f = slideFraction(t, 0);
      expect(f).toBeGreaterThanOrEqual(last);
      last = f;
    }
  });
});

describe('kit placement (the gameplay boxes)', () => {
  it('a clad wall is one box as LevelBuilder.wall plus panels whose backs sit on its faces, facing out', () => {
    const ref = new LevelBuilder().wall(0, 0, 0, 6, 3, KIT_BOX_COLOR, 0.3);
    const b = new LevelBuilder();
    const kit = new FacilityKit(b);
    kit.wall(0, 0, 0, 6, 3, { thick: 0.3 });
    expect(b.boxes).toEqual(ref.boxes);
    const panels = kit.instances.filter((i) => i.piece === 'wallPanel');
    expect(panels.length).toBe(2 * Math.round(6 / 1.2));
    for (const p of panels) {
      const back = kitToWorld(p, 0, 0, 0);
      const front = kitToWorld(p, 0, 0, 1);
      expect(Math.abs(back[0])).toBeCloseTo(0.15, 6);
      // local +z points away from the wall's middle
      expect(Math.abs(front[0])).toBeGreaterThan(Math.abs(back[0]));
      // and the run lies along the wall (z 0..6)
      const a = kitToWorld(p, -0.6, 0, 0);
      const c = kitToWorld(p, 0.6, 0, 0);
      expect(near(a[0], c[0], 1e-9)).toBe(true);
      expect(Math.min(a[2], c[2])).toBeGreaterThanOrEqual(-1e-6);
      expect(Math.max(a[2], c[2])).toBeLessThanOrEqual(6 + 1e-6);
    }
    // the runs cover the wall end to end, one row (3 m), skirting on each clad face
    const xs = panels.filter((p) => p.x > 0).map((p) => p.z).sort((u, v) => u - v);
    expect(xs[0]! - 0.6).toBeCloseTo(0, 6);
    expect(xs[xs.length - 1]! + 0.6).toBeCloseTo(6, 6);
    expect(kit.instances.filter((i) => i.piece === 'skirting').length).toBe(2);
    expect(kit.instances.some((i) => i.piece === 'wallUpper')).toBe(false);
  });

  it('a tall wall stacks upper panels to its top', () => {
    const kit = new FacilityKit(new LevelBuilder());
    kit.wall(0, 0, 4.8, 0, 6, { faces: 'right' });
    const up = kit.instances.filter((i) => i.piece === 'wallUpper');
    expect(up.length).toBe(4 * 2);
    const top = Math.max(...up.map((u) => u.y + u.sy * KIT_MODULE.wallUpper.y));
    expect(top).toBeCloseTo(6, 6);
  });

  it('glass and balustrades are collision-only, without ledges and out of the light shapes', () => {
    const b = new LevelBuilder();
    b.floor(0, 0, 20, 20, '#444');
    const before = canonicalLightShapes(b.boxes, b.cylinders, 'kit-test', false).length;
    const kit = new FacilityKit(b);
    kit.glass(-6, 2, 6, 2, 3);
    kit.glass(-6, 4, 6, 4, 3, { frosted: true });
    kit.handrail(-6, 6, 6, 6, { y: 0 });
    const added = b.boxes.slice(1);
    expect(added.length).toBe(3);
    for (const p of added) {
      expect(p.collide).toBe(true);
      expect(p.visible).toBe(false);
      expect(p.noLedge).toBe(true);
    }
    expect(canonicalLightShapes(b.boxes, b.cylinders, 'kit-test', false).length).toBe(before);
    expect(kit.instances.filter((i) => i.piece === 'glassClear').length).toBe(8);
    expect(kit.instances.filter((i) => i.piece === 'glassFrosted').length).toBe(8);
    expect(kit.instances.filter((i) => i.piece === 'handrail').length).toBe(8);
  });

  it('an LED slot that is a light is lamps every <= 2.4 m whose diffuser boxes tile the run', () => {
    const b = new LevelBuilder();
    const kit = new FacilityKit(b);
    kit.ledSlot(0, 3, 5, 7.2, 0.05, { tone: 'cool', light: { radius: 6, intensity: 0.8, group: 3 } });
    const ls = b.lights.lights;
    expect(ls.length).toBe(Math.ceil(7.2 / SLOT_SEGMENT));
    let along = 0;
    for (const l of ls) {
      expect(l.group).toBe(3);
      expect(l.fixture).not.toBeNull();
      expect(l.y).toBeLessThan(3);
      expect(l.z).toBeCloseTo(5, 6);
      expect(Math.abs(l.x)).toBeLessThan(3.6);
      along += l.fixture!.sx;
    }
    expect(along).toBeGreaterThan(7.2 - 0.02);
    expect(along).toBeLessThanOrEqual(7.2);
    const slot = kit.instances.find((i) => i.piece === 'ledSlot')!;
    expect(slot.yaw).toBe(0);
    expect(slot.noLed).toBe(true);
    // an accent slot: no light, its own LED line
    kit.ledSlot(0, 3, 8, 2, Math.PI / 2, { light: false });
    expect(b.lights.lights.length).toBe(ls.length);
    expect(kit.instances[kit.instances.length - 1]!.noLed).toBeFalsy();
  });

  it('a clad column is one box and one cladding instance scaled to it', () => {
    const b = new LevelBuilder();
    const kit = new FacilityKit(b);
    kit.column(4, 4, 0.6, 0.8, 4.5);
    expect(b.boxes).toEqual(new LevelBuilder().box(4, 2.25, 4, 0.6, 4.5, 0.8, KIT_BOX_COLOR).boxes);
    expect(kit.instances[0]).toMatchObject({ piece: 'column', sx: 0.6, sz: 0.8, sy: 1.5 });
  });
});

describe('kit sliding door', () => {
  const build = (yaw: number) => {
    const b = new LevelBuilder();
    const kit = new FacilityKit(b);
    const door = kit.slidingDoor(10, -4, 2, yaw, { wallThick: 0.3, wallH: 3, locked: true });
    return { b, kit, door };
  };

  it('is the existing hinged Door, flagged to draw sliding leaves, centred on the opening', () => {
    for (const yaw of [0, Math.PI / 2]) {
      const { b, door, kit } = build(yaw);
      expect(door.kind).toBe('door');
      expect(door.leaf).toBe('slide');
      expect(door.locked).toBe(true);
      expect(b.anchors.doors).toEqual([door]);
      // Doors puts the doorway centre at hinge + (sin, cos) x width / 2
      expect(door.hinge.x + Math.sin(yaw)).toBeCloseTo(10, 9);
      expect(door.hinge.z + Math.cos(yaw)).toBeCloseTo(-4, 9);
      // the lintel over the 2.1 m opening up to the 3 m wall
      expect(b.boxes.length).toBe(1);
      expect(b.boxes[0]!.c[1]).toBeCloseTo(2.55, 9);
      expect(b.boxes[0]!.s[1]).toBeCloseTo(0.9, 9);
      expect(kit.doors[0]!.door).toBe(door.id);
    }
  });

  it('shut, the leaves meet at the middle; open, each is in its pocket with a lip showing', () => {
    for (const yaw of [0, Math.PI / 2, 0.4]) {
      const { kit } = build(yaw);
      const d = kit.doors[0]!;
      const leaves = kit.instances.filter((i): i is KitInstance & { side: -1 | 1 } => i.piece === 'doorLeaf' && i.side !== undefined);
      expect(leaves.length).toBe(2);
      for (const l of leaves) {
        const half = (l.sx * KIT_MODULE.doorLeaf.x) / 2;
        for (const f of [0, 1]) {
          const [x, z] = leafPose(d, l.side, f);
          const inst = { ...l, x, z };
          const inner = kitToWorld(inst, -l.side * (KIT_MODULE.doorLeaf.x / 2), 0, 0);
          const dist = Math.sqrt((inner[0] - d.x) ** 2 + (inner[2] - d.z) ** 2);
          if (f === 0) expect(dist).toBeLessThan(1e-6);
          else expect(dist).toBeCloseTo(d.width / 2 - LEAF_LIP, 6);
          // the leaf stays in the wall's middle plane (inside a 0.3 m wall)
          const across = (x - d.x) * Math.sin(d.yaw) + (z - d.z) * Math.cos(d.yaw);
          expect(Math.abs(across)).toBeLessThan(1e-6);
        }
        expect(half).toBeCloseTo(d.width / 4, 9);
      }
    }
  });

  it('frames both faces and lines the opening; only the frames carry the door for the status bar', () => {
    const { kit, door } = build(0);
    const frames = kit.instances.filter((i) => i.piece === 'doorFrame');
    expect(frames.length).toBe(2);
    expect(frames.every((f) => f.door === door.id)).toBe(true);
    // the frames face away from each other, each on its face of the 0.3 m wall
    const n0 = kitToWorld(frames[0]!, 0, 0, 1);
    const n1 = kitToWorld(frames[1]!, 0, 0, 1);
    expect(Math.sign(n0[0] - frames[0]!.x)).toBe(-Math.sign(n1[0] - frames[1]!.x));
    expect(Math.abs(frames[0]!.x - 10)).toBeCloseTo(0.15, 9);
    expect(kit.instances.filter((i) => i.piece === 'doorJamb')[0]!.sz).toBeCloseTo(0.3, 9);
  });

  it('a plain door keeps its anchor unchanged, and the hinged leaf of a sliding door is not drawn', async () => {
    const b = new LevelBuilder();
    const plain = b.door(0, 0, 0, 1.2, 0);
    expect('leaf' in plain).toBe(false);
    const kit = new FacilityKit(b);
    kit.slidingDoor(5, 0, 2, 0);
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { Doors } = await import('../src/world/doors');
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const doors = new Doors(scene, b.anchors);
    const buf = doors.leafMesh!.thinInstanceGetWorldMatrices();
    expect(buf.length).toBe(2);
    expect(buf[0]!.determinant()).not.toBe(0);
    expect(buf[1]!.toArray().every((v) => v === 0)).toBe(true);
    scene.dispose();
    engine.dispose();
  });
});

describe('kit build (facility-kit.glb and its report)', () => {
  it('has every piece within its triangle budget and module size, and only the kit materials', () => {
    expect(Object.keys(report.pieces).sort()).toEqual([...KIT_PIECES].sort());
    for (const p of KIT_PIECES) {
      const r = report.pieces[p]!;
      expect(r.triangles, p).toBeLessThanOrEqual(KIT_TRI_BUDGET[p]);
      for (const m of Object.keys(r.meshes)) expect(KIT_MATERIALS as readonly string[]).toContain(m);
      const m = KIT_MODULE[p];
      const wx = r.bounds.max[0]! - r.bounds.min[0]!;
      const hy = r.bounds.max[1]! - r.bounds.min[1]!;
      // the column and the frame carry collars / architraves past their nominal module
      expect(Math.abs(wx - m.x), `${p} width`).toBeLessThanOrEqual(p === 'column' || p === 'doorFrame' ? 0.25 : 0.015);
      expect(Math.abs(hy - m.y), `${p} height`).toBeLessThanOrEqual(0.03);
    }
    // wall-mounted skins: never behind the face, never more than 6 cm proud of it
    for (const p of ['wallPanel', 'wallUpper', 'skirting', 'doorFrame'] as const) {
      expect(report.pieces[p]!.bounds.min[2]).toBeGreaterThanOrEqual(0);
      expect(report.pieces[p]!.bounds.max[2]).toBeLessThanOrEqual(0.095);
    }
    expect(report.pieces.wallPanel!.bounds.max[2]).toBeLessThanOrEqual(0.06);
  });

  it('reads with the game GLB reader: one mesh per (piece, material), the same winding as the weapon meshes', () => {
    const model = parseGlb(glb(path.join(ASSETS, 'facility-kit.glb')));
    const names = model.meshes.map((m) => m.name).sort();
    const want = Object.entries(report.pieces).flatMap(([p, r]) => Object.keys(r.meshes).map((m) => `${p}.${m}`)).sort();
    expect(names).toEqual(want);
    // winding vs stored normal, in the reader's game frame: the share of triangles whose (b - a) x (c - a) points with
    // the normal. A front face in this frame winds one way for every asset the game draws: compare to the rifle.
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
    const kitShare = share(model.meshes);
    const rifle = share(parseGlb(glb(path.resolve(__dirname, '../src/weapons/assets/rifle.glb'))).meshes);
    expect(Math.abs(rifle - 0.5)).toBeGreaterThan(0.45);
    expect(kitShare).toBeCloseTo(rifle > 0.5 ? 1 : 0, 2);
  });

  it('draws the static opaque pieces baked per material, the rest one thin-instanced mesh per (piece, material); the leaves follow the door, the bar its lock', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { Doors } = await import('../src/world/doors');
    const { KitRender } = await import('../src/world/kit/kitRender');
    const b = new LevelBuilder();
    const kit = new FacilityKit(b);
    kit.wall(-6, 0, -1, 0, 3);
    kit.wall(1, 0, 6, 0, 3);
    const door = kit.slidingDoor(0, 0, 2, Math.PI / 2, { locked: true });
    kit.ledSlot(0, 3, 2, 4.8, 0, { light: { group: 1 } });
    kit.skirting(0, 4, 3, Math.PI, { group: 1 });
    kit.glass(-6, 6, -2, 6, 3);
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const doors = new Doors(scene, b.anchors);
    const casters: unknown[] = [];
    const model = parseGlb(glb(path.join(ASSETS, 'facility-kit.glb')));
    const r = KitRender.fromModel(scene, model, kit.layout, doors.list, b.lights, (m) => casters.push(m));
    const names = r.meshes.map((m) => m.name).sort();
    const placed = new Set(kit.instances.map((i) => i.piece));
    // (S9 perf) static (not the leaves), opaque, one colour: baked into `kit-static.<material>`
    const baked = (p: string, m: string): boolean => p !== 'doorLeaf' && !KIT_LOOK[m as KitMaterial].emissive && KIT_LOOK[m as KitMaterial].alpha === undefined;
    const pairs = Object.entries(report.pieces)
      .filter(([p]) => placed.has(p as never))
      .flatMap(([p, rp]) => Object.keys(rp.meshes).filter((m) => !(p === 'ledSlot' && m === 'led')).map((m) => [p, m] as const));
    const want = [...pairs.filter(([p, m]) => !baked(p, m)).map(([p, m]) => `kit-${p}.${m}`), ...new Set(pairs.filter(([p, m]) => baked(p, m)).map(([, m]) => `kit-static.${m}`))].sort();
    expect(names).toEqual(want);
    const mesh = (n: string) => r.meshes.find((m) => m.name === `kit-${n}`)!;
    // the baked composite holds every placed static composite piece's vertices once per instance
    const byName = new Map(model.meshes.map((g) => [g.name, g]));
    const verts = pairs.filter(([p, m]) => m === 'composite' && baked(p, m)).reduce((s, [p]) => s + (byName.get(`${p}.composite`)!.positions.length / 3) * kit.instances.filter((i) => i.piece === p).length, 0);
    expect(mesh('static.composite').getTotalVertices()).toBe(verts);
    expect(mesh('static.composite').thinInstanceCount).toBe(0);
    expect(casters).toEqual([mesh('doorLeaf.composite')]);
    // the opaque skins draw ahead of the level boxes (their material is marked; the scene's opaque queue sorts them first)
    expect((mesh('static.composite').material!.metadata as { drawFirst?: boolean }).drawFirst).toBe(true);
    expect(mesh('glassClear.glass').material!.backFaceCulling).toBe(true);
    // the status bar is red while locked; green once unlocked (next frame)
    const status = mesh('doorFrame.status');
    const col = () => r.colorsOf(status.name)!;
    expect(col()[0]!).toBeGreaterThan(col()[1]!);
    const ds = doors.list[0]!;
    ds.anchor.locked = false;
    r.frame();
    expect(col()[1]!).toBeGreaterThan(col()[0]!);
    // the leaves slide by the door's open state
    const leaf = mesh('doorLeaf.composite');
    const xz = () => { const m = r.matricesOf(leaf.name)!; return [0, 1].map((i) => [m[i * 16 + 12]!, m[i * 16 + 14]!]); };
    const shut = xz();
    ds.open = 1;
    r.frame();
    const open = xz();
    for (let i = 0; i < 2; i++) {
      const d0 = Math.abs(shut[i]![0]!);
      const d1 = Math.abs(open[i]![0]!);
      expect(d0).toBeCloseTo(0.5, 5);
      expect(d1).toBeCloseTo(0.5 + 1 - LEAF_LIP, 5);
    }
    expect(door.leaf).toBe('slide');
    // the accent skirting on circuit 1 goes dark when the circuit's lamps are off
    const sk = mesh('skirting.led');
    // (the walls' own skirting comes first and stays lit; the grouped run is the last instance)
    const skc = () => { const c = r.colorsOf(sk.name)!; return c[c.length - 4]!; };
    expect(r.colorsOf(sk.name)![0]).toBeCloseTo(skc(), 6);
    const lit = skc();
    b.lights.setGroup(1, false);
    r.frame();
    expect(skc()).toBeLessThan(lit * 0.1);
    expect(r.colorsOf(sk.name)![0]).toBeCloseTo(lit, 6);
    r.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('(S9 perf) bakes instances as the instanced shader places them; the skins sort ahead of the opaque queue', async () => {
    const { bakeParts, skinsFirst } = await import('../src/world/kit/staticMerge');
    const g = parseGlb(glb(path.join(ASSETS, 'facility-kit.glb'))).meshes.find((m) => m.name === 'column.metal')!;
    const inst = [
      { x: 3, y: 0.5, z: -2, yaw: 0.7, sx: 1.3, sy: 0.8, sz: 1.1 },
      { x: -10, y: 0, z: 40, yaw: Math.PI / 2, sx: 1, sy: 1, sz: 1 },
    ];
    const matrices = new Float32Array(32);
    inst.forEach((p, n) => kitMatrix(p, matrices, n * 16));
    const b = bakeParts([{ geo: g, matrices, count: 2 }, { geo: g, matrices: matrices.subarray(16), count: 1 }]);
    const gv = g.positions.length / 3;
    expect(b.positions.length).toBe(gv * 3 * 3);
    expect(b.indices.length).toBe(g.indices.length * 3);
    expect(Math.max(...b.indices)).toBe(gv * 3 - 1);
    for (const [n, base] of [[0, 0], [1, gv], [1, 2 * gv]] as const) {
      const m = Matrix.FromArray(matrices, n * 16);
      for (const i of [0, 7, gv - 1]) {
        const p = Vector3.TransformCoordinates(Vector3.FromArray(g.positions, i * 3), m);
        const q = Vector3.TransformNormal(Vector3.FromArray(g.normals, i * 3), m).normalize();
        for (let a = 0; a < 3; a++) {
          expect(b.positions[(base + i) * 3 + a]).toBeCloseTo(p.asArray()[a]!, 4);
          expect(b.normals[(base + i) * 3 + a]).toBeCloseTo(q.asArray()[a]!, 5);
        }
      }
      expect(b.indices[(base / gv) * g.indices.length]).toBe(g.indices[0]! + base);
    }
    const sub = (id: number, first: boolean) => ({ getMesh: () => ({ uniqueId: id, material: { uniqueId: id, metadata: first ? { drawFirst: true } : null } }) }) as never;
    const order = [sub(1, false), sub(9, true), sub(3, false), sub(5, true)].sort(skinsFirst).map((s) => (s as { getMesh(): { uniqueId: number } }).getMesh().uniqueId);
    expect(order).toEqual([5, 9, 1, 3]);
  });

  it('counts a layout\'s triangles from the report (an area budget check)', () => {
    const kit = new FacilityKit(new LevelBuilder());
    kit.wall(0, 0, 0, 6, 3);
    kit.ledSlot(0, 3, 2, 4, 0);
    const n = kitTriangles(kit.layout, report);
    const panel = report.pieces.wallPanel!.triangles;
    const skirt = report.pieces.skirting!.triangles;
    const slot = report.pieces.ledSlot!.triangles - (report.pieces.ledSlot!.meshes.led ?? 0);
    expect(n).toBe(10 * panel + 2 * skirt + slot);
  });
});
