import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bindWorld, parseGlb, qmul, type GlbModel, type Quat, type V3 } from '../src/operators/lab/glb';
import { operatorNodes } from './helpers/operatorFixture';
import { buildRetarget, poseSkeleton, type RigJoint } from './helpers/retargetReference';
import { GOGGLE_GLOW, GoggleState, goggleRange, partitionGoggle } from '../src/operators/runtime/goggle';
import { bandLod, CloseCameras, pickLod } from '../src/operators/runtime/lodPick';
import {
  availableMask, LOD_0, LOD_1, LOD_2, LOD_HERO, manifestFromUrls, playLodUrls, sameOrigin, validateManifest, validateModel,
} from '../src/operators/runtime/manifest';
import { OperatorPoser, poserSetup, RIG_JOINTS, RIG_PARENT, TRS } from '../src/operators/runtime/pose';

/** Rig local transforms (RIG_JOINTS order, TRS) at rest: rig offsets, identity rotations. */
function rigRest(): Float64Array {
  const off: Record<string, V3> = {
    root: [0, 0, 0], body: [0, 0.56, 0], pelvis: [0, 0.34, 0], spine: [0, 0.1, 0], chest: [0, 0.13, 0], neck: [0, 0.3, 0],
    head: [0, 0.15, 0.01], shL: [-0.19, 0.2, -0.01], elL: [0, -0.29, 0], wrL: [0, -0.25, 0], shR: [0.19, 0.2, -0.01],
    elR: [0, -0.29, 0], wrR: [0, -0.25, 0], hipL: [-0.09, -0.03, 0], knL: [0, -0.43, 0], anL: [0, -0.42, 0],
    hipR: [0.09, -0.03, 0], knR: [0, -0.43, 0], anR: [0, -0.42, 0], toeL: [0, -0.07, 0.12], toeR: [0, -0.07, 0.12],
    clavL: [-0.03, 0.265, 0.04], clavR: [0.03, 0.265, 0.04],
  };
  const out = new Float64Array(RIG_JOINTS.length * TRS);
  RIG_JOINTS.forEach((n, j) => { out.set(off[n]!, j * TRS); out[j * TRS + 6] = 1; });
  return out;
}

function setRot(rig: Float64Array, name: string, q: Quat): void {
  const j = RIG_JOINTS.indexOf(name as (typeof RIG_JOINTS)[number]);
  const n = Math.hypot(...q);
  rig.set(q.map((v) => v / n), j * TRS + 3);
}

/** The rig's world (root-space) rotations, for the reference retarget (tests/helpers/retargetReference.ts). */
function rigWorld(rig: Float64Array): Map<string, Quat> {
  const out = new Map<string, Quat>();
  const rot: Quat[] = [];
  RIG_JOINTS.forEach((n, j) => {
    const l: Quat = [rig[j * TRS + 3]!, rig[j * TRS + 4]!, rig[j * TRS + 5]!, rig[j * TRS + 6]!];
    rot[j] = j === 0 ? [0, 0, 0, 1] : qmul(rot[RIG_PARENT[j]!]!, l);
    out.set(n, rot[j]!);
  });
  return out;
}

