// (anim-skeleton S2, docs/archive/anim-skeleton/PLAN.md) The runtime rig drives the skin's new joints: the finger drive (pure),
// the poser's extra rotations (fingers chained, the goggle offset), the clavicle on the rig and through readRig into the
// poser, the per-rig goggle copy, and the figure on the real Wren files (the hero's grip morphs off where its bones close
// the hand, A9). The bit identity of every pre-T3 joint is tests/animSkeletonIdentity.test.ts.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseGlb, type GlbModel } from '../src/operators/lab/glb';
import { OperatorPoser, poserSetup, RIG_JOINTS, TRS, type PoserSetup } from '../src/operators/runtime/pose';
import {
  FING_L, FING_LEN, FING_R, FINGER_MAX_DEG, fingerAngle, fingerPose, fingerRig, HAND_SHAPES, handGripShape, spreadAngle,
} from '../src/anim/fingers';
import { CLAV_L, CLAV_R, CLAV_SC, clavActive, clavPoint, clavQuat } from '../src/anim/clavicle';
import { GOGGLE_OFFSET, setGoggleOffset } from '../src/operators/runtime/goggle';

const read = (lod: string): GlbModel => {
  const b = readFileSync(`src/operators/assets/wren/wren-${lod}.glb`);
  return parseGlb(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
};
const MODELS = new Map<string, GlbModel>();
const model = (lod: string): GlbModel => {
  let m = MODELS.get(lod);
  if (!m) MODELS.set(lod, (m = read(lod)));
  return m;
};

type V = [number, number, number];
const qm = (a: ArrayLike<number>, b: ArrayLike<number>): number[] => [
  a[3]! * b[0]! + a[0]! * b[3]! + a[1]! * b[2]! - a[2]! * b[1]!, a[3]! * b[1]! - a[0]! * b[2]! + a[1]! * b[3]! + a[2]! * b[0]!,
  a[3]! * b[2]! + a[0]! * b[1]! - a[1]! * b[0]! + a[2]! * b[3]!, a[3]! * b[3]! - a[0]! * b[0]! - a[1]! * b[1]! - a[2]! * b[2]!];
const rotv = (q: ArrayLike<number>, v: ArrayLike<number>): V => {
  const r = qm(qm(q, [v[0]!, v[1]!, v[2]!, 0]), [-q[0]!, -q[1]!, -q[2]!, q[3]!]);
  return [r[0]!, r[1]!, r[2]!];
};

/** World (skeleton-space) positions / rotations from a poser's local output, and a skin transform of a point. */
function fk(S: PoserSetup, out: Float64Array): { pos: Float64Array; rot: Float64Array; skin: (s: number, x: ArrayLike<number>) => V } {
  const n = S.node.length;
  const pos = new Float64Array(n * 3);
  const rot = new Float64Array(n * 4);
  for (let s = 0; s < n; s++) {
    const p = S.parent[s]!;
    const t = out.subarray(s * TRS, s * TRS + 3);
    const q = out.subarray(s * TRS + 3, s * TRS + 7);
    if (p < 0) { pos.set(t, s * 3); rot.set(q, s * 4); continue; }
    const pq = rot.subarray(p * 4, p * 4 + 4);
    const v = rotv(pq, t);
    pos.set([pos[p * 3]! + v[0], pos[p * 3 + 1]! + v[1], pos[p * 3 + 2]! + v[2]], s * 3);
    rot.set(qm(pq, q), s * 4);
  }
  const skin = (s: number, x: ArrayLike<number>): V => {
    const bq = S.bindRot.subarray(s * 4, s * 4 + 4);
    const local = rotv([-bq[0]!, -bq[1]!, -bq[2]!, bq[3]!], [x[0]! - S.bindPos[s * 3]!, x[1]! - S.bindPos[s * 3 + 1]!, x[2]! - S.bindPos[s * 3 + 2]!]);
    const w = rotv(rot.subarray(s * 4, s * 4 + 4), local);
    return [w[0] + pos[s * 3]!, w[1] + pos[s * 3 + 1]!, w[2] + pos[s * 3 + 2]!];
  };
  return { pos, rot, skin };
}

function restRig(): Float64Array {
  const rig = new Float64Array(RIG_JOINTS.length * TRS);
  for (let j = 0; j < RIG_JOINTS.length; j++) rig[j * TRS + 6] = 1;
  return rig;
}

describe('anim-skeleton S2: the finger drive (pure)', () => {
  it('the grip closures blend the relaxed shape toward the trigger / wrap / support shapes, spreads 0', () => {
    const o = new Float64Array(FING_LEN);
    handGripShape(0, 0, true, o);
    for (let f = 0; f < 5; f++) {
      expect(o[FING_L + f * 2]).toBe(HAND_SHAPES.relax[f]);
      expect(o[FING_R + f * 2]).toBe(HAND_SHAPES.relax[f]);
      expect(o[FING_R + f * 2 + 1]).toBe(0);
    }
    handGripShape(1, 1, true, o);
    for (let f = 0; f < 5; f++) {
      expect(o[FING_L + f * 2]).toBeCloseTo(HAND_SHAPES.support[f]!, 12);
      expect(o[FING_R + f * 2]).toBeCloseTo(HAND_SHAPES.trigger[f]!, 12);
    }
    handGripShape(0, 0.5, false, o);
    expect(o[FING_R + 2]).toBeCloseTo((HAND_SHAPES.relax[1] + HAND_SHAPES.wrap[1]) / 2, 12);
    // the trigger finger stays straighter than the three round the grip
    expect(HAND_SHAPES.trigger[1]).toBeLessThan(HAND_SHAPES.trigger[2]);
  });

  it('curl and spread map to joint angles, clamped', () => {
    expect(fingerAngle(2, 0, 1)).toBeCloseTo((FINGER_MAX_DEG[0] * Math.PI) / 180, 12);
    expect(fingerAngle(2, 1, 0.5)).toBeCloseTo((FINGER_MAX_DEG[1] * Math.PI) / 360, 12);
    expect(fingerAngle(2, 2, 9)).toBeCloseTo(fingerAngle(2, 2, 1.2), 12);
    expect(spreadAngle(0)).toBe(0);
    expect(spreadAngle(-5)).toBeCloseTo(-spreadAngle(1.5), 12);
  });

  it('every LOD with fingers has 30 finger joints with unit axes; LOD2 none', () => {
    for (const lod of ['hero', 'lod0', 'lod1', 'lod2']) {
      const S = poserSetup(model(lod).nodes, model(lod).joints);
      const r = fingerRig(S.names, S.bindPos, S.bindRot);
      if (lod === 'lod2') { expect(r).toBeNull(); continue; }
      expect(r!.slot.length, lod).toBe(30);
      for (let i = 0; i < 30; i++) {
        expect(Math.hypot(r!.flex[i * 3]!, r!.flex[i * 3 + 1]!, r!.flex[i * 3 + 2]!)).toBeCloseTo(1, 9);
        if (r!.seg[i] === 0) expect(Math.hypot(r!.splay[i * 3]!, r!.splay[i * 3 + 1]!, r!.splay[i * 3 + 2]!)).toBeCloseTo(1, 9);
      }
    }
  });

  it("curling closes every fingertip the way the hero's own grip morphs do (toward the palm), both hands; spread splays away from the middle", () => {
    const m = model('hero');
    const S = poserSetup(m.nodes, m.joints);
    const r = fingerRig(S.names, S.bindPos, S.bindRot)!;
    const jn = m.joints.map((j) => m.nodes[j]!.name);
    const poser = new OperatorPoser(S);
    const rig = restRig();
    poser.solve(rig);
    const v = new Float64Array(FING_LEN);
    handGripShape(1, 1, false, v);
    fingerPose(r, v, poser.extraQ, poser.extraOn);
    const posed = fk(S, poser.solve(rig));
    // the wrists stay put (the poser's arm hang moves the whole hand; compare each tip's motion relative to its wrist)
    for (const [shape, side] of [['wrapR', 'R'], ['gripL', 'L']] as const) {
      const wr = S.names.indexOf(`wr${side}`);
      for (let k = 1; k <= 5; k++) {
        const name = `finger${side}_${k}_3`;
        const slot = S.names.indexOf(name);
        let n = 0;
        let dot = 0;
        for (const g of m.meshes) {
          const t = g.targets?.find((x) => x.name === shape);
          if (!t) continue;
          for (let i = 0; i < g.positions.length / 3; i++) {
            if (g.weights[i * 4]! < 0.97 || jn[g.joints[i * 4]!] !== name) continue;
            const x = g.positions.subarray(i * 3, i * 3 + 3);
            // the bone curl's motion of the vertex, in the hand's frame (undo the wrist's own posed turn)
            const a = posed.skin(slot, x);
            const b = posed.skin(wr, x);
            const wq = posed.rot.subarray(wr * 4, wr * 4 + 4);
            const d = rotv([-wq[0]!, -wq[1]!, -wq[2]!, wq[3]!], [a[0] - b[0], a[1] - b[1], a[2] - b[2]]);
            const bq = S.bindRot.subarray(wr * 4, wr * 4 + 4);
            const dm = rotv([-bq[0]!, -bq[1]!, -bq[2]!, bq[3]!], [t.positions[i * 3]!, t.positions[i * 3 + 1]!, t.positions[i * 3 + 2]!]);
            dot += (d[0] * dm[0] + d[1] * dm[1] + d[2] * dm[2]) / (Math.hypot(...d) * Math.hypot(...dm) || 1);
            n++;
          }
        }
        expect(n, `${name} vertices`).toBeGreaterThan(50);
        expect(dot / n, `${shape} ${name}: bone curl along the morph`).toBeGreaterThan(0.5);
      }
    }
    // spread: the index tip moves away from the middle finger's knuckle, the little away from the ring's
    v.fill(0);
    v[FING_R + 1 * 2 + 1] = 1;
    v[FING_R + 4 * 2 + 1] = 1;
    poser.extraOn.fill(0);
    fingerPose(r, v, poser.extraQ, poser.extraOn);
    const sp = fk(S, poser.solve(rig));
    poser.extraOn.fill(0);
    const rest = fk(S, poser.solve(rig));
    const dist = (f: ReturnType<typeof fk>, a: string, b: string): number => {
      const i = S.names.indexOf(a), j = S.names.indexOf(b);
      return Math.hypot(f.pos[i * 3]! - f.pos[j * 3]!, f.pos[i * 3 + 1]! - f.pos[j * 3 + 1]!, f.pos[i * 3 + 2]! - f.pos[j * 3 + 2]!);
    };
    expect(dist(sp, 'fingerR_2_3', 'fingerR_3_3')).toBeGreaterThan(dist(rest, 'fingerR_2_3', 'fingerR_3_3') + 0.005);
    expect(dist(sp, 'fingerR_5_3', 'fingerR_4_3')).toBeGreaterThan(dist(rest, 'fingerR_5_3', 'fingerR_4_3') + 0.005);
  });
});

describe('anim-skeleton S2: the poser extras', () => {
  it('a finger segment chains its parent segment; slots without extras are untouched; the goggle offset moves its joint', () => {
    const m = model('lod0');
    const S = poserSetup(m.nodes, m.joints);
    const p = new OperatorPoser(S);
    const rig = restRig();
    const base = new Float64Array(p.solve(rig));
    const s1 = S.names.indexOf('fingerR_2_1');
    const s2 = S.names.indexOf('fingerR_2_2');
    const s3 = S.names.indexOf('fingerR_2_3');
    expect(S.chain[s2]).toBe(s1);
    expect(S.chain[s3]).toBe(s2);
    expect(S.chain[s1]).toBe(-1);
    // turn only the first segment: the outer two keep their local transforms (they ride it)
    const h = 0.3;
    p.extraQ.set([Math.sin(h), 0, 0, Math.cos(h)], s1 * 4);
    p.extraOn[s1] = 1;
    const out = p.solve(rig);
    for (let s = 0; s < S.node.length; s++) {
      let d = 0;
      for (let i = 0; i < TRS; i++) d = Math.max(d, Math.abs(out[s * TRS + i]! - base[s * TRS + i]!));
      if (s === s1) expect(d, S.names[s]).toBeGreaterThan(0.1);
      else expect(d, S.names[s]).toBeLessThan(1e-7);
    }
    p.extraOn[s1] = 0;
    // the goggle: 2 cm up in the head frame
    const g = S.names.indexOf('goggleUse');
    p.extraT.set([0, 0.02, 0], g * 3);
    p.extraOn[g] = 1;
    const go = fk(S, p.solve(rig));
    const b0 = fk(S, base);
    expect(go.pos[g * 3 + 1]! - b0.pos[g * 3 + 1]!).toBeCloseTo(0.02, 9);
    p.extraOn[g] = 0;
    expect([...p.solve(rig)]).toEqual([...base]);
  });

  it('an identity clavicle passes the chest through exactly; a turned one swings the shoulder about the SC point', () => {
    const m = model('lod0');
    const S = poserSetup(m.nodes, m.joints);
    const p = new OperatorPoser(S);
    const rig = restRig();
    const ch = RIG_JOINTS.indexOf('chest');
    rig.set([0.1, 0.2, -0.05, Math.sqrt(1 - 0.01 - 0.04 - 0.0025)], ch * TRS + 3);
    const base = fk(S, new Float64Array(p.solve(rig)));
    const c = S.names.indexOf('clavR'), chest = S.names.indexOf('chest'), sh = S.names.indexOf('shR');
    // the clavicle turns with the chest (its posed rotation away from bind equals the chest's)
    const delta = (s: number): number[] => qm(base.rot.subarray(s * 4, s * 4 + 4), [-S.bindRot[s * 4]!, -S.bindRot[s * 4 + 1]!, -S.bindRot[s * 4 + 2]!, S.bindRot[s * 4 + 3]!]);
    delta(c).forEach((x, i) => expect(x).toBeCloseTo(delta(chest)[i]!, 6));
    // a 20 degree shrug of the right clavicle (roll + in the chest frame)
    const q = new Float64Array(4);
    clavQuat([0, 0, 0, 0, 0, 20], CLAV_R, q, 0);
    rig.set(q, RIG_JOINTS.indexOf('clavR') * TRS + 3);
    const up = fk(S, p.solve(rig));
    // in the chest's frame the shoulder rose (the clavicle is ~15 cm long: ~5 cm)
    const cq = base.rot.subarray(chest * 4, chest * 4 + 4);
    const rel = (f: ReturnType<typeof fk>): V => rotv([-cq[0]!, -cq[1]!, -cq[2]!, cq[3]!], [f.pos[sh * 3]! - f.pos[c * 3]!, f.pos[sh * 3 + 1]! - f.pos[c * 3 + 1]!, f.pos[sh * 3 + 2]! - f.pos[c * 3 + 2]!]);
    expect(rel(up)[1] - rel(base)[1]).toBeGreaterThan(0.04);
    expect(Math.hypot(...rel(up))).toBeCloseTo(Math.hypot(...rel(base)), 9);
  });
});

describe('anim-skeleton S2: the rig', () => {
  afterEach(() => {
    setGoggleOffset('inUse', 0, 0, 0, 0, 0, 0);
    setGoggleOffset('stowed', 0, 0, 0, 0, 0, 0);
    vi.unstubAllGlobals();
  });

  it('the SC point matches the asset spec (skeleton.json); clavicle input helpers', () => {
    const spec = JSON.parse(readFileSync('scripts/anim-skeleton/skeleton.json', 'utf8')) as { clavicle: { lateral: number; belowNeck: number; forward: number } };
    expect(CLAV_SC.lateral).toBe(spec.clavicle.lateral);
    expect(CLAV_SC.belowNeck).toBe(spec.clavicle.belowNeck);
    expect(CLAV_SC.forward).toBe(spec.clavicle.forward);
    const pt = clavPoint(-1, 0.3, { x: 0, y: 0, z: 0 });
    expect(pt).toEqual({ x: -0.03, y: 0.3 - 0.035, z: 0.04 });
    expect(clavActive([0, 0, 0, 0, 0, 0], CLAV_L)).toBe(false);
    expect(clavActive([0, 0, 0, 0, 1, 0], CLAV_R)).toBe(true);
  });

  it('the clavicles: nodes under the chest at the SC points; a shrug lifts the shoulder (and the hand on the gun keeps its IK), back to the exact rest when cleared; readRig undoes the carry for the poser', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const { operatorRig } = await import('../src/operators/runtime/playerFigure');
    const { readRig, rigNodes } = await import('../src/operators/runtime/figure');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const { rig, figure } = operatorRig(scene, (s, h, n) => lib.instance(s, h, n), defaultLook(), 'c');
    expect(rig.clavL.parent).toBe(rig.torso);
    expect(rig.clavR.parent).toBe(rig.torso);
    expect(rig.shoulderL.parent).toBe(rig.torso);
    expect(rig.clavR.position.x).toBeCloseTo(0.03, 12);
    expect(rig.clavR.position.y).toBeCloseTo(rig.neck.position.y - 0.035, 12);
    expect(rig.clavR.position.z).toBeCloseTo(0.04, 12);
    const nodes = rigNodes(rig);
    expect(nodes).toHaveLength(RIG_JOINTS.length);
    nodes.forEach((n, i) => expect(n.name).toBe(`c-${RIG_JOINTS[i]}`));
    const pose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0 };
    for (let k = 0; k < 30; k++) rig.animate(1 / 60, pose);
    const rest = rig.shoulderR.position.clone();
    const restL = rig.shoulderL.position.clone();
    rig.clavIn[CLAV_R + 2] = 20;
    rig.animate(1 / 60, pose);
    expect(rig.shoulderR.position.y - rest.y).toBeGreaterThan(0.03);
    expect(rig.shoulderL.position.asArray()).toEqual(restL.asArray());
    // the poser's input: the shoulder before the carry (its skin follows the skin's own clavicle joint)
    const buf = new Float64Array(RIG_JOINTS.length * TRS);
    readRig(nodes, buf);
    const sh = RIG_JOINTS.indexOf('shR') * TRS;
    expect(buf[sh]!).toBeCloseTo(rest.x, 6);
    expect(buf[sh + 1]!).toBeCloseTo(rest.y, 6);
    expect(buf[sh + 2]!).toBeCloseTo(rest.z, 6);
    rig.clavIn[CLAV_R + 2] = 0;
    rig.animate(1 / 60, pose);
    expect(rig.clavR.rotationQuaternion!.asArray()).toEqual([0, 0, 0, 1]);
    rig.shoulderR.position.asArray().forEach((x, i) => expect(x).toBeCloseTo(rest.asArray()[i]!, 6));
    figure.dispose();
    rig.dispose();
    scene.dispose();
  });

  it('fingers: the grip closures, the clip slot; the goggle offsets copied per rig inside its own animate', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const { operatorRig } = await import('../src/operators/runtime/playerFigure');
    const { WeaponModel, DEFAULT_WEAPON_COLORS } = await import('../src/weapons/weaponModel');
    const { WEAPONS } = await import('../src/weapons/weaponDefs');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const a = operatorRig(scene, (s, h, n) => lib.instance(s, h, n), defaultLook(), 'a');
    const b = operatorRig(scene, (s, h, n) => lib.instance(s, h, n), defaultLook(), 'b');
    new WeaponModel(scene, lib, WEAPONS.rifle, DEFAULT_WEAPON_COLORS, a.rig.root).hold(a.rig);
    const pose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 1, kick: 0, armed: true };
    for (let k = 0; k < 40; k++) a.rig.animate(1 / 60, pose);
    // the rifle in both hands: the right hand on the trigger grip, the left on the handguard
    const f = a.rig.fingers;
    const want = new Float64Array(FING_LEN);
    handGripShape(a.rig.handGrip.l, a.rig.handGrip.r, a.rig.rightTrigger, want);
    expect([...f]).toEqual([...want]);
    expect(a.rig.handGrip.r).toBe(1);
    expect(a.rig.rightTrigger).toBe(true);
    expect(f[FING_R + 3 * 2]).toBeCloseTo(HAND_SHAPES.trigger[3]!, 12);
    // the clip slot adds per finger
    a.rig.fingerClip[FING_L + 2 * 2] = 0.2;
    a.rig.fingerClip[FING_L + 2 * 2 + 1] = -0.5;
    a.rig.animate(1 / 60, pose);
    expect(a.rig.fingers[FING_L + 2 * 2]).toBeCloseTo(want[FING_L + 2 * 2]! + 0.2, 12);
    expect(a.rig.fingers[FING_L + 2 * 2 + 1]).toBe(-0.5);
    // goggle: each rig keeps the offsets that stood inside its own animate
    setGoggleOffset('inUse', 0, 0.02, 0, 5, 0, 0);
    a.rig.animate(1 / 60, pose);
    setGoggleOffset('inUse', 0, -0.01, 0, 0, 0, 0);
    b.rig.animate(1 / 60, pose);
    setGoggleOffset('inUse', 0, 0, 0, 0, 0, 0);
    expect([...a.rig.goggleOff.subarray(6, 12)]).toEqual([0, 0.02, 0, 5, 0, 0]);
    expect([...b.rig.goggleOff.subarray(6, 12)]).toEqual([0, -0.01, 0, 0, 0, 0]);
    expect([...a.rig.goggleOff.subarray(0, 6)]).toEqual([0, 0, 0, 0, 0, 0]);
    expect(GOGGLE_OFFSET.inUse.y).toBe(0);
    for (const o of [a, b]) {
      o.figure.dispose();
      o.rig.dispose();
    }
    scene.dispose();
  });

  it('the figure on the real Wren files: LOD0 and hero fingers close by the bones with the hero grip morphs at 0; the goggle joint takes its pose offset', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, FreeCamera, Vector3 } = await import('../src/core/babylon');
    const { Tools } = await import('@babylonjs/core/Misc/tools');
    const { CLOSE_CAMERAS } = await import('../src/operators/runtime/lodPick');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const { operatorRig, operatorLibrary } = await import('../src/operators/runtime/playerFigure');
    const { OperatorFigure, forgetModels } = await import('../src/operators/runtime/figure');
    const { manifestFromUrls, LOD_0, LOD_HERO } = await import('../src/operators/runtime/manifest');
    // the real files carry KTX2 textures: give the transcoder setup an origin and Babylon a URL resolver (no GPU here)
    vi.stubGlobal('location', { origin: 'http://localhost' });
    const T = Tools as unknown as { GetAbsoluteUrl: (u: string) => string };
    const abs = T.GetAbsoluteUrl;
    T.GetAbsoluteUrl = (u) => u;
    vi.stubGlobal('fetch', async (url: string) => new Response(readFileSync(`src/operators/assets/wren/wren-${url.slice(1, -4)}.glb`)));
    forgetModels();
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const { rig } = operatorRig(scene, (s, h, n) => lib.instance(s, h, n), defaultLook(), 'f');
    const manifest = manifestFromUrls('wren', { 'a/wren-hero.glb': '/hero.glb', 'a/wren-lod0.glb': '/lod0.glb', 'a/wren-lod1.glb': '/lod1.glb', 'a/wren-lod2.glb': '/lod2.glb' });
    const fig = new OperatorFigure(operatorLibrary(scene), rig, manifest, 'fw');
    await fig.load(LOD_0);
    await fig.load(LOD_HERO);
    const lods = (fig as unknown as { lods: ({ nodes: { name: string; rotationQuaternion: { asArray(): number[] } | null; position: { asArray(): number[] } }[]; meshes: { morphTargetManager: { numTargets: number; getTarget(i: number): { influence: number } } | null }[]; poser: OperatorPoser } | null)[] }).lods;
    const pose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0 };
    // a close-up camera picks the hero; no camera (distance 0), LOD0
    const cam = new FreeCamera('close', new Vector3(0, 1.5, 2), scene);
    CLOSE_CAMERAS.add(cam.uniqueId);
    for (const lod of [LOD_0, LOD_HERO]) {
      const l = lods[lod]!;
      const node = (nm: string) => l.nodes.find((n) => n.name.endsWith(`-${nm}`))!;
      const c = lod === LOD_HERO ? cam : null;
      rig.animate(1 / 60, pose);
      fig.update(c);
      expect(fig.current).toBe(lod);
      const open = node('fingerR_3_2').rotationQuaternion!.asArray();
      rig.fingerClip[FING_R + 2 * 2] = 0.8;
      rig.animate(1 / 60, pose);
      fig.update(c);
      const shut = node('fingerR_3_2').rotationQuaternion!.asArray();
      const dq = Math.abs(open[0]! * shut[0]! + open[1]! * shut[1]! + open[2]! * shut[2]! + open[3]! * shut[3]!);
      expect(2 * Math.acos(Math.min(1, dq)) * (180 / Math.PI), `lod ${lod} PIP turn`).toBeGreaterThan(60);
      rig.fingerClip[FING_R + 2 * 2] = 0;
      for (const m of l.meshes) {
        const mgr = m.morphTargetManager;
        if (mgr) for (let i = 0; i < mgr.numTargets; i++) expect(mgr.getTarget(i).influence, `lod ${lod} morph`).toBe(0);
      }
      // the goggle joint: the figure's pose (stowed by default) takes the rig's copy of that pose's offset
      const g0 = node('goggleUse').position.asArray();
      setGoggleOffset('stowed', 0, 0.02, 0, 0, 0, 0);
      rig.animate(1 / 60, pose);
      fig.update(c);
      const g1 = node('goggleUse').position.asArray();
      expect(Math.hypot(g1[0]! - g0[0]!, g1[1]! - g0[1]!, g1[2]! - g0[2]!), `lod ${lod} goggle moved`).toBeCloseTo(0.02, 6);
      setGoggleOffset('stowed', 0, 0, 0, 0, 0, 0);
      rig.animate(1 / 60, pose);
      fig.update(c);
      node('goggleUse').position.asArray().forEach((x, i) => expect(x).toBeCloseTo(g0[i]!, 9));
    }
    CLOSE_CAMERAS.remove(cam.uniqueId);
    T.GetAbsoluteUrl = abs;
    fig.dispose();
    rig.dispose();
    scene.dispose();
    forgetModels();
  });
});