describe('operator runtime: manifest', () => {
  const files = {
    '/assets/operators/wren/wren-hero.glb': '/assets/wren-hero-abc.glb',
    '/assets/operators/wren/wren-lod0.glb': '/assets/wren-lod0-abc.glb',
    '/assets/operators/wren/wren-lod1.glb': '/assets/wren-lod1-abc.glb',
    '/assets/operators/wren/wren-lod2.glb': '/assets/wren-lod2-abc.glb',
    '/assets/operators/moth/moth-lod0.glb': '/assets/moth-lod0.glb',
  };
  it('matches files by name, per operator', () => {
    const m = manifestFromUrls('wren', files);
    expect(m.urls).toEqual(['/assets/wren-hero-abc.glb', '/assets/wren-lod0-abc.glb', '/assets/wren-lod1-abc.glb', '/assets/wren-lod2-abc.glb']);
    expect(availableMask(m)).toBe(0b1111);
    expect(validateManifest(m, 'https://x.github.io')).toEqual([]);
  });
  // (11e fix r1, A109) the files warmed into the offline cache: the play LODs, LOD2 first, never the hero
  it('lists the play LODs for the offline cache (gfx=min: LOD2 only)', () => {
    const m = manifestFromUrls('wren', files);
    expect(playLodUrls(m, false)).toEqual(['/assets/wren-lod2-abc.glb', '/assets/wren-lod0-abc.glb', '/assets/wren-lod1-abc.glb']);
    expect(playLodUrls(m, true)).toEqual(['/assets/wren-lod2-abc.glb']);
    expect(playLodUrls(manifestFromUrls('moth', files), false)).toEqual(['/assets/moth-lod0.glb']);
  });
  it('needs every game LOD; hero is optional', () => {
    const m = manifestFromUrls('moth', files);
    expect(validateManifest(m)).toEqual(['moth: lod1 missing', 'moth: lod2 missing']);
    const noHero = manifestFromUrls('wren', { ...files, '/assets/operators/wren/wren-hero.glb': '' });
    expect(validateManifest(noHero)).toEqual([]);
    expect(availableMask(noHero)).toBe(0b1110);
  });
  it('refuses anything that would leave the origin (no runtime network)', () => {
    expect(sameOrigin('/assets/a.glb')).toBe(true);
    expect(sameOrigin('assets/a.glb')).toBe(true);
    expect(sameOrigin('blob:https://x/1')).toBe(true);
    expect(sameOrigin('https://cdn.babylonjs.com/a.glb', 'https://x.github.io')).toBe(false);
    expect(sameOrigin('//cdn.example/a.glb', 'https://x.github.io')).toBe(false);
    expect(sameOrigin('https://x.github.io/ns/a.glb', 'https://x.github.io')).toBe(true);
    const m = manifestFromUrls('wren', { ...files, '/x/wren-lod2.glb': 'https://cdn.example/wren-lod2.glb' });
    expect(validateManifest(m, 'https://x.github.io')).toEqual(['wren: lod2 leaves the origin (https://cdn.example/wren-lod2.glb)']);
  });
  it('validates a parsed file: joints, identity container, 4 influences, the lens material', () => {
    const { nodes, joints } = operatorNodes();
    const mesh = { name: 'm', material: 0, positions: new Float32Array(3), normals: new Float32Array(3), uvs: new Float32Array(2), joints: new Uint16Array(4), weights: new Float32Array(4), indices: new Uint32Array(0) };
    const mat = (name: string) => ({ name, base: [0, 0, 0] as V3, roughness: 1, metallic: 0, emissive: [0, 0, 0] as V3 });
    const good: GlbModel = { nodes, joints, materials: [mat('wren-lod0-cloth'), mat('wren-lod0-glow')], meshes: [mesh] };
    expect(validateModel(good)).toEqual([]);
    const moved = { ...good, nodes: nodes.map((n, i) => (i === 0 ? { ...n, t: [0, 1, 0] as V3 } : n)) };
    expect(validateModel(moved)[0]).toContain('non-joint ancestor rig');
    const noHead = { ...good, joints: joints.filter((j) => nodes[j]!.name !== 'head') };
    expect(validateModel(noHead)).toContain('model: joint head missing');
    expect(validateModel({ ...good, materials: [mat('cloth')] })).toContain('model: no -glow material (goggle lens)');
    expect(validateModel({ ...good, meshes: [{ ...mesh, joints: new Uint16Array(2) }] })[0]).toContain('not 4-influence');
  });
});

describe('operator runtime: LOD picker', () => {
  it('bands at 8 and 25 m with 10 % hysteresis', () => {
    expect(bandLod(LOD_0, 2)).toBe(LOD_0);
    expect(bandLod(LOD_0, 8.5)).toBe(LOD_0); // inside the hysteresis
    expect(bandLod(LOD_0, 8.9)).toBe(LOD_1);
    expect(bandLod(LOD_1, 7.5)).toBe(LOD_1);
    expect(bandLod(LOD_1, 7.1)).toBe(LOD_0);
    expect(bandLod(LOD_1, 27)).toBe(LOD_1);
    expect(bandLod(LOD_1, 28)).toBe(LOD_2);
    expect(bandLod(LOD_2, 23)).toBe(LOD_2);
    expect(bandLod(LOD_2, 22)).toBe(LOD_1);
    expect(bandLod(LOD_0, 60)).toBe(LOD_2);
    expect(bandLod(LOD_2, 1)).toBe(LOD_0);
    expect(bandLod(LOD_HERO, 30)).toBe(LOD_2); // from hero (a close-up camera ended): straight to the band
  });
  it('hero only for a close-up camera, and only when loaded', () => {
    expect(pickLod(LOD_0, 1, true, 0b1111)).toBe(LOD_HERO);
    expect(pickLod(LOD_0, 1, false, 0b1111)).toBe(LOD_0); // gameplay never shows hero, however close
    expect(pickLod(LOD_0, 40, true, 0b1110)).toBe(LOD_0); // hero not loaded: LOD0 stands in
  });
  it('falls back to the nearest loaded level, preferring detail', () => {
    expect(pickLod(LOD_0, 2, false, 1 << LOD_2)).toBe(LOD_2);
    expect(pickLod(LOD_1, 15, false, (1 << LOD_0) | (1 << LOD_2))).toBe(LOD_0);
    expect(pickLod(LOD_0, 2, false, 1 << LOD_HERO)).toBe(LOD_HERO);
    expect(pickLod(-1, 2, false, 0)).toBe(-1);
  });
  it('registers close-up cameras by id', () => {
    const c = new CloseCameras();
    c.add(7);
    expect(c.has(7)).toBe(true);
    c.remove(7);
    expect(c.has(7)).toBe(false);
    expect(c.size).toBe(0);
  });
});

describe('operator runtime: goggle (G73)', () => {
  it('stowed and dim with vision off, in use and full with any mode on; changes reported once', () => {
    const g = new GoggleState();
    expect(g.pose).toBe('stowed');
    expect(g.glow).toBe(GOGGLE_GLOW.dim);
    expect(g.update('off', 1 / 60)).toBe(false);
    expect(g.update('thermal', 1 / 60)).toBe(true);
    expect(g.pose).toBe('inUse');
    expect(g.update('thermal', 1 / 60)).toBe(false);
    for (let i = 0; i < 30; i++) g.update('night', 1 / 60);
    expect(g.glow).toBe(GOGGLE_GLOW.full);
    g.update('off', 1 / 60);
    expect(g.pose).toBe('stowed');
    expect(g.glow).toBeLessThan(GOGGLE_GLOW.full);
    expect(g.glow).toBeGreaterThan(GOGGLE_GLOW.dim);
    g.reset();
    expect(g.glow).toBe(GOGGLE_GLOW.dim);
  });
  it('orders triangles [stowed][body][in use] so each pose is one index range', () => {
    // 4 triangles: body, in use, stowed, body
    const idx = new Uint32Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const cls = new Uint8Array([0, 0, 0, 1, 1, 1, 2, 2, 2, 0, 0, 0]);
    const p = partitionGoggle(idx, cls);
    expect([...p.indices]).toEqual([6, 7, 8, 0, 1, 2, 9, 10, 11, 3, 4, 5]);
    expect([p.stowed, p.body, p.inUse, p.mixed]).toEqual([3, 6, 3, 0]);
    const r: [number, number] = [0, 0];
    expect(goggleRange(p, 'stowed', r)).toEqual([0, 9]);
    expect(goggleRange(p, 'inUse', r)).toEqual([3, 9]);
  });
  it('without the attribute (step 11 assets) both poses draw everything; mixed triangles count as body', () => {
    const idx = new Uint32Array([0, 1, 2]);
    const p = partitionGoggle(idx);
    expect(goggleRange(p, 'stowed', [0, 0])).toEqual([0, 3]);
    expect(goggleRange(p, 'inUse', [0, 0])).toEqual([0, 3]);
    const m = partitionGoggle(idx, new Uint8Array([0, 1, 1]));
    expect([m.body, m.mixed]).toEqual([3, 1]);
  });
});

describe('operator runtime: poser (rig -> operator skeleton)', () => {
  const { nodes, joints } = operatorNodes();
  const setup = poserSetup(nodes, joints);
  const slot = (n: string): number => setup.names.indexOf(n);
  const bw = bindWorld(nodes);

  it('orders joints parents first, maps drivers and the A-pose hang', () => {
    for (let s = 0; s < setup.node.length; s++) if (setup.parent[s]! >= 0) expect(setup.parent[s]!).toBeLessThan(s);
    expect(setup.parent[slot('root')]).toBe(-1); // its parent is the container, not a joint
    expect(setup.driver[slot('fingerL_1_1')]).toBe(RIG_JOINTS.indexOf('wrL'));
    // (anim-rig) the toe joint has its own rig joint now (was its ankle's)
    expect(setup.driver[slot('toeL')]).toBe(RIG_JOINTS.indexOf('toeL'));
    expect(setup.self[slot('pelvis')]).toBe(1);
    expect(setup.self[slot('handL')]).toBe(0);
    expect(setup.self[slot('root')]).toBe(0);
    // the hang turns the bind upper arm onto -Y, and (feature/weapons) the forearm chain by the forearm's own
    // direction: the bent bind elbow straightened as the rig's rest arm, so the wrists land on the rig's
    const sh = slot('shL');
    const h = setup.hang.subarray(sh * 4, sh * 4 + 4);
    expect(Math.abs(h[3]!)).toBeLessThan(0.99);
    const el = slot('elL');
    const wr = slot('wrL');
    const hf = setup.hang.subarray(el * 4, el * 4 + 4);
    expect([...setup.hang.subarray(slot('fingerL_1_1') * 4, slot('fingerL_1_1') * 4 + 4)]).toEqual([...hf]);
    expect([...setup.hang.subarray(wr * 4, wr * 4 + 4)]).toEqual([...hf]);
    const fore: V3 = [0, 1, 2].map((k) => setup.bindPos[wr * 3 + k]! - setup.bindPos[el * 3 + k]!) as V3;
    const down = rotateV([hf[0]!, hf[1]!, hf[2]!, hf[3]!], fore);
    const len = Math.hypot(...fore);
    expect(down[1] / len).toBeLessThan(-0.9999);
    expect([...setup.hang.subarray(slot('hipL') * 4, slot('hipL') * 4 + 4)]).toEqual([0, 0, 0, 1]);
  });

  it('bind local transforms rebuild the bind world pose', () => {
    // forward kinematics over bindLocal reproduces bindPos
    const pos: V3[] = [];
    const rot: Quat[] = [];
    for (let s = 0; s < setup.node.length; s++) {
      const o = s * TRS;
      const t: V3 = [setup.bindLocal[o]!, setup.bindLocal[o + 1]!, setup.bindLocal[o + 2]!];
      const r: Quat = [setup.bindLocal[o + 3]!, setup.bindLocal[o + 4]!, setup.bindLocal[o + 5]!, setup.bindLocal[o + 6]!];
      const p = setup.parent[s]!;
      if (p < 0) { pos[s] = t; rot[s] = r; continue; }
      const q = rot[p]!;
      const v = rotateV(q, t);
      pos[s] = [pos[p]![0] + v[0], pos[p]![1] + v[1], pos[p]![2] + v[2]];
      rot[s] = qmul(q, r);
    }
    for (let s = 0; s < setup.node.length; s++) {
      for (let k = 0; k < 3; k++) expect(pos[s]![k]).toBeCloseTo(setup.bindPos[s * 3 + k]!, 9);
    }
  });

  it('matches the reference retarget for a posed rig and a pelvis drop', () => {
    const rig = rigRest();
    const poser = new OperatorPoser(setup);
    poser.setRest(rig);
    setRot(rig, 'spine', [0.1, 0.05, 0, 1]);
    setRot(rig, 'chest', [0.05, -0.2, 0.03, 1]);
    setRot(rig, 'shL', [0.3, 0, -0.2, 1]);
    setRot(rig, 'elL', [-0.5, 0, 0, 1]);
    setRot(rig, 'wrL', [0, 0.3, 0.1, 1]);
    setRot(rig, 'hipR', [-0.4, 0.1, 0, 1]);
    setRot(rig, 'knR', [0.6, 0, 0, 1]);
    setRot(rig, 'head', [0, 0.25, 0, 1]);
    const pj = RIG_JOINTS.indexOf('pelvis');
    rig[pj * TRS + 1] = rig[pj * TRS + 1]! - 0.12;
    rig[pj * TRS + 2] = rig[pj * TRS + 2]! + 0.03;
    poser.solve(rig);

    const world = rigWorld(rig);
    const rt = buildRetarget(nodes, bw.pos, joints);
    const lookup = (n: string): RigJoint | null => {
      const r = world.get(n);
      if (!r) return null;
      return { rot: r, move: n === 'pelvis' ? [0, -0.12, 0.03] : [0, 0, 0] };
    };
    const outPos: V3[] = [];
    const outRot: Quat[] = [];
    poseSkeleton(nodes, bw.pos, bw.rot, rt, lookup, outPos, outRot);
    const p: [number, number, number] = [0, 0, 0];
    for (let s = 0; s < setup.node.length; s++) {
      const i = setup.node[s]!;
      poser.worldPos(s, p);
      for (let k = 0; k < 3; k++) expect(p[k]).toBeCloseTo(outPos[i]![k]!, 9);
    }
  });

  it('a body tumble is not counted twice at the pelvis; the rest pose keeps the legs and trunk at bind', () => {
    const rig = rigRest();
    const poser = new OperatorPoser(setup);
    poser.setRest(rig);
    poser.solve(rig);
    const p: [number, number, number] = [0, 0, 0];
    for (const n of ['pelvis', 'chest', 'head', 'anL', 'toeL']) {
      poser.worldPos(slot(n), p);
      for (let k = 0; k < 3; k++) expect(p[k]).toBeCloseTo(setup.bindPos[slot(n) * 3 + k]!, 9);
    }
    // arms hang: the left wrist ends straight below the shoulder
    const sh: [number, number, number] = [0, 0, 0];
    poser.worldPos(slot('shL'), sh);
    poser.worldPos(slot('elL'), p);
    expect(p[0]).toBeCloseTo(sh[0], 9);
    expect(p[1]).toBeLessThan(sh[1]);
    // tumble the body 90 degrees about X: the pelvis swings with it by FK only
    setRot(rig, 'body', [Math.SQRT1_2, 0, 0, Math.SQRT1_2]);
    poser.solve(rig);
    const b: [number, number, number] = [0, 0, 0];
    poser.worldPos(slot('body'), b);
    poser.worldPos(slot('pelvis'), p);
    expect(p[0] - b[0]).toBeCloseTo(0, 9);
    expect(p[1] - b[1]).toBeCloseTo(0, 9);
    expect(p[2] - b[2]).toBeCloseTo(0.33, 9);
  });

  it('writes local transforms whose forward kinematics equal its world solution', () => {
    const rig = rigRest();
    const poser = new OperatorPoser(setup);
    setRot(rig, 'chest', [0.2, 0.1, 0, 1]);
    setRot(rig, 'elR', [-0.7, 0, 0, 1]);
    const out = poser.solve(rig);
    const pos: V3[] = [];
    const rot: Quat[] = [];
    const w: [number, number, number] = [0, 0, 0];
    for (let s = 0; s < setup.node.length; s++) {
      const o = s * TRS;
      const t: V3 = [out[o]!, out[o + 1]!, out[o + 2]!];
      const r: Quat = [out[o + 3]!, out[o + 4]!, out[o + 5]!, out[o + 6]!];
      const p = setup.parent[s]!;
      if (p < 0) { pos[s] = t; rot[s] = r; } else {
        const v = rotateV(rot[p]!, t);
        pos[s] = [pos[p]![0] + v[0], pos[p]![1] + v[1], pos[p]![2] + v[2]];
        rot[s] = qmul(rot[p]!, r);
      }
      poser.worldPos(s, w);
      for (let k = 0; k < 3; k++) expect(pos[s]![k]).toBeCloseTo(w[k]!, 9);
    }
  });

  it('allocates no new output buffer per frame', () => {
    const rig = rigRest();
    const poser = new OperatorPoser(setup);
    const a = poser.solve(rig);
    const b = poser.solve(rig);
    expect(a).toBe(b);
  });
});

function rotateV(q: Quat, v: V3): V3 {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}

describe('operator runtime: the built Wren files (skipped where build/ is absent, e.g. CI)', () => {
  const dir = 'build/operators/wren/export';
  const files = ['hero', 'lod0', 'lod1', 'lod2'].map((l) => `${dir}/${l}/wren-${l}.glb`);
  it.skipIf(!files.every((f) => existsSync(f)))('every LOD validates, poses at rest to its bind legs and trunk, and has no _GOGGLE yet', () => {
    for (const f of files) {
      const buf = readFileSync(f);
      const model = parseGlb(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
      expect(validateModel(model, f)).toEqual([]);
      const setup = poserSetup(model.nodes, model.joints);
      const poser = new OperatorPoser(setup);
      const rig = new Float64Array(RIG_JOINTS.length * TRS);
      for (let j = 0; j < RIG_JOINTS.length; j++) rig[j * TRS + 6] = 1;
      poser.solve(rig);
      const p: [number, number, number] = [0, 0, 0];
      for (const n of ['pelvis', 'head', 'anL', 'anR']) {
        const s = setup.names.indexOf(n);
        poser.worldPos(s, p);
        for (let k = 0; k < 3; k++) expect(p[k]).toBeCloseTo(setup.bindPos[s * 3 + k]!, 6);
      }
      // the step 11 assets carry only the in-use goggle (the stowed set is an asset follow-up, DESIGN.md)
      expect(model.meshes.every((m) => m.goggle === undefined)).toBe(true);
    }
  }, 120_000);
});
